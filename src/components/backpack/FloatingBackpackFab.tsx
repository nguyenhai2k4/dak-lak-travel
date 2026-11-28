import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { BackpackIcon } from './BackpackIcon';

/**
 * Contextual Hybrid bottom-right Floating Backpack Pill.
 * Appears once the user packs >= 1 destination and automatically hides whenever
 * the Split-Screen Canvas (where AiChatPopup owns the corner), Backpack Drawer,
 * Editorial Modal, or Admin CMS routes are active.
 */
export const FloatingBackpackFab: React.FC = () => {
  const {
    lang,
    backpackItems,
    backpackPulseTick,
    isBackpackOpen,
    isSubmitted,
    modalArticle,
    isDsDrawerOpen,
    openBackpackDrawer,
  } = useAppContext();
  const location = useLocation();
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (backpackPulseTick === 0) return;
    setPulsing(true);
    const timer = window.setTimeout(() => setPulsing(false), 380);
    return () => window.clearTimeout(timer);
  }, [backpackPulseTick]);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const shouldHide =
    isAdminRoute ||
    backpackItems.length === 0 ||
    isBackpackOpen ||
    isSubmitted ||
    modalArticle !== null ||
    isDsDrawerOpen;

  if (shouldHide) return null;

  const isEn = lang === 'en';
  const count = backpackItems.length;

  return (
    <button
      type="button"
      id="floating-backpack-fab"
      onClick={openBackpackDrawer}
      aria-label={
        isEn
          ? `Open Trip Backpack (${count} saved destinations)`
          : `Mở Balo Hành Trình (${count} điểm đã lưu)`
      }
      className={`fixed bottom-5 right-5 z-[45] inline-flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-full bg-[#132A1E] hover:bg-[#1b3a2a] text-[#F7F3EB] border border-[#D48C46]/75 hover:border-[#D48C46] shadow-[0_16px_38px_-8px_rgba(19,42,30,0.55)] transition-all duration-300 hover:-translate-y-0.5 cursor-pointer animate-panel-reveal ${
        pulsing ? 'scale-110 ring-4 ring-[#D48C46]/40' : 'scale-100'
      }`}
    >
      <span className="relative w-7 h-7 rounded-full bg-[#D48C46]/20 border border-[#D48C46]/50 text-[#D48C46] flex items-center justify-center shrink-0">
        <BackpackIcon className="w-4 h-4" filled />
      </span>
      <span className="text-left leading-tight">
        <span className="block text-xs sm:text-[13px] font-bold tracking-wide">
          {isEn ? 'Trip Backpack' : 'Balo Hành Trình'}
        </span>
        <span className="block text-[10px] font-mono text-[#E6C29F]">
          {isEn
            ? `${count} ${count === 1 ? 'place' : 'places'} saved`
            : `${count} điểm đã lưu`}
        </span>
      </span>
      <span className="ml-0.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#D48C46] text-[#132A1E] font-mono text-[11px] font-bold flex items-center justify-center">
        {count}
      </span>
    </button>
  );
};
