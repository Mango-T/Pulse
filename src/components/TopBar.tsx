
import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { View } from '@/types';

interface TopBarProps {
  view: View;
  onNavigate: (view: View) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isLoggedIn: boolean;
  onSignInWithGoogle: () => void;
}

const viewTitles: Record<View, string> = {
  home: 'Boa tarde',
  search: 'Buscar',
  library: 'Minha Biblioteca',
};

export function TopBar({
  view,
  onNavigate,
  searchQuery,
  onSearchChange,
  isLoggedIn,
  onSignInWithGoogle,
}: TopBarProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-4 px-4 md:px-6 py-4 bg-transparent">
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('home')}
            aria-label="Início"
            className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={() => onNavigate('search')}
            aria-label="Buscar"
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

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => onNavigate('search')}
            aria-label="Buscar"
            className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-300 md:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>

          {!isLoggedIn && (
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-neutral-200 transition-colors whitespace-nowrap"
            >
              Fazer login
            </button>
          )}
        </div>
      </div>

      {loginOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setLoginOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            className="w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 id="login-title" className="text-xl font-bold text-white">
                Entrar no Pulse
              </h2>

              <button
                type="button"
                onClick={() => setLoginOpen(false)}
                aria-label="Fechar"
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-neutral-400 mb-6">
              Entre para personalizar sua experiência ou continue usando o Pulse sem login.
            </p>

            <button
              type="button"
              onClick={() => {
                setLoginOpen(false);
                onSignInWithGoogle();
              }}
              className="w-full flex items-center justify-center gap-3 rounded-full bg-white text-black py-3 px-4 font-semibold hover:bg-neutral-200 transition-colors"
            >
              <span className="font-bold text-base">G</span>
              Continuar com Google
            </button>
          </div>
        </div>
      )}
    </>
  );
}
