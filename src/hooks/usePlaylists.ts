import { useCallback, useEffect, useState } from 'react';
import type { UserPlaylist, Song } from '@/types';

const STORAGE_PREFIX = 'pulse:user-playlists:';

function storageKey(userId: string | null): string {
  return userId ? `${STORAGE_PREFIX}${userId}` : `${STORAGE_PREFIX}anonymous`;
}

function loadStored(userId: string | null): UserPlaylist[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function saveStored(userId: string | null, playlists: UserPlaylist[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(playlists));
  } catch {
    // ignore
  }
}

export function usePlaylists(userId: string | null) {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);

  useEffect(() => {
    setPlaylists(loadStored(userId));
  }, [userId]);

  const persist = useCallback(
    (next: UserPlaylist[]) => {
      saveStored(userId, next);
    },
    [userId],
  );

  const createPlaylist = useCallback(
    (title: string): UserPlaylist => {
      const playlist: UserPlaylist = {
        id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: title.trim() || 'Nova Playlist',
        songs: [],
        createdAt: Date.now(),
      };
      setPlaylists((prev) => {
        const next = [...prev, playlist];
        persist(next);
        return next;
      });
      return playlist;
    },
    [persist],
  );

  const renamePlaylist = useCallback(
    (playlistId: string, newTitle: string) => {
      setPlaylists((prev) => {
        const next = prev.map((p) =>
          p.id === playlistId ? { ...p, title: newTitle.trim() || p.title } : p,
        );
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const deletePlaylist = useCallback(
    (playlistId: string) => {
      setPlaylists((prev) => {
        const next = prev.filter((p) => p.id !== playlistId);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const addSongToPlaylist = useCallback(
    (playlistId: string, song: Song) => {
      setPlaylists((prev) => {
        const next = prev.map((p) => {
          if (p.id !== playlistId) return p;
          if (p.songs.some((s) => s.id === song.id)) return p;
          return { ...p, songs: [...p.songs, song] };
        });
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const removeSongFromPlaylist = useCallback(
    (playlistId: string, songId: string) => {
      setPlaylists((prev) => {
        const next = prev.map((p) =>
          p.id === playlistId
            ? { ...p, songs: p.songs.filter((s) => s.id !== songId) }
            : p,
        );
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const getPlaylistById = useCallback(
    (playlistId: string): UserPlaylist | undefined => {
      return playlists.find((p) => p.id === playlistId);
    },
    [playlists],
  );

  return {
    playlists,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    getPlaylistById,
  };
}
