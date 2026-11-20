import { dakLakPlaceDirectory } from '../../../src/data/places.ts';
import {
  type AiChatResponse,
  type AiCitation,
  type AutoEvalCheckItem,
  type AutoEvalResult,
  type BudgetFeasibilityResult,
  type CapacityAndLogisticsPlan,
  type GeneratedDayPlan,
  type GeneratedExpenseItem,
  type IntakeState,
  type PurposeAlignedSelection,
} from '../../../src/types/index.ts';
import { computeLegMetrics } from '../../../src/utils/plannerHelpers.ts';

export interface EvaluatePhase5Input {
  response: AiChatResponse;
  intake: IntakeState;
  capacityPlan: CapacityAndLogisticsPlan;
  budgetResult: BudgetFeasibilityResult;
  purposeSelection: PurposeAlignedSelection;
  validPostSlugs?: string[];
}

export interface EvaluatePhase5Output {
  evalResult: AutoEvalResult;
  repairedResponse: AiChatResponse;
  needsRetry: boolean;
}

export interface EvaluateQaInput {
  response: AiChatResponse;
  userMessage: string;
  tavilySnippets?: Array<{ title?: string; url?: string; content?: string }>;
  tavilyCitations?: AiCitation[];
  validPostSlugs?: string[];
}

export interface EvaluateQaOutput {
  evalResult: AutoEvalResult;
  repairedResponse: AiChatResponse;
  needsRetry: boolean;
}

const NEGATED_ELEPHANT_PATTERNS = [
  /không\s+cưỡi\s+voi/gi,
  /khong\s+cuoi\s+voi/gi,
  /nói\s+không\s+với\s+(?:hoạt\s+động\s+)?cưỡi\s+voi/gi,
  /noi\s+khong\s+voi\s+(?:hoat\s+dong\s+)?cuoi\s+voi/gi,
  /thay\s+vì\s+cưỡi\s+voi/gi,
  /thay\s+vi\s+cuoi\s+voi/gi,
  /(?:cấm|cam|ngừng|ngung|dừng|dung|bỏ|bo|chấm\s+dứt|cham\s+dut|tránh|tranh|từ\s+chối|tu\s+choi)\s+(?:hoạt\s+động\s+|dịch\s+vụ\s+)?(?:cưỡi\s+voi|cuoi\s+voi)/gi,
  /no\s+elephant[- ]rid(?:e|ing)/gi,
  /non[- ]rid(?:e|ing)/gi,
  /without\s+(?:elephant\s+)?rid(?:e|ing)(?:\s+elephants?)?/gi,
  /never\s+ride\s+elephants?/gi,
  /(?:avoid|stop|ban|banned|ending|end|against|replace|instead\s+of|refuse)\s+(?:elephant[- ]rid(?:e|ing)|riding\s+elephants?)/gi,
];

const POSITIVE_ELEPHANT_RIDING_REGEX =
  /(cưỡi\s+voi|cuoi\s+voi|elephant\s+rid(?:e|ing)|ride\s+(?:an?\s+)?elephant|elephant[- ]back)/i;

export function hasElephantRidingViolation(text: string): boolean {
  let scrubbed = String(text || '');
  for (const negPattern of NEGATED_ELEPHANT_PATTERNS) {
    scrubbed = scrubbed.replace(negPattern, ' ');
  }
  return POSITIVE_ELEPHANT_RIDING_REGEX.test(scrubbed);
}

export function sanitizeEthicalElephantText(text: string): string {
  if (!hasElephantRidingViolation(text)) return text;
  const preserved: string[] = [];
  let updated = text;

  for (const negPattern of NEGATED_ELEPHANT_PATTERNS) {
    updated = updated.replace(negPattern, (match) => {
      const idx = preserved.length;
      preserved.push(match);
      return `__ETHICAL_ELEPHANT_SAFE_${idx}__`;
    });
  }

  updated = updated.replace(/cưỡi\s+voi/gi, 'đi bộ ngắm voi tự nhiên không cưỡi voi');
  updated = updated.replace(/cuoi\s+voi/gi, 'đi bộ ngắm voi tự nhiên không cưỡi voi');
  updated = updated.replace(
    /(elephant\s+rid(?:e|ing)|ride\s+(?:an?\s+)?elephant|elephant[- ]back)/gi,
    'ethical elephant observation'
  );

  preserved.forEach((orig, idx) => {
    updated = updated.replace(`__ETHICAL_ELEPHANT_SAFE_${idx}__`, orig);
  });

  return updated;
}

function computeDayDistanceKm(day: GeneratedDayPlan): number {
  if (!day.slots || day.slots.length < 2) return 0;
  let dist = 0;
  for (let i = 1; i < day.slots.length; i++) {
    const a = day.slots[i - 1];
    const b = day.slots[i];
    dist += computeLegMetrics(
      {
        title: a.title,
        location: a.location,
        x: a.x ?? 378,
        y: a.y ?? 196,
        lat: a.lat,
        lng: a.lng,
      },
      {
        title: b.title,
        location: b.location,
        x: b.x ?? 378,
        y: b.y ?? 196,
        lat: b.lat,
        lng: b.lng,
      }
    ).dist;
  }
  return Math.round(dist * 10) / 10;
}

export function isCitationUrlValid(
  citation: AiCitation,
  budgetResult?: BudgetFeasibilityResult,
  purposeSelection?: PurposeAlignedSelection,
  validPostSlugs?: string[],
  allowedExternalUrls?: string[]
): boolean {
  const url = String(citation.url || '').trim();
  if (!url) return false;

  if (url.startsWith('/blog/')) {
    const slug = url.slice('/blog/'.length).split(/[?#]/)[0].trim();
    if (!slug) return false;
    const allowedSlugs = new Set<string>([
      ...(purposeSelection?.relevantPosts.map((p) => p.slug) || []),
      ...(validPostSlugs || []),
    ]);
    if (allowedSlugs.size > 0) {
      return allowedSlugs.has(slug);
    }
    return /^[a-z0-9-]+$/i.test(slug) && !/khong-ton-tai|hallucinated|fake/i.test(slug);
  }

  if (/^https?:\/\//i.test(url)) {
    if (/\.invalid(?=\/|$)/i.test(url)) return false;
    if (url.startsWith('https://www.google.com/maps/')) return true;

    const externalWhitelist = new Set<string>([
      ...(budgetResult?.citations.map((c) => c.url.trim()) || []),
      ...(allowedExternalUrls || []).map((u) => u.trim()),
    ]);
    if (externalWhitelist.size > 0 || budgetResult || purposeSelection) {
      return externalWhitelist.has(url);
    }
    return true;
  }

  return false;
}

/**
 * Deterministic runtime evaluator checking 6 hard constraints on Phase 5 output:
 * 1) 100% selectedPlaces grounding
 * 2) total stop cap (`<= capacityPlan.maxStopsTotal`)
 * 3) budget cap (`<= budgetResult.totalBudgetVnd`)
 * 4) daily route distance (`computeLegMetrics` sum `<= 120 km` per day)
 * 5) ethical no-elephant-riding policy
 * 6) valid grounded citation URLs
 * Reports violations & repairs minor ones cleanly into `repairedResponse`.
 */
export function evaluatePhase5Output(input: EvaluatePhase5Input): EvaluatePhase5Output {
  const { response, capacityPlan, budgetResult, purposeSelection, validPostSlugs } = input;
  const violations: string[] = [];
  const repairsApplied: string[] = [];
  const checks: AutoEvalCheckItem[] = [];

  const repairedResponse: AiChatResponse = {
    ...response,
    itineraryMeta: response.itineraryMeta
      ? {
          ...response.itineraryMeta,
          tips: [...response.itineraryMeta.tips],
        }
      : undefined,
    generatedDays: response.generatedDays
      ? response.generatedDays.map((d) => ({
          ...d,
          slots: d.slots.map((s) => ({ ...s })),
        }))
      : undefined,
    generatedExpenses: response.generatedExpenses
      ? response.generatedExpenses.map((e) => ({ ...e }))
      : undefined,
    citations: response.citations ? response.citations.map((c) => ({ ...c })) : undefined,
  };

  const selectedMap = new Map(
    purposeSelection.selectedPlaces.map((p) => [p.title.trim().toLowerCase(), p])
  );
  const days = repairedResponse.generatedDays || [];
  const distanceLimitKm = capacityPlan.maxDailyDistanceKm || 120;
  const maxStopsPerDay = capacityPlan.maxStopsPerDay || 4;

  // 1. Check 100% selectedPlaces grounding
  const ungroundedTitles: string[] = [];
  days.forEach((day) => {
    day.slots.forEach((slot) => {
      const key = String(slot.title || '').trim().toLowerCase();
      if (!selectedMap.has(key)) {
        ungroundedTitles.push(slot.title);
      }
    });
  });

  if (ungroundedTitles.length > 0) {
    violations.push(
      `Ungrounded stop(s) not in selectedPlaces: ${ungroundedTitles.join(', ')}`
    );
    checks.push({
      name: 'grounding_selected_places',
      passed: false,
      details: `Found ${ungroundedTitles.length} ungrounded stop(s).`,
    });

    // Repair: strip ungrounded stops and replace with unused selectedPlaces if space remains
    const usedKeys = new Set<string>();
    for (const day of days) {
      day.slots = day.slots.filter((slot) => {
        const k = String(slot.title || '').trim().toLowerCase();
        if (selectedMap.has(k) && !usedKeys.has(k)) {
          usedKeys.add(k);
          return true;
        }
        return false;
      });
    }
    const unusedPlaces = purposeSelection.selectedPlaces.filter(
      (p) => !usedKeys.has(p.title.trim().toLowerCase())
    );
    for (const place of unusedPlaces) {
      const currentTotal = days.reduce((sum, d) => sum + d.slots.length, 0);
      if (currentTotal >= capacityPlan.maxStopsTotal || days.length === 0) break;

      const dir = dakLakPlaceDirectory.find(
        (d) => d.title.toLowerCase() === place.title.toLowerCase()
      );
      const candidateSlot = {
        time: dir?.time || '09:00 – 11:00',
        period: dir?.period || 'Buổi sáng',
        title: place.title,
        location: place.location,
        desc: dir?.desc || `Khám phá ${place.title}.`,
        isCustom: false,
        areaCluster: place.areaCluster,
        x: dir?.x,
        y: dir?.y,
        lat: dir?.lat,
        lng: dir?.lng,
        googleMapsQuery: dir?.googleMapsQuery,
        estimatedCostVnd: place.estimatedSpendVnd,
      };

      // Prefer a day below maxStopsPerDay where adding candidateSlot stays within distanceLimitKm
      const eligibleDays = days
        .filter((d) => d.slots.length < maxStopsPerDay)
        .sort((a, b) => a.slots.length - b.slots.length);
      const candidates = eligibleDays.length > 0 ? eligibleDays : [...days].sort((a, b) => a.slots.length - b.slots.length);

      let chosenDay = candidates.find((d) => {
        const simulated: GeneratedDayPlan = { ...d, slots: [...d.slots, candidateSlot] };
        return computeDayDistanceKm(simulated) <= distanceLimitKm;
      });
      if (!chosenDay && candidates[0]?.slots.length === 0) {
        chosenDay = candidates[0];
      }
      if (chosenDay) {
        chosenDay.slots.push(candidateSlot);
      }
    }
    repairsApplied.push(`Replaced/pruned ${ungroundedTitles.length} ungrounded stop(s).`);
  } else {
    checks.push({
      name: 'grounding_selected_places',
      passed: true,
      details: 'All itinerary stops are grounded in selectedPlaces.',
    });
  }

  // 2. Check stop cap
  const initialTotalStops = (response.generatedDays || []).reduce(
    (sum, d) => sum + d.slots.length,
    0
  );
  if (initialTotalStops > capacityPlan.maxStopsTotal) {
    violations.push(
      `Total stops (${initialTotalStops}) exceeds maxStopsTotal (${capacityPlan.maxStopsTotal}).`
    );
    checks.push({
      name: 'stop_cap',
      passed: false,
      details: `${initialTotalStops} > ${capacityPlan.maxStopsTotal}`,
    });
  } else {
    checks.push({
      name: 'stop_cap',
      passed: true,
      details: `${initialTotalStops} <= ${capacityPlan.maxStopsTotal}`,
    });
  }

  // Always enforce stop cap on repaired days
  let currentCount = days.reduce((sum, d) => sum + d.slots.length, 0);
  if (currentCount > capacityPlan.maxStopsTotal || initialTotalStops > capacityPlan.maxStopsTotal) {
    while (currentCount > capacityPlan.maxStopsTotal) {
      const heaviest = [...days].sort((a, b) => b.slots.length - a.slots.length)[0];
      if (!heaviest || heaviest.slots.length === 0) break;
      heaviest.slots.pop();
      currentCount -= 1;
    }
    repairsApplied.push(`Trimmed stops to maxStopsTotal=${capacityPlan.maxStopsTotal}.`);
  }

  // 3. Check budget cap
  const initialExpenseTotal = (response.generatedExpenses || []).reduce(
    (sum, item) => sum + Math.max(0, Number(item.amount) || 0),
    0
  );
  if (budgetResult.totalBudgetVnd > 0 && initialExpenseTotal > budgetResult.totalBudgetVnd) {
    violations.push(
      `Total expenses (${initialExpenseTotal.toLocaleString(
        'vi-VN'
      )} VND) exceed budget cap (${budgetResult.totalBudgetVnd.toLocaleString('vi-VN')} VND).`
    );
    checks.push({
      name: 'budget_cap',
      passed: false,
      details: `${initialExpenseTotal} > ${budgetResult.totalBudgetVnd}`,
    });

    if (repairedResponse.generatedExpenses && repairedResponse.generatedExpenses.length > 0) {
      const scale = budgetResult.totalBudgetVnd / initialExpenseTotal;
      let running = 0;
      const scaled: GeneratedExpenseItem[] = repairedResponse.generatedExpenses.map((e, idx, arr) => {
        if (idx === arr.length - 1) {
          return { ...e, amount: Math.max(0, budgetResult.totalBudgetVnd - running) };
        }
        const nextAmt = Math.max(0, Math.floor((e.amount * scale) / 1000) * 1000);
        running += nextAmt;
        return { ...e, amount: nextAmt };
      });
      repairedResponse.generatedExpenses = scaled;
      repairsApplied.push(
        `Scaled generatedExpenses to stay within ${budgetResult.totalBudgetVnd.toLocaleString('vi-VN')} VND.`
      );
    }
  } else {
    checks.push({
      name: 'budget_cap',
      passed: true,
      details: `${initialExpenseTotal} <= ${budgetResult.totalBudgetVnd}`,
    });
  }

  // 4. Check daily route distance <= maxDailyDistanceKm (120 km)
  const originalDays = response.generatedDays || [];
  const overDistanceDays: string[] = [];

  originalDays.forEach((day, idx) => {
    const km = computeDayDistanceKm(day);
    if (km > distanceLimitKm) {
      overDistanceDays.push(`${day.day || `Day ${idx + 1}`} (${km} km)`);
    }
  });

  if (overDistanceDays.length > 0) {
    violations.push(
      `Daily route distance exceeds ${distanceLimitKm} km: ${overDistanceDays.join(', ')}.`
    );
    checks.push({
      name: 'daily_distance_limit',
      passed: false,
      details: overDistanceDays.join('; '),
    });
  } else {
    checks.push({
      name: 'daily_distance_limit',
      passed: true,
      details: `All days <= ${distanceLimitKm} km.`,
    });
  }

  // Always enforce daily distance limit on repaired days (in case Check 1 backfilled stops)
  let prunedDistanceStops = false;
  for (const day of days) {
    while (day.slots.length > 1 && computeDayDistanceKm(day) > distanceLimitKm) {
      day.slots.pop();
      prunedDistanceStops = true;
    }
  }
  if (overDistanceDays.length > 0 || prunedDistanceStops) {
    repairsApplied.push(`Pruned long-distance detour stops to keep each day <= ${distanceLimitKm} km.`);
  }

  // 5. Check ethical elephant policy (no elephant riding)
  const textCorpus: string[] = [
    response.reply,
    response.itineraryMeta?.title || '',
    response.itineraryMeta?.stayMove || '',
    response.itineraryMeta?.routeTip || '',
    ...(response.itineraryMeta?.tips || []),
    ...originalDays.flatMap((d) => [
      d.title,
      ...d.slots.flatMap((s) => [s.title, s.desc]),
    ]),
  ];

  const hasElephantViolation = textCorpus.some((t) => hasElephantRidingViolation(t));
  if (hasElephantViolation) {
    violations.push('Policy violation: elephant riding recommended instead of ethical observation.');
    checks.push({
      name: 'ethical_elephant_policy',
      passed: false,
      details: 'Detected elephant-riding phrasing.',
    });

    repairedResponse.reply = sanitizeEthicalElephantText(repairedResponse.reply);
    if (repairedResponse.itineraryMeta) {
      repairedResponse.itineraryMeta.title = sanitizeEthicalElephantText(
        repairedResponse.itineraryMeta.title
      );
      repairedResponse.itineraryMeta.routeTip = sanitizeEthicalElephantText(
        repairedResponse.itineraryMeta.routeTip
      );
      repairedResponse.itineraryMeta.tips = repairedResponse.itineraryMeta.tips.map(
        sanitizeEthicalElephantText
      );
    }
    for (const day of days) {
      day.title = sanitizeEthicalElephantText(day.title);
      day.slots.forEach((slot) => {
        slot.title = sanitizeEthicalElephantText(slot.title);
        slot.desc = sanitizeEthicalElephantText(slot.desc);
      });
    }
    repairsApplied.push('Replaced elephant-riding references with ethical non-riding observation.');
  } else {
    checks.push({
      name: 'ethical_elephant_policy',
      passed: true,
      details: 'Complies with ethical elephant observation policy.',
    });
  }

  // 6. Check valid citation URLs
  const rawCitations = response.citations || [];
  const invalidCitations = rawCitations.filter(
    (c) => !isCitationUrlValid(c, budgetResult, purposeSelection, validPostSlugs)
  );

  if (invalidCitations.length > 0) {
    violations.push(
      `Invalid or hallucinated citation URL(s): ${invalidCitations.map((c) => c.url).join(', ')}`
    );
    checks.push({
      name: 'valid_citation_urls',
      passed: false,
      details: `${invalidCitations.length} invalid citation(s)`,
    });

    repairedResponse.citations = rawCitations.filter((c) =>
      isCitationUrlValid(c, budgetResult, purposeSelection, validPostSlugs)
    );
    repairsApplied.push(`Removed ${invalidCitations.length} ungrounded/invalid citation(s).`);
  } else {
    checks.push({
      name: 'valid_citation_urls',
      passed: true,
      details: `${rawCitations.length} verified citation(s).`,
    });
  }

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const passed = violations.length === 0;
  const needsRetry =
    ungroundedTitles.length > 1 || overDistanceDays.length > 0 || hasElephantViolation;

  return {
    evalResult: {
      passed,
      score,
      violations,
      repairsApplied,
      checks,
    },
    repairedResponse,
    needsRetry,
  };
}

/**
 * Deterministic runtime evaluator for `general_qa` and `current_trip_qa` responses:
 * 1) Non-empty, non-JSON-artifact reply
 * 2) Ethical elephant observation policy (no elephant riding)
 * 3) No unintended itinerary mutation on Q&A turns
 * 4) Valid grounded citation URLs (Tavily + CMS)
 */
export function evaluateQaOutput(input: EvaluateQaInput): EvaluateQaOutput {
  const { response, tavilySnippets, tavilyCitations, validPostSlugs } = input;
  const violations: string[] = [];
  const repairsApplied: string[] = [];
  const checks: AutoEvalCheckItem[] = [];

  const repairedResponse: AiChatResponse = {
    ...response,
    stopOperations: response.stopOperations ? [...response.stopOperations] : [],
    citations: response.citations ? response.citations.map((c) => ({ ...c })) : undefined,
  };

  // 1. Check non-empty reply
  const rawReply = String(response.reply || '').trim();
  if (rawReply.length < 5) {
    violations.push('Q&A reply is empty or too short.');
    checks.push({
      name: 'non_empty_reply',
      passed: false,
      details: `Reply length=${rawReply.length}`,
    });
  } else {
    checks.push({
      name: 'non_empty_reply',
      passed: true,
      details: `Reply length=${rawReply.length}`,
    });
  }

  // 2. Check ethical elephant policy
  const hasElephantViolation = hasElephantRidingViolation(rawReply);
  if (hasElephantViolation) {
    violations.push('Policy violation: elephant riding recommended in Q&A reply.');
    checks.push({
      name: 'ethical_elephant_policy',
      passed: false,
      details: 'Detected elephant-riding phrasing in Q&A reply.',
    });
    repairedResponse.reply = sanitizeEthicalElephantText(repairedResponse.reply);
    repairsApplied.push('Replaced elephant-riding references in Q&A reply with ethical observation.');
  } else {
    checks.push({
      name: 'ethical_elephant_policy',
      passed: true,
      details: 'Complies with ethical elephant observation policy.',
    });
  }

  // 3. Check no unintended itinerary mutation for general_qa
  const mutatedItinerary =
    response.intent === 'general_qa' &&
    (Boolean(response.resetItineraryToTheme) ||
      Boolean(response.shouldOpenPlanner) ||
      Boolean(response.generatedDays && response.generatedDays.length > 0) ||
      Boolean(response.stopOperations && response.stopOperations.length > 0));

  if (mutatedItinerary) {
    violations.push('general_qa response attempted to mutate or reset active itinerary.');
    checks.push({
      name: 'no_unintended_itinerary_mutation',
      passed: false,
      details: 'Detected planner mutation flags on general_qa response.',
    });
    repairedResponse.resetItineraryToTheme = false;
    repairedResponse.shouldOpenPlanner = false;
    repairedResponse.generatedDays = undefined;
    repairedResponse.stopOperations = [];
    repairsApplied.push('Cleared itinerary mutation fields on general_qa response.');
  } else {
    checks.push({
      name: 'no_unintended_itinerary_mutation',
      passed: true,
      details: 'No unintended itinerary mutation.',
    });
  }

  // 4. Check valid citation URLs
  const allowedExternalUrls = [
    ...(tavilySnippets || []).map((s) => String(s.url || '').trim()).filter(Boolean),
    ...(tavilyCitations || []).map((c) => String(c.url || '').trim()).filter(Boolean),
  ];
  const rawCitations = response.citations || [];
  const invalidCitations = rawCitations.filter(
    (c) =>
      !isCitationUrlValid(
        c,
        undefined,
        undefined,
        validPostSlugs,
        allowedExternalUrls.length > 0 ? allowedExternalUrls : undefined
      )
  );

  if (invalidCitations.length > 0) {
    violations.push(
      `Invalid or hallucinated Q&A citation URL(s): ${invalidCitations.map((c) => c.url).join(', ')}`
    );
    checks.push({
      name: 'valid_citation_urls',
      passed: false,
      details: `${invalidCitations.length} invalid citation(s)`,
    });
    repairedResponse.citations = rawCitations.filter((c) =>
      isCitationUrlValid(
        c,
        undefined,
        undefined,
        validPostSlugs,
        allowedExternalUrls.length > 0 ? allowedExternalUrls : undefined
      )
    );
    repairsApplied.push(`Removed ${invalidCitations.length} invalid Q&A citation(s).`);
  } else {
    checks.push({
      name: 'valid_citation_urls',
      passed: true,
      details: `${rawCitations.length} verified citation(s).`,
    });
  }

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const passed = violations.length === 0;
  const needsRetry = rawReply.length < 5 || hasElephantViolation;

  return {
    evalResult: {
      passed,
      score,
      violations,
      repairsApplied,
      checks,
    },
    repairedResponse,
    needsRetry,
  };
}
