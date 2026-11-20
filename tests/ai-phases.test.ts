import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import type {
  AiChatRequest,
  CmsPostPublic,
  IntakeState,
} from '../src/types/index.ts';

// Isolated temp SQLite DB before importing server modules
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daklak-ai-phases-'));
process.env.CMS_DB_PATH = path.join(tmpDir, 'phases-test.db');

const { ensureSeedData } = await import('../server/db/seed.ts');
const { closeDb } = await import('../server/db/database.ts');
const {
  runPhase1IntakeDeterministic,
  maybeFetchTavilyQaContext,
  buildGroundedQaReplyDeterministic,
} = await import(
  '../server/services/aiWorkflow/phase1Intake.ts'
);
const { runPhase2Capacity, resolveSeasonFromDates } = await import(
  '../server/services/aiWorkflow/phase2Capacity.ts'
);
const { runPhase3Budget } = await import(
  '../server/services/aiWorkflow/phase3Budget.ts'
);
const { runPhase4Purpose } = await import(
  '../server/services/aiWorkflow/phase4Purpose.ts'
);
const {
  listEnrichedPlaces,
  upsertPlacePrice,
  isPriceTimestampStale,
} = await import('../server/services/plannerDataService.ts');
const {
  buildTavilyQaQuery,
  extractVndPricesFromText,
  searchPlacePriceWithTavily,
  searchGeneralQaWithTavily,
} = await import('../server/services/tavilyService.ts');
const {
  LANGGRAPH_TOOL_NAMES,
  buildDakLakLangGraph,
  clearLangGraphMemory,
  createDakLakLangGraphTools,
  getLangGraphCheckpointer,
  getLangGraphTraceMetadata,
  runLangGraphChat,
} = await import('../server/services/aiWorkflow/langGraphAgent.ts');

ensureSeedData();

after(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeChatReq(message: string, overrides?: Partial<AiChatRequest>): AiChatRequest {
  return {
    message,
    lang: 'vi',
    isFollowUp: false,
    currentState: {
      theme: 'coffee',
      duration: '3N2D',
      companion: 'couple',
      budget: 'standard',
      days: [],
    },
    ...overrides,
  };
}

test('Phase 1 deterministic intake flags missing fields, detects general Q&A, and extracts complete trip constraints', () => {
  const vague = runPhase1IntakeDeterministic(
    makeChatReq('Lên lịch trình đi Đắk Lắk giúp mình nhé')
  );
  assert.equal(vague.intake.intent, 'plan_trip');
  assert.equal(vague.intake.needsClarification, true);
  assert.deepEqual(
    vague.intake.missingFields.sort(),
    ['budget', 'dates', 'travelers'].sort()
  );
  assert.ok(vague.intake.clarificationQuestion && vague.intake.clarificationQuestion.length > 10);

  const qa = runPhase1IntakeDeterministic(
    makeChatReq('Tháng 12 ở Đắk Lắk có mùa gì đẹp?')
  );
  assert.equal(qa.intake.intent, 'general_qa');
  assert.equal(qa.intake.needsClarification, false);

  const complete = runPhase1IntakeDeterministic(
    makeChatReq(
      'Lập kế hoạch cho gia đình 5 người đi Đắk Lắk 3N2Đ vào tháng 12, ngân sách 15 triệu, thích cà phê và văn hóa'
    )
  );
  assert.equal(complete.intake.intent, 'plan_trip');
  assert.equal(complete.intake.needsClarification, false);
  assert.equal(complete.intake.travelersCount, 5);
  assert.equal(complete.intake.companionType, 'family');
  assert.equal(complete.intake.duration, '3N2D');
  assert.equal(complete.intake.totalBudgetVnd, 15000000);
  assert.equal(complete.intake.mainPurpose, 'coffee');
});

test('Phase 2 capacity enforces stop caps, seasonal mapping, and family vs solo logistics', () => {
  const familyIntake: IntakeState = {
    intent: 'plan_trip',
    travelersCount: 5,
    companionType: 'family',
    travelDates: 'Tháng 8',
    duration: '3N2D',
    totalBudgetVnd: 15000000,
    budgetTier: 'standard',
    mainPurpose: 'nature',
    secondaryInterests: [],
    missingFields: [],
    needsClarification: false,
    rawUserGoal: 'Đi thác tháng 8',
  };

  const familyPlan = runPhase2Capacity(familyIntake);
  assert.equal(familyPlan.dayCount, 3);
  assert.equal(familyPlan.maxStopsPerDay, 2);
  assert.equal(familyPlan.maxStopsTotal, 6);
  assert.equal(familyPlan.maxDailyDistanceKm, 120);
  assert.match(familyPlan.seasonHeadline, /Thu/i);
  assert.ok(familyPlan.selectedLogistics, 'Family of 5 should receive logistics');
  assert.ok(
    familyPlan.selectedLogistics.capacityMax >= 5,
    `Expected vehicle capacity >= 5, got ${familyPlan.selectedLogistics.capacityMax}`
  );

  const solo2Days: IntakeState = {
    intent: 'plan_trip',
    travelersCount: 1,
    companionType: 'solo',
    travelDates: 'Tháng 12',
    duration: '2N1D',
    totalBudgetVnd: 2200000,
    budgetTier: 'budget',
    mainPurpose: 'coffee',
    secondaryInterests: [],
    missingFields: [],
    needsClarification: false,
    rawUserGoal: 'Độc hành săn mùa thu hoạch cà phê',
  };

  const soloPlan = runPhase2Capacity(solo2Days);
  assert.equal(soloPlan.dayCount, 2);
  assert.ok(soloPlan.maxStopsTotal <= 5, `2-day cap must be <= 5, got ${soloPlan.maxStopsTotal}`);
  assert.equal(soloPlan.maxStopsPerDay, 3);
  assert.match(soloPlan.seasonHeadline, /Đông/i);
  assert.ok(soloPlan.selectedLogistics);
  assert.equal(soloPlan.selectedLogistics.tier, 'budget');
  assert.ok(
    ['motorbike', 'local_bus_shuttle'].includes(soloPlan.selectedLogistics.mode),
    `Unexpected budget solo transport: ${soloPlan.selectedLogistics.mode}`
  );

  assert.match(resolveSeasonFromDates('Tháng 2').headline, /Xuân/i);
  assert.match(resolveSeasonFromDates('Tháng 5').headline, /Hạ/i);
  assert.match(resolveSeasonFromDates('Tháng 8').headline, /Thu/i);
  assert.match(resolveSeasonFromDates('Tháng 12').headline, /Đông/i);
});

test('Phase 3 budget refreshes stale places via mocked Tavily, skips fresh cache, and prunes over-budget stops', async () => {
  const nowMs = Date.parse('2026-11-19T00:00:00.000Z');
  const freshIso = new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(); // 2h old
  const staleIso = new Date(nowMs - 240 * 60 * 60 * 1000).toISOString(); // 240h > 168h TTL

  assert.equal(isPriceTimestampStale(freshIso, 168, nowMs), false);
  assert.equal(isPriceTimestampStale(staleIso, 168, nowMs), true);

  const intake: IntakeState = {
    intent: 'plan_trip',
    travelersCount: 2,
    companionType: 'couple',
    travelDates: 'Tháng 12',
    duration: '2N1D',
    totalBudgetVnd: 2000000,
    budgetTier: 'budget',
    mainPurpose: 'coffee',
    secondaryInterests: [],
    missingFields: [],
    needsClarification: false,
  };
  const capacityPlan = runPhase2Capacity(intake);

  const tavilyCalls: string[] = [];
  const mockTavilyLookup = async (placeTitle: string) => {
    tavilyCalls.push(placeTitle);
    return {
      placeTitle,
      ticketVnd: 150000,
      estimatedSpendVnd: 180000,
      priceNote: 'Giá cập nhật từ Tavily mock',
      sourceUrl: 'https://daklak.example.com/gia-ve',
      citations: [
        {
          title: `Giá vé ${placeTitle}`,
          url: 'https://daklak.example.com/gia-ve',
          snippet: 'Vé tham quan 150.000đ',
          source: 'tavily' as const,
        },
      ],
      verified: true,
      usedDecisionApi: false,
    };
  };

  // Build synthetic enriched places: 1 fresh cache, 1 stale cache, 1 prohibitively expensive
  const basePlaces = listEnrichedPlaces(168, nowMs).slice(0, 3);
  basePlaces[0] = {
    ...basePlaces[0],
    title: 'Làng Cà phê Trung Nguyên',
    themeTags: ['coffee'],
    ticketVnd: 0,
    estimatedSpendVnd: 100000,
    priceSource: 'sqlite_cache',
    fetchedAt: freshIso,
    isStale: false,
  };
  basePlaces[1] = {
    ...basePlaces[1],
    title: 'Bảo tàng Thế giới Cà phê',
    themeTags: ['coffee', 'culture'],
    ticketVnd: 150000,
    estimatedSpendVnd: 220000,
    priceSource: 'seed',
    fetchedAt: staleIso,
    isStale: true,
  };
  basePlaces[2] = {
    ...basePlaces[2],
    title: 'Vườn Quốc gia Yok Đôn',
    themeTags: ['nature'],
    ticketVnd: 60000,
    estimatedSpendVnd: 1200000, // 2.4M for 2 pax -> exceeds remaining activity budget
    priceSource: 'sqlite_cache',
    fetchedAt: freshIso,
    isStale: false,
  };

  const budgetResult = await runPhase3Budget(intake, capacityPlan, {
    places: basePlaces,
    tavilyLookupFn: mockTavilyLookup,
    skipSqliteUpsert: true,
    nowMs,
  });

  // Fresh place must NOT be queried; only stale place should call Tavily
  assert.deepEqual(tavilyCalls, ['Bảo tàng Thế giới Cà phê']);
  assert.equal(budgetResult.citations.length, 1);
  assert.equal(budgetResult.citations[0].url, 'https://daklak.example.com/gia-ve');

  const refreshed = budgetResult.feasiblePlaces.find(
    (p) => p.title === 'Bảo tàng Thế giới Cà phê'
  );
  assert.ok(refreshed);
  assert.equal(refreshed.priceSource, 'tavily');
  assert.equal(refreshed.estimatedSpendVnd, 180000);

  // Expensive stop must be pruned into excludedOverBudget
  assert.ok(
    budgetResult.excludedOverBudget.some((p) => p.title === 'Vườn Quốc gia Yok Đôn'),
    'Yok Đôn with 1.2M/pax should be excluded under tight 2M budget'
  );
  assert.ok(budgetResult.estimatedTotalVnd <= 2000000);

  // Verify SQLite upsert + fresh read roundtrip
  upsertPlacePrice({
    placeTitle: 'Bảo tàng Thế giới Cà phê',
    areaCluster: 'BMT',
    ticketVnd: 155000,
    estimatedSpendVnd: 190000,
    priceSource: 'tavily',
    priceNote: 'Mock SQLite upsert',
    sourceUrl: 'https://daklak.example.com/gia-ve',
    fetchedAt: freshIso,
  });
  const afterUpsert = listEnrichedPlaces(168, nowMs).find(
    (p) => p.title === 'Bảo tàng Thế giới Cà phê'
  );
  assert.ok(afterUpsert);
  assert.equal(afterUpsert.isStale, false);
  assert.equal(afterUpsert.ticketVnd, 155000);
  assert.equal(afterUpsert.priceSource, 'tavily');
});

test('Tavily price parser & client wrapper extract VND prices deterministically', async () => {
  const parsed = extractVndPricesFromText(
    'Giá vé vào cổng 150.000đ, combo trải nghiệm cupping 250k tại BMT.'
  );
  assert.equal(parsed.ticketVnd, 150000);
  assert.equal(parsed.estimatedSpendVnd, 250000);

  // Incidental "miễn phí gửi xe" must not zero out an explicit paid ticket price
  const freeParkingWithPaidTicket = extractVndPricesFromText(
    'Miễn phí gửi xe, giá vé tham quan người lớn 75.000đ, combo 150.000đ.'
  );
  assert.equal(freeParkingWithPaidTicket.ticketVnd, 75000);
  assert.equal(freeParkingWithPaidTicket.estimatedSpendVnd, 150000);

  const tavilyRes = await searchPlacePriceWithTavily('Bảo tàng Thế giới Cà phê', 'BMT', {
    tavilyClient: {
      async search() {
        return {
          answer: 'Vé tham quan Bảo tàng Thế giới Cà phê khoảng 150.000 VND.',
          results: [
            {
              title: 'Bảng giá vé Bảo tàng Thế giới Cà phê',
              url: 'https://example.com/coffee-museum-tickets',
              content: 'Giá vé lẻ 150.000đ, vé trọn gói 220.000đ.',
            },
          ],
        };
      },
    },
  });

  assert.ok(tavilyRes);
  assert.equal(tavilyRes.ticketVnd, 150000);
  assert.equal(tavilyRes.estimatedSpendVnd, 220000);
  assert.equal(tavilyRes.verified, true);
  assert.equal(tavilyRes.citations[0].url, 'https://example.com/coffee-museum-tickets');
});

test('Phase 4 purpose selection applies seasonal boosts, cluster coherence, and integrates mock CMS posts', async () => {
  const augNatureIntake: IntakeState = {
    intent: 'plan_trip',
    travelersCount: 2,
    companionType: 'couple',
    travelDates: 'Tháng 8',
    duration: '2N1D',
    totalBudgetVnd: 8000000,
    budgetTier: 'standard',
    mainPurpose: 'nature',
    secondaryInterests: ['thác'],
    missingFields: [],
    needsClarification: false,
  };

  const capacityPlan = runPhase2Capacity(augNatureIntake);
  const budgetResult = await runPhase3Budget(augNatureIntake, capacityPlan, {
    forceSkipTavily: true,
    skipSqliteUpsert: true,
  });

  const mockPosts: CmsPostPublic[] = [
    {
      id: 101,
      slug: 'mua-nuoc-do-thac-dray-nur',
      legacyKey: null,
      section: 'stories',
      status: 'published',
      sortOrder: 0,
      title: 'Mùa nước đổ thác Dray Nur tháng 8',
      excerpt: 'Thác Dray Nur tung bọt trắng xóa giữa mùa mưa đại ngàn.',
      category: 'Thiên nhiên',
      location: 'Krông Ana • Đắk Lắk',
      readTime: '4 phút',
      cta: 'Đọc tiếp',
      image: '/uploads/draynur.jpg',
      imageAlt: 'Thác Dray Nur',
      themeKey: 'nature',
      previewParagraphs: ['...'],
      contentHtml: '<p>...</p>',
      quote: '...',
      quoteSource: '...',
      glossary: [],
      authorId: 1,
      authorName: 'Admin',
      publishedAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      translationStatus: 'none',
    },
  ];

  const selection = await runPhase4Purpose(augNatureIntake, capacityPlan, budgetResult, {
    lang: 'vi',
    queryPostsFn: () => mockPosts,
  });

  assert.equal(selection.scoringMethod, 'deterministic');
  assert.ok(selection.selectedPlaces.length > 0);
  assert.ok(selection.selectedPlaces.length <= capacityPlan.maxStopsTotal);
  assert.equal(
    selection.selectedPlaces[0].title,
    'Thác Dray Nur Hùng Vĩ',
    'August nature trip should rank Thác Dray Nur Hùng Vĩ #1'
  );
  assert.equal(selection.relevantPosts.length, 1);
  assert.equal(selection.relevantPosts[0].slug, 'mua-nuoc-do-thac-dray-nur');
});

test('External and general Q&A queries fetch Tavily context and ground replies with external snippets', async () => {
  const externalQuery = 'Chùa Sắc Tứ Khải Đoan ở Buôn Ma Thuột có gì đặc biệt và mở cửa mấy giờ?';
  const intakeOut = runPhase1IntakeDeterministic(makeChatReq(externalQuery));
  assert.equal(intakeOut.intake.intent, 'general_qa');
  assert.equal(intakeOut.intake.needsClarification, false);

  const searchedQueries: string[] = [];
  const tavilyCtx = await maybeFetchTavilyQaContext(externalQuery, {
    tavilyClient: {
      async search(query) {
        searchedQueries.push(query);
        return {
          answer:
            'Chùa Sắc Tứ Khải Đoan là ngôi chùa lớn nhất tại TP. Buôn Ma Thuột, mở cửa từ 06:00 đến 20:00 hằng ngày, miễn phí vé vào cổng.',
          results: [
            {
              title: 'Chùa Sắc Tứ Khải Đoan Buôn Ma Thuột - Giờ mở cửa & kiến trúc',
              url: 'https://daklak.example.com/chua-sac-tu-khai-doan',
              content:
                'Chùa Sắc Tứ Khải Đoan tọa lạc tại số 117 Phan Bội Châu, TP. Buôn Ma Thuột, mở cửa 06:00 - 20:00.',
            },
          ],
        };
      },
    },
  });

  assert.equal(searchedQueries.length, 1);
  assert.ok(tavilyCtx.snippets.length >= 1);
  assert.ok(tavilyCtx.citations.length >= 1);
  assert.equal(tavilyCtx.citations[0].url, 'https://daklak.example.com/chua-sac-tu-khai-doan');

  const reply = buildGroundedQaReplyDeterministic(makeChatReq(externalQuery), {
    tavilySnippets: tavilyCtx.snippets,
    ...(typeof (tavilyCtx as { answer?: string }).answer === 'string'
      ? { tavilyAnswer: (tavilyCtx as { answer?: string }).answer }
      : {}),
  } as Parameters<typeof buildGroundedQaReplyDeterministic>[1]);

  assert.match(reply, /Khải Đoan|06:00|Phan Bội Châu/i);

  const generalTavily = await searchGeneralQaWithTavily(externalQuery, {
    bypassCache: true,
    tavilyClient: {
      async search() {
        return {
          answer: 'Chùa Sắc Tứ Khải Đoan mở cửa 06:00 - 20:00 mỗi ngày.',
          results: [
            {
              title: 'Chùa Sắc Tứ Khải Đoan BMT',
              url: 'https://daklak.example.com/khai-doan',
              content: 'Địa chỉ: 117 Phan Bội Châu, TP. Buôn Ma Thuột.',
            },
          ],
        };
      },
    },
  });
  assert.ok(generalTavily);
  assert.equal(generalTavily.status, 'ok');
  assert.match(generalTavily.answer || '', /06:00 - 20:00/);
  assert.equal(generalTavily.citations[0].url, 'https://daklak.example.com/khai-doan');

  // Specific Đắk Lắk sub-locations (including "Hồ Lăk" without tone mark) append only "Đắk Lắk"
  const hoLakQuery = buildTavilyQaQuery('Hồ Lăk buôn jun có dịch vụ thuê thuyền không');
  assert.equal(hoLakQuery, 'Hồ Lăk buôn jun có dịch vụ thuê thuyền không Đắk Lắk');

  // Timeouts and API errors expose diagnostic status/error fields instead of failing silently
  const timedOut = await searchGeneralQaWithTavily('Hồ Lăk buôn jun có dịch vụ thuê thuyền không', {
    bypassCache: true,
    timeoutMs: 25,
    tavilyClient: {
      search: () => new Promise((resolve) => setTimeout(() => resolve({ results: [] }), 150)),
    },
  });
  assert.equal(timedOut.status, 'timeout');
  assert.match(timedOut.error || '', /timed out/i);

  const errored = await searchGeneralQaWithTavily('Hồ Lăk buôn jun có dịch vụ thuê thuyền không', {
    bypassCache: true,
    tavilyClient: {
      async search() {
        throw new Error('401 Unauthorized');
      },
    },
  });
  assert.equal(errored.status, 'api_error');
  assert.equal(errored.error, '401 Unauthorized');

  // Vietnamese festival question about Ako Dhông must not collide with Homestay pricing or leak English Tavily answers
  const akoDhongFestReq = makeChatReq(
    'Lễ hội Cồng Chiêng tại Buôn Cổ Ako Dhông có diễn ra vào ngày 20/11/2026 không?',
    'en'
  );
  const akoDhongReply = buildGroundedQaReplyDeterministic(akoDhongFestReq, {
    tavilyAnswer:
      'The sources indicate that the Cồng Chiêng festival is organized in various ethnic groups in the Central Highlands, including in Buôn Cổ Ako Dhông.',
    tavilySnippets: [
      {
        title: 'Lịch biểu diễn Cồng chiêng tại Buôn cổ Ako Dhông',
        url: 'https://daklak.example.com/cong-chieng-ako-dhong',
        content: 'Buôn cổ Ako Dhông tổ chức giao lưu văn hóa cồng chiêng định kỳ cho khách đoàn.',
      },
    ],
  });
  assert.doesNotMatch(akoDhongReply, /Homestay Nhà Dài Ako Dhông|450\.000đ/i);
  assert.doesNotMatch(akoDhongReply, /The sources indicate/i);
  assert.match(akoDhongReply, /Buôn cổ Ako Dhông|Cồng chiêng/i);
  assert.match(akoDhongReply, /\n-\s+\*\*/);
});

test('LangGraph 4 structured tools and compiled StateGraph with MemorySaver checkpointing execute end-to-end', async () => {
  clearLangGraphMemory();

  assert.deepEqual(LANGGRAPH_TOOL_NAMES, [
    'search_local_daklak_catalog',
    'search_live_web_tavily',
    'update_trip_intake',
    'plan_or_modify_itinerary',
  ]);

  const baseReq = makeChatReq(
    'Lập kế hoạch cho cặp đôi 2 người đi Đắk Lắk 2N1Đ vào tháng 12, ngân sách 5 triệu, thích cà phê'
  );
  const tools = createDakLakLangGraphTools({
    req: baseReq,
    options: {
      forceSkipTavily: false,
      skipSqliteUpsert: true,
      tavilyClient: {
        async search() {
          return {
            answer: 'Lễ hội Cà phê Buôn Ma Thuột diễn ra định kỳ tại Quảng trường 10/3.',
            results: [
              {
                title: 'Lễ hội Cà phê Buôn Ma Thuột',
                url: 'https://daklak.example.com/coffee-festival',
                content: 'Thông tin lễ hội cà phê Buôn Ma Thuột tại Đắk Lắk.',
              },
            ],
          };
        },
      },
    },
  });

  // 1. search_local_daklak_catalog tool
  const localCatalog = await tools.search_local_daklak_catalog.invoke({
    query: 'cà phê Buôn Ma Thuột',
    lang: 'vi',
    themeKey: 'coffee',
  });
  assert.ok(localCatalog.stays.length >= 6);
  assert.ok(localCatalog.logistics.length >= 4);
  assert.ok(localCatalog.places.length >= 13);
  assert.ok(localCatalog.seasons.length >= 4);

  // 2. search_live_web_tavily tool
  const liveWeb = await tools.search_live_web_tavily.invoke({
    query: 'Lễ hội Cà phê Buôn Ma Thuột tổ chức ở đâu?',
  });
  assert.ok(liveWeb.answer?.includes('Quảng trường 10/3'));
  assert.equal(liveWeb.citations[0].url, 'https://daklak.example.com/coffee-festival');

  // 3. update_trip_intake tool
  const intakeOut = await tools.update_trip_intake.invoke({
    message: baseReq.message,
    lang: 'vi',
    isFollowUp: false,
  });
  assert.equal(intakeOut.intake.intent, 'plan_trip');
  assert.equal(intakeOut.intake.needsClarification, false);
  assert.equal(intakeOut.intake.duration, '2N1D');
  assert.equal(intakeOut.intake.totalBudgetVnd, 5000000);

  // 4. plan_or_modify_itinerary tool
  const plannedOut = await tools.plan_or_modify_itinerary.invoke({
    mode: 'full_plan',
    message: baseReq.message,
  });
  assert.equal(plannedOut.handled, true);
  assert.equal(plannedOut.mode, 'full_plan');
  assert.ok(plannedOut.capacityPlan);
  assert.ok(plannedOut.budgetResult);
  assert.ok(plannedOut.purposeSelection);
  assert.equal(plannedOut.response?.generatedDays?.length, 2);

  // 5. Multi-turn StateGraph + MemorySaver thread checkpointing
  const sessionId = 'sess_langgraph_checkpoint_test';
  const compiledGraph = buildDakLakLangGraph({ forceSkipTavily: true, skipSqliteUpsert: true });
  assert.ok(compiledGraph);

  // Turn 1: Vague trip request -> needs_clarification stored in MemorySaver under thread_id
  const turn1 = await runLangGraphChat(
    makeChatReq('Lên lịch trình đi Đắk Lắk giúp mình nhé'),
    {
      sessionId,
      traceId: 'lg-trace-turn-1',
      forceSkipTavily: true,
      skipSqliteUpsert: true,
    }
  );
  assert.equal(turn1.engine, 'langgraph');
  assert.equal(turn1.status, 'needs_clarification');
  assert.ok(turn1.toolsUsed?.includes('update_trip_intake'));
  assert.deepEqual(turn1.graphNodesVisited, [
    'supervisor_router',
    'tool_execution_node',
    'synthesis_node',
    'evaluator_guardrail_node',
  ]);

  // Verify checkpoint tuple exists in MemorySaver for sessionId
  const checkpointTuple = await getLangGraphCheckpointer().getTuple({
    configurable: { thread_id: sessionId },
  });
  assert.ok(checkpointTuple, 'Expected MemorySaver checkpoint tuple for thread_id');

  // Turn 2: Follow-up on the SAME sessionId without passing req.draftIntake (restored from MemorySaver checkpoint!)
  const turn2 = await runLangGraphChat(
    makeChatReq('Cặp đôi đi 2N1Đ tháng 12 ngân sách 5 triệu', { isFollowUp: true }),
    {
      sessionId,
      traceId: 'lg-trace-turn-2',
      forceSkipTavily: true,
      skipSqliteUpsert: true,
    }
  );
  assert.equal(turn2.engine, 'langgraph');
  assert.equal(turn2.status, 'completed');
  assert.equal(turn2.generatedDays?.length, 2);
  assert.ok(turn2.toolsUsed?.includes('update_trip_intake'));
  assert.ok(turn2.toolsUsed?.includes('plan_or_modify_itinerary'));
  assert.deepEqual(turn2.graphNodesVisited, [
    'supervisor_router',
    'tool_execution_node',
    'synthesis_node',
    'evaluator_guardrail_node',
  ]);

  const meta2 = getLangGraphTraceMetadata('lg-trace-turn-2');
  assert.ok(meta2);
  assert.equal(meta2.evalResult?.passed, true);
  assert.equal(meta2.evalResult?.score, 100);
});
