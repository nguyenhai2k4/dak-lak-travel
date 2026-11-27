import React from 'react';
import { useAppContext } from '../../context/AppContext';

export const ToastNotification: React.FC = () => {
  const { toastMessage, toastVisible, toastAction } = useAppContext();

  return (
    <div
      id="toast-notification"
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 left-5 z-[80] flex items-center gap-3 bg-[#132A1E] text-white text-xs sm:text-sm font-medium px-4 py-3 rounded-2xl shadow-2xl border border-[#D48C46]/45 transition-all duration-300 max-w-[calc(100vw-2.5rem)] sm:max-w-md ${
        toastVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      <span className="w-2.5 h-2.5 rounded-full bg-[#D48C46] shrink-0" />
      <span className="flex-1 leading-snug">{toastMessage}</span>
      {toastAction && (
        <button
          type="button"
          onClick={toastAction.onClick}
          className="shrink-0 px-2.5 py-1 rounded-lg bg-[#D48C46] hover:bg-[#c57d36] text-[#132A1E] text-[11px] font-bold transition-colors whitespace-nowrap"
        >
          {toastAction.label}
        </button>
      )}
    </div>
  );
};
