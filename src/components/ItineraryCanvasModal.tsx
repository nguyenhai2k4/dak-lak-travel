import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { dakLakPlaceDirectory, findPlaceMeta, themeCoverImages } from '../data/places';
import {
  budgetMultipliers,
  canvasDayColors,
  companionLabels,
  plannerCatalog,
  themeLabels,
} from '../data/plannerCatalog';
import { AiCitation, BudgetType, ExpenseCategory, ThemeType } from '../types';
import { computeEstimatedTripKm, computeLegMetrics, flattenStops } from '../utils/plannerHelpers';
import { getCitationSourceMeta, normalizeCitationUrl } from './ChatThread';
import { InteractiveTripMap } from './InteractiveTripMap';

const themeTipsMap: Record<ThemeType, { title: string; tip: string }> = {
  coffee: {
    title: 'Trải nghiệm Cà phê & Nông trại',
    tip: 'Nên ghé các nông trại Fine Robusta ở Cư M’gar vào khung 7h30–10h00 sáng khi nắng dịu và hương hoa/trái chín rõ nét nhất; đặt lịch cupping trước 1 ngày.',
  },
  culture: {
    title: 'Ứng xử tại Buôn làng & Nhà Dài',
    tip: 'Khi bước lên cầu thang cái nhà dài Ê Đê hoặc dự lễ chiêng Knah, hãy xin phép già làng trước khi chụp ảnh cận mặt và tôn trọng nghi thức mời rượu cần.',
  },
  nature: {
    title: 'An toàn Trekking & Sông Thác',
    tip: 'Mang giày bám tốt và áo khoác gió nhẹ khi đi cụm thác Dray Nur – Yok Đôn. Tuyệt đối chọn tour đi bộ quan sát voi tự nhiên (không cưỡi voi).',
  },
  cuisine: {
    title: 'Mẹo Săn Món Ngon Bản Địa',
    tip: 'Bún đỏ Ban Mê ngon nhất vào buổi chiều tối (16h–21h), bánh ướt thịt nướng chồng đĩa nên đi từ 11h00 để tránh chờ bàn, và thử cà đắng với cá cơm khô.',
  },
};

const companionTipsMap = {
  solo: 'Đi độc hành nên chọn lưu trú trung tâm Buôn Ma Thuột (gần Phan Đình Giót – Ngã Sáu) để dễ đi bộ ăn tối và thuê xe máy linh hoạt.',
  couple:
    'Cặp đôi nên ưu tiên 1 đêm bungalow ven Hồ Lắk để kịp đón sương sớm lúc 5h45 trên thuyền độc mộc trước khi du khách đông.',
  family:
    'Gia đình có người lớn tuổi hoặc trẻ nhỏ nên chia lịch trình tối đa 3 điểm/ngày và dùng xe ô tô riêng giữa BMT – Hồ Lắk (52km).',
  friends:
    'Nhóm bạn 4–6 người có thể đặt trọn gói đêm giao lưu cồng chiêng tại Ako Dhông hoặc Buôn Jun để tối ưu chi phí và trải nghiệm riêng tư.',
};

const expenseCatIcons: Record<
  ExpenseCategory,
  { icon: string; label: string; color: string }
> = {
  stay: { icon: 'fa-bed', label: 'Lưu trú', color: 'text-emerald-700 bg-emerald-50' },
  transit: { icon: 'fa-car', label: 'Di chuyển', color: 'text-sky-700 bg-sky-50' },
  food: { icon: 'fa-utensils', label: 'Ẩm thực', color: 'text-amber-700 bg-amber-50' },
  activity: { icon: 'fa-ticket', label: 'Trải nghiệm', color: 'text-[#8C3B2B] bg-[#F7F3EB]' },
};

const avatarMap: Record<string, string[]> = {
  solo: ['B'],
  couple: ['A', 'M'],
  family: ['B', 'M', 'C'],
  friends: ['T', 'L', 'H', '+2'],
};

const avatarBgColors = [
  'bg-[#132A1E] text-[#F7F3EB]',
  'bg-[#D48C46] text-[#132A1E]',
  'bg-[#8C3B2B] text-white',
  'bg-stone-200 text-stone-700',
];

export const ItineraryCanvasModal: React.FC = () => {
  const {
    lang,
    companion,
    duration,
    budget,
    theme,
    scheduleDayFilter,
    selectedStopIndex,
    mobilePane,
    workingDays,
    expenses,
    itineraryMeta,
    chatHistory,
    collapsedDays,
    highlightedSlotIdx,
    canUndo,
    canRedo,
    selectPlannerChip,
    resetPlannerSplitView,
    switchMobileCanvasPane,
    setScheduleDayFilter,
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
    submitPopupChatPrompt,
  } = useAppContext();
  const isEn = lang === 'en';

  const [collapsedSections, setCollapsedSections] = useState<{
    transit: boolean;
    budget: boolean;
    tips: boolean;
  }>({ transit: false, budget: false, tips: false });

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCat, setExpCat] = useState<ExpenseCategory>('food');
  const [expAmount, setExpAmount] = useState('');

  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
  const [openDropdownDay, setOpenDropdownDay] = useState<number | null>(null);

  const [dragMeta, setDragMeta] = useState<{ dayIdx: number; slotIdx: number } | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);

  const cat = plannerCatalog[theme] || plannerCatalog.coffee;
  const bud = budgetMultipliers[budget] || budgetMultipliers.standard;
  const dayCount = workingDays.length;

  const allStops = useMemo(() => flattenStops(workingDays, 'all'), [workingDays]);
  const kmTotal = useMemo(() => computeEstimatedTripKm(allStops), [allStops]);

  const totalBudgetAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses]
  );
  const targetCap = Math.round((bud.perDay * dayCount * 1.15) / 10000) * 10000;
  const budgetPct = Math.min(100, Math.round((totalBudgetAmount / Math.max(1, targetCap)) * 100));

  const recommendedPlaces = useMemo(() => {
    const existingTitles = new Set(allStops.map((s) => s.title));
    const filtered = dakLakPlaceDirectory.filter((p) => !existingTitles.has(p.title)).slice(0, 4);
    return filtered.length > 0 ? filtered : dakLakPlaceDirectory.slice(0, 3);
  }, [allStops]);

  const canvasCitations = useMemo(() => {
    const seen = new Set<string>();
    const collected: Array<{ cite: AiCitation; normalizedUrl: string }> = [];
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const turn = chatHistory[i];
      for (const cite of turn.citations || []) {
        const normalizedUrl = normalizeCitationUrl(cite.url);
        if (!normalizedUrl || seen.has(normalizedUrl)) continue;
        seen.add(normalizedUrl);
        collected.push({ cite, normalizedUrl });
      }
    }
    return collected.slice(0, 6);
  }, [chatHistory]);

  const scrollLeftCanvasTo = (sectionId: string) => {
    if (window.innerWidth < 1024 && mobilePane === 'map') {
      switchMobileCanvasPane('itinerary');
    }
    window.setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const toggleSection = (key: 'transit' | 'budget' | 'tips') => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(expAmount, 10);
    if (!expTitle.trim() || isNaN(amt) || amt <= 0) return;
    addCustomExpense(expTitle, expCat, amt);
    setExpTitle('');
    setExpAmount('');
    setShowAddExpense(false);
  };

  const avatars = avatarMap[companion] || avatarMap.couple;
  const themeTip = themeTipsMap[theme] || themeTipsMap.coffee;
  const displayTitle = itineraryMeta?.title?.trim() || cat.title;
  const displayRouteTip = itineraryMeta?.routeTip?.trim() || cat.routeTip;
  const displayStayMove = itineraryMeta?.stayMove?.trim() || bud.stayMove;
  const displayHiddenGem = itineraryMeta?.hiddenGem?.trim() || cat.hiddenGem;

  const aiTipIcons = ['fa-compass', 'fa-users', 'fa-cloud-sun', 'fa-wallet'];
  const aiTipLabels = [
    'Gợi ý trọng tâm',
    `Lưu ý cho ${companionLabels[companion]}`,
    'Thời tiết & Trang phục',
    `Chi tiêu & Di chuyển (${bud.label})`,
  ];
  const activeAiTips = (itineraryMeta?.tips || []).filter(
    (tip): tip is string => typeof tip === 'string' && tip.trim().length > 0
  );

  const tipCards =
    activeAiTips.length > 0
      ? activeAiTips.map((body, idx) => ({
          icon: aiTipIcons[idx % aiTipIcons.length],
          label: aiTipLabels[idx] || `Mẹo thực địa ${idx + 1}`,
          body: body.trim(),
        }))
      : [
          { icon: 'fa-mug-hot', label: themeTip.title, body: themeTip.tip },
          {
            icon: 'fa-users',
            label: `Gợi ý cho ${companionLabels[companion]}`,
            body: companionTipsMap[companion] || companionTipsMap.couple,
          },
          {
            icon: 'fa-cloud-sun',
            label: 'Thời tiết & Trang phục Cao nguyên',
            body: 'Ban ngày nắng nhẹ nhưng sáng sớm và sau 18h trên cao nguyên se lạnh (18–22°C). Nên mang áo khoác mỏng, mũ rộng vành và bình nước cá nhân.',
          },
          {
            icon: 'fa-wallet',
            label: `Chi tiêu & Di chuyển (${bud.label})`,
            body: 'Mang theo một ít tiền mặt khi vào các buôn làng thủ công (dệt Tơng Jú, gốm Yang Tao) vì sóng chuyển khoản ở vùng ven đôi lúc chập chờn.',
          },
        ];

  // Track running global index for each day/slot
  let runningGlobalIdx = 0;

  return (
    <div
      id="planner-results-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="res-itinerary-title"
      className="fixed inset-0 z-50 w-screen h-screen bg-[#FAF8F5] text-[#1C1917] flex flex-col lg:flex-row overflow-hidden animate-panel-reveal"
    >
      {/* Mobile / Tablet View Switcher Header (< lg) */}
      <div className="lg:hidden flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border-b border-stone-200 shrink-0 z-30">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={canvasUndo}
            disabled={!canUndo}
            title="Hoàn tác thay đổi gần nhất"
            aria-label="Hoàn tác"
            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs transition-colors disabled:opacity-40 disabled:pointer-events-none ${
              canUndo
                ? 'border-[#D48C46]/60 bg-[#FAF8F5] text-[#132A1E] hover:bg-[#F7F3EB]'
                : 'border-stone-200 bg-stone-50 text-stone-600'
            }`}
          >
            <i className="fa-solid fa-rotate-left" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={canvasRedo}
            disabled={!canRedo}
            title="Làm lại"
            aria-label="Làm lại"
            className="w-8 h-8 rounded-lg border border-stone-200 bg-stone-50 text-stone-600 hover:text-[#132A1E] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-xs transition-colors"
          >
            <i className="fa-solid fa-rotate-right" aria-hidden="true" />
          </button>
        </div>

        <div className="inline-flex items-center p-0.5 rounded-full bg-stone-100 border border-stone-200">
          <button
            type="button"
            onClick={() => switchMobileCanvasPane('itinerary')}
            className={`px-3 py-1 rounded-full text-xs transition-all ${
              mobilePane === 'itinerary'
                ? 'font-bold bg-white text-[#132A1E] shadow-xs'
                : 'font-semibold text-stone-600'
            }`}
          >
            Lịch trình
          </button>
          <button
            type="button"
            onClick={() => switchMobileCanvasPane('map')}
            className={`px-3 py-1 rounded-full text-xs transition-all ${
              mobilePane === 'map'
                ? 'font-bold bg-white text-[#132A1E] shadow-xs'
                : 'font-semibold text-stone-600'
            }`}
          >
            Bản đồ
          </button>
        </div>

        <button
          type="button"
          onClick={resetPlannerSplitView}
          title="Đóng canvas"
          aria-label="Đóng báo cáo lịch trình"
          className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-[#8C3B2B] text-stone-700 hover:text-white text-xs font-bold flex items-center justify-center transition-colors"
        >
          ✕
        </button>
      </div>

      {/* LEFT PANE: EDITORIAL TRIP PLANNER DOCUMENT */}
      <div
        id="canvas-left-pane"
        className={`${
          mobilePane === 'itinerary' ? 'flex' : 'hidden lg:flex'
        } w-full lg:w-[52%] xl:w-[50%] flex-1 lg:flex-none h-full flex-col bg-white lg:border-r border-stone-200/90 min-h-0`}
      >
        {/* Desktop Top Toolbar */}
        <div className="hidden lg:flex items-center justify-between gap-3 px-5 py-3 bg-white/95 backdrop-blur-md border-b border-stone-200/90 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#132A1E] text-[#F7F3EB] text-[11px] font-mono font-semibold">
              <i className="fa-solid fa-compass text-[#D48C46] text-[10px]" aria-hidden="true" />
              <span>Đắk Lắk AI</span>
            </span>

            <div className="h-4 w-px bg-stone-200 mx-0.5" />

            <button
              type="button"
              onClick={canvasUndo}
              disabled={!canUndo}
              title="Hoàn tác thay đổi gần nhất"
              aria-label="Hoàn tác"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-35 disabled:pointer-events-none ${
                canUndo
                  ? 'font-semibold text-[#132A1E] bg-[#FAF8F5] border border-[#D48C46]/50 hover:bg-[#F7F3EB]'
                  : 'font-medium text-stone-600 hover:text-[#132A1E] hover:bg-stone-100'
              }`}
            >
              <i className="fa-solid fa-rotate-left text-[11px]" aria-hidden="true" />
              <span>Hoàn tác</span>
            </button>
            <button
              type="button"
              onClick={canvasRedo}
              disabled={!canRedo}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-[#132A1E] hover:bg-stone-100 disabled:opacity-35 disabled:pointer-events-none transition-colors"
            >
              <i className="fa-solid fa-rotate-right text-[11px]" aria-hidden="true" />
              <span>Làm lại</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyTailoredItinerary}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#132A1E] hover:bg-[#1e402e] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <i className="fa-solid fa-arrow-up-from-bracket text-[10px]" aria-hidden="true" />
              <span>Chia sẻ</span>
            </button>
            <button
              type="button"
              onClick={openRelatedPlannerStory}
              title="Đọc bài viết chuyên sâu"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F7F3EB] hover:bg-[#EFE7D6] text-[#8C3B2B] border border-[#E5DEC9] text-xs font-semibold transition-colors"
            >
              <i className="fa-solid fa-book-open text-[10px]" aria-hidden="true" />
              <span>Chuyện sâu</span>
            </button>
            <button
              type="button"
              onClick={resetPlannerSplitView}
              title="Đóng canvas"
              aria-label="Đóng báo cáo lịch trình"
              className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Trip Document */}
        <div
          id="canvas-left-scroll"
          className="flex-1 overflow-y-auto overscroll-contain canvas-light-scrollbar bg-[#FAF8F5] pb-24"
        >
          {/* Hero Cover Image */}
          <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-[#132A1E]">
            <img
              src={themeCoverImages[theme] || themeCoverImages.coffee}
              alt="Khám phá Đắk Lắk"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/25" />

            <div className="absolute top-3.5 right-3.5 z-10 flex flex-wrap items-center gap-1.5">
              {(
                [
                  { key: 'coffee', label: 'Cà phê' },
                  { key: 'culture', label: 'Văn hóa' },
                  { key: 'nature', label: 'Thiên nhiên' },
                  { key: 'cuisine', label: 'Ẩm thực' },
                ] as const
              ).map((item) => {
                const isMatch = theme === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={isMatch}
                    title={
                      isMatch
                        ? 'Chủ đề đang chọn'
                        : 'Chuyển sang lịch trình mẫu theo chủ đề này (có thể Hoàn tác)'
                    }
                    onClick={() => selectPlannerChip('theme', item.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${
                      isMatch
                        ? 'font-bold bg-white text-[#132A1E] shadow-sm'
                        : 'font-semibold bg-black/45 text-white hover:bg-white/90 hover:text-[#132A1E] backdrop-blur-md'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overlapping Floating Trip Title Card */}
          <div className="relative z-10 -mt-12 mx-4 sm:mx-6 bg-white rounded-2xl border border-stone-200/90 shadow-lg shadow-stone-900/5 p-5 sm:p-6 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F7F3EB] border border-[#E5DEC9] text-[#8C3B2B] text-[11px] font-bold">
                {companionLabels[companion]} • {duration} • {themeLabels[theme]}
              </span>
              <span className="text-[11px] font-mono font-semibold text-[#132A1E] bg-[#EAF2ED] px-2.5 py-1 rounded-full">
                {dayCount} ngày • {allStops.length} điểm • ~{kmTotal} km
              </span>
            </div>

            <h3
              id="res-itinerary-title"
              className="font-serif text-2xl sm:text-[30px] font-bold text-[#132A1E] leading-[1.18]"
            >
              {displayTitle}
            </h3>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-stone-600">
                <span className="inline-flex items-center gap-1.5">
                  <i className="fa-regular fa-calendar text-stone-400" aria-hidden="true" />
                  <span>
                    {dayCount} Ngày {dayCount - 1} Đêm • {companionLabels[companion]} • Đắk Lắk
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {avatars.map((ch, idx) => (
                    <span
                      key={idx}
                      className={`w-7 h-7 rounded-full ${
                        avatarBgColors[idx % avatarBgColors.length]
                      } border-2 border-white flex items-center justify-center text-[10px] font-bold`}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => scrollLeftCanvasTo('canvas-tips-section')}
                  title="Xem mẹo theo nhóm"
                  className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 flex items-center justify-center text-xs font-bold transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 2-Column Summary Cards */}
          <div className="mx-4 sm:mx-6 mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-7 bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#132A1E]">Hành trang &amp; Đặt chỗ</h4>
                <span className="text-[11px] font-mono text-stone-400">Tóm tắt nhanh</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => scrollLeftCanvasTo('canvas-transit-section')}
                  className="flex flex-col items-start gap-1 p-2 rounded-xl hover:bg-stone-50 text-left transition-colors group"
                >
                  <i
                    className="fa-solid fa-plane-departure text-stone-600 group-hover:text-[#D48C46] text-xs"
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-semibold text-stone-700">Di chuyển</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollLeftCanvasTo('canvas-transit-section')}
                  className="flex flex-col items-start gap-1 p-2 rounded-xl hover:bg-stone-50 text-left transition-colors group"
                >
                  <i
                    className="fa-solid fa-bed text-stone-600 group-hover:text-[#D48C46] text-xs"
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-semibold text-stone-700">Lưu trú</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollLeftCanvasTo('canvas-itinerary-section')}
                  className="flex flex-col items-start gap-1 p-2 rounded-xl hover:bg-stone-50 text-left transition-colors group"
                >
                  <i
                    className="fa-solid fa-car text-stone-600 group-hover:text-[#D48C46] text-xs"
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-semibold text-stone-700">Cung đường</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollLeftCanvasTo('canvas-tips-section')}
                  className="flex flex-col items-start gap-1 p-2 rounded-xl hover:bg-stone-50 text-left transition-colors group"
                >
                  <i
                    className="fa-solid fa-gem text-stone-600 group-hover:text-[#D48C46] text-xs"
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-semibold text-stone-700">Điểm ẩn</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollLeftCanvasTo('canvas-tips-section')}
                  className="flex flex-col items-start gap-1 p-2 rounded-xl hover:bg-stone-50 text-left transition-colors group"
                >
                  <i
                    className="fa-regular fa-note-sticky text-stone-600 group-hover:text-[#D48C46] text-xs"
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-semibold text-stone-700">Mẹo bản địa</span>
                </button>
                <button
                  type="button"
                  onClick={openRelatedPlannerStory}
                  className="flex flex-col items-start gap-1 p-2 rounded-xl hover:bg-stone-50 text-left transition-colors group"
                >
                  <i
                    className="fa-solid fa-book-open text-stone-600 group-hover:text-[#8C3B2B] text-xs"
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-semibold text-stone-700">Chuyện sâu</span>
                </button>
              </div>
            </div>

            <div className="sm:col-span-5 bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#132A1E]">Ngân sách</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F7F3EB] text-[#8C3B2B] font-semibold">
                  {bud.label}
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-[#132A1E]">
                  {totalBudgetAmount.toLocaleString('vi-VN')}đ
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">Ước tính / người</p>
              </div>
              <button
                type="button"
                onClick={() => scrollLeftCanvasTo('canvas-budget-section')}
                className="self-start text-xs font-semibold text-[#8C3B2B] hover:text-[#D48C46] transition-colors"
              >
                Xem chi tiết →
              </button>
            </div>
          </div>

          {/* Accordion 1: Transit & Lodging */}
          <section id="canvas-transit-section" className="mx-4 sm:mx-6 mt-6 space-y-3">
            <button
              type="button"
              onClick={() => toggleSection('transit')}
              className="w-full flex items-center justify-between text-left group"
            >
              <span className="flex items-center gap-2">
                <i
                  className={`fa-solid fa-chevron-down text-xs text-stone-500 transition-transform ${
                    collapsedSections.transit ? '-rotate-90' : ''
                  }`}
                  aria-hidden="true"
                />
                <span className="font-bold text-base sm:text-lg text-[#132A1E]">
                  Di chuyển &amp; Lưu trú
                </span>
              </span>
              <span className="text-xs font-medium text-stone-500 group-hover:text-[#132A1E]">
                Chạm để thu gọn
              </span>
            </button>

            {!collapsedSections.transit && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-[#132A1E]">SGN / HAN → BMV</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wide">
                        Tối ưu tuyến
                      </span>
                      <span className="text-xs text-stone-500">Sân bay Buôn Ma Thuột</span>
                    </div>
                    <div className="flex items-center gap-5">
                      <div>
                        <div className="text-[11px] text-stone-400">Khởi hành</div>
                        <div className="text-base font-bold text-[#132A1E]">06:30</div>
                      </div>
                      <div className="flex items-center gap-1.5 text-stone-300">
                        <span className="w-2 h-2 rounded-full bg-stone-300" />
                        <span className="w-10 h-px bg-stone-300" />
                        <i className="fa-solid fa-plane text-[10px] text-[#D48C46]" aria-hidden="true" />
                        <span className="w-10 h-px bg-stone-300" />
                        <span className="w-2 h-2 rounded-full bg-[#132A1E]" />
                      </div>
                      <div>
                        <div className="text-[11px] text-stone-400">Đến BMV</div>
                        <div className="text-base font-bold text-[#132A1E]">07:35</div>
                      </div>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">{displayRouteTip}</p>
                  </div>
                  <div className="sm:border-l sm:border-stone-200 sm:pl-4 flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                      Mã lộ trình
                    </span>
                    <span className="font-mono font-bold text-sm text-[#132A1E] bg-stone-100 px-2.5 py-1 rounded-lg">
                      DL-BMV
                    </span>
                    <span className="text-[11px] text-stone-500 mt-1">Cách trung tâm 12 km</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#F7F3EB] text-[#8C3B2B] flex items-center justify-center text-xs">
                        <i className="fa-solid fa-hotel" aria-hidden="true" />
                      </span>
                      <h5 className="font-bold text-sm text-[#132A1E]">
                        Lưu trú &amp; Phương tiện gợi ý
                      </h5>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">{displayStayMove}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-center">
                      <span className="block text-[10px] text-stone-400">Nhận phòng</span>
                      <span className="font-bold text-[#132A1E]">14:00</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-center">
                      <span className="block text-[10px] text-stone-400">Trả phòng</span>
                      <span className="font-bold text-[#132A1E]">12:00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Accordion 2: Day-by-Day Interactive Itinerary */}
          <section id="canvas-itinerary-section" className="mx-4 sm:mx-6 mt-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg text-[#132A1E]">
                  Lịch trình chi tiết
                </span>
                <span className="px-2 py-0.5 rounded-full bg-stone-200/70 text-[11px] font-medium text-stone-600">
                  Kéo thả để sắp xếp
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setScheduleDayFilter('all')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    scheduleDayFilter === 'all'
                      ? 'bg-[#132A1E] text-white shadow-xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                >
                  Tất cả
                </button>
                {workingDays.map((d, i) => {
                  const val = i + 1;
                  const isActive = scheduleDayFilter === val;
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => setScheduleDayFilter(val)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                        isActive
                          ? 'bg-[#132A1E] text-white shadow-xs'
                          : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                      }`}
                    >
                      {d.day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div id="res-days-timeline" className="space-y-6">
              {workingDays.map((dayObj, dIdx) => {
                const dayNum = dIdx + 1;
                const dayColor = canvasDayColors[dIdx % canvasDayColors.length];
                const isCollapsed = !!collapsedDays[dIdx];
                const dayKm = computeEstimatedTripKm(dayObj.slots);
                const dayMins = dayObj.slots.length * 95;
                const dayHrsLabel = `${Math.floor(dayMins / 60)} giờ ${
                  dayMins % 60 > 0 ? `${dayMins % 60} phút` : ''
                }`.trim();

                const dayStartIdx = runningGlobalIdx;
                runningGlobalIdx += dayObj.slots.length;

                if (scheduleDayFilter !== 'all' && scheduleDayFilter !== dayNum) {
                  return null;
                }

                const q = (searchQueries[dIdx] || '').trim().toLowerCase();
                const searchMatches = dakLakPlaceDirectory
                  .filter(
                    (p) =>
                      !q ||
                      p.title.toLowerCase().includes(q) ||
                      p.location.toLowerCase().includes(q) ||
                      p.category.toLowerCase().includes(q)
                  )
                  .slice(0, 6);

                return (
                  <div
                    key={dayObj.day}
                    className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-visible"
                  >
                    {/* Day Accordion Header */}
                    <div className="p-4 sm:p-5 border-b border-stone-100 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => toggleDayAccordion(dIdx)}
                          className="flex items-start gap-2.5 text-left group"
                        >
                          <i
                            className={`fa-solid fa-chevron-down text-xs text-stone-400 mt-1.5 transition-transform ${
                              isCollapsed ? '-rotate-90' : ''
                            }`}
                            aria-hidden="true"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="px-2 py-0.5 rounded-md text-white text-[10px] font-bold uppercase tracking-wider"
                                style={{ background: dayColor }}
                              >
                                {dayObj.day}
                              </span>
                              <h4 className="font-bold text-base sm:text-lg text-[#132A1E] group-hover:text-[#8C3B2B] transition-colors">
                                {dayObj.title}
                              </h4>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">{dayObj.area}</p>
                          </div>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pl-5">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => autoFillDay(dIdx)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 transition-colors"
                          >
                            <i className="fa-solid fa-wand-magic-sparkles text-[11px]" aria-hidden="true" />
                            <span>Tự động điền thêm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => optimizeDayRoute(dIdx)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C3B2B] hover:text-[#132A1E] transition-colors"
                          >
                            <i className="fa-solid fa-route text-[11px]" aria-hidden="true" />
                            <span>Tối ưu cung đường</span>
                          </button>
                        </div>
                        <span className="text-[11px] font-mono text-stone-400">
                          {dayHrsLabel} • ~{dayKm} km
                        </span>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="p-4 sm:p-5 bg-[#FAF8F5]/70 space-y-2.5">
                        {dayObj.slots.map((slot, sIdx) => {
                          const currentStopIdx = dayStartIdx + sIdx;
                          const isHighlighted = currentStopIdx === selectedStopIndex;
                          const isFlashed = highlightedSlotIdx === currentStopIdx;
                          const pinNum = currentStopIdx + 1;
                          const meta = findPlaceMeta(slot.title, slot.location, theme);
                          const thumbSrc = slot.image || meta.image;
                          const nextSlot = dayObj.slots[sIdx + 1];
                          const leg = nextSlot ? computeLegMetrics(slot, nextSlot) : null;
                          const rowKey = `${dIdx}:${sIdx}`;
                          const isDragging =
                            dragMeta?.dayIdx === dIdx && dragMeta?.slotIdx === sIdx;
                          const isDropTarget = dropTargetKey === rowKey;

                          return (
                            <div
                              key={slot.id}
                              id={`schedule-slot-${currentStopIdx}`}
                              draggable
                              onDragStart={(e) => {
                                setDragMeta({ dayIdx: dIdx, slotIdx: sIdx });
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', rowKey);
                              }}
                              onDragEnd={() => {
                                setDragMeta(null);
                                setDropTargetKey(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (dropTargetKey !== rowKey) setDropTargetKey(rowKey);
                              }}
                              onDragLeave={() => {
                                if (dropTargetKey === rowKey) setDropTargetKey(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                setDropTargetKey(null);
                                if (dragMeta) {
                                  reorderStop(dragMeta.dayIdx, dragMeta.slotIdx, dIdx, sIdx);
                                }
                                setDragMeta(null);
                              }}
                              className={`group/stop transition-all ${
                                isDragging ? 'stop-card-dragging' : ''
                              } ${isDropTarget ? 'stop-drop-target' : ''} ${
                                isFlashed ? 'stop-flash-highlight' : ''
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="flex flex-col items-center pt-3 gap-1.5 shrink-0">
                                  <div
                                    className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-stone-300 group-hover/stop:text-stone-500 transition-colors"
                                    title="Kéo để sắp xếp lại"
                                  >
                                    <i className="fa-solid fa-grip-vertical text-[11px]" aria-hidden="true" />
                                    <button
                                      type="button"
                                      onClick={() => locateStopOnMap(currentStopIdx)}
                                      className="w-6 h-6 rounded-full text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-xs transition-transform hover:scale-110"
                                      style={{ background: dayColor }}
                                    >
                                      {pinNum}
                                    </button>
                                  </div>
                                </div>

                                <div
                                  onClick={() => locateStopOnMap(currentStopIdx)}
                                  className={`flex-1 min-w-0 bg-white rounded-2xl border p-3.5 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                                    isHighlighted
                                      ? 'border-[#D48C46] ring-2 ring-[#D48C46]/25 shadow-md'
                                      : 'border-stone-200/90 hover:border-stone-300 hover:shadow-sm'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="px-2 py-0.5 rounded-md bg-[#F7F3EB] text-[#8C3B2B] font-mono text-[10px] font-bold">
                                        {slot.time}
                                      </span>
                                      <span className="text-[11px] font-medium text-stone-400">
                                        • {slot.period}
                                      </span>
                                      {slot.isCustom && (
                                        <span className="px-2 py-0.5 rounded-md bg-[#D48C46]/20 border border-[#D48C46]/45 text-[#8C3B2B] font-mono text-[10px] font-semibold">
                                          {isEn ? 'AI Pick' : 'AI Gợi ý'}
                                        </span>
                                      )}
                                      {typeof slot.estimatedCostVnd === 'number' &&
                                        slot.estimatedCostVnd > 0 && (
                                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-mono text-[10px] font-semibold">
                                            ~{slot.estimatedCostVnd.toLocaleString('vi-VN')}đ
                                          </span>
                                        )}
                                    </div>

                                    <h5 className="font-bold text-sm sm:text-[15px] text-[#132A1E] leading-snug group-hover/stop:text-[#8C3B2B] transition-colors">
                                      {slot.title}
                                    </h5>

                                    <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                                      {slot.desc}
                                    </p>

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                      <span className="text-[11px] text-stone-400 truncate">
                                        <i
                                          className="fa-solid fa-location-dot text-[10px] mr-1"
                                          aria-hidden="true"
                                        />
                                        {slot.location}
                                      </span>
                                      <div
                                        className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/stop:opacity-100 transition-opacity"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            submitPopupChatPrompt(
                                              isEn
                                                ? `Tell me more about visiting ${slot.title} (ticket price, opening hours, and local tips)?`
                                                : `Cho mình hỏi kinh nghiệm, giá vé tham quan và lưu ý khi ghé ${slot.title}?`
                                            )
                                          }
                                          title={
                                            isEn
                                              ? `Ask AI about ${slot.title}`
                                              : `Hỏi AI về ${slot.title}`
                                          }
                                          aria-label={
                                            isEn
                                              ? `Ask AI about ${slot.title}`
                                              : `Hỏi AI về ${slot.title}`
                                          }
                                          className="px-2 h-6 rounded-md bg-[#F7F3EB] hover:bg-[#D48C46]/25 border border-[#D48C46]/45 text-[#8C3B2B] text-[10px] font-semibold flex items-center gap-1 transition-colors"
                                        >
                                          <i
                                            className="fa-solid fa-wand-magic-sparkles text-[9px]"
                                            aria-hidden="true"
                                          />
                                          <span>{isEn ? 'Ask AI' : 'Hỏi AI'}</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => moveStopStep(dIdx, sIdx, -1)}
                                          title="Đưa lên trước"
                                          aria-label="Đưa lên trước"
                                          className="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] flex items-center justify-center"
                                        >
                                          ↑
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => moveStopStep(dIdx, sIdx, 1)}
                                          title="Đưa xuống sau"
                                          aria-label="Đưa xuống sau"
                                          className="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] flex items-center justify-center"
                                        >
                                          ↓
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeStopFromDay(dIdx, sIdx)}
                                          title="Xóa điểm dừng"
                                          aria-label="Xóa điểm dừng"
                                          className="w-6 h-6 rounded-md bg-stone-100 hover:bg-rose-100 text-stone-500 hover:text-rose-700 text-[10px] flex items-center justify-center"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden shrink-0 bg-[#132A1E]/10 border border-stone-200/80">
                                    <img
                                      src={thumbSrc}
                                      alt={slot.title}
                                      loading="lazy"
                                      className="w-full h-full object-cover group-hover/stop:scale-105 transition-transform duration-300"
                                    />
                                  </div>
                                </div>
                              </div>

                              {leg && (
                                <div className="ml-9 my-1.5 pl-3 border-l-2 border-dotted border-stone-300 flex items-center gap-2 text-[11px] text-stone-500">
                                  <i
                                    className="fa-solid fa-car-side text-[10px] text-stone-400"
                                    aria-hidden="true"
                                  />
                                  <span>
                                    {leg.mins} phút • {leg.dist} km
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => locateStopOnMap(currentStopIdx + 1)}
                                    className="text-[#8C3B2B] hover:underline font-semibold"
                                  >
                                    Chỉ đường
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add a place live search box */}
                        <div className="relative pt-2 pl-8">
                          <div className="relative flex items-center bg-white rounded-xl border border-stone-200 focus-within:border-[#D48C46] focus-within:ring-2 focus-within:ring-[#D48C46]/20 px-3 py-2.5 shadow-2xs">
                            <i
                              className="fa-solid fa-location-dot text-stone-400 text-xs mr-2.5"
                              aria-hidden="true"
                            />
                            <input
                              type="text"
                              value={searchQueries[dIdx] || ''}
                              onFocus={() => setOpenDropdownDay(dIdx)}
                              onChange={(e) => {
                                setSearchQueries((prev) => ({ ...prev, [dIdx]: e.target.value }));
                                setOpenDropdownDay(dIdx);
                              }}
                              onBlur={() => {
                                window.setTimeout(() => {
                                  setOpenDropdownDay((curr) => (curr === dIdx ? null : curr));
                                }, 150);
                              }}
                              placeholder="Thêm điểm dừng tại Đắk Lắk (VD: Hồ Lắk, Dray Nur, Bảo tàng...)"
                              className="w-full bg-transparent text-xs sm:text-[13px] text-[#132A1E] placeholder-stone-400 focus:outline-none"
                            />
                          </div>

                          {openDropdownDay === dIdx && (
                            <div className="absolute left-8 right-0 top-full mt-1.5 z-30 bg-white rounded-xl border border-stone-200 shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                              {searchMatches.length === 0 ? (
                                <div className="px-3.5 py-3 text-xs text-stone-500">
                                  Không tìm thấy địa điểm phù hợp — thử “Hồ Lắk”, “Cà phê”, “Dray
                                  Nur”…
                                </div>
                              ) : (
                                searchMatches.map((m) => (
                                  <button
                                    key={m.title}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setOpenDropdownDay(null);
                                      setSearchQueries((prev) => ({ ...prev, [dIdx]: '' }));
                                      addPlaceToDay(dIdx, m);
                                    }}
                                    className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[#F7F3EB] text-left transition-colors border-b border-stone-100 last:border-b-0"
                                  >
                                    <img
                                      src={m.image}
                                      alt={m.title}
                                      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-stone-100"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold text-[#132A1E] truncate">
                                        {m.title}
                                      </div>
                                      <div className="text-[11px] text-stone-500 truncate">
                                        {m.location} • ★ {m.rating}
                                      </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full bg-stone-100 text-[10px] font-semibold text-stone-600 shrink-0">
                                      + Thêm
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* Recommended places horizontal strip */}
                        <div className="pt-3 pl-8 space-y-2">
                          <span className="block text-[11px] font-bold text-stone-500">
                            Điểm gợi ý kết hợp
                          </span>
                          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                            {recommendedPlaces.map((rec) => (
                              <div
                                key={rec.title}
                                className="shrink-0 w-48 bg-white rounded-xl border border-stone-200/90 p-2 flex items-center gap-2.5 shadow-2xs hover:border-[#D48C46] transition-colors"
                              >
                                <img
                                  src={rec.image}
                                  alt={rec.title}
                                  className="w-10 h-10 rounded-lg object-cover shrink-0 bg-stone-100"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-[11px] font-bold text-[#132A1E] truncate">
                                    {rec.title}
                                  </div>
                                  <div className="text-[10px] text-stone-400 truncate">
                                    ★ {rec.rating} • {rec.category}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addPlaceToDay(dIdx, rec)}
                                  title={`Thêm vào ${dayObj.day}`}
                                  aria-label={`Thêm ${rec.title}`}
                                  className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-[#132A1E] text-stone-700 hover:text-white flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Accordion 3: Budgeting & Expenses */}
          <section
            id="canvas-budget-section"
            className="mx-4 sm:mx-6 mt-7 pt-6 border-t border-stone-200 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => toggleSection('budget')}
                className="flex items-center gap-2 text-left"
              >
                <i
                  className={`fa-solid fa-chevron-down text-xs text-stone-500 transition-transform ${
                    collapsedSections.budget ? '-rotate-90' : ''
                  }`}
                  aria-hidden="true"
                />
                <span className="font-bold text-base sm:text-lg text-[#132A1E]">
                  Dự toán ngân sách &amp; Chi phí
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddExpense((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#8C3B2B] hover:bg-[#732f21] text-white text-xs font-bold shadow-xs transition-colors"
              >
                <span>+ Thêm chi phí</span>
              </button>
            </div>

            {!collapsedSections.budget && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <div className="text-3xl font-bold text-[#132A1E] tracking-tight">
                        {totalBudgetAmount.toLocaleString('vi-VN')}đ
                      </div>
                      <div className="w-full max-w-sm h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            budgetPct > 95 ? 'bg-[#8C3B2B]' : 'bg-[#D48C46]'
                          }`}
                          style={{ width: `${budgetPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-stone-500">
                        Hạn mức tham chiếu ({bud.label}): {targetCap.toLocaleString('vi-VN')}đ / người
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { tier: 'budget', label: 'Tiết kiệm' },
                          { tier: 'standard', label: 'Tiêu chuẩn' },
                          { tier: 'luxury', label: 'Cao cấp' },
                        ] as Array<{ tier: BudgetType; label: string }>
                      ).map((item) => {
                        const isCurrent = budget === item.tier;
                        return (
                          <button
                            key={item.tier}
                            type="button"
                            onClick={() => selectPlannerChip('budget', item.tier)}
                            className={
                              isCurrent
                                ? 'px-3 py-1.5 rounded-xl text-xs font-bold border border-[#D48C46] bg-[#F7F3EB] text-[#132A1E] transition-colors'
                                : 'px-3 py-1.5 rounded-xl text-xs font-semibold border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 transition-colors'
                            }
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Inline Add Expense Form */}
                  {showAddExpense && (
                    <form
                      onSubmit={handleExpenseSubmit}
                      className="p-3.5 rounded-xl bg-[#FAF8F5] border border-stone-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5"
                    >
                      <input
                        type="text"
                        value={expTitle}
                        onChange={(e) => setExpTitle(e.target.value)}
                        placeholder="Tên khoản chi (VD: Cà phê vợt)"
                        className="sm:col-span-5 px-3 py-2 rounded-lg bg-white border border-stone-200 text-xs focus:outline-none focus:border-[#D48C46]"
                        required
                      />
                      <select
                        value={expCat}
                        onChange={(e) => setExpCat(e.target.value as ExpenseCategory)}
                        className="sm:col-span-3 px-2.5 py-2 rounded-lg bg-white border border-stone-200 text-xs focus:outline-none focus:border-[#D48C46]"
                      >
                        <option value="food">Ẩm thực</option>
                        <option value="stay">Lưu trú</option>
                        <option value="transit">Di chuyển</option>
                        <option value="activity">Trải nghiệm</option>
                      </select>
                      <input
                        type="number"
                        min={10000}
                        step={10000}
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        placeholder="Số tiền (đ)"
                        className="sm:col-span-3 px-3 py-2 rounded-lg bg-white border border-stone-200 text-xs focus:outline-none focus:border-[#D48C46]"
                        required
                      />
                      <button
                        type="submit"
                        className="sm:col-span-1 px-3 py-2 rounded-lg bg-[#132A1E] text-white text-xs font-bold hover:bg-[#1e402e] transition-colors"
                      >
                        Lưu
                      </button>
                    </form>
                  )}

                  {/* Expense Items List */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase tracking-wider">
                      <span>Chi tiết khoản mục</span>
                      <span>Ước tính / người</span>
                    </div>
                    <div className="divide-y divide-stone-100">
                      {expenses.map((exp, idx) => {
                        const meta = expenseCatIcons[exp.cat] || expenseCatIcons.activity;
                        return (
                          <div
                            key={exp.id}
                            className="py-2.5 flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-8 h-8 rounded-xl ${meta.color} flex items-center justify-center text-xs shrink-0`}
                              >
                                <i className={`fa-solid ${meta.icon}`} aria-hidden="true" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs sm:text-[13px] font-semibold text-[#132A1E] truncate">
                                  {exp.title}
                                </div>
                                <div className="text-[11px] text-stone-400">
                                  {exp.note ? `${meta.label} • ${exp.note}` : meta.label}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-xs font-bold text-[#132A1E]">
                                {Number(exp.amount).toLocaleString('vi-VN')}đ
                              </span>
                              <button
                                type="button"
                                onClick={() => removeCustomExpense(idx)}
                                title="Xóa khoản chi"
                                aria-label="Xóa khoản chi"
                                className="w-6 h-6 rounded-md text-stone-300 hover:text-[#8C3B2B] hover:bg-stone-100 flex items-center justify-center text-xs transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Accordion 4: Local Tips & Hidden Gems */}
          <section
            id="canvas-tips-section"
            className="mx-4 sm:mx-6 mt-7 pt-6 border-t border-stone-200 space-y-4"
          >
            <button
              type="button"
              onClick={() => toggleSection('tips')}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="flex items-center gap-2">
                <i
                  className={`fa-solid fa-chevron-down text-xs text-stone-500 transition-transform ${
                    collapsedSections.tips ? '-rotate-90' : ''
                  }`}
                  aria-hidden="true"
                />
                <span className="font-bold text-base sm:text-lg text-[#132A1E]">
                  Mẹo bản địa &amp; Cẩm nang thực địa
                </span>
              </span>
              <span className="text-xs font-mono text-[#8C3B2B]">Địa phương gợi ý</span>
            </button>

            {!collapsedSections.tips && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-[#D48C46]/40 p-4 space-y-1.5 shadow-xs">
                    <div className="flex items-center gap-1.5 text-[#8C3B2B] text-[11px] font-bold uppercase tracking-wider">
                      <i className="fa-solid fa-gem text-[#D48C46]" aria-hidden="true" />
                      <span>Điểm đến ẩn mình</span>
                    </div>
                    <p className="text-xs sm:text-[13px] font-medium text-[#132A1E] leading-relaxed">
                      {displayHiddenGem}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl border border-stone-200/90 p-4 space-y-1.5 shadow-xs">
                    <div className="flex items-center gap-1.5 text-[#132A1E] text-[11px] font-bold uppercase tracking-wider">
                      <i className="fa-solid fa-route text-[#D48C46]" aria-hidden="true" />
                      <span>Tối ưu cung đường</span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-stone-700 leading-relaxed">
                      {displayRouteTip}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tipCards.map((c) => (
                    <div
                      key={c.label}
                      className="bg-white rounded-2xl p-4 space-y-1.5 border border-stone-200/90 shadow-xs"
                    >
                      <div className="flex items-center gap-2 text-[#8C3B2B]">
                        <i className={`fa-solid ${c.icon} text-xs text-[#D48C46]`} aria-hidden="true" />
                        <span className="text-xs font-bold text-[#132A1E]">{c.label}</span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">{c.body}</p>
                    </div>
                  ))}
                </div>

                {canvasCitations.length > 0 && (
                  <div className="bg-white rounded-2xl border border-stone-200/90 p-4 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-globe text-xs text-[#D48C46]" aria-hidden="true" />
                        <span className="text-xs font-bold text-[#132A1E]">
                          {isEn
                            ? 'Sources & Live Web References'
                            : 'Nguồn tham khảo & Dữ liệu thực tế'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400">
                        {canvasCitations.length} {isEn ? 'sources' : 'nguồn'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {canvasCitations.map(({ cite, normalizedUrl }, cIdx) => {
                        const sourceMeta = getCitationSourceMeta(cite, normalizedUrl, lang);
                        return (
                          <a
                            key={`${normalizedUrl}-${cIdx}`}
                            href={normalizedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/cite flex flex-col gap-1 p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F7F3EB] border border-stone-200/80 hover:border-[#D48C46] transition-all"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-stone-200 text-[9px] font-mono font-semibold text-[#8C3B2B] shrink-0">
                                  <i
                                    className={`fa-solid ${sourceMeta.icon} text-[8px] text-[#D48C46]`}
                                    aria-hidden="true"
                                  />
                                  <span>{sourceMeta.badge}</span>
                                </span>
                                <span className="text-[11px] font-bold text-[#132A1E] group-hover/cite:text-[#8C3B2B] truncate transition-colors">
                                  {cite.title || normalizedUrl}
                                </span>
                              </div>
                              <i
                                className="fa-solid fa-arrow-up-right-from-square text-[9px] text-stone-400 group-hover/cite:text-[#D48C46] shrink-0 transition-colors"
                                aria-hidden="true"
                              />
                            </div>
                            {cite.snippet && cite.snippet.trim().length > 0 && (
                              <p className="text-[11px] text-stone-600 leading-snug line-clamp-2">
                                {cite.snippet.trim()}
                              </p>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* RIGHT PANE: INTERACTIVE MAP */}
      <InteractiveTripMap />
    </div>
  );
};
