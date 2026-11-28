import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { i18nDict } from '../../data/i18n';
import { BackpackIcon } from '../backpack/BackpackIcon';

export const Header: React.FC = () => {
  const {
    lang,
    setLanguage,
    triggerIndigenousCultureHighlight,
    backpackItems,
    backpackPulseTick,
    openBackpackDrawer,
  } = useAppContext();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [badgePulsing, setBadgePulsing] = useState(false);
  const t = i18nDict[lang];
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';
  const backpackCount = backpackItems.length;

  useEffect(() => {
    if (backpackPulseTick === 0) return;
    setBadgePulsing(true);
    const timer = window.setTimeout(() => setBadgePulsing(false), 360);
    return () => window.clearTimeout(timer);
  }, [backpackPulseTick]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24 || !isHome);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const goToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (isHome) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/');
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  };

  const handleCultureClick = () => {
    setMobileMenuOpen(false);
    if (isHome) {
      triggerIndigenousCultureHighlight();
    } else {
      navigate('/');
      window.setTimeout(() => {
        triggerIndigenousCultureHighlight();
      }, 140);
    }
  };

  return (
    <header
      id="main-header"
      className={`fixed top-0 inset-x-0 z-40 ${scrolled ? 'header-scrolled' : ''}`}
    >
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 h-16 sm:h-[74px] flex items-center justify-between gap-3">
        {/* Bên trái: Logo Đắk Lắk + chữ ĐẮK LẮK */}
        <button
          type="button"
          onClick={() => goToSection('hero')}
          className="flex items-center gap-3 group focus:outline-none shrink-0 text-left"
        >
          <div className="w-11 h-11 overflow-hidden shrink-0">
            <img
              src="/dak-lak-logo.png"
              alt="Logo Đắk Lắk"
              className="w-full h-full object-cover object-center"
              style={{ transform: 'scale(1.68) translateY(10.7%)' }}
            />
          </div>
          <div className="leading-tight">
            <span className="block font-serif font-bold text-lg sm:text-xl tracking-[0.16em] text-white">
              ĐẮK LẮK
            </span>
            <span className="block text-[10px] font-medium tracking-wider text-[#D48C46] uppercase">
              {t.brandSub}
            </span>
          </div>
        </button>

        {/* Ở giữa (Menu) */}
        <nav aria-label="Điều hướng chính" className="hidden lg:flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToSection('bento-overview')}
            className="px-3.5 py-2 rounded-xl text-sm font-medium text-stone-100/90 hover:text-[#D48C46] hover:bg-white/8 transition-colors"
          >
            {t.navDestinations}
          </button>
          <button
            type="button"
            onClick={handleCultureClick}
            className="px-3.5 py-2 rounded-xl text-sm font-medium text-stone-100/90 hover:text-[#D48C46] hover:bg-white/8 transition-colors"
          >
            {t.navCulture}
          </button>
          <button
            type="button"
            onClick={() => goToSection('red-earth-stories')}
            className="px-3.5 py-2 rounded-xl text-sm font-medium text-stone-100/90 hover:text-[#D48C46] hover:bg-white/8 transition-colors"
          >
            {t.navStories}
          </button>
          <button
            type="button"
            onClick={() => goToSection('four-seasons')}
            className="px-3.5 py-2 rounded-xl text-sm font-medium text-stone-100/90 hover:text-[#D48C46] hover:bg-white/8 transition-colors"
          >
            {t.navSeasons}
          </button>
        </nav>

        {/* Bên phải: Ngôn ngữ (VN / EN) + Balo Hành Trình + CTA "Thiết kế lịch trình" */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div
            role="group"
            aria-label="Chuyển đổi ngôn ngữ"
            className="inline-flex items-center rounded-full bg-white/10 border border-white/15 p-0.5 text-[11px] font-bold"
          >
            <button
              type="button"
              onClick={() => setLanguage('vi')}
              className={`px-2.5 py-1 rounded-full transition-all ${
                lang === 'vi'
                  ? 'bg-[#D48C46] text-[#132A1E]'
                  : 'text-white/85 hover:text-white'
              }`}
            >
              VN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-full transition-all ${
                lang === 'en'
                  ? 'bg-[#D48C46] text-[#132A1E]'
                  : 'text-white/85 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Trip Backpack Trigger */}
          <button
            type="button"
            id="header-backpack-btn"
            onClick={() => {
              setMobileMenuOpen(false);
              openBackpackDrawer();
            }}
            aria-label={`${t.navBackpackLabel} (${backpackCount})`}
            title={t.navBackpackLabel}
            className={`relative inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full border transition-all cursor-pointer ${
              backpackCount > 0
                ? 'bg-white/15 border-[#D48C46]/70 text-[#F7F3EB] hover:bg-white/22'
                : 'bg-white/10 border-white/15 text-white/90 hover:bg-white/18 hover:border-white/30'
            } ${badgePulsing ? 'scale-110 ring-2 ring-[#D48C46]/60' : 'scale-100'}`}
          >
            <BackpackIcon
              className={`w-4 h-4 ${backpackCount > 0 ? 'text-[#D48C46]' : 'text-white'}`}
              filled={backpackCount > 0}
            />
            <span className="hidden xl:inline text-xs font-semibold">{t.navBackpackLabel}</span>
            {backpackCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#D48C46] text-[#132A1E] font-mono text-[10px] font-bold flex items-center justify-center leading-none">
                {backpackCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => goToSection('itinerary-planner')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-[#D48C46] hover:bg-[#c27a35] text-[#132A1E] text-xs sm:text-sm font-bold shadow-md shadow-black/20 transition-all"
          >
            <span>{t.navPlanCta}</span>
            <span className="hidden md:inline" aria-hidden="true">
              →
            </span>
          </button>

          <button
            type="button"
            aria-label="Mở menu điều hướng"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors text-base leading-none"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#132A1E]/98 backdrop-blur-xl border-b border-[#D48C46]/25 px-4 pt-2 pb-5 space-y-1.5">
          <button
            type="button"
            onClick={() => goToSection('bento-overview')}
            className="w-full text-left block px-3.5 py-2.5 rounded-xl text-sm font-medium text-stone-100 hover:bg-white/10"
          >
            {t.navDestinations}
          </button>
          <button
            type="button"
            onClick={handleCultureClick}
            className="w-full text-left block px-3.5 py-2.5 rounded-xl text-sm font-medium text-stone-100 hover:bg-white/10"
          >
            {t.navCulture}
          </button>
          <button
            type="button"
            onClick={() => goToSection('red-earth-stories')}
            className="w-full text-left block px-3.5 py-2.5 rounded-xl text-sm font-medium text-stone-100 hover:bg-white/10"
          >
            {t.navStories}
          </button>
          <button
            type="button"
            onClick={() => goToSection('four-seasons')}
            className="w-full text-left block px-3.5 py-2.5 rounded-xl text-sm font-medium text-stone-100 hover:bg-white/10"
          >
            {t.navSeasons}
          </button>
        </div>
      )}
    </header>
  );
};
