import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { i18nDict } from '../../data/i18n';
import { sampleSchedulePresets } from '../../data/plannerCatalog';
import { AiChatPopup } from '../ai/AiChatPopup';
import { ChatThread } from '../ai/ChatThread';
import { ItineraryCanvasModal } from './ItineraryCanvasModal';

const QUICK_QA_SUGGESTIONS = {
  vi: [
    {
      icon: 'fa-cloud-sun',
      label: 'Mùa đẹp nhất & Thời tiết BMT?',
      prompt: 'Đi Đắk Lắk mùa nào đẹp nhất và thời tiết Buôn Ma Thuột cần lưu ý gì?',
    },
    {
      icon: 'fa-ticket',
      label: 'Giá vé Bảo tàng Cà phê & Dray Nur?',
      prompt: 'Giá vé tham quan Bảo tàng Thế giới Cà phê và thác Dray Nur hiện nay khoảng bao nhiêu?',
    },
    {
      icon: 'fa-bowl-food',
      label: 'Đặc sản & Quán cà phê ngon?',
      prompt: 'Ở Buôn Ma Thuột nên ăn đặc sản gì (bún đỏ, gà nướng cơm lam) và ghé quán cà phê đặc sản nào?',
    },
    {
      icon: 'fa-leaf',
      label: 'Xem voi thân thiện tại Yok Đôn?',
      prompt: 'Kinh nghiệm tham gia tour đi bộ ngắm voi thân thiện (không cưỡi voi) tại Vườn Quốc gia Yok Đôn?',
    },
  ],
  en: [
    {
      icon: 'fa-cloud-sun',
      label: 'Best season & BMT weather?',
      prompt: 'When is the best season to visit Đắk Lắk and what is the weather like in Buôn Ma Thuột?',
    },
    {
      icon: 'fa-ticket',
      label: 'Coffee Museum & Dray Nur tickets?',
      prompt: 'What are the current ticket prices and opening hours for the World Coffee Museum and Dray Nur Waterfall?',
    },
    {
      icon: 'fa-bowl-food',
      label: 'Local food & specialty coffee?',
      prompt: 'What local dishes and specialty Robusta coffee spots should I try in Buôn Ma Thuột?',
    },
    {
      icon: 'fa-leaf',
      label: 'Ethical elephant walk at Yok Đôn?',
      prompt: 'How do I join an ethical elephant observation tour (no elephant riding) at Yok Đôn National Park?',
    },
  ],
};

export const ItineraryPlanner: React.FC = () => {
  const {
    lang,
    isSubmitted,
    isThinking,
    activeSampleKey,
    chatHistory,
    pendingTurn,
    selectSampleSchedule,
    submitMainChatPrompt,
    switchPlannerResultTab,
  } = useAppContext();

  const [promptInput, setPromptInput] = useState('');
  const t = i18nDict[lang];
  const isEn = lang === 'en';
  const hasStartedChat = chatHistory.length > 0 || pendingTurn !== null || isSubmitted;
  const qaChips = QUICK_QA_SUGGESTIONS[lang] || QUICK_QA_SUGGESTIONS.vi;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isThinking || !promptInput.trim()) return;
    const val = promptInput.trim();
    setPromptInput('');
    submitMainChatPrompt(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isThinking && promptInput.trim()) {
        const val = promptInput.trim();
        setPromptInput('');
        submitMainChatPrompt(val);
      }
    }
  };

  return (
    <section
      id="itinerary-planner"
      className="scroll-mt-16 ede-brocade-bg text-white py-16 sm:py-24 relative overflow-hidden"
    >
      {/* Ambient Glow Orbs */}
      <div className="pointer-events-none absolute -top-28 left-1/4 w-[480px] h-[480px] rounded-full bg-[#D48C46]/18 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-0 right-10 w-[520px] h-[520px] rounded-full bg-[#8C3B2B]/22 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 -left-24 w-96 h-96 rounded-full bg-[#2D6A4F]/20 blur-[100px]" />

      <div className="relative max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-9">
        {/* Header */}
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-3.5">
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#F7F3EB] leading-[1.14]">
            {t.plannerTitle}
          </h2>
          <p className="text-sm sm:text-base text-stone-300 leading-relaxed max-w-2xl mx-auto">
            {t.plannerSub}
          </p>
        </div>

        {/* Workspace State 1 & State 2 */}
        <div id="planner-workspace" className="transition-all duration-700">
          {/* STATE 1: CỘT CHATBOT & 4 THẺ GỢI Ý */}
          <div
            id="planner-input-col"
            className="relative z-10 max-w-[1420px] mx-auto w-full flex flex-col gap-5 transition-all duration-500 ease-out"
          >
            {/* 4 Thẻ lịch trình mẫu (ẩn mượt khi bắt đầu chat) */}
            {!hasStartedChat && (
              <div
                id="chatbot-sample-schedules"
                className="relative space-y-3 transition-all duration-300 ease-out"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-all">
                  {sampleSchedulePresets.map((preset) => {
                    const isMatch = activeSampleKey === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        disabled={isThinking}
                        onClick={() => selectSampleSchedule(preset.key)}
                        className={`sample-schedule-btn group text-left p-3 rounded-2xl bg-[#F7F3EB] transition-all flex items-center gap-3.5 ${
                          isMatch
                            ? 'border-2 border-[#D48C46] ring-2 ring-[#D48C46]/45 shadow-2xl'
                            : 'border border-[#E5DEC9] shadow-xl shadow-black/40 hover:shadow-2xl hover:border-[#D48C46]'
                        } ${isThinking ? 'pointer-events-none opacity-60' : ''}`}
                      >
                        <div className="w-20 h-20 xl:w-24 xl:h-24 rounded-xl overflow-hidden shrink-0 bg-[#132A1E] shadow-xs">
                          <img
                            src={preset.image}
                            alt={preset.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#D48C46]/20 border border-[#D48C46]/45 text-[#8C3B2B] text-[10px] font-mono font-bold">
                            {preset.badge}
                          </span>
                          <div className="text-sm font-bold text-[#132A1E] group-hover:text-[#8C3B2B] transition-colors leading-snug line-clamp-2">
                            {preset.title}
                          </div>
                          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                            {preset.summary}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inline Chat Thread */}
            <ChatThread variant="inline" />

            {/* Khung Chat Composer */}
            <form
              id="chatbot-composer-box"
              onSubmit={handleSubmit}
              className="max-w-4xl mx-auto w-full rounded-3xl bg-[#F7F3EB] p-4 sm:p-5 border border-[#E5DEC9] focus-within:border-[#D48C46] focus-within:ring-2 focus-within:ring-[#D48C46]/30 transition-all shadow-[0_26px_64px_-14px_rgba(0,0,0,0.55)] space-y-3"
            >
              <div className="relative">
                <label htmlFor="chatbot-prompt-input" className="sr-only">
                  {isEn
                    ? 'Ask any Đắk Lắk question or describe your trip'
                    : 'Hỏi bất cứ điều gì về Đắk Lắk hoặc mô tả lịch trình bạn mong muốn'}
                </label>
                <textarea
                  id="chatbot-prompt-input"
                  rows={3}
                  disabled={isThinking}
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.plannerPlaceholder}
                  className="w-full bg-transparent text-[#132A1E] placeholder-stone-500 text-sm sm:text-base leading-relaxed resize-none focus:outline-none disabled:opacity-60"
                />
              </div>

              {/* Quick General Q&A & Live Web Search Suggestion Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#8C3B2B] mr-1">
                  {isEn ? 'Ask AI:' : 'Hỏi nhanh AI:'}
                </span>
                {qaChips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    disabled={isThinking}
                    onClick={() => submitMainChatPrompt(chip.prompt)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/85 hover:bg-[#D48C46]/20 border border-[#E5DEC9] hover:border-[#D48C46] text-[11px] font-medium text-[#132A1E] transition-colors disabled:opacity-50"
                  >
                    <i className={`fa-solid ${chip.icon} text-[10px] text-[#8C3B2B]`} aria-hidden="true" />
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-stone-300/80">
                <div className="flex items-center gap-2">
                  {hasStartedChat && (
                    <button
                      type="button"
                      disabled={isThinking}
                      onClick={() => switchPlannerResultTab('map')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#EFECE4] border border-[#E5DEC9] text-xs font-semibold text-[#132A1E] transition-colors disabled:opacity-50"
                    >
                      <i className="fa-solid fa-map-location-dot text-[#8C3B2B] text-xs" aria-hidden="true" />
                      <span>{isEn ? 'Open Trip Canvas' : 'Mở Canvas Lịch trình'}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5 ml-auto">
                  <span className="hidden sm:inline text-[11px] text-stone-500 font-mono">
                    Enter ↵
                  </span>
                  <button
                    type="submit"
                    disabled={isThinking || !promptInput.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#D48C46] hover:bg-[#c57d36] text-[#132A1E] text-xs sm:text-sm font-bold shadow-md shadow-black/15 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>
                      {hasStartedChat
                        ? isEn
                          ? 'Send Message'
                          : 'Gửi câu hỏi / Yêu cầu'
                        : t.plannerCta}
                    </span>
                    <i
                      className="fa-solid fa-paper-plane text-xs transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* STATE 2: FULL-SCREEN SPLIT TRAVEL CONSULTING CANVAS */}
          {isSubmitted && <ItineraryCanvasModal />}
          {isSubmitted && <AiChatPopup />}
        </div>
      </div>
    </section>
  );
};
