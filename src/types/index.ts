export type Language = 'vi' | 'en';

export type CompanionType = 'solo' | 'couple' | 'family' | 'friends';
export type DurationType = '2N1D' | '3N2D' | '4N3D+';
export type BudgetType = 'budget' | 'standard' | 'luxury';
export type ThemeType = 'coffee' | 'culture' | 'nature' | 'cuisine';
export type ExpenseCategory = 'stay' | 'transit' | 'food' | 'activity';
export type PlannerTab = 'map' | 'schedule' | 'tips';
export type MobileCanvasPane = 'itinerary' | 'map';
export type BentoArticleKey = 'coffee' | 'gong' | 'matriarchy' | 'waterfalls' | 'bandon' | 'cuisine';

export type CmsSectionType = 'bento' | 'stories';
export type PostStatus = 'draft' | 'in_review' | 'published';
export type TranslationStatus = 'none' | 'pending' | 'translated' | 'failed';
export type UserRole = 'admin' | 'writer';

export interface CmsUser {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface BentoMetaConfig {
  size: 'large' | 'small';
  imageLayout: 'left' | 'top';
  imageBgClass: string;
  isCultureHighlight?: boolean;
}

export interface StoryMetaConfig {
  gradient: string;
  offsetClass: string;
}

export interface PlaceMeta {
  title: string;
  location: string;
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  googleMapsQuery?: string;
  category: string;
  rating: string;
  reviews: string;
  duration: string;
  period: string;
  time: string;
  image: string;
  desc: string;
}

export interface ItinerarySlot {
  id: string;
  time: string;
  period: string;
  title: string;
  location: string;
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  googleMapsQuery?: string;
  desc: string;
  image: string;
  category: string;
  rating: string;
  reviews: string;
  duration: string;
  isCustom?: boolean;
  areaCluster?: string;
  estimatedCostVnd?: number;
}

export interface FlattenedStop extends ItinerarySlot {
  dayNum: number;
  dayIdx: number;
  slotIdx: number;
  dayLabel: string;
  dayTitle: string;
  globalIdx: number;
}

export interface ItineraryDay {
  day: string;
  title: string;
  area: string;
  slots: ItinerarySlot[];
}

export interface CatalogDayTemplate {
  day: string;
  title: string;
  area: string;
  slots: Array<{
    time: string;
    period: string;
    title: string;
    location: string;
    x: number;
    y: number;
    lat?: number;
    lng?: number;
    googleMapsQuery?: string;
    desc: string;
    image?: string;
    category?: string;
    rating?: string;
    reviews?: string;
    duration?: string;
  }>;
}

export interface PlannerThemeCatalogItem {
  relatedArticleKey: BentoArticleKey;
  title: string;
  hiddenGem: string;
  routeTip: string;
  totalKmBase: number;
  days: CatalogDayTemplate[];
}

export interface SampleSchedulePreset {
  key: ThemeType;
  badge: string;
  title: string;
  summary: string;
  image: string;
  companion: CompanionType;
  duration: DurationType;
  budget: BudgetType;
  theme: ThemeType;
  prompt: string;
}

export interface ExpenseItem {
  id: string;
  title: string;
  cat: ExpenseCategory;
  amount: number;
  note?: string;
}

export type AiChatIntent = 'general_qa' | 'update_itinerary' | 'modify_stops';
export type AgenticIntent = 'general_qa' | 'plan_trip' | 'modify_stops';
export type FollowUpActionType =
  | 'modify_stops'
  | 'adjust_budget'
  | 'swap_logistics'
  | 'reorder_or_pace'
  | 'current_trip_qa'
  | 'full_replan';

export interface QuickClarificationOption {
  field: 'budget' | 'dates' | 'travelers';
  label: string;
  valueText: string;
}

export interface ExpenseAllocationPcts {
  stay: number;
  transit: number;
  food: number;
  activity: number;
}

export interface ExpensePatch {
  totalBudgetVnd?: number;
  allocationPcts?: Partial<ExpenseAllocationPcts>;
  customExpenseOps?: Array<{
    action: 'add' | 'remove';
    title: string;
    cat?: ExpenseCategory;
    amount?: number;
  }>;
}

export interface StayMovePatch {
  stayMove: string;
  selectedStayId?: string;
  selectedLogisticsId?: string;
}

export interface ReorderDayOp {
  dayNumber: number;
  action: 'optimize_route' | 'reverse' | 'swap_slots';
  slotIndexA?: number;
  slotIndexB?: number;
}

export interface PricePolicy {
  currency: 'VND';
  priceTtlHours: number;
  lodgingShareCapPct: number;
  transitShareCapPct: number;
  contingencyBufferPct: number;
  fallbackStrategy: 'tavily_then_estimate_with_disclaimer';
}

export interface AccommodationRecord {
  id: number;
  name: string;
  area: string;
  tier: BudgetType;
  nightlyRateVnd: number;
  capacityMin: number;
  capacityMax: number;
  suitableFor: CompanionType[];
  amenities: string[];
  isActive: boolean;
  sourceNote?: string;
  updatedAt: string;
}

export interface LogisticsRecord {
  id: number;
  mode: string;
  label: string;
  tier: BudgetType;
  dailyRateVnd: number;
  capacityMin: number;
  capacityMax: number;
  suitableFor: CompanionType[];
  notes: string;
  isActive: boolean;
  updatedAt: string;
}

export interface IntakeState {
  intent: AgenticIntent;
  travelersCount: number | null;
  companionType: CompanionType | null;
  travelDates: string | null;
  duration: DurationType;
  totalBudgetVnd: number | null;
  budgetTier: BudgetType;
  mainPurpose: ThemeType;
  secondaryInterests: string[];
  missingFields: Array<'budget' | 'dates' | 'travelers'>;
  needsClarification: boolean;
  clarificationQuestion?: string;
  rawUserGoal?: string;
}

export interface CapacityAndLogisticsPlan {
  dayCount: number;
  duration: DurationType;
  travelersCount: number;
  companionType: CompanionType;
  seasonMilestone: string;
  seasonHeadline: string;
  seasonTheme: ThemeType;
  maxStopsPerDay: number;
  maxStopsTotal: number;
  maxDailyDistanceKm: number;
  recommendedStays: AccommodationRecord[];
  selectedStay: AccommodationRecord | null;
  recommendedLogistics: LogisticsRecord[];
  selectedLogistics: LogisticsRecord | null;
  notes: string[];
}

export interface PricedPlaceItem {
  title: string;
  location: string;
  areaCluster: string;
  themeTags: ThemeType[];
  ticketVnd: number;
  estimatedSpendVnd: number;
  priceSource: 'seed' | 'sqlite_cache' | 'tavily' | 'estimated';
  priceNote?: string;
  sourceUrl?: string;
  fetchedAt: string;
  isStale?: boolean;
}

export interface BudgetFeasibilityResult {
  totalBudgetVnd: number;
  budgetTier: BudgetType;
  reservedStayVnd: number;
  reservedTransitVnd: number;
  reservedFoodVnd: number;
  contingencyVnd: number;
  availableActivityBudgetVnd: number;
  estimatedTotalVnd: number;
  isWithinBudget: boolean;
  feasiblePlaces: PricedPlaceItem[];
  excludedOverBudget: Array<PricedPlaceItem & { reason: string }>;
  citations: AiCitation[];
  disclaimers: string[];
}

export interface RankedPlaceItem extends PricedPlaceItem {
  score: number;
  matchReasons: string[];
}

export interface PurposeAlignedSelection {
  mainPurpose: ThemeType;
  selectedPlaces: RankedPlaceItem[];
  backupPlaces: RankedPlaceItem[];
  areaClustersUsed: string[];
  relevantPosts: Array<{
    id: number;
    slug: string;
    title: string;
    category: string;
    location: string;
    excerpt: string;
    themeKey: ThemeType;
  }>;
  scoringMethod: 'deterministic' | 'gemini_decisions';
}

export interface GeneratedItineraryMeta {
  title: string;
  stayMove: string;
  routeTip: string;
  tips: string[];
  hiddenGem?: string;
  totalEstimatedKm?: number;
}

export interface GeneratedSlotPlan {
  time: string;
  period: string;
  title: string;
  location: string;
  desc: string;
  isCustom?: boolean;
  areaCluster?: string;
  x?: number;
  y?: number;
  lat?: number;
  lng?: number;
  googleMapsQuery?: string;
  category?: string;
  duration?: string;
  estimatedCostVnd?: number;
}

export interface GeneratedDayPlan {
  day: string;
  title: string;
  area: string;
  slots: GeneratedSlotPlan[];
}

export interface GeneratedExpenseItem {
  id?: string;
  title: string;
  cat: ExpenseCategory;
  amount: number;
  note?: string;
}

export interface AiCitation {
  title: string;
  url: string;
  snippet?: string;
  source?: 'tavily' | 'cms' | 'directory';
}

export interface AutoEvalCheckItem {
  name: string;
  passed: boolean;
  details?: string;
}

export interface AutoEvalResult {
  passed: boolean;
  score: number;
  violations: string[];
  repairsApplied: string[];
  checks: AutoEvalCheckItem[];
}

export interface TraceRecord {
  traceId: string;
  lang: Language;
  userMessage: string;
  intent: AiChatIntent;
  status: 'needs_clarification' | 'completed';
  provider: string;
  engine?: string;
  toolsUsed?: string[];
  graphNodesVisited?: string[];
  reply?: string;
  citations?: AiCitation[];
  followUpAction?: FollowUpActionType;
  intake?: IntakeState;
  capacityPlan?: CapacityAndLogisticsPlan;
  budgetResult?: BudgetFeasibilityResult;
  purposeSelection?: PurposeAlignedSelection;
  evalResult?: AutoEvalResult;
  latencyMs: number;
  retryCount: number;
  feedbackRating?: 1 | -1 | null;
  feedbackComment?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AiStatusResponse {
  configured: boolean;
  model: string;
  decisionModel?: string;
  tavilyConfigured?: boolean;
  engine?: string;
  tools?: string[];
  toolsUsed?: string[];
  graphNodesVisited?: string[];
}

export interface AiFeedbackRequest {
  traceId: string;
  rating: 1 | -1;
  comment?: string;
}

export interface AiStopOperation {
  action: 'add' | 'remove';
  placeTitle: string;
  dayNumber?: number;
  time?: string;
  period?: string;
}

export interface AiChatHistoryItem {
  user: string;
  reply: string;
}

export interface AiChatRequest {
  message: string;
  lang: Language;
  isFollowUp: boolean;
  sessionId?: string;
  currentState: {
    theme: ThemeType;
    duration: DurationType;
    companion: CompanionType;
    budget: BudgetType;
    days: Array<{
      day: string;
      title: string;
      slots: Array<{ title: string; location: string; time: string }>;
    }>;
  };
  history?: AiChatHistoryItem[];
  draftIntake?: Partial<IntakeState>;
  currentExpenses?: Array<{ title: string; cat: ExpenseCategory; amount: number }>;
}

export interface AiChatResponse {
  intent: AiChatIntent;
  reply: string;
  shouldOpenPlanner: boolean;
  preferences: {
    theme: ThemeType;
    duration: DurationType;
    companion: CompanionType;
    budget: BudgetType;
  };
  resetItineraryToTheme: boolean;
  stopOperations: AiStopOperation[];
  suggestedTab?: PlannerTab;
  provider: string;
  engine?: string;
  toolsUsed?: string[];
  graphNodesVisited?: string[];
  traceId?: string;
  status?: 'needs_clarification' | 'completed';
  suggestedPresets?: SampleSchedulePreset[];
  itineraryMeta?: GeneratedItineraryMeta;
  generatedDays?: GeneratedDayPlan[];
  generatedExpenses?: GeneratedExpenseItem[];
  citations?: AiCitation[];
  draftIntake?: IntakeState;
  clarificationOptions?: QuickClarificationOption[];
  followUpAction?: FollowUpActionType;
  expensePatch?: ExpensePatch;
  stayMovePatch?: StayMovePatch;
  reorderOps?: ReorderDayOp[];
}

export interface ChatTurn {
  id: string;
  user: string;
  reply?: string;
  intent?: AiChatIntent;
  followUpAction?: FollowUpActionType;
  provider?: string;
  engine?: string;
  toolsUsed?: string[];
  graphNodesVisited?: string[];
  traceId?: string;
  status?: 'needs_clarification' | 'completed';
  suggestedPresets?: SampleSchedulePreset[];
  clarificationOptions?: QuickClarificationOption[];
  draftIntake?: Partial<IntakeState>;
  itineraryMeta?: GeneratedItineraryMeta;
  generatedDays?: GeneratedDayPlan[];
  generatedExpenses?: GeneratedExpenseItem[];
  citations?: AiCitation[];
  feedbackRating?: 1 | -1;
  isError?: boolean;
  aiSummary?: {
    title: string;
    duration: DurationType;
    companionLabel: string;
    budgetLabel: string;
    dayCount: number;
    totalStops: number;
  };
}

export interface PendingThinkingTurn {
  user: string;
  statusText: string;
}

export interface GlossaryItem {
  term: string;
  def: string;
}

export interface BentoArticleData {
  category: string;
  readTime: string;
  location: string;
  themeKey: ThemeType;
  title: string;
  paragraphs: string[];
  quote: string;
  quoteSource: string;
  glossary: GlossaryItem[];
}

export interface BentoCardItem {
  index: number;
  articleKey: BentoArticleKey;
  size: 'large' | 'small';
  colSpanClass: string;
  imageLayout: 'left' | 'top';
  image: string;
  imageAlt: string;
  imageBgClass: string;
  title: string;
  description: string;
  cta: string;
}

export interface RedEarthStory {
  id: string;
  tag: string;
  title: string;
  desc: string;
  cta: string;
  offsetClass: string;
  gradient: string;
  image: string;
  themeKey: ThemeType;
  location: string;
  fullParas: string[];
  quote: string;
}

export interface SeasonData {
  milestone: string;
  shortTimelineTitle: string;
  headline: string;
  subheadline: string;
  description: string;
  cta: string;
  caption: string;
  plannerTheme: ThemeType;
  videoId: string;
  videoStart: number;
  videoEnd: number | null;
  palette: {
    top: string;
    mid: string;
    bottom: string;
    accent: string;
  };
}

export interface CmsPostPublic {
  id: number;
  slug: string;
  legacyKey: string | null;
  section: CmsSectionType;
  status: PostStatus;
  sortOrder: number;
  title: string;
  excerpt: string;
  category: string;
  location: string;
  readTime: string;
  cta: string;
  image: string;
  imageAlt: string;
  themeKey: ThemeType;
  previewParagraphs: string[];
  contentHtml: string;
  quote: string;
  quoteSource: string;
  glossary: GlossaryItem[];
  bentoConfig?: BentoMetaConfig;
  storyConfig?: StoryMetaConfig;
  authorId: number | null;
  authorName: string;
  publishedAt: string | null;
  updatedAt: string;
  translationStatus: TranslationStatus;
}

export interface CmsPostAdmin extends CmsPostPublic {
  reviewNote: string;
  reviewedBy: number | null;
  titleEn: string;
  excerptEn: string;
  categoryEn: string;
  locationEn: string;
  readTimeEn: string;
  ctaEn: string;
  previewParagraphsEn: string[];
  contentHtmlEn: string;
  quoteEn: string;
  quoteSourceEn: string;
  glossaryEn: GlossaryItem[];
  translationProvider: string;
  translatedAt: string | null;
  createdAt: string;
}

export interface ModalArticlePayload {
  id?: number;
  slug?: string;
  category: string;
  readTime: string;
  location: string;
  title: string;
  excerpt?: string;
  image?: string;
  paragraphs: string[];
  quote: string;
  quoteSource: string;
  glossary: GlossaryItem[];
  themeKey: ThemeType;
  isPreviewMode?: boolean;
  unsavedPreviewPost?: CmsPostPublic;
}
