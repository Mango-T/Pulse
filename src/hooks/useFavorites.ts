
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Song } from '@/types';
import { getSongById } from '@/data/mockData';

const LEGACY_KEY = 'pulse:favorites';
const MIGRATION_KEY = 'pulse:favorites:migrated:v1';

interface StoredFavorite {
  song: Song;
  addedAt: number;
}

function loadStored(key: string): StoredFavorite[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    if (typeof parsed[0] === 'string') {
      return (parsed as string[])
        .map((id) => {
          const song = getSongById(id);
          return song ? { song, addedAt: 0 } : null;
        })
        .filter((item): item is StoredFavorite => item !== null);
    }

    if (
      typeof parsed[0] === 'object' &&
      parsed[0] !== null &&
      'song' in parsed[0]
    ) {
      return parsed as StoredFavorite[];
    }

    return [];
  } catch {
    return [];
  }
}

function saveStored(key: string, items: StoredFavorite[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Mantém o aplicativo funcional se o armazenamento falhar.
  }
}

function migrateLegacyFavorites(targetKey: string) {
  try {
    if (localStorage.getItem(MIGRATION_KEY)) return;

    const legacy = localStorage.getItem(LEGACY_KEY);

    if (legacy !== null) {
      if (localStorage.getItem(targetKey) === null) {
        saveStored(targetKey, loadStored(LEGACY_KEY));
      }

      localStorage.setItem(MIGRATION_KEY, 'true');
    }
  } catch {
    // Não interrompe o aplicativo.
  }
}

export function useFavorites(userId: string | null, authLoading = false) {
  const storageKey = `pulse:favorites:${userId ?? 'anonymous'}`;

  const [items, setItems] = useState<StoredFavorite[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    migrateLegacyFavorites(storageKey);
    setItems(loadStored(storageKey));
    setLoadedKey(storageKey);
  }, [storageKey, authLoading]);

  const isLoaded = !authLoading && loadedKey === storageKey;
  const favorites = userId && isLoaded ? items : [];

  const favoriteIds = useMemo(
    () => new Set(favorites.map((favorite) => favorite.song.id)),
    [favorites],
  );

  const favoriteSongs = useMemo(
    () => favorites.map((favorite) => favorite.song),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (song: Song) => {
      if (!userId || !isLoaded) return;

      setItems((prev) => {
        const index = prev.findIndex(
          (favorite) => favorite.song.id === song.id,
        );

        const next: StoredFavorite[] =
          index >= 0
            ? prev.filter((_, i) => i !== index)
            : [...prev, { song, addedAt: Date.now() }];

        saveStored(storageKey, next);
        return next;
      });
    },
    [userId, isLoaded, storageKey],
  );

  const isFavorite = useCallback(
    (songId: string) => favoriteIds.has(songId),
    [favoriteIds],
  );

  return {
    favorites,
    favoriteIds,
    favoriteSongs,
    toggleFavorite,
    isFavorite,
  };
}
