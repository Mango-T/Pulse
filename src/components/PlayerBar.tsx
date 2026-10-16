import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
} from 'lucide-react';
import type { Song } from '@/types';
import { formatDuration } from '@/lib/format';

interface PlayerBarProps {
  song: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  isFavorite: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleFavorite: () => void;
}

export function PlayerBar({
  song,
  isPlaying,
  currentTime,
  duration,
  volume,
  shuffle,
  repeat,
  isFavorite,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onCycleRepeat,
  onToggleFavorite,
}: PlayerBarProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);

  const calcPct = useCallback((clientX: number, rect: DOMRect) => {
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleProgress = useCallback(
    (clientX: number) => {
      if (!progressRef.current) return;
      const pct = calcPct(clientX, progressRef.current.getBoundingClientRect());
      const dur = duration > 0 ? duration : 0;
      onSeek(pct * dur);
    },
    [calcPct, duration, onSeek],
  );

  const handleVolume = useCallback(
    (clientX: number) => {
      if (!volumeRef.current) return;
      const pct = calcPct(clientX, volumeRef.current.getBoundingClientRect());
      onVolumeChange(pct);
    },
    [calcPct, onVolumeChange],
  );

  // Global mouse listeners so dragging doesn't get stuck when pointer leaves the bar
  useEffect(() => {
    if (!isDraggingProgress && !isDraggingVolume) return;

    const onMove = (e: MouseEvent) => {
      if (isDraggingProgress) handleProgress(e.clientX);
      if (isDraggingVolume) handleVolume(e.clientX);
    };
    const onUp = () => {
      setIsDraggingProgress(false);
      setIsDraggingVolume(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDraggingProgress, isDraggingVolume, handleProgress, handleVolume]);

  // Touch support
  useEffect(() => {
    if (!isDraggingProgress && !isDraggingVolume) return;

    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      if (isDraggingProgress) handleProgress(touch.clientX);
      if (isDraggingVolume) handleVolume(touch.clientX);
    };
    const onEnd = () => {
      setIsDraggingProgress(false);
      setIsDraggingVolume(false);
    };

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDraggingProgress, isDraggingVolume, handleProgress, handleVolume]);

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const isYouTube = !!song?.youtubeId;

  return (
    <footer className="h-20 md:h-24 bg-neutral-950 border-t border-neutral-800/50 px-2 md:px-4 flex items-center gap-2 md:gap-4 z-50">
      {/* Left: song info */}
      <div className="flex items-center gap-3 w-1/4 min-w-0">
        {song ? (
          <>
            <img
              src={song.cover}
              alt={song.album}
              className="w-12 h-12 md:w-14 md:h-14 rounded-md object-cover shrink-0"
            />
            <div className="min-w-0 hidden sm:block">
              <p className="text-white text-sm font-medium truncate">{song.title}</p>
              <p className="text-neutral-400 text-xs truncate">{song.artist}</p>
            </div>
            <button
              onClick={onToggleFavorite}
              className="shrink-0 hidden sm:block transition-all"
            >
              <Heart
                size={16}
                className={
                  isFavorite
                    ? 'text-orange-500 fill-orange-500'
                    : 'text-neutral-400 hover:text-white'
                }
              />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-md bg-neutral-800 shrink-0" />
            <div className="hidden sm:block">
              <p className="text-neutral-500 text-sm">Nenhuma música tocando</p>
            </div>
          </div>
        )}
      </div>

      {/* Center: controls */}
      <div className="flex flex-col items-center gap-1.5 flex-1 max-w-2xl">
        <div className="flex items-center gap-3 md:gap-5">
          <button
            onClick={onToggleShuffle}
            className={`transition-colors hidden sm:block ${shuffle ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'}`}
          >
            <Shuffle size={16} />
          </button>
          <button
            onClick={onPrev}
            disabled={!song}
            className="text-neutral-300 hover:text-white transition-colors disabled:opacity-40"
          >
            <SkipBack size={18} className="fill-current" />
          </button>
          <button
            onClick={onTogglePlay}
            disabled={!song}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100"
          >
            {isPlaying ? (
              <Pause size={18} className="fill-current" />
            ) : (
              <Play size={18} className="fill-current ml-0.5" />
            )}
          </button>
          <button
            onClick={onNext}
            disabled={!song}
            className="text-neutral-300 hover:text-white transition-colors disabled:opacity-40"
          >
            <SkipForward size={18} className="fill-current" />
          </button>
          <button
            onClick={onCycleRepeat}
            className={`transition-colors hidden sm:block ${repeat !== 'off' ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'}`}
          >
            {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        <div className="flex items-center gap-2 w-full px-2 md:px-4">
          <span className="text-[10px] md:text-xs text-neutral-400 tabular-nums w-9 text-right shrink-0">
            {formatDuration(currentTime)}
          </span>
          <div
            ref={progressRef}
            className="flex-1 h-1.5 rounded-full bg-neutral-700 group relative cursor-pointer touch-none"
            onMouseDown={(e) => {
              setIsDraggingProgress(true);
              handleProgress(e.clientX);
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              if (touch) {
                setIsDraggingProgress(true);
                handleProgress(touch.clientX);
              }
            }}
          >
            <div
              className="absolute h-full rounded-full bg-white group-hover:bg-emerald-400 transition-colors"
              style={{ width: `${progressPct}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progressPct}% - 6px)` }}
            />
          </div>
          <span className="text-[10px] md:text-xs text-neutral-400 tabular-nums w-9 shrink-0">
            {duration > 0 ? formatDuration(duration) : isYouTube ? '--:--' : '0:00'}
          </span>
        </div>
      </div>

      {/* Right: volume */}
      <div className="w-1/4 flex items-center justify-end gap-2 max-md:hidden">
        <VolumeIcon size={18} className="text-neutral-400 shrink-0" />
        <div
          ref={volumeRef}
          className="group h-1.5 w-24 rounded-full bg-neutral-700 relative cursor-pointer touch-none"
          onMouseDown={(e) => {
            setIsDraggingVolume(true);
            handleVolume(e.clientX);
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            if (touch) {
              setIsDraggingVolume(true);
              handleVolume(touch.clientX);
            }
          }}
        >
          <div
            className="absolute h-full rounded-full bg-white group-hover:bg-emerald-400 transition-colors"
            style={{ width: `${volume * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${volume * 100}% - 6px)` }}
          />
        </div>
      </div>
    </footer>
  );
}
