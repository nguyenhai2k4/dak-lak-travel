import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { i18nDict } from '../../data/i18n';
import { seasonsData } from '../../data/seasons';
import {
  buildSeasonYoutubeUrl,
  canEmbedYoutubeSafely,
  loadYoutubeIframeApi,
  resizeCanvasToDisplaySize,
  suppressYoutubeCaptions,
  YTPlayerInstance,
} from '../../utils/youtube';

export const FourSeasons: React.FC = () => {
  const { lang, planForSeason } = useAppContext();
  const t = i18nDict[lang];

  const [activeSeasonIdx, setActiveSeasonIdx] = useState(0);
  const [cardFading, setCardFading] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);
  const crispCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const progressRefs = useRef<Array<HTMLDivElement | null>>([]);

  const seasonPlayerRef = useRef<YTPlayerInstance | null>(null);
  const seasonPlayerReadyRef = useRef(false);
  const seasonPlayerStateRef = useRef(-1);
  const loadedSeasonIdxRef = useRef(0);
  const activeSeasonIdxRef = useRef(0);
  const seasonEndedRef = useRef(false);
  const lastClipLoadAtRef = useRef(0);
  const isInViewRef = useRef(false);
  const playRequestedRef = useRef(false);
  const advanceTimerRef = useRef<number | null>(null);
  const loadDebounceRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);

  const canEmbed = useMemo(() => canEmbedYoutubeSafely(), []);
  const initialIframeSrc = useMemo(
    () => (canEmbed ? buildSeasonYoutubeUrl(seasonsData[0], false) : undefined),
    [canEmbed]
  );

  const syncSeasonPlayerPlayback = useCallback((idx: number, fromUserClick: boolean) => {
    if (!canEmbedYoutubeSafely() || !seasonPlayerReadyRef.current || !seasonPlayerRef.current) return;
    if (loadDebounceRef.current) {
      window.clearTimeout(loadDebounceRef.current);
      loadDebounceRef.current = null;
    }

    const executeSync = () => {
      const player = seasonPlayerRef.current;
      if (!seasonPlayerReadyRef.current || !player || idx !== activeSeasonIdxRef.current) return;
      const data = seasonsData[idx];
      suppressYoutubeCaptions(player);
      try {
        if (typeof player.mute === 'function') player.mute();
      } catch {
        // ignore
      }

      const ytEndedState = typeof window.YT !== 'undefined' ? window.YT.PlayerState.ENDED : 0;
      const needsClipLoad =
        idx !== loadedSeasonIdxRef.current ||
        seasonEndedRef.current ||
        seasonPlayerStateRef.current === ytEndedState;

      if (needsClipLoad) {
        loadedSeasonIdxRef.current = idx;
        seasonEndedRef.current = false;
        lastClipLoadAtRef.current = performance.now();
        const payload: { videoId: string; startSeconds?: number; endSeconds?: number } = {
          videoId: data.videoId,
          startSeconds: data.videoStart,
        };
        if (data.videoEnd !== null && data.videoEnd !== undefined) {
          payload.endSeconds = data.videoEnd;
        }
        if (fromUserClick || isInViewRef.current || playRequestedRef.current) {
          try {
            if (typeof player.stopVideo === 'function') player.stopVideo();
          } catch {
            // ignore
          }
          player.loadVideoById(payload);
        } else if (typeof player.cueVideoById === 'function') {
          player.cueVideoById(payload);
        }
      } else if (fromUserClick || isInViewRef.current || playRequestedRef.current) {
        const liveState =
          typeof player.getPlayerState === 'function'
            ? player.getPlayerState()
            : seasonPlayerStateRef.current;
        if (
          typeof window.YT === 'undefined' ||
          (liveState !== window.YT.PlayerState.PLAYING &&
            liveState !== window.YT.PlayerState.BUFFERING)
        ) {
          lastClipLoadAtRef.current = performance.now();
          player.playVideo();
        }
      }
    };

    if (fromUserClick) {
      loadDebounceRef.current = window.setTimeout(() => {
        loadDebounceRef.current = null;
        executeSync();
      }, 160);
    } else {
      executeSync();
    }
  }, []);

  const selectSeason = useCallback(
    (idx: number, opts: { fromUserClick?: boolean; fromAutoEnd?: boolean } = {}) => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
      if (fadeTimerRef.current) {
        window.clearTimeout(fadeTimerRef.current);
      }

      activeSeasonIdxRef.current = idx;
      if (opts.fromUserClick) {
        playRequestedRef.current = true;
      }

      // Reset progress bars of non-active tabs
      progressRefs.current.forEach((el, i) => {
        if (el && i !== idx) {
          el.style.width = '0%';
        }
      });

      setCardFading(true);
      fadeTimerRef.current = window.setTimeout(() => {
        setActiveSeasonIdx(idx);
        setCardFading(false);
      }, 150);

      if (canEmbedYoutubeSafely()) {
        syncSeasonPlayerPlayback(idx, Boolean(opts.fromUserClick));
      }
    },
    [syncSeasonPlayerPlayback]
  );

  // Initialize YouTube Player API & IntersectionObserver
  useEffect(() => {
    if (!canEmbed || !ytIframeRef.current) return;
    let cancelled = false;

    loadYoutubeIframeApi()
      .then((YT) => {
        if (cancelled || !ytIframeRef.current) return;
        seasonPlayerRef.current = new YT.Player(ytIframeRef.current, {
          events: {
            onReady: (e) => {
              seasonPlayerReadyRef.current = true;
              suppressYoutubeCaptions(e.target);
              try {
                e.target.mute();
              } catch {
                // ignore
              }
              if (activeSeasonIdxRef.current !== loadedSeasonIdxRef.current) {
                syncSeasonPlayerPlayback(
                  activeSeasonIdxRef.current,
                  playRequestedRef.current || isInViewRef.current
                );
              } else if (playRequestedRef.current || isInViewRef.current) {
                lastClipLoadAtRef.current = performance.now();
                try {
                  e.target.playVideo();
                } catch {
                  // ignore
                }
              }
            },
            onApiChange: (e) => suppressYoutubeCaptions(e.target),
            onStateChange: (e) => {
              suppressYoutubeCaptions(e.target);
              seasonPlayerStateRef.current = e.data;
              if (e.data === YT.PlayerState.ENDED && !advanceTimerRef.current) {
                const sinceLoadMs = performance.now() - lastClipLoadAtRef.current;
                let videoUrl = '';
                try {
                  videoUrl =
                    typeof e.target.getVideoUrl === 'function' ? e.target.getVideoUrl() || '' : '';
                } catch {
                  // ignore
                }
                const currentData = seasonsData[activeSeasonIdxRef.current];
                const matchesActiveVideo = !videoUrl || videoUrl.includes(currentData.videoId);
                if (sinceLoadMs < 1200 || !matchesActiveVideo) return;

                seasonEndedRef.current = true;
                const finishedIdx = activeSeasonIdxRef.current;
                const prog = progressRefs.current[finishedIdx];
                if (prog) prog.style.width = '100%';

                advanceTimerRef.current = window.setTimeout(() => {
                  advanceTimerRef.current = null;
                  if (
                    (playRequestedRef.current || isInViewRef.current) &&
                    activeSeasonIdxRef.current === finishedIdx
                  ) {
                    selectSeason((finishedIdx + 1) % 4, { fromAutoEnd: true });
                  }
                }, 400);
              }
            },
          },
        });
      })
      .catch(() => {
        // Fallback canvas continues smoothly
      });

    let observer: IntersectionObserver | null = null;
    if (sectionRef.current && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            isInViewRef.current = entry.isIntersecting;
            if (entry.isIntersecting) {
              playRequestedRef.current = true;
              syncSeasonPlayerPlayback(activeSeasonIdxRef.current, false);
            } else if (
              seasonPlayerReadyRef.current &&
              seasonPlayerRef.current &&
              typeof seasonPlayerRef.current.pauseVideo === 'function'
            ) {
              try {
                seasonPlayerRef.current.pauseVideo();
              } catch {
                // ignore
              }
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(sectionRef.current);
    } else {
      isInViewRef.current = true;
    }

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
      if (loadDebounceRef.current) window.clearTimeout(loadDebounceRef.current);
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      if (seasonPlayerRef.current && typeof seasonPlayerRef.current.destroy === 'function') {
        try {
          seasonPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        seasonPlayerRef.current = null;
      }
      seasonPlayerReadyRef.current = false;
    };
  }, [canEmbed, selectSeason, syncSeasonPlayerPlayback]);

  // Seasonal ambient + crisp Canvas RAF loop + real-time progress bar sync
  useEffect(() => {
    let rafId = 0;

    const renderSeasonalCanvases = (now: number) => {
      const idx = activeSeasonIdxRef.current;
      const sData = seasonsData[idx];
      const activeProg = progressRefs.current[idx];
      const player = seasonPlayerRef.current;

      if (
        activeProg &&
        canEmbed &&
        seasonPlayerReadyRef.current &&
        player &&
        typeof player.getCurrentTime === 'function'
      ) {
        try {
          const startSec = sData.videoStart || 0;
          const rawDur = typeof player.getDuration === 'function' ? player.getDuration() : 0;
          const endSec =
            sData.videoEnd !== null && sData.videoEnd !== undefined ? sData.videoEnd : rawDur;
          const curSec = player.getCurrentTime();
          if (endSec > startSec && curSec >= startSec) {
            const pct = Math.max(0, Math.min(100, ((curSec - startSec) / (endSec - startSec)) * 100));
            activeProg.style.width = `${pct.toFixed(1)}%`;
          }
        } catch {
          // ignore
        }
      }

      const crispCanvas = crispCanvasRef.current;
      const bgCanvas = bgCanvasRef.current;
      if (crispCanvas && bgCanvas) {
        const crispCtx = crispCanvas.getContext('2d');
        const bgCtx = bgCanvas.getContext('2d');
        if (crispCtx && bgCtx) {
          const { w, h } = resizeCanvasToDisplaySize(crispCanvas);
          const bgSize = resizeCanvasToDisplaySize(bgCanvas);
          const sec = now * 0.001;

          const grad = crispCtx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, sData.palette.top);
          grad.addColorStop(0.55, sData.palette.mid);
          grad.addColorStop(1, sData.palette.bottom);
          crispCtx.fillStyle = grad;
          crispCtx.fillRect(0, 0, w, h);

          crispCtx.fillStyle = 'rgba(13, 29, 20, 0.55)';
          crispCtx.beginPath();
          crispCtx.moveTo(0, h * 0.72);
          crispCtx.quadraticCurveTo(w * 0.35, h * 0.55, w * 0.65, h * 0.7);
          crispCtx.quadraticCurveTo(w * 0.85, h * 0.6, w, h * 0.68);
          crispCtx.lineTo(w, h);
          crispCtx.lineTo(0, h);
          crispCtx.closePath();
          crispCtx.fill();

          if (idx === 0) {
            for (let i = 0; i < 38; i++) {
              const px = ((i * 67 + sec * 32) % (w + 40)) - 20;
              const py = (i * 43 + sec * 24 + Math.sin(sec + i) * 15) % (h * 0.85);
              crispCtx.fillStyle = 'rgba(255, 255, 255, 0.78)';
              crispCtx.beginPath();
              crispCtx.ellipse(px, py, 5, 2.5, sec + i, 0, Math.PI * 2);
              crispCtx.fill();
            }
          } else if (idx === 1) {
            const sunGrad = crispCtx.createRadialGradient(
              w * 0.72,
              h * 0.28,
              10,
              w * 0.72,
              h * 0.28,
              w * 0.35
            );
            sunGrad.addColorStop(0, 'rgba(244, 196, 78, 0.65)');
            sunGrad.addColorStop(1, 'rgba(244, 196, 78, 0)');
            crispCtx.fillStyle = sunGrad;
            crispCtx.fillRect(0, 0, w, h);

            crispCtx.strokeStyle = 'rgba(244, 196, 78, 0.35)';
            crispCtx.lineWidth = 1.5;
            for (let r = 0; r < 6; r++) {
              const ry = h * (0.74 + r * 0.04);
              crispCtx.beginPath();
              crispCtx.moveTo(w * 0.15, ry);
              crispCtx.quadraticCurveTo(w * 0.5, ry + Math.sin(sec * 2 + r) * 6, w * 0.88, ry);
              crispCtx.stroke();
            }
          } else if (idx === 2) {
            crispCtx.strokeStyle = 'rgba(216, 243, 220, 0.28)';
            crispCtx.lineWidth = 1.2;
            for (let m = 0; m < 45; m++) {
              const mx = (m * 47 + sec * 80) % w;
              const my = (m * 39 + sec * 420) % h;
              crispCtx.beginPath();
              crispCtx.moveTo(mx, my);
              crispCtx.lineTo(mx - 6, my + 18);
              crispCtx.stroke();
            }
          } else {
            for (let k = 0; k < 28; k++) {
              const kx = (k * 53) % w;
              const ky = h * (0.68 + (k % 5) * 0.055) + Math.sin(sec * 2 + k) * 3;
              crispCtx.fillStyle = k % 3 === 0 ? '#DC2626' : '#EAB308';
              crispCtx.beginPath();
              crispCtx.arc(kx, ky, k % 3 === 0 ? 4.5 : 6, 0, Math.PI * 2);
              crispCtx.fill();
            }
          }

          bgCtx.clearRect(0, 0, bgSize.w, bgSize.h);
          bgCtx.drawImage(crispCanvas, 0, 0, bgSize.w, bgSize.h);
        }
      }

      rafId = requestAnimationFrame(renderSeasonalCanvases);
    };

    rafId = requestAnimationFrame(renderSeasonalCanvases);
    return () => cancelAnimationFrame(rafId);
  }, [canEmbed]);

  const currentSeason = seasonsData[activeSeasonIdx];

  return (
    <section
      ref={sectionRef}
      id="four-seasons"
      className="scroll-mt-16 relative py-16 sm:py-24 overflow-hidden bg-[#132A1E] text-white"
    >
      {/* Background blurred canvas + dark overlay */}
      <canvas
        ref={bgCanvasRef}
        id="season-ambient-bg-canvas"
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-[10px] pointer-events-none transition-opacity duration-700"
      />
      <div className="absolute inset-0 bg-[#0F2419]/65 pointer-events-none" />

      <div className="relative z-10 max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-12">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#F7F3EB] leading-[1.15]">
            {t.seasonsTitle}
          </h2>
        </div>

        {/* Overlapping Cards */}
        <div className="relative flex flex-col lg:flex-row items-center justify-center pt-2">
          {/* Left Glassmorphism Card */}
          <div
            id="season-left-card"
            style={{ opacity: cardFading ? 0.45 : 1 }}
            className="w-full lg:w-[44%] lg:-mr-20 z-20 rounded-3xl glass-card-light text-[#1C1917] p-6 sm:p-9 season-overlap-shadow order-2 lg:order-1 -mt-8 lg:mt-0 mx-3 sm:mx-6 lg:mx-0 transition-all duration-500"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-[#8C3B2B] text-white text-xs font-bold tracking-wider">
                  {currentSeason.milestone}
                </span>
                <span className="text-xs font-mono text-stone-500">Đắk Lắk 4 Seasons</span>
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-3xl sm:text-4xl font-bold text-[#132A1E]">
                  {currentSeason.headline}
                </h3>
                <p className="font-serif italic text-lg sm:text-xl font-semibold text-[#8C3B2B]">
                  {currentSeason.subheadline}
                </p>
              </div>

              <p className="text-sm text-stone-700 leading-relaxed">{currentSeason.description}</p>

              <div className="pt-3 border-t border-stone-200/70 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    planForSeason(
                      currentSeason.plannerTheme,
                      currentSeason.headline,
                      currentSeason.subheadline,
                      currentSeason.milestone
                    )
                  }
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#132A1E] hover:bg-[#8C3B2B] text-[#F7F3EB] text-xs sm:text-sm font-bold transition-colors group"
                >
                  <span>{currentSeason.cta}</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Video Card */}
          <div className="w-full lg:w-[66%] z-10 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-[#0D1D14] aspect-[16/10] relative order-1 lg:order-2">
            <canvas
              ref={crispCanvasRef}
              id="season-crisp-canvas"
              className="absolute inset-0 w-full h-full block pointer-events-none"
            />
            {canEmbed && initialIframeSrc ? (
              <iframe
                ref={ytIframeRef}
                id="season-youtube-iframe"
                src={initialIframeSrc}
                title="Thước phim Cẩm nang 4 mùa Đắk Lắk"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="relative z-10 w-full h-full border-0 transition-opacity duration-500"
              />
            ) : (
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6 text-center bg-black/35 backdrop-blur-xs">
                <div className="max-w-md space-y-3 rounded-2xl bg-[#0D1D14]/80 border border-[#D48C46]/45 p-5 shadow-xl">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D48C46]/20 text-[#D48C46] text-[11px] font-mono font-bold">
                    <i className="fa-brands fa-youtube" aria-hidden="true" />
                    <span>Yêu cầu HTTP/Localhost cho YouTube Embed</span>
                  </span>
                  <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                    Hãy mở qua HTTP/HTTPS để phát video trực tiếp trong trang.
                  </p>
                  <a
                    href={`https://www.youtube.com/watch?v=${currentSeason.videoId}&t=${currentSeason.videoStart}s`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D48C46] hover:bg-[#c57d36] text-[#132A1E] text-xs font-bold transition-colors"
                  >
                    <span>Mở video mùa này trên YouTube</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline 4 mốc */}
        <div className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {seasonsData.map((season, idx) => {
              const isSelected = idx === activeSeasonIdx;
              return (
                <button
                  key={season.milestone}
                  type="button"
                  onClick={() => selectSeason(idx, { fromUserClick: true })}
                  className={`season-tab text-left p-4 rounded-2xl backdrop-blur-md transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-white/15 border-2 border-[#D48C46]'
                      : 'bg-white/6 hover:bg-white/10 border border-white/15'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between text-[11px] font-bold ${
                      isSelected ? 'text-[#D48C46]' : 'text-stone-300'
                    }`}
                  >
                    <span>{season.milestone}</span>
                    <span>{season.headline}</span>
                  </div>
                  <div
                    className={`text-sm font-bold mt-1 ${
                      isSelected ? 'text-white' : 'text-white/90'
                    }`}
                  >
                    {season.shortTimelineTitle}
                  </div>
                  <div className="mt-3 w-full h-1 bg-white/15 rounded-full overflow-hidden">
                    <div
                      ref={(el) => {
                        progressRefs.current[idx] = el;
                      }}
                      className="h-full bg-[#D48C46] w-0"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
