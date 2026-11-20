import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { i18nDict } from '../data/i18n';
import {
  canEmbedYoutubeSafely,
  loadYoutubeIframeApi,
  resizeCanvasToDisplaySize,
  suppressYoutubeCaptions,
  YTPlayerInstance,
} from '../utils/youtube';

function drawHeroScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sceneIdx: number,
  localT: number,
  globalSec: number
): void {
  ctx.save();
  if (sceneIdx === 0) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0E2419');
    grad.addColorStop(0.48, '#283622');
    grad.addColorStop(0.85, '#6B4326');
    grad.addColorStop(1, '#132A1E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const sunY = h * (0.56 - localT * 0.08);
    const sunGlow = ctx.createRadialGradient(w * 0.5, sunY, 10, w * 0.5, sunY, w * 0.34);
    sunGlow.addColorStop(0, 'rgba(247, 213, 156, 0.72)');
    sunGlow.addColorStop(0.4, 'rgba(212, 140, 70, 0.28)');
    sunGlow.addColorStop(1, 'rgba(212, 140, 70, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#102218';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    ctx.quadraticCurveTo(w * 0.25, h * 0.52, w * 0.52, h * 0.68);
    ctx.quadraticCurveTo(w * 0.78, h * 0.5, w, h * 0.66);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    for (let i = 0; i < 4; i++) {
      const mistX = ((globalSec * 38 + i * w * 0.28) % (w * 1.4)) - w * 0.2;
      const mistY = h * (0.62 + i * 0.06);
      const mistGrad = ctx.createRadialGradient(mistX, mistY, 10, mistX, mistY, w * 0.25);
      mistGrad.addColorStop(0, 'rgba(247, 243, 235, 0.16)');
      mistGrad.addColorStop(1, 'rgba(247, 243, 235, 0)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(0, 0, w, h);
    }
  } else if (sceneIdx === 1) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0C1E16');
    grad.addColorStop(0.5, '#17382A');
    grad.addColorStop(1, '#0F2419');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 24; i++) {
      const streamX = w * 0.22 + (i / 24) * w * 0.56;
      const streamW = w * 0.012 + (i % 3) * 4;
      const flowOffset = (globalSec * 360 + i * 53) % (h * 0.6);
      const streamGrad = ctx.createLinearGradient(0, h * 0.22, 0, h * 0.85);
      streamGrad.addColorStop(0, 'rgba(247, 243, 235, 0.08)');
      streamGrad.addColorStop(0.5, 'rgba(220, 242, 236, 0.34)');
      streamGrad.addColorStop(1, 'rgba(247, 243, 235, 0.05)');
      ctx.fillStyle = streamGrad;
      ctx.fillRect(streamX, h * 0.22 + flowOffset * 0.25, streamW, h * 0.55);
    }

    for (let p = 0; p < 36; p++) {
      const px = w * 0.2 + ((p * 73 + globalSec * 45) % (w * 0.6));
      const py = h * 0.82 - ((globalSec * 90 + p * 31) % (h * 0.35));
      const r = 6 + (p % 5) * 6;
      ctx.fillStyle = 'rgba(247, 243, 235, 0.11)';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (sceneIdx === 2) {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.55, 20, w * 0.5, h * 0.55, w * 0.65);
    grad.addColorStop(0, '#4A2614');
    grad.addColorStop(0.55, '#26140B');
    grad.addColorStop(1, '#121D16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(212, 140, 70, 0.34)';
    for (let r = 1; r <= 7; r++) {
      const radius = r * (Math.min(w, h) * 0.055) + Math.sin(globalSec * 2 + r) * 8;
      ctx.lineWidth = 3.5 - r * 0.3;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.58, radius * 1.45, radius * 0.72, globalSec * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    const pourGrad = ctx.createLinearGradient(0, 0, 0, h * 0.58);
    pourGrad.addColorStop(0, 'rgba(212, 140, 70, 0.15)');
    pourGrad.addColorStop(0.6, 'rgba(212, 140, 70, 0.65)');
    pourGrad.addColorStop(1, 'rgba(247, 213, 156, 0.85)');
    ctx.fillStyle = pourGrad;
    ctx.fillRect(w * 0.5 - 5, 0, 10, h * 0.58);
  } else {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.78, 15, w * 0.5, h * 0.65, w * 0.7);
    grad.addColorStop(0, '#7A3219');
    grad.addColorStop(0.45, '#241B14');
    grad.addColorStop(1, '#0D1D14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(212, 140, 70, 0.25)';
    ctx.lineWidth = 2;
    [0.26, 0.74].forEach((gx, idx) => {
      const pulse = Math.sin(globalSec * 4 + idx) * 6;
      ctx.beginPath();
      ctx.arc(w * gx, h * 0.45, Math.min(w, h) * 0.11 + pulse, 0, Math.PI * 2);
      ctx.stroke();
    });

    for (let s = 0; s < 42; s++) {
      const sx = w * 0.5 + Math.sin(globalSec * 1.8 + s * 1.7) * (w * 0.22);
      const sy = h * 0.9 - ((globalSec * 115 + s * 47) % (h * 0.75));
      const sr = 1.5 + (s % 3) * 1.2;
      ctx.fillStyle = s % 2 === 0 ? 'rgba(212, 140, 70, 0.75)' : 'rgba(247, 213, 156, 0.65)';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export const HeroSection: React.FC = () => {
  const { lang } = useAppContext();
  const t = i18nDict[lang];
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);

  // 10-second 4-scene fallback motion loop on HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let startTime: number | null = null;

    const renderLoop = (now: number) => {
      if (startTime === null) startTime = now;
      const { w, h } = resizeCanvasToDisplaySize(canvas);
      const elapsed = ((now - startTime) % 10000 + 10000) % 10000;
      const globalSec = now * 0.001;
      const sceneIdx = Math.floor(elapsed / 2500);
      const sceneProgress = (elapsed % 2500) / 2500;
      const nextSceneIdx = (sceneIdx + 1) % 4;

      drawHeroScene(ctx, w, h, sceneIdx, sceneProgress, globalSec);
      if (sceneProgress > 0.8) {
        const fadeAlpha = (sceneProgress - 0.8) / 0.2;
        ctx.save();
        ctx.globalAlpha = fadeAlpha;
        drawHeroScene(ctx, w, h, nextSceneIdx, 0, globalSec);
        ctx.restore();
      }
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // YouTube background video player + IntersectionObserver
  useEffect(() => {
    const canEmbed = canEmbedYoutubeSafely();
    const iframeEl = iframeRef.current;
    const sectionEl = sectionRef.current;
    if (!canEmbed || !iframeEl) return;

    let cancelled = false;

    loadYoutubeIframeApi()
      .then((YT) => {
        if (cancelled || !iframeRef.current) return;
        ytPlayerRef.current = new YT.Player(iframeRef.current, {
          events: {
            onReady: (e) => {
              suppressYoutubeCaptions(e.target);
              try {
                e.target.mute();
                e.target.playVideo();
              } catch {
                // ignore autoplay constraints
              }
            },
            onApiChange: (e) => suppressYoutubeCaptions(e.target),
            onStateChange: (e) => {
              suppressYoutubeCaptions(e.target);
              if (e.data === YT.PlayerState.ENDED) {
                try {
                  e.target.seekTo(9, true);
                  e.target.playVideo();
                } catch {
                  // ignore
                }
              }
            },
          },
        });
      })
      .catch(() => {
        // Fallback canvas remains visible underneath
      });

    let observer: IntersectionObserver | null = null;
    if (sectionEl && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const player = ytPlayerRef.current;
            if (!player || typeof player.pauseVideo !== 'function') return;
            try {
              if (entry.isIntersecting) {
                player.mute();
                player.playVideo();
              } else {
                player.pauseVideo();
              }
            } catch {
              // ignore
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(sectionEl);
    }

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        ytPlayerRef.current = null;
      }
    };
  }, []);

  const canEmbed = canEmbedYoutubeSafely();
  const originParam =
    typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
  const youtubeSrc = canEmbed
    ? `https://www.youtube.com/embed/haD3iYlblis?autoplay=1&mute=1&start=9&cc_load_policy=0&iv_load_policy=3&controls=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&enablejsapi=1&origin=${originParam}`
    : undefined;

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative h-screen min-h-[640px] w-full flex items-center justify-center overflow-hidden bg-[#132A1E] text-white"
    >
      <canvas
        ref={canvasRef}
        id="hero-motion-canvas"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {canEmbed && youtubeSrc && (
          <iframe
            ref={iframeRef}
            id="hero-youtube-iframe"
            src={youtubeSrc}
            title="Daklak The Land Of Legends"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[max(100vw,177.78vh)] h-[max(100vh,56.25vw)] min-w-full min-h-full border-0 pointer-events-none"
          />
        )}
      </div>

      {/* Lớp phủ xanh đại ngàn đậm (#0F2419, opacity 50%) + radial vignette */}
      <div className="absolute inset-0 bg-[#0F2419]/50 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(13,29,20,0.68)_100%)] pointer-events-none" />

      {/* Toàn bộ nội dung căn giữa */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
        <h1 className="hero-seq-2 font-mea font-normal text-6xl sm:text-8xl lg:text-[124px] tracking-[0.04em] leading-[1.08] text-[#F7F3EB] drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)] select-none">
          ĐẮK LẮK
        </h1>

        <div className="hero-seq-2 my-5 sm:my-6 w-56 sm:w-72 flex items-center gap-3" aria-hidden="true">
          <span className="flex-1 h-px bg-[#D48C46]/55" />
          <span className="w-2.5 h-2.5 rotate-45 border border-[#D48C46] flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-[#F7F3EB]" />
          </span>
          <span className="flex-1 h-px bg-[#D48C46]/55" />
        </div>

        <div className="space-y-1.5 sm:space-y-2 max-w-2xl">
          <p className="hero-seq-3 font-serif italic text-xl sm:text-3xl lg:text-[34px] text-[#F7F3EB] leading-snug tracking-wide">
            {t.heroSub1}
          </p>
          <p className="hero-seq-4 font-serif italic text-xl sm:text-3xl lg:text-[34px] text-[#E6C29F] leading-snug tracking-wide">
            {t.heroSub2}
          </p>
        </div>

        <div className="hero-seq-5 mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <a
            href="#bento-overview"
            className="group inline-flex items-center gap-3 px-7 py-4 rounded-full bg-[#D48C46] hover:bg-[#c57d36] text-[#132A1E] text-sm sm:text-base font-bold shadow-xl shadow-black/30 transition-all hover:-translate-y-0.5"
          >
            <span>{t.heroCtaPrimary}</span>
            <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
              →
            </span>
          </a>
          <a
            href="#itinerary-planner"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/18 text-[#F7F3EB] border border-white/25 backdrop-blur-md text-xs sm:text-sm font-semibold transition-all"
          >
            <span>{t.heroCtaSecondary}</span>
          </a>
        </div>
      </div>
    </section>
  );
};
