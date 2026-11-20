import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ChatThread } from './ChatThread';

const POPUP_QUICK_PROMPTS = {
  vi: [
    {
      label: 'Giá vé & Giờ mở cửa',
      prompt: 'Cho mình hỏi giá vé tham quan và giờ mở cửa của các điểm trong lịch trình hiện tại?',
    },
    {
      label: 'Quán ăn ngon gần lộ trình',
      prompt: 'Gợi ý các quán ăn đặc sản bản địa và quán cà phê ngon gần lộ trình các ngày này?',
    },
    {
      label: 'Tối ưu cung đường',
      prompt: 'Tối ưu lại thứ tự tuyến đường trong ngày để đỡ di chuyển vòng vèo giúp mình',
    },
    {
      label: 'Lưu ý thời tiết & trang phục',
      prompt: 'Thời tiết Đắk Lắk và trang phục, phương tiện di chuyển cần lưu ý gì cho lịch trình này?',
    },
  ],
  en: [
    {
      label: 'Tickets & Hours',
      prompt: 'What are the ticket prices and opening hours for the stops in my current itinerary?',
    },
    {
      label: 'Best food nearby',
      prompt: 'What local restaurants and specialty coffee shops do you recommend near my route?',
    },
    {
      label: 'Optimize route',
      prompt: 'Optimize the stop order in my days to minimize travel distance',
    },
    {
      label: 'Weather & Packing tips',
      prompt: 'What weather, clothing, and transport tips should I know for this Đắk Lắk itinerary?',
    },
  ],
};

export const AiChatPopup: React.FC = () => {
  const {
    lang,
    chatHistory,
    isPopupOpen,
    isThinking,
    openPopupChat,
    collapsePopupToFab,
    submitPopupChatPrompt,
  } = useAppContext();
  const [popupInput, setPopupInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const isEn = lang === 'en';
  const quickPrompts = POPUP_QUICK_PROMPTS[lang] || POPUP_QUICK_PROMPTS.vi;

  useEffect(() => {
    if (isPopupOpen) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
      return () => window.clearTimeout(timer);
    }
  }, [isPopupOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isThinking || !popupInput.trim()) return;
    const val = popupInput.trim();
    setPopupInput('');
    submitPopupChatPrompt(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isThinking && popupInput.trim()) {
        const val = popupInput.trim();
        setPopupInput('');
        submitPopupChatPrompt(val);
      }
    }
  };

  return (
    <>
      {isPopupOpen && (
        <div
          id="ai-chat-popup"
          className="fixed bottom-6 right-6 z-[60] w-[calc(100vw-2rem)] sm:w-[410px] h-[560px] max-h-[80vh] rounded-3xl bg-[#F7F3EB] text-[#132A1E] border border-[#E5DEC9] shadow-[0_28px_72px_-12px_rgba(0,0,0,0.62)] flex flex-col overflow-hidden animate-panel-reveal"
        >
          <div className="px-4 py-3 bg-[#F7F3EB] border-b border-[#E5DEC9] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#D48C46]/20 border border-[#D48C46]/50 text-[#8C3B2B] flex items-center justify-center text-[11px]">
                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
              </span>
              <div>
                <span className="block font-serif font-bold text-base leading-none text-[#132A1E]">
                  Đắk Lắk AI Concierge
                </span>
                <span className="block text-[10px] font-mono text-stone-500 mt-0.5">
                  {isEn
                    ? 'Ask anything, search live info & tailor itinerary'
                    : 'Hỏi đáp thông tin thực tế & Điều chỉnh lịch trình'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={collapsePopupToFab}
              title={isEn ? 'Minimize to Ask AI button' : 'Thu gọn thành nút Ask AI'}
              aria-label={isEn ? 'Minimize chat popup' : 'Thu gọn khung chat'}
              className="w-8 h-8 rounded-xl bg-white/80 hover:bg-[#D48C46]/20 border border-[#E5DEC9] text-[#132A1E] flex items-center justify-center transition-colors"
            >
              <i className="fa-solid fa-down-left-and-up-right-to-center text-xs" aria-hidden="true" />
            </button>
          </div>

          <ChatThread variant="popup" />

          {/* Quick Follow-Up & Q&A Chips */}
          <div className="px-3 pt-2 pb-1 bg-[#F7F3EB] border-t border-[#E5DEC9]/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {quickPrompts.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={isThinking}
                onClick={() => submitPopupChatPrompt(item.prompt)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#D48C46]/20 border border-[#E5DEC9] hover:border-[#D48C46] text-[10px] font-semibold text-[#132A1E] transition-colors disabled:opacity-50"
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <form
            id="popup-chat-form"
            onSubmit={handleSubmit}
            className="p-3 pt-1.5 bg-[#F7F3EB] shrink-0"
          >
            <div className="flex items-end gap-2 rounded-2xl bg-white border border-[#E5DEC9] focus-within:border-[#D48C46] px-3 py-2 shadow-xs">
              <label htmlFor="popup-chat-input" className="sr-only">
                {isEn
                  ? 'Ask AI any question or adjust your itinerary'
                  : 'Hỏi AI thông tin bất kỳ hoặc điều chỉnh lịch trình'}
              </label>
              <textarea
                ref={inputRef}
                id="popup-chat-input"
                rows={2}
                disabled={isThinking}
                value={popupInput}
                onChange={(e) => setPopupInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isEn
                    ? 'Ask about prices, weather, local food, or edit itinerary...'
                    : 'Hỏi giá vé, quán ăn, thời tiết hoặc yêu cầu đổi lịch trình...'
                }
                className="flex-1 bg-transparent text-[#132A1E] placeholder-stone-500 text-xs sm:text-sm leading-relaxed resize-none focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isThinking || !popupInput.trim()}
                aria-label={isEn ? 'Send request' : 'Gửi yêu cầu'}
                className="w-9 h-9 rounded-xl bg-[#D48C46] hover:bg-[#c57d36] text-[#132A1E] flex items-center justify-center shrink-0 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fa-solid fa-paper-plane text-xs" aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      )}

      {!isPopupOpen && (
        <button
          type="button"
          id="ai-chat-fab"
          onClick={openPopupChat}
          className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#132A1E] hover:bg-[#1b3a2a] text-[#F7F3EB] border border-[#D48C46]/70 hover:border-[#D48C46] shadow-[0_14px_34px_-6px_rgba(19,42,30,0.45)] text-xs sm:text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 animate-panel-reveal"
        >
          <span className="w-5 h-5 rounded-full bg-[#D48C46]/25 text-[#D48C46] flex items-center justify-center text-[11px]">
            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
          </span>
          <span>{isEn ? 'Ask AI Concierge' : 'Hỏi AI Concierge'}</span>
          {chatHistory.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#D48C46] text-[#132A1E] font-mono text-[10px] font-bold leading-none">
              {chatHistory.length}
            </span>
          )}
        </button>
      )}
    </>
  );
};
