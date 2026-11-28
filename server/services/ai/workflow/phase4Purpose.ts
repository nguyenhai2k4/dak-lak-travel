import { OpenInferenceSpanKind, SemanticConventions } from '@arizeai/openinference-semantic-conventions';
import { GEMINI_API_KEY, GEMINI_DECISION_MODEL } from '../../../config.ts';
import { withOpenInferenceSpan } from '../arizeTelemetry.ts';
import {
  type BudgetFeasibilityResult,
  type CapacityAndLogisticsPlan,
  type CmsPostPublic,
  type IntakeState,
  type Language,
  type PricedPlaceItem,
  type PurposeAlignedSelection,
  type RankedPlaceItem,
} from '../../../../src/types/index.ts';
import { queryRelevantPublishedPosts } from '../../cms/postsService.ts';

export interface Phase4PurposeOptions {
  lang?: Language;
  pinnedPlaces?: string[];
  queryPostsFn?: (params: {
    lang: Language;
    themeKey?: IntakeState['mainPurpose'];
    locations?: string[];
    limit?: number;
  }) => CmsPostPublic[] | Promise<CmsPostPublic[]>;
  fetchFn?: typeof fetch;
}

const SEASONAL_PLACE_BOOSTS: Array<{
  keyword: string;
  placeTitle: string;
  boost: number;
  reason: string;
}> = [
  {
    keyword: 'tháng 7',
    placeTitle: 'Thác Dray Nur Hùng Vĩ',
    boost: 26,
    reason: 'Mùa mưa rừng (T7–T9) giúp thác Dray Nur đạt lưu lượng nước hùng vĩ nhất.',
  },
  {
    keyword: 'mùa thu',
    placeTitle: 'Thác Dray Nur Hùng Vĩ',
    boost: 26,
    reason: 'Cao điểm mùa thác nước Tây Nguyên (T7–T9).',
  },
  {
    keyword: 'tháng 10',
    placeTitle: 'Nông trại Cà phê Ea Tân',
    boost: 26,
    reason: 'Mùa thu hoạch trái cà phê chín đỏ (T10–T12) rất hợp trải nghiệm hái & cupping.',
  },
  {
    keyword: 'mùa đông',
    placeTitle: 'Nông trại Cà phê Ea Tân',
    boost: 26,
    reason: 'Mùa dã quỳ & thu hoạch cà phê chín đỏ (T10–T12).',
  },
  {
    keyword: 'mùa đông',
    placeTitle: 'Bảo tàng Thế giới Cà phê',
    boost: 16,
    reason: 'Phù hợp hành trình chủ đề thu hoạch cà phê cuối năm.',
  },
  {
    keyword: 'mùa xuân',
    placeTitle: 'Buôn cổ Ako Dhông',
    boost: 18,
    reason: 'Mùa xuân hoa cà phê trắng & không khí lễ hội cồng chiêng đầu năm.',
  },
  {
    keyword: 'mùa hạ',
    placeTitle: 'Hồ Lắk & Buôn Jun',
    boost: 22,
    reason: 'Nắng cao nguyên rực rỡ (T4–T6), lý tưởng chèo thuyền độc mộc Hồ Lắk.',
  },
];

function scorePlaceDeterministically(
  place: PricedPlaceItem,
  intake: IntakeState,
  capacityPlan: CapacityAndLogisticsPlan,
  lang: Language = 'vi'
): RankedPlaceItem {
  let score = 20;
  const matchReasons: string[] = [];
  const isEn = lang === 'en';

  if (place.themeTags[0] === intake.mainPurpose) {
    score += 40;
    matchReasons.push(
      isEn
        ? `Primary ${intake.mainPurpose} theme highlight`
        : `Trọng tâm chủ đề ${intake.mainPurpose}`
    );
  } else if (place.themeTags.includes(intake.mainPurpose)) {
    score += 24;
    matchReasons.push(
      isEn ? `Fits ${intake.mainPurpose} theme` : `Phù hợp chủ đề ${intake.mainPurpose}`
    );
  }

  if (place.themeTags.includes(capacityPlan.seasonTheme)) {
    score += 14;
    matchReasons.push(
      isEn
        ? `Matches ${capacityPlan.seasonHeadline} season`
        : `Hợp mùa ${capacityPlan.seasonHeadline}`
    );
  }

  const seasonHay = `${capacityPlan.seasonMilestone} ${capacityPlan.seasonHeadline}`.toLowerCase();
  for (const rule of SEASONAL_PLACE_BOOSTS) {
    if (seasonHay.includes(rule.keyword) && place.title === rule.placeTitle) {
      score += rule.boost;
      matchReasons.push(rule.reason);
    }
  }

  const placeHay = `${place.title} ${place.location} ${place.areaCluster}`.toLowerCase();
  for (const interest of intake.secondaryInterests) {
    const clean = interest.toLowerCase().trim();
    if (clean.length >= 2 && placeHay.includes(clean)) {
      score += 12;
      matchReasons.push(
        isEn ? `Matches secondary interest "${interest}"` : `Khớp sở thích phụ "${interest}"`
      );
    }
  }

  if (intake.budgetTier === 'budget' && place.estimatedSpendVnd <= 150000) {
    score += 8;
    matchReasons.push(
      isEn
        ? 'Budget-friendly cost, easy to balance overall budget'
        : 'Chi phí tiết kiệm, dễ cân đối ngân sách'
    );
  }

  if (place.areaCluster === 'BMT') {
    score += 5;
  }

  return {
    ...place,
    score,
    matchReasons,
  };
}

async function applyGeminiDecisionsBatchScoring(
  ranked: RankedPlaceItem[],
  intake: IntakeState,
  capacityPlan: CapacityAndLogisticsPlan,
  fetchFn: typeof fetch = fetch
): Promise<{ scored: RankedPlaceItem[]; usedDecisionsApi: boolean }> {
  const decisionModel = GEMINI_DECISION_MODEL.trim();
  const apiKey = GEMINI_API_KEY.trim();
  if (!decisionModel || !apiKey || ranked.length === 0) {
    return { scored: ranked, usedDecisionsApi: false };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const questions: Record<
      string,
      { type: 'score'; instructions: string; legend: string[] }
    > = {};

    ranked.forEach((place, idx) => {
      questions[`place_${idx}`] = {
        type: 'score',
        instructions: `Rate how well "${place.title}" (${place.areaCluster}, tags=${place.themeTags.join(
          ','
        )}, spend=${place.estimatedSpendVnd} VND) fits this trip.`,
        legend: [
          'Weak fit for user goal or season',
          'Moderate supporting stop',
          'Strong thematic & seasonal fit',
          'Top must-visit highlight for this traveler',
        ],
      };
    });

    const inputText = [
      `Goal: ${intake.rawUserGoal || intake.mainPurpose}`,
      `Main purpose: ${intake.mainPurpose}`,
      `Secondary interests: ${intake.secondaryInterests.join(', ') || 'none'}`,
      `Companion: ${capacityPlan.companionType} (${capacityPlan.travelersCount} pax)`,
      `Duration: ${capacityPlan.dayCount} days`,
      `Season: ${capacityPlan.seasonHeadline}`,
    ].join('\n');

    const response = await fetchFn('https://generativelanguage.googleapis.com/v1beta/decisions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: decisionModel,
        input: inputText,
        questions,
      }),
    });

    if (!response.ok) {
      return { scored: ranked, usedDecisionsApi: false };
    }

    const data = (await response.json()) as {
      answers?: Record<string, { score?: number; expectedScore?: number }>;
    };
    if (!data.answers) {
      return { scored: ranked, usedDecisionsApi: false };
    }

    const updated = ranked.map((place, idx) => {
      const ans = data.answers?.[`place_${idx}`];
      const rawScore =
        typeof ans?.score === 'number'
          ? ans.score
          : typeof ans?.expectedScore === 'number'
            ? ans.expectedScore
            : null;
      if (rawScore === null) return place;
      const bonus = Math.round(Math.max(0, Math.min(3, rawScore)) * 10);
      return {
        ...place,
        score: place.score + bonus,
        matchReasons: [...place.matchReasons, `Gemini Decisions score +${bonus}`],
      };
    });

    return { scored: updated, usedDecisionsApi: true };
  } catch {
    return { scored: ranked, usedDecisionsApi: false };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Phase 4 (Deterministic + Optional Decisions API batch scoring):
 * ranks `feasiblePlaces` by purpose, season, and area cluster coherence within `maxStopsTotal`
 * and `availableActivityBudgetVnd`, then queries relevant published CMS stories.
 */
export async function runPhase4Purpose(
  intake: IntakeState,
  capacityPlan: CapacityAndLogisticsPlan,
  budgetResult: BudgetFeasibilityResult,
  options?: Phase4PurposeOptions
): Promise<PurposeAlignedSelection> {
  return withOpenInferenceSpan(
    'phase4_purpose',
    {
      kind: OpenInferenceSpanKind.CHAIN,
      input: {
        mainPurpose: intake.mainPurpose,
        secondaryInterests: intake.secondaryInterests,
        feasiblePlacesCount: budgetResult.feasiblePlaces.length,
        maxStopsTotal: capacityPlan.maxStopsTotal,
      },
      formatOutput: (res) => ({
        scoringMethod: res.scoringMethod,
        selectedPlaces: res.selectedPlaces.map((p) => p.title),
        areaClustersUsed: res.areaClustersUsed,
        storySlugs: res.relevantPosts.map((p) => p.slug),
      }),
    },
    async () => {
      const pinnedNormalized = (options?.pinnedPlaces || [])
        .map((p) => p.trim().toLowerCase())
        .filter((p) => p.length >= 2);
      const isPinnedPlace = (place: PricedPlaceItem): boolean => {
        if (pinnedNormalized.length === 0) return false;
        const t = place.title.toLowerCase();
        return pinnedNormalized.some((pin) => t === pin || t.includes(pin) || pin.includes(t));
      };

      const initialRanked = budgetResult.feasiblePlaces.map((place) => {
        const base = scorePlaceDeterministically(place, intake, capacityPlan, options?.lang || 'vi');
        if (isPinnedPlace(place)) {
          return {
            ...base,
            score: base.score + 120,
            matchReasons: [
              options?.lang === 'en'
                ? 'Saved in user Trip Backpack (must-include)'
                : 'Điểm đến người dùng đã lưu trong Balo Hành Trình (ưu tiên giữ)',
              ...base.matchReasons,
            ],
          };
        }
        return base;
      });

      const { scored, usedDecisionsApi } = await applyGeminiDecisionsBatchScoring(
        initialRanked,
        intake,
        capacityPlan,
        options?.fetchFn
      );

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.estimatedSpendVnd - b.estimatedSpendVnd;
      });

      // Pick coherent areaClusters so a short 2-day trip stays under 120 km/day without zigzagging,
      // while always allowing clusters explicitly pinned in the user's Trip Backpack.
      const outerClusterScores = new Map<string, number>();
      const pinnedClusters = new Set<string>();
      for (const item of scored) {
        if (isPinnedPlace(item)) {
          pinnedClusters.add(item.areaCluster);
        }
        if (item.areaCluster !== 'BMT' && item.areaCluster !== 'Ea Kao') {
          const prev = outerClusterScores.get(item.areaCluster) || 0;
          if (item.score > prev) outerClusterScores.set(item.areaCluster, item.score);
        }
      }
      const rankedOuterClusters = Array.from(outerClusterScores.entries())
        .sort((a, b) => b[1] - a[1])
        .map((entry) => entry[0]);

      const maxOuterClusters = capacityPlan.dayCount <= 2 ? 1 : capacityPlan.dayCount === 3 ? 2 : 3;
      const allowedClusters = new Set<string>([
        'BMT',
        'Ea Kao',
        ...pinnedClusters,
        ...rankedOuterClusters.slice(0, maxOuterClusters),
      ]);

      const selectedPlaces: RankedPlaceItem[] = [];
      const backupPlaces: RankedPlaceItem[] = [];
      let remainingActivityBudget = budgetResult.availableActivityBudgetVnd;

      // Pass 1: cluster-coherent picks within stop cap & activity budget (pinned stops are sorted first)
      for (const item of scored) {
        const groupCost = item.estimatedSpendVnd * capacityPlan.travelersCount;
        const pinned = isPinnedPlace(item);
        if (
          selectedPlaces.length < capacityPlan.maxStopsTotal &&
          allowedClusters.has(item.areaCluster) &&
          (pinned || groupCost <= remainingActivityBudget)
        ) {
          selectedPlaces.push(item);
          remainingActivityBudget = Math.max(0, remainingActivityBudget - groupCost);
        } else {
          backupPlaces.push(item);
        }
      }

      // Pass 2: if still under stop cap and we have budget, backfill from remaining feasible places
      if (selectedPlaces.length < Math.min(capacityPlan.maxStopsTotal, scored.length)) {
        const stillRemaining: RankedPlaceItem[] = [];
        for (const item of backupPlaces) {
          const groupCost = item.estimatedSpendVnd * capacityPlan.travelersCount;
          if (
            selectedPlaces.length < capacityPlan.maxStopsTotal &&
            groupCost <= remainingActivityBudget
          ) {
            selectedPlaces.push(item);
            remainingActivityBudget -= groupCost;
          } else {
            stillRemaining.push(item);
          }
        }
        backupPlaces.length = 0;
        backupPlaces.push(...stillRemaining);
      }

      const areaClustersUsed = Array.from(new Set(selectedPlaces.map((p) => p.areaCluster)));

      const queryPosts = options?.queryPostsFn ?? queryRelevantPublishedPosts;
      const queryParams = {
        lang: options?.lang || ('vi' as Language),
        themeKey: intake.mainPurpose,
        locations: areaClustersUsed,
        limit: 4,
      };

      const posts = await withOpenInferenceSpan(
        'cms_editorial_retriever',
        {
          kind: OpenInferenceSpanKind.RETRIEVER,
          input: queryParams,
          formatOutput: (docs) => docs.map((d) => ({ slug: d.slug, title: d.title })),
          onSuccess: (span, docs) => {
            docs.forEach((doc, idx) => {
              span.setAttribute(
                `${SemanticConventions.RETRIEVAL_DOCUMENTS}.${idx}.${SemanticConventions.DOCUMENT_ID}`,
                doc.slug
              );
              span.setAttribute(
                `${SemanticConventions.RETRIEVAL_DOCUMENTS}.${idx}.${SemanticConventions.DOCUMENT_CONTENT}`,
                `${doc.title}: ${doc.excerpt}`
              );
              span.setAttribute(
                `${SemanticConventions.RETRIEVAL_DOCUMENTS}.${idx}.${SemanticConventions.DOCUMENT_METADATA}`,
                JSON.stringify({ category: doc.category, location: doc.location, themeKey: doc.themeKey })
              );
            });
          },
        },
        async () => await queryPosts(queryParams)
      );

      const relevantPosts = posts.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        category: p.category,
        location: p.location,
        excerpt: p.excerpt,
        themeKey: p.themeKey,
      }));

      return {
        mainPurpose: intake.mainPurpose,
        selectedPlaces,
        backupPlaces,
        areaClustersUsed,
        relevantPosts,
        scoringMethod: usedDecisionsApi ? 'gemini_decisions' : 'deterministic',
      };
    }
  );
}
