import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pulse:favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch {
      // ignore
    }
  }, []);

  const save = useCallback((ids: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      // ignore
    }
  }, []);

  const toggleFavorite = useCallback(
    (songId: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(songId)) {
          next.delete(songId);
        } else {
          next.add(songId);
        }
        save(next);
        return next;
      });
    },
    [save],
  );

  const isFavorite = useCallback((songId: string) => favorites.has(songId), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
