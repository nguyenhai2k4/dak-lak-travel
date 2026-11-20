import {
  LLM_MODEL_NAME,
  LLM_PROVIDER,
  LLM_SYSTEM,
  LLM_TOKEN_COUNT_COMPLETION,
  LLM_TOKEN_COUNT_PROMPT,
  LLM_TOKEN_COUNT_TOTAL,
  OpenInferenceSpanKind,
  SemanticConventions,
} from '@arizeai/openinference-semantic-conventions';
import {
  AI_CHAT_TIMEOUT_MS,
  AI_RESPONSE_MAX_TOKENS,
  GEMINI_API_KEY,
  GEMINI_MODEL,
} from '../../config.ts';
import { withOpenInferenceSpan } from '../arizeTelemetry.ts';
import { dakLakPlaceDirectory } from '../../../src/data/places.ts';
import {
  budgetMultipliers,
  companionLabels,
  plannerCatalog,
  themeLabels,
} from '../../../src/data/plannerCatalog.ts';
import {
  AiChatRequest,
  AiChatResponse,
  AiCitation,
  BudgetFeasibilityResult,
  CapacityAndLogisticsPlan,
  GeneratedDayPlan,
  GeneratedExpenseItem,
  GeneratedItineraryMeta,
  GeneratedSlotPlan,
  IntakeState,
  PurposeAlignedSelection,
  RankedPlaceItem,
} from '../../../src/types/index.ts';
import { computeLegMetrics } from '../../../src/utils/plannerHelpers.ts';

function buildGroundedCitations(
  budgetResult: BudgetFeasibilityResult,
  purposeSelection: PurposeAlignedSelection
): AiCitation[] {
  const citations: AiCitation[] = [];
  for (const c of budgetResult.citations) {
    if (!citations.some((x) => x.url === c.url)) {
      citations.push(c);
    }
  }
  for (const post of purposeSelection.relevantPosts) {
    const url = `/blog/${post.slug}`;
    if (!citations.some((x) => x.url === url)) {
      citations.push({
        title: post.title,
        url,
        snippet: post.excerpt,
        source: 'cms',
      });
    }
  }
  return citations;
}

function formatStayMoveText(capacityPlan: CapacityAndLogisticsPlan, lang: 'vi' | 'en'): string {
  const isEn = lang === 'en';
  const stayText = capacityPlan.selectedStay
    ? isEn
      ? `${capacityPlan.selectedStay.name} (${capacityPlan.selectedStay.area} • ~${capacityPlan.selectedStay.nightlyRateVnd.toLocaleString(
          'en-US'
        )} VND/night)`
      : `${capacityPlan.selectedStay.name} (${capacityPlan.selectedStay.area} • ~${capacityPlan.selectedStay.nightlyRateVnd.toLocaleString(
          'vi-VN'
        )}đ/đêm)`
    : budgetMultipliers[capacityPlan.recommendedStays[0]?.tier || 'standard'].stayMove;

  const transitText = capacityPlan.selectedLogistics
    ? isEn
      ? `${capacityPlan.selectedLogistics.label} (~${capacityPlan.selectedLogistics.dailyRateVnd.toLocaleString(
          'en-US'
        )} VND/day)`
      : `${capacityPlan.selectedLogistics.label} (~${capacityPlan.selectedLogistics.dailyRateVnd.toLocaleString(
          'vi-VN'
        )}đ/ngày)`
    : '';

  return [stayText, transitText].filter(Boolean).join(' • ');
}

function distributePlacesAcrossDays(
  selectedPlaces: RankedPlaceItem[],
  dayCount: number
): RankedPlaceItem[][] {
  const buckets: RankedPlaceItem[][] = Array.from({ length: dayCount }, () => []);
  if (selectedPlaces.length === 0) return buckets;

  // Keep BMT/Ea Kao clusters first (Day 1), outer clusters on Day 2+, then return/closing BMT
  const bmtPlaces = selectedPlaces.filter(
    (p) => p.areaCluster === 'BMT' || p.areaCluster === 'Ea Kao'
  );
  const outerByCluster = new Map<string, RankedPlaceItem[]>();
  for (const p of selectedPlaces) {
    if (p.areaCluster !== 'BMT' && p.areaCluster !== 'Ea Kao') {
      const list = outerByCluster.get(p.areaCluster) || [];
      list.push(p);
      outerByCluster.set(p.areaCluster, list);
    }
  }

  const ordered: RankedPlaceItem[] = [
    ...bmtPlaces,
    ...Array.from(outerByCluster.values()).flat(),
  ];

  let idx = 0;
  for (let d = 0; d < dayCount; d++) {
    const remainingDays = dayCount - d;
    const remainingItems = ordered.length - idx;
    const take = Math.max(0, Math.ceil(remainingItems / remainingDays));
    buckets[d] = ordered.slice(idx, idx + take);
    idx += take;
  }

  return buckets;
}

function toSlotPlan(
  place: RankedPlaceItem,
  slotIndex: number,
  lang: 'vi' | 'en' = 'vi'
): GeneratedSlotPlan {
  const meta = dakLakPlaceDirectory.find(
    (d) => d.title.toLowerCase() === place.title.toLowerCase()
  );
  const isEn = lang === 'en';
  const timeDefaults = [
    { time: '08:00 – 10:00', period: isEn ? 'Morning' : 'Buổi sáng' },
    { time: '10:30 – 12:00', period: isEn ? 'Late morning' : 'Giữa sáng' },
    { time: '14:30 – 16:45', period: isEn ? 'Afternoon' : 'Buổi chiều' },
    { time: '18:30 – 20:30', period: isEn ? 'Evening' : 'Buổi tối' },
  ];
  const fallbackTiming = timeDefaults[Math.min(slotIndex, timeDefaults.length - 1)];

  return {
    time: meta?.time || fallbackTiming.time,
    period: meta?.period || fallbackTiming.period,
    title: place.title,
    location: place.location,
    desc:
      meta?.desc ||
      place.matchReasons.join('. ') ||
      (isEn ? `Explore ${place.title}.` : `Khám phá ${place.title}.`),
    isCustom: false,
    areaCluster: place.areaCluster,
    x: meta?.x,
    y: meta?.y,
    lat: meta?.lat,
    lng: meta?.lng,
    googleMapsQuery: meta?.googleMapsQuery,
    category: meta?.category,
    duration: meta?.duration,
    estimatedCostVnd: place.estimatedSpendVnd,
  };
}

function computeTotalEstimatedKm(days: GeneratedDayPlan[]): number {
  const allSlots = days.flatMap((d) => d.slots);
  if (allSlots.length < 2) return 15;
  let total = 0;
  for (let i = 1; i < allSlots.length; i++) {
    total += computeLegMetrics(
      {
        title: allSlots[i - 1].title,
        location: allSlots[i - 1].location,
        x: allSlots[i - 1].x ?? 378,
        y: allSlots[i - 1].y ?? 196,
        lat: allSlots[i - 1].lat,
        lng: allSlots[i - 1].lng,
      },
      {
        title: allSlots[i].title,
        location: allSlots[i].location,
        x: allSlots[i].x ?? 378,
        y: allSlots[i].y ?? 196,
        lat: allSlots[i].lat,
        lng: allSlots[i].lng,
      }
    ).dist;
  }
  return Math.round(total);
}

/**
 * Deterministic Phase 5 synthesis (used both when `GEMINI_API_KEY` is absent and as fallback).
 */
export function synthesizeDeterministicPlan(
  req: AiChatRequest,
  intake: IntakeState,
  capacityPlan: CapacityAndLogisticsPlan,
  budgetResult: BudgetFeasibilityResult,
  purposeSelection: PurposeAlignedSelection,
  provider = 'local-fallback'
): AiChatResponse {
  const cat = plannerCatalog[intake.mainPurpose];
  const dayBuckets = distributePlacesAcrossDays(
    purposeSelection.selectedPlaces,
    capacityPlan.dayCount
  );

  const isEn = req.lang === 'en';
  const generatedDays: GeneratedDayPlan[] = dayBuckets.map((places, dIdx) => {
    const clusters = Array.from(new Set(places.map((p) => p.areaCluster)));
    const slots = places.map((place, sIdx) => toSlotPlan(place, sIdx, req.lang));
    let dayKm = 0;
    for (let i = 1; i < slots.length; i++) {
      dayKm += computeLegMetrics(
        {
          title: slots[i - 1].title,
          location: slots[i - 1].location,
          x: slots[i - 1].x ?? 378,
          y: slots[i - 1].y ?? 196,
          lat: slots[i - 1].lat,
          lng: slots[i - 1].lng,
        },
        {
          title: slots[i].title,
          location: slots[i].location,
          x: slots[i].x ?? 378,
          y: slots[i].y ?? 196,
          lat: slots[i].lat,
          lng: slots[i].lng,
        }
      ).dist;
    }

    const dayLabel = req.lang === 'en' ? `Day ${dIdx + 1}` : `Ngày ${dIdx + 1}`;
    const clusterSummary = clusters.length > 0 ? clusters.join(' → ') : 'Buôn Ma Thuột';
    const dayTitle =
      cat.days[dIdx]?.title ||
      (req.lang === 'en'
        ? `Exploring ${clusterSummary}`
        : `Khám phá cụm điểm ${clusterSummary}`);

    return {
      day: dayLabel,
      title: dayTitle,
      area: `${clusterSummary} • ~${Math.round(Math.max(8, dayKm))} km`,
      slots,
    };
  });

  const activitySum = purposeSelection.selectedPlaces.reduce(
    (sum, p) => sum + p.estimatedSpendVnd * capacityPlan.travelersCount,
    0
  );

  const nights = Math.max(1, capacityPlan.dayCount - 1);
  const generatedExpenses: GeneratedExpenseItem[] = [
    {
      id: 'exp-stay',
      title: capacityPlan.selectedStay
        ? isEn
          ? `Stay (${nights} nights) • ${capacityPlan.selectedStay.name}`
          : `Lưu trú ${nights} đêm • ${capacityPlan.selectedStay.name}`
        : isEn
          ? `Stay (${nights} nights)`
          : `Lưu trú ${nights} đêm`,
      cat: 'stay',
      amount: budgetResult.reservedStayVnd,
    },
    {
      id: 'exp-transit',
      title: capacityPlan.selectedLogistics
        ? isEn
          ? `Transport (${capacityPlan.dayCount} days) • ${capacityPlan.selectedLogistics.label}`
          : `Di chuyển ${capacityPlan.dayCount} ngày • ${capacityPlan.selectedLogistics.label}`
        : isEn
          ? `Transport (${capacityPlan.dayCount} days)`
          : `Di chuyển ${capacityPlan.dayCount} ngày`,
      cat: 'transit',
      amount: budgetResult.reservedTransitVnd,
    },
    {
      id: 'exp-food',
      title: isEn
        ? `Local cuisine & specialty coffee (${capacityPlan.travelersCount} guests)`
        : `Ẩm thực bản địa & cà phê (${capacityPlan.travelersCount} khách)`,
      cat: 'food',
      amount: budgetResult.reservedFoodVnd,
    },
    {
      id: 'exp-act',
      title: isEn
        ? 'Admission tickets, experiences & contingency'
        : 'Vé tham quan, trải nghiệm & dự phòng',
      cat: 'activity',
      amount: Math.min(
        budgetResult.availableActivityBudgetVnd + budgetResult.contingencyVnd,
        activitySum + budgetResult.contingencyVnd
      ),
    },
  ];

  const citations = buildGroundedCitations(budgetResult, purposeSelection);
  const totalEstimatedKm = computeTotalEstimatedKm(generatedDays);

  const tips = [
    ...capacityPlan.notes,
    ...budgetResult.disclaimers,
    req.lang === 'en'
      ? 'Always choose ethical, non-riding elephant observation tours in Yok Đôn National Park.'
      : 'Ưu tiên trải nghiệm đi bộ ngắm voi tự nhiên không cưỡi voi tại Vườn Quốc gia Yok Đôn.',
  ].filter(Boolean);

  const itineraryMeta: GeneratedItineraryMeta = {
    title: cat.title,
    stayMove: formatStayMoveText(capacityPlan, req.lang),
    routeTip:
      req.lang === 'en'
        ? `Clustered route across ${purposeSelection.areaClustersUsed.join(', ') || 'BMT'} (~${totalEstimatedKm} km total) to avoid backtracking.`
        : `Tuyến gom cụm ${purposeSelection.areaClustersUsed.join(' → ') || 'BMT'} (~${totalEstimatedKm} km tổng tuyến), hạn chế quay đầu.`,
    tips: tips.slice(0, 4),
    hiddenGem: cat.hiddenGem,
    totalEstimatedKm,
  };

  const companionText = companionLabels[capacityPlan.companionType];
  const themeText = themeLabels[intake.mainPurpose];
  const excludedCount = budgetResult.excludedOverBudget.length;
  const reply =
    req.lang === 'en'
      ? `Created your ${intake.duration} ${themeText} itinerary for ${capacityPlan.travelersCount} traveler(s) (${companionText}) during ${capacityPlan.seasonHeadline}, keeping within ~${budgetResult.totalBudgetVnd.toLocaleString('en-US')} VND across ${purposeSelection.selectedPlaces.length} curated stops.${excludedCount > 0 ? ` Filtered out ${excludedCount} over-budget option(s) to stay within your limit.` : ''}`
      : `Mình đã thiết kế lịch trình ${intake.duration} (${themeText}) cho ${capacityPlan.travelersCount} khách (${companionText}) vào ${capacityPlan.seasonHeadline}, tối ưu trong ngân sách ~${budgetResult.totalBudgetVnd.toLocaleString('vi-VN')}đ với ${purposeSelection.selectedPlaces.length} điểm dừng chọn lọc.${excludedCount > 0 ? ` Đã lọc bớt ${excludedCount} điểm vượt quỹ hoạt động để giữ tổng chi phí an toàn.` : ''}`;

  return {
    intent: 'update_itinerary',
    reply,
    shouldOpenPlanner: true,
    preferences: {
      theme: intake.mainPurpose,
      duration: intake.duration,
      companion: capacityPlan.companionType,
      budget: intake.budgetTier,
    },
    resetItineraryToTheme: true,
    stopOperations: [],
    suggestedTab: 'map',
    provider,
    status: 'completed',
    itineraryMeta,
    generatedDays,
    generatedExpenses,
    citations,
  };
}

const PHASE5_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    itineraryMeta: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        stayMove: { type: 'STRING' },
        routeTip: { type: 'STRING' },
        tips: { type: 'ARRAY', items: { type: 'STRING' } },
        hiddenGem: { type: 'STRING' },
      },
      required: ['title', 'stayMove', 'routeTip', 'tips'],
    },
    generatedDays: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          day: { type: 'STRING' },
          title: { type: 'STRING' },
          area: { type: 'STRING' },
          slots: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                time: { type: 'STRING' },
                period: { type: 'STRING' },
                title: { type: 'STRING' },
                location: { type: 'STRING' },
                desc: { type: 'STRING' },
                areaCluster: { type: 'STRING' },
                estimatedCostVnd: { type: 'INTEGER' },
              },
              required: ['time', 'period', 'title', 'location', 'desc'],
            },
          },
        },
        required: ['day', 'title', 'area', 'slots'],
      },
    },
    generatedExpenses: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          cat: { type: 'STRING', enum: ['stay', 'transit', 'food', 'activity'] },
          amount: { type: 'INTEGER' },
          note: { type: 'STRING' },
        },
        required: ['title', 'cat', 'amount'],
      },
    },
    suggestedTab: { type: 'STRING', enum: ['map', 'schedule', 'tips'] },
  },
  required: ['reply', 'itineraryMeta', 'generatedDays', 'generatedExpenses'],
};

/**
 * Phase 5 (LLM + Deterministic Fallback): synthesizes `reply`, `itineraryMeta`, `generatedDays`,
 * `generatedExpenses`, and grounded `citations` strictly from `purposeSelection.selectedPlaces`.
 */
export async function runPhase5Synthesis(
  req: AiChatRequest,
  intake: IntakeState,
  capacityPlan: CapacityAndLogisticsPlan,
  budgetResult: BudgetFeasibilityResult,
  purposeSelection: PurposeAlignedSelection,
  retryFeedback?: string[]
): Promise<AiChatResponse> {
  return withOpenInferenceSpan(
    'phase5_synthesis',
    {
      kind: OpenInferenceSpanKind.CHAIN,
      input: {
        mainPurpose: intake.mainPurpose,
        dayCount: capacityPlan.dayCount,
        selectedPlacesCount: purposeSelection.selectedPlaces.length,
        totalBudgetVnd: budgetResult.totalBudgetVnd,
        retryFeedback: retryFeedback || [],
      },
      formatOutput: (res) => ({
        reply: res.reply,
        daysCount: res.generatedDays?.length || 0,
        expensesCount: res.generatedExpenses?.length || 0,
        provider: res.provider,
      }),
    },
    async () => {
      const deterministic = synthesizeDeterministicPlan(
        req,
        intake,
        capacityPlan,
        budgetResult,
        purposeSelection
      );

      const apiKey = GEMINI_API_KEY.trim();
      if (!apiKey) {
        return deterministic;
      }

      const model = GEMINI_MODEL.trim() || 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const allowedPlacesJson = purposeSelection.selectedPlaces.map((p) => ({
        title: p.title,
        location: p.location,
        areaCluster: p.areaCluster,
        estimatedSpendVndPerPerson: p.estimatedSpendVnd,
        reasons: p.matchReasons,
      }));

      const systemText = [
        'You are Phase 5 Synthesis for "Đắk Lắk AI Travel Concierge".',
        `Language: "${req.lang}". Write all user-facing strings in ${req.lang === 'en' ? 'English' : 'Vietnamese'}.`,
        'STRICT GROUNDING RULES:',
        `1. Create exactly ${capacityPlan.dayCount} days in generatedDays.`,
        '2. Every slot.title in generatedDays MUST use an EXACT "title" from ALLOWED_SELECTED_PLACES below. Do NOT invent new stop names.',
        `3. Total stops across all days MUST NOT exceed ${capacityPlan.maxStopsTotal}.`,
        `4. Keep each day within ${capacityPlan.maxDailyDistanceKm} km by grouping same/adjacent areaCluster stops on the same day.`,
        `5. Sum of generatedExpenses.amount MUST NOT exceed ${budgetResult.totalBudgetVnd} VND.`,
        '6. ETHICAL POLICY: NEVER recommend elephant riding; if Yok Đôn is included, describe ethical non-riding walking observation only.',
        '7. Keep reply concise, warm, plain text (no markdown tables/HTML).',
        '8. If userGoal includes any specific question or concern alongside the trip request, directly address it in "reply" while summarizing the tailored itinerary.',
        retryFeedback && retryFeedback.length > 0
          ? `\nFIX THESE PREVIOUS EVALUATOR VIOLATIONS:\n- ${retryFeedback.join('\n- ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');

      const payloadContext = {
        userGoal: intake.rawUserGoal || req.message,
        duration: intake.duration,
        travelersCount: capacityPlan.travelersCount,
        companionType: capacityPlan.companionType,
        season: capacityPlan.seasonHeadline,
        stay: capacityPlan.selectedStay
          ? {
              name: capacityPlan.selectedStay.name,
              area: capacityPlan.selectedStay.area,
              totalStayVnd: budgetResult.reservedStayVnd,
            }
          : null,
        logistics: capacityPlan.selectedLogistics
          ? {
              label: capacityPlan.selectedLogistics.label,
              totalTransitVnd: budgetResult.reservedTransitVnd,
            }
          : null,
        budgetBreakdown: {
          totalBudgetVnd: budgetResult.totalBudgetVnd,
          reservedStayVnd: budgetResult.reservedStayVnd,
          reservedTransitVnd: budgetResult.reservedTransitVnd,
          reservedFoodVnd: budgetResult.reservedFoodVnd,
          contingencyVnd: budgetResult.contingencyVnd,
          availableActivityBudgetVnd: budgetResult.availableActivityBudgetVnd,
        },
        ALLOWED_SELECTED_PLACES: allowedPlacesJson,
        disclaimers: budgetResult.disclaimers,
      };

      const userPayloadStr = JSON.stringify(payloadContext);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AI_CHAT_TIMEOUT_MS);

      try {
        const llmCall = await withOpenInferenceSpan(
          'gemini_phase5_synthesis',
          {
            kind: OpenInferenceSpanKind.LLM,
            input: userPayloadStr,
            attributes: {
              [LLM_MODEL_NAME]: model,
              [LLM_PROVIDER]: 'google',
              [LLM_SYSTEM]: 'gemini',
              [`${SemanticConventions.LLM_INPUT_MESSAGES}.0.${SemanticConventions.MESSAGE_ROLE}`]:
                'system',
              [`${SemanticConventions.LLM_INPUT_MESSAGES}.0.${SemanticConventions.MESSAGE_CONTENT}`]:
                systemText,
              [`${SemanticConventions.LLM_INPUT_MESSAGES}.1.${SemanticConventions.MESSAGE_ROLE}`]:
                'user',
              [`${SemanticConventions.LLM_INPUT_MESSAGES}.1.${SemanticConventions.MESSAGE_CONTENT}`]:
                userPayloadStr,
            },
            formatOutput: (res) => res.rawText,
            onSuccess: (span, res) => {
              span.setAttribute(
                `${SemanticConventions.LLM_OUTPUT_MESSAGES}.0.${SemanticConventions.MESSAGE_ROLE}`,
                'assistant'
              );
              span.setAttribute(
                `${SemanticConventions.LLM_OUTPUT_MESSAGES}.0.${SemanticConventions.MESSAGE_CONTENT}`,
                res.rawText
              );
              if (res.usage?.promptTokenCount !== undefined) {
                span.setAttribute(LLM_TOKEN_COUNT_PROMPT, res.usage.promptTokenCount);
              }
              if (res.usage?.candidatesTokenCount !== undefined) {
                span.setAttribute(LLM_TOKEN_COUNT_COMPLETION, res.usage.candidatesTokenCount);
              }
              if (res.usage?.totalTokenCount !== undefined) {
                span.setAttribute(LLM_TOKEN_COUNT_TOTAL, res.usage.totalTokenCount);
              }
            },
          },
          async () => {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemText }] },
                contents: [{ role: 'user', parts: [{ text: userPayloadStr }] }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: AI_RESPONSE_MAX_TOKENS,
                  responseMimeType: 'application/json',
                  responseSchema: PHASE5_RESPONSE_SCHEMA,
                },
              }),
            });

            if (!response.ok) {
              const errBody = await response.text().catch(() => '');
              throw new Error(`Gemini Phase 5 HTTP ${response.status}: ${errBody.slice(0, 200)}`);
            }

            const data = (await response.json()) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
              usageMetadata?: {
                promptTokenCount?: number;
                candidatesTokenCount?: number;
                totalTokenCount?: number;
              };
            };
            const rawText = (data.candidates?.[0]?.content?.parts || [])
              .filter((p) => !p.thought && typeof p.text === 'string')
              .map((p) => p.text)
              .join('')
              .trim();

            return { rawText, usage: data.usageMetadata };
          }
        );

        const { rawText } = llmCall;
        if (!rawText) return deterministic;
        const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(jsonText) as {
          reply?: string;
          itineraryMeta?: Partial<GeneratedItineraryMeta>;
          generatedDays?: GeneratedDayPlan[];
          generatedExpenses?: GeneratedExpenseItem[];
          suggestedTab?: 'map' | 'schedule' | 'tips';
        };

        const rawDays =
          Array.isArray(parsed.generatedDays) && parsed.generatedDays.length > 0
            ? parsed.generatedDays
            : deterministic.generatedDays!;

        // Hydrate coordinates from dakLakPlaceDirectory for accurate leg distance checks
        const hydratedDays: GeneratedDayPlan[] = rawDays.map((day, dIdx) => ({
          day: String(day.day || `Ngày ${dIdx + 1}`),
          title: String(day.title || deterministic.generatedDays?.[dIdx]?.title || ''),
          area: String(day.area || ''),
          slots: (Array.isArray(day.slots) ? day.slots : []).map((slot) => {
            const dirMatch = dakLakPlaceDirectory.find(
              (p) => p.title.toLowerCase() === String(slot.title || '').trim().toLowerCase()
            );
            const selectedMatch = purposeSelection.selectedPlaces.find(
              (p) => p.title.toLowerCase() === String(slot.title || '').trim().toLowerCase()
            );
            return {
              time: String(slot.time || dirMatch?.time || '08:30 – 10:30'),
              period: String(slot.period || dirMatch?.period || 'Buổi sáng'),
              title: dirMatch?.title || String(slot.title || '').trim(),
              location: dirMatch?.location || String(slot.location || 'Đắk Lắk'),
              desc: String(slot.desc || dirMatch?.desc || ''),
              isCustom: !dirMatch,
              areaCluster: selectedMatch?.areaCluster || slot.areaCluster,
              x: dirMatch?.x,
              y: dirMatch?.y,
              lat: dirMatch?.lat,
              lng: dirMatch?.lng,
              googleMapsQuery: dirMatch?.googleMapsQuery,
              category: dirMatch?.category,
              duration: dirMatch?.duration,
              estimatedCostVnd:
                typeof slot.estimatedCostVnd === 'number'
                  ? slot.estimatedCostVnd
                  : selectedMatch?.estimatedSpendVnd,
            };
          }),
        }));

        const generatedExpenses: GeneratedExpenseItem[] =
          Array.isArray(parsed.generatedExpenses) && parsed.generatedExpenses.length > 0
            ? parsed.generatedExpenses.map((e, idx) => ({
                id: `exp-${idx + 1}`,
                title: String(e.title || 'Chi phí chuyến đi'),
                cat:
                  e.cat === 'stay' || e.cat === 'transit' || e.cat === 'food' || e.cat === 'activity'
                    ? e.cat
                    : 'activity',
                amount: Math.max(0, Math.round(Number(e.amount) || 0)),
                note: typeof e.note === 'string' ? e.note : undefined,
              }))
            : deterministic.generatedExpenses!;

        const itineraryMeta: GeneratedItineraryMeta = {
          title: String(parsed.itineraryMeta?.title || deterministic.itineraryMeta!.title),
          stayMove: String(parsed.itineraryMeta?.stayMove || deterministic.itineraryMeta!.stayMove),
          routeTip: String(parsed.itineraryMeta?.routeTip || deterministic.itineraryMeta!.routeTip),
          tips:
            Array.isArray(parsed.itineraryMeta?.tips) && parsed.itineraryMeta!.tips.length > 0
              ? parsed.itineraryMeta!.tips.map((t) => String(t))
              : deterministic.itineraryMeta!.tips,
          hiddenGem: parsed.itineraryMeta?.hiddenGem || deterministic.itineraryMeta!.hiddenGem,
          totalEstimatedKm: computeTotalEstimatedKm(hydratedDays),
        };

        return {
          ...deterministic,
          reply:
            typeof parsed.reply === 'string' && parsed.reply.trim()
              ? parsed.reply.trim()
              : deterministic.reply,
          itineraryMeta,
          generatedDays: hydratedDays,
          generatedExpenses,
          citations: deterministic.citations,
          suggestedTab: parsed.suggestedTab || 'map',
          provider: `gemini-ai:${model}`,
        };
      } catch {
        return deterministic;
      } finally {
        clearTimeout(timer);
      }
    }
  );
}
