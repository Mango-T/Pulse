import { Play } from 'lucide-react';
import type { Song } from '@/types';
import { formatDuration } from '@/lib/format';

interface SongRowProps {
  song: Song;
  index: number;
  isPlaying: boolean;
  isCurrent: boolean;
  isFavorite: boolean;
  onPlay: () => void;
  onToggleFavorite: () => void;
}

export function SongRow({
  song,
  index,
  isPlaying,
  isCurrent,
  isFavorite,
  onPlay,
  onToggleFavorite,
}: SongRowProps) {
  return (
    <div
      onClick={onPlay}
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
        isCurrent ? 'bg-neutral-800/60' : 'hover:bg-neutral-800/40'
      }`}
    >
      <div className="w-5 text-center shrink-0">
        {isCurrent && isPlaying ? (
          <div className="flex items-end justify-center gap-0.5 h-4">
            <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite]" style={{ height: '40%' }} />
            <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.15s]" style={{ height: '80%' }} />
            <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.3s]" style={{ height: '60%' }} />
          </div>
        ) : (
          <>
            <span className={`text-sm group-hover:hidden ${isCurrent ? 'text-emerald-400' : 'text-neutral-400'}`}>
              {index + 1}
            </span>
            <Play size={14} className="hidden group-hover:block text-white fill-white mx-auto" />
          </>
        )}
      </div>

      <img
        src={song.cover}
        alt={song.album}
        className="w-10 h-10 rounded-md object-cover shrink-0"
        loading="lazy"
      />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
          {song.title}
        </p>
        <p className="text-xs text-neutral-400 truncate">{song.artist}</p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className="shrink-0 transition-all duration-200"
      >
        <svg
          viewBox="0 0 24 24"
          fill={isFavorite ? '#f97316' : 'none'}
          stroke={isFavorite ? '#f97316' : 'currentColor'}
          strokeWidth={2}
          className={`w-5 h-5 transition-all duration-200 ${
            isFavorite
              ? 'text-orange-400 opacity-100 scale-100'
              : 'text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-white'
          }`}
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
        </svg>
      </button>

      <span className="text-xs text-neutral-400 tabular-nums shrink-0 w-10 text-right">
        {formatDuration(song.duration)}
      </span>
    </div>
  );
}
