import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import type { Song, Channel } from '@/types';
import { SongRow } from '@/components/SongRow';
import { getChannelDetails, getChannelVideosPage } from '@/lib/youtube';
import { songs as allSongs, artists as allArtists } from '@/data/mockData';

interface ChannelViewProps {
  channelId: string;
  currentSongId: string | null;
  isPlaying: boolean;
  favorites: Set<string>;
  onPlaySong: (song: Song, queue: Song[]) => void;
  onToggleFavorite: (songId: string) => void;
  onBack: () => void;
}

export function ChannelView({
  channelId,
  currentSongId,
  isPlaying,
  favorites,
  onPlaySong,
  onToggleFavorite,
  onBack,
}: ChannelViewProps) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [channelSongs, setChannelSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const uploadsPlaylistRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setChannel(null);
    setChannelSongs([]);
    setNextPageToken(null);
    setLoadMoreError(null);
    uploadsPlaylistRef.current = null;

    // Local artist
    const localArtist = allArtists.find((a) => a.id === channelId);
    if (localArtist) {
      const artistSongs = allSongs.filter((s) => s.artistId === localArtist.id);
      setChannel({
        id: localArtist.id,
        name: localArtist.name,
        avatar: localArtist.photo,
        description: localArtist.bio,
        isLocal: true,
      });
      setChannelSongs(artistSongs);
      setLoading(false);
      return;
    }

    // YouTube channel — fetch details (with uploads playlist ID) then first page of videos
    (async () => {
      const detailsResult = await getChannelDetails(channelId);
      if (cancelled) return;
      if (detailsResult.error) {
        setError(detailsResult.error);
        setLoading(false);
        return;
      }
      setChannel(detailsResult.channel);

      if (!detailsResult.uploadsPlaylistId) {
        setLoading(false);
        return;
      }
      uploadsPlaylistRef.current = detailsResult.uploadsPlaylistId;

      const videosResult = await getChannelVideosPage(detailsResult.uploadsPlaylistId);
      if (cancelled) return;
      if (videosResult.error) {
        setError(videosResult.error);
      } else {
        setChannelSongs(videosResult.songs);
        setNextPageToken(videosResult.nextPageToken);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [channelId]);

  const handleLoadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore) return;
    const playlistId = uploadsPlaylistRef.current;
    if (!playlistId) return;
    setLoadingMore(true);
    setLoadMoreError(null);

    const result = await getChannelVideosPage(playlistId, nextPageToken);
    if (result.error) {
      setLoadMoreError(result.error);
    } else {
      setChannelSongs((prev) => {
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
          Carregando canal...
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

      {channel && !loading && (
        <>
          <div className="flex items-center gap-5 mb-8 bg-gradient-to-b from-neutral-800/40 to-transparent p-4 md:p-6 rounded-2xl">
            <img
              src={channel.avatar}
              alt={channel.name}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-xl shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <p className="text-neutral-300 text-xs font-semibold uppercase tracking-wider">
                {channel.isLocal ? 'Artista' : 'Canal do YouTube'}
              </p>
              <h1 className="text-white text-2xl md:text-4xl font-bold mt-1 truncate">{channel.name}</h1>
              {channel.description && (
                <p className="text-neutral-400 text-sm mt-2 line-clamp-2 max-w-xl">{channel.description}</p>
              )}
            </div>
          </div>

          {channelSongs.length > 0 ? (
            <div className="bg-neutral-900/40 rounded-xl p-2 md:p-4">
              <h2 className="text-white text-sm font-bold mb-3 px-1">
                {channelSongs.length} {channelSongs.length === 1 ? 'vídeo' : 'vídeos'}
              </h2>
              <div className="flex flex-col gap-1">
                {channelSongs.map((song, i) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={i}
                    isCurrent={currentSongId === song.id}
                    isPlaying={isPlaying && currentSongId === song.id}
                    isFavorite={favorites.has(song.id)}
                    onPlay={() => onPlaySong(song, channelSongs)}
                    onToggleFavorite={() => onToggleFavorite(song.id)}
                  />
                ))}
              </div>

              {/* Load more */}
              {nextPageToken && !channel.isLocal && (
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
            !error && (
              <p className="text-neutral-500 text-sm py-6">
                Nenhum vídeo encontrado para este canal.
              </p>
            )
          )}
        </>
      )}
    </div>
  );
}
