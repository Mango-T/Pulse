import { Play } from 'lucide-react';
import type { Song, Playlist } from '@/types';
import { MediaCard } from '@/components/MediaCard';
import { SongRow } from '@/components/SongRow';

interface HomeViewProps {
  songs: Song[];
  playlists: Playlist[];
  artists: { id: string; name: string; photo: string; bio: string }[];
  albums: { id: string; title: string; artist: string; cover: string }[];
  currentSongId: string | null;
  isPlaying: boolean;
  favorites: Set<string>;
  onPlaySong: (song: Song, queue: Song[]) => void;
  onPlayPlaylist: (songs: Song[]) => void;
  onToggleFavorite: (song: Song) => void;
}

export function HomeView({
  songs,
  playlists,
  artists,
  albums,
  currentSongId,
  isPlaying,
  favorites,
  onPlaySong,
  onPlayPlaylist,
  onToggleFavorite,
}: HomeViewProps) {
  const popularSongs = songs.slice(0, 6);
  const featuredPlaylists = playlists.slice(0, 6);
  const featuredAlbums = albums.slice(0, 6);
  const featuredArtists = artists.slice(0, 6);

  return (
    <div className="px-4 md:px-6 pb-6 space-y-8">
      {/* Featured playlists */}
      <section>
        <h2 className="text-white text-lg md:text-xl font-bold mb-4">Mais Ouvidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {featuredPlaylists.map((pl) => {
            const plSongs = songs.filter((s) => pl.songIds.includes(s.id));
            return (
              <MediaCard
                key={pl.id}
                data={{
                  id: pl.id,
                  title: pl.title,
                  subtitle: pl.description,
                  cover: pl.cover,
                }}
                onPlay={() => onPlayPlaylist(plSongs)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
