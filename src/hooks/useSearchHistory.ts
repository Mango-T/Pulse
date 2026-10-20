
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pulse:search-history:v1';

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
  } catch {
    return [];
  }
}

function saveHistory(items: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Mantém o aplicativo funcional se o armazenamento falhar.
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const addSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    setHistory((prev) => {
      const filtered = prev.filter(
        (h) => h.toLowerCase() !== trimmed.toLowerCase(),
      );
      const next = [trimmed, ...filtered];
      saveHistory(next);
      return next;
    });
  }, []);

  const removeSearch = useCallback((term: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.toLowerCase() !== term.toLowerCase());
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  return { history, addSearch, removeSearch, clearHistory };
}
