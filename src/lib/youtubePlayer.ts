import type { Song } from '@/types';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type Callback = () => void;
type TimeCallback = (currentTime: number, duration: number) => void;
type PlayStateCallback = (isPlaying: boolean) => void;
type ErrorCallback = (message: string) => void;

let apiPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const existing = document.getElementById('youtube-iframe-api');
    if (!existing) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
  });
  return apiPromise;
}

const ERROR_MESSAGES: Record<number, string> = {
  2: 'Vídeo inválido ou ID incorreto.',
  5: 'Erro ao reproduzir o vídeo no navegador incorporado.',
  100: 'Vídeo removido ou privado.',
  101: 'Este vídeo não permite reprodução incorporada.',
  150: 'Este vídeo não permite reprodução incorporada.',
};

export class YouTubePlayerEngine {
  private player: any = null;
  private wrapperDiv: HTMLDivElement | null = null;
  private hostElement: HTMLDivElement | null = null;
  private currentVideoId: string | null = null;
  private volume = 0.7;
  private timeTimer: ReturnType<typeof setInterval> | null = null;
  private ready = false;
  private pendingSong: Song | null = null;
  private mounted = false;

  onTimeUpdate: TimeCallback | null = null;
  onEnded: Callback | null = null;
  onPlayStateChange: PlayStateCallback | null = null;
  onError: ErrorCallback | null = null;
  onReady: Callback | null = null;

  async mount(host: HTMLDivElement): Promise<void> {
    if (this.mounted) {
      // Already mounted — just move the wrapper into the new host
      if (this.wrapperDiv && host !== this.wrapperDiv.parentElement) {
        host.appendChild(this.wrapperDiv);
      }
      return;
    }

    this.mounted = true;
    this.hostElement = host;

    // Create a stable wrapper that survives YT API replacing the inner element
    this.wrapperDiv = document.createElement('div');
    this.wrapperDiv.style.width = '100%';
    this.wrapperDiv.style.height = '100%';
    host.appendChild(this.wrapperDiv);

    await loadYouTubeAPI();
    if (!this.wrapperDiv) return;

    // Create an inner element that YT will replace with an iframe
    const inner = document.createElement('div');
    this.wrapperDiv.appendChild(inner);

    this.player = new window.YT.Player(inner, {
      width: '100%',
      height: '100%',
      videoId: '',
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          this.ready = true;
          this.player.setVolume(Math.round(this.volume * 100));
          this.onReady?.();
          if (this.pendingSong) {
            const s = this.pendingSong;
            this.pendingSong = null;
            this.loadAndPlay(s);
          }
        },
        onStateChange: (e: any) => this.handleStateChange(e),
        onError: (e: any) => {
          const code = e?.data ?? 0;
          this.onError?.(ERROR_MESSAGES[code] ?? 'Erro ao reproduzir o vídeo do YouTube.');
        },
      },
    });
  }

  private handleStateChange(e: any): void {
    const YT = window.YT;
    if (!YT) return;

    if (e.data === YT.PlayerState.PLAYING) {
      this.onPlayStateChange?.(true);
      this.startTimeTracking();
    } else if (e.data === YT.PlayerState.PAUSED) {
      this.onPlayStateChange?.(false);
      this.stopTimeTracking();
    } else if (e.data === YT.PlayerState.ENDED) {
      this.onPlayStateChange?.(false);
      this.stopTimeTracking();
      this.onEnded?.();
    }
  }

  private startTimeTracking(): void {
    this.stopTimeTracking();
    this.timeTimer = setInterval(() => {
      if (!this.player || !this.ready) return;
      const time = this.player.getCurrentTime?.() ?? 0;
      const dur = this.player.getDuration?.() ?? 0;
      this.onTimeUpdate?.(time, dur);
    }, 250);
  }

  private stopTimeTracking(): void {
    if (this.timeTimer) {
      clearInterval(this.timeTimer);
      this.timeTimer = null;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  isMounted(): boolean {
    return this.mounted;
  }

  loadAndPlay(song: Song): void {
    if (!this.player || !this.ready || !song.youtubeId) {
      this.pendingSong = song;
      return;
    }

    if (this.currentVideoId === song.youtubeId) {
      this.player.seekTo(0, true);
      this.player.playVideo();
    } else {
      this.currentVideoId = song.youtubeId;
      this.player.loadVideoById(song.youtubeId);
    }
    this.player.setVolume(Math.round(this.volume * 100));
  }

  play(): void {
    this.player?.playVideo?.();
  }

  pause(): void {
    this.player?.pauseVideo?.();
  }

  seek(time: number): void {
    if (!this.player || !this.ready) return;
    this.player.seekTo(time, true);
    const dur = this.player.getDuration?.() ?? 0;
    this.onTimeUpdate?.(time, dur);
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    this.player?.setVolume?.(Math.round(this.volume * 100));
  }

  getCurrentTime(): number {
    if (!this.player || !this.ready) return 0;
    return this.player.getCurrentTime?.() ?? 0;
  }

  getDuration(): number {
    if (!this.player || !this.ready) return 0;
    return this.player.getDuration?.() ?? 0;
  }

  destroy(): void {
    this.stopTimeTracking();
    if (this.player?.destroy) {
      try {
        this.player.destroy();
      } catch {
        // ignore
      }
    }
    this.player = null;
    this.ready = false;
    this.mounted = false;
    this.currentVideoId = null;
    this.pendingSong = null;
    if (this.wrapperDiv) {
      this.wrapperDiv.remove();
      this.wrapperDiv = null;
    }
    this.hostElement = null;
  }
}

export const youtubePlayer = new YouTubePlayerEngine();
