
import { useState } from 'react';
import { Heart, Plus, X, Music, Play } from 'lucide-react';
import type { Song, UserPlaylist } from '@/types';

interface LibraryViewProps {
  favoriteSongs: Song[];
  playlists: UserPlaylist[];
  currentSongId: string | null;
  isPlaying: boolean;
  onPlayPlaylist: (songs: Song[]) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onCreatePlaylist: (title: string) => void;
}

export function LibraryView({
  favoriteSongs,
  playlists,
  currentSongId,
  isPlaying,
  onPlayPlaylist,
  onOpenPlaylist,
  onCreatePlaylist,
}: LibraryViewProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const closeCreateForm = () => {
    setShowCreateForm(false);
    setNewTitle('');
  };

  const handleCreate = () => {
    const title = newTitle.trim();
    if (!title) return;

    // App.tsx decide se cria a playlist ou abre o modal de login.
    onCreatePlaylist(title);

    // Não fecha o formulário aqui: o App pode precisar solicitar login.
  };

  const hasAnyPlaylists = favoriteSongs.length > 0 || playlists.length > 0;

  return (
    <div className="px-4 md:px-6 pb-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-lg md:text-xl font-bold">Minhas Playlists</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-white text-black rounded-full px-4 py-2 text-sm font-semibold hover:bg-neutral-200 transition-colors"
        >
          <Plus size={16} />
          Criar playlist
        </button>
      </div>

      {/* Create playlist modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeCreateForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-playlist-title"
            className="w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 id="create-playlist-title" className="text-xl font-bold text-white">
                Criar playlist
              </h2>
              <button
                type="button"
                onClick={closeCreateForm}
                aria-label="Fechar"
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              autoFocus
              placeholder="Nome da playlist"
              className="w-full bg-neutral-800 text-white rounded-lg px-4 py-3 text-sm placeholder:text-neutral-500 outline-none ring-2 ring-transparent focus:ring-emerald-400/60 transition-all"
            />

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={closeCreateForm}
                className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="rounded-full bg-white text-black px-5 py-2 text-sm font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {!hasAnyPlaylists ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center mb-6">
            <Music size={36} className="text-neutral-600" />
          </div>
          <p className="text-white text-lg font-bold">Sua biblioteca está vazia</p>
          <p className="text-neutral-500 text-sm mt-2 max-w-sm">
            Crie uma playlist ou curta músicas para começar sua coleção.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {/* Favorites — fixed playlist */}
          {favoriteSongs.length > 0 && (
            <div
              onClick={() => onOpenPlaylist('favorites')}
              className="group relative bg-neutral-800/40 hover:bg-neutral-800/70 rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-300 w-full"
            >
              <div className="relative mb-3 aspect-square w-full">
                <div className="w-full h-full rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                  <Heart size={48} className="text-white fill-white" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayPlaylist(favoriteSongs);
                  }}
                  className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-105 hover:bg-emerald-400"
                >
                  <Play size={18} className="text-black fill-black ml-0.5" />
                </button>
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">Favoritos</p>
                <p className="text-neutral-400 text-xs mt-1">
                  {favoriteSongs.length} {favoriteSongs.length === 1 ? 'música' : 'músicas'}
                </p>
              </div>
            </div>
          )}

          {/* User-created playlists */}
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onOpenPlaylist(pl.id)}
              className="group relative bg-neutral-800/40 hover:bg-neutral-800/70 rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-300 w-full"
            >
              <div className="relative mb-3 aspect-square w-full">
                {pl.songs.length > 0 && pl.songs[0].cover ? (
                  <img
                    src={pl.songs[0].cover}
                    alt={pl.title}
                    className="w-full h-full object-cover shadow-lg rounded-lg"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full rounded-lg bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center shadow-lg">
                    <Music size={40} className="text-neutral-500" />
                  </div>
                )}
                {pl.songs.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayPlaylist(pl.songs);
                    }}
                    className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-105 hover:bg-emerald-400"
                  >
                    <Play size={18} className="text-black fill-black ml-0.5" />
                  </button>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{pl.title}</p>
                <p className="text-neutral-400 text-xs mt-1">
                  {pl.songs.length} {pl.songs.length === 1 ? 'música' : 'músicas'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
