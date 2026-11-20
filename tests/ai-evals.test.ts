import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import type {
  AiChatRequest,
  AiChatResponse,
  BudgetFeasibilityResult,
  CapacityAndLogisticsPlan,
  GeneratedDayPlan,
  GeneratedExpenseItem,
  IntakeState,
  PurposeAlignedSelection,
} from '../src/types/index.ts';

// Isolated temp SQLite DB before importing server modules
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daklak-ai-evals-'));
process.env.CMS_DB_PATH = path.join(tmpDir, 'evals-test.db');

const { ensureSeedData } = await import('../server/db/seed.ts');
const { closeDb } = await import('../server/db/database.ts');
const {
  evaluatePhase5Output,
  evaluateQaOutput,
  hasElephantRidingViolation,
  sanitizeEthicalElephantText,
} = await import('../server/services/aiEvaluator.ts');
const {
  saveAiTrace,
  getAiTraceById,
  submitAiTraceFeedback,
  listAiTraces,
} = await import('../server/services/aiTraceService.ts');
const {
  toSafeSpanValue,
  withOpenInferenceSpan,
  withSessionScope,
} = await import('../server/services/arizeTelemetry.ts');
const {
  clearLangGraphMemory,
  getLangGraphTraceMetadata,
  runLangGraphChat,
} = await import('../server/services/aiWorkflow/langGraphAgent.ts');
const { runPhase1IntakeDeterministic } = await import(
  '../server/services/aiWorkflow/phase1Intake.ts'
);
const { runPhase2Capacity } = await import(
  '../server/services/aiWorkflow/phase2Capacity.ts'
);
const { runPhase3Budget } = await import(
  '../server/services/aiWorkflow/phase3Budget.ts'
);
const { runPhase4Purpose } = await import(
  '../server/services/aiWorkflow/phase4Purpose.ts'
);
const { synthesizeDeterministicPlan } = await import(
  '../server/services/aiWorkflow/phase5Synthesis.ts'
);
const { handleAiChat } = await import('../server/services/aiChatbot.ts');

ensureSeedData();

after(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const goldenPath = path.resolve(process.cwd(), 'tests/fixtures/ai-golden.json');
const goldenFixture = JSON.parse(fs.readFileSync(goldenPath, 'utf8')) as {
  cases: Array<Record<string, unknown>>;
};

async function buildBaselineContext(intake: IntakeState): Promise<{
  req: AiChatRequest;
  capacityPlan: CapacityAndLogisticsPlan;
  budgetResult: BudgetFeasibilityResult;
  purposeSelection: PurposeAlignedSelection;
  response: AiChatResponse;
}> {
  const req: AiChatRequest = {
    message: intake.rawUserGoal || 'Lên lịch trình Đắk Lắk',
    lang: 'vi',
    isFollowUp: false,
    currentState: {
      theme: intake.mainPurpose,
      duration: intake.duration,
      companion: intake.companionType || 'couple',
      budget: intake.budgetTier,
      days: [],
    },
  };
  const capacityPlan = runPhase2Capacity(intake);
  const budgetResult = await runPhase3Budget(intake, capacityPlan, {
    forceSkipTavily: true,
    skipSqliteUpsert: true,
  });
  const purposeSelection = await runPhase4Purpose(intake, capacityPlan, budgetResult, {
    lang: 'vi',
  });
  const response = synthesizeDeterministicPlan(
    req,
    intake,
    capacityPlan,
    budgetResult,
    purposeSelection
  );
  return { req, capacityPlan, budgetResult, purposeSelection, response };
}

test('evaluatePhase5Output passes clean deterministic itinerary with 100 score', async () => {
  const intake: IntakeState = {
    intent: 'plan_trip',
    travelersCount: 2,
    companionType: 'couple',
    travelDates: 'Tháng 12',
    duration: '3N2D',
    totalBudgetVnd: 8000000,
    budgetTier: 'standard',
    mainPurpose: 'coffee',
    secondaryInterests: [],
    missingFields: [],
    needsClarification: false,
  };

  const { capacityPlan, budgetResult, purposeSelection, response } =
    await buildBaselineContext(intake);

  const evaluated = evaluatePhase5Output({
    response,
    intake,
    capacityPlan,
    budgetResult,
    purposeSelection,
  });

  assert.equal(evaluated.evalResult.passed, true, evaluated.evalResult.violations.join('; '));
  assert.equal(evaluated.evalResult.score, 100);
  assert.equal(evaluated.needsRetry, false);
});

test('evaluatePhase5Output catches and repairs ungrounded stops, budget overruns, and stop-cap overruns', async () => {
  const intake: IntakeState = {
    intent: 'plan_trip',
    travelersCount: 2,
    companionType: 'couple',
    travelDates: 'Tháng 5',
    duration: '2N1D',
    totalBudgetVnd: 4000000,
    budgetTier: 'standard',
    mainPurpose: 'coffee',
    secondaryInterests: [],
    missingFields: [],
    needsClarification: false,
  };

  const { capacityPlan, budgetResult, purposeSelection, response } =
    await buildBaselineContext(intake);

  // Inject ungrounded stops, extra stops exceeding maxStopsTotal, and over-budget expenses
  const baseSlots = purposeSelection.selectedPlaces.slice(0, capacityPlan.maxStopsTotal).map((p) => ({
    time: '09:00 – 10:30',
    period: 'Buổi sáng',
    title: p.title,
    location: p.location,
    desc: 'Test stop',
  }));
  while (baseSlots.length < capacityPlan.maxStopsTotal) {
    const first = purposeSelection.selectedPlaces[0];
    baseSlots.push({
      time: '11:00 – 12:00',
      period: 'Buổi trưa',
      title: first.title,
      location: first.location,
      desc: 'Extra stop',
    });
  }
  baseSlots.push(
    {
      time: '16:00 – 17:30',
      period: 'Buổi chiều',
      title: 'Khu vui chơi Ảo Tưởng Không Có Thật',
      location: 'Không xác định',
      desc: 'Điểm tự bịa',
    },
    {
      time: '19:00 – 20:30',
      period: 'Buổi tối',
      title: 'Chợ đêm Ma Thuột Ảo',
      location: 'BMT',
      desc: 'Vượt stop cap',
    }
  );

  const mutated: AiChatResponse = {
    ...response,
    generatedDays: [
      {
        day: 'Ngày 1',
        title: 'Test Day 1',
        area: 'BMT',
        slots: baseSlots,
      },
    ],
    generatedExpenses: [
      { title: 'Resort siêu sang', cat: 'stay', amount: 5000000 },
      { title: 'Xe riêng', cat: 'transit', amount: 1500000 },
    ],
  };

  const evaluated = evaluatePhase5Output({
    response: mutated,
    intake,
    capacityPlan,
    budgetResult,
    purposeSelection,
  });

  assert.equal(evaluated.evalResult.passed, false);
  assert.ok(
    evaluated.evalResult.checks.some((c) => c.name === 'grounding_selected_places' && !c.passed)
  );
  assert.ok(evaluated.evalResult.checks.some((c) => c.name === 'stop_cap' && !c.passed));
  assert.ok(evaluated.evalResult.checks.some((c) => c.name === 'budget_cap' && !c.passed));
  assert.equal(evaluated.needsRetry, true, '2 ungrounded stops should request retry');

  const repairedStopCount = (evaluated.repairedResponse.generatedDays || []).reduce(
    (s, d) => s + d.slots.length,
    0
  );
  assert.ok(repairedStopCount <= capacityPlan.maxStopsTotal);

  const repairedExpenseTotal = (evaluated.repairedResponse.generatedExpenses || []).reduce(
    (s, e) => s + e.amount,
    0
  );
  assert.ok(repairedExpenseTotal <= budgetResult.totalBudgetVnd);
});

test('evaluatePhase5Output catches zigzag routes >120km/day, elephant-riding violations, and hallucinated citations', async () => {
  const intake: IntakeState = {
    intent: 'plan_trip',
    travelersCount: 2,
    companionType: 'couple',
    travelDates: 'Tháng 3',
    duration: '3N2D',
    totalBudgetVnd: 10000000,
    budgetTier: 'standard',
    mainPurpose: 'nature',
    secondaryInterests: [],
    missingFields: [],
    needsClarification: false,
  };

  const { capacityPlan, budgetResult, purposeSelection, response } =
    await buildBaselineContext(intake);

  // Negated ethical phrasing must NOT trigger violation
  assert.equal(
    hasElephantRidingViolation('Trải nghiệm đi bộ ngắm voi tự nhiên không cưỡi voi tại Yok Đôn.'),
    false
  );
  assert.equal(hasElephantRidingViolation('Ethical non-riding elephant tour.'), false);
  assert.equal(hasElephantRidingViolation('Cưỡi voi vượt sông Sêrêpốk.'), true);
  assert.equal(hasElephantRidingViolation('Try elephant riding in Ban Don.'), true);

  const mutated: AiChatResponse = {
    ...response,
    generatedDays: [
      {
        day: 'Ngày 1',
        title: 'Cung đường zigzag vượt 120km',
        area: 'Yok Đôn -> Hồ Lắk -> Ea Tân',
        slots: [
          {
            time: '07:30 – 10:00',
            period: 'Buổi sáng',
            title: 'Vườn Quốc gia Yok Đôn',
            location: 'Buôn Đôn',
            desc: 'Tham gia hoạt động cưỡi voi xuyên rừng.',
            lat: 12.8038,
            lng: 107.6707,
          },
          {
            time: '12:00 – 14:30',
            period: 'Buổi trưa',
            title: 'Hồ Lắk & Buôn Jun',
            location: 'Hồ Lắk',
            desc: 'Ngắm hồ.',
            lat: 12.42167,
            lng: 108.18194,
          },
          {
            time: '16:00 – 18:00',
            period: 'Buổi chiều',
            title: 'Nông trại Cà phê Ea Tân',
            location: 'Krông Năng',
            desc: 'Thăm vườn cà phê.',
            lat: 12.94694,
            lng: 108.36111,
          },
        ],
      },
    ],
    citations: [
      {
        title: 'Hallucinated Blog',
        url: '/blog/bai-viet-khong-ton-tai-123',
        source: 'cms',
      },
      {
        title: 'Hallucinated External',
        url: 'https://fake-domain.invalid/prices',
        source: 'tavily',
      },
    ],
  };

  const evaluated = evaluatePhase5Output({
    response: mutated,
    intake,
    capacityPlan,
    budgetResult,
    purposeSelection,
  });

  assert.equal(evaluated.evalResult.passed, false);
  assert.equal(evaluated.needsRetry, true);
  assert.ok(
    evaluated.evalResult.checks.some((c) => c.name === 'daily_distance_limit' && !c.passed),
    'Zigzag Yok Đôn -> Hồ Lắk -> Ea Tân (>160km) must fail daily_distance_limit'
  );
  assert.ok(
    evaluated.evalResult.checks.some((c) => c.name === 'ethical_elephant_policy' && !c.passed),
    'Elephant riding must fail ethical_elephant_policy'
  );
  assert.ok(
    evaluated.evalResult.checks.some((c) => c.name === 'valid_citation_urls' && !c.passed),
    'Fake blog slug & external URL must fail valid_citation_urls'
  );

  // Verify repairs sanitized elephant phrasing & stripped fake citations
  const repairedText = JSON.stringify(evaluated.repairedResponse.generatedDays);
  assert.equal(hasElephantRidingViolation(repairedText), false);
  assert.equal((evaluated.repairedResponse.citations || []).length, 0);
});

test('Golden fixture suite executes all 8 benchmark cases cleanly', async () => {
  assert.ok(Array.isArray(goldenFixture.cases));
  assert.ok(goldenFixture.cases.length >= 8);

  for (const item of goldenFixture.cases) {
    const id = String(item.id);
    const kind = String(item.kind);

    if (kind === 'clarification') {
      const userMessage = String(item.userMessage);
      const parsed = runPhase1IntakeDeterministic({
        message: userMessage,
        lang: 'vi',
        isFollowUp: false,
        currentState: {
          theme: 'coffee',
          duration: '3N2D',
          companion: 'couple',
          budget: 'standard',
          days: [],
        },
      });
      assert.equal(parsed.intake.needsClarification, true, `${id}: should need clarification`);

      const chatRes = await handleAiChat({
        message: userMessage,
        lang: 'vi',
        isFollowUp: false,
        currentState: {
          theme: 'coffee',
          duration: '3N2D',
          companion: 'couple',
          budget: 'standard',
          days: [],
        },
      });
      assert.equal(chatRes.status, 'needs_clarification', `${id}: API status mismatch`);
      assert.ok(
        Array.isArray(chatRes.suggestedPresets) && chatRes.suggestedPresets.length > 0,
        `${id}: expected suggestedPresets`
      );
      assert.ok(chatRes.traceId, `${id}: expected traceId`);
    } else if (kind === 'budget_pruning') {
      const intake = item.intake as IntakeState;
      const expected = item.expected as {
        maxEstimatedTotalVnd: number;
        preferredTransportModes: string[];
        forbiddenTier: string;
      };
      const capacity = runPhase2Capacity(intake);
      const budget = await runPhase3Budget(intake, capacity, {
        forceSkipTavily: true,
        skipSqliteUpsert: true,
      });
      assert.ok(
        budget.estimatedTotalVnd <= expected.maxEstimatedTotalVnd,
        `${id}: estimatedTotalVnd ${budget.estimatedTotalVnd} > ${expected.maxEstimatedTotalVnd}`
      );
      assert.ok(capacity.selectedStay);
      assert.notEqual(capacity.selectedStay.tier, expected.forbiddenTier);
      assert.ok(capacity.selectedLogistics);
      assert.ok(expected.preferredTransportModes.includes(capacity.selectedLogistics.mode));
    } else if (kind === 'season_purpose') {
      const intake = item.intake as IntakeState;
      const expected = item.expected as {
        seasonKeyword: string;
        mustIncludeAnyStop: string[];
        theme: string;
      };
      const capacity = runPhase2Capacity(intake);
      assert.ok(
        capacity.seasonHeadline.includes(expected.seasonKeyword),
        `${id}: expected season ${expected.seasonKeyword}, got ${capacity.seasonHeadline}`
      );
      const budget = await runPhase3Budget(intake, capacity, {
        forceSkipTavily: true,
        skipSqliteUpsert: true,
      });
      const purpose = await runPhase4Purpose(intake, capacity, budget, { lang: 'vi' });
      assert.equal(purpose.mainPurpose, expected.theme);
      const titles = purpose.selectedPlaces.map((p) => p.title);
      assert.ok(
        expected.mustIncludeAnyStop.some((s) => titles.includes(s)),
        `${id}: expected one of ${expected.mustIncludeAnyStop.join(', ')} in ${titles.join(', ')}`
      );
    } else if (kind === 'pacing') {
      const familyIntake = item.familyIntake as IntakeState;
      const soloIntake = item.soloIntake as IntakeState;
      const expected = item.expected as {
        familyMaxStopsPerDay: number;
        soloMinMaxStopsPerDay: number;
        familyMinVehicleCapacity: number;
      };
      const familyCap = runPhase2Capacity(familyIntake);
      const soloCap = runPhase2Capacity(soloIntake);
      assert.ok(familyCap.maxStopsPerDay <= expected.familyMaxStopsPerDay);
      assert.ok(soloCap.maxStopsPerDay >= expected.soloMinMaxStopsPerDay);
      assert.ok(familyCap.selectedLogistics);
      assert.ok(familyCap.selectedLogistics.capacityMax >= expected.familyMinVehicleCapacity);
      assert.ok(soloCap.selectedLogistics);
      assert.equal(soloCap.selectedLogistics.mode, 'motorbike');
    } else if (kind === 'general_qa') {
      const userMessage = String(item.userMessage);
      const expected = item.expected as {
        intent: string;
        status: string;
        expectsGeneratedDays: boolean;
        answerMustMentionAny: string[];
      };
      const chatRes = await handleAiChat({
        message: userMessage,
        lang: 'vi',
        isFollowUp: false,
        currentState: {
          theme: 'coffee',
          duration: '3N2D',
          companion: 'couple',
          budget: 'standard',
          days: [],
        },
      });
      assert.equal(chatRes.intent, expected.intent);
      assert.equal(chatRes.status, expected.status);
      assert.equal(Boolean(chatRes.generatedDays?.length), expected.expectsGeneratedDays);
      const replyLower = chatRes.reply.toLowerCase();
      assert.ok(
        expected.answerMustMentionAny.some((kw) => replyLower.includes(kw.toLowerCase())),
        `${id}: reply did not mention expected keywords`
      );
    } else if (kind === 'eval_violation') {
      const totalBudgetVnd = Number(item.totalBudgetVnd);
      const generatedDays = item.generatedDays as GeneratedDayPlan[];
      const generatedExpenses = item.generatedExpenses as GeneratedExpenseItem[];
      const citations = (item.citations || []) as AiChatResponse['citations'];

      const baseIntake: IntakeState = {
        intent: 'plan_trip',
        travelersCount: 2,
        companionType: 'couple',
        travelDates: 'Tháng 12',
        duration: '2N1D',
        totalBudgetVnd,
        budgetTier: 'standard',
        mainPurpose: 'coffee',
        secondaryInterests: [],
        missingFields: [],
        needsClarification: false,
      };
      const ctx = await buildBaselineContext(baseIntake);
      const candidate: AiChatResponse = {
        ...ctx.response,
        generatedDays,
        generatedExpenses,
        citations,
      };
      const evaluated = evaluatePhase5Output({
        response: candidate,
        intake: baseIntake,
        capacityPlan: ctx.capacityPlan,
        budgetResult: ctx.budgetResult,
        purposeSelection: ctx.purposeSelection,
      });

      assert.equal(evaluated.evalResult.passed, false, `${id}: expected evaluator failure`);
      const exp = item.expected as Record<string, unknown>;
      if (exp.mustCatchUngroundedStop) {
        assert.ok(
          evaluated.evalResult.checks.some((c) => c.name === 'grounding_selected_places' && !c.passed)
        );
      }
      if (exp.mustCatchElephantRiding) {
        assert.ok(
          evaluated.evalResult.checks.some((c) => c.name === 'ethical_elephant_policy' && !c.passed)
        );
      }
      if (exp.mustCatchHallucinatedCitation) {
        assert.ok(
          evaluated.evalResult.checks.some((c) => c.name === 'valid_citation_urls' && !c.passed)
        );
      }
    } else {
      assert.fail(`Unknown golden fixture kind: ${kind}`);
    }
  }
});

test('evaluateQaOutput validates general_qa replies, preserves negated elephant phrases, and strips invalid citations', () => {
  // Unaccented & expanded negations must not be flagged
  assert.equal(hasElephantRidingViolation('Du lich voi than thien khong cuoi voi tai Yok Don.'), false);
  assert.equal(hasElephantRidingViolation('Chung toi cam cuoi voi va ngung cuoi voi.'), false);
  assert.equal(hasElephantRidingViolation('We support a ban elephant riding policy and stop elephant riding.'), false);

  // Mixed text with both negated and positive phrases preserves negation while sanitizing positive riding
  const mixed = 'Yok Đôn nói không với cưỡi voi, vì vậy đừng tham gia cưỡi voi ở nơi khác.';
  assert.equal(hasElephantRidingViolation(mixed), true);
  const sanitized = sanitizeEthicalElephantText(mixed);
  assert.equal(hasElephantRidingViolation(sanitized), false);
  assert.ok(sanitized.includes('nói không với cưỡi voi'), `Negated clause corrupted: ${sanitized}`);

  const cleanQa: AiChatResponse = {
    intent: 'general_qa',
    reply: 'Chùa Sắc Tứ Khải Đoan mở cửa hằng ngày tại trung tâm Buôn Ma Thuột, miễn phí tham quan.',
    shouldOpenPlanner: false,
    preferences: { theme: 'culture', duration: '3N2D', companion: 'couple', budget: 'standard' },
    resetItineraryToTheme: false,
    stopOperations: [],
    provider: 'local-fallback',
    status: 'completed',
    citations: [
      {
        title: 'Chùa Sắc Tứ Khải Đoan',
        url: 'https://daklak.gov.vn/chua-khai-doan',
        snippet: 'Ngôi chùa lớn nhất Buôn Ma Thuột.',
        source: 'tavily',
      },
    ],
  };

  const cleanEval = evaluateQaOutput({
    response: cleanQa,
    userMessage: 'Chùa Sắc Tứ Khải Đoan mở cửa mấy giờ?',
    tavilyCitations: cleanQa.citations,
  });
  assert.equal(cleanEval.evalResult.passed, true);
  assert.equal(cleanEval.evalResult.score, 100);
  assert.equal(cleanEval.needsRetry, false);

  const badQa: AiChatResponse = {
    ...cleanQa,
    reply: 'Bạn có thể thử cưỡi voi ở Bản Đôn vào buổi sáng.',
    shouldOpenPlanner: true,
    resetItineraryToTheme: true,
    stopOperations: [{ action: 'add', placeTitle: 'Cầu Treo Sêrêpốk Bản Đôn', dayNumber: 1 }],
    citations: [
      ...(cleanQa.citations || []),
      { title: 'Fake link', url: 'https://hallucinated.example.invalid/fake', source: 'tavily' },
    ],
  };

  const badEval = evaluateQaOutput({
    response: badQa,
    userMessage: 'Ở Bản Đôn có hoạt động gì?',
    tavilyCitations: cleanQa.citations,
  });
  assert.equal(badEval.evalResult.passed, false);
  assert.equal(badEval.needsRetry, true);
  assert.equal(hasElephantRidingViolation(badEval.repairedResponse.reply), false);
  assert.equal(badEval.repairedResponse.shouldOpenPlanner, false);
  assert.equal(badEval.repairedResponse.resetItineraryToTheme, false);
  assert.deepEqual(badEval.repairedResponse.stopOperations, []);
  assert.equal(badEval.repairedResponse.citations?.length, 1);
  assert.equal(badEval.repairedResponse.citations?.[0]?.url, 'https://daklak.gov.vn/chua-khai-doan');
});

test('aiTraceService and arizeTelemetry helpers persist, filter, and serialize safely', async () => {
  const ts = '2026-11-19T12:00:00.000Z';
  saveAiTrace({
    traceId: 'trace-qa-1',
    lang: 'vi',
    userMessage: 'Thời tiết BMT hôm nay?',
    intent: 'general_qa',
    status: 'completed',
    provider: 'local-fallback',
    latencyMs: 25,
    retryCount: 0,
    createdAt: ts,
  });
  saveAiTrace({
    traceId: 'trace-plan-2',
    lang: 'vi',
    userMessage: 'Lên lịch 3N2Đ 8 triệu',
    intent: 'update_itinerary',
    status: 'completed',
    provider: 'local-fallback',
    latencyMs: 42,
    retryCount: 0,
    createdAt: ts,
  });

  const feedbackUpdated = submitAiTraceFeedback({
    traceId: 'trace-qa-1',
    rating: 1,
    comment: 'Trả lời rõ ràng',
  });
  assert.equal(feedbackUpdated.feedbackRating, 1);
  assert.equal(feedbackUpdated.feedbackComment, 'Trả lời rõ ràng');

  // Re-saving trace-qa-1 without feedback fields must preserve existing feedback
  saveAiTrace({
    traceId: 'trace-qa-1',
    lang: 'vi',
    userMessage: 'Thời tiết BMT hôm nay?',
    intent: 'general_qa',
    status: 'completed',
    provider: 'local-fallback',
    latencyMs: 30,
    retryCount: 0,
    createdAt: ts,
  });
  const afterResave = getAiTraceById('trace-qa-1');
  assert.ok(afterResave);
  assert.equal(afterResave.feedbackRating, 1);
  assert.equal(afterResave.feedbackComment, 'Trả lời rõ ràng');

  // Filtering by 'plan_trip' normalizes to 'update_itinerary'
  const planTraces = listAiTraces({ intent: 'plan_trip' });
  assert.ok(planTraces.traces.some((t) => t.traceId === 'trace-plan-2'));
  assert.ok(planTraces.traces.every((t) => t.intent === 'update_itinerary'));

  // Same-timestamp traces sort deterministically with newest rowid first
  const allRecent = listAiTraces({ limit: 10 });
  const idxPlan2 = allRecent.traces.findIndex((t) => t.traceId === 'trace-plan-2');
  const idxQa1 = allRecent.traces.findIndex((t) => t.traceId === 'trace-qa-1');
  assert.ok(idxPlan2 >= 0 && idxQa1 >= 0 && idxPlan2 < idxQa1);

  // toSafeSpanValue handles BigInt and circular objects without throwing
  const circular: Record<string, unknown> = { a: 1 };
  circular.self = circular;
  assert.ok(typeof toSafeSpanValue(circular) === 'string');
  assert.ok(toSafeSpanValue({ big: 12345678901234567890n }).includes('12345678901234567890'));

  const spanResult = await withSessionScope('sess_test_123', () =>
    withOpenInferenceSpan(
      'test_span',
      { kind: 'CHAIN' as never, input: { query: 'test' } },
      () => 'ok-span'
    )
  );
  assert.equal(spanResult, 'ok-span');
});

test('runLangGraphChat executes evaluator_guardrail_node on general Q&A (with Tavily) and follow-up micro-router turns', async () => {
  clearLangGraphMemory();

  const qaRes = await runLangGraphChat(
    {
      message: 'Khu du lịch KoTam ở Buôn Ma Thuột giá vé bao nhiêu và có gì chơi?',
      lang: 'vi',
      isFollowUp: false,
      currentState: {
        theme: 'nature',
        duration: '3N2D',
        companion: 'couple',
        budget: 'standard',
        days: [],
      },
    },
    {
      traceId: 'lg-eval-qa-1',
      sessionId: 'sess_lg_eval_qa',
      tavilyClient: {
        async search() {
          return {
            answer: 'Khu du lịch sinh thái KoTam tại Km9 Quốc lộ 26 có giá vé vào cổng khoảng 30.000đ - 40.000đ/người.',
            results: [
              {
                title: 'Giá vé Khu du lịch KoTam Buôn Ma Thuột',
                url: 'https://daklak.example.com/kotam-bmt',
                content: 'Khu du lịch KoTam nổi tiếng với vườn hoa, chèo thuyền thúng và ẩm thực Tây Nguyên.',
              },
            ],
          };
        },
      },
    }
  );

  assert.equal(qaRes.engine, 'langgraph');
  assert.equal(qaRes.intent, 'general_qa');
  assert.equal(qaRes.status, 'completed');
  assert.ok(qaRes.toolsUsed?.includes('search_local_daklak_catalog'));
  assert.ok(qaRes.toolsUsed?.includes('search_live_web_tavily'));
  assert.ok(qaRes.graphNodesVisited?.includes('evaluator_guardrail_node'));
  assert.ok(qaRes.citations?.some((c) => c.url === 'https://daklak.example.com/kotam-bmt'));
  assert.match(qaRes.reply, /KoTam/i);

  const qaMeta = getLangGraphTraceMetadata('lg-eval-qa-1');
  assert.ok(qaMeta?.evalResult);
  assert.equal(qaMeta.evalResult.passed, true);
  assert.equal(qaMeta.evalResult.score, 100);
});
