import { OpenInferenceSpanKind } from '@arizeai/openinference-semantic-conventions';
import { AI_PRICE_POLICY, AI_PRICE_TTL_HOURS, TAVILY_API_KEY } from '../../config.ts';
import { withOpenInferenceSpan } from '../arizeTelemetry.ts';
import { budgetMultipliers } from '../../../src/data/plannerCatalog.ts';
import {
  AiCitation,
  BudgetFeasibilityResult,
  CapacityAndLogisticsPlan,
  IntakeState,
  Language,
  PricedPlaceItem,
} from '../../../src/types/index.ts';
import {
  EnrichedPlaceRecord,
  listEnrichedPlaces,
  upsertPlacePrice,
} from '../plannerDataService.ts';
import { searchPlacePriceWithTavily } from '../tavilyService.ts';

export interface Phase3BudgetOptions {
  places?: EnrichedPlaceRecord[];
  tavilyLookupFn?: typeof searchPlacePriceWithTavily;
  skipSqliteUpsert?: boolean;
  forceSkipTavily?: boolean;
  nowMs?: number;
  lang?: Language;
}

const DAILY_FOOD_PER_PERSON_VND: Record<'budget' | 'standard' | 'luxury', number> = {
  budget: 200000,
  standard: 340000,
  luxury: 580000,
};

/**
 * Phase 3 (Deterministic + Conditional Tavily): reserves stay, transit, food, and contingency,
 * refreshes stale/missing `place_prices` via Tavily when configured, caches to SQLite,
 * and partitions attractions into `feasiblePlaces` and `excludedOverBudget`.
 */
export async function runPhase3Budget(
  intake: IntakeState,
  capacityPlan: CapacityAndLogisticsPlan,
  options?: Phase3BudgetOptions
): Promise<BudgetFeasibilityResult> {
  return withOpenInferenceSpan(
    'phase3_budget',
    {
      kind: OpenInferenceSpanKind.CHAIN,
      input: {
        totalBudgetVnd: intake.totalBudgetVnd,
        budgetTier: intake.budgetTier,
        dayCount: capacityPlan.dayCount,
        travelersCount: capacityPlan.travelersCount,
      },
      formatOutput: (res) => ({
        totalBudgetVnd: res.totalBudgetVnd,
        availableActivityBudgetVnd: res.availableActivityBudgetVnd,
        estimatedTotalVnd: res.estimatedTotalVnd,
        feasibleCount: res.feasiblePlaces.length,
        excludedCount: res.excludedOverBudget.length,
      }),
    },
    () => runPhase3BudgetImpl(intake, capacityPlan, options)
  );
}

async function runPhase3BudgetImpl(
  intake: IntakeState,
  capacityPlan: CapacityAndLogisticsPlan,
  options?: Phase3BudgetOptions
): Promise<BudgetFeasibilityResult> {
  const nowMs = options?.nowMs ?? Date.now();
  const totalBudgetVnd =
    intake.totalBudgetVnd && intake.totalBudgetVnd > 0
      ? Math.round(intake.totalBudgetVnd)
      : Math.round(
          budgetMultipliers[intake.budgetTier].perDay *
            capacityPlan.dayCount *
            capacityPlan.travelersCount
        );

  const nights = Math.max(1, capacityPlan.dayCount - 1);
  const roomsNeeded = capacityPlan.selectedStay
    ? Math.max(
        1,
        Math.ceil(
          capacityPlan.travelersCount / Math.max(1, capacityPlan.selectedStay.capacityMax)
        )
      )
    : 1;

  const rawStayVnd = capacityPlan.selectedStay
    ? capacityPlan.selectedStay.nightlyRateVnd * nights * roomsNeeded
    : Math.round((totalBudgetVnd * AI_PRICE_POLICY.lodgingShareCapPct) / 100);

  const rawTransitVnd = capacityPlan.selectedLogistics
    ? capacityPlan.selectedLogistics.dailyRateVnd * capacityPlan.dayCount
    : Math.round((totalBudgetVnd * AI_PRICE_POLICY.transitShareCapPct) / 100);

  const contingencyVnd = Math.round(
    (totalBudgetVnd * AI_PRICE_POLICY.contingencyBufferPct) / 100
  );

  // Cap stay + transit gracefully if budget is extraordinarily tight so remaining lines stay non-negative
  const reservedStayVnd = Math.min(rawStayVnd, Math.round(totalBudgetVnd * 0.55));
  const remainingAfterStay = Math.max(0, totalBudgetVnd - reservedStayVnd - contingencyVnd);
  const reservedTransitVnd = Math.min(rawTransitVnd, Math.round(remainingAfterStay * 0.5));

  const targetFoodVnd =
    DAILY_FOOD_PER_PERSON_VND[intake.budgetTier] *
    capacityPlan.travelersCount *
    capacityPlan.dayCount;
  const remainingAfterTransit = Math.max(
    0,
    totalBudgetVnd - reservedStayVnd - reservedTransitVnd - contingencyVnd
  );
  const reservedFoodVnd = Math.min(targetFoodVnd, Math.round(remainingAfterTransit * 0.6));

  const availableActivityBudgetVnd = Math.max(
    0,
    totalBudgetVnd - reservedStayVnd - reservedTransitVnd - reservedFoodVnd - contingencyVnd
  );

  const enrichedPlaces = options?.places
    ? options.places.map((p) => ({ ...p }))
    : listEnrichedPlaces(AI_PRICE_TTL_HOURS, nowMs);

  const citations: AiCitation[] = [];
  const disclaimers: string[] = [];
  const tavilyLookup = options?.tavilyLookupFn ?? searchPlacePriceWithTavily;
  const canRunTavily =
    !options?.forceSkipTavily &&
    (Boolean(TAVILY_API_KEY.trim()) || Boolean(options?.tavilyLookupFn));

  // Refresh up to 4 stale/missing places prioritizing mainPurpose matches
  const stalePlaces = enrichedPlaces
    .filter((p) => p.isStale)
    .sort((a, b) => {
      const aMatch = a.themeTags.includes(intake.mainPurpose) ? 1 : 0;
      const bMatch = b.themeTags.includes(intake.mainPurpose) ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, 4);

  let usedEstimateFallback = false;
  const isEn = options?.lang === 'en';

  if (!canRunTavily) {
    if (stalePlaces.length > 0) {
      usedEstimateFallback = true;
    }
  } else if (stalePlaces.length > 0) {
    const refreshResults = await Promise.all(
      stalePlaces.map(async (stale) => {
        try {
          const refreshed = await tavilyLookup(stale.title, stale.areaCluster, {
            fallbackTicketVnd: stale.ticketVnd,
            fallbackEstimatedSpendVnd: stale.estimatedSpendVnd,
          });
          return { stale, refreshed };
        } catch {
          return { stale, refreshed: null };
        }
      })
    );

    for (const { stale, refreshed } of refreshResults) {
      if (refreshed) {
        stale.ticketVnd = refreshed.ticketVnd;
        stale.estimatedSpendVnd = refreshed.estimatedSpendVnd;
        stale.priceSource = 'tavily';
        stale.priceNote = refreshed.priceNote;
        stale.sourceUrl = refreshed.sourceUrl;
        stale.fetchedAt = new Date(nowMs).toISOString();
        stale.isStale = false;

        if (!options?.skipSqliteUpsert) {
          upsertPlacePrice({
            placeTitle: stale.title,
            areaCluster: stale.areaCluster,
            ticketVnd: refreshed.ticketVnd,
            estimatedSpendVnd: refreshed.estimatedSpendVnd,
            priceSource: 'tavily',
            priceNote: refreshed.priceNote,
            sourceUrl: refreshed.sourceUrl,
            fetchedAt: stale.fetchedAt,
          });
        }

        for (const c of refreshed.citations) {
          if (!citations.some((existing) => existing.url === c.url)) {
            citations.push(c);
          }
        }
      } else {
        usedEstimateFallback = true;
      }
    }
  }

  if (usedEstimateFallback || enrichedPlaces.some((p) => p.priceSource === 'estimated')) {
    disclaimers.push(
      isEn
        ? 'Some attraction ticket/activity costs use internal reference estimates while live online data is unavailable.'
        : 'Một số giá vé/chi phí tham quan dùng mức ước tính tham chiếu nội bộ do dữ liệu trực tuyến chưa khả dụng.'
    );
  }

  const feasiblePlaces: PricedPlaceItem[] = [];
  const excludedOverBudget: Array<PricedPlaceItem & { reason: string }> = [];

  for (const place of enrichedPlaces) {
    const groupCostVnd = place.estimatedSpendVnd * capacityPlan.travelersCount;
    const item: PricedPlaceItem = {
      title: place.title,
      location: place.location,
      areaCluster: place.areaCluster,
      themeTags: place.themeTags,
      ticketVnd: place.ticketVnd,
      estimatedSpendVnd: place.estimatedSpendVnd,
      priceSource: place.priceSource,
      priceNote: place.priceNote,
      sourceUrl: place.sourceUrl,
      fetchedAt: place.fetchedAt,
      isStale: place.isStale,
    };

    if (groupCostVnd > availableActivityBudgetVnd && groupCostVnd > 0) {
      excludedOverBudget.push({
        ...item,
        reason: isEn
          ? `Estimated cost for ${capacityPlan.travelersCount} guests (${groupCostVnd.toLocaleString('en-US')} VND) exceeds remaining activity budget (${availableActivityBudgetVnd.toLocaleString('en-US')} VND).`
          : `Chi phí ước tính cho ${capacityPlan.travelersCount} khách (${groupCostVnd.toLocaleString(
              'vi-VN'
            )}đ) vượt ngân sách hoạt động còn lại (${availableActivityBudgetVnd.toLocaleString('vi-VN')}đ).`,
      });
    } else if (
      availableActivityBudgetVnd > 0 &&
      capacityPlan.maxStopsTotal >= 3 &&
      groupCostVnd > availableActivityBudgetVnd * 0.75 &&
      place.estimatedSpendVnd >= 400000
    ) {
      excludedOverBudget.push({
        ...item,
        reason: isEn
          ? `High activity cost (${groupCostVnd.toLocaleString('en-US')} VND) would consume >75% of the activity budget, leaving insufficient room for other stops.`
          : `Chi phí hoạt động cao (${groupCostVnd.toLocaleString(
              'vi-VN'
            )}đ) sẽ chiếm >75% quỹ tham quan, cần giữ cân đối cho các điểm khác.`,
      });
    } else {
      feasiblePlaces.push(item);
    }
  }

  const lowestStopsCost = [...feasiblePlaces]
    .sort((a, b) => a.estimatedSpendVnd - b.estimatedSpendVnd)
    .slice(0, Math.min(capacityPlan.maxStopsTotal, feasiblePlaces.length))
    .reduce((sum, p) => sum + p.estimatedSpendVnd * capacityPlan.travelersCount, 0);

  const estimatedTotalVnd =
    reservedStayVnd +
    reservedTransitVnd +
    reservedFoodVnd +
    contingencyVnd +
    Math.min(lowestStopsCost, availableActivityBudgetVnd);

  const isWithinBudget = estimatedTotalVnd <= totalBudgetVnd;
  if (!isWithinBudget) {
    disclaimers.push(
      isEn
        ? `Minimum estimated total (${estimatedTotalVnd.toLocaleString('en-US')} VND) slightly exceeds target budget (${totalBudgetVnd.toLocaleString('en-US')} VND).`
        : `Tổng dự toán tối thiểu (${estimatedTotalVnd.toLocaleString(
            'vi-VN'
          )}đ) đang nhỉnh hơn ngân sách mục tiêu (${totalBudgetVnd.toLocaleString('vi-VN')}đ).`
    );
  }

  return {
    totalBudgetVnd,
    budgetTier: intake.budgetTier,
    reservedStayVnd,
    reservedTransitVnd,
    reservedFoodVnd,
    contingencyVnd,
    availableActivityBudgetVnd,
    estimatedTotalVnd,
    isWithinBudget,
    feasiblePlaces,
    excludedOverBudget,
    citations,
    disclaimers,
  };
}
