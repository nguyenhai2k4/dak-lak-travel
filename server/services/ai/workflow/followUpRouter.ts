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
  GEMINI_API_KEY,
  GEMINI_DECISION_MODEL,
  GEMINI_MODEL,
} from '../../../config.ts';
import { dakLakPlaceDirectory } from '../../../../src/data/places.ts';
import { budgetMultipliers } from '../../../../src/data/plannerCatalog.ts';
import {
  AccommodationRecord,
  AiChatRequest,
  AiChatResponse,
  AiStopOperation,
  BudgetType,
  ExpenseAllocationPcts,
  ExpenseCategory,
  ExpensePatch,
  FollowUpActionType,
  LogisticsRecord,
  PlaceMeta,
  ReorderDayOp,
  StayMovePatch,
  ThemeType,
} from '../../../../src/types/index.ts';
import { hasElephantRidingViolation } from '../aiEvaluator.ts';
import { withOpenInferenceSpan } from '../arizeTelemetry.ts';
import {
  inferPlaceMetadata,
  listActiveLogistics,
  listActiveStays,
} from '../plannerDataService.ts';
import {
  buildGroundedQaReplyDeterministic,
  extractBudgetVndFromText,
  foldVietnamese,
  isPrimaryAmenityOrInfoQuestion,
  isQuestionOrInfoRequest,
  loadGroundedQaContext,
  maybeFetchTavilyQaContext,
  resolveEffectiveQaLanguage,
} from './phase1Intake.ts';

export interface FollowUpRouterOptions {
  fetchFn?: typeof fetch;
  stays?: AccommodationRecord[];
  logistics?: LogisticsRecord[];
}

export interface FollowUpRouteResult {
  followUpAction: FollowUpActionType;
  handled: boolean;
  response?: AiChatResponse;
  classifierMethod: string;
}

interface CompactDirectoryEntry {
  title: string;
  category: string;
  areaCluster: string;
  themeTags: ThemeType[];
  time: string;
  period: string;
  location: string;
  meta: PlaceMeta;
}

const VALID_ACTIONS: FollowUpActionType[] = [
  'modify_stops',
  'adjust_budget',
  'swap_logistics',
  'reorder_or_pace',
  'current_trip_qa',
  'full_replan',
];

const AREA_ADJACENCY: Record<string, string[]> = {
  BMT: ['BMT', 'Ea Kao', 'Dray Nur', 'Hồ Lắk', 'Buôn Đôn', 'Krông Năng'],
  'Hồ Lắk': ['Hồ Lắk', 'Ea Kao', 'BMT', 'Dray Nur', 'Chư Yang Sin'],
  'Ea Kao': ['Ea Kao', 'BMT', 'Hồ Lắk', 'Dray Nur'],
  'Dray Nur': ['Dray Nur', 'BMT', 'Ea Kao', 'Hồ Lắk', 'Buôn Đôn'],
  'Buôn Đôn': ['Buôn Đôn', 'BMT', 'Dray Nur'],
  'Krông Năng': ['Krông Năng', 'BMT', 'Ea Kao'],
  'Chư Yang Sin': ['Chư Yang Sin', 'Hồ Lắk', 'BMT'],
};

const PLACE_SHORT_ALIASES: Array<{ keywords: string[]; title: string }> = [
  { keywords: ['bảo tàng thế giới cà phê', 'thế giới cà phê'], title: 'Bảo tàng Thế giới Cà phê' },
  { keywords: ['trung nguyên', 'làng cà phê'], title: 'Làng Cà phê Trung Nguyên' },
  { keywords: ['ako dhông', 'ako dhong', 'akô đhông'], title: 'Buôn cổ Ako Dhông' },
  { keywords: ['bảo tàng đắk lắk', 'bảo tàng dak lak'], title: 'Bảo tàng Đắk Lắk' },
  { keywords: ['ea tân', 'ea tan', 'nông trại'], title: 'Nông trại Cà phê Ea Tân' },
  { keywords: ['đá voi', 'da voi', 'yang tao'], title: 'Đá Voi Mẹ Yang Tao' },
  { keywords: ['hồ lắk', 'ho lak', 'buôn jun', 'buon jun'], title: 'Hồ Lắk & Buôn Jun' },
  { keywords: ['biệt điện', 'biet dien', 'bảo đại'], title: 'Đồi Biệt điện Bảo Đại' },
  { keywords: ['dray nur', 'thác dray', 'dray sáp'], title: 'Thác Dray Nur Hùng Vĩ' },
  { keywords: ['yok đôn', 'yok don', 'vườn quốc gia'], title: 'Vườn Quốc gia Yok Đôn' },
  { keywords: ['tơng jú', 'tong ju', 'dệt thổ cẩm', 'thổ cẩm'], title: 'Làng Dệt Thổ Cẩm Tơng Jú' },
  { keywords: ['phan đình giót', 'phan dinh giot', 'phố ẩm thực'], title: 'Phố Ẩm thực Phan Đình Giót' },
  { keywords: ['bản đôn', 'ban don', 'cầu treo', 'sêrêpốk'], title: 'Cầu Treo Sêrêpốk Bản Đôn' },
];

function getCompactDirectory(): CompactDirectoryEntry[] {
  return dakLakPlaceDirectory.map((meta) => {
    const inferred = inferPlaceMetadata(meta);
    return {
      title: meta.title,
      category: meta.category,
      areaCluster: inferred.areaCluster,
      themeTags: inferred.themeTags,
      time: meta.time,
      period: meta.period,
      location: meta.location,
      meta,
    };
  });
}

function getDayCountFromState(req: AiChatRequest): number {
  if (req.currentState.days.length > 0) return req.currentState.days.length;
  if (req.currentState.duration === '2N1D') return 2;
  if (req.currentState.duration === '4N3D+') return 4;
  return 3;
}

function getTravelersHintFromState(req: AiChatRequest): number {
  const comp = req.currentState.companion;
  if (comp === 'solo') return 1;
  if (comp === 'couple') return 2;
  return 4;
}

function buildBasePreferences(req: AiChatRequest): AiChatResponse['preferences'] {
  return {
    theme: req.currentState.theme,
    duration: req.currentState.duration,
    companion: req.currentState.companion,
    budget: req.currentState.budget,
  };
}

/**
 * Fast deterministic classifier routing follow-ups on an active itinerary into one of the
 * 6 micro-router actions before touching Gemini or falling back to a full 5-phase replan.
 */
export function classifyFollowUpActionDeterministic(req: AiChatRequest): FollowUpActionType {
  const lower = req.message.toLowerCase().trim();
  const isQuestion = isQuestionOrInfoRequest(lower);
  const isPrimaryInfoQ = isPrimaryAmenityOrInfoQuestion(lower);

  // 1. Explicit full replan signals (rebuilding entire itinerary, changing trip duration or whole theme)
  const hasExplicitFullReplanVerb =
    !isPrimaryInfoQ &&
    !isQuestion &&
    /(lên lại|tạo lại|làm lại|thiết kế lại|xây lại|đổi toàn bộ|lịch trình mới|kế hoạch mới|làm mới lịch|replan|rebuild|start over|new itinerary|from scratch)/i.test(
      lower
    );
  const durationChangeMatch = lower.match(/(2n1[đd]|2\s*ngày|2d1n|3n2[đd]|3\s*ngày|3d2n|4n3[đd]|4\s*ngày|5\s*ngày|4d3n)/i);
  const mentionsDifferentDuration = Boolean(
    durationChangeMatch &&
      ((/(2n1[đd]|2\s*ngày|2d1n)/i.test(durationChangeMatch[1]) && req.currentState.duration !== '2N1D') ||
        (/(3n2[đd]|3\s*ngày|3d2n)/i.test(durationChangeMatch[1]) && req.currentState.duration !== '3N2D') ||
        (/(4n3[đd]|4\s*ngày|5\s*ngày|4d3n)/i.test(durationChangeMatch[1]) &&
          req.currentState.duration !== '4N3D+')) &&
      /(đổi|chuyển|thành|sang|lên|tạo|muốn|change|switch|plan|make)/i.test(lower) &&
      !/(ngày\s*[1-4]|day\s*[1-4])/i.test(lower) &&
      !isPrimaryInfoQ &&
      !isQuestion
  );
  const mentionsFullThemeChange =
    /(chủ đề|phong cách|theme|style)/i.test(lower) &&
    /(đổi|chuyển|sang|thành|change|switch)/i.test(lower) &&
    !isPrimaryInfoQ &&
    !isQuestion;

  if (hasExplicitFullReplanVerb || mentionsDifferentDuration || mentionsFullThemeChange) {
    return 'full_replan';
  }

  // 2. Reorder or pace (route optimization, reverse day, swap two slot positions, slow down pace)
  const isReorderOrPace =
    !isPrimaryInfoQ &&
    !isQuestion &&
    /(tối ưu tuyến|tối ưu đường|đỡ vòng vèo|sắp xếp lại|xếp lại thứ tự|đảo ngược|đổi chỗ|hoán đổi|đổi thứ tự|giảm nhịp|đi chậm hơn|thư giãn hơn|reorder|optimize.*route|reverse|swap slots|pace)/i.test(
      lower
    );
  if (isReorderOrPace) {
    return 'reorder_or_pace';
  }

  // 3. Swap logistics (stay / accommodation or transport mode changes)
  const mentionsStayOrTransport =
    /(xe máy|mô tô|ô tô|tự lái|xe riêng|tài xế|xe buýt|shuttle|phương tiện|di chuyển bằng|khách sạn|homestay|resort|bungalow|villa|chỗ ở|nơi ở|lưu trú|nghỉ đêm|ngủ ở|tented camp|mường thanh|elephants|ako dhông|stay|hotel|accommodation|motorbike|scooter|car|transport|driver)/i.test(
      lower
    );
  const hasExplicitLogisticsSwapCmd =
    /(đổi\s*(?:sang|qua|thành|về|chỗ ở|khách sạn|homestay|lưu trú|xe|phương tiện)|chuyển\s*(?:sang|qua|thành|về|chỗ ở|khách sạn|homestay|lưu trú|xe)|thay\s*(?:bằng|sang|đổi)|cập nhật\s*(?:lưu trú|chỗ ở|khách sạn|homestay|phương tiện|di chuyển)|switch\s+(?:stay|hotel|accommodation|transport|to)|change\s+(?:stay|hotel|accommodation|transport|to)|replace\s+.*\s+with)/i.test(
      lower
    );
  const hasLogisticsActionVerb =
    hasExplicitLogisticsSwapCmd ||
    (!isQuestion &&
      !isPrimaryInfoQ &&
      /(?:ngủ ở|nghỉ ở|lưu trú ở|đi bằng|\bthuê\b|\bdùng\b|\bsang\b|\bđổi\b|\bchuyển\b|\bthay\b|\bswitch\b|\bchange\b|\buse\b|\brent\b|\bmove\b)/iu.test(
        lower
      ));
  const isPureAllocationPct =
    /(\d+\s*%|phần trăm|tỷ lệ|tỉ lệ|phân bổ)/i.test(lower) ||
    (/(tăng|giảm)/i.test(lower) &&
      /(ăn uống|tiền phòng|hoạt động|di chuyển)/i.test(lower) &&
      !/(xe máy|ô tô|xe riêng|xe buýt|homestay|resort|bungalow|hồ lắk|ea kao)/i.test(lower));

  const isExplicitExpenseLineOp = /(khoản chi|khoản|mục chi|chi phí)/i.test(lower);
  const blockedLogisticsBecauseQuestion =
    (isQuestion && (!hasExplicitLogisticsSwapCmd || isPrimaryInfoQ)) ||
    (isPrimaryInfoQ && !hasExplicitLogisticsSwapCmd);

  if (
    mentionsStayOrTransport &&
    hasLogisticsActionVerb &&
    !blockedLogisticsBecauseQuestion &&
    !isPureAllocationPct &&
    !isExplicitExpenseLineOp
  ) {
    return 'swap_logistics';
  }

  // 4. Adjust budget (total budget tweak, category % allocation, or custom expense add/remove)
  const mentionsBudgetOrExpense =
    /(ngân sách|chi phí|khoản chi|tiền phòng|lưu trú|ăn uống|hoạt động|phân bổ|tỉ lệ|tỷ lệ|budget|expense|cost|allocation|spend|%)/i.test(
      lower
    );
  const hasExplicitBudgetEditCmd =
    /(tăng|giảm|cắt|bớt|thêm\s*(?:chi phí|khoản)|xóa\s*(?:chi phí|khoản)|bỏ\s*(?:chi phí|khoản)|đổi\s*(?:ngân sách|tỷ lệ|tỉ lệ|phân bổ)|chuyển|chỉnh|cập nhật|xuống|lên|increase|decrease|reduce|adjust|set\s+budget|add\s+expense|remove\s+expense)/i.test(
      lower
    );
  const hasBudgetEditSignal =
    hasExplicitBudgetEditCmd ||
    (!isQuestion &&
      !isPrimaryInfoQ &&
      /(còn|\d+\s*%|\d+\s*(?:triệu|tr\b|k\b|m\b))/i.test(lower));
  const blockedBudgetBecauseQuestion =
    isQuestion && (!hasExplicitBudgetEditCmd || isPrimaryInfoQ);

  if (mentionsBudgetOrExpense && hasBudgetEditSignal && !blockedBudgetBecauseQuestion) {
    return 'adjust_budget';
  }

  // 5. Modify stops (add, remove, or swap a place or category stop in active days)
  const hasStopModifyVerb =
    /(đổi|thay|thay thế|bỏ|xóa|bớt|gỡ|thêm|ghé|bổ sung|swap|replace|remove|drop|delete|add|include)/i.test(
      lower
    );
  const hasExplicitStopEditCmd =
    /(?:đổi|thay\s*thế|thay|swap|replace)\s+.+?\s+(?:sang|thành|bằng|qua|với|for|with|to)\s+/i.test(
      lower
    ) ||
    /(?:^|[,.;]\s*)(?:thêm|bổ sung|bỏ|xóa|bớt|gỡ|add|remove|drop|delete)\s+/i.test(lower);
  const mentionsActiveSlot = req.currentState.days.some((d) =>
    d.slots.some((s) => {
      const titleLower = s.title.toLowerCase();
      const tokens = titleLower.split(/\s+/).filter((t) => t.length >= 3);
      return lower.includes(titleLower) || tokens.filter((t) => lower.includes(t)).length >= 2;
    })
  );
  const mentionsDirectoryOrCategory =
    PLACE_SHORT_ALIASES.some((a) => a.keywords.some((kw) => lower.includes(kw))) ||
    /(địa điểm|điểm dừng|điểm đến|quán cà phê|cà phê|thác|bảo tàng|buôn|nhà hàng|quán ăn|place|stop|coffee|cafe|waterfall|museum|spot)/i.test(
      lower
    );
  const blockedStopsBecauseQuestion =
    isQuestion && (!hasExplicitStopEditCmd || isPrimaryInfoQ);

  if (
    hasStopModifyVerb &&
    (mentionsActiveSlot || mentionsDirectoryOrCategory) &&
    !blockedStopsBecauseQuestion
  ) {
    return 'modify_stops';
  }

  // 6. Current trip Q&A (questions about active schedule, stays/amenities, prices, season/weather, tips)
  if (isQuestion || !hasStopModifyVerb) {
    return 'current_trip_qa';
  }

  return 'modify_stops';
}

async function classifyWithGeminiDecisions(
  req: AiChatRequest,
  fetchFn: typeof fetch
): Promise<FollowUpActionType | null> {
  const decisionModel = GEMINI_DECISION_MODEL.trim();
  const apiKey = GEMINI_API_KEY.trim();
  if (!decisionModel || !apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const daysSummary = req.currentState.days
      .map((d, idx) => `Day ${idx + 1} (${d.day}): ${d.slots.map((s) => s.title).join(', ')}`)
      .join('\n');
    const historySnippet = (req.history || [])
      .slice(-4)
      .map((h) => `User: ${h.user}\nAssistant: ${h.reply}`)
      .join('\n');

    const inputText = [
      `Current plan: theme=${req.currentState.theme}, duration=${req.currentState.duration}, companion=${req.currentState.companion}, budget=${req.currentState.budget}`,
      `Current days:\n${daysSummary}`,
      historySnippet ? `Recent conversation:\n${historySnippet}` : '',
      `Follow-up message: ${req.message}`,
    ]
      .filter(Boolean)
      .join('\n\n');

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
        questions: {
          followup_action: {
            type: 'choice',
            instructions:
              'Choose the single best follow-up routing action. IMPORTANT: Any amenity, price, hours, rental requirement, or factual question (?, "có ... không", "bao nhiêu", "cần gì", "review", "tư vấn") MUST be classified as current_trip_qa unless there is an unambiguous edit/swap command without being primarily an info question.',
            choices: [
              'modify_stops: explicit command to add, remove, or swap a stop or attraction in the existing itinerary',
              'adjust_budget: explicit command to adjust total budget, expense percentages (food/stay/transit/activity), or add/remove an expense item',
              'swap_logistics: explicit command to switch/change accommodation or transport mode (e.g. "đổi sang...", "chuyển sang...") — NOT amenity/price/rental questions',
              'reorder_or_pace: explicit command to optimize route, reverse day order, swap two slots, or adjust pace',
              'current_trip_qa: answer any question about the current itinerary, stays/homestays/resorts & amenities/prices, transport/rental requirements, places, weather, season, or travel tips without modifying the plan',
              'full_replan: explicitly rebuild the entire itinerary or change overall trip duration/theme',
            ],
          },
        },
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      answers?: Record<
        string,
        { choice?: string; answer?: string; value?: string; selectedChoice?: string }
      >;
    };
    const ans = data.answers?.followup_action;
    const rawChoice = ans?.choice || ans?.selectedChoice || ans?.answer || ans?.value || '';
    const prefix = rawChoice.split(':')[0].trim() as FollowUpActionType;
    return VALID_ACTIONS.includes(prefix) ? prefix : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function classifyFollowUpAction(
  req: AiChatRequest,
  options?: FollowUpRouterOptions
): Promise<{ action: FollowUpActionType; method: string }> {
  return withOpenInferenceSpan(
    'follow_up_classify',
    {
      kind: OpenInferenceSpanKind.CHAIN,
      input: {
        message: req.message,
        duration: req.currentState.duration,
        daysCount: req.currentState.days.length,
      },
      formatOutput: (out) => out,
    },
    async () => {
      const fetchFn = options?.fetchFn ?? fetch;
      const deterministicAction = classifyFollowUpActionDeterministic(req);
      const decisionAction = await classifyWithGeminiDecisions(req, fetchFn);
      if (decisionAction) {
        if (
          deterministicAction === 'current_trip_qa' &&
          isQuestionOrInfoRequest(req.message) &&
          (decisionAction === 'swap_logistics' ||
            decisionAction === 'adjust_budget' ||
            decisionAction === 'modify_stops')
        ) {
          return { action: 'current_trip_qa', method: 'deterministic-qa-guardrail' };
        }
        return { action: decisionAction, method: 'gemini_decisions' };
      }
      return {
        action: deterministicAction,
        method: 'deterministic',
      };
    }
  );
}

// ============================================================================
// 1. modify_stops handler (directory-grounded category & stop swaps)
// ============================================================================

function matchActiveSlotInText(
  text: string,
  days: AiChatRequest['currentState']['days'],
  preferredDayNumber?: number
): { title: string; dayNumber: number; time: string } | null {
  const lower = text.toLowerCase();
  const candidates = days.map((d, idx) => ({ day: d, dayNumber: idx + 1 }));
  const orderedDays = preferredDayNumber
    ? [
        ...candidates.filter((c) => c.dayNumber === preferredDayNumber),
        ...candidates.filter((c) => c.dayNumber !== preferredDayNumber),
      ]
    : candidates;

  // Exact or alias match first
  for (const { day, dayNumber } of orderedDays) {
    for (const slot of day.slots) {
      const slotLower = slot.title.toLowerCase();
      if (lower.includes(slotLower)) {
        return { title: slot.title, dayNumber, time: slot.time };
      }
      const alias = PLACE_SHORT_ALIASES.find(
        (a) =>
          (slotLower.includes(a.title.toLowerCase()) ||
            a.title.toLowerCase().includes(slotLower)) &&
          a.keywords.some((kw) => lower.includes(kw))
      );
      if (alias) {
        return { title: slot.title, dayNumber, time: slot.time };
      }
    }
  }

  // Token overlap fallback (>=2 tokens of length >=3)
  let bestMatch: { title: string; dayNumber: number; time: string; score: number } | null = null;
  for (const { day, dayNumber } of orderedDays) {
    for (const slot of day.slots) {
      const tokens = slot.title
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length >= 3);
      const score = tokens.reduce((acc, tok) => (lower.includes(tok) ? acc + 1 : acc), 0);
      if (score >= 2 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { title: slot.title, dayNumber, time: slot.time, score };
      }
    }
  }
  if (bestMatch) {
    return { title: bestMatch.title, dayNumber: bestMatch.dayNumber, time: bestMatch.time };
  }

  // Time-of-day reference (e.g. "điểm buổi chiều ngày 1")
  if (preferredDayNumber && orderedDays[0]?.day.slots.length) {
    const targetDay = orderedDays[0];
    if (/(sáng|morning)/i.test(lower)) {
      const first = targetDay.day.slots[0];
      return { title: first.title, dayNumber: targetDay.dayNumber, time: first.time };
    }
    if (/(chiều|tối|afternoon|evening)/i.test(lower)) {
      const last = targetDay.day.slots[targetDay.day.slots.length - 1];
      return { title: last.title, dayNumber: targetDay.dayNumber, time: last.time };
    }
  }

  return null;
}

function matchDirectoryPlaceByName(
  text: string,
  directory: CompactDirectoryEntry[]
): CompactDirectoryEntry | null {
  const lower = text.toLowerCase();
  for (const entry of directory) {
    if (lower.includes(entry.title.toLowerCase())) {
      return entry;
    }
  }
  for (const alias of PLACE_SHORT_ALIASES) {
    if (alias.keywords.some((kw) => lower.includes(kw))) {
      const found = directory.find((d) => d.title === alias.title);
      if (found) return found;
    }
  }
  return null;
}

function detectTargetThemeFromText(text: string): ThemeType | null {
  const lower = text.toLowerCase();
  if (/(cà phê|cafe|coffee|robusta|cupping|espresso|thưởng thức cà phê)/i.test(lower)) {
    return 'coffee';
  }
  if (/(ẩm thực|ăn uống|món ăn|đặc sản|bún|cơm lam|gà nướng|food|eat|cuisine|restaurant)/i.test(lower)) {
    return 'cuisine';
  }
  if (/(thác|rừng|hồ|thiên nhiên|sinh thái|voi|trekking|waterfall|nature|lake|park)/i.test(lower)) {
    return 'nature';
  }
  if (/(văn hóa|bảo tàng|buôn|làng|thổ cẩm|cồng chiêng|di tích|lịch sử|culture|museum|heritage|village)/i.test(lower)) {
    return 'culture';
  }
  return null;
}

function pickDirectoryReplacementPlace(
  targetText: string,
  directory: CompactDirectoryEntry[],
  existingTitlesLower: Set<string>,
  anchorAreaCluster: string
): CompactDirectoryEntry | null {
  const unused = directory.filter((d) => !existingTitlesLower.has(d.title.toLowerCase()));
  const pool = unused.length > 0 ? unused : directory;

  // 1. Explicit directory place name in target part
  const explicitMatch = matchDirectoryPlaceByName(targetText, pool);
  if (explicitMatch) return explicitMatch;

  // 2. Category / theme-based swap in same or adjacent areaCluster
  const desiredTheme = detectTargetThemeFromText(targetText);
  const adjacencyOrder = AREA_ADJACENCY[anchorAreaCluster] || [anchorAreaCluster, 'BMT'];

  const scored = pool.map((entry) => {
    let score = 0;
    if (desiredTheme) {
      if (entry.themeTags[0] === desiredTheme) score += 45;
      else if (entry.themeTags.includes(desiredTheme)) score += 18;

      if (desiredTheme === 'coffee' && /cà phê/i.test(`${entry.title} ${entry.category}`)) {
        score += 30;
      } else if (desiredTheme === 'cuisine' && /ẩm thực/i.test(`${entry.title} ${entry.category}`)) {
        score += 30;
      } else if (
        desiredTheme === 'nature' &&
        /(thác|hồ|vườn quốc gia|đá voi)/i.test(`${entry.title} ${entry.category}`)
      ) {
        score += 30;
      } else if (
        desiredTheme === 'culture' &&
        /(bảo tàng|buôn|làng|di tích|di sản)/i.test(`${entry.title} ${entry.category}`)
      ) {
        score += 30;
      }
    }

    const clusterIdx = adjacencyOrder.indexOf(entry.areaCluster);
    if (clusterIdx === 0) score += 16;
    else if (clusterIdx > 0) score += Math.max(4, 14 - clusterIdx * 2);

    return { entry, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.entry || null;
}

function resolveModifyStopsDeterministic(
  req: AiChatRequest,
  directory: CompactDirectoryEntry[]
): { stopOperations: AiStopOperation[]; reply: string } {
  const lower = req.message.toLowerCase();
  const dayMatch = lower.match(/(?:ngày|day)\s*([1-4])/i);
  const explicitDay = dayMatch ? Math.min(req.currentState.days.length, Number(dayMatch[1])) : undefined;

  const existingTitlesLower = new Set<string>(
    req.currentState.days.flatMap((d) => d.slots.map((s) => s.title.trim().toLowerCase()))
  );

  // Detect swap pattern: "đổi/thay <source> sang/thành/bằng/qua <target>" or "swap/replace <source> with/for/to <target>"
  const swapMatch = req.message.match(
    /(?:đổi|thay\s*thế|thay|swap|replace)\s+(.+?)\s+(?:sang|thành|bằng|qua|với|for|with|to)\s+(.+)/i
  );

  if (swapMatch) {
    const sourcePart = swapMatch[1];
    const targetPart = swapMatch[2];
    const removedSlot =
      matchActiveSlotInText(sourcePart, req.currentState.days, explicitDay) ||
      matchActiveSlotInText(req.message, req.currentState.days, explicitDay);

    if (removedSlot) {
      const removedDir = directory.find(
        (d) => d.title.toLowerCase() === removedSlot.title.toLowerCase()
      );
      const anchorCluster = removedDir?.areaCluster || 'BMT';
      const replacement = pickDirectoryReplacementPlace(
        targetPart,
        directory,
        existingTitlesLower,
        anchorCluster
      );

      if (replacement) {
        const stopOperations: AiStopOperation[] = [
          {
            action: 'remove',
            placeTitle: removedSlot.title,
            dayNumber: removedSlot.dayNumber,
          },
          {
            action: 'add',
            placeTitle: replacement.title,
            dayNumber: removedSlot.dayNumber,
            time: removedSlot.time || replacement.time,
            period: replacement.period,
          },
        ];

        const reply =
          req.lang === 'en'
            ? `Replaced "${removedSlot.title}" on Day ${removedSlot.dayNumber} with "${replacement.title}" (${replacement.category} • ${replacement.areaCluster}) while keeping the rest of your itinerary intact.`
            : `Đã đổi "${removedSlot.title}" ở Ngày ${removedSlot.dayNumber} sang "${replacement.title}" (${replacement.category} • khu vực ${replacement.areaCluster}) và giữ nguyên các điểm còn lại.`;

        return { stopOperations, reply };
      }
    }
  }

  const isRemove = /(bỏ|xóa|bớt|gỡ|remove|drop|delete)/i.test(lower);
  const isAdd = /(thêm|ghé|bổ sung|add|include|visit)/i.test(lower);
  const ops: AiStopOperation[] = [];

  if (isRemove) {
    const removedSlot = matchActiveSlotInText(req.message, req.currentState.days, explicitDay);
    if (removedSlot) {
      ops.push({
        action: 'remove',
        placeTitle: removedSlot.title,
        dayNumber: removedSlot.dayNumber,
      });
    }
  }

  if (isAdd || ops.length === 0) {
    const anchorCluster =
      req.currentState.days[(explicitDay || 1) - 1]?.title.includes('Hồ Lắk') ? 'Hồ Lắk' : 'BMT';
    const picked = pickDirectoryReplacementPlace(
      req.message,
      directory,
      existingTitlesLower,
      anchorCluster
    );
    if (picked) {
      const targetDay = explicitDay || Math.max(1, req.currentState.days.length);
      ops.push({
        action: 'add',
        placeTitle: picked.title,
        dayNumber: targetDay,
        time: picked.time,
        period: picked.period,
      });
    }
  }

  const summaryList = ops
    .map(
      (op) =>
        `${op.action === 'remove' ? '-' : '+'} ${op.placeTitle} (${req.lang === 'en' ? `Day ${op.dayNumber || 1}` : `Ngày ${op.dayNumber || 1}`})`
    )
    .join(', ');

  const reply =
    ops.length > 0
      ? req.lang === 'en'
        ? `Updated your itinerary stops (${summaryList}) while preserving the rest of your trip.`
        : `Đã cập nhật điểm dừng trong lịch trình (${summaryList}) và giữ nguyên cấu trúc các ngày còn lại.`
      : req.lang === 'en'
        ? 'Could you share which stop in your itinerary you want to add, remove, or replace?'
        : 'Bạn cho mình biết rõ điểm dừng muốn thêm, bớt hoặc đổi sang trải nghiệm nào trong lịch trình nhé!';

  return { stopOperations: ops, reply };
}

const MODIFY_STOPS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    stopOperations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['add', 'remove'] },
          placeTitle: { type: 'STRING' },
          dayNumber: { type: 'INTEGER' },
          time: { type: 'STRING' },
          period: { type: 'STRING' },
        },
        required: ['action', 'placeTitle', 'dayNumber'],
      },
    },
    reply: { type: 'STRING' },
  },
  required: ['stopOperations', 'reply'],
};

async function handleModifyStopsFollowUp(
  req: AiChatRequest,
  fetchFn: typeof fetch
): Promise<AiChatResponse> {
  return withOpenInferenceSpan(
    'follow_up_modify_stops',
    {
      kind: OpenInferenceSpanKind.CHAIN,
      input: { message: req.message, daysCount: req.currentState.days.length },
      formatOutput: (res) => ({
        stopOperations: res.stopOperations,
        provider: res.provider,
      }),
    },
    async () => {
      const directory = getCompactDirectory();
      const deterministic = resolveModifyStopsDeterministic(req, directory);
      const apiKey = GEMINI_API_KEY.trim();

      if (!apiKey) {
        return {
          intent: 'modify_stops',
          followUpAction: 'modify_stops',
          reply: deterministic.reply,
          shouldOpenPlanner: true,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: deterministic.stopOperations,
          suggestedTab: 'schedule',
          status: 'completed',
          provider: 'local-fallback',
        };
      }

      const model = GEMINI_MODEL.trim() || 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const compactDirPayload = directory.map((d) => ({
        title: d.title,
        category: d.category,
        areaCluster: d.areaCluster,
        time: d.time,
        period: d.period,
      }));

      const compactDaysPayload = req.currentState.days.map((d, idx) => ({
        dayNumber: idx + 1,
        day: d.day,
        title: d.title,
        slots: d.slots.map((s) => ({ title: s.title, location: s.location, time: s.time })),
      }));

      const historySnippet = (req.history || [])
        .slice(-4)
        .map((h) => `User: ${h.user}\nAssistant: ${h.reply}`)
        .join('\n');

      const systemText = [
        'You are the Stop-Swap Micro-Router for Đắk Lắk AI Travel Concierge.',
        `UI language: "${req.lang}".`,
        'Resolve the user follow-up edit into exact `stopOperations` grounded in `dakLakPlaceDirectory` and `currentDays`.',
        'Rules:',
        '- Every `remove` placeTitle MUST match an existing slot title in `currentDays`.',
        '- Every `add` placeTitle MUST be an exact `title` from `dakLakPlaceDirectory` that is NOT already in `currentDays`.',
        '- When the user swaps/replaces a stop (even by category like "1 nơi để thưởng thức cà phê"), emit BOTH `remove` and `add` with the SAME `dayNumber` in the same or adjacent `areaCluster`.',
        '- Never suggest elephant riding.',
        '- Write a concise, tailored `reply` confirming the exact change.',
      ].join('\n');

      const prompt = [
        `dakLakPlaceDirectory:\n${JSON.stringify(compactDirPayload)}`,
        `currentDays:\n${JSON.stringify(compactDaysPayload)}`,
        historySnippet ? `recentHistory:\n${historySnippet}` : '',
        `userMessage: ${req.message}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(12000, AI_CHAT_TIMEOUT_MS));

      try {
        const llmOut = await withOpenInferenceSpan(
          'gemini_follow_up_modify_stops',
          {
            kind: OpenInferenceSpanKind.LLM,
            input: prompt,
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
                prompt,
            },
            formatOutput: (res) => res.rawText,
            onSuccess: (span, res) => {
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
            const response = await fetchFn(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemText }] },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.15,
                  maxOutputTokens: 768,
                  responseMimeType: 'application/json',
                  responseSchema: MODIFY_STOPS_SCHEMA,
                },
              }),
            });
            if (!response.ok) {
              throw new Error(`Gemini modify_stops HTTP ${response.status}`);
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

        const jsonText = llmOut.rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const parsed = JSON.parse(jsonText) as {
          stopOperations?: Array<Record<string, unknown>>;
          reply?: string;
        };

        const existingLower = new Set(
          req.currentState.days.flatMap((d) => d.slots.map((s) => s.title.toLowerCase()))
        );
        const dirTitlesMap = new Map(directory.map((d) => [d.title.toLowerCase(), d]));

        const validatedOps: AiStopOperation[] = (parsed.stopOperations || [])
          .filter((op) => op && typeof op === 'object')
          .map((op): AiStopOperation | null => {
            const action = op.action === 'remove' ? 'remove' : 'add';
            const rawTitle = String(op.placeTitle || '').trim();
            const dayNumber = Math.max(
              1,
              Math.min(req.currentState.days.length, Math.round(Number(op.dayNumber) || 1))
            );

            if (action === 'remove') {
              const matchedSlot = matchActiveSlotInText(rawTitle, req.currentState.days, dayNumber);
              if (!matchedSlot) return null;
              return {
                action: 'remove',
                placeTitle: matchedSlot.title,
                dayNumber: matchedSlot.dayNumber,
              };
            }

            const dirMatch =
              dirTitlesMap.get(rawTitle.toLowerCase()) ||
              matchDirectoryPlaceByName(rawTitle, directory);
            if (!dirMatch || existingLower.has(dirMatch.title.toLowerCase())) {
              return null;
            }
            return {
              action: 'add',
              placeTitle: dirMatch.title,
              dayNumber,
              time: typeof op.time === 'string' && op.time.trim() ? op.time.trim() : dirMatch.time,
              period:
                typeof op.period === 'string' && op.period.trim()
                  ? op.period.trim()
                  : dirMatch.period,
            };
          })
          .filter((op): op is AiStopOperation => op !== null);

        // Ensure swaps don't drop one side
        const hasSwapIntent = /(đổi|thay|swap|replace)/i.test(req.message);
        const hasRemove = validatedOps.some((o) => o.action === 'remove');
        const hasAdd = validatedOps.some((o) => o.action === 'add');
        const useDeterministic =
          validatedOps.length === 0 || (hasSwapIntent && (!hasRemove || !hasAdd));

        const finalOps = useDeterministic ? deterministic.stopOperations : validatedOps;
        const rawReply =
          !useDeterministic &&
          typeof parsed.reply === 'string' &&
          parsed.reply.trim() &&
          !hasElephantRidingViolation(parsed.reply)
            ? parsed.reply.trim()
            : deterministic.reply;

        return {
          intent: 'modify_stops',
          followUpAction: 'modify_stops',
          reply: rawReply,
          shouldOpenPlanner: true,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: finalOps,
          suggestedTab: 'schedule',
          status: 'completed',
          provider: useDeterministic ? 'local-fallback' : `gemini-ai:${model}`,
        };
      } catch {
        return {
          intent: 'modify_stops',
          followUpAction: 'modify_stops',
          reply: deterministic.reply,
          shouldOpenPlanner: true,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: deterministic.stopOperations,
          suggestedTab: 'schedule',
          status: 'completed',
          provider: 'local-fallback',
        };
      } finally {
        clearTimeout(timer);
      }
    }
  );
}

// ============================================================================
// 2. adjust_budget handler
// ============================================================================

const EXPENSE_CATS: ExpenseCategory[] = ['stay', 'transit', 'food', 'activity'];

function computeBaseAllocationPcts(
  currentExpenses?: AiChatRequest['currentExpenses']
): ExpenseAllocationPcts {
  if (!currentExpenses || currentExpenses.length === 0) {
    return { stay: 35, transit: 20, food: 25, activity: 20 };
  }
  const sums: Record<ExpenseCategory, number> = { stay: 0, transit: 0, food: 0, activity: 0 };
  let total = 0;
  for (const item of currentExpenses) {
    const amt = Math.max(0, Number(item.amount) || 0);
    if (EXPENSE_CATS.includes(item.cat)) {
      sums[item.cat] += amt;
      total += amt;
    }
  }
  if (total <= 0) {
    return { stay: 35, transit: 20, food: 25, activity: 20 };
  }

  const pcts: ExpenseAllocationPcts = {
    stay: Math.max(5, Math.round((sums.stay / total) * 100)),
    transit: Math.max(5, Math.round((sums.transit / total) * 100)),
    food: Math.max(5, Math.round((sums.food / total) * 100)),
    activity: Math.max(5, Math.round((sums.activity / total) * 100)),
  };
  return normalizeAllocationPctsTo100(pcts);
}

export function normalizeAllocationPctsTo100(
  raw: Partial<ExpenseAllocationPcts>,
  locked?: Set<ExpenseCategory>,
  decreaseHints?: Set<ExpenseCategory>,
  increaseHints?: Set<ExpenseCategory>
): ExpenseAllocationPcts {
  const pcts: ExpenseAllocationPcts = {
    stay: Math.max(5, Math.min(80, Math.round(raw.stay ?? 35))),
    transit: Math.max(5, Math.min(80, Math.round(raw.transit ?? 20))),
    food: Math.max(5, Math.min(80, Math.round(raw.food ?? 25))),
    activity: Math.max(5, Math.min(80, Math.round(raw.activity ?? 20))),
  };

  let diff = pcts.stay + pcts.transit + pcts.food + pcts.activity - 100;

  if (diff > 0) {
    const order: ExpenseCategory[] = [
      ...(decreaseHints ? Array.from(decreaseHints) : []),
      ...EXPENSE_CATS.filter((c) => !locked?.has(c) && !decreaseHints?.has(c)),
      ...EXPENSE_CATS.filter((c) => locked?.has(c)),
    ];
    for (const cat of order) {
      if (diff <= 0) break;
      const reducible = Math.max(0, pcts[cat] - 5);
      const take = Math.min(reducible, diff);
      pcts[cat] -= take;
      diff -= take;
    }
  } else if (diff < 0) {
    let needed = -diff;
    const order: ExpenseCategory[] = [
      ...(increaseHints ? Array.from(increaseHints) : []),
      ...EXPENSE_CATS.filter((c) => !locked?.has(c) && !increaseHints?.has(c)),
      ...EXPENSE_CATS.filter((c) => locked?.has(c)),
    ];
    for (const cat of order) {
      if (needed <= 0) break;
      const addable = Math.max(0, 80 - pcts[cat]);
      const add = Math.min(addable, needed);
      pcts[cat] += add;
      needed -= add;
    }
  }

  return pcts;
}

function extractAmountVnd(text: string): number | null {
  const millionMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr\b|million|m\b)/i);
  if (millionMatch) {
    const val = Math.round(Number(millionMatch[1].replace(',', '.')) * 1_000_000);
    if (Number.isFinite(val) && val >= 50_000) return val;
  }
  const kMatch = text.match(/(\d{2,4})\s*k\b/i);
  if (kMatch) {
    const val = Math.round(Number(kMatch[1]) * 1000);
    if (Number.isFinite(val) && val >= 10_000) return val;
  }
  const fullMatch = text.match(/(\d{1,3}(?:[.,]\d{3})+|\d{5,9})\s*(?:đồng|vnđ|vnd|đ)?/i);
  if (fullMatch) {
    const val = Number(fullMatch[1].replace(/[.,]/g, ''));
    if (Number.isFinite(val) && val >= 10_000) return val;
  }
  return null;
}

function resolveAdjustBudgetDeterministic(req: AiChatRequest): {
  expensePatch: ExpensePatch;
  reply: string;
} {
  const lower = req.message.toLowerCase();
  const basePcts = computeBaseAllocationPcts(req.currentExpenses);
  const travelers = getTravelersHintFromState(req);

  const catMatchers: Array<{ cat: ExpenseCategory; regex: RegExp; labelVi: string }> = [
    {
      cat: 'stay',
      regex: /(tiền phòng|lưu trú|khách sạn|homestay|chỗ ở|phòng ở|stay|hotel|lodging)/i,
      labelVi: 'lưu trú',
    },
    {
      cat: 'transit',
      regex: /(di chuyển|đi lại|vận chuyển|thuê xe|xe cộ|transit|transport)/i,
      labelVi: 'di chuyển',
    },
    {
      cat: 'food',
      regex: /(ăn uống|ẩm thực|đồ ăn|bữa ăn|cà phê|food|dining|meal)/i,
      labelVi: 'ăn uống',
    },
    {
      cat: 'activity',
      regex: /(hoạt động|tham quan|vé|vui chơi|trải nghiệm|activity|tickets?)/i,
      labelVi: 'tham quan & hoạt động',
    },
  ];

  // Check custom expense add/remove first (e.g. "Thêm chi phí mua quà 500k")
  const isCustomExpenseOp =
    /(khoản|mục chi|chi phí mua|mua quà|phát sinh|add expense|remove expense)/i.test(lower) ||
    (/(thêm|bỏ|xóa)\s+(?:chi phí|khoản)/i.test(lower) && !/%/.test(lower));

  if (isCustomExpenseOp) {
    const isRemove = /(bỏ|xóa|gỡ|remove|drop|delete)/i.test(lower);
    const amount = extractAmountVnd(req.message) ?? 300_000;
    const matchedCat = catMatchers.find((c) => c.regex.test(lower))?.cat || 'activity';
    const cleanedTitle = req.message
      .replace(/^(?:thêm|bổ sung|bỏ|xóa|add|remove)\s+(?:chi phí|khoản chi|khoản|mục)?\s*/i, '')
      .replace(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr\b|k\b|vnđ|vnd|đồng|đ)/gi, '')
      .trim();
    const title = cleanedTitle || (matchedCat === 'food' ? 'Chi phí ăn uống bổ sung' : 'Chi phí phát sinh');

    const expensePatch: ExpensePatch = {
      customExpenseOps: [
        isRemove
          ? { action: 'remove', title, cat: matchedCat }
          : { action: 'add', title, cat: matchedCat, amount },
      ],
    };

    const reply =
      req.lang === 'en'
        ? `${isRemove ? 'Removed' : 'Added'} expense item "${title}" (${amount.toLocaleString('en-US')} VND) without changing your map stops.`
        : `Đã ${isRemove ? 'bỏ' : 'thêm'} khoản chi "${title}" (${amount.toLocaleString('vi-VN')}đ) trong bảng ngân sách, giữ nguyên toàn bộ điểm dừng.`;

    return { expensePatch, reply };
  }

  // Extract explicit totalBudgetVnd if user mentions total budget
  let totalBudgetVnd: number | undefined;
  if (/(tổng ngân sách|ngân sách|total budget|chỉ còn|giảm xuống|tăng lên)/i.test(lower) && !/%/.test(lower)) {
    const budgetParsed = extractBudgetVndFromText(req.message, travelers);
    if (budgetParsed.totalBudgetVnd) {
      totalBudgetVnd = budgetParsed.totalBudgetVnd;
    }
  } else if (/(tổng ngân sách|ngân sách).*\d+\s*(?:triệu|tr\b|m\b)/i.test(lower)) {
    const budgetParsed = extractBudgetVndFromText(req.message, travelers);
    if (budgetParsed.totalBudgetVnd) {
      totalBudgetVnd = budgetParsed.totalBudgetVnd;
    }
  }

  // Parse clause-by-clause allocation percentages & directional hints
  const clauses = lower.split(/[,;.]|\bvà\b|\bnhưng\b|\band\b/i).map((c) => c.trim()).filter(Boolean);
  const nextPcts: Partial<ExpenseAllocationPcts> = { ...basePcts };
  const locked = new Set<ExpenseCategory>();
  const decreaseHints = new Set<ExpenseCategory>();
  const increaseHints = new Set<ExpenseCategory>();

  for (const clause of clauses) {
    const pctMatch = clause.match(/(\d{1,2})\s*%/);
    const pctVal = pctMatch ? Number(pctMatch[1]) : null;
    const isInc = /(tăng|lên|ưu tiên|nhiều hơn|increase|raise|more)/i.test(clause);
    const isDec = /(giảm|xuống|cắt|bớt|ít hơn|tiết kiệm|decrease|reduce|cut|less)/i.test(clause);

    for (const matcher of catMatchers) {
      if (matcher.regex.test(clause)) {
        if (pctVal !== null && pctVal >= 5 && pctVal <= 80) {
          nextPcts[matcher.cat] = pctVal;
          locked.add(matcher.cat);
        } else if (isInc) {
          increaseHints.add(matcher.cat);
        } else if (isDec) {
          decreaseHints.add(matcher.cat);
        }
      }
    }
  }

  // If directional hints were given without explicit percentages, shift 10% from decrease -> increase
  if (locked.size === 0 && (increaseHints.size > 0 || decreaseHints.size > 0)) {
    for (const cat of increaseHints) {
      nextPcts[cat] = Math.min(75, (nextPcts[cat] ?? 25) + 10);
      locked.add(cat);
    }
    for (const cat of decreaseHints) {
      nextPcts[cat] = Math.max(5, (nextPcts[cat] ?? 25) - 10);
      if (increaseHints.size === 0) locked.add(cat);
    }
  }

  const hasAllocationChange =
    locked.size > 0 || increaseHints.size > 0 || decreaseHints.size > 0;

  const normalizedPcts = hasAllocationChange
    ? normalizeAllocationPctsTo100(nextPcts, locked, decreaseHints, increaseHints)
    : undefined;

  const expensePatch: ExpensePatch = {};
  if (totalBudgetVnd !== undefined) {
    expensePatch.totalBudgetVnd = totalBudgetVnd;
  }
  if (normalizedPcts) {
    expensePatch.allocationPcts = normalizedPcts;
  }

  if (!expensePatch.totalBudgetVnd && !expensePatch.allocationPcts) {
    const currentTotal = (req.currentExpenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    if (/(giảm|tiết kiệm|cắt)/i.test(lower)) {
      expensePatch.totalBudgetVnd = Math.max(
        1_500_000,
        Math.round(((currentTotal || 6_000_000) * 0.85) / 100_000) * 100_000
      );
    } else {
      expensePatch.allocationPcts = basePcts;
    }
  }

  const parts: string[] = [];
  if (expensePatch.totalBudgetVnd) {
    parts.push(
      req.lang === 'en'
        ? `target budget ${expensePatch.totalBudgetVnd.toLocaleString('en-US')} VND`
        : `tổng ngân sách ${expensePatch.totalBudgetVnd.toLocaleString('vi-VN')}đ`
    );
  }
  if (expensePatch.allocationPcts) {
    const p = expensePatch.allocationPcts;
    parts.push(
      req.lang === 'en'
        ? `allocation (Stay ${p.stay}%, Transit ${p.transit}%, Food ${p.food}%, Activities ${p.activity}%)`
        : `tỷ lệ mới (Lưu trú ${p.stay}%, Di chuyển ${p.transit}%, Ăn uống ${p.food}%, Hoạt động ${p.activity}%)`
    );
  }

  const reply =
    req.lang === 'en'
      ? `Updated your budget breakdown (${parts.join(' • ')}) while keeping all itinerary stops unchanged.`
      : `Đã điều chỉnh cơ cấu chi phí theo ${parts.join(' • ')}, giữ nguyên toàn bộ các điểm tham quan trên bản đồ.`;

  return { expensePatch, reply };
}

async function handleAdjustBudgetFollowUp(req: AiChatRequest): Promise<AiChatResponse> {
  return withOpenInferenceSpan(
    'follow_up_adjust_budget',
    {
      kind: OpenInferenceSpanKind.CHAIN,
      input: { message: req.message, currentExpenses: req.currentExpenses || [] },
      formatOutput: (res) => ({
        expensePatch: res.expensePatch,
        provider: res.provider,
      }),
    },
    async () => {
      const { expensePatch, reply } = resolveAdjustBudgetDeterministic(req);
      return {
        intent: 'update_itinerary',
        followUpAction: 'adjust_budget',
        reply,
        shouldOpenPlanner: true,
        preferences: buildBasePreferences(req),
        resetItineraryToTheme: false,
        stopOperations: [],
        expensePatch,
        suggestedTab: 'schedule',
        status: 'completed',
        provider: 'local-fallback',
      };
    }
  );
}

// ============================================================================
// 3. swap_logistics handler (Phase 2 stays/logistics + stayMovePatch + expensePatch)
// ============================================================================

function matchRequestedStay(
  lower: string,
  stays: AccommodationRecord[],
  fallbackTier: BudgetType
): AccommodationRecord | null {
  if (stays.length === 0) return null;
  const folded = foldVietnamese(lower);
  const directMatch = stays.find(
    (s) =>
      folded.includes(foldVietnamese(s.name)) ||
      (folded.includes('elephants') && foldVietnamese(s.name).includes('elephants')) ||
      (folded.includes('muong thanh') && foldVietnamese(s.name).includes('muong thanh')) ||
      (folded.includes('lak tented') && foldVietnamese(s.name).includes('lak tented')) ||
      (folded.includes('ako dhong') && foldVietnamese(s.name).includes('ako dhong')) ||
      (folded.includes('zan') && foldVietnamese(s.name).includes('zan'))
  );
  if (directMatch) return directMatch;

  const wantsHoLak = /(hồ lắk|ho lak|liên sơn|buôn jun)/i.test(lower);
  const wantsEaKao = /(ea kao|tơng jú)/i.test(lower);
  const wantsBmt = /(bmt|buôn ma thuột|trung tâm|ako dhông|mường thanh|elephants)/i.test(lower);

  let pool = stays;
  if (wantsHoLak) {
    const areaMatches = stays.filter((s) => s.area.toLowerCase().includes('hồ lắk'));
    if (areaMatches.length > 0) pool = areaMatches;
  } else if (wantsEaKao) {
    const areaMatches = stays.filter((s) => s.area.toLowerCase().includes('ea kao'));
    if (areaMatches.length > 0) pool = areaMatches;
  } else if (wantsBmt) {
    const areaMatches = stays.filter((s) => s.area.toLowerCase().includes('bmt'));
    if (areaMatches.length > 0) pool = areaMatches;
  }

  let targetTier: BudgetType | null = null;
  if (/(homestay|nhà dài|tiết kiệm|bình dân|rẻ|budget)/i.test(lower)) targetTier = 'budget';
  else if (/(resort|villa|5 sao|cao cấp|sang trọng|luxury)/i.test(lower)) targetTier = 'luxury';
  else if (/(khách sạn|bungalow|tented|4 sao|tiêu chuẩn|standard)/i.test(lower)) targetTier = 'standard';

  return (
    (targetTier ? pool.find((s) => s.tier === targetTier) : undefined) ||
    pool.find((s) => s.tier === fallbackTier) ||
    pool[0] ||
    null
  );
}

function matchRequestedLogistics(
  lower: string,
  logistics: LogisticsRecord[],
  fallbackTier: BudgetType
): LogisticsRecord | null {
  if (logistics.length === 0) return null;

  if (/(xe máy|mô tô|tay ga|xe số|motorbike|scooter)/i.test(lower)) {
    return logistics.find((l) => l.mode === 'motorbike') || logistics[0];
  }
  if (/(xe buýt|shuttle|xe khách|bus)/i.test(lower)) {
    return logistics.find((l) => l.mode === 'local_bus_shuttle') || logistics[0];
  }
  if (/(tự lái|ô tô 4|ô tô 5|self[- ]?drive|self drive)/i.test(lower)) {
    return logistics.find((l) => l.mode === 'self_drive_car') || logistics[0];
  }
  if (/(xe riêng|tài xế|7 chỗ|private car|driver)/i.test(lower)) {
    return logistics.find((l) => l.mode === 'private_car_driver') || logistics[0];
  }

  return logistics.find((l) => l.tier === fallbackTier) || logistics[0] || null;
}

async function handleSwapLogisticsFollowUp(
  req: AiChatRequest,
  options?: FollowUpRouterOptions
): Promise<AiChatResponse> {
  return withOpenInferenceSpan(
    'follow_up_swap_logistics',
    {
      kind: OpenInferenceSpanKind.CHAIN,
      input: { message: req.message, companion: req.currentState.companion },
      formatOutput: (res) => ({
        stayMovePatch: res.stayMovePatch,
        expensePatch: res.expensePatch,
        provider: res.provider,
      }),
    },
    async () => {
      const lower = req.message.toLowerCase();
      const dayCount = getDayCountFromState(req);
      const nights = Math.max(1, dayCount - 1);
      const travelersCount = getTravelersHintFromState(req);

      const stays =
        options?.stays ??
        listActiveStays({ travelersCount, companionType: req.currentState.companion });
      const logistics =
        options?.logistics ??
        listActiveLogistics({ travelersCount, companionType: req.currentState.companion });

      const mentionsStay =
        /(khách sạn|homestay|resort|bungalow|chỗ ở|nơi ở|lưu trú|nghỉ đêm|ngủ ở|hồ lắk|ea kao|ako dhông|mường thanh|stay|hotel|accommodation)/i.test(
          lower
        );
      const mentionsTransport =
        /(xe máy|mô tô|ô tô|tự lái|xe riêng|tài xế|xe buýt|shuttle|phương tiện|di chuyển|motorbike|car|bus|transport|driver)/i.test(
          lower
        );

      const selectedStay = matchRequestedStay(lower, stays, req.currentState.budget);
      const selectedLogistics = matchRequestedLogistics(lower, logistics, req.currentState.budget);

      const roomsNeeded = selectedStay
        ? Math.max(1, Math.ceil(travelersCount / Math.max(1, selectedStay.capacityMax)))
        : 1;
      const newStayVnd = selectedStay ? selectedStay.nightlyRateVnd * nights * roomsNeeded : 0;
      const newTransitVnd = selectedLogistics ? selectedLogistics.dailyRateVnd * dayCount : 0;

      const isEn = req.lang === 'en';
      const stayLabel = selectedStay
        ? isEn
          ? `${selectedStay.name} (${selectedStay.area} • ~${selectedStay.nightlyRateVnd.toLocaleString('en-US')} VND/night)`
          : `${selectedStay.name} (${selectedStay.area} • ~${selectedStay.nightlyRateVnd.toLocaleString('vi-VN')}đ/đêm)`
        : budgetMultipliers[req.currentState.budget].stayMove;
      const transitLabel = selectedLogistics
        ? isEn
          ? `${selectedLogistics.label} (~${selectedLogistics.dailyRateVnd.toLocaleString('en-US')} VND/day)`
          : `${selectedLogistics.label} (~${selectedLogistics.dailyRateVnd.toLocaleString('vi-VN')}đ/ngày)`
        : '';

      const stayMovePatch: StayMovePatch = {
        stayMove: [stayLabel, transitLabel].filter(Boolean).join(' • '),
        selectedStayId: selectedStay ? String(selectedStay.id) : undefined,
        selectedLogisticsId: selectedLogistics ? String(selectedLogistics.id) : undefined,
      };

      const customExpenseOps: NonNullable<ExpensePatch['customExpenseOps']> = [];
      const existingStayItem = (req.currentExpenses || []).find((e) => e.cat === 'stay');
      const existingTransitItem = (req.currentExpenses || []).find((e) => e.cat === 'transit');

      if ((mentionsStay || !mentionsTransport) && selectedStay) {
        customExpenseOps.push({
          action: 'remove',
          title: existingStayItem?.title || (isEn ? 'Stay' : 'Lưu trú'),
          cat: 'stay',
        });
        customExpenseOps.push({
          action: 'add',
          title: isEn
            ? `Stay ${nights} nights (${selectedStay.name})`
            : `Lưu trú ${nights} đêm (${selectedStay.name})`,
          cat: 'stay',
          amount: newStayVnd,
        });
      }

      if ((mentionsTransport || !mentionsStay) && selectedLogistics) {
        customExpenseOps.push({
          action: 'remove',
          title: existingTransitItem?.title || (isEn ? 'Transport' : 'Di chuyển'),
          cat: 'transit',
        });
        customExpenseOps.push({
          action: 'add',
          title: isEn
            ? `${selectedLogistics.label} (${dayCount} days)`
            : `${selectedLogistics.label} (${dayCount} ngày)`,
          cat: 'transit',
          amount: newTransitVnd,
        });
      }

      const expensePatch: ExpensePatch = { customExpenseOps };

      const reply =
        req.lang === 'en'
          ? `Updated your stay & transport to: ${stayMovePatch.stayMove} and recalculated stay/transit expenses without modifying map stops.`
          : `Đã cập nhật lưu trú & di chuyển sang: ${stayMovePatch.stayMove}, đồng thời cập nhật lại khoản chi lưu trú/di chuyển và giữ nguyên các điểm tham quan.`;

      return {
        intent: 'update_itinerary',
        followUpAction: 'swap_logistics',
        reply,
        shouldOpenPlanner: true,
        preferences: buildBasePreferences(req),
        resetItineraryToTheme: false,
        stopOperations: [],
        stayMovePatch,
        expensePatch,
        suggestedTab: 'schedule',
        status: 'completed',
        provider: 'local-fallback',
      };
    }
  );
}

// ============================================================================
// 4. reorder_or_pace handler
// ============================================================================

function resolveReorderOpsDeterministic(req: AiChatRequest): {
  reorderOps: ReorderDayOp[];
  reply: string;
} {
  const lower = req.message.toLowerCase();
  const days = req.currentState.days;
  const dayMatch = lower.match(/(?:ngày|day)\s*([1-4])/i);
  const explicitDay = dayMatch
    ? Math.max(1, Math.min(days.length, Number(dayMatch[1])))
    : null;

  const isSwapSlots = /(đổi chỗ|hoán đổi|đổi thứ tự|swap\s*slots?|swap\s*\d)/i.test(lower);
  const isReverse = /(đảo ngược|ngược lại|reverse)/i.test(lower);

  const reorderOps: ReorderDayOp[] = [];

  if (isSwapSlots) {
    const targetDay = explicitDay || 1;
    const daySlots = days[targetDay - 1]?.slots || [];
    const twoNumMatch = lower.match(/(\d+)\s*(?:và|với|&|and)\s*(?:điểm|slot|mục|chỗ)?\s*(\d+)/i);

    let slotIndexA = 0;
    let slotIndexB = Math.max(0, Math.min(1, daySlots.length - 1));

    if (twoNumMatch) {
      const a = Math.max(1, Number(twoNumMatch[1])) - 1;
      const b = Math.max(1, Number(twoNumMatch[2])) - 1;
      if (daySlots.length > 0) {
        slotIndexA = Math.min(daySlots.length - 1, a);
        slotIndexB = Math.min(daySlots.length - 1, b);
      } else {
        slotIndexA = a;
        slotIndexB = b;
      }
    } else if (/(sáng|morning)/i.test(lower) && /(chiều|tối|afternoon|evening)/i.test(lower)) {
      slotIndexA = 0;
      slotIndexB = Math.max(1, daySlots.length - 1);
    }

    reorderOps.push({
      dayNumber: targetDay,
      action: 'swap_slots',
      slotIndexA,
      slotIndexB,
    });
  } else if (isReverse) {
    if (explicitDay) {
      reorderOps.push({ dayNumber: explicitDay, action: 'reverse' });
    } else {
      days.forEach((d, idx) => {
        if (d.slots.length >= 2) {
          reorderOps.push({ dayNumber: idx + 1, action: 'reverse' });
        }
      });
    }
  } else {
    // Default: optimize_route
    if (explicitDay) {
      reorderOps.push({ dayNumber: explicitDay, action: 'optimize_route' });
    } else {
      days.forEach((d, idx) => {
        if (d.slots.length >= 2) {
          reorderOps.push({ dayNumber: idx + 1, action: 'optimize_route' });
        }
      });
      if (reorderOps.length === 0 && days.length > 0) {
        reorderOps.push({ dayNumber: 1, action: 'optimize_route' });
      }
    }
  }

  const descList = reorderOps
    .map((op) => {
      if (op.action === 'swap_slots') {
        return `đổi vị trí điểm ${(op.slotIndexA ?? 0) + 1} ↔ ${(op.slotIndexB ?? 1) + 1} (Ngày ${op.dayNumber})`;
      }
      if (op.action === 'reverse') {
        return `đảo ngược thứ tự Ngày ${op.dayNumber}`;
      }
      return `tối ưu tuyến đường Ngày ${op.dayNumber}`;
    })
    .join(', ');

  const reply =
    req.lang === 'en'
      ? `Reordered your active schedule (${reorderOps.map((o) => `Day ${o.dayNumber}: ${o.action}`).join(', ')}) without changing your stops or budget.`
      : `Đã sắp xếp lại lộ trình (${descList}) để di chuyển thuận tiện hơn, giữ nguyên các điểm dừng và ngân sách.`;

  return { reorderOps, reply };
}

async function handleReorderOrPaceFollowUp(req: AiChatRequest): Promise<AiChatResponse> {
  return withOpenInferenceSpan(
    'follow_up_reorder_or_pace',
    {
      kind: OpenInferenceSpanKind.CHAIN,
      input: { message: req.message, daysCount: req.currentState.days.length },
      formatOutput: (res) => ({
        reorderOps: res.reorderOps,
        provider: res.provider,
      }),
    },
    async () => {
      const { reorderOps, reply } = resolveReorderOpsDeterministic(req);
      return {
        intent: 'update_itinerary',
        followUpAction: 'reorder_or_pace',
        reply,
        shouldOpenPlanner: true,
        preferences: buildBasePreferences(req),
        resetItineraryToTheme: false,
        stopOperations: [],
        reorderOps,
        suggestedTab: 'map',
        status: 'completed',
        provider: 'local-fallback',
      };
    }
  );
}

// ============================================================================
// 5. current_trip_qa handler (grounded in stays, logistics, directory, seasonsData, currentDays)
// ============================================================================

async function handleCurrentTripQaFollowUp(
  req: AiChatRequest,
  fetchFn: typeof fetch,
  options?: FollowUpRouterOptions
): Promise<AiChatResponse> {
  return withOpenInferenceSpan(
    'follow_up_current_trip_qa',
    {
      kind: OpenInferenceSpanKind.CHAIN,
      input: { message: req.message, daysCount: req.currentState.days.length },
      formatOutput: (res) => ({ reply: res.reply, provider: res.provider }),
    },
    async () => {
      const groundedCtx = loadGroundedQaContext({
        stays: options?.stays,
        logistics: options?.logistics,
      });
      const tavilyCtx = await maybeFetchTavilyQaContext(req.message);
      const deterministicReply = buildGroundedQaReplyDeterministic(req, {
        stays: options?.stays,
        logistics: options?.logistics,
        tavilySnippets: tavilyCtx.snippets,
        tavilyAnswer: tavilyCtx.answer,
      });
      const apiKey = GEMINI_API_KEY.trim();

      if (!apiKey) {
        return {
          intent: 'general_qa',
          followUpAction: 'current_trip_qa',
          reply: deterministicReply,
          shouldOpenPlanner: false,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: [],
          ...(tavilyCtx.citations.length > 0 ? { citations: tavilyCtx.citations } : {}),
          status: 'completed',
          provider: 'local-fallback',
        };
      }

      const model = GEMINI_MODEL.trim() || 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const historySnippet = (req.history || [])
        .slice(-4)
        .map((h) => `User: ${h.user}\nAssistant: ${h.reply}`)
        .join('\n');

      const effectiveQaLang = resolveEffectiveQaLanguage(req.message, req.lang);
      const systemText = [
        'You are the Active-Itinerary & Local Knowledge Q&A assistant for Đắk Lắk AI Travel Concierge.',
        `UI language: "${req.lang}". Target reply language: "${effectiveQaLang}".`,
        'Answer the user question directly, accurately, and cleanly by synthesizing the grounded local data (`currentDays`, `stays`, `logistics`, `dakLakPlaceDirectory`, `seasonsData`), live web search context (`tavilyLiveWebAnswer`, `tavilySnippets`), and verified Đắk Lắk travel knowledge.',
        `CRITICAL LANGUAGE RULE: Write 100% of your reply in ${effectiveQaLang === 'vi' ? 'natural, fluent Vietnamese' : 'natural, fluent English'} matching the user's question. If \`tavilyLiveWebAnswer\` or \`tavilySnippets\` are in English and target language is "vi", ALWAYS translate and synthesize them into natural Vietnamese — NEVER paste English sentences into a Vietnamese reply.`,
        'READABILITY & FORMATTING RULE: Format your response with clean Markdown for easy scanning: start with a concise 1–2 sentence direct answer, then organize key details (prices, schedules, highlights, practical notes) into bullet points (`- **Nhãn**: nội dung`) separated by blank lines.',
        'CRITICAL HONESTY RULES:',
        '- For questions about internal catalog stays/accommodations (amenities like swimming pool/hồ bơi, wifi, breakfast, prices), check `stays` (`name`, `area`, `tier`, `nightlyRateVnd`, `amenities`, `sourceNote`) and any `tavilySnippets`.',
        '- If an asked amenity (e.g. a swimming pool / hồ bơi), opening hour, or policy is NOT listed or confirmed for that stay/place in our dataset or live snippets, state clearly and honestly that it is NOT listed/confirmed in our data, list the actual amenities that ARE recorded, and suggest relevant alternative stays from `stays` that DO list it (e.g. Elephants Hotel Buôn Ma Thuột or Mường Thanh Luxury Buôn Ma Thuột for a pool).',
        '- For general or external questions (e.g. airport transfers, flights/buses, festivals, external attractions, restaurants, cafes, history, culture, weather), provide a helpful, accurate answer using `tavilyLiveWebAnswer`, `tavilySnippets`, and Đắk Lắk domain knowledge.',
        '- Do NOT mutate or claim to have modified the active itinerary.',
        '- Never invent nonexistent stops or amenities, and never suggest elephant riding.',
      ].join('\n');

      const prompt = [
        `currentState: duration=${req.currentState.duration}, companion=${req.currentState.companion}, budget=${req.currentState.budget}, theme=${req.currentState.theme}`,
        `currentDays:\n${JSON.stringify(req.currentState.days)}`,
        `stays:\n${JSON.stringify(groundedCtx.stays)}`,
        `logistics:\n${JSON.stringify(groundedCtx.logistics)}`,
        `dakLakPlaceDirectory:\n${JSON.stringify(groundedCtx.places)}`,
        `seasonsData:\n${JSON.stringify(groundedCtx.seasons)}`,
        tavilyCtx.answer ? `tavilyLiveWebAnswer:\n${tavilyCtx.answer}` : '',
        tavilyCtx.snippets.length > 0
          ? `tavilySnippets:\n${JSON.stringify(tavilyCtx.snippets)}`
          : '',
        historySnippet ? `recentHistory:\n${historySnippet}` : '',
        `question: ${req.message}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(10000, AI_CHAT_TIMEOUT_MS));

      try {
        const llmOut = await withOpenInferenceSpan(
          'gemini_follow_up_trip_qa',
          {
            kind: OpenInferenceSpanKind.LLM,
            input: prompt,
            attributes: {
              [LLM_MODEL_NAME]: model,
              [LLM_PROVIDER]: 'google',
              [LLM_SYSTEM]: 'gemini',
            },
            formatOutput: (res) => res.rawText,
          },
          async () => {
            const response = await fetchFn(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemText }] },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 1200,
                },
              }),
            });
            if (!response.ok) {
              throw new Error(`Gemini trip_qa HTTP ${response.status}`);
            }
            const data = (await response.json()) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
            };
            const rawText = (data.candidates?.[0]?.content?.parts || [])
              .filter((p) => !p.thought && typeof p.text === 'string')
              .map((p) => p.text)
              .join('')
              .trim();
            return { rawText };
          }
        );

        const reply =
          llmOut.rawText && !hasElephantRidingViolation(llmOut.rawText)
            ? llmOut.rawText
            : deterministicReply;

        return {
          intent: 'general_qa',
          followUpAction: 'current_trip_qa',
          reply,
          shouldOpenPlanner: false,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: [],
          ...(tavilyCtx.citations.length > 0 ? { citations: tavilyCtx.citations } : {}),
          status: 'completed',
          provider: llmOut.rawText ? `gemini-ai:${model}` : 'local-fallback',
        };
      } catch {
        return {
          intent: 'general_qa',
          followUpAction: 'current_trip_qa',
          reply: deterministicReply,
          shouldOpenPlanner: false,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: [],
          ...(tavilyCtx.citations.length > 0 ? { citations: tavilyCtx.citations } : {}),
          status: 'completed',
          provider: 'local-fallback',
        };
      } finally {
        clearTimeout(timer);
      }
    }
  );
}

// ============================================================================
// Main Follow-Up Micro-Router entry point
// ============================================================================

export async function routeFollowUp(
  req: AiChatRequest,
  options?: FollowUpRouterOptions
): Promise<FollowUpRouteResult> {
  return withOpenInferenceSpan(
    'follow_up_router',
    {
      kind: OpenInferenceSpanKind.CHAIN,
      input: {
        message: req.message,
        daysCount: req.currentState.days.length,
        duration: req.currentState.duration,
      },
      formatOutput: (out) => ({
        followUpAction: out.followUpAction,
        handled: out.handled,
        classifierMethod: out.classifierMethod,
      }),
    },
    async () => {
      const fetchFn = options?.fetchFn ?? fetch;
      const { action, method } = await classifyFollowUpAction(req, options);

      if (action === 'full_replan') {
        return {
          followUpAction: 'full_replan',
          handled: false,
          classifierMethod: method,
        };
      }

      let response: AiChatResponse;
      switch (action) {
        case 'modify_stops':
          response = await handleModifyStopsFollowUp(req, fetchFn);
          break;
        case 'adjust_budget':
          response = await handleAdjustBudgetFollowUp(req);
          break;
        case 'swap_logistics':
          response = await handleSwapLogisticsFollowUp(req, options);
          break;
        case 'reorder_or_pace':
          response = await handleReorderOrPaceFollowUp(req);
          break;
        case 'current_trip_qa':
        default:
          response = await handleCurrentTripQaFollowUp(req, fetchFn, options);
          break;
      }

      return {
        followUpAction: action,
        handled: true,
        response,
        classifierMethod: method,
      };
    }
  );
}
