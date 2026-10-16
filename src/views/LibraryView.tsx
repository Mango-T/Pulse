import { Heart } from 'lucide-react';
import type { Song } from '@/types';
import { SongRow } from '@/components/SongRow';

interface LibraryViewProps {
  favoriteSongs: Song[];
  currentSongId: string | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, queue: Song[]) => void;
  onToggleFavorite: (songId: string) => void;
}

export function LibraryView({
  favoriteSongs,
  currentSongId,
  isPlaying,
  onPlaySong,
  onToggleFavorite,
}: LibraryViewProps) {
  if (favoriteSongs.length === 0) {
    return (
      <div className="px-4 md:px-6 pb-6 flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center mb-6">
          <Heart size={36} className="text-neutral-600" />
        </div>
        <p className="text-white text-lg font-bold">Suas músicas curtidas aparecerão aqui</p>
        <p className="text-neutral-500 text-sm mt-2 max-w-sm">
          Toque no coração ao lado de qualquer música para salvá-la na sua biblioteca.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 pb-6">
      <div className="flex items-center gap-5 mb-6 bg-gradient-to-b from-orange-900/30 to-transparent p-4 md:p-6 rounded-2xl">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-xl shrink-0">
          <Heart size={48} className="text-white fill-white" />
        </div>
        <div>
          <p className="text-neutral-300 text-xs font-semibold uppercase tracking-wider">
            Playlist
          </p>
          <h1 className="text-white text-2xl md:text-4xl font-bold mt-1">Músicas Curtidas</h1>
          <p className="text-neutral-400 text-sm mt-2">
            {favoriteSongs.length} {favoriteSongs.length === 1 ? 'música' : 'músicas'}
          </p>
        </div>
      </div>

      <div className="bg-neutral-900/40 rounded-xl p-2 md:p-4">
        <div className="flex flex-col gap-1">
          {favoriteSongs.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              isCurrent={currentSongId === song.id}
              isPlaying={isPlaying && currentSongId === song.id}
              isFavorite={true}
              onPlay={() => onPlaySong(song, favoriteSongs)}
              onToggleFavorite={() => onToggleFavorite(song.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
