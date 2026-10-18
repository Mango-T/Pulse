import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import type { Song, Channel } from '@/types';
import { SongRow } from '@/components/SongRow';
import { getChannelDetails, getChannelVideos } from '@/lib/youtube';
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setChannel(null);
    setChannelSongs([]);

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

    // YouTube channel
    (async () => {
      const [detailsResult, videosResult] = await Promise.all([
        getChannelDetails(channelId),
        getChannelVideos(channelId),
      ]);
      if (cancelled) return;
      if (detailsResult.error) {
        setError(detailsResult.error);
        setLoading(false);
        return;
      }
      setChannel(detailsResult.channel);
      if (videosResult.error) {
        setError(videosResult.error);
      } else {
        setChannelSongs(videosResult.songs);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [channelId]);

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
