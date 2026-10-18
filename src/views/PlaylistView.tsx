import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import type { Song } from '@/types';
import { SongRow } from '@/components/SongRow';
import { getPlaylistItemsPage } from '@/lib/youtube';

interface PlaylistViewProps {
  playlistId: string;
  playlistTitle: string;
  playlistCover: string;
  currentSongId: string | null;
  isPlaying: boolean;
  favorites: Set<string>;
  onPlaySong: (song: Song, queue: Song[]) => void;
  onToggleFavorite: (songId: string) => void;
  onBack: () => void;
}

export function PlaylistView({
  playlistId,
  playlistTitle,
  playlistCover,
  currentSongId,
  isPlaying,
  favorites,
  onPlaySong,
  onToggleFavorite,
  onBack,
}: PlaylistViewProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const playlistIdRef = useRef<string>(playlistId);
  playlistIdRef.current = playlistId;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSongs([]);
    setNextPageToken(null);
    setLoadMoreError(null);

    (async () => {
      const result = await getPlaylistItemsPage(playlistId);
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
      } else {
        setSongs(result.songs);
        setNextPageToken(result.nextPageToken);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [playlistId]);

  const handleLoadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);

    const result = await getPlaylistItemsPage(playlistIdRef.current, nextPageToken);
    if (result.error) {
      setLoadMoreError(result.error);
    } else {
      setSongs((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const newSongs = result.songs.filter((s) => !existingIds.has(s.id));
        return [...prev, ...newSongs];
      });
      setNextPageToken(result.nextPageToken);
    }
    setLoadingMore(false);
  }, [nextPageToken, loadingMore]);

  return (
    <div className="px-4 md:px-6 pb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-4 text-sm"
      >
        <ArrowLeft size={18} />
        Voltar
      </button>

      {loading && (
        <div className="flex items-center gap-3 text-neutral-400 text-sm py-10">
          <Loader2 size={20} className="animate-spin" />
          Carregando playlist...
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 bg-red-950/30 border border-red-900/40 rounded-lg p-4">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-sm font-medium">Erro</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex items-center gap-5 mb-8 bg-gradient-to-b from-neutral-800/40 to-transparent p-4 md:p-6 rounded-2xl">
            <img
              src={playlistCover}
              alt={playlistTitle}
              className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover shadow-xl shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <p className="text-neutral-300 text-xs font-semibold uppercase tracking-wider">Playlist</p>
              <h1 className="text-white text-2xl md:text-4xl font-bold mt-1 truncate">{playlistTitle}</h1>
              <p className="text-neutral-400 text-sm mt-2">
                {songs.length} {songs.length === 1 ? 'vídeo' : 'vídeos'}
              </p>
            </div>
          </div>

          {songs.length > 0 ? (
            <div className="bg-neutral-900/40 rounded-xl p-2 md:p-4">
              <div className="flex flex-col gap-1">
                {songs.map((song, i) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={i}
                    isCurrent={currentSongId === song.id}
                    isPlaying={isPlaying && currentSongId === song.id}
                    isFavorite={favorites.has(song.id)}
                    onPlay={() => onPlaySong(song, songs)}
                    onToggleFavorite={() => onToggleFavorite(song.id)}
                  />
                ))}
              </div>

              {nextPageToken && (
                <div className="flex flex-col items-center gap-2 mt-4">
                  {loadMoreError && (
                    <p className="text-red-400/70 text-xs">{loadMoreError}</p>
                  )}
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-full px-5 py-2.5 transition-colors disabled:opacity-60"
                  >
                    {loadingMore ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                    Carregar mais
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-neutral-500 text-sm py-6">
              Nenhum vídeo encontrado nesta playlist.
            </p>
          )}
        </>
      )}
    </div>
  );
}
