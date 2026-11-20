import { dakLakPlaceDirectory, findPlaceMeta } from '../data/places.ts';
import { budgetMultipliers, plannerCatalog } from '../data/plannerCatalog.ts';
import type {
  AiStopOperation,
  BudgetType,
  CompanionType,
  DurationType,
  ExpenseCategory,
  ExpenseItem,
  ExpensePatch,
  FlattenedStop,
  GeneratedDayPlan,
  GeneratedExpenseItem,
  ItineraryDay,
  ItinerarySlot,
  PlaceMeta,
  ReorderDayOp,
  ThemeType,
} from '../types/index.ts';
import { haversineDistanceKm, resolveGeoForStop } from './googleMaps.ts';

export function getDayCount(duration: DurationType): number {
  return duration === '2N1D' ? 2 : duration === '3N2D' ? 3 : 4;
}

export function buildCatalogWorkingDays(theme: ThemeType, duration: DurationType): ItineraryDay[] {
  const cat = plannerCatalog[theme] || plannerCatalog.coffee;
  const dayCount = getDayCount(duration);
  const stamp = Date.now();

  return cat.days.slice(0, dayCount).map((d, dIdx) => ({
    day: d.day,
    title: d.title,
    area: d.area,
    slots: d.slots.map((s, sIdx) => {
      const meta = findPlaceMeta(s.title, s.location, theme);
      const geo = resolveGeoForStop({
        title: s.title,
        location: s.location,
        x: s.x,
        y: s.y,
        lat: s.lat,
        lng: s.lng,
        googleMapsQuery: s.googleMapsQuery,
      });
      return {
        ...s,
        id: `stop-${dIdx}-${sIdx}-${stamp}`,
        lat: geo.lat,
        lng: geo.lng,
        googleMapsQuery: geo.googleMapsQuery,
        image: s.image || meta.image,
        category: s.category || meta.category,
        rating: s.rating || meta.rating,
        reviews: s.reviews || meta.reviews,
        duration: s.duration || meta.duration,
      };
    }),
  }));
}

export function buildDefaultExpenses(budget: BudgetType, duration: DurationType): ExpenseItem[] {
  const bud = budgetMultipliers[budget] || budgetMultipliers.standard;
  const dayCount = getDayCount(duration);
  const total = Math.round((bud.perDay * dayCount) / 10000) * 10000;
  const stay = Math.round((total * 0.38) / 10000) * 10000;
  const transit = Math.round((total * 0.24) / 10000) * 10000;
  const food = Math.round((total * 0.23) / 10000) * 10000;
  const activity = Math.max(200000, total - stay - transit - food);

  return [
    { id: 'exp-stay', title: `Lưu trú ${dayCount - 1} đêm (${bud.label})`, cat: 'stay', amount: stay },
    { id: 'exp-transit', title: 'Di chuyển sân bay BMV & thuê xe tuyến điểm', cat: 'transit', amount: transit },
    { id: 'exp-food', title: 'Ẩm thực bản địa & thưởng thức Fine Robusta', cat: 'food', amount: food },
    { id: 'exp-act', title: 'Vé tham quan, workshop & trải nghiệm văn hóa', cat: 'activity', amount: activity },
  ];
}

export function flattenStops(days: ItineraryDay[], dayFilter: 'all' | number): FlattenedStop[] {
  const stops: FlattenedStop[] = [];
  let globalIdx = 0;
  days.forEach((d, dIdx) => {
    const dayNum = dIdx + 1;
    d.slots.forEach((s, sIdx) => {
      const item: FlattenedStop = {
        ...s,
        dayNum,
        dayIdx: dIdx,
        slotIdx: sIdx,
        dayLabel: d.day,
        dayTitle: d.title,
        globalIdx,
      };
      if (dayFilter === 'all' || dayFilter === dayNum) {
        stops.push(item);
      }
      globalIdx++;
    });
  });
  return stops;
}

export function computeEstimatedTripKm(
  stops: Array<Pick<ItinerarySlot, 'title' | 'location' | 'x' | 'y' | 'lat' | 'lng'>>
): number {
  if (!stops || stops.length < 2) return 18;
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    const leg = computeLegMetrics(stops[i - 1], stops[i]);
    total += leg.dist;
  }
  return Math.round(total);
}

export function computeLegMetrics(
  a: Pick<ItinerarySlot, 'title' | 'location' | 'x' | 'y' | 'lat' | 'lng'>,
  b: Pick<ItinerarySlot, 'title' | 'location' | 'x' | 'y' | 'lat' | 'lng'>
): { dist: number; mins: number } {
  const geoA = resolveGeoForStop(a);
  const geoB = resolveGeoForStop(b);
  // Apply ~1.28 road-winding factor over straight-line Haversine distance
  const straightKm = haversineDistanceKm(geoA, geoB);
  const dist = Math.max(1.2, Math.round(straightKm * 1.28 * 10) / 10);
  const mins = Math.max(5, Math.round(dist * 1.45 + 3));
  return { dist, mins };
}

export function parsePromptPreferences(
  rawText: string,
  current: {
    duration: DurationType;
    companion: CompanionType;
    budget: BudgetType;
    theme: ThemeType;
  }
): {
  duration: DurationType;
  companion: CompanionType;
  budget: BudgetType;
  theme: ThemeType;
} {
  const text = rawText.toLowerCase();
  let { duration, companion, budget, theme } = current;

  if (text.includes('2n1') || text.includes('2 ngày') || text.includes('2d1n') || text.includes('cuối tuần')) {
    duration = '2N1D';
  } else if (
    text.includes('4n3') ||
    text.includes('4 ngày') ||
    text.includes('5 ngày') ||
    text.includes('4d3n') ||
    text.includes('dài ngày')
  ) {
    duration = '4N3D+';
  } else if (text.includes('3n2') || text.includes('3 ngày') || text.includes('3d2n')) {
    duration = '3N2D';
  }

  if (text.includes('độc hành') || text.includes('một mình') || text.includes('1 mình') || text.includes('solo')) {
    companion = 'solo';
  } else if (text.includes('gia đình') || text.includes('bố mẹ') || text.includes('trẻ nhỏ') || text.includes('family')) {
    companion = 'family';
  } else if (
    text.includes('nhóm bạn') ||
    text.includes('bạn bè') ||
    text.includes('hội bạn') ||
    text.includes('friends')
  ) {
    companion = 'friends';
  } else if (
    text.includes('cặp đôi') ||
    text.includes('người yêu') ||
    text.includes('vợ chồng') ||
    text.includes('couple') ||
    text.includes('lãng mạn')
  ) {
    companion = 'couple';
  }

  if (text.includes('tiết kiệm') || text.includes('bình dân') || text.includes('sinh viên') || text.includes('homestay')) {
    budget = 'budget';
  } else if (
    text.includes('cao cấp') ||
    text.includes('nghỉ dưỡng') ||
    text.includes('resort') ||
    text.includes('5 sao') ||
    text.includes('luxury')
  ) {
    budget = 'luxury';
  } else if (text.includes('tiêu chuẩn')) {
    budget = 'standard';
  }

  if (
    text.includes('ẩm thực') ||
    text.includes('ăn uống') ||
    text.includes('món ăn') ||
    text.includes('bún đỏ') ||
    text.includes('gà nướng') ||
    text.includes('cơm lam') ||
    text.includes('cá lăng')
  ) {
    theme = 'cuisine';
  } else if (
    text.includes('thác') ||
    text.includes('dray nur') ||
    text.includes('yok đôn') ||
    text.includes('rừng') ||
    text.includes('trekking') ||
    text.includes('thiên nhiên') ||
    text.includes('chèo sup') ||
    text.includes('voi')
  ) {
    theme = 'nature';
  } else if (
    text.includes('văn hóa') ||
    text.includes('cồng chiêng') ||
    text.includes('nhà dài') ||
    text.includes('mẫu hệ') ||
    text.includes('thổ cẩm') ||
    text.includes('gốm') ||
    text.includes('di sản')
  ) {
    theme = 'culture';
  } else if (
    text.includes('cà phê') ||
    text.includes('coffee') ||
    text.includes('robusta') ||
    text.includes('hồ lắk') ||
    text.includes('bình minh')
  ) {
    theme = 'coffee';
  }

  return { duration, companion, budget, theme };
}

function findDirectoryPlaceByTitle(placeTitle: string): PlaceMeta | null {
  const target = placeTitle.trim().toLowerCase();
  if (!target) return null;

  const exact = dakLakPlaceDirectory.find((p) => p.title.toLowerCase() === target);
  if (exact) return exact;

  const partial = dakLakPlaceDirectory.find(
    (p) => p.title.toLowerCase().includes(target) || target.includes(p.title.toLowerCase())
  );
  if (partial) return partial;

  // Token overlap fallback for slight naming variations
  const tokens = target.split(/\s+/).filter((t) => t.length > 2);
  let best: PlaceMeta | null = null;
  let bestScore = 0;
  for (const place of dakLakPlaceDirectory) {
    const haystack = `${place.title} ${place.location}`.toLowerCase();
    const score = tokens.reduce((acc, tok) => (haystack.includes(tok) ? acc + 1 : acc), 0);
    if (score > bestScore && score >= 2) {
      bestScore = score;
      best = place;
    }
  }
  return best;
}

export function applyAiStopOperations(
  days: ItineraryDay[],
  operations: AiStopOperation[],
  theme: ThemeType
): { nextDays: ItineraryDay[]; changed: boolean; addedStopTitle?: string } {
  if (!operations || operations.length === 0 || days.length === 0) {
    return { nextDays: days, changed: false };
  }

  let changed = false;
  let addedStopTitle: string | undefined;
  const nextDays: ItineraryDay[] = days.map((d) => ({ ...d, slots: [...d.slots] }));
  const addedIds = new Set<string>();

  const addOps = operations.filter((op) => op.action === 'add' && op.placeTitle?.trim());
  const removeOps = operations.filter((op) => op.action === 'remove' && op.placeTitle?.trim());

  // Infer target day index for any un-numbered `add` when paired with a `remove`
  const inferredRemoveDayIdx = (() => {
    for (const rOp of removeOps) {
      if (rOp.dayNumber && rOp.dayNumber >= 1 && rOp.dayNumber <= nextDays.length) {
        return rOp.dayNumber - 1;
      }
      const rQuery = rOp.placeTitle.trim().toLowerCase();
      const idx = nextDays.findIndex((day) =>
        day.slots.some((s) => {
          const title = s.title.toLowerCase();
          return title === rQuery || title.includes(rQuery) || rQuery.includes(title);
        })
      );
      if (idx >= 0) return idx;
    }
    return 0;
  })();

  // Process `add` first so atomic swaps on a 1-stop day do not trip the 0-stop guard
  addOps.forEach((op, opIdx) => {
    const targetDayIdx =
      op.dayNumber && op.dayNumber >= 1 && op.dayNumber <= nextDays.length
        ? op.dayNumber - 1
        : inferredRemoveDayIdx;
    const targetDay = nextDays[targetDayIdx];
    if (!targetDay) return;

    const matchedPlace = findDirectoryPlaceByTitle(op.placeTitle);
    const title = matchedPlace?.title || op.placeTitle.trim();
    const alreadyExists = targetDay.slots.some(
      (s) => s.title.toLowerCase() === title.toLowerCase()
    );
    if (alreadyExists) return;

    const fallbackMeta = matchedPlace || findPlaceMeta(title, undefined, theme);
    const baseStop = matchedPlace || {
      title,
      location: 'Đắk Lắk',
      x: 375,
      y: 192,
      desc: `Điểm dừng được AI gợi ý thêm vào hành trình (${title}).`,
      ...fallbackMeta,
      period: op.period || 'Buổi chiều',
      time: op.time || '15:30 – 17:00',
    };
    const geo = resolveGeoForStop(baseStop);

    const newSlot: ItinerarySlot = {
      id: `stop-ai-${Date.now()}-${opIdx}`,
      time: op.time || baseStop.time || '15:30 – 17:00',
      period: op.period || baseStop.period || 'Buổi chiều',
      title,
      location: baseStop.location,
      x: baseStop.x,
      y: baseStop.y,
      lat: geo.lat,
      lng: geo.lng,
      googleMapsQuery: geo.googleMapsQuery,
      desc: baseStop.desc,
      image: baseStop.image,
      category: baseStop.category,
      rating: baseStop.rating,
      reviews: baseStop.reviews,
      duration: baseStop.duration,
    };

    targetDay.slots.push(newSlot);
    addedIds.add(newSlot.id);
    addedStopTitle = title;
    changed = true;
  });

  // Process `remove` second, only guarding against leaving a day with 0 stops
  removeOps.forEach((op) => {
    const query = op.placeTitle.trim().toLowerCase();
    if (!query) return;

    const candidateDayIndices =
      op.dayNumber && op.dayNumber >= 1 && op.dayNumber <= nextDays.length
        ? [op.dayNumber - 1]
        : nextDays.map((_, idx) => idx);

    for (const dIdx of candidateDayIndices) {
      const day = nextDays[dIdx];
      if (!day || day.slots.length <= 1) continue;
      const matchIdx = day.slots.findIndex((s) => {
        if (addedIds.has(s.id)) return false;
        const title = s.title.toLowerCase();
        return title === query || title.includes(query) || query.includes(title);
      });
      if (matchIdx >= 0) {
        day.slots.splice(matchIdx, 1);
        changed = true;
        break;
      }
    }
  });

  return { nextDays, changed, addedStopTitle };
}

const DEFAULT_ALLOCATION_PCTS: Record<ExpenseCategory, number> = {
  stay: 38,
  transit: 24,
  food: 23,
  activity: 15,
};

const EXPENSE_CATEGORIES: ExpenseCategory[] = ['stay', 'transit', 'food', 'activity'];

export function applyExpensePatch(
  currentExpenses: ExpenseItem[],
  patch: ExpensePatch | undefined,
  duration: DurationType
): ExpenseItem[] {
  if (!patch) return currentExpenses;

  const fallbackDefaults = buildDefaultExpenses('standard', duration);
  const next: ExpenseItem[] =
    currentExpenses.length > 0
      ? currentExpenses.map((e) => ({ ...e }))
      : fallbackDefaults.map((e) => ({ ...e }));

  const hasBudgetUpdate =
    typeof patch.totalBudgetVnd === 'number' &&
    Number.isFinite(patch.totalBudgetVnd) &&
    patch.totalBudgetVnd > 0;

  const providedPcts = patch.allocationPcts
    ? (EXPENSE_CATEGORIES.filter((cat) => {
        const val = patch.allocationPcts?.[cat];
        return typeof val === 'number' && Number.isFinite(val) && val >= 0;
      }) as ExpenseCategory[])
    : [];
  const hasPctUpdate = providedPcts.length > 0;

  if (hasBudgetUpdate || hasPctUpdate) {
    const currentTotal = next.reduce((sum, e) => sum + Math.max(0, Number(e.amount) || 0), 0);
    const fallbackTotal = fallbackDefaults.reduce((sum, e) => sum + e.amount, 0);
    const targetTotal = hasBudgetUpdate
      ? Math.max(100000, Math.round(Number(patch.totalBudgetVnd) / 10000) * 10000)
      : currentTotal > 0
        ? currentTotal
        : fallbackTotal;

    const currentCatTotals: Record<ExpenseCategory, number> = {
      stay: 0,
      transit: 0,
      food: 0,
      activity: 0,
    };
    for (const item of next) {
      const cat = EXPENSE_CATEGORIES.includes(item.cat) ? item.cat : 'activity';
      currentCatTotals[cat] += Math.max(0, Number(item.amount) || 0);
    }

    const basePcts: Record<ExpenseCategory, number> = {
      stay:
        currentTotal > 0
          ? (currentCatTotals.stay / currentTotal) * 100
          : DEFAULT_ALLOCATION_PCTS.stay,
      transit:
        currentTotal > 0
          ? (currentCatTotals.transit / currentTotal) * 100
          : DEFAULT_ALLOCATION_PCTS.transit,
      food:
        currentTotal > 0
          ? (currentCatTotals.food / currentTotal) * 100
          : DEFAULT_ALLOCATION_PCTS.food,
      activity:
        currentTotal > 0
          ? (currentCatTotals.activity / currentTotal) * 100
          : DEFAULT_ALLOCATION_PCTS.activity,
    };

    const normalizedPcts: Record<ExpenseCategory, number> = { ...basePcts };

    if (hasPctUpdate && patch.allocationPcts) {
      const specifiedSum = providedPcts.reduce(
        (sum, cat) => sum + Math.max(0, Number(patch.allocationPcts![cat])),
        0
      );
      const unspecifiedCats = EXPENSE_CATEGORIES.filter((cat) => !providedPcts.includes(cat));

      if (unspecifiedCats.length === 0 || specifiedSum >= 100) {
        const denom = specifiedSum > 0 ? specifiedSum : 1;
        for (const cat of EXPENSE_CATEGORIES) {
          normalizedPcts[cat] = providedPcts.includes(cat)
            ? (Math.max(0, Number(patch.allocationPcts[cat])) / denom) * 100
            : 0;
        }
      } else {
        const remainingPct = 100 - specifiedSum;
        const unspecifiedBaseSum = unspecifiedCats.reduce((sum, cat) => sum + basePcts[cat], 0);
        for (const cat of providedPcts) {
          normalizedPcts[cat] = Math.max(0, Number(patch.allocationPcts[cat]));
        }
        for (const cat of unspecifiedCats) {
          normalizedPcts[cat] =
            unspecifiedBaseSum > 0
              ? (basePcts[cat] / unspecifiedBaseSum) * remainingPct
              : remainingPct / unspecifiedCats.length;
        }
      }
    }

    const stayAmt = Math.round((targetTotal * (normalizedPcts.stay / 100)) / 10000) * 10000;
    const transitAmt = Math.round((targetTotal * (normalizedPcts.transit / 100)) / 10000) * 10000;
    const foodAmt = Math.round((targetTotal * (normalizedPcts.food / 100)) / 10000) * 10000;
    const activityAmt = Math.max(0, targetTotal - stayAmt - transitAmt - foodAmt);

    const targetAmounts: Record<ExpenseCategory, number> = {
      stay: stayAmt,
      transit: transitAmt,
      food: foodAmt,
      activity: activityAmt,
    };

    for (const cat of EXPENSE_CATEGORIES) {
      const indices = next
        .map((item, idx) => (item.cat === cat ? idx : -1))
        .filter((idx) => idx >= 0);
      const catTarget = targetAmounts[cat];

      if (indices.length === 0) {
        if (catTarget > 0) {
          const defItem = fallbackDefaults.find((d) => d.cat === cat);
          next.push({
            id: defItem?.id || `exp-${cat}`,
            title: defItem?.title || cat,
            cat,
            amount: catTarget,
          });
        }
      } else if (indices.length === 1) {
        next[indices[0]].amount = catTarget;
      } else {
        const oldCatSum = indices.reduce((s, idx) => s + Math.max(0, next[idx].amount), 0);
        let assigned = 0;
        indices.forEach((idx, pos) => {
          if (pos === indices.length - 1) {
            next[idx].amount = Math.max(0, catTarget - assigned);
          } else {
            const share =
              oldCatSum > 0
                ? Math.round(((next[idx].amount / oldCatSum) * catTarget) / 10000) * 10000
                : Math.round(catTarget / indices.length / 10000) * 10000;
            next[idx].amount = share;
            assigned += share;
          }
        });
      }
    }
  }

  if (patch.customExpenseOps && patch.customExpenseOps.length > 0) {
    const stamp = Date.now();
    patch.customExpenseOps.forEach((op, idx) => {
      const cleanTitle = op.title?.trim();
      if (!cleanTitle) return;
      const lower = cleanTitle.toLowerCase();

      if (op.action === 'remove') {
        const matchIdx = next.findIndex((item) => {
          const t = item.title.toLowerCase();
          return t === lower || t.includes(lower) || lower.includes(t);
        });
        if (matchIdx >= 0) {
          next.splice(matchIdx, 1);
        }
      } else if (op.action === 'add') {
        const amount = Math.round(Number(op.amount));
        if (!Number.isFinite(amount) || amount <= 0) return;
        const cat: ExpenseCategory =
          op.cat && EXPENSE_CATEGORIES.includes(op.cat) ? op.cat : 'activity';
        next.push({
          id: `exp-ai-${stamp}-${idx}`,
          title: cleanTitle,
          cat,
          amount,
        });
      }
    });
  }

  return next;
}

export function applyReorderOps(
  days: ItineraryDay[],
  reorderOps: ReorderDayOp[] | undefined
): { nextDays: ItineraryDay[]; changed: boolean } {
  if (!reorderOps || reorderOps.length === 0 || days.length === 0) {
    return { nextDays: days, changed: false };
  }

  let changed = false;
  const nextDays: ItineraryDay[] = days.map((d) => ({ ...d, slots: [...d.slots] }));

  for (const op of reorderOps) {
    const dIdx = (op.dayNumber || 1) - 1;
    const day = nextDays[dIdx];
    if (!day || day.slots.length < 2) continue;

    if (op.action === 'reverse') {
      day.slots.reverse();
      changed = true;
    } else if (op.action === 'swap_slots') {
      const a = op.slotIndexA;
      const b = op.slotIndexB;
      if (
        typeof a === 'number' &&
        typeof b === 'number' &&
        Number.isInteger(a) &&
        Number.isInteger(b) &&
        a >= 0 &&
        b >= 0 &&
        a < day.slots.length &&
        b < day.slots.length &&
        a !== b
      ) {
        const tmp = day.slots[a];
        day.slots[a] = day.slots[b];
        day.slots[b] = tmp;
        changed = true;
      }
    } else if (op.action === 'optimize_route') {
      if (day.slots.length < 3) continue;
      const ordered: ItinerarySlot[] = [day.slots[0]];
      const remaining = day.slots.slice(1);
      while (remaining.length > 0) {
        const last = ordered[ordered.length - 1];
        let bestIdx = 0;
        let bestDist = Infinity;
        remaining.forEach((cand, idx) => {
          const { dist } = computeLegMetrics(last, cand);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = idx;
          }
        });
        ordered.push(remaining.splice(bestIdx, 1)[0]);
      }
      const orderChanged = ordered.some((slot, idx) => slot.id !== day.slots[idx]?.id);
      if (orderChanged) {
        day.slots = ordered;
        changed = true;
      }
    }
  }

  return { nextDays, changed };
}

interface AreaCenterFallback {
  keywords: string[];
  lat: number;
  lng: number;
  x: number;
  y: number;
}

const DEFAULT_AREA_CENTER: AreaCenterFallback = {
  keywords: ['bmt', 'buôn ma thuột', 'buon ma thuot'],
  lat: 12.6788,
  lng: 108.0422,
  x: 380,
  y: 192,
};

const AREA_CENTER_FALLBACKS: AreaCenterFallback[] = [
  {
    keywords: ['hồ lắk', 'ho lak', 'ho_lak', 'liên sơn', 'lien son', 'yang tao', 'huyện lắk'],
    lat: 12.42167,
    lng: 108.18194,
    x: 545,
    y: 315,
  },
  {
    keywords: ['dray nur', 'dray_nur', 'dray sáp', 'krông ana', 'krong ana', 'buôn kuốp', 'sêrêpốk'],
    lat: 12.5028,
    lng: 107.925,
    x: 268,
    y: 285,
  },
  {
    keywords: ['yok đôn', 'yok don', 'yok_don', 'buôn đôn', 'buon don', 'buon_don', 'bản đôn', 'krông na'],
    lat: 12.8038,
    lng: 107.6707,
    x: 155,
    y: 125,
  },
  {
    keywords: ['cư m’gar', "cư m'gar", 'cu mgar', 'cu_mgar', 'ea tân', 'ea tan', 'ea_tan', 'krông năng'],
    lat: 12.94694,
    lng: 108.36111,
    x: 472,
    y: 92,
  },
  {
    keywords: ['ea kao', 'ea_kao', 'tơng jú', 'tong ju'],
    lat: 12.608,
    lng: 108.055,
    x: 342,
    y: 235,
  },
  {
    keywords: ['chư yang sin', 'chu yang sin', 'chu_yang_sin', 'krông bông'],
    lat: 12.455,
    lng: 108.375,
    x: 590,
    y: 290,
  },
  DEFAULT_AREA_CENTER,
];

function resolveAreaCenterFallback(
  areaCluster?: string,
  location?: string,
  dayArea?: string
): AreaCenterFallback {
  const haystack = `${areaCluster || ''} ${location || ''} ${dayArea || ''}`.toLowerCase();
  return (
    AREA_CENTER_FALLBACKS.find((entry) =>
      entry.keywords.some((kw) => haystack.includes(kw))
    ) || DEFAULT_AREA_CENTER
  );
}

/**
 * Hydrate LLM-synthesized days into full ItineraryDay[] with directory metadata
 * and valid coordinates, preserving custom stops via area-center fallbacks.
 */
export function buildGeneratedWorkingDays(
  generatedDays: GeneratedDayPlan[],
  fallbackTheme: ThemeType = 'coffee'
): ItineraryDay[] {
  if (!Array.isArray(generatedDays) || generatedDays.length === 0) {
    return [];
  }

  const stamp = Date.now();
  return generatedDays
    .filter((d) => d && Array.isArray(d.slots) && d.slots.length > 0)
    .map((d, dIdx) => ({
      day: d.day || `Ngày ${dIdx + 1}`,
      title: d.title || `Hành trình ngày ${dIdx + 1}`,
      area: d.area || 'Đắk Lắk',
      slots: d.slots
        .filter((s) => s && typeof s.title === 'string' && s.title.trim().length > 0)
        .map((s, sIdx): ItinerarySlot => {
          const cleanTitle = s.title.trim();
          const matchedDir = s.isCustom ? null : findDirectoryPlaceByTitle(cleanTitle);
          const meta = findPlaceMeta(cleanTitle, s.location, fallbackTheme);
          const areaCenter = resolveAreaCenterFallback(s.areaCluster, s.location, d.area);

          const x = typeof s.x === 'number' ? s.x : matchedDir?.x ?? areaCenter.x;
          const y = typeof s.y === 'number' ? s.y : matchedDir?.y ?? areaCenter.y;
          const hasExplicitLatLng = typeof s.lat === 'number' && typeof s.lng === 'number';

          const geo = resolveGeoForStop({
            title: cleanTitle,
            location: s.location || matchedDir?.location || d.area,
            x,
            y,
            lat: hasExplicitLatLng
              ? s.lat
              : matchedDir?.lat ?? (s.isCustom ? areaCenter.lat : undefined),
            lng: hasExplicitLatLng
              ? s.lng
              : matchedDir?.lng ?? (s.isCustom ? areaCenter.lng : undefined),
            googleMapsQuery: s.googleMapsQuery || matchedDir?.googleMapsQuery,
          });

          return {
            id: `stop-gen-${dIdx}-${sIdx}-${stamp}`,
            time: s.time || matchedDir?.time || '09:00 – 11:00',
            period: s.period || matchedDir?.period || 'Buổi sáng',
            title: matchedDir?.title || cleanTitle,
            location: s.location || matchedDir?.location || d.area || 'Đắk Lắk',
            x,
            y,
            lat: geo.lat,
            lng: geo.lng,
            googleMapsQuery: geo.googleMapsQuery,
            desc: s.desc || matchedDir?.desc || cleanTitle,
            image: matchedDir?.image || meta.image,
            category: s.category || matchedDir?.category || meta.category,
            rating: matchedDir?.rating || meta.rating,
            reviews: matchedDir?.reviews || meta.reviews,
            duration: s.duration || matchedDir?.duration || meta.duration,
          };
        }),
    }))
    .filter((d) => d.slots.length > 0);
}

/**
 * Normalize backend-generated expense items into canvas ExpenseItem[].
 */
export function buildGeneratedExpenses(generatedExpenses: GeneratedExpenseItem[]): ExpenseItem[] {
  if (!Array.isArray(generatedExpenses) || generatedExpenses.length === 0) {
    return [];
  }

  const stamp = Date.now();
  return generatedExpenses
    .filter((item) => item && item.title && Number.isFinite(Number(item.amount)))
    .map((item, idx) => ({
      id: item.id || `exp-gen-${idx}-${stamp}`,
      title: item.title.trim(),
      cat: item.cat || 'activity',
      amount: Math.max(0, Math.round(Number(item.amount))),
    }));
}
