
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
  channel: 'Canal',
  playlist: 'Playlist',
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
            type="button"
            onClick={() => onNavigate('home')}
            aria-label="Início"
            className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
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
                searchFocused
                  ? 'ring-2 ring-emerald-400/60 bg-neutral-700'
                  : ''
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
            type="button"
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

      {loginOpen && !isLoggedIn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setLoginOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pulse-login-title"
            className="w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                id="pulse-login-title"
                className="text-xl font-bold text-white"
              >
                Entrar no Pulse
              </h2>

              <button
                type="button"
                onClick={() => setLoginOpen(false)}
                aria-label="Fechar janela de login"
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-neutral-400 mb-6">
              Entre para personalizar sua experiência. Você pode continuar
              usando o Pulse sem fazer login.
            </p>

            <div className="flex flex-col gap-3">
              
<button
  type="button"
  onClick={() => {
    setLoginOpen(false);
    onSignInWithGoogle();
  }}
  className="w-full flex items-center justify-center gap-3 rounded-full bg-white text-neutral-700 border border-neutral-300 py-3 px-4 font-medium hover:bg-neutral-50 transition-colors shadow-sm"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    className="w-5 h-5 shrink-0"
    aria-hidden="true"
  >
    <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
    <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
    <path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 18Z" />
    <path fill="#EA4335" d="M24 12.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6.9 29.5 4.8 24 4.8A20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-7.4 11.4-7.4Z" />
  </svg>
  Continuar com Google
</button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
