import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { i18nDict } from '../../data/i18n';
import { buildBackpackItemFromPost } from '../../utils/backpackHelpers';
import { BackpackToggleButton } from '../backpack/BackpackIcon';

export const RedEarthStories: React.FC = () => {
  const { lang, storyPosts, openPostPreview } = useAppContext();
  const t = i18nDict[lang];
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const shouldMarquee = storyPosts.length >= 2;

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || !shouldMarquee) return;

    let driftPosition = 0;
    let currentVelocity = 30;
    let targetVelocity = 30;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartScroll = 0;
    let didDragMove = false;
    let lastFrameTime: number | null = null;
    let rafId = 0;

    const onMouseEnter = () => {
      targetVelocity = 0;
    };
    const onMouseLeave = () => {
      if (!isDragging) targetVelocity = 30;
    };
    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      didDragMove = false;
      targetVelocity = 0;
      dragStartX = e.pageX;
      dragStartScroll = driftPosition;
    };
    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        targetVelocity = 30;
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.pageX - dragStartX;
      if (Math.abs(dx) > 4) didDragMove = true;
      driftPosition = dragStartScroll - dx;
    };
    const onTouchStart = () => {
      targetVelocity = 0;
    };
    const onTouchEnd = () => {
      targetVelocity = 30;
    };
    const onClickCapture = (e: MouseEvent) => {
      if (didDragMove) {
        e.stopPropagation();
        didDragMove = false;
      }
    };

    viewport.addEventListener('mouseenter', onMouseEnter);
    viewport.addEventListener('mouseleave', onMouseLeave);
    viewport.addEventListener('mousedown', onMouseDown);
    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchend', onTouchEnd, { passive: true });
    viewport.addEventListener('click', onClickCapture, true);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    const animateDrift = (now: number) => {
      if (lastFrameTime === null) lastFrameTime = now;
      const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;

      currentVelocity += (targetVelocity - currentVelocity) * Math.min(1, dt * 5);

      const halfWidth = track.scrollWidth / 2;
      if (halfWidth > 0) {
        if (!isDragging) {
          driftPosition += currentVelocity * dt;
        }
        if (driftPosition >= halfWidth) {
          driftPosition -= halfWidth;
        } else if (driftPosition < 0) {
          driftPosition += halfWidth;
        }
        track.style.transform = `translate3d(${-driftPosition}px, 0, 0)`;
      }

      rafId = requestAnimationFrame(animateDrift);
    };

    rafId = requestAnimationFrame(animateDrift);

    return () => {
      cancelAnimationFrame(rafId);
      track.style.transform = '';
      viewport.removeEventListener('mouseenter', onMouseEnter);
      viewport.removeEventListener('mouseleave', onMouseLeave);
      viewport.removeEventListener('mousedown', onMouseDown);
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchend', onTouchEnd);
      viewport.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [shouldMarquee, storyPosts.length]);

  const itemsToRender = shouldMarquee ? [...storyPosts, ...storyPosts] : storyPosts;

  return (
    <section
      id="red-earth-stories"
      className="scroll-mt-16 do-paper-surface py-16 sm:py-24 border-b border-[#E5DEC9] overflow-hidden relative"
    >
      <div className="pointer-events-none absolute top-10 left-1/4 w-96 h-96 rounded-full bg-[#D48C46]/15 blur-3xl" />

      <div className="relative z-10 max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 mb-10">
        <div className="max-w-2xl space-y-2.5">
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#132A1E] leading-[1.12]">
            {t.storiesTitle}
          </h2>
          <p className="text-sm sm:text-base text-stone-700 leading-relaxed">{t.storiesSub}</p>
        </div>
      </div>

      {storyPosts.length === 0 ? (
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="rounded-3xl border border-dashed border-[#D9CEB8] bg-white/60 p-8 text-center text-sm text-stone-500">
            {lang === 'en'
              ? 'No published Red Earth stories yet.'
              : 'Chưa có câu chuyện đất đỏ nào được xuất bản.'}
          </div>
        </div>
      ) : (
        <div
          ref={viewportRef}
          id="floating-stories-viewport"
          className="relative w-full overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing py-4"
        >
          <div
            ref={trackRef}
            id="floating-stories-track"
            className="flex items-start gap-6 px-4 sm:px-8 w-max select-none"
          >
            {itemsToRender.map((item, idx) => {
              const offsetClass = item.storyConfig?.offsetClass || 'mt-0';
              const gradient = item.storyConfig?.gradient || 'from-[#132A1E] to-[#8C3B2B]';
              const backpackItem = buildBackpackItemFromPost(item);
              return (
                <article
                  key={`${item.id}-${idx}`}
                  className={`drift-card ${offsetClass} w-[290px] sm:w-[320px] rounded-3xl glass-card-light overflow-hidden hover:shadow-xl hover:border-[#D48C46] transition-all flex flex-col justify-between shrink-0 group`}
                >
                  <div>
                    <div
                      className={`h-44 bg-gradient-to-br ${gradient} p-4 relative overflow-hidden flex flex-col justify-between`}
                    >
                      <img
                        src={item.image}
                        alt={item.imageAlt || item.title}
                        loading="lazy"
                        className="drift-card-art absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0D1D14]/80 via-[#0D1D14]/25 to-black/25 pointer-events-none" />
                      <div className="relative z-10 flex items-start justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-xs text-[#F7F3EB] text-[10px] font-bold uppercase tracking-wider border border-white/20 max-w-[170px] truncate">
                          {item.category}
                        </span>
                        <BackpackToggleButton item={backpackItem} variant="card-overlay" />
                      </div>
                      <span className="relative z-10 text-[11px] font-mono text-stone-100/95 drop-shadow">
                        {item.location}
                      </span>
                    </div>

                    <div className="p-5 sm:p-6 space-y-2.5">
                      <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#132A1E] leading-snug group-hover:text-[#8C3B2B] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed">
                        {item.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-stone-200/60">
                    <button
                      type="button"
                      onClick={() => openPostPreview(item)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C3B2B] group-hover:text-[#D48C46] transition-colors cursor-pointer"
                    >
                      <span>{item.cta}</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
