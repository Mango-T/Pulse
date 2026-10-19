import { useCallback, useEffect, useState } from 'react';
import type { Song } from '@/types';
import { songs as allSongs, getSongById } from '@/data/mockData';

const STORAGE_KEY = 'pulse:favorites';

interface StoredFavorite {
  song: Song;
  addedAt: number;
}

function loadStored(): StoredFavorite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return [];
      if (typeof parsed[0] === 'string') {
        const ids = parsed as string[];
        return ids
          .map((id) => {
            const song = getSongById(id);
            return song ? { song, addedAt: 0 } : null;
          })
          .filter((x): x is StoredFavorite => x !== null);
      }
      if (typeof parsed[0] === 'object' && 'song' in parsed[0]) {
        return parsed as StoredFavorite[];
      }
    }
    return [];
  } catch {
    return [];
  }
}

function saveStored(items: StoredFavorite[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function useFavorites() {
  const [items, setItems] = useState<StoredFavorite[]>([]);

  useEffect(() => {
    setItems(loadStored());
  }, []);

  const save = useCallback((next: StoredFavorite[]) => {
    saveStored(next);
  }, []);

  const favorites = items;
  const favoriteIds = new Set(items.map((f) => f.song.id));

  const favoriteSongs: Song[] = items.map((f) => f.song);

  const toggleFavorite = useCallback(
  (song: Song) => {
    if (!userId || !isLoaded) return;

    setItems((prev) => {
      const idx = prev.findIndex((f) => f.song.id === song.id);

      const next: StoredFavorite[] =
        idx >= 0
          ? prev.filter((_, i) => i !== idx)
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

  return { favorites, favoriteIds, favoriteSongs, toggleFavorite, isFavorite };
}
