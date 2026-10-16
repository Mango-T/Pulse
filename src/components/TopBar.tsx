import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { View } from '@/types';

interface TopBarProps {
  view: View;
  onNavigate: (view: View) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const viewTitles: Record<View, string> = {
  home: 'Boa tarde',
  search: 'Buscar',
  library: 'Minha Biblioteca',
};

export function TopBar({ view, onNavigate, searchQuery, onSearchChange }: TopBarProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <div className="flex items-center gap-4 px-4 md:px-6 py-4 bg-transparent">
      <div className="flex gap-2">
        <button
          onClick={() => onNavigate('home')}
          className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => onNavigate('search')}
          className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {view === 'search' ? (
        <div className="flex-1 max-w-md relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="O que você quer ouvir?"
            className={`w-full bg-neutral-800 text-white rounded-lg pl-4 pr-4 py-2.5 text-sm placeholder:text-neutral-500 outline-none transition-all duration-200 ${
              searchFocused ? 'ring-2 ring-emerald-400/60 bg-neutral-700' : ''
            }`}
          />
        </div>
      ) : (
        <h1 className="text-white text-xl md:text-2xl font-bold tracking-tight">
          {viewTitles[view]}
        </h1>
      )}

      <div className="ml-auto md:hidden">
        <button
          onClick={() => onNavigate('search')}
          className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-300"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
