import React from 'react';
import { useAppContext } from '../context/AppContext';

export const ToastNotification: React.FC = () => {
  const { toastMessage, toastVisible } = useAppContext();

  return (
    <div
      id="toast-notification"
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 left-5 z-[80] flex items-center gap-3 bg-[#132A1E] text-white text-xs sm:text-sm font-medium px-4 py-3.5 rounded-2xl shadow-2xl border border-[#D48C46]/40 transition-all duration-300 pointer-events-none max-w-sm ${
        toastVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
      }`}
    >
      <span className="w-2.5 h-2.5 rounded-full bg-[#D48C46] shrink-0" />
      <span>{toastMessage}</span>
    </div>
  );
};
