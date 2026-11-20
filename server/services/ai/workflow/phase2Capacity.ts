import { AI_PRICE_POLICY } from '../../../config.ts';
import { budgetMultipliers } from '../../../../src/data/plannerCatalog.ts';
import { seasonsData } from '../../../../src/data/seasons.ts';
import {
  AccommodationRecord,
  CapacityAndLogisticsPlan,
  CompanionType,
  DurationType,
  IntakeState,
  Language,
  LogisticsRecord,
  SeasonData,
} from '../../../../src/types/index.ts';
import { listActiveLogistics, listActiveStays } from '../plannerDataService.ts';

function resolveDayCount(duration: DurationType): number {
  if (duration === '2N1D') return 2;
  if (duration === '4N3D+') return 4;
  return 3;
}

export function resolveSeasonFromDates(
  travelDates: string | null | undefined,
  rawGoal?: string
): SeasonData {
  const combined = `${travelDates || ''} ${rawGoal || ''}`.toLowerCase();

  let month: number | null = null;
  const viMonth = combined.match(/tháng\s*(1[0-2]|[1-9])\b/i);
  const slashDate = combined.match(/\b\d{1,2}\/(1[0-2]|[1-9])(?:\/\d{2,4})?\b/);

  if (viMonth) {
    month = Number(viMonth[1]);
  } else if (slashDate) {
    month = Number(slashDate[1]);
  } else if (/\b(jan|january|feb|february|mar|march)\b/i.test(combined)) {
    month = 2;
  } else if (/\b(apr|april|may|jun|june)\b/i.test(combined)) {
    month = 5;
  } else if (/\b(jul|july|aug|august|sep|sept|september)\b/i.test(combined)) {
    month = 8;
  } else if (/\b(oct|october|nov|november|dec|december)\b/i.test(combined)) {
    month = 12;
  } else if (/(hoa cà phê|mùa xuân|tết|cồng chiêng)/i.test(combined)) {
    month = 2;
  } else if (/(mùa hạ|nắng vàng)/i.test(combined)) {
    month = 5;
  } else if (/(mùa mưa|mùa thu|thác đổ|thác nước)/i.test(combined)) {
    month = 8;
  } else if (/(dã quỳ|thu hoạch|mùa đông|cuối năm)/i.test(combined)) {
    month = 11;
  }

  if (month !== null) {
    if (month >= 1 && month <= 3) return seasonsData[0];
    if (month >= 4 && month <= 6) return seasonsData[1];
    if (month >= 7 && month <= 9) return seasonsData[2];
    return seasonsData[3];
  }

  const currentMonth = new Date().getMonth() + 1;
  if (currentMonth <= 3) return seasonsData[0];
  if (currentMonth <= 6) return seasonsData[1];
  if (currentMonth <= 9) return seasonsData[2];
  return seasonsData[3];
}

function computePacing(
  dayCount: number,
  companionType: CompanionType
): { maxStopsPerDay: number; maxStopsTotal: number } {
  if (companionType === 'family') {
    const maxStopsTotal = dayCount <= 2 ? 4 : dayCount === 3 ? 6 : 8;
    return { maxStopsPerDay: 2, maxStopsTotal };
  }
  if (companionType === 'solo') {
    const maxStopsTotal = dayCount <= 2 ? 5 : dayCount === 3 ? 9 : 11;
    return { maxStopsPerDay: 3, maxStopsTotal };
  }
  const maxStopsTotal = dayCount <= 2 ? 5 : dayCount === 3 ? 8 : 10;
  return { maxStopsPerDay: 3, maxStopsTotal };
}

/**
 * Phase 2 (Deterministic): resolves season, pacing caps (`maxStopsTotal` <= 5 for 2 days,
 * relaxed for families), and filters stays & logistics by group capacity and `AI_PRICE_POLICY`.
 */
export async function runPhase2Capacity(
  intake: IntakeState,
  overrides?: {
    stays?: AccommodationRecord[];
    logistics?: LogisticsRecord[];
    lang?: Language;
  }
): Promise<CapacityAndLogisticsPlan> {
  const isEn = overrides?.lang === 'en';
  const dayCount = resolveDayCount(intake.duration);
  const companionType: CompanionType = intake.companionType || 'couple';
  const travelersCount =
    intake.travelersCount && intake.travelersCount > 0
      ? intake.travelersCount
      : companionType === 'solo'
        ? 1
        : companionType === 'couple'
          ? 2
          : 4;

  const season = resolveSeasonFromDates(intake.travelDates, intake.rawUserGoal);
  const { maxStopsPerDay, maxStopsTotal } = computePacing(dayCount, companionType);
  const maxDailyDistanceKm = 120;

  const estimatedBudgetVnd =
    intake.totalBudgetVnd && intake.totalBudgetVnd > 0
      ? intake.totalBudgetVnd
      : budgetMultipliers[intake.budgetTier].perDay * dayCount * travelersCount;

  const nights = Math.max(1, dayCount - 1);
  const lodgingCapVnd = (estimatedBudgetVnd * AI_PRICE_POLICY.lodgingShareCapPct) / 100;
  const transitCapVnd = (estimatedBudgetVnd * AI_PRICE_POLICY.transitShareCapPct) / 100;

  const allStays =
    overrides?.stays ?? (await listActiveStays({ travelersCount, companionType }));
  const allLogistics =
    overrides?.logistics ?? (await listActiveLogistics({ travelersCount, companionType }));

  const notes: string[] = [];

  // Filter stays within lodgingShareCapPct (for nights & required rooms)
  const stayMatchesBudget = allStays.filter((stay) => {
    const rooms = Math.max(1, Math.ceil(travelersCount / Math.max(1, stay.capacityMax)));
    return stay.nightlyRateVnd * nights * rooms <= lodgingCapVnd;
  });

  const recommendedStays =
    stayMatchesBudget.length > 0
      ? stayMatchesBudget
      : allStays.slice(0, 1);

  if (stayMatchesBudget.length === 0 && recommendedStays.length > 0) {
    notes.push(
      isEn
        ? `Tight lodging budget (${Math.round(lodgingCapVnd).toLocaleString('en-US')} VND); selected the most economical stay option.`
        : `Ngân sách lưu trú chặt (${Math.round(lodgingCapVnd).toLocaleString('vi-VN')}đ); chọn phương án tiết kiệm nhất.`
    );
  }

  // Prefer stay matching requested budgetTier while staying within cap
  const selectedStay =
    recommendedStays.find((s) => s.tier === intake.budgetTier) ||
    recommendedStays[recommendedStays.length - 1] ||
    null;

  // Filter logistics within transitShareCapPct
  const logisticsMatchesBudget = allLogistics.filter(
    (item) => item.dailyRateVnd * dayCount <= transitCapVnd
  );

  const recommendedLogistics =
    logisticsMatchesBudget.length > 0
      ? logisticsMatchesBudget
      : allLogistics.slice(0, 1);

  if (logisticsMatchesBudget.length === 0 && recommendedLogistics.length > 0) {
    notes.push(
      isEn
        ? `Tight transit budget (${Math.round(transitCapVnd).toLocaleString('en-US')} VND); prioritized the most economical transport option.`
        : `Ngân sách di chuyển chặt (${Math.round(transitCapVnd).toLocaleString('vi-VN')}đ); ưu tiên phương tiện tiết kiệm nhất.`
    );
  }

  const selectedLogistics =
    recommendedLogistics.find(
      (l) => l.tier === intake.budgetTier && l.suitableFor.includes(companionType)
    ) ||
    recommendedLogistics.find((l) => l.suitableFor.includes(companionType)) ||
    recommendedLogistics[0] ||
    null;

  if (companionType === 'family') {
    notes.push(
      isEn
        ? 'Family pacing is relaxed to allow extra rest time and minimize long driving legs.'
        : 'Nhịp độ gia đình được giảm tải để có thời gian nghỉ ngơi và hạn chế di chuyển xa.'
    );
  } else if (companionType === 'solo') {
    notes.push(
      isEn
        ? 'Flexible solo itinerary prioritizing motorbike or main-route shuttle transport.'
        : 'Lịch trình độc hành linh hoạt, ưu tiên xe máy hoặc shuttle tuyến chính.'
    );
  }

  return {
    dayCount,
    duration: intake.duration,
    travelersCount,
    companionType,
    seasonMilestone: season.milestone,
    seasonHeadline: `${season.headline} (${season.subheadline})`,
    seasonTheme: season.plannerTheme,
    maxStopsPerDay,
    maxStopsTotal,
    maxDailyDistanceKm,
    recommendedStays,
    selectedStay,
    recommendedLogistics,
    selectedLogistics,
    notes,
  };
}
