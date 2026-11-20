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
  GEMINI_MODEL,
  getTavilyApiKey,
} from '../../../config.ts';
import { withOpenInferenceSpan } from '../arizeTelemetry.ts';
import {
  searchGeneralQaWithTavily,
  type TavilyQaLookupStatus,
  type TavilySearchClient,
} from '../tavilyService.ts';
import { dakLakPlaceDirectory } from '../../../../src/data/places.ts';
import { budgetMultipliers, sampleSchedulePresets } from '../../../../src/data/plannerCatalog.ts';
import { seasonsData } from '../../../../src/data/seasons.ts';
import {
  type AccommodationRecord,
  type AiChatRequest,
  type AiCitation,
  type AiStopOperation,
  type AgenticIntent,
  type BudgetType,
  type CompanionType,
  type DurationType,
  type IntakeState,
  type Language,
  type LogisticsRecord,
  type QuickClarificationOption,
  type ThemeType,
} from '../../../../src/types/index.ts';
import {
  inferPlaceMetadata,
  listActiveLogistics,
  listActiveStays,
  listEnrichedPlaces,
} from '../plannerDataService.ts';
import { resolveSeasonFromDates } from './phase2Capacity.ts';

export interface Phase1IntakeOutput {
  intake: IntakeState;
  stopOperations: AiStopOperation[];
  generalQaReply?: string;
  citations?: AiCitation[];
  tavilySnippets?: Array<{ title: string; url: string; content: string }>;
  tavilyAnswer?: string;
  provider: string;
}

const VALID_THEMES: ThemeType[] = ['coffee', 'culture', 'nature', 'cuisine'];
const VALID_DURATIONS: DurationType[] = ['2N1D', '3N2D', '4N3D+'];
const VALID_COMPANIONS: CompanionType[] = ['solo', 'couple', 'family', 'friends'];
const VALID_BUDGETS: BudgetType[] = ['budget', 'standard', 'luxury'];

const DEFAULT_TRAVELERS_BY_COMPANION: Record<CompanionType, number> = {
  solo: 1,
  couple: 2,
  family: 4,
  friends: 4,
};

export function inferTravelersCountFromCompanion(
  companionType: CompanionType | null | undefined
): number | null {
  if (!companionType || !VALID_COMPANIONS.includes(companionType)) {
    return null;
  }
  return DEFAULT_TRAVELERS_BY_COMPANION[companionType];
}

export function buildClarificationOptions(
  lang: Language,
  missingFields: Array<'budget' | 'dates' | 'travelers'>
): QuickClarificationOption[] {
  const options: QuickClarificationOption[] = [];

  if (missingFields.includes('travelers')) {
    if (lang === 'en') {
      options.push(
        { field: 'travelers', label: 'Solo (1 traveler)', valueText: 'Solo trip (1 person)' },
        { field: 'travelers', label: 'Couple (2 travelers)', valueText: 'Couple (2 travelers)' },
        { field: 'travelers', label: 'Family (4 travelers)', valueText: 'Family of 4' },
        { field: 'travelers', label: 'Friends (4 travelers)', valueText: 'Group of 4 friends' }
      );
    } else {
      options.push(
        { field: 'travelers', label: 'Độc hành (1 người)', valueText: 'Đi 1 mình (độc hành)' },
        { field: 'travelers', label: 'Cặp đôi (2 người)', valueText: 'Cặp đôi 2 người' },
        { field: 'travelers', label: 'Gia đình (4 người)', valueText: 'Gia đình 4 người' },
        { field: 'travelers', label: 'Nhóm bạn (4 người)', valueText: 'Nhóm bạn 4 người' }
      );
    }
  }

  if (missingFields.includes('dates')) {
    if (lang === 'en') {
      options.push(
        { field: 'dates', label: '2D1N • Weekend', valueText: '2N1D weekend trip' },
        { field: 'dates', label: '3D2N • March (Coffee blossom)', valueText: '3N2D in March' },
        { field: 'dates', label: '3D2N • August (Waterfalls)', valueText: '3N2D in August' },
        { field: 'dates', label: '4D3N • November (Wildflowers)', valueText: '4N3D in November' }
      );
    } else {
      options.push(
        { field: 'dates', label: '2N1Đ • Cuối tuần', valueText: '2N1Đ' },
        { field: 'dates', label: '3N2Đ • Tháng 3 (Hoa cà phê)', valueText: '3N2Đ vào tháng 3' },
        { field: 'dates', label: '3N2Đ • Tháng 8 (Mùa thác)', valueText: '3N2Đ vào tháng 8' },
        { field: 'dates', label: '4N3Đ • Tháng 11 (Dã quỳ)', valueText: '4N3Đ vào tháng 11' }
      );
    }
  }

  if (missingFields.includes('budget')) {
    if (lang === 'en') {
      options.push(
        {
          field: 'budget',
          label: 'Budget (~3–4M VND)',
          valueText: 'Budget tier around 4 million VND',
        },
        {
          field: 'budget',
          label: 'Standard (~7–10M VND)',
          valueText: 'Standard tier around 8 million VND',
        },
        {
          field: 'budget',
          label: 'Luxury (~15M+ VND)',
          valueText: 'Luxury tier around 15 million VND',
        }
      );
    } else {
      options.push(
        {
          field: 'budget',
          label: 'Tiết kiệm (~3–4 triệu)',
          valueText: 'Ngân sách tiết kiệm khoảng 4 triệu',
        },
        {
          field: 'budget',
          label: 'Tiêu chuẩn (~7–10 triệu)',
          valueText: 'Ngân sách tiêu chuẩn khoảng 8 triệu',
        },
        {
          field: 'budget',
          label: 'Cao cấp (~15+ triệu)',
          valueText: 'Ngân sách cao cấp khoảng 15 triệu',
        }
      );
    }
  }

  return options;
}

function normalizeText(raw: string): string {
  return String(raw || '').trim();
}

export function extractBudgetVndFromText(rawText: string, travelersHint: number | null): {
  totalBudgetVnd: number | null;
  budgetTier: BudgetType | null;
  explicitMention: boolean;
} {
  const text = rawText.toLowerCase();
  let totalBudgetVnd: number | null = null;
  let budgetTier: BudgetType | null = null;
  let explicitMention = false;

  const isPerPerson = /(\/người|\/khách|mỗi người|1 người|per person|each|pp\b)/i.test(text);

  const millionMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr\b|million|m\b)/i);
  if (millionMatch) {
    const val = Number(millionMatch[1].replace(',', '.')) * 1_000_000;
    if (Number.isFinite(val) && val >= 300_000 && val <= 500_000_000) {
      totalBudgetVnd = Math.round(isPerPerson && travelersHint ? val * travelersHint : val);
      explicitMention = true;
    }
  }

  if (totalBudgetVnd === null) {
    const fullVndMatch = text.match(
      /(\d{1,3}(?:[.,]\d{3})+|\d{6,9})\s*(?:đồng|vnđ|vnd|đ)?(?=$|[^\p{L}\p{N}_])/iu
    );
    if (fullVndMatch) {
      const cleaned = Number(fullVndMatch[1].replace(/[.,]/g, ''));
      if (Number.isFinite(cleaned) && cleaned >= 300_000 && cleaned <= 500_000_000) {
        totalBudgetVnd = Math.round(isPerPerson && travelersHint ? cleaned * travelersHint : cleaned);
        explicitMention = true;
      }
    }
  }

  if (totalBudgetVnd === null) {
    const kMatch = text.match(/(\d{3,4})\s*k\b/i);
    if (kMatch) {
      const val = Number(kMatch[1]) * 1000;
      if (Number.isFinite(val) && val >= 300_000) {
        totalBudgetVnd = Math.round(isPerPerson && travelersHint ? val * travelersHint : val);
        explicitMention = true;
      }
    }
  }

  if (/(tiết kiệm|bình dân|sinh viên|giá rẻ|homestay|budget|low[- ]cost|cheap)/i.test(text)) {
    budgetTier = 'budget';
    explicitMention = true;
  } else if (/(cao cấp|nghỉ dưỡng|resort|5 sao|sang trọng|luxury|premium)/i.test(text)) {
    budgetTier = 'luxury';
    explicitMention = true;
  } else if (/(tiêu chuẩn|vừa phải|tầm trung|trung bình|standard|moderate|mid[- ]range)/i.test(text)) {
    budgetTier = 'standard';
    explicitMention = true;
  }

  if (totalBudgetVnd !== null && budgetTier === null) {
    const perDay = totalBudgetVnd / (3 * (travelersHint || 2));
    if (perDay < budgetMultipliers.budget.perDay * 1.15) {
      budgetTier = 'budget';
    } else if (perDay >= budgetMultipliers.luxury.perDay * 0.85) {
      budgetTier = 'luxury';
    } else {
      budgetTier = 'standard';
    }
  }

  return { totalBudgetVnd, budgetTier, explicitMention };
}

export function extractTravelersFromText(rawText: string): {
  travelersCount: number | null;
  companionType: CompanionType | null;
  explicitMention: boolean;
} {
  const text = rawText.toLowerCase();
  let travelersCount: number | null = null;
  let companionType: CompanionType | null = null;
  let explicitMention = false;

  const countMatch = text.match(
    /(\d+)\s*(?:người|khách|bạn|thành viên|người lớn|adults?|people|persons?|travelers?|guests?|pax)\b/i
  );
  if (countMatch) {
    const n = Number(countMatch[1]);
    if (Number.isInteger(n) && n >= 1 && n <= 30) {
      travelersCount = n;
      explicitMention = true;
    }
  } else {
    const wordNumMap: Record<string, number> = {
      một: 1,
      hai: 2,
      ba: 3,
      bốn: 4,
      năm: 5,
      sáu: 6,
      bảy: 7,
      tám: 8,
    };
    const wordMatch = text.match(
      /\b(một|hai|ba|bốn|năm|sáu|bảy|tám)\s+(?:người|khách|bạn|thành viên)\b/i
    );
    if (wordMatch) {
      travelersCount = wordNumMap[wordMatch[1].toLowerCase()] ?? null;
      if (travelersCount !== null) explicitMention = true;
    }
  }

  if (/(độc hành|một mình|1 mình|đi riêng|solo)/i.test(text)) {
    companionType = 'solo';
    if (travelersCount === null) travelersCount = 1;
    explicitMention = true;
  } else if (/(gia đình|bố mẹ|trẻ nhỏ|con nhỏ|ông bà|family|kids|children)/i.test(text)) {
    companionType = 'family';
    if (travelersCount === null) travelersCount = 4;
    explicitMention = true;
  } else if (/(nhóm bạn|bạn bè|hội bạn|team|friends|group)/i.test(text)) {
    companionType = 'friends';
    if (travelersCount === null) travelersCount = 4;
    explicitMention = true;
  } else if (/(cặp đôi|người yêu|vợ chồng|lãng mạn|honeymoon|couple)/i.test(text)) {
    companionType = 'couple';
    if (travelersCount === null) travelersCount = 2;
    explicitMention = true;
  } else if (travelersCount === 1) {
    companionType = 'solo';
  } else if (travelersCount === 2) {
    companionType = 'couple';
  } else if (travelersCount !== null && travelersCount >= 3) {
    companionType = 'friends';
  }

  return { travelersCount, companionType, explicitMention };
}

export function extractDatesAndDurationFromText(rawText: string): {
  travelDates: string | null;
  duration: DurationType | null;
  explicitMention: boolean;
} {
  const text = rawText.toLowerCase();
  let duration: DurationType | null = null;
  const dateHints: string[] = [];

  if (/(2n1[đd]|2\s*ngày|2d1n|2\s*days?|cuối tuần|weekend)/i.test(text)) {
    duration = '2N1D';
    dateHints.push('2N1D');
  } else if (/(4n3[đd]|4\s*ngày|5\s*ngày|4d3n|4\s*days?|5\s*days?|dài ngày)/i.test(text)) {
    duration = '4N3D+';
    dateHints.push('4N3D+');
  } else if (/(3n2[đd]|3\s*ngày|3d2n|3\s*days?)/i.test(text)) {
    duration = '3N2D';
    dateHints.push('3N2D');
  }

  const viMonthMatch = text.match(/tháng\s*(1[0-2]|[1-9])\b/i);
  const shortMonthMatch = text.match(/\bt(1[0-2]|[1-9])\b/i);
  const enMonthMatch = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i
  );
  const dateRangeMatch = text.match(/\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/);
  const seasonKeywordMatch = text.match(
    /(mùa hoa cà phê|mùa mưa|mùa khô|mùa dã quỳ|mùa thu hoạch|dịp lễ|tết|mùa xuân|mùa hạ|mùa thu|mùa đông|harvest season|waterfall season)/i
  );

  if (viMonthMatch) dateHints.push(`Tháng ${viMonthMatch[1]}`);
  else if (shortMonthMatch) dateHints.push(`Tháng ${shortMonthMatch[1]}`);
  else if (enMonthMatch) dateHints.push(enMonthMatch[1]);

  if (dateRangeMatch) dateHints.push(dateRangeMatch[1]);
  if (seasonKeywordMatch) dateHints.push(seasonKeywordMatch[1]);

  const uniqueHints = Array.from(new Set(dateHints));
  return {
    travelDates: uniqueHints.length > 0 ? uniqueHints.join(' • ') : null,
    duration,
    explicitMention: uniqueHints.length > 0,
  };
}

export function extractPurposeFromText(
  rawText: string,
  fallbackTheme: ThemeType
): { mainPurpose: ThemeType; secondaryInterests: string[] } {
  const text = rawText.toLowerCase();
  const scores: Record<ThemeType, number> = {
    coffee: 0,
    culture: 0,
    nature: 0,
    cuisine: 0,
  };
  const interests: string[] = [];

  if (/(cà phê|coffee|robusta|cupping|nông trại|ea tân|trung nguyên)/i.test(text)) {
    scores.coffee += 3;
    interests.push('cà phê đặc sản');
  }
  if (/(văn hóa|cồng chiêng|nhà dài|mẫu hệ|thổ cẩm|gốm|di sản|ako dhông|bảo tàng|culture|heritage)/i.test(text)) {
    scores.culture += 3;
    interests.push('di sản bản địa');
  }
  if (/(thác|dray nur|yok đôn|rừng|trekking|thiên nhiên|chèo sup|độc mộc|voi|hồ lắk|đá voi|waterfall|nature)/i.test(text)) {
    scores.nature += 3;
    interests.push('thiên nhiên & thác');
  }
  if (/(ẩm thực|ăn uống|món ăn|food|cuisine|bún đỏ|bún chìa|gà nướng|cơm lam|cá lăng|bánh ướt|lá bép)/i.test(text)) {
    scores.cuisine += 3;
    interests.push('ẩm thực bản địa');
  }

  let bestTheme: ThemeType = fallbackTheme;
  let bestScore = 0;
  for (const theme of VALID_THEMES) {
    if (scores[theme] > bestScore) {
      bestScore = scores[theme];
      bestTheme = theme;
    }
  }

  return { mainPurpose: bestTheme, secondaryInterests: interests };
}

function buildClarificationQuestion(
  lang: Language,
  missingFields: Array<'budget' | 'dates' | 'travelers'>
): string {
  if (lang === 'en') {
    const parts: string[] = [];
    if (missingFields.includes('travelers')) parts.push('how many travelers / group type (solo, couple, family, friends)');
    if (missingFields.includes('dates')) parts.push('your travel dates or trip length (e.g., 2N1D, 3N2D, month)');
    if (missingFields.includes('budget')) parts.push('your estimated budget (in VND or budget/standard/luxury tier)');
    return `To tailor an accurate Đắk Lắk itinerary for you, could you share ${parts.join(', ')}? Or pick one of the preset plans below to start right away.`;
  }

  const parts: string[] = [];
  if (missingFields.includes('travelers')) parts.push('số lượng người đi (độc hành, cặp đôi, gia đình hay nhóm bạn)');
  if (missingFields.includes('dates')) parts.push('thời gian dự kiến hoặc số ngày (ví dụ 2N1Đ, 3N2Đ, tháng mấy)');
  if (missingFields.includes('budget')) parts.push('ngân sách dự kiến (ví dụ 4–6 triệu hoặc mức Tiết kiệm / Tiêu chuẩn / Cao cấp)');
  return `Để mình thiết kế lịch trình Đắk Lắk chuẩn xác và sát chi phí thực tế, bạn cho mình biết thêm: ${parts.join('; ')} nhé! Hoặc bạn có thể chọn nhanh một gợi ý lịch trình bên dưới.`;
}

export function foldVietnamese(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

const QUESTION_OR_INFO_REGEX =
  /(\?|có\s+[^\n.!?]{1,60}\s+(?:không|ko|k|chưa|nào)(?=$|[^\p{L}\p{N}_])|(?:được|đúng|phải|hay|ngon|đẹp|ổn|an toàn|tiện|kịp|đắt|rẻ|xa|gần)\s+(?:không|ko|chưa)(?=$|[^\p{L}\p{N}_])|bao nhiêu|bao xa|bao lâu|mấy giờ|giờ mở cửa|giờ đóng cửa|mấy km|xa không|ở đâu|địa chỉ|chỗ nào|nơi nào|quán nào|nhà hàng nào|khách sạn nào|homestay nào|resort nào|xe nào|hãng nào|đường nào|món nào|loại nào|khi nào|lúc nào|ngày nào|tại sao|vì sao|sao lại|là gì|nghĩa là gì|ăn gì|uống gì|chơi gì|mua gì|xem gì|quà gì|cần\s+(?:giấy tờ|thủ tục|chuẩn bị|mang|lưu ý)?\s*gì|giấy tờ gì|lưu ý gì|kinh nghiệm|thế nào|ra sao|như thế nào|có gì|nên ăn|nên ở|có nên|làm sao|mặc gì|review|đánh giá|gợi ý|giới thiệu|kể tên|liệt kê|thông tin về|cho hỏi|cho mình hỏi|cho biết|muốn biết|xin thêm|hỏi\s+(?:chút|thêm|về)|liệu\s+có|tiện ích|hồ bơi|bể bơi|bữa sáng|giá phòng|giá vé|giá thuê|1\s*đêm|mỗi đêm|thời tiết|khí hậu|dự báo|mùa nào|tháng mấy|lễ hội|văn hóa|lịch sử|đặc sản|sân bay|vé máy bay|xe khách|taxi|what|when|where|which|who|how|why|does\s+.*\s+have|is\s+there|are\s+there|can\s+(?:i|we|you)|should\s+(?:i|we)|do\s+(?:i|we)\s+need|is\s+it|how much|how far|how long|opening hours|amenities|pool|weather|season|tips|tell me|explain|recommend|suggest|info about|information on)/iu;

const PRIMARY_AMENITY_OR_INFO_QUESTION_REGEX =
  /(\?|có\s+[^\n.!?]{1,60}\s+(?:không|ko|k|chưa)(?=$|[^\p{L}\p{N}_])|(?:được|đúng|phải|hay|ngon|đẹp|ổn|an toàn|tiện|kịp|đắt|rẻ|xa|gần)\s+(?:không|ko|chưa)(?=$|[^\p{L}\p{N}_])|bao nhiêu|bao xa|bao lâu|mấy giờ|giờ mở cửa|giờ đóng cửa|ở đâu|địa chỉ|chỗ nào|nơi nào|quán nào|nhà hàng nào|khách sạn nào|homestay nào|resort nào|xe nào|hãng nào|khi nào|lúc nào|tại sao|vì sao|là gì|ăn gì|uống gì|chơi gì|mua gì|cần\s+(?:giấy tờ|thủ tục|chuẩn bị|mang|lưu ý)?\s*gì|giấy tờ gì|lưu ý gì|kinh nghiệm|thế nào|ra sao|như thế nào|có nên|làm sao|review|đánh giá|giới thiệu|kể tên|thông tin về|muốn biết|xin thêm|cho hỏi|cho mình hỏi|tiện ích|hồ bơi|bể bơi|giá phòng|giá vé|giá thuê|1\s*đêm|mỗi đêm|thời tiết|dự báo|mùa nào|tháng mấy|lễ hội|sân bay|vé máy bay|xe khách|taxi|what|when|where|which|who|how|why|how much|how far|does\s+.*\s+have|is\s+there|are\s+there|can\s+(?:i|we)|should\s+(?:i|we)|amenities|pool|opening hours|weather|tell me|explain)/iu;

export function isQuestionOrInfoRequest(text: string): boolean {
  const lower = String(text || '').toLowerCase().trim();
  if (!lower) return false;
  return QUESTION_OR_INFO_REGEX.test(lower) || /\btư vấn\b/i.test(lower);
}

export function isPrimaryAmenityOrInfoQuestion(text: string): boolean {
  const lower = String(text || '').toLowerCase().trim();
  if (!lower) return false;
  return PRIMARY_AMENITY_OR_INFO_QUESTION_REGEX.test(lower);
}

export interface GroundedQaContext {
  stays: Array<{
    name: string;
    area: string;
    tier: BudgetType;
    nightlyRateVnd: number;
    capacityMin: number;
    capacityMax: number;
    amenities: string[];
    sourceNote?: string;
  }>;
  logistics: Array<{
    mode: string;
    label: string;
    tier: BudgetType;
    dailyRateVnd: number;
    capacityMin: number;
    capacityMax: number;
    notes: string;
  }>;
  places: Array<{
    title: string;
    location: string;
    category: string;
    areaCluster: string;
    time: string;
    period: string;
    duration: string;
    rating: string;
    ticketVnd: number;
    estimatedSpendVnd: number;
    priceNote?: string;
    desc: string;
  }>;
  seasons: Array<{
    milestone: string;
    headline: string;
    subheadline: string;
    description: string;
  }>;
}

export async function loadGroundedQaContext(options?: {
  stays?: AccommodationRecord[];
  logistics?: LogisticsRecord[];
}): Promise<GroundedQaContext> {
  let rawStays: AccommodationRecord[] = options?.stays ?? [];
  if (!options?.stays) {
    try {
      rawStays = await listActiveStays();
    } catch {
      rawStays = [];
    }
  }

  let rawLogistics: LogisticsRecord[] = options?.logistics ?? [];
  if (!options?.logistics) {
    try {
      rawLogistics = await listActiveLogistics();
    } catch {
      rawLogistics = [];
    }
  }

  let places: GroundedQaContext['places'] = [];
  try {
    places = (await listEnrichedPlaces()).map((p) => ({
      title: p.title,
      location: p.location,
      category: p.meta.category,
      areaCluster: p.areaCluster,
      time: p.meta.time,
      period: p.meta.period,
      duration: p.meta.duration,
      rating: p.meta.rating,
      ticketVnd: p.ticketVnd,
      estimatedSpendVnd: p.estimatedSpendVnd,
      priceNote: p.priceNote,
      desc: p.meta.desc,
    }));
  } catch {
    places = dakLakPlaceDirectory.map((meta) => {
      const inferred = inferPlaceMetadata(meta);
      return {
        title: meta.title,
        location: meta.location,
        category: meta.category,
        areaCluster: inferred.areaCluster,
        time: meta.time,
        period: meta.period,
        duration: meta.duration,
        rating: meta.rating,
        ticketVnd: inferred.defaultTicketVnd,
        estimatedSpendVnd: inferred.defaultEstimatedSpendVnd,
        desc: meta.desc,
      };
    });
  }

  return {
    stays: rawStays.map((s) => ({
      name: s.name,
      area: s.area,
      tier: s.tier,
      nightlyRateVnd: s.nightlyRateVnd,
      capacityMin: s.capacityMin,
      capacityMax: s.capacityMax,
      amenities: s.amenities,
      ...(s.sourceNote ? { sourceNote: s.sourceNote } : {}),
    })),
    logistics: rawLogistics.map((l) => ({
      mode: l.mode,
      label: l.label,
      tier: l.tier,
      dailyRateVnd: l.dailyRateVnd,
      capacityMin: l.capacityMin,
      capacityMax: l.capacityMax,
      notes: l.notes,
    })),
    places,
    seasons: seasonsData.map((s) => ({
      milestone: s.milestone,
      headline: s.headline,
      subheadline: s.subheadline,
      description: s.description,
    })),
  };
}

export async function maybeFetchTavilyQaContext(
  queryText: string,
  options?: {
    enableTavily?: boolean;
    tavilyClient?: TavilySearchClient;
    timeoutMs?: number;
  }
): Promise<{
  answer?: string;
  snippets: Array<{ title: string; url: string; content: string }>;
  citations: AiCitation[];
  status?: TavilyQaLookupStatus;
  error?: string;
}> {
  if (options?.enableTavily === false) {
    return { snippets: [], citations: [], status: 'disabled' };
  }
  const apiKey = getTavilyApiKey();
  if (!apiKey && !options?.tavilyClient) {
    return {
      snippets: [],
      citations: [],
      status: 'missing_api_key',
      error: 'TAVILY_API_KEY is not configured',
    };
  }

  const trimmed = String(queryText || '').trim();
  if (trimmed.length < 3) {
    return { snippets: [], citations: [], status: 'empty_query' };
  }

  const folded = foldVietnamese(trimmed);
  const needsExternalCheck =
    isQuestionOrInfoRequest(trimmed) ||
    isPrimaryAmenityOrInfoQuestion(trimmed) ||
    /(ho boi|be boi|pool|wifi|an sang|giay to|thu tuc|bang lai|mo cua|dong cua|gia ve|gia phong|1 dem|review|thue xe|thue thuyen|thoi tiet|du bao|le hoi|san bay|may bay|xe khach|limousine|taxi|khach san|homestay|resort|quan an|nha hang|ca phe|dac san|van hoa|lich su|dia chi|o dau|bao xa|kinh nghiem|kotam|ko tam|buon don|ban don|ho lak|buon jun|chu yang sin|ea kao|khai doan|weather|flight|airport|bus|hotel|restaurant|cafe|festival|history|culture)/i.test(
      folded
    );
  if (!needsExternalCheck) {
    return { snippets: [], citations: [], status: 'disabled' };
  }

  const res = await searchGeneralQaWithTavily(trimmed, {
    enableTavily: options?.enableTavily,
    tavilyClient: options?.tavilyClient,
    timeoutMs: options?.timeoutMs,
  });

  return {
    ...(res.answer ? { answer: res.answer } : {}),
    snippets: res.snippets,
    citations: res.citations,
    ...(res.status ? { status: res.status } : {}),
    ...(res.error ? { error: res.error } : {}),
  };
}

interface AmenityMatcher {
  key: string;
  labelVi: string;
  labelEn: string;
  patterns: string[];
}

const AMENITY_MATCHERS: AmenityMatcher[] = [
  {
    key: 'pool',
    labelVi: 'hồ bơi',
    labelEn: 'swimming pool',
    patterns: ['ho boi', 'be boi', 'swimming pool', 'pool'],
  },
  {
    key: 'breakfast',
    labelVi: 'bữa sáng / buffet sáng',
    labelEn: 'breakfast',
    patterns: ['an sang', 'buffet', 'breakfast'],
  },
  {
    key: 'wifi',
    labelVi: 'Wi-Fi',
    labelEn: 'Wi-Fi',
    patterns: ['wifi', 'wi-fi', 'internet'],
  },
  {
    key: 'spa',
    labelVi: 'spa',
    labelEn: 'spa',
    patterns: ['spa', 'massage', 'thao moc'],
  },
  {
    key: 'shuttle',
    labelVi: 'đưa đón sân bay',
    labelEn: 'airport shuttle',
    patterns: ['dua don', 'san bay', 'shuttle', 'airport'],
  },
  {
    key: 'boat',
    labelVi: 'chèo kayak / thuyền',
    labelEn: 'kayak / boat',
    patterns: ['kayak', 'thuyen', 'doc moc'],
  },
  {
    key: 'kitchen',
    labelVi: 'bếp chung',
    labelEn: 'shared kitchen',
    patterns: ['bep', 'nau an', 'kitchen'],
  },
  {
    key: 'motorbike',
    labelVi: 'hỗ trợ thuê xe máy',
    labelEn: 'motorbike rental',
    patterns: ['thue xe may'],
  },
];

const STAY_STOPWORDS = new Set([
  'homestay',
  'hotel',
  'khach',
  'san',
  'resort',
  'villa',
  'bungalow',
  'buon',
  'ma',
  'thuot',
  'bmt',
  'tai',
  'o',
  'va',
  '&',
]);

function findMatchedStaysInText(
  foldedMsg: string,
  stays: GroundedQaContext['stays']
): GroundedQaContext['stays'] {
  const exact = stays.filter((s) => foldedMsg.includes(foldVietnamese(s.name)));
  if (exact.length > 0) return exact;

  const scored = stays
    .map((s) => {
      const foldedName = foldVietnamese(s.name);
      const tokens = foldedName
        .split(/[\s\-&,/]+/)
        .filter((t) => t.length >= 3 && !STAY_STOPWORDS.has(t));
      const matchedTokens = tokens.filter((t) => foldedMsg.includes(t));
      let score = matchedTokens.length;
      if (foldedMsg.includes('ako dhong') && foldedName.includes('ako dhong')) score += 3;
      if (foldedMsg.includes('lak tented') && foldedName.includes('lak tented')) score += 3;
      if (foldedMsg.includes('elephants') && foldedName.includes('elephants')) score += 3;
      if (foldedMsg.includes('muong thanh') && foldedName.includes('muong thanh')) score += 3;
      if (foldedMsg.includes('zan') && foldedName.includes('zan')) score += 3;
      if (foldedMsg.includes('eco-resort') && foldedName.includes('eco-resort')) score += 3;
      return { stay: s, score };
    })
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score);

  return scored.map((x) => x.stay);
}

function findMatchedPlaceInText(
  foldedMsg: string,
  places: GroundedQaContext['places']
): GroundedQaContext['places'][number] | null {
  for (const p of places) {
    if (foldedMsg.includes(foldVietnamese(p.title))) return p;
  }
  const aliasKeywords: Array<{ kw: string; title: string }> = [
    { kw: 'bao tang the gioi ca phe', title: 'Bảo tàng Thế giới Cà phê' },
    { kw: 'the gioi ca phe', title: 'Bảo tàng Thế giới Cà phê' },
    { kw: 'lang ca phe trung nguyen', title: 'Làng Cà phê Trung Nguyên' },
    { kw: 'trung nguyen', title: 'Làng Cà phê Trung Nguyên' },
    { kw: 'ako dhong', title: 'Buôn cổ Ako Dhông' },
    { kw: 'bao tang dak lak', title: 'Bảo tàng Đắk Lắk' },
    { kw: 'ea tan', title: 'Nông trại Cà phê Ea Tân' },
    { kw: 'da voi me', title: 'Đá Voi Mẹ Yang Tao' },
    { kw: 'yang tao', title: 'Đá Voi Mẹ Yang Tao' },
    { kw: 'ho lak', title: 'Hồ Lắk & Buôn Jun' },
    { kw: 'buon jun', title: 'Hồ Lắk & Buôn Jun' },
    { kw: 'biet dien bao dai', title: 'Đồi Biệt điện Bảo Đại' },
    { kw: 'dray nur', title: 'Thác Dray Nur Hùng Vĩ' },
    { kw: 'yok don', title: 'Vườn Quốc gia Yok Đôn' },
    { kw: 'tong ju', title: 'Làng Dệt Thổ Cẩm Tơng Jú' },
    { kw: 'phan dinh giot', title: 'Phố Ẩm thực Phan Đình Giót' },
    { kw: 'ban don', title: 'Cầu Treo Sêrêpốk Bản Đôn' },
    { kw: 'serepok', title: 'Cầu Treo Sêrêpốk Bản Đôn' },
  ];
  for (const alias of aliasKeywords) {
    if (foldedMsg.includes(alias.kw)) {
      const found = places.find((p) => p.title === alias.title);
      if (found) return found;
    }
  }
  return null;
}

export function isLikelyEnglishText(text: string): boolean {
  const cleaned = String(text || '').trim();
  if (!cleaned) return false;
  const hasVietnameseDiacritics =
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
      cleaned
    );
  const englishSignals =
    cleaned.match(
      /\b(the|and|that|with|from|which|they|does|have|indicate|available|including|however|specific|whether|therefore|sources|information|according|based|there|about|provide|around)\b/gi
    ) || [];
  if (englishSignals.length >= 3) return true;
  if (!hasVietnameseDiacritics && englishSignals.length >= 1) return true;
  return false;
}

export function resolveEffectiveQaLanguage(message: string, uiLang: Language): Language {
  const cleaned = String(message || '').trim();
  if (!cleaned) return uiLang;
  const hasVietnameseDiacritics =
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
      cleaned
    );
  if (hasVietnameseDiacritics) return 'vi';
  const folded = foldVietnamese(cleaned);
  if (
    /\b(khong|bao nhieu|o dau|khi nao|nhu the nao|co nen|giay to|le hoi|cong chieng|buon|thac|homestay|khach san|gia ve|thue thuyen|thue xe)\b/i.test(
      folded
    )
  ) {
    return 'vi';
  }
  return uiLang;
}

function buildTavilyReferenceText(
  isEn: boolean,
  tavilyAnswer?: string,
  tavilySnippets?: Array<{ title: string; url: string; content: string }>
): string {
  const cleanAnswer =
    typeof tavilyAnswer === 'string' && tavilyAnswer.trim() ? tavilyAnswer.trim() : '';
  const validSnippets = (tavilySnippets || []).filter(
    (s) => typeof s?.content === 'string' && s.content.trim().length > 0
  );

  if (isEn) {
    if (cleanAnswer) {
      return `\n\n**Live web summary:**\n- ${cleanAnswer}`;
    }
    if (validSnippets.length > 0) {
      const bullets = validSnippets
        .slice(0, 2)
        .map((s) => `- **${s.title}**: ${s.content}`)
        .join('\n');
      return `\n\n**Live web references:**\n${bullets}`;
    }
    return '';
  }

  // Vietnamese output: NEVER leak raw English Tavily answers verbatim
  if (cleanAnswer && !isLikelyEnglishText(cleanAnswer)) {
    return `\n\n**Thông tin cập nhật trực tuyến:**\n- ${cleanAnswer}`;
  }

  const vietnameseSnippets = validSnippets.filter((s) => !isLikelyEnglishText(s.content));
  if (vietnameseSnippets.length > 0) {
    const bullets = vietnameseSnippets
      .slice(0, 2)
      .map((s) => `- **${s.title}**: ${s.content}`)
      .join('\n');
    return `\n\n**Thông tin tham khảo trực tuyến:**\n${bullets}`;
  }

  return '';
}

/**
 * Deterministic grounded Q&A answerer backed by active SQLite `stays`, `logistics`,
 * `dakLakPlaceDirectory`, `seasonsData`, active `currentState.days`, and optional Tavily snippets.
 */
export async function buildGroundedQaReplyDeterministic(
  req: AiChatRequest,
  options?: {
    stays?: AccommodationRecord[];
    logistics?: LogisticsRecord[];
    tavilySnippets?: Array<{ title: string; url: string; content: string }>;
    tavilyAnswer?: string;
  }
): Promise<string> {
  const ctx = await loadGroundedQaContext(options);
  const lower = req.message.toLowerCase();
  const folded = foldVietnamese(req.message);
  const days = req.currentState.days;
  const effectiveLang = resolveEffectiveQaLanguage(req.message, req.lang);
  const isEn = effectiveLang === 'en';
  const tavilyRef = buildTavilyReferenceText(isEn, options?.tavilyAnswer, options?.tavilySnippets);

  const hasExplicitStayIntent =
    /(homestay|khach san|hotel|resort|bungalow|villa|luu tru|cho o|noi o|phong o|dat phong|gia phong|1 dem|moi dem|ho boi|be boi|pool|tien ich|amenities|check-in|check-out)/i.test(
      folded
    );
  const rawMatchedStays = findMatchedStaysInText(folded, ctx.stays);
  const matchedStays = hasExplicitStayIntent
    ? rawMatchedStays
    : rawMatchedStays.filter((s) => folded.includes(foldVietnamese(s.name)));
  const requestedAmenity = AMENITY_MATCHERS.find((m) =>
    m.patterns.some((pat) => folded.includes(pat))
  );
  const isStayQuery = matchedStays.length > 0 || hasExplicitStayIntent;

  // 1. Stay / Accommodation / Amenity Q&A
  if (isStayQuery && ctx.stays.length > 0) {
    if (matchedStays.length > 0) {
      const stay = matchedStays[0];
      const rateStr = isEn
        ? `~${stay.nightlyRateVnd.toLocaleString('en-US')} VND/night`
        : `~${stay.nightlyRateVnd.toLocaleString('vi-VN')}đ/đêm`;
      const amenitiesStr = stay.amenities.join(', ');

      if (requestedAmenity) {
        const hasAmenity = stay.amenities.some((a) =>
          requestedAmenity.patterns.some((pat) => foldVietnamese(a).includes(pat))
        );
        const matchingAlternatives = ctx.stays.filter(
          (other) =>
            other.name !== stay.name &&
            other.amenities.some((a) =>
              requestedAmenity.patterns.some((pat) => foldVietnamese(a).includes(pat))
            )
        );
        const wantsHomestay = /\bhomestay\b/i.test(folded);

        if (hasAmenity) {
          return isEn
            ? `Yes — in our dataset, **${stay.name}** (${stay.area}, ${stay.tier} tier, ${rateStr}, capacity ${stay.capacityMin}–${stay.capacityMax} guests) lists **${requestedAmenity.labelEn}**. Listed amenities: ${amenitiesStr}.${stay.sourceNote ? ` (${stay.sourceNote})` : ''}${tavilyRef ? ` ${tavilyRef}` : ''}`
            : `Có bạn nhé — trong dữ liệu hiện có, **${stay.name}** (khu vực ${stay.area}, hạng ${stay.tier}, giá tham khảo ${rateStr}, sức chứa ${stay.capacityMin}–${stay.capacityMax} khách) có liệt kê tiện ích liên quan đến **${requestedAmenity.labelVi}**. Danh sách tiện ích ghi nhận: ${amenitiesStr}.${stay.sourceNote ? ` (${stay.sourceNote})` : ''}${tavilyRef ? ` ${tavilyRef}` : ''}`;
        }

        const altText =
          matchingAlternatives.length > 0
            ? isEn
              ? ` If you need a ${requestedAmenity.labelEn}, stays in our dataset that explicitly list it are: ${matchingAlternatives
                  .map(
                    (a) =>
                      `${a.name} (${a.area}, ~${a.nightlyRateVnd.toLocaleString('en-US')} VND/night — ${a.amenities.join(', ')})`
                  )
                  .join('; ')}.${
                  wantsHomestay
                    ? ' Note that the homestays in our current dataset do not list a swimming pool.'
                    : ''
                }`
              : ` Nếu bạn ưu tiên có **${requestedAmenity.labelVi}**, trong dữ liệu hiện có các cơ sở lưu trú liệt kê rõ tiện ích này là: ${matchingAlternatives
                  .map(
                    (a) =>
                      `**${a.name}** (${a.area}, ~${a.nightlyRateVnd.toLocaleString('vi-VN')}đ/đêm — ${a.amenities.join(', ')})`
                  )
                  .join('; ')}.${
                  wantsHomestay
                    ? ' Lưu ý: các homestay trong dữ liệu hiện tại của hệ thống đều chưa ghi nhận có hồ bơi.'
                    : ''
                }`
            : '';

        const tavilyNote = tavilyRef ? ` ${tavilyRef}` : '';

        const noMutationHint =
          days.length > 0
            ? isEn
              ? ' (Your current itinerary was not modified — tell me e.g. "Đổi sang Elephants Hotel" if you want to update your stay.)'
              : ' (Lịch trình hiện tại của bạn vẫn được giữ nguyên — nếu muốn đổi nơi ở, bạn hãy nhắn cụ thể ví dụ "Đổi sang Elephants Hotel" nhé.)'
            : '';

        return isEn
          ? `In our current dataset, **${stay.name}** (${stay.area}, ${stay.tier} tier, ${rateStr}) does **not** list or confirm **${requestedAmenity.labelEn}**. Its listed amenities are: ${amenitiesStr}.${altText}${tavilyNote}${noMutationHint}`
          : `Trong dữ liệu hiện có của hệ thống, **${stay.name}** (khu vực ${stay.area}, hạng ${stay.tier}, giá tham khảo ${rateStr}${stay.sourceNote ? ` — ${stay.sourceNote}` : ''}) **chưa ghi nhận / không liệt kê tiện ích ${requestedAmenity.labelVi}**. Các tiện ích hiện có của nơi này gồm: ${amenitiesStr}.${altText}${tavilyNote}${noMutationHint}`;
      }

      return isEn
        ? `**${stay.name}** (${stay.area}, ${stay.tier} tier)\n- **Reference rate:** ${rateStr} (${stay.capacityMin}–${stay.capacityMax} guests)\n- **Listed amenities:** ${amenitiesStr}${stay.sourceNote ? `\n- **Note:** ${stay.sourceNote}` : ''}${tavilyRef}`
        : `**${stay.name}** (khu vực ${stay.area}, hạng ${stay.tier})\n- **Giá tham khảo:** ${rateStr} (phù hợp ${stay.capacityMin}–${stay.capacityMax} khách)\n- **Tiện ích ghi nhận:** ${amenitiesStr}${stay.sourceNote ? `\n- **Ghi chú:** ${stay.sourceNote}` : ''}${tavilyRef}`;
    }

    // General stay / amenity question without a specific stay name
    if (requestedAmenity) {
      const matchingStays = ctx.stays.filter((s) =>
        s.amenities.some((a) =>
          requestedAmenity.patterns.some((pat) => foldVietnamese(a).includes(pat))
        )
      );
      const wantsHomestay = /\bhomestay\b/i.test(folded);
      if (matchingStays.length > 0) {
        const listStr = matchingStays
          .map((s) =>
            isEn
              ? `${s.name} (${s.area}, ~${s.nightlyRateVnd.toLocaleString('en-US')} VND/night — ${s.amenities.join(', ')})`
              : `**${s.name}** (${s.area}, ~${s.nightlyRateVnd.toLocaleString('vi-VN')}đ/đêm — ${s.amenities.join(', ')})`
          )
          .join('; ');
        const homestayCaveat =
          wantsHomestay && !matchingStays.some((s) => /homestay/i.test(s.name))
            ? isEn
              ? 'Our current dataset does not list any homestay with a swimming pool; however, the following local hotels list one: '
              : 'Trong dữ liệu hiện tại chưa có homestay nào ghi nhận tiện ích hồ bơi; tuy nhiên bạn có thể tham khảo các khách sạn tại BMT có ghi nhận hồ bơi: '
            : isEn
              ? `Stays in our dataset listing ${requestedAmenity.labelEn}: `
              : `Các cơ sở lưu trú trong dữ liệu có ghi nhận **${requestedAmenity.labelVi}**: `;
        return `${homestayCaveat}${listStr}.${tavilyRef ? ` ${tavilyRef}` : ''}`;
      }
    }

    const staysSummary = ctx.stays
      .map((s) =>
        isEn
          ? `${s.name} (${s.area}, ${s.tier}, ~${s.nightlyRateVnd.toLocaleString('en-US')} VND/night: ${s.amenities.join(', ')})`
          : `**${s.name}** (${s.area}, ~${s.nightlyRateVnd.toLocaleString('vi-VN')}đ/đêm: ${s.amenities.join(', ')})`
      )
      .join('; ');
    if (tavilyRef) {
      return isEn
        ? `${tavilyRef} In our local Đắk Lắk accommodation catalog, you can also compare: ${staysSummary}.`
        : `${tavilyRef} Ngoài ra, các lựa chọn lưu trú tham khảo tại Đắk Lắk trong hệ thống gồm: ${staysSummary}.`;
    }
    return isEn
      ? `Here are the accommodations in our Đắk Lắk dataset: ${staysSummary}.`
      : `Các lựa chọn lưu trú tham khảo tại Đắk Lắk trong dữ liệu hiện có gồm: ${staysSummary}.`;
  }

  // 2. Logistics / Transport / Airport / Intercity Q&A
  const isAirportOrIntercityQuery =
    /(san bay|may bay|ve may bay|xe khach|limousine|ben xe|tu sai gon|tu tphcm|tu ha noi|airport|flight|sleeper bus)/i.test(
      folded
    );
  if (isAirportOrIntercityQuery) {
    const baseAirportInfo = isEn
      ? 'Buôn Ma Thuột Airport (BMV) is located in Hòa Thắng commune, ~8–10 km east of the city center along National Highway 27 (~15–20 minutes by taxi or Grab, costing ~120,000–180,000 VND). Direct flights operate daily from Ho Chi Minh City (SGN) and Hanoi (HAN). By road, sleeper buses and limousines from Ho Chi Minh City take ~7–8 hours via National Highway 14.'
      : 'Sân bay Buôn Ma Thuột (BMV) nằm tại xã Hòa Thắng, cách trung tâm thành phố khoảng 8–10 km theo trục Quốc lộ 27 (di chuyển bằng taxi hoặc Grab mất 15–20 phút, chi phí khoảng 120.000đ–180.000đ). Hiện có các đường bay thẳng hàng ngày từ TP.HCM và Hà Nội. Nếu đi đường bộ từ TP.HCM, xe giường nằm hoặc limousine theo Quốc lộ 14 mất khoảng 7–8 tiếng (giá vé tham khảo 280.000đ–450.000đ/chiều).';
    return tavilyRef ? `${baseAirportInfo} ${tavilyRef}` : baseAirportInfo;
  }

  const isLogisticsQuery =
    /(xe may|mo to|o to|tu lai|xe rieng|xe buyt|shuttle|thue xe|phuong tien|giay to|bang lai|motorbike|scooter|car rental|transport)/i.test(
      folded
    );
  if (isLogisticsQuery && ctx.logistics.length > 0) {
    const matchedTransport = ctx.logistics.find(
      (l) =>
        (/xe may|mo to|motorbike|scooter/i.test(folded) && l.mode === 'motorbike') ||
        (/tu lai|self/i.test(folded) && l.mode === 'self_drive_car') ||
        (/xe rieng|tai xe|7 cho|private/i.test(folded) && l.mode === 'private_car_driver') ||
        (/xe buyt|shuttle|bus/i.test(folded) && l.mode === 'local_bus_shuttle')
    );

    const asksDocuments =
      /(giay to|thu tuc|bang lai|cccd|cmnd|ho chieu|dat coc|document|license|deposit|id card)/i.test(
        folded
      );

    if (matchedTransport && asksDocuments) {
      const rate = isEn
        ? `${matchedTransport.dailyRateVnd.toLocaleString('en-US')} VND/day`
        : `${matchedTransport.dailyRateVnd.toLocaleString('vi-VN')}đ/ngày`;
      return isEn
        ? `For **${matchedTransport.label}** (reference rate ~${rate} — ${matchedTransport.notes}), our dataset does not store per-shop rental paperwork policies, so please confirm directly with the provider. Typically in Buôn Ma Thuột you will need a valid ID/passport (CCCD/Passport), an appropriate driver's license (A1/A for motorbikes or B1/B2 for self-drive cars), and a refundable deposit depending on the shop.${tavilyRef ? ` ${tavilyRef}` : ''}`
        : `Với dịch vụ **${matchedTransport.label}** (mức giá tham khảo ~${rate} — ${matchedTransport.notes}), dữ liệu hệ thống hiện không lưu quy định giấy tờ riêng của từng cửa hàng nên bạn nên xác nhận trực tiếp khi đặt. Thông thường tại Buôn Ma Thuột, bạn cần chuẩn bị **CCCD/CMND hoặc hộ chiếu**, **giấy phép lái xe hợp lệ** (hạng A1/A với xe máy hoặc B1/B2 với ô tô tự lái) và **tiền cọc** tùy chính sách từng điểm thuê.${tavilyRef ? ` ${tavilyRef}` : ''}`;
    }

    if (matchedTransport) {
      const rate = isEn
        ? `${matchedTransport.dailyRateVnd.toLocaleString('en-US')} VND/day`
        : `${matchedTransport.dailyRateVnd.toLocaleString('vi-VN')}đ/ngày`;
      return isEn
        ? `**${matchedTransport.label}** (${matchedTransport.tier} tier, ${matchedTransport.capacityMin}–${matchedTransport.capacityMax} guests): reference rate **${rate}**. Notes: ${matchedTransport.notes}${tavilyRef ? ` ${tavilyRef}` : ''}`
        : `**${matchedTransport.label}** (hạng ${matchedTransport.tier}, phù hợp ${matchedTransport.capacityMin}–${matchedTransport.capacityMax} khách): giá tham khảo **${rate}**. Ghi chú: ${matchedTransport.notes}${tavilyRef ? ` ${tavilyRef}` : ''}`;
    }

    const summary = ctx.logistics
      .map((l) =>
        isEn
          ? `${l.label} (~${l.dailyRateVnd.toLocaleString('en-US')} VND/day)`
          : `**${l.label}** (~${l.dailyRateVnd.toLocaleString('vi-VN')}đ/ngày: ${l.notes})`
      )
      .join('; ');
    return isEn
      ? `Transport options in our Đắk Lắk dataset: ${summary}.${tavilyRef ? ` ${tavilyRef}` : ''}`
      : `Các phương án di chuyển tham khảo tại Đắk Lắk: ${summary}.${tavilyRef ? ` ${tavilyRef}` : ''}`;
  }

  // 3. Active Day Schedule Query (e.g. "Ngày 1 mình đi những đâu...")
  const dayMatch = lower.match(/(?:ngày|day)\s*([1-4])/i);
  const season = resolveSeasonFromDates(
    req.message,
    req.history?.map((h) => h.user).join(' ')
  );
  const asksSeasonOrWeather =
    /(mùa|thời tiết|khí hậu|dự báo|mưa|nắng|mặc gì|hoa cà phê|dã quỳ|tháng\s*\d+|season|weather|forecast|wear|pack|blossom)/i.test(
      lower
    );

  if (dayMatch && days.length > 0) {
    const idx = Math.max(0, Math.min(days.length - 1, Number(dayMatch[1]) - 1));
    const targetDay = days[idx];
    if (targetDay) {
      const dirMap = new Map(ctx.places.map((p) => [p.title.toLowerCase(), p]));
      const slotList = targetDay.slots
        .map((s) => {
          const meta = dirMap.get(s.title.toLowerCase());
          return `${s.time}: ${s.title}${meta ? ` (${meta.duration})` : ''}`;
        })
        .join('; ');
      const dayText = isEn
        ? `${targetDay.day} (${targetDay.title}) has ${targetDay.slots.length} stops: ${slotList}.`
        : `${targetDay.day} (${targetDay.title}) hiện có ${targetDay.slots.length} điểm: ${slotList}.`;
      if (asksSeasonOrWeather) {
        const seasonText = isEn
          ? ` Seasonal context (${season.milestone} — ${season.headline}): ${season.description}`
          : ` Bối cảnh mùa (${season.milestone} — ${season.headline}): ${season.description}`;
        return `${dayText}${seasonText}${tavilyRef ? ` ${tavilyRef}` : ''}`;
      }
      return dayText;
    }
  }

  // 4. Specific Place / Directory Query (skip if the user specifically asks about a festival/event)
  const asksFestivalOrEvent = /(le hoi|festival|su kien|bieu dien|chuong trinh|lich to chuc)/i.test(
    folded
  );
  const matchedPlace = findMatchedPlaceInText(folded, ctx.places);
  if (matchedPlace && !asksSeasonOrWeather && !asksFestivalOrEvent) {
    const ticketStr =
      matchedPlace.ticketVnd === 0
        ? isEn
          ? 'Free admission'
          : 'Miễn phí vé vào cổng'
        : isEn
          ? `${matchedPlace.ticketVnd.toLocaleString('en-US')} VND`
          : `${matchedPlace.ticketVnd.toLocaleString('vi-VN')}đ`;
    const spendStr = isEn
      ? `${matchedPlace.estimatedSpendVnd.toLocaleString('en-US')} VND`
      : `${matchedPlace.estimatedSpendVnd.toLocaleString('vi-VN')}đ`;

    return isEn
      ? `**${matchedPlace.title}** (${matchedPlace.category} • ${matchedPlace.location})\n- **Suggested window:** ${matchedPlace.time} (${matchedPlace.duration})\n- **Estimated cost:** ${ticketStr}, total spend ~${spendStr}${matchedPlace.priceNote ? ` (${matchedPlace.priceNote})` : ''}\n- **Highlights:** ${matchedPlace.desc}${tavilyRef}`
      : `**${matchedPlace.title}** (${matchedPlace.category} • ${matchedPlace.location})\n- **Khung giờ gợi ý:** ${matchedPlace.time} (thời lượng ${matchedPlace.duration})\n- **Chi phí tham khảo:** ${ticketStr}, tổng chi tiêu ước tính ~${spendStr}${matchedPlace.priceNote ? ` (${matchedPlace.priceNote})` : ''}\n- **Điểm nổi bật:** ${matchedPlace.desc}${tavilyRef}`;
  }

  // 5. Season / Weather / Coffee Blossom Query
  if (asksSeasonOrWeather) {
    const coffeeBlossomNote =
      /hoa ca phe|coffee blossom/i.test(folded)
        ? isEn
          ? ' Best spots to see coffee blossoms: Nông trại Cà phê Ea Tân, Làng Cà phê Trung Nguyên, and Buôn cổ Ako Dhông.'
          : ' Các điểm gợi ý ngắm hoa cà phê và thưởng thức cà phê: Nông trại Cà phê Ea Tân, Làng Cà phê Trung Nguyên, Bảo tàng Thế giới Cà phê và Buôn cổ Ako Dhông.'
        : '';

    if (days.length > 0) {
      const totalStops = days.reduce((s, d) => s + d.slots.length, 0);
      return isEn
        ? `For ${season.milestone} (${season.headline} — ${season.subheadline}): ${season.description} Your current ${days.length}-day itinerary includes ${totalStops} stops across ${days.map((d) => d.title).join(' → ')}.${coffeeBlossomNote}${tavilyRef ? ` ${tavilyRef}` : ''}`
        : `Theo dữ liệu mùa ${season.milestone} (${season.headline} — ${season.subheadline}): ${season.description} Lịch trình ${days.length} ngày hiện tại của bạn có ${totalStops} điểm dừng, phù hợp chuẩn bị giày đi bộ thoải mái và áo khoác nhẹ cho buổi tối cao nguyên.${coffeeBlossomNote}${tavilyRef ? ` ${tavilyRef}` : ''}`;
    }

    return isEn
      ? `**${season.milestone} (${season.headline})**: ${season.subheadline}. ${season.description}${coffeeBlossomNote}${tavilyRef ? ` ${tavilyRef}` : ''}`
      : `**${season.milestone} (${season.headline})**: ${season.subheadline}. ${season.description}${coffeeBlossomNote}${tavilyRef ? ` ${tavilyRef}` : ''}`;
  }

  // 6. Food / Coffee / Souvenir Specialties Query
  if (
    /(an gi|mon gi|am thuc|dac san|bun|com lam|ga nuong|ca lang|banh uot|mua qua|qua gi|quan an|nha hang|food|eat|cuisine|souvenir|specialty)/i.test(
      folded
    )
  ) {
    const foodBase = isEn
      ? 'Must-try Đắk Lắk specialties include Buôn Ma Thuột red noodle soup (bún đỏ), stacked wet rice pancakes with grilled pork (bánh ướt thịt nướng), grilled chicken with bamboo rice (gà nướng cơm lam), Sêrêpốk lăng fish, and hand-brewed Fine Robusta around Phan Đình Giót street. For gifts/souvenirs, look for specialty roasted coffee, Đắk Lắk cocoa powder, macadamia nuts, and coffee-blossom honey.'
      : 'Đến Đắk Lắk bạn nhất định nên thử bún đỏ Ban Mê, bánh ướt thịt nướng chồng đĩa, gà nướng cơm lam Bản Đôn/Hồ Lắk, cá lăng sông Sêrêpốk và thưởng thức Fine Robusta ở Phố Ẩm thực Phan Đình Giót hoặc Bảo tàng Thế giới Cà phê. Nếu mua quà mang về, bạn có thể chọn cà phê hạt/rang mộc đặc sản, bột ca cao Đắk Lắk, hạt mắc ca và mật ong hoa cà phê.';
    return tavilyRef ? `${foodBase} ${tavilyRef}` : foodBase;
  }

  // 6b. Culture, Festivals, or External Landmarks (KoTam, Khải Đoan, Chư Yang Sin, Ea Kao, etc.)
  if (/(le hoi cong chieng|cong chieng.*le hoi|le hoi.*cong chieng|le hoi.*ako dhong)/i.test(folded)) {
    const gongFestBase = isEn
      ? `**Gong Culture & Community Performances in Đắk Lắk**\n- **Status:** Our local dataset does not have a confirmed public schedule for a one-off Gong Festival on a specific date unless verified by official provincial announcements.\n- **Regular experiences:** Cultural gong performances (UNESCO Intangible Cultural Heritage) are periodically hosted at community tourism villages like **Buôn cổ Ako Dhông** (Buôn Ma Thuột) and cultural centers by local artisans or tour groups.`
      : `**Lễ hội & Biểu diễn Văn hóa Cồng chiêng tại Buôn cổ Ako Dhông**\n- **Về lịch tổ chức cụ thể:** Dữ liệu hiện tại chưa ghi nhận thông báo lịch chính thức của một sự kiện Lễ hội Cồng chiêng cấp tỉnh diễn ra đúng vào ngày cụ thể bạn hỏi; bạn nên kiểm tra thêm thông báo từ Sở Văn hóa, Thể thao & Du lịch Đắk Lắk.\n- **Trải nghiệm thường kỳ:** Tại **Buôn cổ Ako Dhông** (cách trung tâm Buôn Ma Thuột ~2 km), các chương trình giao lưu văn hóa cồng chiêng Tây Nguyên, tham quan nhà dài Ê Đê và thưởng thức ẩm thực bản địa vẫn được tổ chức theo lịch biểu diễn định kỳ hoặc đặt trước theo đoàn.`;
    return tavilyRef ? `${gongFestBase}${tavilyRef}` : gongFestBase;
  }

  if (/(le hoi ca phe|coffee festival|le hoi)/i.test(folded)) {
    const festBase = isEn
      ? '**Buôn Ma Thuột Coffee Festival & Local Events**\n- Held biennially in March as Vietnam’s largest coffee cultural event featuring street parades, free coffee tasting, specialty brewing competitions, and Central Highlands gong performances.'
      : '**Lễ hội Cà phê Buôn Ma Thuột & Sự kiện Văn hóa**\n- **Thời gian thường lệ:** Tổ chức định kỳ 2 năm một lần vào tháng 3 tại TP. Buôn Ma Thuột.\n- **Hoạt động nổi bật:** Lễ hội đường phố, thưởng thức cà phê miễn phí, hội thi pha chế Fine Robusta và không gian biểu diễn cồng chiêng Tây Nguyên.';
    return tavilyRef ? `${festBase}${tavilyRef}` : festBase;
  }

  if (/(kotam|ko tam|khai doan|sac tu khai doan|chu yang sin|ho ea kao)/i.test(folded)) {
    const extLandmarkBase = isEn
      ? 'Notable destinations around Buôn Ma Thuột include Sắc Tứ Khải Đoan Pagoda (the largest historic royal-titled pagoda in Đắk Lắk on Phan Bội Châu Street), KoTam Community Eco-Tourism Area (on National Highway 26, ~8 km from BMT center with gardens, bamboo architecture, and local cuisine), Ea Kao Lake (~12 km south of BMT center), and Chư Yang Sin National Park (renowned for cloud-forest trekking and biodiversity).'
      : 'Các điểm tham quan nổi tiếng quanh Buôn Ma Thuột gồm Chùa Sắc Tứ Khải Đoan (ngôi chùa lớn và cổ kính nhất Đắk Lắk trên đường Phan Bội Châu), Khu du lịch sinh thái cộng đồng KoTam (trên Quốc lộ 26, cách trung tâm ~8 km với vườn hoa, bến nước và ẩm thực Tây Nguyên), Hồ Ea Kao (cách trung tâm ~12 km về phía Nam) và Vườn Quốc gia Chư Yang Sin (điểm trekking rừng nguyên sinh nổi tiếng).';
    return tavilyRef ? `${extLandmarkBase} ${tavilyRef}` : extLandmarkBase;
  }

  if (/(van hoa|cong chieng|dan toc|e de|m'nong|mnong|nha dai|mau he|lich su|history|culture|gong)/i.test(folded)) {
    const cultureBase = isEn
      ? 'Đắk Lắk is home to 49 ethnic groups, notably the indigenous Ê Đê (known for matriarchal longhouses, Kpan benches, and epic Khan storytelling in villages like Ako Dhông) and M’nông communities around Lắk Lake and Buôn Đôn. The Space of Gong Culture in the Central Highlands is recognized by UNESCO as an Intangible Cultural Heritage of Humanity.'
      : 'Đắk Lắk là nơi hội tụ của 49 dân tộc anh em, tiêu biểu là người Ê Đê (với truyền thống mẫu hệ, kiến trúc nhà dài, ghế Kpan và sử thi Đam San tại các buôn cổ như Ako Dhông) cùng người M’nông vùng Hồ Lắk – Buôn Đôn. Không gian văn hóa Cồng chiêng Tây Nguyên đã được UNESCO công nhận là Di sản Văn hóa Phi vật thể Đại diện của Nhân loại.';
    return tavilyRef ? `${cultureBase} ${tavilyRef}` : cultureBase;
  }

  // 6c. Any other general/external question where Tavily returned live search results
  if (tavilyRef) {
    return tavilyRef.trim();
  }
  const validSnippets = (options?.tavilySnippets || []).filter(
    (s) => typeof s?.content === 'string' && s.content.trim().length > 0
  );
  if (validSnippets.length > 0) {
    const matchingLangSnippets = isEn
      ? validSnippets
      : validSnippets.filter((s) => !isLikelyEnglishText(s.content));
    const chosen = matchingLangSnippets.length > 0 ? matchingLangSnippets : validSnippets;
    if (isEn) {
      return chosen
        .slice(0, 2)
        .map((s) => `- **${s.title}**: ${s.content}`)
        .join('\n');
    }
    if (matchingLangSnippets.length > 0) {
      return `**Thông tin tham khảo trực tuyến:**\n${matchingLangSnippets
        .slice(0, 2)
        .map((s) => `- **${s.title}**: ${s.content}`)
        .join('\n')}`;
    }
    return 'Hệ thống đã tìm thấy một số bài viết tham khảo trực tuyến (chi tiết nguồn đính kèm bên dưới). Bạn có thể mở liên kết nguồn hoặc hỏi cụ thể hơn để mình tổng hợp giúp bạn nhé!';
  }

  // 7. Active Itinerary Summary or General Overview
  if (days.length > 0) {
    const totalStops = days.reduce((s, d) => s + d.slots.length, 0);
    const itinerarySummary = days
      .map(
        (d, i) =>
          `${isEn ? `Day ${i + 1}` : `Ngày ${i + 1}`}: ${d.slots.map((s) => `${s.title} (${s.time})`).join(', ')}`
      )
      .join(' | ');

    return isEn
      ? `Your current ${req.currentState.duration} itinerary (${totalStops} stops total): ${itinerarySummary}. Seasonal context (${season.milestone}): ${season.subheadline}.`
      : `Lịch trình ${req.currentState.duration} hiện tại của bạn gồm ${totalStops} điểm dừng: ${itinerarySummary}. Bối cảnh mùa (${season.milestone}): ${season.subheadline}.`;
  }

  return isEn
    ? 'Đắk Lắk highlights include Bảo tàng Thế giới Cà phê, Buôn cổ Ako Dhông, Hồ Lắk & Buôn Jun, Thác Dray Nur Hùng Vĩ, and ethical elephant walks in Vườn Quốc gia Yok Đôn. Tell me your trip duration and style if you want a tailored itinerary!'
    : 'Các điểm nổi bật nhất tại Đắk Lắk gồm Bảo tàng Thế giới Cà phê, Buôn cổ Ako Dhông, Hồ Lắk & Buôn Jun, Thác Dray Nur Hùng Vĩ và trải nghiệm đi bộ ngắm voi tự nhiên ở Vườn Quốc gia Yok Đôn. Bạn có thể cho mình biết số ngày & sở thích để mình thiết kế lịch trình riêng nhé!';
}

function detectIntentDeterministic(req: AiChatRequest): AgenticIntent {
  const lower = req.message.toLowerCase();
  const hasModifyVerb =
    /(thêm|bỏ|xóa|bớt|đổi điểm|thay điểm|add|remove|drop|swap|replace)/i.test(lower);
  const hasFullPlanVerb =
    /(lên lịch|lịch trình mới|thiết kế|tạo tour|lập kế hoạch|kế hoạch chuyến|plan a trip|create itinerary|new itinerary|build.*itinerary)/i.test(
      lower
    );
  const looksLikeTripPlanGoal =
    !isPrimaryAmenityOrInfoQuestion(lower) &&
    (/(lên lịch|lịch trình|kế hoạch|plan.*trip|itinerary|muốn đi.*chơi|tư vấn.*lịch)/i.test(lower) ||
      (/(muốn đi|tư vấn.*đi)/i.test(lower) && !isQuestionOrInfoRequest(lower)));

  if (
    req.isFollowUp &&
    req.currentState.days.length > 0 &&
    hasModifyVerb &&
    !hasFullPlanVerb &&
    !isPrimaryAmenityOrInfoQuestion(lower)
  ) {
    return 'modify_stops';
  }

  const looksLikeGeneralQa =
    !hasFullPlanVerb &&
    (!hasModifyVerb || isPrimaryAmenityOrInfoQuestion(lower)) &&
    !looksLikeTripPlanGoal &&
    (isPrimaryAmenityOrInfoQuestion(lower) ||
      isQuestionOrInfoRequest(lower) ||
      /(mùa nào|thời tiết|bao giờ|tháng mấy|ở đâu|ăn gì|món gì|đặc sản|giá vé|bao xa|di chuyển|cách đi|có nên|lễ hội|văn hóa|lịch sử|sân bay|xe khách|what|when|where|which|how|weather|season|best time|tell me about)/i.test(
        lower
      ));

  if (looksLikeGeneralQa) {
    return 'general_qa';
  }

  return 'plan_trip';
}

/**
 * Deterministic Phase 1 intake parser (used directly in offline/fallback mode and as a guardrail
 * alongside Gemini extraction).
 */
export function runPhase1IntakeDeterministic(req: AiChatRequest): Phase1IntakeOutput {
  const draft = req.draftIntake;
  const recentUserHistory = Array.isArray(req.history)
    ? req.history.slice(-2).map((h) => h.user).join(' ')
    : '';
  const hasDraft = Boolean(draft && Object.keys(draft).length > 0);
  const parseSourceText = hasDraft
    ? normalizeText(req.message)
    : [recentUserHistory, req.message].filter(Boolean).join(' ').trim();

  const msgTravelers = extractTravelersFromText(parseSourceText);
  const hasExplicitCompanionKeyword =
    /(độc hành|một mình|1 mình|đi riêng|solo|gia đình|bố mẹ|trẻ nhỏ|con nhỏ|ông bà|family|kids|children|nhóm bạn|bạn bè|hội bạn|team|friends|group|cặp đôi|người yêu|vợ chồng|lãng mạn|honeymoon|couple)/i.test(
      parseSourceText
    );

  const draftCompanion =
    draft?.companionType && VALID_COMPANIONS.includes(draft.companionType)
      ? draft.companionType
      : null;

  const companionType: CompanionType | null = hasExplicitCompanionKeyword
    ? msgTravelers.companionType
    : draftCompanion ?? msgTravelers.companionType;

  const draftCount =
    typeof draft?.travelersCount === 'number' &&
    Number.isFinite(draft.travelersCount) &&
    draft.travelersCount >= 1
      ? Math.round(draft.travelersCount)
      : null;

  const travelersCount: number | null =
    msgTravelers.travelersCount ??
    draftCount ??
    inferTravelersCountFromCompanion(companionType);

  const msgBudget = extractBudgetVndFromText(parseSourceText, travelersCount);
  const msgDates = extractDatesAndDurationFromText(parseSourceText);

  const draftMainPurpose =
    draft?.mainPurpose && VALID_THEMES.includes(draft.mainPurpose)
      ? draft.mainPurpose
      : null;
  const msgPurpose = extractPurposeFromText(
    parseSourceText,
    draftMainPurpose || req.currentState.theme
  );

  const draftMissing = Array.isArray(draft?.missingFields) ? draft.missingFields : null;
  const draftHasBudget = Boolean(
    draft &&
      ((typeof draft.totalBudgetVnd === 'number' &&
        Number.isFinite(draft.totalBudgetVnd) &&
        draft.totalBudgetVnd >= 300_000) ||
        (draftMissing
          ? !draftMissing.includes('budget')
          : Boolean(draft.budgetTier && VALID_BUDGETS.includes(draft.budgetTier))))
  );
  const draftHasDates = Boolean(
    draft &&
      (draftMissing
        ? !draftMissing.includes('dates')
        : Boolean(
            (typeof draft.travelDates === 'string' && draft.travelDates.trim()) ||
              (draft.duration && VALID_DURATIONS.includes(draft.duration))
          ))
  );
  const draftHasTravelers = Boolean(
    draft &&
      ((draftMissing ? !draftMissing.includes('travelers') : false) ||
        draftCount !== null ||
        draftCompanion !== null)
  );

  const hasBudgetInfo = msgBudget.explicitMention || draftHasBudget;
  const hasDatesInfo = msgDates.explicitMention || draftHasDates;
  const hasTravelersInfo =
    msgTravelers.explicitMention ||
    draftHasTravelers ||
    travelersCount !== null ||
    companionType !== null;

  let intent = detectIntentDeterministic(req);
  const isDirectQuestionWhileClarifying =
    Boolean(draft?.needsClarification) &&
    isPrimaryAmenityOrInfoQuestion(req.message) &&
    !/(lên lịch|lập kế hoạch|thiết kế lịch|tạo lịch|tạo tour|plan.*trip|create itinerary|build.*itinerary)/i.test(
      req.message
    );
  if (
    draft?.needsClarification &&
    !isDirectQuestionWhileClarifying &&
    (msgBudget.explicitMention || msgDates.explicitMention || msgTravelers.explicitMention)
  ) {
    intent = 'plan_trip';
  }

  const isKnownPreset = sampleSchedulePresets.some(
    (p) => p.prompt.trim().toLowerCase() === req.message.trim().toLowerCase()
  );

  const missingFields: Array<'budget' | 'dates' | 'travelers'> = [];
  if (intent === 'plan_trip' && !isKnownPreset) {
    const hasActivePlanner = req.isFollowUp && req.currentState.days.length > 0;
    if (!hasActivePlanner) {
      if (!hasBudgetInfo) missingFields.push('budget');
      if (!hasDatesInfo) missingFields.push('dates');
      if (!hasTravelersInfo) missingFields.push('travelers');
    }
  }

  const needsClarification = intent === 'plan_trip' && missingFields.length > 0;
  const draftDuration =
    draft?.duration && VALID_DURATIONS.includes(draft.duration) ? draft.duration : null;
  const duration: DurationType =
    msgDates.duration || draftDuration || req.currentState.duration || '3N2D';

  const draftBudgetVnd =
    typeof draft?.totalBudgetVnd === 'number' &&
    Number.isFinite(draft.totalBudgetVnd) &&
    draft.totalBudgetVnd >= 300_000
      ? Math.round(draft.totalBudgetVnd)
      : null;
  const totalBudgetVnd = msgBudget.totalBudgetVnd ?? draftBudgetVnd;

  const draftBudgetTier =
    draft?.budgetTier && VALID_BUDGETS.includes(draft.budgetTier) && draftHasBudget
      ? draft.budgetTier
      : null;
  const budgetTier: BudgetType =
    msgBudget.budgetTier || draftBudgetTier || req.currentState.budget || 'standard';

  const draftTravelDates =
    draftHasDates && typeof draft?.travelDates === 'string' && draft.travelDates.trim()
      ? draft.travelDates.trim()
      : null;

  let travelDates: string | null = null;
  if (draftTravelDates && msgDates.travelDates) {
    const mergedHints = Array.from(
      new Set([
        ...draftTravelDates.split('•').map((s) => s.trim()).filter(Boolean),
        ...msgDates.travelDates.split('•').map((s) => s.trim()).filter(Boolean),
      ])
    );
    travelDates = mergedHints.join(' • ');
  } else {
    travelDates = msgDates.travelDates || draftTravelDates || duration;
  }

  const draftInterests = Array.isArray(draft?.secondaryInterests)
    ? draft.secondaryInterests.map((s) => String(s).trim()).filter(Boolean)
    : [];
  const secondaryInterests = Array.from(
    new Set([...draftInterests, ...msgPurpose.secondaryInterests])
  );

  const rawUserGoal =
    draft?.rawUserGoal && draft.rawUserGoal.trim() && draft.rawUserGoal.trim() !== normalizeText(req.message)
      ? `${draft.rawUserGoal.trim()} — ${normalizeText(req.message)}`
      : normalizeText(req.message);

  const intake: IntakeState = {
    intent,
    travelersCount,
    companionType,
    travelDates,
    duration,
    totalBudgetVnd,
    budgetTier,
    mainPurpose: msgPurpose.mainPurpose,
    secondaryInterests,
    missingFields,
    needsClarification,
    clarificationQuestion: needsClarification
      ? buildClarificationQuestion(req.lang, missingFields)
      : undefined,
    rawUserGoal,
  };

  return {
    intake,
    stopOperations: [],
    provider: 'local-fallback',
  };
}

const PHASE1_INTAKE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    intent: { type: 'STRING', enum: ['general_qa', 'plan_trip', 'modify_stops'] },
    travelersCount: { type: 'INTEGER', nullable: true },
    companionType: {
      type: 'STRING',
      enum: ['solo', 'couple', 'family', 'friends'],
      nullable: true,
    },
    travelDates: { type: 'STRING', nullable: true },
    duration: { type: 'STRING', enum: ['2N1D', '3N2D', '4N3D+'] },
    totalBudgetVnd: { type: 'INTEGER', nullable: true },
    budgetTier: { type: 'STRING', enum: ['budget', 'standard', 'luxury'] },
    mainPurpose: { type: 'STRING', enum: ['coffee', 'culture', 'nature', 'cuisine'] },
    secondaryInterests: { type: 'ARRAY', items: { type: 'STRING' } },
    hasBudgetInfo: { type: 'BOOLEAN' },
    hasDatesInfo: { type: 'BOOLEAN' },
    hasTravelersInfo: { type: 'BOOLEAN' },
    clarificationQuestion: { type: 'STRING', nullable: true },
    generalQaReply: { type: 'STRING', nullable: true },
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
        required: ['action', 'placeTitle'],
      },
    },
  },
  required: [
    'intent',
    'duration',
    'budgetTier',
    'mainPurpose',
    'secondaryInterests',
    'hasBudgetInfo',
    'hasDatesInfo',
    'hasTravelersInfo',
  ],
};

/**
 * Phase 1 (LLM + Deterministic Guardrail): classifies user intent and extracts trip constraints,
 * triggering `needs_clarification` when a new `plan_trip` request omits budget, dates, or travelers.
 */
export async function runPhase1Intake(
  req: AiChatRequest,
  options?: {
    enableTavily?: boolean;
    tavilyClient?: TavilySearchClient;
  }
): Promise<Phase1IntakeOutput> {
  return withOpenInferenceSpan(
    'phase1_intake',
    {
      kind: OpenInferenceSpanKind.CHAIN,
      input: {
        message: req.message,
        lang: req.lang,
        isFollowUp: req.isFollowUp,
        currentState: req.currentState,
      },
      formatOutput: (out) => ({
        intent: out.intake.intent,
        needsClarification: out.intake.needsClarification,
        missingFields: out.intake.missingFields,
        provider: out.provider,
      }),
    },
    async () => {
      const deterministic = runPhase1IntakeDeterministic(req);
      const apiKey = GEMINI_API_KEY.trim();
      if (!apiKey) {
        return deterministic;
      }

      const model = GEMINI_MODEL.trim() || 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const shouldInjectQaContext =
        deterministic.intake.intent === 'general_qa' ||
        isQuestionOrInfoRequest(req.message) ||
        isPrimaryAmenityOrInfoQuestion(req.message);
      const groundedQaCtx = shouldInjectQaContext ? await loadGroundedQaContext() : null;
      const tavilyQaCtx = shouldInjectQaContext
        ? await maybeFetchTavilyQaContext(req.message, {
            enableTavily: options?.enableTavily,
            tavilyClient: options?.tavilyClient,
          })
        : { snippets: [], citations: [] };

      const effectiveQaLang = resolveEffectiveQaLanguage(req.message, req.lang);
      const systemText = [
        'You are Phase 1 Intake Classifier & Extractor for "Đắk Lắk AI Travel Concierge".',
        `UI language: "${req.lang}". Target Q&A reply language: "${effectiveQaLang}".`,
        'Classify intent into:',
        '- "general_qa": user asks a question (?, "có ... không", "bao nhiêu", "ở đâu", "cần giấy tờ gì", "review", "tư vấn", "giới thiệu") about stays/homestays/resorts & amenities/prices, transport/flights/buses/rental requirements, places, external landmarks, seasons, weather, culture, festivals, dishes, or travel tips without requesting a full trip plan or explicit itinerary edit.',
        '- "modify_stops": user wants to add/remove/swap specific stops in an existing itinerary (only when currentItinerary has days and the message is an explicit stop edit command, NOT primarily an info/amenity question).',
        '- "plan_trip": user wants a trip itinerary planned, advised for a multi-day trip ("muốn đi ... chơi vài ngày", "lên lịch trình"), or regenerated.',
        'Extract travelersCount, companionType, travelDates, duration (2N1D/3N2D/4N3D+), totalBudgetVnd (numeric VND if stated), budgetTier, mainPurpose (coffee/culture/nature/cuisine), secondaryInterests.',
        'When draftIntake is provided, preserve all previously collected slots (companionType, travelersCount, travelDates, duration, totalBudgetVnd, budgetTier, mainPurpose, secondaryInterests) unless userMessage explicitly changes them.',
        'CRITICAL Honesty check rules (NEVER copy currentState defaults to mark these true!):',
        '- hasBudgetInfo = true ONLY if userMessage, draftIntake, or recentHistory explicitly states a budget amount or tier (budget/standard/luxury/tiết kiệm/cao cấp/triệu).',
        '- hasDatesInfo = true ONLY if userMessage, draftIntake, or recentHistory explicitly states trip length (e.g. 2N1D, 3 ngày — NOT vague "vài ngày") or month/dates/season.',
        '- hasTravelersInfo = true ONLY if userMessage, draftIntake, or recentHistory explicitly states traveler count or companion type (solo/couple/family/friends). First-person pronouns like "mình" or "tôi" alone do NOT imply solo travel — return null for companionType and travelersCount if unstated.',
        'If intent is "general_qa", write a helpful, factual, ethical (no elephant riding) answer in "generalQaReply":',
        `- CRITICAL LANGUAGE RULE: Write 100% of "generalQaReply" in ${effectiveQaLang === 'vi' ? 'natural, fluent Vietnamese' : 'natural, fluent English'} matching the user's message. If "tavilyLiveWebAnswer" or "tavilyLiveWebSnippets" are in English and target language is "vi", ALWAYS translate and synthesize those facts into natural Vietnamese — NEVER paste English sentences or phrases into a Vietnamese reply.`,
        '- FORMATTING RULE: Structure "generalQaReply" for easy reading using clean Markdown: start with a 1–2 sentence direct summary, followed by bullet points ("- **Label**: detail") for prices, schedules, amenities, or practical tips, separated by blank lines (never one dense wall of text).',
        '- Synthesize grounded local data (stays, logistics, dakLakPlaceDirectory, seasonsData) AND live web search context (tavilyLiveWebAnswer, tavilyLiveWebSnippets) when provided, supplemented by accurate Đắk Lắk travel knowledge for external landmarks, transport, festivals, or general questions.',
        '- CRITICAL HONESTY FOR INTERNAL CATALOG STAYS: If asked whether a specific stay in `stays` has an amenity (e.g. swimming pool / hồ bơi), price, or rental requirement that is NOT listed/confirmed in `stays` or `tavilyLiveWebSnippets`, honestly state that it is not listed/confirmed in our data, list its actual recorded amenities, and suggest relevant alternatives from `stays` if appropriate.',
        'If intent is "plan_trip" and any of hasBudgetInfo/hasDatesInfo/hasTravelersInfo is false, write a concise targeted question in "clarificationQuestion" asking for ALL missing details.',
      ].join('\n');

      const historySnippet = (req.history || [])
        .slice(-4)
        .map((h) => `User: ${h.user}\nAssistant: ${h.reply}`)
        .join('\n');

      const prompt = [
        `isFollowUp: ${req.isFollowUp}`,
        `hasExistingDays: ${req.currentState.days.length > 0}`,
        `currentState: theme=${req.currentState.theme}, duration=${req.currentState.duration}, companion=${req.currentState.companion}, budget=${req.currentState.budget}`,
        req.draftIntake ? `draftIntake: ${JSON.stringify(req.draftIntake)}` : '',
        groundedQaCtx ? `stays:\n${JSON.stringify(groundedQaCtx.stays)}` : '',
        groundedQaCtx ? `logistics:\n${JSON.stringify(groundedQaCtx.logistics)}` : '',
        groundedQaCtx ? `dakLakPlaceDirectory:\n${JSON.stringify(groundedQaCtx.places)}` : '',
        groundedQaCtx ? `seasonsData:\n${JSON.stringify(groundedQaCtx.seasons)}` : '',
        tavilyQaCtx.answer ? `tavilyLiveWebAnswer:\n${tavilyQaCtx.answer}` : '',
        tavilyQaCtx.snippets.length > 0
          ? `tavilyLiveWebSnippets:\n${JSON.stringify(tavilyQaCtx.snippets)}`
          : '',
        historySnippet ? `recentHistory:\n${historySnippet}` : '',
        `userMessage: ${req.message}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(15000, AI_CHAT_TIMEOUT_MS));

      try {
        const llmCall = await withOpenInferenceSpan(
          'gemini_phase1_intake',
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
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.15,
                  maxOutputTokens: 1024,
                  responseMimeType: 'application/json',
                  responseSchema: PHASE1_INTAKE_SCHEMA,
                },
              }),
            });

            if (!response.ok) {
              const errBody = await response.text().catch(() => '');
              throw new Error(`Gemini Phase 1 HTTP ${response.status}: ${errBody.slice(0, 200)}`);
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
        const parsed = JSON.parse(jsonText) as Record<string, unknown>;

        const looksLikeTripPlanGoal =
          !isPrimaryAmenityOrInfoQuestion(req.message) &&
          /(muốn đi.*chơi|lên lịch|lịch trình|tư vấn.*đi|chơi.*ngày|kế hoạch|plan.*trip|itinerary)/i.test(
            req.message
          );
        const isLockedGeneralQa =
          deterministic.intake.intent === 'general_qa' &&
          !looksLikeTripPlanGoal &&
          (isPrimaryAmenityOrInfoQuestion(req.message) || isQuestionOrInfoRequest(req.message));

        const intent: AgenticIntent = isLockedGeneralQa
          ? 'general_qa'
          : (req.draftIntake?.needsClarification || looksLikeTripPlanGoal) &&
              deterministic.intake.intent === 'plan_trip'
            ? 'plan_trip'
            : parsed.intent === 'general_qa' ||
                parsed.intent === 'modify_stops' ||
                parsed.intent === 'plan_trip'
              ? parsed.intent
              : deterministic.intake.intent;

        const duration: DurationType =
          extractDatesAndDurationFromText(req.message).duration ||
          (VALID_DURATIONS.includes(parsed.duration as DurationType)
            ? (parsed.duration as DurationType)
            : deterministic.intake.duration);

        const msgBudgetCheck = extractBudgetVndFromText(
          req.message,
          deterministic.intake.travelersCount
        );
        const budgetTier: BudgetType = msgBudgetCheck.budgetTier
          ? msgBudgetCheck.budgetTier
          : VALID_BUDGETS.includes(parsed.budgetTier as BudgetType) &&
              (msgBudgetCheck.explicitMention || !req.draftIntake)
            ? (parsed.budgetTier as BudgetType)
            : deterministic.intake.budgetTier;

        const msgHasPurpose =
          /(cà phê|coffee|robusta|cupping|văn hóa|cồng chiêng|bảo tàng|culture|thác|yok đôn|rừng|hồ lắk|nature|ẩm thực|ăn uống|món ăn|food|cuisine)/i.test(
            req.message
          );
        const mainPurpose: ThemeType =
          !msgHasPurpose && req.draftIntake?.mainPurpose
            ? deterministic.intake.mainPurpose
            : VALID_THEMES.includes(parsed.mainPurpose as ThemeType)
              ? (parsed.mainPurpose as ThemeType)
              : deterministic.intake.mainPurpose;

        const hasDeterministicTravelers = !deterministic.intake.missingFields.includes('travelers');
        const msgHasCompanion =
          /(độc hành|một mình|1 mình|đi riêng|solo|gia đình|bố mẹ|trẻ nhỏ|con nhỏ|ông bà|family|kids|children|nhóm bạn|bạn bè|hội bạn|team|friends|group|cặp đôi|người yêu|vợ chồng|lãng mạn|honeymoon|couple)/i.test(
            req.message
          );
        const companionType: CompanionType | null = !hasDeterministicTravelers
          ? null
          : !msgHasCompanion && req.draftIntake?.companionType
            ? deterministic.intake.companionType
            : VALID_COMPANIONS.includes(parsed.companionType as CompanionType)
              ? (parsed.companionType as CompanionType)
              : deterministic.intake.companionType;

        const rawParsedTravelers =
          hasDeterministicTravelers &&
          typeof parsed.travelersCount === 'number' &&
          Number.isFinite(parsed.travelersCount) &&
          parsed.travelersCount >= 1
            ? Math.round(parsed.travelersCount)
            : null;
        const travelersCount: number | null = !hasDeterministicTravelers
          ? null
          : rawParsedTravelers ??
            deterministic.intake.travelersCount ??
            inferTravelersCountFromCompanion(companionType);

        const hasDeterministicBudget = !deterministic.intake.missingFields.includes('budget');
        const totalBudgetVnd =
          typeof parsed.totalBudgetVnd === 'number' &&
          Number.isFinite(parsed.totalBudgetVnd) &&
          parsed.totalBudgetVnd >= 300_000
            ? Math.round(parsed.totalBudgetVnd)
            : deterministic.intake.totalBudgetVnd;

        const hasDeterministicDates = !deterministic.intake.missingFields.includes('dates');
        const travelDates = !hasDeterministicDates
          ? deterministic.intake.travelDates
          : typeof parsed.travelDates === 'string' && parsed.travelDates.trim()
            ? parsed.travelDates.trim()
            : deterministic.intake.travelDates;

        const parsedInterests = Array.isArray(parsed.secondaryInterests)
          ? parsed.secondaryInterests.map((s) => String(s).trim()).filter(Boolean)
          : [];
        const secondaryInterests = Array.from(
          new Set([...deterministic.intake.secondaryInterests, ...parsedInterests])
        );

        const isKnownPreset = sampleSchedulePresets.some(
          (p) => p.prompt.trim().toLowerCase() === req.message.trim().toLowerCase()
        );
        const hasActivePlanner = req.isFollowUp && req.currentState.days.length > 0;

        const hasBudgetInfo = hasDeterministicBudget || totalBudgetVnd !== null;
        const hasDatesInfo = hasDeterministicDates;
        const hasTravelersInfo =
          hasDeterministicTravelers || travelersCount !== null || companionType !== null;

        const missingFields: Array<'budget' | 'dates' | 'travelers'> = [];
        if (intent === 'plan_trip' && !isKnownPreset && !hasActivePlanner) {
          if (!hasBudgetInfo) missingFields.push('budget');
          if (!hasDatesInfo) missingFields.push('dates');
          if (!hasTravelersInfo) missingFields.push('travelers');
        }

        const needsClarification = intent === 'plan_trip' && missingFields.length > 0;
        const clarificationQuestion = needsClarification
          ? typeof parsed.clarificationQuestion === 'string' && parsed.clarificationQuestion.trim()
            ? parsed.clarificationQuestion.trim()
            : buildClarificationQuestion(req.lang, missingFields)
          : undefined;

        const stopOperations: AiStopOperation[] = Array.isArray(parsed.stopOperations)
          ? parsed.stopOperations
              .slice(0, 6)
              .filter((op): op is Record<string, unknown> => Boolean(op && typeof op === 'object'))
              .map((op) => ({
                action: (op.action === 'remove' ? 'remove' : 'add') as 'add' | 'remove',
                placeTitle: String(op.placeTitle || '').trim(),
                dayNumber:
                  typeof op.dayNumber === 'number' && Number.isFinite(op.dayNumber)
                    ? Math.max(1, Math.min(4, Math.round(op.dayNumber)))
                    : undefined,
                time: typeof op.time === 'string' && op.time.trim() ? op.time.trim() : undefined,
                period:
                  typeof op.period === 'string' && op.period.trim() ? op.period.trim() : undefined,
              }))
              .filter((op) => op.placeTitle.length > 0)
          : [];

        return {
          intake: {
            intent,
            travelersCount,
            companionType,
            travelDates,
            duration,
            totalBudgetVnd,
            budgetTier,
            mainPurpose,
            secondaryInterests,
            missingFields,
            needsClarification,
            clarificationQuestion,
            rawUserGoal: deterministic.intake.rawUserGoal,
          },
          stopOperations,
          generalQaReply:
            typeof parsed.generalQaReply === 'string' && parsed.generalQaReply.trim()
              ? parsed.generalQaReply.trim()
              : undefined,
          ...(tavilyQaCtx.citations.length > 0 ? { citations: tavilyQaCtx.citations } : {}),
          ...(tavilyQaCtx.snippets.length > 0 ? { tavilySnippets: tavilyQaCtx.snippets } : {}),
          ...(tavilyQaCtx.answer ? { tavilyAnswer: tavilyQaCtx.answer } : {}),
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
