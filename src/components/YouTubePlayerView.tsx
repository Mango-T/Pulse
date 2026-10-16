import { useEffect, useRef, useState } from 'react';
import { Monitor, Headphones, AlertCircle, Loader2 } from 'lucide-react';
import type { Song, PlayerMode } from '@/types';
import { youtubePlayer } from '@/lib/youtubePlayer';

interface YouTubePlayerViewProps {
  song: Song | null;
  mode: PlayerMode;
  onModeChange: (mode: PlayerMode) => void;
  error: string | null;
}

export function YouTubePlayerView({ song, mode, onModeChange, error }: YouTubePlayerViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [playerReady, setPlayerReady] = useState(youtubePlayer.isMounted());
  const [mounting, setMounting] = useState(false);
  const isYouTube = !!song?.youtubeId;

  // Mount (or re-parent) the YT player whenever a YouTube song is active
  useEffect(() => {
    if (!isYouTube || !hostRef.current) return;
    let cancelled = false;
    setMounting(true);

    youtubePlayer.mount(hostRef.current).then(() => {
      if (cancelled) return;
      setPlayerReady(true);
      setMounting(false);
    }).catch(() => {
      if (cancelled) return;
      setMounting(false);
    });

    return () => { cancelled = true; };
  }, [isYouTube]);

  // When mode changes, re-parent the wrapper div into the current host
  useEffect(() => {
    if (isYouTube && hostRef.current) {
      youtubePlayer.mount(hostRef.current);
    }
  }, [mode, isYouTube]);
  const showError = error && isYouTube;
  const showLoading = (mounting || (isYouTube && !playerReady)) && !showError;

  if (!isYouTube) return null;

  return (
    <div className="px-4 md:px-6 pb-4 pt-2">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex bg-neutral-800/80 rounded-lg p-0.5">
          <button
            onClick={() => onModeChange('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === 'video'
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Monitor size={14} />
            Vídeo
          </button>
          <button
            onClick={() => onModeChange('audio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === 'audio'
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Headphones size={14} />
            Áudio
          </button>
        </div>
      </div>

      {/* Error state */}
      {showError && (
        <div className="flex items-start gap-3 bg-red-950/30 border border-red-900/40 rounded-lg p-3 mb-3 max-w-2xl">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-sm font-medium">Não foi possível reproduzir</p>
            <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {showLoading && (
        <div className="flex items-center gap-2 text-neutral-400 text-sm py-4">
          <Loader2 size={16} className="animate-spin" />
          Carregando player do YouTube...
        </div>
      )}

      {/* Video mode: full player */}
      {mode === 'video' && !showError && (
        <div className="relative w-full aspect-video max-w-2xl rounded-xl overflow-hidden bg-black">
          <div ref={hostRef} className="absolute inset-0 w-full h-full" />
        </div>
      )}

      {/* Audio mode: compact player + album art */}
      {mode === 'audio' && !showError && (
        <div className="flex items-center gap-4 p-4 bg-neutral-900/60 rounded-xl max-w-2xl">
          <img
            src={song?.cover || ''}
            alt={song?.title || ''}
            className="w-24 h-24 rounded-lg object-cover shrink-0 shadow-lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-white text-base font-semibold truncate">{song?.title}</p>
            <p className="text-neutral-400 text-sm truncate">{song?.artist}</p>
            <p className="text-neutral-600 text-xs mt-1">Reproduzindo via YouTube</p>
          </div>
          {/* Compact YT player — visible to comply with YouTube policies */}
          <div
            ref={hostRef}
            className="shrink-0 rounded-lg overflow-hidden border border-neutral-700/50"
            style={{ width: 200, height: 113 }}
          />
        </div>
      )}
    </div>
  );
}
