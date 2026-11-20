import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { i18nDict } from '../data/i18n';

const DEFAULT_BENTO_PATTERN: Array<'large' | 'small'> = [
  'large',
  'small',
  'small',
  'large',
  'large',
  'small',
];

export const BentoOverview: React.FC = () => {
  const { lang, bentoPosts, openPostPreview, cultureFocusActive } = useAppContext();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const t = i18nDict[lang];

  useEffect(() => {
    if (bentoPosts.length <= 1) {
      setActiveIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      if (!isHovered) {
        setActiveIndex((prev) => (prev + 1) % bentoPosts.length);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isHovered, bentoPosts.length]);

  return (
    <section
      id="bento-overview"
      className="scroll-mt-16 do-paper-surface py-16 sm:py-24 border-b border-[#E5DEC9] relative overflow-hidden"
    >
      {/* Ambient Orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#D48C46]/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full bg-[#8C3B2B]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 w-96 h-96 rounded-full bg-[#132A1E]/12 blur-3xl" />

      <div className="relative z-10 max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-12">
        <div className="max-w-2xl space-y-2.5">
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#132A1E] leading-[1.12]">
            {t.bentoTitle}
          </h2>
          <p className="text-sm sm:text-base text-stone-700 leading-relaxed">{t.bentoSub}</p>
        </div>

        <div id="bento-grid-container" className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
          {bentoPosts.map((post, idx) => {
            const size = post.bentoConfig?.size || DEFAULT_BENTO_PATTERN[idx % DEFAULT_BENTO_PATTERN.length];
            const imageLayout = post.bentoConfig?.imageLayout || (size === 'large' ? 'left' : 'top');
            const imageBgClass = post.bentoConfig?.imageBgClass || 'bg-[#132A1E]';
            const colSpanClass =
              size === 'large' ? 'md:col-span-7 lg:col-span-8' : 'md:col-span-5 lg:col-span-4';

            const isActive = idx === activeIndex;
            const isCultureFocused =
              cultureFocusActive &&
              (Boolean(post.bentoConfig?.isCultureHighlight) ||
                post.legacyKey === 'gong' ||
                post.legacyKey === 'matriarchy');

            const cardStateClass = [
              'bento-card',
              colSpanClass,
              'rounded-3xl glass-card-light overflow-hidden group',
              imageLayout === 'top' ? 'flex flex-col justify-between' : '',
              isActive ? 'bento-active-glow' : '',
              isCultureFocused ? 'bento-culture-focus' : '',
            ]
              .filter(Boolean)
              .join(' ');

            if (imageLayout === 'left') {
              return (
                <article
                  key={post.id}
                  id={`bento-card-${idx}`}
                  onMouseEnter={() => {
                    setIsHovered(true);
                    setActiveIndex(idx);
                  }}
                  onMouseLeave={() => setIsHovered(false)}
                  className={cardStateClass}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 h-full">
                    <div className={`sm:col-span-5 min-h-[240px] relative overflow-hidden ${imageBgClass}`}>
                      <img
                        src={post.image}
                        alt={post.imageAlt || post.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                    </div>

                    <div className="sm:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">
                      <div className="space-y-3">
                        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#132A1E] leading-snug group-hover:text-[#8C3B2B] transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-sm text-stone-600 leading-relaxed">{post.excerpt}</p>
                      </div>
                      <div className="pt-4 border-t border-stone-200/60">
                        <button
                          type="button"
                          onClick={() => openPostPreview(post)}
                          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#8C3B2B] hover:text-[#132A1E] transition-colors group/btn"
                        >
                          <span>{post.cta}</span>
                          <span className="transition-transform group-hover/btn:translate-x-1">→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            }

            const imageHeightClass = size === 'large' ? 'h-48 sm:h-52' : 'h-44 sm:h-48';
            const paddingClass = size === 'large' ? 'p-6 sm:p-8 space-y-5' : 'p-6 sm:p-7 space-y-4';
            const titleClass = size === 'large' ? 'text-2xl sm:text-3xl' : 'text-2xl sm:text-[26px]';
            const descClass = size === 'large' ? 'text-sm' : 'text-xs sm:text-sm';

            return (
              <article
                key={post.id}
                id={`bento-card-${idx}`}
                onMouseEnter={() => {
                  setIsHovered(true);
                  setActiveIndex(idx);
                }}
                onMouseLeave={() => setIsHovered(false)}
                className={cardStateClass}
              >
                <div className={`${imageHeightClass} relative overflow-hidden ${imageBgClass} shrink-0`}>
                  <img
                    src={post.image}
                    alt={post.imageAlt || post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                <div className={`${paddingClass} flex-1 flex flex-col justify-between`}>
                  <div className={size === 'large' ? 'space-y-3' : 'space-y-2.5'}>
                    <h3
                      className={`font-serif ${titleClass} font-bold text-[#132A1E] leading-snug group-hover:text-[#8C3B2B] transition-colors`}
                    >
                      {post.title}
                    </h3>
                    <p className={`${descClass} text-stone-600 leading-relaxed`}>{post.excerpt}</p>
                  </div>
                  <div className="pt-4 border-t border-stone-200/60">
                    <button
                      type="button"
                      onClick={() => openPostPreview(post)}
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#8C3B2B] hover:text-[#132A1E] transition-colors group/btn"
                    >
                      <span>{post.cta}</span>
                      <span className="transition-transform group-hover/btn:translate-x-1">→</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
