import { SeasonData } from '../types';

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onApiChange?: (event: { target: YTPlayerInstance }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayerInstance {
  mute: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  loadVideoById: (options: { videoId: string; startSeconds?: number; endSeconds?: number }) => void;
  cueVideoById: (options: { videoId: string; startSeconds?: number; endSeconds?: number }) => void;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoUrl: () => string;
  unloadModule?: (moduleName: string) => void;
  setOption?: (moduleName: string, option: string, value: unknown) => void;
  destroy?: () => void;
}

export function canEmbedYoutubeSafely(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (window.location.protocol === 'http:' || window.location.protocol === 'https:') &&
    window.origin !== 'null'
  );
}

export function buildSeasonYoutubeUrl(data: SeasonData, autoPlay: boolean): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = [
    `autoplay=${autoPlay ? 1 : 0}`,
    'mute=1',
    `start=${data.videoStart}`,
    'controls=1',
    'cc_load_policy=0',
    'iv_load_policy=3',
    'rel=0',
    'modestbranding=1',
    'playsinline=1',
    'enablejsapi=1',
    `origin=${encodeURIComponent(origin)}`,
  ];
  if (data.videoEnd !== null && data.videoEnd !== undefined) {
    params.push(`end=${data.videoEnd}`);
  }
  return `https://www.youtube.com/embed/${data.videoId}?${params.join('&')}`;
}

export function suppressYoutubeCaptions(player: YTPlayerInstance | null | undefined): void {
  if (!player) return;
  try {
    if (typeof player.unloadModule === 'function') {
      player.unloadModule('captions');
      player.unloadModule('cc');
    }
    if (typeof player.setOption === 'function') {
      player.setOption('captions', 'track', {});
      player.setOption('cc', 'track', {});
    }
  } catch {
    // Ignore cross-origin / unloaded module errors from YT iframe
  }
}

let ytApiPromise: Promise<NonNullable<Window['YT']>> | null = null;

export function loadYoutubeIframeApi(): Promise<NonNullable<Window['YT']>> {
  if (!canEmbedYoutubeSafely()) {
    return Promise.reject(new Error('YouTube embed requires HTTP/HTTPS origin'));
  }
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(window.YT);
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') prevReady();
      if (window.YT && typeof window.YT.Player === 'function') {
        resolve(window.YT);
      } else {
        reject(new Error('YouTube IFrame API failed to initialize'));
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => reject(new Error('Failed to load YouTube IFrame API script'));
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(tag, firstScript);
      } else {
        document.head.appendChild(tag);
      }
    }
  });

  return ytApiPromise;
}

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): {
  w: number;
  h: number;
  dpr: number;
} {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = Math.max(1, Math.floor(rect.width * dpr));
  const targetH = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  return { w: targetW, h: targetH, dpr };
}
