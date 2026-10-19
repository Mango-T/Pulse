
import type { Song, Channel, YTPlaylist } from '@/types';
import { getOrCompute, refreshCache } from '@/lib/youtubeCache';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
const SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';
const CHANNELS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/channels';
const PLAYLIST_ITEMS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/playlistItems';
const PLAYLISTS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/playlists';
const VIDEOS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';

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

/** Converte durações ISO 8601 do YouTube para segundos. */
function parseYouTubeDuration(duration: string): number {
  const match = duration.match(
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/,
  );

  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

/** Busca as durações reais de vários vídeos em uma única requisição. */
async function addVideoDurations(songs: Song[]): Promise<Song[]> {
  if (!API_KEY || songs.length === 0) return songs;

  const ids = [...new Set(
    songs.map((song) => song.youtubeId).filter(Boolean),
  )];

  if (ids.length === 0) return songs;

  try {
    const params = new URLSearchParams({
      part: 'contentDetails',
      id: ids.join(','),
      key: API_KEY,
    });

    const response = await fetch(`${VIDEOS_ENDPOINT}?${params}`);

    if (!response.ok) return songs;

    const data = await response.json();

    const durations = new Map<string, number>(
      (data.items ?? []).map(
        (item: { id: string; contentDetails?: { duration?: string } }) => [
          item.id,
          parseYouTubeDuration(item.contentDetails?.duration ?? ''),
        ],
      ),
    );

    return songs.map((song) => ({
      ...song,
      duration: durations.get(song.youtubeId) ?? song.duration,
    }));
  } catch {
    // Uma falha ao consultar durações não deve impedir a exibição dos vídeos.
    return songs;
  }
}

export async function searchYouTube(query: string): Promise<YouTubeSearchResult> {
  if (!API_KEY) {
    return {
      songs: [],
      error: 'Chave da API do YouTube não configurada. Adicione VITE_YOUTUBE_API_KEY no arquivo .env',
    };
  }

  const trimmed = query.trim();
  if (!trimmed) return { songs: [], error: null };

  const cacheKey = `search:q=${trimmed}:max=10`;
  return getOrCompute(
    cacheKey,
    () => fetchYouTubeSearch(trimmed),
    (r) => r.error === null,
  );
}

/** Force a fresh YouTube search, bypassing the cache. Updates the cache only on success. */
export async function refreshYouTubeSearch(query: string): Promise<YouTubeSearchResult> {
  if (!API_KEY) {
    return {
      songs: [],
      error: 'Chave da API do YouTube não configurada. Adicione VITE_YOUTUBE_API_KEY no arquivo .env',
    };
  }

  const trimmed = query.trim();
  if (!trimmed) return { songs: [], error: null };

  const cacheKey = `search:q=${trimmed}:max=10`;
  return refreshCache(
    cacheKey,
    () => fetchYouTubeSearch(trimmed),
    (r) => r.error === null,
  );
}

async function fetchYouTubeSearch(trimmed: string): Promise<YouTubeSearchResult> {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '10',
    q: trimmed,
    key: API_KEY!,
  });

  try {
    const res = await fetch(`${SEARCH_ENDPOINT}?${params}`);

    if (!res.ok) {
      if (res.status === 403) {
        return {
          songs: [],
          error: 'A chave da API do YouTube não tem permissão ou a cota diária foi excedida.',
        };
      }

      return {
        songs: [],
        error: `Erro na busca do YouTube (HTTP ${res.status}).`,
      };
    }

    const data = await res.json();
    const items: YouTubeSearchItem[] = data.items ?? [];

    const songs: Song[] = items
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        id: `yt:${item.id.videoId}`,
        title: item.snippet.title
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"'),
        artist: item.snippet.channelTitle,
        artistId: `yt-channel:${item.snippet.channelTitle}`,
        album: 'YouTube',
        albumId: 'yt',
        cover:
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          '',
        duration: 0,
        melody: [],
        bass: [],
        tempo: 0,
        waveform: 'sine',
        youtubeId: item.id.videoId,
      }));

    return {
      songs: await addVideoDurations(songs),
      error: null,
    };
  } catch {
    return {
      songs: [],
      error: 'Falha de rede ao buscar no YouTube. Verifique sua conexão.',
    };
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

export async function searchYouTubeChannels(
  query: string,
): Promise<YouTubeChannelResult> {
  if (!API_KEY) {
    return { channels: [], error: null };
  }

  const trimmed = query.trim();
  if (!trimmed) return { channels: [], error: null };

  const cacheKey = `channels:q=${trimmed}:max=5`;
  return getOrCompute(
    cacheKey,
    () => fetchYouTubeChannels(trimmed),
    (r) => r.error === null,
  );
}

async function fetchYouTubeChannels(trimmed: string): Promise<YouTubeChannelResult> {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'channel',
    maxResults: '5',
    q: trimmed,
    key: API_KEY!,
  });

  try {
    const res = await fetch(`${SEARCH_ENDPOINT}?${params}`);

    if (!res.ok) {
      if (res.status === 403) {
        return {
          channels: [],
          error: 'A chave da API do YouTube não tem permissão ou a cota diária foi excedida.',
        };
      }

      return {
        channels: [],
        error: `Erro na busca de canais (HTTP ${res.status}).`,
      };
    }

    const data = await res.json();
    const items: YouTubeChannelSearchItem[] = data.items ?? [];

    const channels: Channel[] = items
      .filter((item) => item.id?.channelId)
      .map((item) => ({
        id: `yt-channel:${item.id.channelId}`,
        name: decodeEntities(item.snippet.title),
        avatar:
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          '',
        description: decodeEntities(item.snippet.description || ''),
        isLocal: false,
      }));

    return { channels, error: null };
  } catch {
    return {
      channels: [],
      error: 'Falha de rede ao buscar canais. Verifique sua conexão.',
    };
  }
}

export interface ChannelVideosPageResult {
  songs: Song[];
  nextPageToken: string | null;
  error: string | null;
}

interface PlaylistItem {
  snippet: {
    title: string;
    channelTitle: string;
    resourceId: { videoId: string };
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
}

export async function getChannelVideosPage(
  uploadsPlaylistId: string,
  pageToken?: string,
): Promise<ChannelVideosPageResult> {
  if (!API_KEY) {
    return {
      songs: [],
      nextPageToken: null,
      error: 'Chave da API do YouTube não configurada.',
    };
  }

  const cacheKey = `channelVideos:pl=${uploadsPlaylistId}:max=20:page=${pageToken ?? ''}`;
  return getOrCompute(
    cacheKey,
    () => fetchChannelVideosPage(uploadsPlaylistId, pageToken),
    (r) => r.error === null,
  );
}

async function fetchChannelVideosPage(
  uploadsPlaylistId: string,
  pageToken?: string,
): Promise<ChannelVideosPageResult> {
  const params = new URLSearchParams({
    part: 'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: '20',
    key: API_KEY!,
  });

  if (pageToken) params.set('pageToken', pageToken);

  try {
    const res = await fetch(`${PLAYLIST_ITEMS_ENDPOINT}?${params}`);

    if (!res.ok) {
      if (res.status === 403) {
        return {
          songs: [],
          nextPageToken: null,
          error: 'Cota da API excedida.',
        };
      }

      return {
        songs: [],
        nextPageToken: null,
        error: `Erro ao buscar vídeos (HTTP ${res.status}).`,
      };
    }

    const data = await res.json();
    const items: PlaylistItem[] = data.items ?? [];
    const nextPageToken: string | null = data.nextPageToken ?? null;

    const songs: Song[] = items
      .filter((item) => item.snippet?.resourceId?.videoId)
      .map((item) => ({
        id: `yt:${item.snippet.resourceId.videoId}`,
        title: decodeEntities(item.snippet.title),
        artist: decodeEntities(item.snippet.channelTitle),
        artistId: `yt-channel:${item.snippet.channelTitle}`,
        album: 'YouTube',
        albumId: 'yt',
        cover:
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          '',
        duration: 0,
        melody: [],
        bass: [],
        tempo: 0,
        waveform: 'sine',
        youtubeId: item.snippet.resourceId.videoId,
      }));

    return {
      songs: await addVideoDurations(songs),
      nextPageToken,
      error: null,
    };
  } catch {
    return {
      songs: [],
      nextPageToken: null,
      error: 'Falha de rede ao buscar vídeos do canal.',
    };
  }
}

export async function getChannelDetails(
  channelId: string,
): Promise<{
  channel: Channel | null;
  uploadsPlaylistId: string | null;
  error: string | null;
}> {
  if (!API_KEY) {
    return {
      channel: null,
      uploadsPlaylistId: null,
      error: 'Chave da API do YouTube não configurada.',
    };
  }

  const cacheKey = `channelDetails:id=${channelId}`;
  return getOrCompute(
    cacheKey,
    () => fetchChannelDetails(channelId),
    (r) => r.error === null,
  );
}

async function fetchChannelDetails(
  channelId: string,
): Promise<{
  channel: Channel | null;
  uploadsPlaylistId: string | null;
  error: string | null;
}> {
  const cleanId = channelId.replace('yt-channel:', '');

  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    id: cleanId,
    key: API_KEY!,
  });

  try {
    const res = await fetch(`${CHANNELS_ENDPOINT}?${params}`);

    if (!res.ok) {
      return {
        channel: null,
        uploadsPlaylistId: null,
        error: `Erro ao buscar detalhes do canal (HTTP ${res.status}).`,
      };
    }

    const data = await res.json();
    const item = data.items?.[0];

    if (!item) {
      return {
        channel: null,
        uploadsPlaylistId: null,
        error: 'Canal não encontrado.',
      };
    }

    return {
      channel: {
        id: `yt-channel:${item.id}`,
        name: decodeEntities(item.snippet?.title ?? ''),
        avatar:
          item.snippet?.thumbnails?.medium?.url ??
          item.snippet?.thumbnails?.default?.url ??
          '',
        description: decodeEntities(item.snippet?.description ?? ''),
        isLocal: false,
      },
      uploadsPlaylistId:
        item.contentDetails?.relatedPlaylists?.uploads ?? null,
      error: null,
    };
  } catch {
    return {
      channel: null,
      uploadsPlaylistId: null,
      error: 'Falha de rede ao buscar detalhes do canal.',
    };
  }
}

// --- YouTube Playlists ---

export interface YouTubePlaylistSearchResult {
  playlists: YTPlaylist[];
  nextPageToken: string | null;
  error: string | null;
}

interface YouTubePlaylistSearchItem {
  id: { playlistId: string };
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

export async function searchYouTubePlaylists(
  query: string,
  pageToken?: string,
): Promise<YouTubePlaylistSearchResult> {
  if (!API_KEY) {
    return { playlists: [], nextPageToken: null, error: null };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { playlists: [], nextPageToken: null, error: null };
  }

  const cacheKey = `playlists:q=${trimmed}:max=10:page=${pageToken ?? ''}`;
  return getOrCompute(
    cacheKey,
    () => fetchYouTubePlaylists(trimmed, pageToken),
    (r) => r.error === null,
  );
}

async function fetchYouTubePlaylists(
  trimmed: string,
  pageToken?: string,
): Promise<YouTubePlaylistSearchResult> {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'playlist',
    maxResults: '10',
    q: trimmed,
    key: API_KEY!,
  });

  if (pageToken) params.set('pageToken', pageToken);

  try {
    const res = await fetch(`${SEARCH_ENDPOINT}?${params}`);

    if (!res.ok) {
      if (res.status === 403) {
        return {
          playlists: [],
          nextPageToken: null,
          error: 'Cota da API excedida.',
        };
      }

      return {
        playlists: [],
        nextPageToken: null,
        error: `Erro ao buscar playlists (HTTP ${res.status}).`,
      };
    }

    const data = await res.json();
    const items: YouTubePlaylistSearchItem[] = data.items ?? [];

    const result: YTPlaylist[] = items
      .filter((item) => item.id?.playlistId)
      .map((item) => ({
        id: `yt-playlist:${item.id.playlistId}`,
        title: decodeEntities(item.snippet.title),
        cover:
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          '',
        videoCount: '',
        channelName: decodeEntities(item.snippet.channelTitle),
      }));

    return {
      playlists: result,
      nextPageToken: data.nextPageToken ?? null,
      error: null,
    };
  } catch {
    return {
      playlists: [],
      nextPageToken: null,
      error: 'Falha de rede ao buscar playlists.',
    };
  }
}

export interface ChannelPlaylistsResult {
  playlists: YTPlaylist[];
  nextPageToken: string | null;
  error: string | null;
}

interface YouTubePlaylistListItem {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  contentDetails: {
    itemCount: number;
  };
}

export async function getChannelPlaylists(
  channelId: string,
  pageToken?: string,
): Promise<ChannelPlaylistsResult> {
  if (!API_KEY) {
    return {
      playlists: [],
      nextPageToken: null,
      error: 'Chave da API do YouTube não configurada.',
    };
  }

  const cacheKey = `channelPlaylists:id=${channelId}:max=10:page=${pageToken ?? ''}`;
  return getOrCompute(
    cacheKey,
    () => fetchChannelPlaylists(channelId, pageToken),
    (r) => r.error === null,
  );
}

async function fetchChannelPlaylists(
  channelId: string,
  pageToken?: string,
): Promise<ChannelPlaylistsResult> {
  const cleanId = channelId.replace('yt-channel:', '');

  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    channelId: cleanId,
    maxResults: '10',
    key: API_KEY!,
  });

  if (pageToken) params.set('pageToken', pageToken);

  try {
    const res = await fetch(`${PLAYLISTS_ENDPOINT}?${params}`);

    if (!res.ok) {
      if (res.status === 403) {
        return {
          playlists: [],
          nextPageToken: null,
          error: 'Cota da API excedida.',
        };
      }

      return {
        playlists: [],
        nextPageToken: null,
        error: `Erro ao buscar playlists do canal (HTTP ${res.status}).`,
      };
    }

    const data = await res.json();
    const items: YouTubePlaylistListItem[] = data.items ?? [];

    const result: YTPlaylist[] = items.map((item) => ({
      id: `yt-playlist:${item.id}`,
      title: decodeEntities(item.snippet.title),
      cover:
        item.snippet.thumbnails.medium?.url ??
        item.snippet.thumbnails.default?.url ??
        '',
      videoCount: `${item.contentDetails?.itemCount ?? 0} vídeos`,
      channelName: decodeEntities(item.snippet.channelTitle),
    }));

    return {
      playlists: result,
      nextPageToken: data.nextPageToken ?? null,
      error: null,
    };
  } catch {
    return {
      playlists: [],
      nextPageToken: null,
      error: 'Falha de rede ao buscar playlists do canal.',
    };
  }
}

export interface PlaylistItemsPageResult {
  songs: Song[];
  nextPageToken: string | null;
  error: string | null;
}

export async function getPlaylistItemsPage(
  playlistId: string,
  pageToken?: string,
): Promise<PlaylistItemsPageResult> {
  if (!API_KEY) {
    return {
      songs: [],
      nextPageToken: null,
      error: 'Chave da API do YouTube não configurada.',
    };
  }

  const cacheKey = `playlistItems:id=${playlistId}:max=20:page=${pageToken ?? ''}`;
  return getOrCompute(
    cacheKey,
    () => fetchPlaylistItemsPage(playlistId, pageToken),
    (r) => r.error === null,
  );
}

async function fetchPlaylistItemsPage(
  playlistId: string,
  pageToken?: string,
): Promise<PlaylistItemsPageResult> {
  const cleanId = playlistId.replace('yt-playlist:', '');

  const params = new URLSearchParams({
    part: 'snippet',
    playlistId: cleanId,
    maxResults: '20',
    key: API_KEY!,
  });

  if (pageToken) params.set('pageToken', pageToken);

  try {
    const res = await fetch(`${PLAYLIST_ITEMS_ENDPOINT}?${params}`);

    if (!res.ok) {
      if (res.status === 403) {
        return {
          songs: [],
          nextPageToken: null,
          error: 'Cota da API excedida.',
        };
      }

      return {
        songs: [],
        nextPageToken: null,
        error: `Erro ao buscar itens da playlist (HTTP ${res.status}).`,
      };
    }

    const data = await res.json();
    const items: PlaylistItem[] = data.items ?? [];
    const nextPageToken: string | null = data.nextPageToken ?? null;

    const songs: Song[] = items
      .filter((item) => item.snippet?.resourceId?.videoId)
      .map((item) => ({
        id: `yt:${item.snippet.resourceId.videoId}`,
        title: decodeEntities(item.snippet.title),
        artist: decodeEntities(item.snippet.channelTitle),
        artistId: `yt-channel:${item.snippet.channelTitle}`,
        album: 'YouTube',
        albumId: 'yt',
        cover:
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          '',
        duration: 0,
        melody: [],
        bass: [],
        tempo: 0,
        waveform: 'sine',
        youtubeId: item.snippet.resourceId.videoId,
      }));

    return {
      songs: await addVideoDurations(songs),
      nextPageToken,
      error: null,
    };
  } catch {
    return {
      songs: [],
      nextPageToken: null,
      error: 'Falha de rede ao buscar itens da playlist.',
    };
  }
}
