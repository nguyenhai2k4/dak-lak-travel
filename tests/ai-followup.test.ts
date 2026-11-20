import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { dakLakPlaceDirectory } from '../src/data/places.ts';
import type {
  AiChatRequest,
  ExpenseItem,
  ItineraryDay,
} from '../src/types/index.ts';
import {
  applyAiStopOperations,
  applyExpensePatch,
  applyReorderOps,
} from '../src/utils/plannerHelpers.ts';

// Isolated temp SQLite DB & deterministic offline env before importing server modules
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daklak-ai-followup-'));
process.env.CMS_DB_PATH = path.join(tmpDir, 'followup-test.db');
process.env.GEMINI_API_KEY = '';
process.env.GEMINI_DECISION_MODEL = '';
process.env.TAVILY_API_KEY = '';

const { ensureSeedData } = await import('../server/db/seed.ts');
const { closeDb } = await import('../server/db/database.ts');
const {
  buildClarificationOptions,
  inferTravelersCountFromCompanion,
  runPhase1IntakeDeterministic,
} = await import('../server/services/ai/workflow/phase1Intake.ts');
const {
  classifyFollowUpActionDeterministic,
  routeFollowUp,
} = await import('../server/services/ai/workflow/followUpRouter.ts');
const { handleAiChat } = await import('../server/services/ai/aiChatbot.ts');

ensureSeedData();

after(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeActiveDays(singleStopDay1 = false): ItineraryDay[] {
  const day1Slots = singleStopDay1
    ? [
        {
          id: 'slot-1-1',
          time: '11:30 – 12:45',
          period: 'Buổi trưa',
          title: 'Đá Voi Mẹ Yang Tao',
          location: 'Xã Yang Tao • Quốc lộ 27',
          x: 478,
          y: 256,
          lat: 12.48139,
          lng: 108.23306,
          desc: 'Tảng đá nguyên khối lớn nhất Việt Nam.',
        },
      ]
    : [
        {
          id: 'slot-1-1',
          time: '08:00 – 09:30',
          period: 'Buổi sáng',
          title: 'Hồ Lắk & Buôn Jun',
          location: 'Thị trấn Liên Sơn • Huyện Lắk',
          x: 545,
          y: 315,
          lat: 12.42167,
          lng: 108.18194,
          desc: 'Hồ nước ngọt tự nhiên rộng 500ha.',
        },
        {
          id: 'slot-1-2',
          time: '11:30 – 12:45',
          period: 'Buổi trưa',
          title: 'Đá Voi Mẹ Yang Tao',
          location: 'Xã Yang Tao • Quốc lộ 27',
          x: 478,
          y: 256,
          lat: 12.48139,
          lng: 108.23306,
          desc: 'Tảng đá nguyên khối lớn nhất Việt Nam.',
        },
        {
          id: 'slot-1-3',
          time: '14:30 – 16:30',
          period: 'Buổi chiều',
          title: 'Buôn cổ Ako Dhông',
          location: 'Cuối đường Trần Nhật Duật • BMT',
          x: 392,
          y: 150,
          lat: 12.6964,
          lng: 108.0478,
          desc: 'Ngôi buôn giàu truyền thống nhất BMT.',
        },
      ];

  return [
    {
      day: 'Ngày 1',
      title: 'Hồ Lắk & Yang Tao',
      area: 'Hồ Lắk • BMT',
      slots: day1Slots,
    },
    {
      day: 'Ngày 2',
      title: 'Thác Dray Nur & Thổ cẩm',
      area: 'Dray Nur • Ea Kao',
      slots: [
        {
          id: 'slot-2-1',
          time: '08:00 – 11:00',
          period: 'Buổi sáng',
          title: 'Thác Dray Nur Hùng Vĩ',
          location: 'Xã Dray Sáp • Krông Ana',
          x: 268,
          y: 285,
          lat: 12.5028,
          lng: 107.925,
          desc: 'Bức tường nước trắng xóa rộng 250m.',
        },
      ],
    },
  ];
}

function makeSampleExpenses(): ExpenseItem[] {
  return [
    { id: 'exp-stay', title: 'Lưu trú 2 đêm (Tiêu chuẩn)', cat: 'stay', amount: 3000000 },
    { id: 'exp-transit', title: 'Di chuyển & thuê xe', cat: 'transit', amount: 2000000 },
    { id: 'exp-food', title: 'Ẩm thực & Cà phê', cat: 'food', amount: 2000000 },
    { id: 'exp-act', title: 'Vé tham quan & trải nghiệm', cat: 'activity', amount: 1000000 },
  ];
}

function makeFollowUpReq(
  message: string,
  overrides?: Partial<AiChatRequest> & { singleStopDay1?: boolean }
): AiChatRequest {
  const days = makeActiveDays(overrides?.singleStopDay1);
  return {
    message,
    lang: 'vi',
    isFollowUp: true,
    currentState: {
      theme: 'nature',
      duration: '3N2D',
      companion: 'couple',
      budget: 'standard',
      days: days.map((d) => ({
        day: d.day,
        title: d.title,
        slots: d.slots.map((s) => ({
          title: s.title,
          location: s.location,
          time: s.time,
        })),
      })),
    },
    currentExpenses: makeSampleExpenses().map(({ title, cat, amount }) => ({
      title,
      cat,
      amount,
    })),
    ...overrides,
  };
}

test('Multi-turn draftIntake merges companionType, travelersCount, dates, and budget without re-asking', async () => {
  assert.equal(inferTravelersCountFromCompanion('solo'), 1);
  assert.equal(inferTravelersCountFromCompanion('couple'), 2);
  assert.equal(inferTravelersCountFromCompanion('family'), 4);
  assert.equal(inferTravelersCountFromCompanion('friends'), 4);
  assert.equal(inferTravelersCountFromCompanion(null), null);

  // Explicit numeric count still overrides default inference
  const explicitGroup = runPhase1IntakeDeterministic({
    message: 'Lập kế hoạch cho nhóm bạn 6 người đi 3N2Đ tháng 12, 12 triệu',
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
  assert.equal(explicitGroup.intake.companionType, 'friends');
  assert.equal(explicitGroup.intake.travelersCount, 6);
  assert.equal(explicitGroup.intake.needsClarification, false);

  // Turn 1: Vague initial request -> asks for all 3 missing fields
  const turn1 = await handleAiChat({
    message: 'Lên lịch trình đi Đắk Lắk giúp mình nhé',
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
  assert.equal(turn1.status, 'needs_clarification');
  assert.ok(turn1.draftIntake);
  assert.deepEqual(
    [...(turn1.draftIntake.missingFields || [])].sort(),
    ['budget', 'dates', 'travelers']
  );
  assert.ok(turn1.clarificationOptions && turn1.clarificationOptions.length > 0);
  const turn1Fields = new Set(turn1.clarificationOptions.map((o) => o.field));
  assert.deepEqual([...turn1Fields].sort(), ['budget', 'dates', 'travelers']);

  // Turn 2: User supplies "nhóm bạn" + dates ("tháng 12 3N2Đ") -> infers travelersCount: 4, only asks for budget
  const turn2 = await handleAiChat({
    message: 'nhóm bạn đi tháng 12 3N2Đ',
    lang: 'vi',
    isFollowUp: true,
    draftIntake: turn1.draftIntake,
    currentState: {
      theme: 'coffee',
      duration: '3N2D',
      companion: 'couple',
      budget: 'standard',
      days: [],
    },
  });
  assert.equal(turn2.status, 'needs_clarification');
  assert.ok(turn2.draftIntake);
  assert.equal(turn2.draftIntake.companionType, 'friends');
  assert.equal(turn2.draftIntake.travelersCount, 4);
  assert.equal(turn2.draftIntake.duration, '3N2D');
  assert.match(turn2.draftIntake.travelDates || '', /Tháng 12/);
  assert.deepEqual(turn2.draftIntake.missingFields, ['budget']);

  // clarificationOptions MUST only include missing fields ('budget')
  assert.ok(turn2.clarificationOptions && turn2.clarificationOptions.length > 0);
  assert.ok(
    turn2.clarificationOptions.every((o) => o.field === 'budget'),
    `Expected only budget options, got: ${turn2.clarificationOptions.map((o) => o.field).join(', ')}`
  );
  assert.deepEqual(
    buildClarificationOptions('vi', ['budget']).map((o) => o.field),
    ['budget', 'budget', 'budget']
  );

  // Mid-intake general Q&A escape hatch: asking a general question while clarifying answers the question AND preserves draftIntake
  const midQaTurn = await handleAiChat({
    message: 'Cho mình hỏi ở BMT có khách sạn nào có hồ bơi không?',
    lang: 'vi',
    isFollowUp: true,
    draftIntake: turn2.draftIntake,
    currentState: {
      theme: 'coffee',
      duration: '3N2D',
      companion: 'couple',
      budget: 'standard',
      days: [],
    },
  });
  assert.equal(midQaTurn.intent, 'general_qa');
  assert.equal(midQaTurn.shouldOpenPlanner, false);
  assert.ok(midQaTurn.draftIntake, 'Mid-intake general_qa must preserve draftIntake');
  assert.equal(midQaTurn.draftIntake.companionType, 'friends');
  assert.deepEqual(midQaTurn.draftIntake.missingFields, ['budget']);
  assert.match(midQaTurn.reply, /Elephants Hotel Buôn Ma Thuột|Mường Thanh Luxury Buôn Ma Thuột/i);

  // Turn 3: Follow-up "4 triệu" merges with draftIntake instead of forgetting companionType/travelDates
  const turn3Phase1 = runPhase1IntakeDeterministic({
    message: '4 triệu',
    lang: 'vi',
    isFollowUp: true,
    draftIntake: turn2.draftIntake,
    currentState: {
      theme: 'coffee',
      duration: '3N2D',
      companion: 'couple',
      budget: 'standard',
      days: [],
    },
  });
  assert.equal(turn3Phase1.intake.needsClarification, false);
  assert.deepEqual(turn3Phase1.intake.missingFields, []);
  assert.equal(turn3Phase1.intake.companionType, 'friends');
  assert.equal(turn3Phase1.intake.travelersCount, 4);
  assert.equal(turn3Phase1.intake.totalBudgetVnd, 4_000_000);
  assert.match(turn3Phase1.intake.travelDates || '', /Tháng 12/);

  const turn3Chat = await handleAiChat({
    message: '4 triệu',
    lang: 'vi',
    isFollowUp: true,
    draftIntake: turn2.draftIntake,
    currentState: {
      theme: 'coffee',
      duration: '3N2D',
      companion: 'couple',
      budget: 'standard',
      days: [],
    },
  });
  assert.equal(turn3Chat.status, 'completed');
  assert.equal(turn3Chat.preferences.companion, 'friends');
  assert.equal(turn3Chat.preferences.duration, '3N2D');
  assert.ok(turn3Chat.generatedDays && turn3Chat.generatedDays.length === 3);
});

test('Category-based modify_stops swap routes without 5 phases and replaces cleanly on a 1-stop day', async () => {
  const prompt = 'Tôi muốn đổi địa điểm Đá Voi Mẹ Yang Tao sang 1 nơi để thưởng thức cà phê';
  const req = makeFollowUpReq(prompt, { singleStopDay1: true });

  assert.equal(classifyFollowUpActionDeterministic(req), 'modify_stops');

  const routed = await routeFollowUp(req);
  assert.equal(routed.followUpAction, 'modify_stops');
  assert.equal(routed.handled, true);
  assert.ok(routed.response);

  const chatRes = await handleAiChat(req);
  assert.equal(chatRes.status, 'completed');
  assert.equal(chatRes.intent, 'modify_stops');
  assert.equal(chatRes.followUpAction, 'modify_stops');
  assert.equal(chatRes.resetItineraryToTheme, false);
  assert.equal(chatRes.generatedDays, undefined, 'modify_stops must NOT run full 5-phase synthesis');

  const removeOp = chatRes.stopOperations.find((op) => op.action === 'remove');
  const addOp = chatRes.stopOperations.find((op) => op.action === 'add');

  assert.ok(removeOp, 'Expected remove operation for Đá Voi Mẹ Yang Tao');
  assert.equal(removeOp.placeTitle, 'Đá Voi Mẹ Yang Tao');
  assert.equal(removeOp.dayNumber, 1);

  assert.ok(addOp, 'Expected add operation for a real directory coffee place');
  assert.equal(addOp.dayNumber, 1);
  const directoryMatch = dakLakPlaceDirectory.find((p) => p.title === addOp.placeTitle);
  assert.ok(directoryMatch, `Added place "${addOp.placeTitle}" must exist in dakLakPlaceDirectory`);
  assert.match(
    `${directoryMatch.title} ${directoryMatch.category}`.toLowerCase(),
    /cà phê/,
    'Added place should be a coffee destination'
  );

  // Apply stopOperations to a 1-stop Day 1
  const workingDays = makeActiveDays(true);
  assert.equal(workingDays[0].slots.length, 1);

  const applied = applyAiStopOperations(workingDays, chatRes.stopOperations, 'nature');
  assert.equal(applied.changed, true);
  assert.equal(applied.addedStopTitle, addOp.placeTitle);
  assert.equal(applied.nextDays[0].slots.length, 1, '1-stop day should remain 1 stop after swap');
  assert.equal(applied.nextDays[0].slots[0].title, addOp.placeTitle);
  assert.ok(
    !applied.nextDays[0].slots.some((s) => s.title === 'Đá Voi Mẹ Yang Tao'),
    'Removed stop must no longer be on Day 1'
  );

  // Guard: removing sole stop WITHOUT a replacement add on that day must still be prevented
  const removeOnly = applyAiStopOperations(
    workingDays,
    [{ action: 'remove', placeTitle: 'Đá Voi Mẹ Yang Tao', dayNumber: 1 }],
    'nature'
  );
  assert.equal(removeOnly.changed, false);
  assert.equal(removeOnly.nextDays[0].slots.length, 1);
});

test('adjust_budget follow-up routes with expensePatch and updates expenses without touching workingDays', async () => {
  const req = makeFollowUpReq('Tăng ăn uống lên 35%, giảm tiền phòng');
  assert.equal(classifyFollowUpActionDeterministic(req), 'adjust_budget');

  const chatRes = await handleAiChat(req);
  assert.equal(chatRes.status, 'completed');
  assert.equal(chatRes.followUpAction, 'adjust_budget');
  assert.equal(chatRes.resetItineraryToTheme, false);
  assert.equal(chatRes.generatedDays, undefined, 'adjust_budget must skip full 5 phases');
  assert.deepEqual(chatRes.stopOperations, []);
  assert.ok(chatRes.expensePatch?.allocationPcts, 'Expected allocationPcts in expensePatch');

  const pcts = chatRes.expensePatch.allocationPcts;
  assert.equal(pcts.food, 35);
  assert.ok((pcts.stay ?? 0) < 38, 'Expected stay percentage to decrease');
  assert.equal(
    (pcts.stay ?? 0) + (pcts.transit ?? 0) + (pcts.food ?? 0) + (pcts.activity ?? 0),
    100
  );

  const workingDaysBefore = makeActiveDays(false);
  const workingDaysSnapshot = JSON.stringify(workingDaysBefore);
  const expensesBefore = makeSampleExpenses();
  const totalBefore = expensesBefore.reduce((s, e) => s + e.amount, 0);

  const updatedExpenses = applyExpensePatch(expensesBefore, chatRes.expensePatch, '3N2D');
  const totalAfter = updatedExpenses.reduce((s, e) => s + e.amount, 0);
  const foodAfter = updatedExpenses.find((e) => e.cat === 'food')?.amount ?? 0;
  const stayAfter = updatedExpenses.find((e) => e.cat === 'stay')?.amount ?? 0;

  assert.equal(totalAfter, totalBefore);
  assert.equal(foodAfter, Math.round((totalBefore * 0.35) / 10000) * 10000);
  assert.ok(stayAfter < expensesBefore[0].amount);
  assert.equal(JSON.stringify(workingDaysBefore), workingDaysSnapshot);

  // Also verify totalBudgetVnd & customExpenseOps patching
  const totalReductionReq = makeFollowUpReq('Giảm tổng ngân sách xuống 5 triệu');
  assert.equal(classifyFollowUpActionDeterministic(totalReductionReq), 'adjust_budget');
  const totalReductionRes = await handleAiChat(totalReductionReq);
  assert.equal(totalReductionRes.followUpAction, 'adjust_budget');
  assert.equal(totalReductionRes.expensePatch?.totalBudgetVnd, 5_000_000);
  const reducedExpenses = applyExpensePatch(expensesBefore, totalReductionRes.expensePatch, '3N2D');
  assert.equal(
    reducedExpenses.reduce((s, e) => s + e.amount, 0),
    5_000_000
  );

  const customExpenseReq = makeFollowUpReq('Thêm chi phí mua quà 500k');
  assert.equal(classifyFollowUpActionDeterministic(customExpenseReq), 'adjust_budget');
  const customExpenseRes = await handleAiChat(customExpenseReq);
  assert.equal(customExpenseRes.followUpAction, 'adjust_budget');
  assert.equal(customExpenseRes.expensePatch?.customExpenseOps?.[0]?.action, 'add');
  assert.equal(customExpenseRes.expensePatch?.customExpenseOps?.[0]?.amount, 500_000);
  const withGift = applyExpensePatch(expensesBefore, customExpenseRes.expensePatch, '3N2D');
  assert.equal(withGift.length, expensesBefore.length + 1);
  assert.equal(withGift[withGift.length - 1].amount, 500_000);
});

test('swap_logistics, reorder_or_pace, and current_trip_qa skip 5 phases; full_replan escalates only on full duration/theme/rebuild', async () => {
  // 1. swap_logistics
  const logisticsReq = makeFollowUpReq('Đổi sang thuê xe máy và ở homestay Hồ Lắk');
  assert.equal(classifyFollowUpActionDeterministic(logisticsReq), 'swap_logistics');
  const logisticsRes = await handleAiChat(logisticsReq);
  assert.equal(logisticsRes.status, 'completed');
  assert.equal(logisticsRes.followUpAction, 'swap_logistics');
  assert.equal(logisticsRes.resetItineraryToTheme, false);
  assert.equal(logisticsRes.generatedDays, undefined);
  assert.ok(logisticsRes.stayMovePatch?.stayMove);
  assert.ok(logisticsRes.stayMovePatch?.selectedStayId);
  assert.ok(logisticsRes.stayMovePatch?.selectedLogisticsId);
  assert.ok(logisticsRes.expensePatch?.customExpenseOps?.length);

  const updatedAfterLogistics = applyExpensePatch(
    makeSampleExpenses(),
    logisticsRes.expensePatch,
    '3N2D'
  );
  assert.ok(updatedAfterLogistics.some((e) => e.cat === 'stay'));
  assert.ok(updatedAfterLogistics.some((e) => e.cat === 'transit'));

  // 2. reorder_or_pace
  const optimizeReq = makeFollowUpReq('Tối ưu tuyến đường ngày 1 cho đỡ vòng vèo');
  assert.equal(classifyFollowUpActionDeterministic(optimizeReq), 'reorder_or_pace');
  const optimizeRes = await handleAiChat(optimizeReq);
  assert.equal(optimizeRes.status, 'completed');
  assert.equal(optimizeRes.followUpAction, 'reorder_or_pace');
  assert.equal(optimizeRes.resetItineraryToTheme, false);
  assert.equal(optimizeRes.generatedDays, undefined);
  assert.deepEqual(optimizeRes.reorderOps, [{ dayNumber: 1, action: 'optimize_route' }]);

  // Verify applyReorderOps supports reverse, swap_slots, and optimize_route
  const baseDays = makeActiveDays(false);
  const reversed = applyReorderOps(baseDays, [{ dayNumber: 1, action: 'reverse' }]);
  assert.equal(reversed.changed, true);
  assert.deepEqual(
    reversed.nextDays[0].slots.map((s) => s.title),
    ['Buôn cổ Ako Dhông', 'Đá Voi Mẹ Yang Tao', 'Hồ Lắk & Buôn Jun']
  );

  const swapped = applyReorderOps(baseDays, [
    { dayNumber: 1, action: 'swap_slots', slotIndexA: 0, slotIndexB: 2 },
  ]);
  assert.equal(swapped.changed, true);
  assert.deepEqual(
    swapped.nextDays[0].slots.map((s) => s.title),
    ['Buôn cổ Ako Dhông', 'Đá Voi Mẹ Yang Tao', 'Hồ Lắk & Buôn Jun']
  );

  // Unordered route (Hồ Lắk -> Ako Dhông (BMT) -> Đá Voi Mẹ Yang Tao) should optimize to Hồ Lắk -> Yang Tao -> Ako Dhông
  const zigzagDays: ItineraryDay[] = [
    {
      ...baseDays[0],
      slots: [baseDays[0].slots[0], baseDays[0].slots[2], baseDays[0].slots[1]],
    },
  ];
  const optimized = applyReorderOps(zigzagDays, [{ dayNumber: 1, action: 'optimize_route' }]);
  assert.equal(optimized.changed, true);
  assert.deepEqual(
    optimized.nextDays[0].slots.map((s) => s.title),
    ['Hồ Lắk & Buôn Jun', 'Đá Voi Mẹ Yang Tao', 'Buôn cổ Ako Dhông']
  );

  // 3. current_trip_qa
  const qaReq = makeFollowUpReq('Ngày 1 mình đi những đâu và thời tiết tháng 12 thế nào?');
  assert.equal(classifyFollowUpActionDeterministic(qaReq), 'current_trip_qa');
  const qaRes = await handleAiChat(qaReq);
  assert.equal(qaRes.status, 'completed');
  assert.equal(qaRes.followUpAction, 'current_trip_qa');
  assert.equal(qaRes.intent, 'general_qa');
  assert.equal(qaRes.resetItineraryToTheme, false);
  assert.equal(qaRes.generatedDays, undefined);
  assert.match(qaRes.reply, /Hồ Lắk|Đá Voi Mẹ Yang Tao/);

  // 4. full_replan escalation ONLY when changing full trip duration/theme or rebuilding
  const durationReplanReq = makeFollowUpReq('Đổi sang lịch trình 4N3Đ giúp mình');
  assert.equal(classifyFollowUpActionDeterministic(durationReplanReq), 'full_replan');
  const durationRoute = await routeFollowUp(durationReplanReq);
  assert.equal(durationRoute.followUpAction, 'full_replan');
  assert.equal(durationRoute.handled, false);

  const durationChatRes = await handleAiChat(durationReplanReq);
  assert.equal(durationChatRes.status, 'completed');
  assert.equal(durationChatRes.followUpAction, 'full_replan');
  assert.equal(durationChatRes.resetItineraryToTheme, true);
  assert.equal(durationChatRes.preferences.duration, '4N3D+');
  assert.ok(durationChatRes.generatedDays && durationChatRes.generatedDays.length === 4);

  const themeReplanReq = makeFollowUpReq('Đổi chủ đề chuyến đi sang khám phá cà phê');
  assert.equal(classifyFollowUpActionDeterministic(themeReplanReq), 'full_replan');
  const themeRoute = await routeFollowUp(themeReplanReq);
  assert.equal(themeRoute.followUpAction, 'full_replan');
  assert.equal(themeRoute.handled, false);
});

test('Amenity/price/rental Q&A with stay or transport keywords routes to current_trip_qa without mutating plan', async () => {
  const poolPrompt = 'Tôi muốn ở homestay có hồ bơi. Homestay Nhà Dài Ako Dhông có hồ bơi không';

  // 1. Follow-up on active itinerary
  const poolFollowUpReq = makeFollowUpReq(poolPrompt);
  assert.equal(classifyFollowUpActionDeterministic(poolFollowUpReq), 'current_trip_qa');

  const poolRoute = await routeFollowUp(poolFollowUpReq);
  assert.equal(poolRoute.followUpAction, 'current_trip_qa');
  assert.equal(poolRoute.handled, true);

  const poolRes = await handleAiChat(poolFollowUpReq);
  assert.equal(poolRes.status, 'completed');
  assert.equal(poolRes.intent, 'general_qa');
  assert.equal(poolRes.followUpAction, 'current_trip_qa');
  assert.equal(poolRes.shouldOpenPlanner, false);
  assert.equal(poolRes.resetItineraryToTheme, false);
  assert.deepEqual(poolRes.stopOperations, []);
  assert.equal(poolRes.stayMovePatch, undefined);
  assert.equal(poolRes.expensePatch, undefined);
  assert.equal(poolRes.generatedDays, undefined);
  assert.match(poolRes.reply, /Homestay Nhà Dài Ako Dhông/i);
  assert.match(poolRes.reply, /chưa ghi nhận|không liệt kê|không có/i);
  assert.match(poolRes.reply, /Kiến trúc nhà dài Ê Đê|Wi-Fi|Cà phê rang mộc/i);
  assert.match(poolRes.reply, /Elephants Hotel Buôn Ma Thuột|Mường Thanh Luxury Buôn Ma Thuột/i);

  // Also verify initial (non-follow-up) chat with the exact same pool question routes to general_qa
  const poolInitialRes = await handleAiChat({
    message: poolPrompt,
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
  assert.equal(poolInitialRes.status, 'completed');
  assert.equal(poolInitialRes.intent, 'general_qa');
  assert.equal(poolInitialRes.shouldOpenPlanner, false);
  assert.equal(poolInitialRes.stayMovePatch, undefined);
  assert.equal(poolInitialRes.expensePatch, undefined);
  assert.equal(poolInitialRes.generatedDays, undefined);
  assert.match(poolInitialRes.reply, /Homestay Nhà Dài Ako Dhông/i);
  assert.match(poolInitialRes.reply, /Elephants Hotel Buôn Ma Thuột|Mường Thanh Luxury Buôn Ma Thuột/i);

  // 2. Stay price question containing stay name & nightly price keywords
  const priceReq = makeFollowUpReq('Lak Tented Camp giá bao nhiêu 1 đêm?');
  assert.equal(classifyFollowUpActionDeterministic(priceReq), 'current_trip_qa');
  const priceRes = await handleAiChat(priceReq);
  assert.equal(priceRes.status, 'completed');
  assert.equal(priceRes.intent, 'general_qa');
  assert.equal(priceRes.followUpAction, 'current_trip_qa');
  assert.equal(priceRes.shouldOpenPlanner, false);
  assert.equal(priceRes.resetItineraryToTheme, false);
  assert.deepEqual(priceRes.stopOperations, []);
  assert.equal(priceRes.stayMovePatch, undefined);
  assert.equal(priceRes.expensePatch, undefined);
  assert.equal(priceRes.generatedDays, undefined);
  assert.match(priceRes.reply, /Lắk Tented Camp Bungalow/i);
  assert.match(priceRes.reply, /1\.450\.000|1,450,000/);

  // 3. Transport/rental paperwork question containing "thuê xe máy"
  const rentalReq = makeFollowUpReq('Thuê xe máy ở BMT cần giấy tờ gì?');
  assert.equal(classifyFollowUpActionDeterministic(rentalReq), 'current_trip_qa');
  const rentalRes = await handleAiChat(rentalReq);
  assert.equal(rentalRes.status, 'completed');
  assert.equal(rentalRes.intent, 'general_qa');
  assert.equal(rentalRes.followUpAction, 'current_trip_qa');
  assert.equal(rentalRes.shouldOpenPlanner, false);
  assert.equal(rentalRes.resetItineraryToTheme, false);
  assert.deepEqual(rentalRes.stopOperations, []);
  assert.equal(rentalRes.stayMovePatch, undefined);
  assert.equal(rentalRes.expensePatch, undefined);
  assert.equal(rentalRes.generatedDays, undefined);
  assert.match(rentalRes.reply, /Thuê xe máy/i);
  assert.match(rentalRes.reply, /160\.000|160,000/);

  // 4. Advisory / question prompts containing edit-like verbs must still route to current_trip_qa
  const advisoryPrompts = [
    'Mình có nên đổi sang xe máy khi đi Hồ Lắk không?',
    'Làm sao để giảm chi phí ăn uống khi đi Đắk Lắk?',
    'Cho mình xin thêm kinh nghiệm khi ghé Thác Dray Nur?',
  ];
  for (const prompt of advisoryPrompts) {
    const req = makeFollowUpReq(prompt);
    assert.equal(
      classifyFollowUpActionDeterministic(req),
      'current_trip_qa',
      `Advisory question "${prompt}" must classify as current_trip_qa`
    );
    const res = await handleAiChat(req);
    assert.equal(res.intent, 'general_qa', `"${prompt}" must return general_qa intent`);
    assert.equal(res.shouldOpenPlanner, false);
    assert.equal(res.resetItineraryToTheme, false);
    assert.deepEqual(res.stopOperations, []);
    assert.equal(res.stayMovePatch, undefined);
    assert.equal(res.expensePatch, undefined);
    assert.equal(res.generatedDays, undefined);
  }
});
