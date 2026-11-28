import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { i18nDict } from '../../data/i18n';
import type { BackpackItem } from '../../types';

interface BackpackIconProps {
  className?: string;
  filled?: boolean;
}

export const BackpackIcon: React.FC<BackpackIconProps> = ({
  className = 'w-4 h-4',
  filled = false,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={filled ? 1.6 : 1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    {/* Top carry loop */}
    <path d="M9 5.5V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" fill="none" />
    {/* Main body */}
    <path d="M6.5 9.5A4.5 4.5 0 0 1 11 5h2a4.5 4.5 0 0 1 4.5 4.5V19a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V9.5Z" />
    {/* Side strap accents */}
    <path d="M4.5 11.5v5.5a1.5 1.5 0 0 0 1.5 1.5h.5" fill="none" />
    <path d="M19.5 11.5v5.5a1.5 1.5 0 0 1-1.5 1.5h-.5" fill="none" />
    {/* Front flap / pocket detail */}
    <path
      d="M9 13h6v4.5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V13Z"
      fill={filled ? '#132A1E' : 'none'}
      fillOpacity={filled ? 0.22 : 0}
    />
    <path d="M9 9.5h6" fill="none" />
  </svg>
);

interface BackpackToggleButtonProps {
  item: BackpackItem;
  variant?: 'card-overlay' | 'inline-pill' | 'banner-cta';
  className?: string;
  labelAdd?: string;
  labelAdded?: string;
}

export const BackpackToggleButton: React.FC<BackpackToggleButtonProps> = ({
  item,
  variant = 'inline-pill',
  className = '',
  labelAdd,
  labelAdded,
}) => {
  const { lang, isInBackpack, toggleBackpackItem } = useAppContext();
  const t = i18nDict[lang];
  const packed = isInBackpack(item.id);
  const addText = labelAdd || t.backpackAdd;
  const addedText = labelAdded || t.backpackAdded;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    toggleBackpackItem(item);
  };

  if (variant === 'card-overlay') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={packed}
        aria-label={packed ? `${addedText}: ${item.title}` : `${addText}: ${item.title}`}
        title={packed ? addedText : addText}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold backdrop-blur-md border transition-all duration-200 cursor-pointer select-none shadow-md ${
          packed
            ? 'bg-[#D48C46] text-[#132A1E] border-[#F7F3EB]/60 hover:bg-[#c57d36]'
            : 'bg-[#132A1E]/70 text-[#F7F3EB] border-white/25 hover:bg-[#132A1E]/92 hover:border-[#D48C46]/70'
        } ${className}`}
      >
        <BackpackIcon className="w-3.5 h-3.5 shrink-0" filled={packed} />
        <span className="leading-none">
          {packed ? (
            <span className="inline-flex items-center gap-1">
              <i className="fa-solid fa-check text-[10px]" aria-hidden="true" />
              <span className="hidden sm:inline">{lang === 'en' ? 'Packed' : 'Đã lưu'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5">
              <i className="fa-solid fa-plus text-[9px]" aria-hidden="true" />
              <span className="hidden sm:inline">{lang === 'en' ? 'Pack' : 'Balo'}</span>
            </span>
          )}
        </span>
      </button>
    );
  }

  if (variant === 'banner-cta') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={packed}
        className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer ${
          packed
            ? 'bg-emerald-700 hover:bg-emerald-800 text-[#F7F3EB] border border-emerald-400/35'
            : 'bg-[#D48C46] hover:bg-[#c57d36] text-[#132A1E]'
        } ${className}`}
      >
        <BackpackIcon className="w-4 h-4 shrink-0" filled={packed} />
        <span>{packed ? `✓ ${addedText}` : addText}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={packed}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
        packed
          ? 'bg-[#D48C46]/20 border-[#D48C46] text-[#132A1E] hover:bg-[#D48C46]/30'
          : 'border-[#132A1E]/25 bg-[#F7F3EB] hover:bg-[#EFE6D5] text-[#132A1E]'
      } ${className}`}
    >
      <BackpackIcon className="w-4 h-4 shrink-0 text-[#8C3B2B]" filled={packed} />
      <span>{packed ? `✓ ${addedText}` : `+ ${addText}`}</span>
    </button>
  );
};
