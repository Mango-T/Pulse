import type { Song } from '@/types';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
const SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
}

export interface YouTubeSearchResult {
  songs: Song[];
  error: string | null;
}

export function isYouTubeConfigured(): boolean {
  return !!API_KEY;
}

export async function searchYouTube(query: string): Promise<YouTubeSearchResult> {
  if (!API_KEY) {
    return { songs: [], error: 'Chave da API do YouTube não configurada. Adicione VITE_YOUTUBE_API_KEY no arquivo .env' };
  }

  const trimmed = query.trim();
  if (!trimmed) return { songs: [], error: null };

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '10',
    q: trimmed,
    key: API_KEY,
  });

  try {
    const res = await fetch(`${SEARCH_ENDPOINT}?${params}`);
    if (!res.ok) {
      if (res.status === 403) {
        return { songs: [], error: 'A chave da API do YouTube não tem permissão ou a cota diária foi excedida.' };
      }
      return { songs: [], error: `Erro na busca do YouTube (HTTP ${res.status}).` };
    }

    const data = await res.json();
    const items: YouTubeSearchItem[] = data.items ?? [];

    const songs: Song[] = items
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        id: `yt:${item.id.videoId}`,
        title: item.snippet.title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
        artist: item.snippet.channelTitle,
        artistId: `yt-channel:${item.snippet.channelTitle}`,
        album: 'YouTube',
        albumId: 'yt',
        cover: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
        duration: 0,
        melody: [],
        bass: [],
        tempo: 0,
        waveform: 'sine',
        youtubeId: item.id.videoId,
      }));

    return { songs, error: null };
  } catch {
    return { songs: [], error: 'Falha de rede ao buscar no YouTube. Verifique sua conexão.' };
  }
}
