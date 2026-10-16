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
  onToggleFavorite: (songId: string) => void;
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
        <h2 className="text-white text-lg md:text-xl font-bold mb-4">Playlists para você</h2>
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

      {/* Popular songs */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg md:text-xl font-bold">Músicas populares</h2>
        </div>
        <div className="bg-neutral-900/40 rounded-xl p-2 md:p-4">
          <div className="flex flex-col gap-1">
            {popularSongs.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                index={i}
                isCurrent={currentSongId === song.id}
                isPlaying={isPlaying && currentSongId === song.id}
                isFavorite={favorites.has(song.id)}
                onPlay={() => onPlaySong(song, popularSongs)}
                onToggleFavorite={() => onToggleFavorite(song.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Albums */}
      <section>
        <h2 className="text-white text-lg md:text-xl font-bold mb-4">Álbuns</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {featuredAlbums.map((album) => {
            const albumSongs = songs.filter((s) => s.albumId === album.id);
            return (
              <MediaCard
                key={album.id}
                data={{
                  id: album.id,
                  title: album.title,
                  subtitle: `${album.artist} • ${albumSongs.length} faixas`,
                  cover: album.cover,
                }}
                onPlay={() => onPlayPlaylist(albumSongs)}
              />
            );
          })}
        </div>
      </section>

      {/* Artists */}
      <section>
        <h2 className="text-white text-lg md:text-xl font-bold mb-4">Artistas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {featuredArtists.map((artist) => (
            <MediaCard
              key={artist.id}
              data={{
                id: artist.id,
                title: artist.name,
                subtitle: 'Artista',
                cover: artist.photo,
                rounded: true,
              }}
              onPlay={() => {
                const artistSongs = songs.filter((s) => s.artistId === artist.id);
                if (artistSongs.length > 0) onPlayPlaylist(artistSongs);
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
