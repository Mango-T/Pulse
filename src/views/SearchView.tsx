import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Youtube, Loader2, AlertCircle } from 'lucide-react';
import type { Song, Channel } from '@/types';
import { SongRow } from '@/components/SongRow';
import { MediaCard } from '@/components/MediaCard';
import { ChannelAvatar } from '@/components/ChannelAvatar';
import { songs as allSongs, playlists, artists, albums } from '@/data/mockData';
import { searchYouTube, searchYouTubeChannels, isYouTubeConfigured } from '@/lib/youtube';

interface SearchViewProps {
  query: string;
  currentSongId: string | null;
  isPlaying: boolean;
  favorites: Set<string>;
  onPlaySong: (song: Song, queue: Song[]) => void;
  onToggleFavorite: (songId: string) => void;
  onOpenChannel: (channelId: string) => void;
}

export function SearchView({
  query,
  currentSongId,
  isPlaying,
  favorites,
  onPlaySong,
  onToggleFavorite,
  onOpenChannel,
}: SearchViewProps) {
  const trimmed = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!trimmed) return null;

    const matchedSongs = allSongs.filter(
      (s) =>
        s.title.toLowerCase().includes(trimmed) ||
        s.artist.toLowerCase().includes(trimmed) ||
        s.album.toLowerCase().includes(trimmed),
    );
    const matchedPlaylists = playlists.filter(
      (p) =>
        p.title.toLowerCase().includes(trimmed) ||
        p.description.toLowerCase().includes(trimmed),
    );
    const matchedArtists = artists.filter(
      (a) =>
        a.name.toLowerCase().includes(trimmed) ||
        a.bio.toLowerCase().includes(trimmed),
    );
    const matchedAlbums = albums.filter(
      (a) =>
        a.title.toLowerCase().includes(trimmed) ||
        a.artist.toLowerCase().includes(trimmed),
    );

    return { matchedSongs, matchedPlaylists, matchedArtists, matchedAlbums };
  }, [trimmed]);

  // YouTube search with debounce
  const [ytResults, setYtResults] = useState<Song[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const queryIdRef = useRef(0);

  useEffect(() => {
    if (!trimmed) {
      setYtResults([]);
      setYtError(null);
      setYtLoading(false);
      return;
    }

    const id = ++queryIdRef.current;
    setYtLoading(true);
    setYtError(null);

    const timer = setTimeout(async () => {
      const result = await searchYouTube(query.trim());
      if (id !== queryIdRef.current) return;
      setYtResults(result.songs);
      setYtError(result.error);
      setYtLoading(false);
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  // YouTube channel search with debounce
  const [ytChannels, setYtChannels] = useState<Channel[]>([]);
  const [ytChannelsLoading, setYtChannelsLoading] = useState(false);
  const [ytChannelsError, setYtChannelsError] = useState<string | null>(null);
  const channelQueryIdRef = useRef(0);

  useEffect(() => {
    if (!trimmed) {
      setYtChannels([]);
      setYtChannelsError(null);
      setYtChannelsLoading(false);
      return;
    }

    if (!isYouTubeConfigured()) {
      setYtChannels([]);
      return;
    }

    const id = ++channelQueryIdRef.current;
    setYtChannelsLoading(true);
    setYtChannelsError(null);

    const timer = setTimeout(async () => {
      const result = await searchYouTubeChannels(query.trim());
      if (id !== channelQueryIdRef.current) return;
      setYtChannels(result.channels);
      setYtChannelsError(result.error);
      setYtChannelsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  // Combined artists & channels — merge local matched artists with YT channels, dedup by name
  const combinedChannels: Channel[] = useMemo(() => {
    const localChannels: Channel[] = (results?.matchedArtists ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      avatar: a.photo,
      description: a.bio,
      isLocal: true,
    }));

    const seenNames = new Set(localChannels.map((c) => c.name.toLowerCase()));
    const filteredYt = ytChannels.filter((c) => {
      const lower = c.name.toLowerCase();
      if (seenNames.has(lower)) return false;
      seenNames.add(lower);
      return true;
    });

    return [...localChannels, ...filteredYt];
  }, [results, ytChannels]);

  const browseCategories = [
    { id: 'c1', label: 'Pop', cover: allSongs[0].cover, color: 'from-pink-500 to-rose-700' },
    { id: 'c2', label: 'Eletrônica', cover: allSongs[1].cover, color: 'from-cyan-500 to-blue-700' },
    { id: 'c3', label: 'Rock', cover: allSongs[2].cover, color: 'from-red-500 to-orange-700' },
    { id: 'c4', label: 'Indie', cover: allSongs[4].cover, color: 'from-amber-500 to-yellow-700' },
    { id: 'c5', label: 'Ambient', cover: allSongs[8].cover, color: 'from-teal-500 to-emerald-700' },
    { id: 'c6', label: 'Folk', cover: allSongs[10].cover, color: 'from-orange-500 to-amber-700' },
  ];

  if (!trimmed) {
    return (
      <div className="px-4 md:px-6 pb-6">
        <h2 className="text-white text-lg md:text-xl font-bold mb-4">Navegar por tudo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {browseCategories.map((cat) => (
            <div
              key={cat.id}
              className={`relative h-40 rounded-xl overflow-hidden cursor-pointer bg-gradient-to-br ${cat.color} group`}
            >
              <p className="absolute top-3 left-3 text-white font-bold text-lg z-10">
                {cat.label}
              </p>
              <img
                src={cat.cover}
                alt={cat.label}
                className="absolute -bottom-3 -right-3 w-20 h-20 rounded-lg rotate-25 object-cover shadow-xl group-hover:scale-110 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasLocalResults =
    results &&
    (results.matchedSongs.length > 0 ||
      results.matchedPlaylists.length > 0 ||
      results.matchedArtists.length > 0 ||
      results.matchedAlbums.length > 0);

  const hasYtResults = ytResults.length > 0;
  const hasChannelResults = combinedChannels.length > 0;
  const channelsStillLoading = ytChannelsLoading && !hasChannelResults;
  const showNoResults =
    !hasLocalResults && !hasYtResults && !hasChannelResults &&
    !ytLoading && !ytError && !channelsStillLoading;

  if (showNoResults) {
    return (
      <div className="px-4 md:px-6 pb-6 flex flex-col items-center justify-center py-20 text-center">
        <Search size={48} className="text-neutral-700 mb-4" />
        <p className="text-neutral-400 text-lg font-medium">Nenhum resultado para "{query}"</p>
        <p className="text-neutral-600 text-sm mt-1">
          Verifique a ortografia ou tente palavras-chave diferentes.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 pb-6 space-y-8">
      {/* Artistas e canais — horizontal scroll */}
      {(hasChannelResults || channelsStillLoading) && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-white text-lg font-bold">Artistas e canais</h2>
            {channelsStillLoading && (
              <Loader2 size={16} className="text-neutral-400 animate-spin" />
            )}
          </div>
          {ytChannelsError && (
            <div className="flex items-start gap-3 bg-red-950/30 border border-red-900/40 rounded-lg p-3 mb-3">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400/70 text-xs">{ytChannelsError}</p>
            </div>
          )}
          {hasChannelResults && (
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
              {combinedChannels.map((ch) => (
                <ChannelAvatar
                  key={ch.id}
                  channel={ch}
                  onClick={() => onOpenChannel(ch.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {results && results.matchedSongs.length > 0 && (
        <section>
          <h2 className="text-white text-lg font-bold mb-4">Músicas</h2>
          <div className="bg-neutral-900/40 rounded-xl p-2 md:p-4">
            <div className="flex flex-col gap-1">
              {results.matchedSongs.map((song, i) => (
                <SongRow
                  key={song.id}
                  song={song}
                  index={i}
                  isCurrent={currentSongId === song.id}
                  isPlaying={isPlaying && currentSongId === song.id}
                  isFavorite={favorites.has(song.id)}
                  onPlay={() => onPlaySong(song, results.matchedSongs)}
                  onToggleFavorite={() => onToggleFavorite(song.id)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {results && results.matchedPlaylists.length > 0 && (
        <section>
          <h2 className="text-white text-lg font-bold mb-4">Playlists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {results.matchedPlaylists.map((pl) => {
              const plSongs = allSongs.filter((s) => pl.songIds.includes(s.id));
              return (
                <MediaCard
                  key={pl.id}
                  data={{
                    id: pl.id,
                    title: pl.title,
                    subtitle: pl.description,
                    cover: pl.cover,
                  }}
                  onPlay={() => onPlaySong(plSongs[0], plSongs)}
                />
              );
            })}
          </div>
        </section>
      )}

      {results && results.matchedAlbums.length > 0 && (
        <section>
          <h2 className="text-white text-lg font-bold mb-4">Álbuns</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {results.matchedAlbums.map((album) => {
              const albumSongs = allSongs.filter((s) => s.albumId === album.id);
              return (
                <MediaCard
                  key={album.id}
                  data={{
                    id: album.id,
                    title: album.title,
                    subtitle: album.artist,
                    cover: album.cover,
                  }}
                  onPlay={() => onPlaySong(albumSongs[0], albumSongs)}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* YouTube Results */}
      {trimmed && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <Youtube size={20} className="text-red-500" />
            <h2 className="text-white text-lg font-bold">Resultados do YouTube</h2>
            {ytLoading && (
              <Loader2 size={16} className="text-neutral-400 animate-spin" />
            )}
          </div>

          {ytError && (
            <div className="flex items-start gap-3 bg-red-950/30 border border-red-900/40 rounded-lg p-4">
              <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-sm font-medium">Erro na busca do YouTube</p>
                <p className="text-red-400/70 text-xs mt-1">{ytError}</p>
              </div>
            </div>
          )}

          {!ytError && ytLoading && ytResults.length === 0 && (
            <div className="flex items-center gap-3 text-neutral-400 text-sm py-6">
              <Loader2 size={18} className="animate-spin" />
              Buscando no YouTube...
            </div>
          )}

          {!ytError && !ytLoading && hasYtResults && (
            <div className="bg-neutral-900/40 rounded-xl p-2 md:p-4">
              <div className="flex flex-col gap-1">
                {ytResults.map((song, i) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={i}
                    isCurrent={currentSongId === song.id}
                    isPlaying={isPlaying && currentSongId === song.id}
                    isFavorite={favorites.has(song.id)}
                    onPlay={() => onPlaySong(song, ytResults)}
                    onToggleFavorite={() => onToggleFavorite(song.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {!ytError && !ytLoading && !hasYtResults && isYouTubeConfigured() && (
            <p className="text-neutral-500 text-sm py-2">
              Nenhum resultado encontrado no YouTube para esta busca.
            </p>
          )}

          {!isYouTubeConfigured() && !ytLoading && (
            <div className="flex items-start gap-3 bg-neutral-800/40 border border-neutral-700/40 rounded-lg p-4">
              <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-neutral-300 text-sm font-medium">Busca do YouTube não configurada</p>
                <p className="text-neutral-500 text-xs mt-1">
                  Adicione sua chave da YouTube Data API v3 no arquivo .env como VITE_YOUTUBE_API_KEY para ativar a busca real.
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
