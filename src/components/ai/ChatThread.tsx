import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { AiCitation, ChatTurn, Language, QuickClarificationOption } from '../../types';

interface ChatThreadProps {
  variant: 'inline' | 'popup';
}

const CLARIFICATION_FIELD_ORDER: Array<QuickClarificationOption['field']> = [
  'travelers',
  'dates',
  'budget',
];

const CLARIFICATION_FIELD_META: Record<
  QuickClarificationOption['field'],
  { vi: string; en: string; icon: string }
> = {
  travelers: { vi: 'Số người / Nhóm đi', en: 'Travelers', icon: 'fa-users' },
  dates: { vi: 'Thời điểm & Thời lượng', en: 'Dates & Duration', icon: 'fa-calendar-days' },
  budget: { vi: 'Ngân sách dự kiến', en: 'Budget', icon: 'fa-wallet' },
};

export function normalizeCitationUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (/^(https?:\/\/|\/)/i.test(trimmed)) {
    return trimmed;
  }
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

export function getCitationSourceMeta(
  cite: AiCitation,
  normalizedUrl: string,
  lang: Language
): { badge: string; icon: string; isExternal: boolean } {
  const isExternal = /^https?:\/\//i.test(normalizedUrl);
  let hostname = '';
  if (isExternal) {
    try {
      hostname = new URL(normalizedUrl).hostname.replace(/^www\./i, '');
    } catch {
      hostname = '';
    }
  }

  if (cite.source === 'tavily' || isExternal) {
    return {
      badge: hostname ? `Web • ${hostname}` : lang === 'en' ? 'Live Web' : 'Tra cứu Web',
      icon: 'fa-globe',
      isExternal: true,
    };
  }
  if (cite.source === 'cms' || normalizedUrl.startsWith('/blog/')) {
    return {
      badge: lang === 'en' ? 'Editorial Guide' : 'Cẩm nang Đắk Lắk',
      icon: 'fa-book-open',
      isExternal: false,
    };
  }
  return {
    badge: lang === 'en' ? 'Local Directory' : 'Dữ liệu bản địa',
    icon: 'fa-location-dot',
    isExternal: false,
  };
}

function renderInlineSegments(text: string): React.ReactNode[] {
  // Match **bold**, [label](url), or bare https://... URLs
  const tokenRegex = /(\*\*[^*]+\*\*|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\)|https?:\/\/[^\s)<]+)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-[#132A1E]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    const mdLinkMatch = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)$/);
    if (mdLinkMatch) {
      return (
        <a
          key={idx}
          href={mdLinkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#8C3B2B] underline decoration-[#D48C46] hover:text-[#D48C46] transition-colors"
        >
          {mdLinkMatch[1]}
        </a>
      );
    }

    if (/^https?:\/\/[^\s)<]+$/i.test(part)) {
      const cleanUrl = part.replace(/[.,;!?]+$/, '');
      return (
        <a
          key={idx}
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#8C3B2B] underline decoration-[#D48C46] hover:text-[#D48C46] break-all transition-colors"
        >
          {cleanUrl}
        </a>
      );
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function renderFormattedReply(reply: string): React.ReactNode {
  const lines = reply.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listOrdered = false;

  const flushList = (keyPrefix: string) => {
    if (listItems.length > 0) {
      if (listOrdered) {
        blocks.push(
          <ol
            key={`ol-${keyPrefix}`}
            className="list-decimal pl-4.5 space-y-1.5 text-[#132A1E]"
          >
            {listItems}
          </ol>
        );
      } else {
        blocks.push(
          <ul
            key={`ul-${keyPrefix}`}
            className="list-disc pl-4.5 space-y-1.5 text-[#132A1E] marker:text-[#8C3B2B]"
          >
            {listItems}
          </ul>
        );
      }
      listItems = [];
      listOrdered = false;
    }
  };

  lines.forEach((rawLine, lineIdx) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList(`empty-${lineIdx}`);
      return;
    }

    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      flushList(`h-${lineIdx}`);
      blocks.push(
        <h4
          key={`h-${lineIdx}`}
          className="text-[13px] font-bold text-[#132A1E] tracking-tight pt-1"
        >
          {renderInlineSegments(headingMatch[1])}
        </h4>
      );
      return;
    }

    const quoteMatch = trimmed.match(/^>\s+(.+)$/);
    if (quoteMatch) {
      flushList(`q-${lineIdx}`);
      blocks.push(
        <blockquote
          key={`q-${lineIdx}`}
          className="border-l-2 border-[#D48C46] pl-2.5 py-0.5 text-[#5A4E44] italic leading-relaxed"
        >
          {renderInlineSegments(quoteMatch[1])}
        </blockquote>
      );
      return;
    }

    const unorderedMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (unorderedMatch || orderedMatch) {
      const nextOrdered = Boolean(orderedMatch);
      if (listItems.length > 0 && listOrdered !== nextOrdered) {
        flushList(`switch-${lineIdx}`);
      }
      listOrdered = nextOrdered;
      const content = unorderedMatch ? unorderedMatch[1] : orderedMatch![1];
      listItems.push(
        <li key={`li-${lineIdx}`} className="leading-relaxed">
          {renderInlineSegments(content)}
        </li>
      );
      return;
    }

    flushList(`line-${lineIdx}`);
    blocks.push(
      <p key={`p-${lineIdx}`} className="text-[#132A1E] leading-relaxed">
        {renderInlineSegments(trimmed)}
      </p>
    );
  });

  flushList('end');
  return <div className="space-y-2">{blocks}</div>;
}

const LANGGRAPH_TOOL_META: Record<
  string,
  { vi: string; en: string; icon: string }
> = {
  search_local_daklak_catalog: {
    vi: 'Dữ liệu bản địa',
    en: 'Local Catalog',
    icon: 'fa-database',
  },
  search_live_web_tavily: {
    vi: 'Tra cứu Web (Tavily)',
    en: 'Tavily Web Search',
    icon: 'fa-globe',
  },
  update_trip_intake: {
    vi: 'Phân tích yêu cầu',
    en: 'Trip Intake',
    icon: 'fa-sliders',
  },
  plan_or_modify_itinerary: {
    vi: 'Thiết kế lịch trình',
    en: 'Itinerary Planner',
    icon: 'fa-route',
  },
};

function getLangGraphToolBadge(
  toolName: string,
  lang: Language
): { label: string; icon: string } {
  const meta = LANGGRAPH_TOOL_META[toolName];
  if (meta) {
    return {
      label: lang === 'en' ? meta.en : meta.vi,
      icon: meta.icon,
    };
  }
  return {
    label: toolName.replace(/_/g, ' '),
    icon: 'fa-gears',
  };
}

function getTurnBadgeMeta(
  turn: ChatTurn,
  hasWebCitations: boolean,
  lang: Language
): { label: string; icon: string; badgeClass: string } {
  const isEn = lang === 'en';
  if (turn.isError) {
    return {
      label: isEn ? 'Notice' : 'Thông báo',
      icon: 'fa-circle-exclamation',
      badgeClass: 'bg-amber-100/90 text-amber-900 border-amber-300',
    };
  }
  if (turn.status === 'needs_clarification') {
    return {
      label: isEn ? 'Clarify Trip Details' : 'Bổ sung thông tin chuyến đi',
      icon: 'fa-sliders',
      badgeClass: 'bg-[#D48C46]/20 text-[#8C3B2B] border-[#D48C46]/45',
    };
  }
  if (turn.intent === 'general_qa' || turn.followUpAction === 'current_trip_qa') {
    if (hasWebCitations) {
      return {
        label: isEn ? 'Q&A • Live Web Search' : 'Hỏi đáp • Tra cứu Web thực tế',
        icon: 'fa-globe',
        badgeClass: 'bg-emerald-950/10 text-[#132A1E] border-emerald-800/30',
      };
    }
    return {
      label: isEn ? 'Travel Concierge Q&A' : 'Tư vấn & Giải đáp thông tin',
      icon: 'fa-comments',
      badgeClass: 'bg-stone-200/75 text-[#132A1E] border-stone-300',
    };
  }
  return {
    label: isEn ? 'Tailored Itinerary' : 'Thiết kế & Cập nhật lịch trình',
    icon: 'fa-route',
    badgeClass: 'bg-[#132A1E]/10 text-[#132A1E] border-[#132A1E]/25',
  };
}

export const ChatThread: React.FC<ChatThreadProps> = ({ variant }) => {
  const {
    lang,
    chatHistory,
    pendingTurn,
    isThinking,
    switchPlannerResultTab,
    submitChatFeedback,
    applyClarificationPreset,
    submitClarificationOption,
    skipClarificationToGeneralQa,
  } = useAppContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stagedOptions, setStagedOptions] = useState<
    Record<string, Partial<Record<QuickClarificationOption['field'], string>>>
  >({});

  const isEn = lang === 'en';

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, [chatHistory.length, pendingTurn === null, pendingTurn?.user, pendingTurn?.statusText]);

  const hasContent = chatHistory.length > 0 || pendingTurn !== null;

  if (variant === 'inline' && !hasContent) {
    return null;
  }

  const handleSelectClarificationPill = (
    turnId: string,
    field: QuickClarificationOption['field'],
    valueText: string,
    availableFields: Array<QuickClarificationOption['field']>
  ) => {
    if (isThinking) return;

    // If only 1 field group is requested, submit immediately on click
    if (availableFields.length <= 1) {
      submitClarificationOption(valueText);
      return;
    }

    const currentTurnStaged = stagedOptions[turnId] || {};
    const nextTurnStaged: Partial<Record<QuickClarificationOption['field'], string>> = {
      ...currentTurnStaged,
      [field]: currentTurnStaged[field] === valueText ? undefined : valueText,
    };

    setStagedOptions((prev) => ({
      ...prev,
      [turnId]: nextTurnStaged,
    }));

    // Auto-submit once the user has picked an option for every displayed missing field
    const selectedValues = availableFields
      .map((f) => nextTurnStaged[f])
      .filter((v): v is string => Boolean(v && v.trim()));

    if (selectedValues.length === availableFields.length) {
      setStagedOptions((prev) => {
        const copy = { ...prev };
        delete copy[turnId];
        return copy;
      });
      submitClarificationOption(selectedValues.join(', '));
    }
  };

  const handleConfirmStagedClarification = (
    turnId: string,
    availableFields: Array<QuickClarificationOption['field']>
  ) => {
    if (isThinking) return;
    const currentTurnStaged = stagedOptions[turnId] || {};
    const selectedValues = availableFields
      .map((f) => currentTurnStaged[f])
      .filter((v): v is string => Boolean(v && v.trim()));
    if (selectedValues.length === 0) return;

    setStagedOptions((prev) => {
      const copy = { ...prev };
      delete copy[turnId];
      return copy;
    });
    submitClarificationOption(selectedValues.join(', '));
  };

  const containerClass =
    variant === 'inline'
      ? 'max-w-4xl mx-auto w-full px-1 sm:px-2 pt-2 pb-4 space-y-4 max-h-[380px] sm:max-h-[440px] overflow-y-auto overscroll-contain scroll-smooth chat-thread-scrollbar transition-all duration-500 ease-out'
      : 'flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth p-4 pb-6 space-y-3.5 chat-thread-scrollbar bg-[#F7F3EB]';

  return (
    <div
      ref={containerRef}
      id={variant === 'inline' ? 'chatbot-messages-area' : 'popup-chat-messages'}
      className={containerClass}
    >
      {chatHistory.map((turn, idx) => {
        const isLatestTurn = idx === chatHistory.length - 1;
        const shouldAnimate = !pendingTurn && isLatestTurn;

        const validCitations = (turn.citations || [])
          .map((cite) => {
            const normalizedUrl = normalizeCitationUrl(cite.url);
            return normalizedUrl ? { cite, normalizedUrl } : null;
          })
          .filter(
            (item, cIdx, arr): item is { cite: AiCitation; normalizedUrl: string } =>
              item !== null &&
              arr.findIndex((other) => other?.normalizedUrl === item.normalizedUrl) === cIdx
          );

        const hasWebCitations = validCitations.some(
          ({ cite, normalizedUrl }) =>
            cite.source === 'tavily' || /^https?:\/\//i.test(normalizedUrl)
        );
        const badgeMeta = getTurnBadgeMeta(turn, hasWebCitations, lang);

        const availableClarificationFields = turn.clarificationOptions
          ? CLARIFICATION_FIELD_ORDER.filter((field) =>
              turn.clarificationOptions!.some((opt) => opt.field === field)
            )
          : [];
        const turnStaged = stagedOptions[turn.id] || {};
        const stagedCount = availableClarificationFields.filter((f) => Boolean(turnStaged[f]))
          .length;

        return (
          <div key={turn.id} className={`space-y-2.5 ${shouldAnimate ? 'animate-chat-bubble' : ''}`}>
            {/* Tin nhắn người dùng */}
            <div className="flex justify-end">
              <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-[#132A1E] text-[#F7F3EB] border border-[#D48C46]/45 px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-lg leading-relaxed">
                {turn.user}
              </div>
            </div>

            {/* Phản hồi từ Đắk Lắk AI Concierge */}
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-[#F7F3EB] border border-[#D48C46]/60 text-[#8C3B2B] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold shadow-md">
                ✦
              </div>
              <div className="flex-1 min-w-0 rounded-2xl rounded-tl-sm bg-[#F7F3EB] border border-[#E5DEC9] px-4 py-3 text-xs sm:text-[13px] text-[#1C1917] leading-relaxed space-y-2.5 shadow-lg">
                {/* Turn Mode Context Badge & LangGraph Tool Execution Badges */}
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono font-semibold ${badgeMeta.badgeClass}`}
                  >
                    <i className={`fa-solid ${badgeMeta.icon} text-[9px]`} aria-hidden="true" />
                    <span>{badgeMeta.label}</span>
                  </span>

                  {turn.toolsUsed && turn.toolsUsed.length > 0 && (
                    <div
                      className="flex flex-wrap items-center gap-1"
                      aria-label={isEn ? 'LangGraph tools executed' : 'Công cụ LangGraph đã chạy'}
                    >
                      {Array.from(new Set(turn.toolsUsed)).map((toolName) => {
                        const toolMeta = getLangGraphToolBadge(toolName, lang);
                        return (
                          <span
                            key={toolName}
                            title={
                              turn.graphNodesVisited && turn.graphNodesVisited.length > 0
                                ? `LangGraph: ${turn.graphNodesVisited.join(' → ')}`
                                : `LangGraph tool: ${toolName}`
                            }
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/85 border border-[#E5DEC9] text-[9px] font-mono font-medium text-stone-600"
                          >
                            <i
                              className={`fa-solid ${toolMeta.icon} text-[8px] text-[#8C3B2B]`}
                              aria-hidden="true"
                            />
                            <span>{toolMeta.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {turn.reply && renderFormattedReply(turn.reply)}

                {turn.aiSummary && (
                  <>
                    {!turn.reply ? (
                      <p>
                        {isEn ? (
                          <>
                            Designed itinerary <strong>{turn.aiSummary.title}</strong> (
                            {turn.aiSummary.duration} • {turn.aiSummary.companionLabel} •{' '}
                            {turn.aiSummary.budgetLabel} budget) with{' '}
                            <strong>
                              {turn.aiSummary.dayCount} days / {turn.aiSummary.totalStops} stops
                            </strong>
                            . Explore the <em>Route Map</em>, <em>Detailed Schedule</em>, or{' '}
                            <em>Local Tips</em> on the Canvas.
                          </>
                        ) : (
                          <>
                            Đã thiết kế hành trình <strong>{turn.aiSummary.title}</strong> (
                            {turn.aiSummary.duration} • {turn.aiSummary.companionLabel} • Ngân sách{' '}
                            {turn.aiSummary.budgetLabel}) gồm{' '}
                            <strong>
                              {turn.aiSummary.dayCount} ngày / {turn.aiSummary.totalStops} điểm dừng
                            </strong>
                            . Bạn có thể xem <em>Lộ trình tổng quan</em>,{' '}
                            <em>Lịch trình chi tiết</em> hoặc <em>Mẹo &amp; Kinh nghiệm</em> ngay
                            trên Canvas.
                          </>
                        )}
                      </p>
                    ) : (
                      <div className="rounded-xl bg-white/80 border border-[#E5DEC9] px-3 py-2 text-[11px] sm:text-xs text-[#132A1E]">
                        <span className="font-bold">{turn.aiSummary.title}</span>{' '}
                        <span className="text-stone-600">
                          ({turn.aiSummary.duration} • {turn.aiSummary.companionLabel} •{' '}
                          {turn.aiSummary.budgetLabel} • {turn.aiSummary.dayCount}{' '}
                          {isEn ? 'days' : 'ngày'} / {turn.aiSummary.totalStops}{' '}
                          {isEn ? 'stops' : 'điểm dừng'})
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => switchPlannerResultTab('map')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#D48C46]/25 hover:bg-[#D48C46]/40 border border-[#D48C46]/50 text-[11px] font-semibold text-[#132A1E] transition-colors"
                      >
                        <i className="fa-solid fa-map-location-dot text-[#8C3B2B]" aria-hidden="true" />
                        <span>{isEn ? 'Route Map' : 'Lộ trình tổng quan'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => switchPlannerResultTab('schedule')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-[#EFECE4] border border-[#E5DEC9] text-[11px] font-semibold text-[#132A1E] transition-colors"
                      >
                        <i className="fa-regular fa-clock text-[#132A1E]" aria-hidden="true" />
                        <span>{isEn ? 'Detailed Schedule' : 'Lịch trình chi tiết'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => switchPlannerResultTab('tips')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-[#EFECE4] border border-[#E5DEC9] text-[11px] font-semibold text-[#132A1E] transition-colors"
                      >
                        <i className="fa-solid fa-compass-drafting text-[#8C3B2B]" aria-hidden="true" />
                        <span>{isEn ? 'Local Tips' : 'Mẹo & Kinh nghiệm'}</span>
                      </button>
                    </div>
                  </>
                )}

                {isLatestTurn &&
                  turn.clarificationOptions &&
                  turn.clarificationOptions.length > 0 && (
                    <div className="pt-1.5 border-t border-[#E5DEC9]/75 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] font-semibold text-[#132A1E]">
                          {isEn
                            ? 'Quick-fill missing trip details (or ask any question directly):'
                            : 'Chọn nhanh thông tin còn thiếu (hoặc gõ câu hỏi bất kỳ bên dưới):'}
                        </div>
                        <button
                          type="button"
                          disabled={isThinking}
                          onClick={() => skipClarificationToGeneralQa(turn.user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#D48C46]/15 border border-[#8C3B2B]/35 text-[11px] font-semibold text-[#8C3B2B] transition-colors disabled:opacity-50"
                        >
                          <i className="fa-regular fa-circle-question text-[10px]" aria-hidden="true" />
                          <span>
                            {isEn
                              ? 'Just answer my question'
                              : 'Chỉ hỏi đáp thông tin (Bỏ qua lên lịch)'}
                          </span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {CLARIFICATION_FIELD_ORDER.map((field) => {
                          const opts = turn.clarificationOptions!.filter(
                            (opt) => opt.field === field
                          );
                          if (opts.length === 0) return null;
                          const meta = CLARIFICATION_FIELD_META[field];
                          const selectedVal = turnStaged[field];
                          return (
                            <div key={field} className="space-y-1">
                              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-500">
                                <i
                                  className={`fa-solid ${meta.icon} text-[#8C3B2B]`}
                                  aria-hidden="true"
                                />
                                <span>{isEn ? meta.en : meta.vi}</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {opts.map((opt, optIdx) => {
                                  const isSelected = selectedVal === opt.valueText;
                                  return (
                                    <button
                                      key={`${field}-${opt.label}-${optIdx}`}
                                      type="button"
                                      disabled={isThinking}
                                      aria-pressed={isSelected}
                                      onClick={() =>
                                        handleSelectClarificationPill(
                                          turn.id,
                                          field,
                                          opt.valueText,
                                          availableClarificationFields
                                        )
                                      }
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold shadow-2xs transition-colors disabled:opacity-50 ${
                                        isSelected
                                          ? 'bg-[#132A1E] text-[#F7F3EB] border-[#D48C46]'
                                          : 'bg-[#132A1E]/5 hover:bg-[#D48C46]/25 border-[#132A1E]/25 hover:border-[#D48C46] text-[#132A1E]'
                                      }`}
                                    >
                                      {isSelected && (
                                        <i
                                          className="fa-solid fa-check text-[9px] text-[#D48C46]"
                                          aria-hidden="true"
                                        />
                                      )}
                                      <span>{opt.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {stagedCount > 0 && availableClarificationFields.length > 1 && (
                        <div className="pt-1 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-stone-600">
                            {isEn
                              ? `Selected ${stagedCount}/${availableClarificationFields.length} details`
                              : `Đã chọn ${stagedCount}/${availableClarificationFields.length} mục`}
                          </span>
                          <button
                            type="button"
                            disabled={isThinking}
                            onClick={() =>
                              handleConfirmStagedClarification(
                                turn.id,
                                availableClarificationFields
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D48C46] hover:bg-[#c57d36] text-[#132A1E] text-[11px] font-bold shadow-xs transition-colors disabled:opacity-50"
                          >
                            <i className="fa-solid fa-wand-magic-sparkles text-[10px]" aria-hidden="true" />
                            <span>
                              {isEn
                                ? 'Build itinerary with selection'
                                : 'Tạo lịch trình với lựa chọn này'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                {isLatestTurn && turn.suggestedPresets && turn.suggestedPresets.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <div className="text-[11px] font-semibold text-[#8C3B2B]">
                      {isEn
                        ? 'Or open a curated sample itinerary immediately:'
                        : 'Hoặc mở nhanh lịch trình mẫu có sẵn:'}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {turn.suggestedPresets.map((preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          disabled={isThinking}
                          onClick={() => applyClarificationPreset(preset.key)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#D48C46]/20 border border-[#D48C46]/55 hover:border-[#D48C46] text-[11px] font-semibold text-[#132A1E] shadow-2xs transition-colors disabled:opacity-50"
                        >
                          <span className="text-[#8C3B2B] font-mono text-[10px]">
                            {preset.badge}
                          </span>
                          <span>• {preset.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {validCitations.length > 0 && (
                  <div className="pt-2 border-t border-[#E5DEC9]/80 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-500">
                        {isEn
                          ? 'Sources & Grounded References'
                          : 'Nguồn tham khảo & Dữ liệu thực tế'}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        {validCitations.length} {isEn ? 'sources' : 'nguồn'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {validCitations.map(({ cite, normalizedUrl }, cIdx) => {
                        const sourceMeta = getCitationSourceMeta(cite, normalizedUrl, lang);
                        return (
                          <a
                            key={`${normalizedUrl}-${cIdx}`}
                            href={normalizedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/cite flex flex-col gap-1 p-2.5 rounded-xl bg-white/90 hover:bg-white border border-[#E5DEC9] hover:border-[#D48C46] transition-all"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F7F3EB] border border-[#E5DEC9] text-[9px] font-mono font-semibold text-[#8C3B2B] shrink-0">
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

                {turn.traceId && (
                  <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-[#E5DEC9]/60">
                    <span className="text-[10px] text-stone-500 font-mono">
                      {turn.feedbackRating
                        ? isEn
                          ? 'Feedback recorded'
                          : 'Đã ghi nhận đánh giá'
                        : isEn
                          ? 'Was this response helpful?'
                          : 'Phản hồi này có hữu ích?'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => submitChatFeedback(turn.id, turn.traceId!, 1)}
                        aria-label={isEn ? 'Helpful' : 'Hữu ích'}
                        aria-pressed={turn.feedbackRating === 1}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] transition-colors ${
                          turn.feedbackRating === 1
                            ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-2xs'
                            : 'bg-white hover:bg-emerald-50 text-stone-600 border-[#E5DEC9]'
                        }`}
                      >
                        <span aria-hidden="true">👍</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => submitChatFeedback(turn.id, turn.traceId!, -1)}
                        aria-label={isEn ? 'Not helpful' : 'Chưa hữu ích'}
                        aria-pressed={turn.feedbackRating === -1}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] transition-colors ${
                          turn.feedbackRating === -1
                            ? 'bg-[#8C3B2B] text-white border-[#8C3B2B] font-bold shadow-2xs'
                            : 'bg-white hover:bg-rose-50 text-stone-600 border-[#E5DEC9]'
                        }`}
                      >
                        <span aria-hidden="true">👎</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Pending AI Thinking Turn */}
      {pendingTurn && (
        <div className="space-y-2.5 animate-chat-bubble">
          <div className="flex justify-end">
            <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-[#132A1E] text-[#F7F3EB] border border-[#D48C46]/45 px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-lg leading-relaxed">
              {pendingTurn.user}
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="relative w-8 h-8 rounded-xl bg-[#132A1E] border border-[#D48C46]/65 flex items-center justify-center shrink-0 mt-0.5 ai-copilot-core shadow-md">
              <span className="absolute inset-0.5 rounded-lg border border-dashed border-[#D48C46]/80 ai-copilot-orbit" />
              <i className="fa-solid fa-compass text-[#D48C46] text-xs" aria-hidden="true" />
            </div>
            <div className="flex-1 rounded-2xl rounded-tl-sm bg-[#F7F3EB] border border-[#D48C46]/55 px-4 py-3 text-xs sm:text-[13px] text-[#132A1E] shadow-lg">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8C3B2B]">
                  Đắk Lắk AI Copilot
                </span>
                <span className="inline-flex items-center gap-1" aria-hidden="true">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D48C46] ai-thinking-dot-1" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D48C46] ai-thinking-dot-2" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D48C46] ai-thinking-dot-3" />
                </span>
              </div>
              <p
                key={pendingTurn.statusText}
                className="ai-thinking-status-text font-medium text-[#132A1E] leading-relaxed animate-status-swap"
              >
                {pendingTurn.statusText}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
