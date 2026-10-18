import type { Song, Channel } from '@/types';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
const SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';
const CHANNELS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/channels';

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

export interface YouTubeChannelResult {
  channels: Channel[];
  error: string | null;
}

interface YouTubeChannelSearchItem {
  id: { channelId: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export async function searchYouTubeChannels(query: string): Promise<YouTubeChannelResult> {
  if (!API_KEY) {
    return { channels: [], error: null };
  }

  const trimmed = query.trim();
  if (!trimmed) return { channels: [], error: null };

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'channel',
    maxResults: '5',
    q: trimmed,
    key: API_KEY,
  });

  try {
    const res = await fetch(`${SEARCH_ENDPOINT}?${params}`);
    if (!res.ok) {
      if (res.status === 403) {
        return { channels: [], error: 'A chave da API do YouTube não tem permissão ou a cota diária foi excedida.' };
      }
      return { channels: [], error: `Erro na busca de canais (HTTP ${res.status}).` };
    }

    const data = await res.json();
    const items: YouTubeChannelSearchItem[] = data.items ?? [];

    const channels: Channel[] = items
      .filter((item) => item.id?.channelId)
      .map((item) => ({
        id: `yt-channel:${item.id.channelId}`,
        name: decodeEntities(item.snippet.title),
        avatar: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
        description: decodeEntities(item.snippet.description || ''),
        isLocal: false,
      }));

    return { channels, error: null };
  } catch {
    return { channels: [], error: 'Falha de rede ao buscar canais. Verifique sua conexão.' };
  }
}

export interface ChannelVideosResult {
  songs: Song[];
  error: string | null;
}

export async function getChannelVideos(channelId: string): Promise<ChannelVideosResult> {
  if (!API_KEY) {
    return { songs: [], error: 'Chave da API do YouTube não configurada.' };
  }

  const cleanId = channelId.replace('yt-channel:', '');

  const searchParams = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '20',
    channelId: cleanId,
    order: 'date',
    key: API_KEY,
  });

  try {
    const res = await fetch(`${SEARCH_ENDPOINT}?${searchParams}`);
    if (!res.ok) {
      if (res.status === 403) {
        return { songs: [], error: 'Cota da API excedida.' };
      }
      return { songs: [], error: `Erro ao buscar vídeos (HTTP ${res.status}).` };
    }

    const data = await res.json();
    const items: YouTubeSearchItem[] = data.items ?? [];

    const songs: Song[] = items
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        id: `yt:${item.id.videoId}`,
        title: decodeEntities(item.snippet.title),
        artist: decodeEntities(item.snippet.channelTitle),
        artistId: channelId,
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
    return { songs: [], error: 'Falha de rede ao buscar vídeos do canal.' };
  }
}

export async function getChannelDetails(channelId: string): Promise<{ channel: Channel | null; error: string | null }> {
  if (!API_KEY) {
    return { channel: null, error: 'Chave da API do YouTube não configurada.' };
  }

  const cleanId = channelId.replace('yt-channel:', '');

  const params = new URLSearchParams({
    part: 'snippet',
    id: cleanId,
    key: API_KEY,
  });

  try {
    const res = await fetch(`${CHANNELS_ENDPOINT}?${params}`);
    if (!res.ok) {
      return { channel: null, error: `Erro ao buscar detalhes do canal (HTTP ${res.status}).` };
    }

    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return { channel: null, error: 'Canal não encontrado.' };

    return {
      channel: {
        id: `yt-channel:${item.id}`,
        name: decodeEntities(item.snippet?.title ?? ''),
        avatar: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
        description: decodeEntities(item.snippet?.description ?? ''),
        isLocal: false,
      },
      error: null,
    };
  } catch {
    return { channel: null, error: 'Falha de rede ao buscar detalhes do canal.' };
  }
}
