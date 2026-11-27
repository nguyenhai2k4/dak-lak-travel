import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { i18nDict } from '../../data/i18n';
import { dakLakPlaceDirectory } from '../../data/places';
import { budgetMultipliers, companionLabels } from '../../data/plannerCatalog';
import type { BudgetType, CompanionType, DurationType } from '../../types';
import {
  buildBackpackItemFromPlace,
  summarizeBackpackGeography,
} from '../../utils/backpackHelpers';
import { getCitationSourceMeta, normalizeCitationUrl } from '../ai/ChatThread';
import { BackpackIcon } from './BackpackIcon';

const POPULAR_STARTER_TITLES = [
  'Bảo tàng Thế giới Cà phê',
  'Thác Dray Nur Hùng Vĩ',
  'Hồ Lắk & Buôn Jun',
  'Buôn cổ Ako Dhông',
];

const DURATION_OPTIONS: DurationType[] = ['2N1D', '3N2D', '4N3D+'];
const COMPANION_OPTIONS: CompanionType[] = ['solo', 'couple', 'family', 'friends'];
const BUDGET_OPTIONS: BudgetType[] = ['budget', 'standard', 'luxury'];

export const TripBackpackDrawer: React.FC = () => {
  const {
    lang,
    backpackItems,
    isBackpackOpen,
    backpackAiInsights,
    isBackpackAiLoading,
    duration,
    companion,
    budget,
    isThinking,
    closeBackpackDrawer,
    isInBackpack,
    toggleBackpackItem,
    removeBackpackItem,
    moveBackpackItem,
    clearBackpack,
    selectPlannerChip,
    openCanvasFromBackpack,
    askBackpackAi,
    optimizeBackpackWithAi,
    clearBackpackAiInsights,
  } = useAppContext();

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showTripContext, setShowTripContext] = useState(false);
  const [customAiQuestion, setCustomAiQuestion] = useState('');

  const isEn = lang === 'en';
  const t = i18nDict[lang];

  const geoSummary = useMemo(() => summarizeBackpackGeography(backpackItems), [backpackItems]);

  const starterPlaces = useMemo(
    () =>
      POPULAR_STARTER_TITLES.map((title) =>
        dakLakPlaceDirectory.find((p) => p.title === title)
      ).filter((p): p is NonNullable<typeof p> => Boolean(p)),
    []
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return dakLakPlaceDirectory
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [searchQuery]);

  if (!isBackpackOpen) return null;

  const handleCustomAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customAiQuestion.trim();
    if (!trimmed || isBackpackAiLoading) return;
    setCustomAiQuestion('');
    void askBackpackAi('custom', trimmed);
  };

  const handleOpenStory = (slug: string) => {
    closeBackpackDrawer();
    navigate(`/blog/${slug}`);
  };

  const companionEnLabels: Record<CompanionType, string> = {
    solo: 'Solo',
    couple: 'Couple',
    family: 'Family',
    friends: 'Friends',
  };

  const budgetEnLabels: Record<BudgetType, string> = {
    budget: 'Budget',
    standard: 'Standard',
    luxury: 'Luxury',
  };

  return (
    <div
      id="trip-backpack-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backpack-drawer-title"
      className="fixed inset-0 z-[65] flex justify-end bg-[#0D1D14]/65 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeBackpackDrawer();
      }}
    >
      <aside className="relative w-full max-w-[460px] h-full bg-[#F7F3EB] text-[#132A1E] border-l border-[#E5DEC9] shadow-[0_24px_72px_-12px_rgba(0,0,0,0.55)] flex flex-col overflow-hidden animate-panel-reveal">
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-[#132A1E] text-[#F7F3EB] border-b border-[#D48C46]/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-[#D48C46]/20 border border-[#D48C46]/50 text-[#D48C46] flex items-center justify-center shrink-0">
              <BackpackIcon className="w-5 h-5" filled={backpackItems.length > 0} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="backpack-drawer-title"
                  className="font-serif font-bold text-xl leading-none truncate"
                >
                  {t.backpackTitle}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#D48C46] text-[#132A1E] font-mono text-[11px] font-bold">
                  {backpackItems.length}
                </span>
              </div>
              <p className="text-[11px] text-stone-300 mt-1 line-clamp-1">{t.backpackSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {backpackItems.length > 0 && (
              <button
                type="button"
                onClick={clearBackpack}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-[#8C3B2B] text-[11px] font-semibold text-stone-200 hover:text-white transition-colors cursor-pointer"
                title={isEn ? 'Clear all items' : 'Xóa tất cả điểm trong Balo'}
              >
                {isEn ? 'Clear' : 'Xóa hết'}
              </button>
            )}
            <button
              type="button"
              onClick={closeBackpackDrawer}
              aria-label={isEn ? 'Close Trip Backpack' : 'Đóng Balo Hành Trình'}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-[#F7F3EB] flex items-center justify-center transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Quick-Add Landmark Search */}
          <div className="relative">
            <div className="flex items-center gap-2 rounded-2xl bg-white border border-[#E5DEC9] focus-within:border-[#D48C46] px-3.5 py-2.5 shadow-2xs">
              <i className="fa-solid fa-magnifying-glass text-xs text-stone-400" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isEn
                    ? 'Quick-add a Đắk Lắk landmark (Dray Nur, Hồ Lắk...)'
                    : 'Tìm nhanh điểm đến Đắk Lắk (Dray Nur, Hồ Lắk...)'
                }
                className="flex-1 bg-transparent text-xs sm:text-sm text-[#132A1E] placeholder-stone-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={isEn ? 'Clear search' : 'Xóa tìm kiếm'}
                  className="text-xs text-stone-400 hover:text-[#8C3B2B] cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="mt-1.5 rounded-2xl bg-white border border-[#E5DEC9] shadow-lg overflow-hidden divide-y divide-stone-100">
                {searchResults.map((place) => {
                  const candidate = buildBackpackItemFromPlace(place);
                  const packed = isInBackpack(candidate.id);
                  return (
                    <div
                      key={place.title}
                      className="flex items-center justify-between gap-2.5 p-2.5 hover:bg-[#FAF7F0] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={place.image}
                          alt={place.title}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 bg-[#132A1E]"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#132A1E] truncate">
                            {place.title}
                          </div>
                          <div className="text-[11px] text-stone-500 truncate">{place.location}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          toggleBackpackItem(candidate);
                          setSearchQuery('');
                        }}
                        className={`shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                          packed
                            ? 'bg-[#D48C46]/25 text-[#8C3B2B] border border-[#D48C46]'
                            : 'bg-[#132A1E] hover:bg-[#8C3B2B] text-[#F7F3EB]'
                        }`}
                      >
                        {packed ? (isEn ? '✓ Packed' : '✓ Đã lưu') : isEn ? '+ Pack' : '+ Lưu'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Geographic Glance (Deterministic, Zero-AI) */}
          {backpackItems.length > 0 && (
            <div className="rounded-2xl bg-white/90 border border-[#E5DEC9] px-3.5 py-3 space-y-1.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-bold uppercase tracking-wider text-[#8C3B2B] inline-flex items-center gap-1.5">
                  <i className="fa-solid fa-route text-[10px]" aria-hidden="true" />
                  <span>{isEn ? 'Route Glance' : 'Tổng quan cụm tuyến'}</span>
                </span>
                <span className="font-mono font-semibold text-[#132A1E]">
                  ~{geoSummary.estimatedRouteKm} km ·{' '}
                  {isEn ? `Suggested ${geoSummary.suggestedDuration}` : `Gợi ý ${geoSummary.suggestedDuration}`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {geoSummary.areas.map((area) => (
                  <span
                    key={area}
                    className="px-2 py-0.5 rounded-full bg-[#F7F3EB] border border-[#E5DEC9] text-[10px] font-semibold text-[#132A1E]"
                  >
                    📍 {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Empty State vs Saved Destinations List */}
          {backpackItems.length === 0 ? (
            <div className="rounded-3xl bg-white/85 border border-dashed border-[#D9CEB8] p-6 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#132A1E]/8 border border-[#E5DEC9] text-[#8C3B2B] flex items-center justify-center">
                <BackpackIcon className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif text-xl font-bold text-[#132A1E]">
                  {t.backpackEmptyTitle}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed max-w-xs mx-auto">
                  {t.backpackEmptyDesc}
                </p>
              </div>

              <div className="pt-2 text-left space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  {isEn ? 'Popular Đắk Lắk Highlights' : 'Điểm nổi bật gợi ý lưu nhanh'}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {starterPlaces.map((place) => {
                    const item = buildBackpackItemFromPlace(place);
                    return (
                      <button
                        key={place.title}
                        type="button"
                        onClick={() => toggleBackpackItem(item)}
                        className="flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-[#F7F3EB] hover:bg-[#EFE6D5] border border-[#E5DEC9] text-left transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={place.image}
                            alt={place.title}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 bg-[#132A1E]"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#132A1E] group-hover:text-[#8C3B2B] truncate">
                              {place.title}
                            </div>
                            <div className="text-[10px] text-stone-500 truncate">
                              {place.location}
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 w-7 h-7 rounded-xl bg-[#132A1E] text-[#D48C46] flex items-center justify-center text-xs font-bold">
                          +
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {backpackItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white border border-[#E5DEC9] p-3 flex items-start gap-3 shadow-2xs hover:border-[#D48C46]/70 transition-colors"
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#132A1E]">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1 left-1 w-5 h-5 rounded-md bg-[#132A1E]/85 text-[#D48C46] font-mono text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs sm:text-[13px] font-bold text-[#132A1E] leading-snug line-clamp-2">
                        {item.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeBackpackItem(item.id)}
                        aria-label={isEn ? `Remove ${item.title}` : `Gỡ ${item.title}`}
                        className="w-6 h-6 rounded-lg text-stone-400 hover:text-[#8C3B2B] hover:bg-stone-100 flex items-center justify-center text-xs shrink-0 transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-stone-600">
                      <span className="px-1.5 py-0.5 rounded-md bg-[#F7F3EB] border border-[#E5DEC9] font-semibold text-[#132A1E]">
                        {item.areaCluster}
                      </span>
                      {item.duration && <span>· {item.duration}</span>}
                      {item.seasonHint && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[#D48C46]/15 text-[#8C3B2B] font-semibold">
                          {item.seasonHint}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        {item.sourcePostSlug && (
                          <button
                            type="button"
                            onClick={() => handleOpenStory(item.sourcePostSlug!)}
                            className="text-[10px] font-bold text-[#8C3B2B] hover:underline cursor-pointer"
                          >
                            {isEn ? 'Read story ↗' : 'Đọc lại bài ↗'}
                          </button>
                        )}
                      </div>

                      {backpackItems.length > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveBackpackItem(idx, -1)}
                            aria-label={isEn ? 'Move up' : 'Đẩy lên'}
                            className="w-6 h-6 rounded-md bg-[#F7F3EB] hover:bg-[#EFE6D5] border border-[#E5DEC9] text-[10px] text-[#132A1E] disabled:opacity-35 cursor-pointer"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx === backpackItems.length - 1}
                            onClick={() => moveBackpackItem(idx, 1)}
                            aria-label={isEn ? 'Move down' : 'Đẩy xuống'}
                            className="w-6 h-6 rounded-md bg-[#F7F3EB] hover:bg-[#EFE6D5] border border-[#E5DEC9] text-[10px] text-[#132A1E] disabled:opacity-35 cursor-pointer"
                          >
                            ↓
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Optional Collapsible Trip Context */}
          {backpackItems.length > 0 && (
            <div className="rounded-2xl bg-white/85 border border-[#E5DEC9] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTripContext((v) => !v)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[#FAF7F0] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <i className="fa-solid fa-sliders text-[11px] text-[#8C3B2B]" aria-hidden="true" />
                  <span className="text-[11px] font-bold text-[#132A1E]">
                    {isEn ? 'Trip preferences (optional)' : 'Tùy chỉnh chuyến đi (tùy chọn)'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-600 shrink-0">
                  <span>
                    {duration} · {isEn ? companionEnLabels[companion] : companionLabels[companion]} ·{' '}
                    {isEn ? budgetEnLabels[budget] : budgetMultipliers[budget].label}
                  </span>
                  <span>{showTripContext ? '▲' : '▼'}</span>
                </div>
              </button>

              {showTripContext && (
                <div className="px-3.5 pb-3.5 pt-2 border-t border-[#E5DEC9]/70 space-y-2.5 text-[11px]">
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      {isEn ? 'Duration' : 'Thời lượng'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {DURATION_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => selectPlannerChip('duration', opt)}
                          className={`px-2.5 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                            duration === opt
                              ? 'bg-[#132A1E] text-[#F7F3EB]'
                              : 'bg-[#F7F3EB] text-[#132A1E] border border-[#E5DEC9] hover:border-[#D48C46]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      {isEn ? 'Travelers' : 'Nhóm đồng hành'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMPANION_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => selectPlannerChip('companion', opt)}
                          className={`px-2.5 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                            companion === opt
                              ? 'bg-[#132A1E] text-[#F7F3EB]'
                              : 'bg-[#F7F3EB] text-[#132A1E] border border-[#E5DEC9] hover:border-[#D48C46]'
                          }`}
                        >
                          {isEn ? companionEnLabels[opt] : companionLabels[opt]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      {isEn ? 'Budget Tier' : 'Mức ngân sách'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {BUDGET_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => selectPlannerChip('budget', opt)}
                          className={`px-2.5 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                            budget === opt
                              ? 'bg-[#132A1E] text-[#F7F3EB]'
                              : 'bg-[#F7F3EB] text-[#132A1E] border border-[#E5DEC9] hover:border-[#D48C46]'
                          }`}
                        >
                          {isEn ? budgetEnLabels[opt] : budgetMultipliers[opt].label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inline On-Demand AI Insights Panel (Pricing / Transport / Custom Q&A) */}
          {(isBackpackAiLoading || backpackAiInsights.length > 0) && (
            <div className="rounded-2xl bg-[#132A1E] text-[#F7F3EB] p-4 space-y-3 border border-[#D48C46]/40 shadow-md">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#D48C46]">
                  <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                  <span>{isEn ? 'AI Concierge Notes' : 'Tư vấn nhanh từ AI Concierge'}</span>
                </span>
                {backpackAiInsights.length > 0 && !isBackpackAiLoading && (
                  <button
                    type="button"
                    onClick={clearBackpackAiInsights}
                    className="text-[10px] text-stone-300 hover:text-white cursor-pointer"
                  >
                    {isEn ? 'Dismiss' : 'Ẩn bớt'}
                  </button>
                )}
              </div>

              {isBackpackAiLoading && (
                <div className="flex items-center gap-2.5 py-2 text-xs text-stone-200">
                  <span className="w-4 h-4 rounded-full border-2 border-[#D48C46] border-t-transparent animate-spin shrink-0" />
                  <span>
                    {isEn
                      ? 'Checking local prices, routes & Đắk Lắk travel tips...'
                      : 'Đang tra cứu giá vé, phương tiện và mẹo thực tế cho Balo của bạn...'}
                  </span>
                </div>
              )}

              {backpackAiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="rounded-xl bg-white/8 border border-white/12 p-3 space-y-2"
                >
                  <div className="text-[11px] font-bold text-[#E6C29F]">{insight.prompt}</div>
                  <div className="text-xs text-stone-100 leading-relaxed whitespace-pre-line">
                    {insight.reply}
                  </div>
                  {insight.citations && insight.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {insight.citations.slice(0, 3).map((cite, cIdx) => {
                        const url = normalizeCitationUrl(cite.url);
                        if (!url) return null;
                        const meta = getCitationSourceMeta(cite, url, lang);
                        return (
                          <a
                            key={`${insight.id}-cite-${cIdx}`}
                            href={url}
                            target={meta.isExternal ? '_blank' : undefined}
                            rel={meta.isExternal ? 'noopener noreferrer' : undefined}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-[#D48C46]/25 text-[10px] text-stone-200 border border-white/15 transition-colors"
                          >
                            <span>{meta.badge}:</span>
                            <span className="truncate max-w-[140px]">{cite.title}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        {backpackItems.length > 0 && (
          <div className="px-5 py-4 bg-white border-t border-[#E5DEC9] space-y-3 shrink-0">
            {/* Primary Zero-AI Self-Serve Action */}
            <button
              type="button"
              onClick={openCanvasFromBackpack}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#132A1E] hover:bg-[#1b3a2a] text-[#F7F3EB] text-xs sm:text-sm font-bold shadow-md transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-map-location-dot text-[#D48C46]" aria-hidden="true" />
              <span>{t.backpackManualCta}</span>
            </button>

            {/* Optional On-Demand AI Assistance */}
            <div className="pt-2 border-t border-stone-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C3B2B] inline-flex items-center gap-1.5">
                  <i className="fa-solid fa-sparkles" aria-hidden="true" />
                  <span>{t.backpackAiSectionTitle}</span>
                </span>
              </div>

              <button
                type="button"
                disabled={isThinking || isBackpackAiLoading}
                onClick={() => void optimizeBackpackWithAi()}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#D48C46] hover:bg-[#c57d36] text-[#132A1E] text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                <span>{t.backpackAiOptimize}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isBackpackAiLoading}
                  onClick={() => void askBackpackAi('pricing')}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#F7F3EB] hover:bg-[#EFE6D5] border border-[#E5DEC9] hover:border-[#D48C46] text-[11px] font-semibold text-[#132A1E] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <i className="fa-solid fa-coins text-[#8C3B2B] text-[10px]" aria-hidden="true" />
                  <span className="truncate">{t.backpackAiPricing}</span>
                </button>
                <button
                  type="button"
                  disabled={isBackpackAiLoading}
                  onClick={() => void askBackpackAi('transport')}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#F7F3EB] hover:bg-[#EFE6D5] border border-[#E5DEC9] hover:border-[#D48C46] text-[11px] font-semibold text-[#132A1E] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <i className="fa-solid fa-car-side text-[#8C3B2B] text-[10px]" aria-hidden="true" />
                  <span className="truncate">{t.backpackAiTransport}</span>
                </button>
              </div>

              {/* Free-form mini question */}
              <form onSubmit={handleCustomAiSubmit} className="flex items-center gap-1.5">
                <input
                  type="text"
                  disabled={isBackpackAiLoading}
                  value={customAiQuestion}
                  onChange={(e) => setCustomAiQuestion(e.target.value)}
                  placeholder={
                    isEn
                      ? `Ask AI about your ${backpackItems.length} saved places...`
                      : `Hỏi AI thêm về ${backpackItems.length} điểm đã lưu...`
                  }
                  className="flex-1 rounded-xl bg-[#F7F3EB] border border-[#E5DEC9] focus:border-[#D48C46] px-3 py-1.5 text-xs text-[#132A1E] placeholder-stone-500 focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={isBackpackAiLoading || !customAiQuestion.trim()}
                  aria-label={isEn ? 'Ask AI' : 'Gửi câu hỏi'}
                  className="w-8 h-8 rounded-xl bg-[#132A1E] hover:bg-[#8C3B2B] text-[#F7F3EB] flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <i className="fa-solid fa-paper-plane text-[11px]" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
