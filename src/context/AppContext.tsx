import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { bentoArticlesData, redEarthStories } from '../data/articles';
import { dakLakPlaceDirectory } from '../data/places';
import {
  budgetMultipliers,
  companionLabels,
  plannerCatalog,
  sampleSchedulePresets,
  themeLabels,
} from '../data/plannerCatalog';
import { AiApiError, aiApi } from '../services/aiApi';
import { cmsApi } from '../services/cmsApi';
import {
  AiChatIntent,
  AiCitation,
  BentoArticleKey,
  BudgetType,
  ChatTurn,
  CmsPostPublic,
  CompanionType,
  DurationType,
  ExpenseCategory,
  ExpenseItem,
  FollowUpActionType,
  GeneratedDayPlan,
  GeneratedExpenseItem,
  GeneratedItineraryMeta,
  IntakeState,
  ItineraryDay,
  ItinerarySlot,
  Language,
  MobileCanvasPane,
  ModalArticlePayload,
  PendingThinkingTurn,
  PlaceMeta,
  PlannerTab,
  QuickClarificationOption,
  SampleSchedulePreset,
  ThemeType,
} from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { haversineDistanceKm, resolveGeoForStop } from '../utils/googleMaps';
import { getFallbackBentoPosts, getFallbackStoryPosts } from '../utils/legacyFallbackPosts';
import {
  applyAiStopOperations,
  applyExpensePatch,
  applyReorderOps,
  buildCatalogWorkingDays,
  buildDefaultExpenses,
  buildGeneratedExpenses,
  buildGeneratedWorkingDays,
  flattenStops,
  getDayCount,
  parsePromptPreferences,
} from '../utils/plannerHelpers';

interface CanvasSnapshot {
  workingDays: ItineraryDay[];
  expenses: ExpenseItem[];
  selectedStopIndex: number;
  itineraryMeta: GeneratedItineraryMeta | null;
  theme: ThemeType;
  duration: DurationType;
  budget: BudgetType;
  companion: CompanionType;
  activeSampleKey: ThemeType | '';
}

interface AppContextValue {
  // Language & Toast
  lang: Language;
  setLanguage: (nextLang: Language) => void;
  toastMessage: string;
  toastVisible: boolean;
  showToast: (msg: string) => void;

  // Culture focus highlight in BentoOverview
  cultureFocusActive: boolean;
  triggerIndigenousCultureHighlight: () => void;

  // CMS Public Blog Posts
  bentoPosts: CmsPostPublic[];
  storyPosts: CmsPostPublic[];
  refreshPublicPosts: () => Promise<void>;

  // Editorial Modal & Design System Drawer
  modalArticle: ModalArticlePayload | null;
  openBentoArticle: (key: BentoArticleKey) => void;
  openRedEarthStory: (index: number) => void;
  openPostPreview: (
    post: CmsPostPublic,
    opts?: { isPreviewMode?: boolean; unsavedPreviewPost?: CmsPostPublic }
  ) => void;
  closeArticleModal: () => void;
  addModalTopicToPlanner: () => void;
  planForTopic: (theme: ThemeType, title: string) => void;

  isDsDrawerOpen: boolean;
  openDsDrawer: () => void;
  closeDsDrawer: () => void;

  // Planner State
  companion: CompanionType;
  duration: DurationType;
  budget: BudgetType;
  theme: ThemeType;
  activeSampleKey: ThemeType | '';
  isSubmitted: boolean;
  isThinking: boolean;
  activeTab: PlannerTab;
  mapDayFilter: 'all' | number;
  scheduleDayFilter: 'all' | number;
  selectedStopIndex: number;
  showMapPlaceCard: boolean;
  mobilePane: MobileCanvasPane;
  workingDays: ItineraryDay[];
  expenses: ExpenseItem[];
  itineraryMeta: GeneratedItineraryMeta | null;
  collapsedDays: Record<number, boolean>;
  chatHistory: ChatTurn[];
  pendingTurn: PendingThinkingTurn | null;
  isPopupOpen: boolean;
  highlightedSlotIdx: number | null;
  canUndo: boolean;
  canRedo: boolean;

  // Planner Actions
  selectSampleSchedule: (presetKey: ThemeType) => void;
  applyClarificationPreset: (presetKey: ThemeType) => void;
  submitClarificationOption: (valueText: string) => void;
  skipClarificationToGeneralQa: (originalQuestion?: string) => void;
  submitMainChatPrompt: (rawPrompt: string) => void;
  submitPopupChatPrompt: (rawPrompt: string) => void;
  submitChatFeedback: (turnId: string, traceId: string, rating: 1 | -1) => Promise<void>;
  selectPlannerChip: (group: 'theme' | 'budget' | 'duration' | 'companion', value: string) => void;
  resetPlannerSplitView: () => void;
  switchPlannerResultTab: (tab: PlannerTab) => void;
  switchMobileCanvasPane: (pane: MobileCanvasPane) => void;
  setMapDayFilter: (val: 'all' | number) => void;
  setScheduleDayFilter: (val: 'all' | number) => void;
  selectMapStop: (globalIdx: number, shouldOpenCard?: boolean) => void;
  closeMapPlaceCard: () => void;
  toggleDayAccordion: (dIdx: number) => void;
  reorderStop: (srcDayIdx: number, srcSlotIdx: number, targetDayIdx: number, targetSlotIdx: number) => void;
  moveStopStep: (dIdx: number, sIdx: number, delta: number) => void;
  removeStopFromDay: (dIdx: number, sIdx: number) => void;
  optimizeDayRoute: (dIdx: number) => void;
  autoFillDay: (dIdx: number) => void;
  addPlaceToDay: (dIdx: number, place: PlaceMeta) => void;
  addCustomExpense: (title: string, cat: ExpenseCategory, amount: number) => void;
  removeCustomExpense: (idx: number) => void;
  canvasUndo: () => void;
  canvasRedo: () => void;
  openRelatedPlannerStory: () => void;
  copyTailoredItinerary: () => void;
  locateStopOnMap: (globalIdx: number) => void;
  jumpFromMapStopToSchedule: () => void;
  openPopupChat: () => void;
  collapsePopupToFab: () => void;
  planForSeason: (theme: ThemeType, headline: string, subheadline: string, milestone: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('vi');
  const [toastMessage, setToastMessage] = useState('Đã cập nhật thông tin');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  const [cultureFocusActive, setCultureFocusActive] = useState(false);
  const cultureFocusTimerRef = useRef<number | null>(null);

  const [bentoPosts, setBentoPosts] = useState<CmsPostPublic[]>(() => getFallbackBentoPosts());
  const [storyPosts, setStoryPosts] = useState<CmsPostPublic[]>(() => getFallbackStoryPosts());

  const [modalArticle, setModalArticle] = useState<ModalArticlePayload | null>(null);
  const [isDsDrawerOpen, setIsDsDrawerOpen] = useState(false);

  // Planner Core State
  const [companion, setCompanion] = useState<CompanionType>('couple');
  const [duration, setDuration] = useState<DurationType>('3N2D');
  const [budget, setBudget] = useState<BudgetType>('standard');
  const [theme, setTheme] = useState<ThemeType>('coffee');
  const [activeSampleKey, setActiveSampleKey] = useState<ThemeType | ''>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [activeTab, setActiveTab] = useState<PlannerTab>('map');
  const [mapDayFilter, setMapDayFilterState] = useState<'all' | number>('all');
  const [scheduleDayFilter, setScheduleDayFilterState] = useState<'all' | number>('all');
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);
  const [showMapPlaceCard, setShowMapPlaceCard] = useState(true);
  const [mobilePane, setMobilePane] = useState<MobileCanvasPane>('itinerary');
  const [workingDays, setWorkingDays] = useState<ItineraryDay[]>(() =>
    buildCatalogWorkingDays('coffee', '3N2D')
  );
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() =>
    buildDefaultExpenses('standard', '3N2D')
  );
  const [itineraryMeta, setItineraryMeta] = useState<GeneratedItineraryMeta | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Record<number, boolean>>({});
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [draftIntake, setDraftIntake] = useState<Partial<IntakeState> | null>(null);
  const [pendingTurn, setPendingTurn] = useState<PendingThinkingTurn | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [highlightedSlotIdx, setHighlightedSlotIdx] = useState<number | null>(null);

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<CanvasSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasSnapshot[]>([]);

  const statusTimerRef = useRef<number | null>(null);
  const thinkingTimerRef = useRef<number | null>(null);
  const highlightSlotTimerRef = useRef<number | null>(null);
  const chatRequestIdRef = useRef(0);
  const chatAbortControllerRef = useRef<AbortController | null>(null);
  const chatSessionIdRef = useRef<string>(
    `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  // Refs for latest values inside async timers
  const stateRef = useRef({
    lang,
    isSubmitted,
    companion,
    duration,
    budget,
    theme,
    activeSampleKey,
    workingDays,
    expenses,
    itineraryMeta,
    selectedStopIndex,
    chatHistory,
    draftIntake,
    undoStack,
    redoStack,
  });
  stateRef.current = {
    lang,
    isSubmitted,
    companion,
    duration,
    budget,
    theme,
    activeSampleKey,
    workingDays,
    expenses,
    itineraryMeta,
    selectedStopIndex,
    chatHistory,
    draftIntake,
    undoStack,
    redoStack,
  };

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastVisible(false);
    }, 2800);
  }, []);

  const setLanguage = useCallback(
    (nextLang: Language) => {
      setLangState(nextLang);
      showToast(
        nextLang === 'vi'
          ? 'Đã chuyển ngôn ngữ sang Tiếng Việt'
          : 'Switched interface language to English'
      );
    },
    [showToast]
  );

  // Body scroll lock when modal, drawer, or full-screen canvas is open
  useEffect(() => {
    const shouldLock = isSubmitted || modalArticle !== null || isDsDrawerOpen;
    document.body.style.overflow = shouldLock ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSubmitted, modalArticle, isDsDrawerOpen]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (cultureFocusTimerRef.current) window.clearTimeout(cultureFocusTimerRef.current);
      if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
      if (thinkingTimerRef.current) window.clearTimeout(thinkingTimerRef.current);
      if (highlightSlotTimerRef.current) window.clearTimeout(highlightSlotTimerRef.current);
    };
  }, []);

  const triggerIndigenousCultureHighlight = useCallback(() => {
    const section = document.getElementById('bento-overview');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setCultureFocusActive(true);
    showToast('Đang làm nổi bật: Văn hóa Cồng chiêng & Chế độ Mẫu hệ Ê Đê');
    if (cultureFocusTimerRef.current) window.clearTimeout(cultureFocusTimerRef.current);
    cultureFocusTimerRef.current = window.setTimeout(() => {
      setCultureFocusActive(false);
    }, 4200);
  }, [showToast]);

  const refreshPublicPosts = useCallback(async () => {
    try {
      const [bento, stories] = await Promise.all([
        cmsApi.getPublicPosts(lang, 'bento'),
        cmsApi.getPublicPosts(lang, 'stories'),
      ]);
      setBentoPosts(bento);
      setStoryPosts(stories);
    } catch {
      // Keep current/fallback posts if API server is unreachable
    }
  }, [lang]);

  useEffect(() => {
    void refreshPublicPosts();
  }, [refreshPublicPosts]);

  const openPostPreview = useCallback(
    (
      post: CmsPostPublic,
      opts?: { isPreviewMode?: boolean; unsavedPreviewPost?: CmsPostPublic }
    ) => {
      setModalArticle({
        id: post.id,
        slug: post.slug,
        category: post.category,
        readTime: post.readTime,
        location: post.location,
        title: post.title,
        excerpt: post.excerpt,
        image: post.image,
        paragraphs:
          post.previewParagraphs && post.previewParagraphs.length > 0
            ? post.previewParagraphs
            : [post.excerpt],
        quote: post.quote,
        quoteSource: post.quoteSource,
        glossary: post.glossary || [],
        themeKey: post.themeKey,
        isPreviewMode: opts?.isPreviewMode,
        unsavedPreviewPost: opts?.unsavedPreviewPost,
      });
    },
    []
  );

  const openBentoArticle = useCallback(
    (key: BentoArticleKey) => {
      const cmsMatch = bentoPosts.find((p) => p.legacyKey === key || p.slug === key);
      if (cmsMatch) {
        openPostPreview(cmsMatch);
        return;
      }
      const data = bentoArticlesData[key];
      if (!data) return;
      setModalArticle({
        slug: key,
        category: data.category,
        readTime: data.readTime,
        location: data.location,
        title: data.title,
        paragraphs: data.paragraphs,
        quote: data.quote,
        quoteSource: data.quoteSource,
        glossary: data.glossary,
        themeKey: data.themeKey,
      });
    },
    [bentoPosts, openPostPreview]
  );

  const openRedEarthStory = useCallback(
    (idx: number) => {
      const cmsStory = storyPosts[idx];
      if (cmsStory) {
        openPostPreview(cmsStory);
        return;
      }
      const story = redEarthStories[idx];
      if (!story) return;
      setModalArticle({
        slug: story.id,
        category: story.tag,
        readTime: '5 phút đọc',
        location: story.location,
        title: story.title,
        image: story.image,
        paragraphs: story.fullParas,
        quote: story.quote,
        quoteSource: `— Chuyện của đất đỏ Đắk Lắk • ${story.location}`,
        glossary: [
          {
            term: 'Trải nghiệm gợi ý',
            def: `Ghé thăm ${story.location} vào buổi sớm để cảm nhận trọn vẹn nhịp sống bản địa.`,
          },
          {
            term: 'Kết nối hành trình',
            def: 'Có thể tích hợp trực tiếp vào lịch trình 2N1Đ hoặc 3N2Đ tại Đắk Lắk.',
          },
        ],
        themeKey: story.themeKey,
      });
    },
    [openPostPreview, storyPosts]
  );

  const closeArticleModal = useCallback(() => {
    setModalArticle(null);
  }, []);

  const openDsDrawer = useCallback(() => setIsDsDrawerOpen(true), []);
  const closeDsDrawer = useCallback(() => setIsDsDrawerOpen(false), []);

  // Escape key closes modal or drawer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalArticle(null);
        setIsDsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const captureSnapshot = useCallback((): CanvasSnapshot => {
    const s = stateRef.current;
    return JSON.parse(
      JSON.stringify({
        workingDays: s.workingDays,
        expenses: s.expenses,
        selectedStopIndex: s.selectedStopIndex,
        itineraryMeta: s.itineraryMeta,
        theme: s.theme,
        duration: s.duration,
        budget: s.budget,
        companion: s.companion,
        activeSampleKey: s.activeSampleKey,
      })
    );
  }, []);

  const applySnapshot = useCallback((snap: CanvasSnapshot) => {
    setWorkingDays(snap.workingDays);
    setExpenses(snap.expenses);
    setSelectedStopIndex(snap.selectedStopIndex || 0);
    setItineraryMeta(snap.itineraryMeta ?? null);
    setTheme(snap.theme);
    setDuration(snap.duration);
    setBudget(snap.budget);
    setCompanion(snap.companion);
    setActiveSampleKey(snap.activeSampleKey ?? '');
    setMapDayFilterState('all');
    setScheduleDayFilterState('all');
    setCollapsedDays({});
  }, []);

  const clearHistory = useCallback(() => {
    stateRef.current.undoStack = [];
    stateRef.current.redoStack = [];
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const pushSnapshot = useCallback(() => {
    const snap = captureSnapshot();
    const nextUndo = [...stateRef.current.undoStack.slice(-29), snap];
    stateRef.current.undoStack = nextUndo;
    stateRef.current.redoStack = [];
    setUndoStack(nextUndo);
    setRedoStack([]);
  }, [captureSnapshot]);

  const canvasUndo = useCallback(() => {
    const prev = stateRef.current.undoStack;
    if (prev.length === 0) return;
    const last = prev[prev.length - 1];
    const currentSnap = captureSnapshot();
    const nextUndo = prev.slice(0, -1);
    const nextRedo = [...stateRef.current.redoStack, currentSnap];
    stateRef.current.undoStack = nextUndo;
    stateRef.current.redoStack = nextRedo;
    setUndoStack(nextUndo);
    setRedoStack(nextRedo);
    applySnapshot(last);
    showToast('Đã hoàn tác thay đổi gần nhất');
  }, [applySnapshot, captureSnapshot, showToast]);

  const canvasRedo = useCallback(() => {
    const prev = stateRef.current.redoStack;
    if (prev.length === 0) return;
    const next = prev[prev.length - 1];
    const currentSnap = captureSnapshot();
    const nextRedo = prev.slice(0, -1);
    const nextUndo = [...stateRef.current.undoStack, currentSnap];
    stateRef.current.redoStack = nextRedo;
    stateRef.current.undoStack = nextUndo;
    setRedoStack(nextRedo);
    setUndoStack(nextUndo);
    applySnapshot(next);
    showToast('Đã khôi phục lại thao tác vừa hoàn tác');
  }, [applySnapshot, captureSnapshot, showToast]);

  const createChatTurn = useCallback(
    (
      userPrompt: string,
      opts: {
        theme: ThemeType;
        duration: DurationType;
        companion: CompanionType;
        budget: BudgetType;
        days: ItineraryDay[];
        reply?: string;
        intent?: AiChatIntent;
        followUpAction?: FollowUpActionType;
        provider?: string;
        engine?: string;
        toolsUsed?: string[];
        graphNodesVisited?: string[];
        includeSummary?: boolean;
        traceId?: string;
        status?: 'needs_clarification' | 'completed';
        suggestedPresets?: SampleSchedulePreset[];
        clarificationOptions?: QuickClarificationOption[];
        draftIntake?: Partial<IntakeState>;
        itineraryMeta?: GeneratedItineraryMeta;
        generatedDays?: GeneratedDayPlan[];
        generatedExpenses?: GeneratedExpenseItem[];
        citations?: AiCitation[];
        isError?: boolean;
      }
    ): ChatTurn => {
      const cat = plannerCatalog[opts.theme];
      const bud = budgetMultipliers[opts.budget];
      const dayCount = getDayCount(opts.duration);
      const totalStops = flattenStops(opts.days, 'all').length;
      const includeSummary = opts.includeSummary !== false;

      return {
        id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        user: userPrompt,
        reply: opts.reply,
        intent: opts.intent,
        followUpAction: opts.followUpAction,
        provider: opts.provider,
        engine: opts.engine,
        toolsUsed: opts.toolsUsed,
        graphNodesVisited: opts.graphNodesVisited,
        traceId: opts.traceId,
        status: opts.status,
        suggestedPresets: opts.suggestedPresets,
        clarificationOptions: opts.clarificationOptions,
        draftIntake: opts.draftIntake,
        itineraryMeta: opts.itineraryMeta,
        generatedDays: opts.generatedDays,
        generatedExpenses: opts.generatedExpenses,
        citations: opts.citations,
        isError: opts.isError,
        aiSummary: includeSummary
          ? {
              title: opts.itineraryMeta?.title || cat.title,
              duration: opts.duration,
              companionLabel: companionLabels[opts.companion],
              budgetLabel: bud.label,
              dayCount,
              totalStops,
            }
          : undefined,
      };
    },
    []
  );

  const runChatSubmission = useCallback(
    async (
      rawPrompt: string,
      opts: {
        isPopup: boolean;
        initialPrefs?: {
          companion: CompanionType;
          duration: DurationType;
          budget: BudgetType;
          theme: ThemeType;
        };
      }
    ) => {
      if (isThinking) return;
      const prompt =
        rawPrompt.trim() ||
        'Thiết kế lịch trình 3N2Đ khám phá Cà phê Đặc sản & Sương sớm Hồ Lắk cho cặp đôi';

      const requestId = ++chatRequestIdRef.current;
      if (chatAbortControllerRef.current) {
        chatAbortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      chatAbortControllerRef.current = abortController;

      const snapshotState = stateRef.current;
      const isEn = snapshotState.lang === 'en';

      setIsThinking(true);
      setPendingTurn({
        user: prompt,
        statusText: opts.isPopup
          ? isEn
            ? 'Analyzing request & checking Đắk Lắk knowledge / live sources...'
            : 'Đang phân tích yêu cầu, dữ liệu bản địa & điều chỉnh...'
          : isEn
            ? 'Analyzing your question & searching Đắk Lắk sources...'
            : 'Đang phân tích câu hỏi & tra cứu dữ liệu Đắk Lắk...',
      });

      if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
      if (thinkingTimerRef.current) window.clearTimeout(thinkingTimerRef.current);

      statusTimerRef.current = window.setTimeout(
        () => {
          setPendingTurn((prev) =>
            prev
              ? {
                  ...prev,
                  statusText: opts.isPopup
                    ? isEn
                      ? 'Synthesizing answer, map updates & local tips...'
                      : 'Đang tổng hợp phản hồi, bản đồ & mẹo bản địa...'
                    : isEn
                      ? 'Synthesizing grounded insights & recommendations...'
                      : 'Đang tổng hợp thông tin thực tế & gợi ý phù hợp...',
                }
              : null
          );
        },
        opts.isPopup ? 700 : 1000
      );

      const basePrefs = opts.initialPrefs || {
        companion: snapshotState.companion,
        duration: snapshotState.duration,
        budget: snapshotState.budget,
        theme: snapshotState.theme,
      };

      const isFollowUp = opts.isPopup && !snapshotState.draftIntake?.needsClarification;

      try {
        const aiRes = await aiApi.chat(
          {
            message: prompt,
            lang: snapshotState.lang,
            isFollowUp,
            sessionId: chatSessionIdRef.current,
            draftIntake: snapshotState.draftIntake || undefined,
            currentExpenses: snapshotState.expenses.map((e) => ({
              title: e.title,
              cat: e.cat,
              amount: e.amount,
            })),
            currentState: {
              ...basePrefs,
              days: snapshotState.workingDays.map((d) => ({
                day: d.day,
                title: d.title,
                slots: d.slots.map((s) => ({
                  title: s.title,
                  location: s.location,
                  time: s.time,
                })),
              })),
            },
            history: snapshotState.chatHistory
              .slice(-6)
              .map((t) => ({
                user: t.user,
                reply:
                  t.reply ||
                  (t.aiSummary
                    ? `${t.aiSummary.title} (${t.aiSummary.duration}, ${t.aiSummary.dayCount} ngày)`
                    : ''),
              }))
              .filter((t) => t.reply),
          },
          { signal: abortController.signal }
        );

        if (requestId !== chatRequestIdRef.current) return;
        if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);

        if (aiRes.status === 'needs_clarification') {
          setDraftIntake(aiRes.draftIntake || null);
          setChatHistory((prev) => [
            ...prev,
            createChatTurn(prompt, {
              ...aiRes.preferences,
              days: snapshotState.workingDays,
              reply: aiRes.reply,
              intent: aiRes.intent,
              followUpAction: aiRes.followUpAction,
              provider: aiRes.provider,
              engine: aiRes.engine,
              toolsUsed: aiRes.toolsUsed,
              graphNodesVisited: aiRes.graphNodesVisited,
              traceId: aiRes.traceId,
              status: 'needs_clarification',
              suggestedPresets: aiRes.suggestedPresets,
              clarificationOptions: aiRes.clarificationOptions,
              draftIntake: aiRes.draftIntake,
              citations: aiRes.citations,
              includeSummary: false,
            }),
          ]);
          return;
        }

        const nextPrefs = aiRes.preferences;
        const isItineraryTurn =
          aiRes.intent !== 'general_qa' && aiRes.followUpAction !== 'current_trip_qa';
        const isFullReplan = !aiRes.followUpAction || aiRes.followUpAction === 'full_replan';

        if (isItineraryTurn) {
          setDraftIntake(null);
        } else if (aiRes.draftIntake !== undefined) {
          setDraftIntake(aiRes.draftIntake || null);
        }

        let nextDays = snapshotState.workingDays;
        let nextExpenses = snapshotState.expenses;
        let nextMeta: GeneratedItineraryMeta | null = snapshotState.itineraryMeta;
        let itineraryChanged = false;
        let addedStopTitle: string | undefined;

        if (isItineraryTurn) {
          if (opts.isPopup) {
            pushSnapshot();
          }

          if (aiRes.generatedDays && aiRes.generatedDays.length > 0) {
            const hydratedDays = buildGeneratedWorkingDays(aiRes.generatedDays, nextPrefs.theme).map(
              (day, dIdx) => ({
                ...day,
                slots: day.slots.map((slot, sIdx) => {
                  const srcSlot = aiRes.generatedDays?.[dIdx]?.slots?.[sIdx];
                  return {
                    ...slot,
                    ...(srcSlot?.isCustom !== undefined ? { isCustom: srcSlot.isCustom } : {}),
                    ...(srcSlot?.areaCluster ? { areaCluster: srcSlot.areaCluster } : {}),
                    ...(typeof srcSlot?.estimatedCostVnd === 'number'
                      ? { estimatedCostVnd: srcSlot.estimatedCostVnd }
                      : {}),
                  };
                }),
              })
            );
            if (hydratedDays.length > 0) {
              nextDays = hydratedDays;
              nextMeta = aiRes.itineraryMeta || null;
              itineraryChanged = true;
            }
          } else if (
            aiRes.resetItineraryToTheme ||
            (isFullReplan && nextPrefs.duration !== basePrefs.duration)
          ) {
            nextDays = buildCatalogWorkingDays(nextPrefs.theme, nextPrefs.duration);
            nextMeta = aiRes.itineraryMeta || null;
            itineraryChanged = true;
          } else if (aiRes.itineraryMeta) {
            nextMeta = aiRes.itineraryMeta;
          }

          if (aiRes.stayMovePatch?.stayMove) {
            const fallbackCat = plannerCatalog[nextPrefs.theme] || plannerCatalog.coffee;
            nextMeta = {
              title: nextMeta?.title || fallbackCat.title,
              stayMove: aiRes.stayMovePatch.stayMove,
              routeTip: nextMeta?.routeTip || fallbackCat.routeTip,
              tips: nextMeta?.tips || [],
              hiddenGem: nextMeta?.hiddenGem || fallbackCat.hiddenGem,
              totalEstimatedKm: nextMeta?.totalEstimatedKm,
            };
          }

          if (aiRes.generatedExpenses && aiRes.generatedExpenses.length > 0) {
            const hydratedExpenses = buildGeneratedExpenses(aiRes.generatedExpenses).map(
              (exp, idx) => {
                const srcExp = aiRes.generatedExpenses?.[idx];
                return {
                  ...exp,
                  ...(srcExp?.note ? { note: srcExp.note } : {}),
                };
              }
            );
            if (hydratedExpenses.length > 0) {
              nextExpenses = hydratedExpenses;
            }
          } else if (aiRes.expensePatch) {
            nextExpenses = applyExpensePatch(
              snapshotState.expenses,
              aiRes.expensePatch,
              nextPrefs.duration
            );
          } else if (
            aiRes.resetItineraryToTheme ||
            (isFullReplan &&
              (nextPrefs.duration !== basePrefs.duration || nextPrefs.budget !== basePrefs.budget))
          ) {
            nextExpenses = buildDefaultExpenses(nextPrefs.budget, nextPrefs.duration);
          }

          if (aiRes.reorderOps && aiRes.reorderOps.length > 0) {
            const reorderRes = applyReorderOps(nextDays, aiRes.reorderOps);
            nextDays = reorderRes.nextDays;
            if (reorderRes.changed) itineraryChanged = true;
          }

          if (aiRes.stopOperations && aiRes.stopOperations.length > 0) {
            const opsRes = applyAiStopOperations(nextDays, aiRes.stopOperations, nextPrefs.theme);
            nextDays = opsRes.nextDays;
            if (opsRes.changed) {
              itineraryChanged = true;
              addedStopTitle = opsRes.addedStopTitle;
            }
          }

          setCompanion(nextPrefs.companion);
          setDuration(nextPrefs.duration);
          setBudget(nextPrefs.budget);
          setTheme(nextPrefs.theme);
          setActiveSampleKey(nextPrefs.theme);
          setWorkingDays(nextDays);
          setExpenses(nextExpenses);
          setItineraryMeta(nextMeta);

          if (itineraryChanged) {
            setMapDayFilterState('all');
            setScheduleDayFilterState('all');
            let nextSelectedIdx = 0;
            if (addedStopTitle) {
              const targetLower = addedStopTitle.trim().toLowerCase();
              const matchedStop = flattenStops(nextDays, 'all').find(
                (s) => s.title.toLowerCase() === targetLower
              );
              if (matchedStop) {
                nextSelectedIdx = matchedStop.globalIdx;
              }
            }
            setSelectedStopIndex(nextSelectedIdx);
            setShowMapPlaceCard(true);
            setCollapsedDays({});
          }

          if (!opts.isPopup && aiRes.shouldOpenPlanner) {
            clearHistory();
            setMobilePane('itinerary');
            setIsPopupOpen(false);
            setActiveTab(aiRes.suggestedTab || 'map');
            setIsSubmitted(true);
            showToast('AI đã khởi tạo không gian tư vấn hành trình Split-Screen!');
          } else if (opts.isPopup) {
            if (aiRes.suggestedTab) {
              setActiveTab(aiRes.suggestedTab);
            }
            showToast('AI đã cập nhật tư vấn & lịch trình trên Canvas!');
          }
        }

        setChatHistory((prev) => [
          ...prev,
          createChatTurn(prompt, {
            ...nextPrefs,
            days: nextDays,
            reply: aiRes.reply,
            intent: aiRes.intent,
            followUpAction: aiRes.followUpAction,
            provider: aiRes.provider,
            engine: aiRes.engine,
            toolsUsed: aiRes.toolsUsed,
            graphNodesVisited: aiRes.graphNodesVisited,
            traceId: aiRes.traceId,
            status: aiRes.status || 'completed',
            suggestedPresets: aiRes.suggestedPresets,
            clarificationOptions: aiRes.clarificationOptions,
            draftIntake: aiRes.draftIntake,
            itineraryMeta: nextMeta || aiRes.itineraryMeta,
            generatedDays: aiRes.generatedDays,
            generatedExpenses: aiRes.generatedExpenses,
            citations: aiRes.citations,
            includeSummary: isItineraryTurn,
          }),
        ]);
      } catch (err) {
        if (requestId !== chatRequestIdRef.current) return;
        if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);

        // Non-destructive handling for HTTP rate-limit, timeout, validation error, or general Q&A queries
        const isRecoverableApiError =
          err instanceof AiApiError && (err.isRateLimit || err.isClientError || err.isTimeout);
        const hasExplicitPlanVerb =
          /(lên lịch|lịch trình mới|thiết kế|tạo tour|đổi sang|chuyển sang|cập nhật lịch|thêm điểm|bỏ điểm|xóa điểm|plan.*trip|create itinerary|new itinerary)/i.test(
            prompt
          );
        const looksLikeGeneralQuestion =
          !hasExplicitPlanVerb &&
          (/[?]|(là gì|ở đâu|khi nào|mùa nào|tháng mấy|bao nhiêu|giá vé|thời tiết|ăn gì|chơi gì|mua gì|có nên|kinh nghiệm|review|lưu ý|what|when|where|which|how|why|weather|season|price|ticket|recommend)/i.test(
            prompt
          ));

        if (isRecoverableApiError || looksLikeGeneralQuestion) {
          const fallbackReply =
            err instanceof AiApiError
              ? err.message
              : isEn
                ? 'Network connection is temporarily unavailable. For Đắk Lắk travel: peak dry & coffee harvest season runs Nov–Mar (18–24°C), World Coffee Museum ticket is ~150,000 VND, Dray Nur Waterfall is ~40,000 VND, and ethical elephant walks are hosted at Yok Đôn National Park.'
                : 'Kết nối máy chủ AI tạm thời gián đoạn. Thông tin tham khảo nhanh tại Đắk Lắk: mùa khô & mùa hoa/thu hoạch cà phê đẹp nhất từ tháng 11 – tháng 3 (18–24°C); vé Bảo tàng Thế giới Cà phê ~150.000đ, thác Dray Nur ~40.000đ; tour đi bộ ngắm voi thân thiện (không cưỡi voi) tại VQG Yok Đôn.';

          if (err instanceof AiApiError) {
            showToast(err.message);
          }

          setChatHistory((prev) => [
            ...prev,
            createChatTurn(prompt, {
              ...basePrefs,
              days: snapshotState.workingDays,
              reply: fallbackReply,
              intent: 'general_qa',
              provider: 'client-fallback',
              includeSummary: false,
              isError: isRecoverableApiError,
            }),
          ]);
          return;
        }

        console.warn('[AI Chat] API unavailable, falling back to local parser:', err);

        if (opts.isPopup) {
          pushSnapshot();
        }

        const parsed = parsePromptPreferences(prompt, basePrefs);
        const nextDays = buildCatalogWorkingDays(parsed.theme, parsed.duration);
        const nextExpenses = buildDefaultExpenses(parsed.budget, parsed.duration);

        setDraftIntake(null);
        setCompanion(parsed.companion);
        setDuration(parsed.duration);
        setBudget(parsed.budget);
        setTheme(parsed.theme);
        setActiveSampleKey(parsed.theme);
        setMapDayFilterState('all');
        setScheduleDayFilterState('all');
        setSelectedStopIndex(0);
        setActiveTab('map');
        setShowMapPlaceCard(true);
        setCollapsedDays({});
        setWorkingDays(nextDays);
        setExpenses(nextExpenses);
        setItineraryMeta(null);

        if (!opts.isPopup) {
          clearHistory();
          setMobilePane('itinerary');
          setIsPopupOpen(false);
          setIsSubmitted(true);
          showToast('Đã khởi tạo không gian tư vấn hành trình (chế độ ngoại tuyến)!');
        } else {
          showToast('Đã cập nhật lịch trình trên Canvas!');
        }

        setChatHistory((prev) => [
          ...prev,
          createChatTurn(prompt, {
            ...parsed,
            days: nextDays,
            intent: 'update_itinerary',
            provider: 'client-fallback',
            includeSummary: true,
          }),
        ]);
      } finally {
        if (requestId === chatRequestIdRef.current) {
          setPendingTurn(null);
          setIsThinking(false);
        }
      }
    },
    [clearHistory, createChatTurn, isThinking, pushSnapshot, showToast]
  );

  const applySamplePresetRecord = useCallback(
    (preset: SampleSchedulePreset) => {
      if (stateRef.current.isSubmitted) {
        pushSnapshot();
      } else {
        clearHistory();
      }

      const nextDays = buildCatalogWorkingDays(preset.theme, preset.duration);
      const nextExpenses = buildDefaultExpenses(preset.budget, preset.duration);

      setCompanion(preset.companion);
      setDuration(preset.duration);
      setBudget(preset.budget);
      setTheme(preset.theme);
      setActiveSampleKey(preset.key);
      setMapDayFilterState('all');
      setScheduleDayFilterState('all');
      setSelectedStopIndex(0);
      setActiveTab('map');
      setShowMapPlaceCard(true);
      setCollapsedDays({});
      setWorkingDays(nextDays);
      setExpenses(nextExpenses);
      setItineraryMeta(null);
      setDraftIntake(null);
      setMobilePane('itinerary');
      setIsPopupOpen(false);
      setIsSubmitted(true);
      setChatHistory((prev) => [
        ...prev,
        createChatTurn(preset.prompt, {
          theme: preset.theme,
          duration: preset.duration,
          companion: preset.companion,
          budget: preset.budget,
          days: nextDays,
          intent: 'update_itinerary',
          provider: 'preset',
          includeSummary: true,
        }),
      ]);
      showToast('Đã khởi tạo không gian tư vấn hành trình Split-Screen!');
    },
    [clearHistory, createChatTurn, pushSnapshot, showToast]
  );

  const selectSampleSchedule = useCallback(
    (presetKey: ThemeType) => {
      if (isThinking) return;
      const preset =
        sampleSchedulePresets.find((p) => p.key === presetKey) || sampleSchedulePresets[0];
      applySamplePresetRecord(preset);
    },
    [applySamplePresetRecord, isThinking]
  );

  const applyClarificationPreset = useCallback(
    (presetKey: ThemeType) => {
      if (isThinking) return;
      const fromHistory = [...stateRef.current.chatHistory]
        .reverse()
        .flatMap((t) => t.suggestedPresets || [])
        .find((p) => p.key === presetKey);
      const preset =
        fromHistory ||
        sampleSchedulePresets.find((p) => p.key === presetKey) ||
        sampleSchedulePresets[0];
      applySamplePresetRecord(preset);
    },
    [applySamplePresetRecord, isThinking]
  );

  const submitClarificationOption = useCallback(
    (valueText: string) => {
      if (isThinking || !valueText.trim()) return;
      runChatSubmission(valueText, { isPopup: stateRef.current.isSubmitted });
    },
    [isThinking, runChatSubmission]
  );

  const skipClarificationToGeneralQa = useCallback(
    (originalQuestion?: string) => {
      if (isThinking) return;
      const lastUserPrompt =
        originalQuestion?.trim() ||
        stateRef.current.draftIntake?.rawUserGoal?.trim() ||
        [...stateRef.current.chatHistory].reverse().find((t) => t.user.trim())?.user ||
        '';
      stateRef.current.draftIntake = null;
      setDraftIntake(null);
      const qaPrompt =
        stateRef.current.lang === 'en'
          ? `Please answer this as a general travel question (without building an itinerary): ${lastUserPrompt || 'What are the top highlights and tips for visiting Đắk Lắk?'}`
          : `Giải đáp thông tin tư vấn cho câu hỏi này (chưa cần lên lịch trình): ${lastUserPrompt || 'Chia sẻ kinh nghiệm và điểm đến nổi bật nhất khi du lịch Đắk Lắk?'}`;
      runChatSubmission(qaPrompt, { isPopup: stateRef.current.isSubmitted });
    },
    [isThinking, runChatSubmission]
  );

  const submitMainChatPrompt = useCallback(
    (rawPrompt: string) => {
      runChatSubmission(rawPrompt, { isPopup: false });
    },
    [runChatSubmission]
  );

  const submitPopupChatPrompt = useCallback(
    (rawPrompt: string) => {
      if (!rawPrompt.trim()) return;
      setIsPopupOpen(true);
      runChatSubmission(rawPrompt, { isPopup: true });
    },
    [runChatSubmission]
  );

  const submitChatFeedback = useCallback(
    async (turnId: string, traceId: string, rating: 1 | -1) => {
      if (!traceId) return;
      const prevTurn = stateRef.current.chatHistory.find((t) => t.id === turnId);
      const prevRating = prevTurn?.feedbackRating;

      setChatHistory((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, feedbackRating: rating } : t))
      );

      try {
        await aiApi.submitFeedback({ traceId, rating });
        showToast('Cảm ơn bạn đã đánh giá phản hồi của AI!');
      } catch {
        setChatHistory((prev) =>
          prev.map((t) => (t.id === turnId ? { ...t, feedbackRating: prevRating } : t))
        );
        showToast('Không thể gửi đánh giá lúc này, vui lòng thử lại.');
      }
    },
    [showToast]
  );

  const selectPlannerChip = useCallback(
    (group: 'theme' | 'budget' | 'duration' | 'companion', value: string) => {
      if (group === 'theme') {
        const nextTheme = value as ThemeType;
        if (nextTheme === stateRef.current.theme) return;
        if (isSubmitted) pushSnapshot();

        setTheme(nextTheme);
        setActiveSampleKey(nextTheme);
        if (isSubmitted) {
          setMapDayFilterState('all');
          setScheduleDayFilterState('all');
          setSelectedStopIndex(0);
          setItineraryMeta(null);
          setWorkingDays(buildCatalogWorkingDays(nextTheme, stateRef.current.duration));
          setExpenses(buildDefaultExpenses(stateRef.current.budget, stateRef.current.duration));
          setCollapsedDays({});
          setShowMapPlaceCard(true);
          showToast(
            `Đã chuyển chủ đề sang ${themeLabels[nextTheme]} — bấm Hoàn tác (Undo) để quay lại lịch trình trước`
          );
        }
      } else if (group === 'duration') {
        const nextDuration = value as DurationType;
        if (nextDuration === stateRef.current.duration) return;
        if (isSubmitted) pushSnapshot();

        setDuration(nextDuration);
        if (isSubmitted) {
          setMapDayFilterState('all');
          setScheduleDayFilterState('all');
          setSelectedStopIndex(0);
          setItineraryMeta(null);
          setWorkingDays(buildCatalogWorkingDays(stateRef.current.theme, nextDuration));
          setExpenses(buildDefaultExpenses(stateRef.current.budget, nextDuration));
          setCollapsedDays({});
          setShowMapPlaceCard(true);
          showToast(
            `Đã đổi thời lượng sang ${nextDuration} — bấm Hoàn tác (Undo) để quay lại lịch trình trước`
          );
        }
      } else if (group === 'budget') {
        const nextBudget = value as BudgetType;
        if (nextBudget === stateRef.current.budget) return;
        if (isSubmitted) pushSnapshot();

        setBudget(nextBudget);
        if (isSubmitted) {
          setExpenses(buildDefaultExpenses(nextBudget, stateRef.current.duration));
          showToast(
            `Đã đổi ngân sách sang ${budgetMultipliers[nextBudget].label} — bấm Hoàn tác (Undo) để quay lại`
          );
        }
      } else if (group === 'companion') {
        const nextCompanion = value as CompanionType;
        if (nextCompanion === stateRef.current.companion) return;
        if (isSubmitted) pushSnapshot();

        setCompanion(nextCompanion);
        if (isSubmitted) {
          showToast(
            `Đã đổi nhóm đồng hành sang ${companionLabels[nextCompanion]} — bấm Hoàn tác (Undo) để quay lại`
          );
        }
      }
    },
    [isSubmitted, pushSnapshot, showToast]
  );

  const resetPlannerSplitView = useCallback(() => {
    chatRequestIdRef.current += 1;
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
      chatAbortControllerRef.current = null;
    }
    chatSessionIdRef.current = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    if (thinkingTimerRef.current) window.clearTimeout(thinkingTimerRef.current);

    setIsThinking(false);
    setPendingTurn(null);
    setIsSubmitted(false);
    setIsPopupOpen(false);
    setActiveTab('map');
    setActiveSampleKey('');
    setItineraryMeta(null);
    setDraftIntake(null);
    setChatHistory([]);
    clearHistory();
    setWorkingDays(buildCatalogWorkingDays(stateRef.current.theme, stateRef.current.duration));
    setExpenses(buildDefaultExpenses(stateRef.current.budget, stateRef.current.duration));
  }, [clearHistory]);

  const switchMobileCanvasPane = useCallback((pane: MobileCanvasPane) => {
    setMobilePane(pane);
  }, []);

  const scrollLeftCanvasTo = useCallback((sectionId: string) => {
    if (window.innerWidth < 1024) {
      setMobilePane('itinerary');
    }
    window.setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }, []);

  const switchPlannerResultTab = useCallback(
    (tabName: PlannerTab) => {
      if (!isSubmitted) {
        setIsSubmitted(true);
      }
      setActiveTab(tabName);
      if (tabName === 'map') {
        if (window.innerWidth < 1024) {
          setMobilePane('map');
        }
      } else if (tabName === 'schedule') {
        scrollLeftCanvasTo('canvas-itinerary-section');
      } else if (tabName === 'tips') {
        scrollLeftCanvasTo('canvas-tips-section');
      }
    },
    [isSubmitted, scrollLeftCanvasTo]
  );

  const setMapDayFilter = useCallback((val: 'all' | number) => {
    setMapDayFilterState(val);
    const filtered = flattenStops(stateRef.current.workingDays, val);
    if (filtered.length > 0) {
      setSelectedStopIndex(filtered[0].globalIdx);
      setShowMapPlaceCard(true);
    }
  }, []);

  const setScheduleDayFilter = useCallback((val: 'all' | number) => {
    setScheduleDayFilterState(val);
  }, []);

  const selectMapStop = useCallback((globalIdx: number, shouldOpenCard = true) => {
    setSelectedStopIndex(globalIdx);
    if (shouldOpenCard) {
      setShowMapPlaceCard(true);
    }
  }, []);

  const closeMapPlaceCard = useCallback(() => {
    setShowMapPlaceCard(false);
  }, []);

  const toggleDayAccordion = useCallback((dIdx: number) => {
    setCollapsedDays((prev) => ({ ...prev, [dIdx]: !prev[dIdx] }));
  }, []);

  const reorderStop = useCallback(
    (srcDayIdx: number, srcSlotIdx: number, targetDayIdx: number, targetSlotIdx: number) => {
      if (srcDayIdx === targetDayIdx && srcSlotIdx === targetSlotIdx) return;
      pushSnapshot();
      let movedTitle = '';
      setWorkingDays((prev) => {
        const copy = prev.map((d) => ({ ...d, slots: [...d.slots] }));
        const [moved] = copy[srcDayIdx].slots.splice(srcSlotIdx, 1);
        if (!moved) return prev;
        movedTitle = moved.title;
        copy[targetDayIdx].slots.splice(targetSlotIdx, 0, moved);
        return copy;
      });
      if (movedTitle) {
        showToast(`Đã di chuyển "${movedTitle}" sang vị trí mới và cập nhật bản đồ!`);
      }
    },
    [pushSnapshot, showToast]
  );

  const moveStopStep = useCallback(
    (dIdx: number, sIdx: number, delta: number) => {
      const currentSlots = stateRef.current.workingDays[dIdx]?.slots;
      if (!currentSlots) return;
      const nextIdx = sIdx + delta;
      if (nextIdx < 0 || nextIdx >= currentSlots.length) return;
      pushSnapshot();
      setWorkingDays((prev) => {
        const copy = prev.map((d) => ({ ...d, slots: [...d.slots] }));
        const [moved] = copy[dIdx].slots.splice(sIdx, 1);
        copy[dIdx].slots.splice(nextIdx, 0, moved);
        return copy;
      });
      showToast('Đã cập nhật thứ tự điểm dừng & tuyến đường');
    },
    [pushSnapshot, showToast]
  );

  const removeStopFromDay = useCallback(
    (dIdx: number, sIdx: number) => {
      const dayObj = stateRef.current.workingDays[dIdx];
      if (!dayObj) return;
      if (dayObj.slots.length <= 1) {
        showToast('Mỗi ngày cần giữ lại ít nhất 1 điểm dừng chính');
        return;
      }
      pushSnapshot();
      const removedTitle = dayObj.slots[sIdx]?.title || '';
      setWorkingDays((prev) => {
        const copy = prev.map((d) => ({ ...d, slots: [...d.slots] }));
        copy[dIdx].slots.splice(sIdx, 1);
        return copy;
      });
      setSelectedStopIndex(0);
      showToast(`Đã xóa "${removedTitle}" khỏi ${dayObj.day}`);
    },
    [pushSnapshot, showToast]
  );

  const optimizeDayRoute = useCallback(
    (dIdx: number) => {
      const dayObj = stateRef.current.workingDays[dIdx];
      if (!dayObj) return;
      if (dayObj.slots.length < 3) {
        showToast('Cung đường trong ngày đã tối ưu!');
        return;
      }
      pushSnapshot();
      setWorkingDays((prev) => {
        const copy = prev.map((d) => ({ ...d, slots: [...d.slots] }));
        const slots = copy[dIdx].slots;
        const ordered: ItinerarySlot[] = [slots[0]];
        const remaining = slots.slice(1);
        while (remaining.length > 0) {
          const last = ordered[ordered.length - 1];
          const lastGeo = resolveGeoForStop(last);
          let bestIdx = 0;
          let bestDist = Infinity;
          remaining.forEach((cand, idx) => {
            const dist = haversineDistanceKm(lastGeo, resolveGeoForStop(cand));
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = idx;
            }
          });
          ordered.push(remaining.splice(bestIdx, 1)[0]);
        }
        copy[dIdx].slots = ordered;
        return copy;
      });
      showToast(`Đã tối ưu cung đường ${dayObj.day} để giảm quãng đường di chuyển!`);
    },
    [pushSnapshot, showToast]
  );

  const addPlaceToDay = useCallback(
    (dIdx: number, placeObj: PlaceMeta) => {
      const dayObj = stateRef.current.workingDays[dIdx];
      if (!dayObj || !placeObj) return;
      pushSnapshot();
      const geo = resolveGeoForStop(placeObj);
      const newStop: ItinerarySlot = {
        id: `stop-added-${Date.now()}`,
        time: placeObj.time || '16:00 – 17:30',
        period: placeObj.period || 'Buổi chiều',
        title: placeObj.title,
        location: placeObj.location,
        x: placeObj.x,
        y: placeObj.y,
        lat: geo.lat,
        lng: geo.lng,
        googleMapsQuery: geo.googleMapsQuery,
        desc: placeObj.desc,
        image: placeObj.image,
        category: placeObj.category,
        rating: placeObj.rating,
        reviews: placeObj.reviews,
        duration: placeObj.duration,
      };
      const nextDays = stateRef.current.workingDays.map((d, idx) =>
        idx === dIdx ? { ...d, slots: [...d.slots, newStop] } : d
      );
      setWorkingDays(nextDays);
      const allStops = flattenStops(nextDays, 'all');
      const created = allStops.find((s) => s.id === newStop.id);
      if (created) {
        setSelectedStopIndex(created.globalIdx);
        setShowMapPlaceCard(true);
      }
      showToast(`Đã thêm "${placeObj.title}" vào ${dayObj.day}`);
    },
    [pushSnapshot, showToast]
  );

  const autoFillDay = useCallback(
    (dIdx: number) => {
      const existingTitles = new Set(
        flattenStops(stateRef.current.workingDays, 'all').map((s) => s.title)
      );
      const candidate =
        dakLakPlaceDirectory.find((p) => !existingTitles.has(p.title)) || dakLakPlaceDirectory[0];
      addPlaceToDay(dIdx, candidate);
    },
    [addPlaceToDay]
  );

  const addCustomExpense = useCallback(
    (title: string, cat: ExpenseCategory, amount: number) => {
      if (!title.trim() || isNaN(amount) || amount <= 0) return;
      pushSnapshot();
      setExpenses((prev) => [
        ...prev,
        { id: `exp-${Date.now()}`, title: title.trim(), cat, amount },
      ]);
      showToast(`Đã thêm khoản chi "${title.trim()}"`);
    },
    [pushSnapshot, showToast]
  );

  const removeCustomExpense = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= stateRef.current.expenses.length) return;
      pushSnapshot();
      setExpenses((prev) => prev.filter((_, i) => i !== idx));
      showToast('Đã xóa khoản chi khỏi dự toán');
    },
    [pushSnapshot, showToast]
  );

  const openRelatedPlannerStory = useCallback(() => {
    const cat = plannerCatalog[stateRef.current.theme];
    openBentoArticle(cat ? cat.relatedArticleKey : 'coffee');
  }, [openBentoArticle]);

  const copyTailoredItinerary = useCallback(async () => {
    const cat = plannerCatalog[stateRef.current.theme] || plannerCatalog.coffee;
    const bud = budgetMultipliers[stateRef.current.budget] || budgetMultipliers.standard;
    const meta = stateRef.current.itineraryMeta;
    const title = meta?.title?.trim() || cat.title;
    const hiddenGem = meta?.hiddenGem?.trim() || cat.hiddenGem;
    const tags = `${companionLabels[stateRef.current.companion]} • ${stateRef.current.duration} • ${bud.label}`;
    const totalAmount = stateRef.current.expenses.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );
    const totalFormatted = `${totalAmount.toLocaleString('vi-VN')}đ`;
    const stops = flattenStops(stateRef.current.workingDays, 'all')
      .map((s) => `- [${s.dayLabel} | ${s.time}] ${s.title} (${s.location})`)
      .join('\n');
    const text = `HÀNH TRÌNH KHÁM PHÁ ĐẮK LẮK\n${title}\n(${tags} | Dự toán: ${totalFormatted})\nĐiểm đến ẩn mình: ${hiddenGem}\n\nCHI TIẾT LỊCH TRÌNH:\n${stops}`;
    const ok = await copyToClipboard(text);
    showToast(
      ok
        ? 'Đã sao chép toàn bộ lịch trình theo ngày & khung giờ vào bộ nhớ tạm!'
        : 'Đã lưu thông tin.'
    );
  }, [showToast]);

  const locateStopOnMap = useCallback((globalIdx: number) => {
    setSelectedStopIndex(globalIdx);
    setMapDayFilterState('all');
    setShowMapPlaceCard(true);
    if (window.innerWidth < 1024) {
      setMobilePane('map');
    }
  }, []);

  const jumpFromMapStopToSchedule = useCallback(() => {
    setScheduleDayFilterState('all');
    if (window.innerWidth < 1024) {
      setMobilePane('itinerary');
    }
    const targetIdx = stateRef.current.selectedStopIndex;
    window.setTimeout(() => {
      const slotEl = document.getElementById(`schedule-slot-${targetIdx}`);
      if (slotEl) {
        slotEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedSlotIdx(targetIdx);
        if (highlightSlotTimerRef.current) window.clearTimeout(highlightSlotTimerRef.current);
        highlightSlotTimerRef.current = window.setTimeout(() => {
          setHighlightedSlotIdx(null);
        }, 1200);
      }
    }, 90);
  }, []);

  const openPopupChat = useCallback(() => setIsPopupOpen(true), []);
  const collapsePopupToFab = useCallback(() => setIsPopupOpen(false), []);

  const openPlannerDirectlyWithTheme = useCallback(
    (targetTheme: ThemeType, promptText: string, toastMsg: string) => {
      const nextDays = buildCatalogWorkingDays(targetTheme, stateRef.current.duration);
      const nextExpenses = buildDefaultExpenses(stateRef.current.budget, stateRef.current.duration);
      setTheme(targetTheme);
      setActiveSampleKey(targetTheme);
      setMapDayFilterState('all');
      setScheduleDayFilterState('all');
      setSelectedStopIndex(0);
      setCollapsedDays({});
      setShowMapPlaceCard(true);
      setWorkingDays(nextDays);
      setExpenses(nextExpenses);
      setItineraryMeta(null);
      setDraftIntake(null);
      clearHistory();
      setMobilePane('itinerary');
      setIsPopupOpen(false);
      setChatHistory((prev) => [
        ...prev,
        createChatTurn(promptText, {
          theme: targetTheme,
          duration: stateRef.current.duration,
          companion: stateRef.current.companion,
          budget: stateRef.current.budget,
          days: nextDays,
        }),
      ]);
      setIsSubmitted(true);
      const sec = document.getElementById('itinerary-planner');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      showToast(toastMsg);
    },
    [clearHistory, createChatTurn, showToast]
  );

  const planForTopic = useCallback(
    (targetTheme: ThemeType, title: string) => {
      openPlannerDirectlyWithTheme(
        targetTheme,
        `Tích hợp trải nghiệm "${title}" vào lịch trình khám phá Đắk Lắk của tôi.`,
        'Đã thêm chủ đề trải nghiệm này vào Trợ lý AI Lịch trình!'
      );
    },
    [openPlannerDirectlyWithTheme]
  );

  const addModalTopicToPlanner = useCallback(() => {
    if (!modalArticle) return;
    const title = modalArticle.title;
    const targetTheme = modalArticle.themeKey;
    setModalArticle(null);
    planForTopic(targetTheme, title);
  }, [modalArticle, planForTopic]);

  const planForSeason = useCallback(
    (targetTheme: ThemeType, headline: string, subheadline: string, milestone: string) => {
      openPlannerDirectlyWithTheme(
        targetTheme,
        `Thiết kế lịch trình khám phá Đắk Lắk vào ${headline} (${subheadline})`,
        `Đã áp dụng gợi ý hành trình cho ${headline} (${milestone})`
      );
    },
    [openPlannerDirectlyWithTheme]
  );

  return (
    <AppContext.Provider
      value={{
        lang,
        setLanguage,
        toastMessage,
        toastVisible,
        showToast,
        cultureFocusActive,
        triggerIndigenousCultureHighlight,
        bentoPosts,
        storyPosts,
        refreshPublicPosts,
        modalArticle,
        openBentoArticle,
        openRedEarthStory,
        openPostPreview,
        closeArticleModal,
        addModalTopicToPlanner,
        planForTopic,
        isDsDrawerOpen,
        openDsDrawer,
        closeDsDrawer,
        companion,
        duration,
        budget,
        theme,
        activeSampleKey,
        isSubmitted,
        isThinking,
        activeTab,
        mapDayFilter,
        scheduleDayFilter,
        selectedStopIndex,
        showMapPlaceCard,
        mobilePane,
        workingDays,
        expenses,
        itineraryMeta,
        collapsedDays,
        chatHistory,
        pendingTurn,
        isPopupOpen,
        highlightedSlotIdx,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        selectSampleSchedule,
        applyClarificationPreset,
        submitClarificationOption,
        skipClarificationToGeneralQa,
        submitMainChatPrompt,
        submitPopupChatPrompt,
        submitChatFeedback,
        selectPlannerChip,
        resetPlannerSplitView,
        switchPlannerResultTab,
        switchMobileCanvasPane,
        setMapDayFilter,
        setScheduleDayFilter,
        selectMapStop,
        closeMapPlaceCard,
        toggleDayAccordion,
        reorderStop,
        moveStopStep,
        removeStopFromDay,
        optimizeDayRoute,
        autoFillDay,
        addPlaceToDay,
        addCustomExpense,
        removeCustomExpense,
        canvasUndo,
        canvasRedo,
        openRelatedPlannerStory,
        copyTailoredItinerary,
        locateStopOnMap,
        jumpFromMapStopToSchedule,
        openPopupChat,
        collapsePopupToFab,
        planForSeason,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used inside AppProvider');
  }
  return ctx;
}
