import { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Plus,
  Trash2,
  Pencil,
  X,
  Heart,
  Music,
  Search,
} from 'lucide-react';
import type { Song, UserPlaylist } from '@/types';
import { SongRow } from '@/components/SongRow';
import { songs as allSongs } from '@/data/mockData';

interface UserPlaylistViewProps {
  playlist: UserPlaylist;
  isFavorites: boolean;
  currentSongId: string | null;
  isPlaying: boolean;
  favoriteIds: Set<string>;
  onPlaySong: (song: Song, queue: Song[]) => void;
  onPlayAll: (songs: Song[]) => void;
  onToggleFavorite: (song: Song) => void;
  onAddSong: (song: Song) => void;
  onRemoveSong: (songId: string) => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
  onBack: () => void;
}

export function UserPlaylistView({
  playlist,
  isFavorites,
  currentSongId,
  isPlaying,
  favoriteIds,
  onPlaySong,
  onPlayAll,
  onToggleFavorite,
  onAddSong,
  onRemoveSong,
  onRename,
  onDelete,
  onBack,
}: UserPlaylistViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renameValue, setRenameValue] = useState(playlist.title);
  const [searchQuery, setSearchQuery] = useState('');

  const playlistSongs = playlist.songs;

  const availableSongs = allSongs.filter(
    (s) =>
      !playlistSongs.some((ps) => ps.id === s.id) &&
      (searchQuery.trim() === '' ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.artist.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleRenameSubmit = () => {
    const title = renameValue.trim();
    if (title) {
      onRename(title);
    }
    setShowRenameModal(false);
  };

  return (
    <div className="px-4 md:px-6 pb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-4 text-sm"
      >
        <ArrowLeft size={18} />
        Voltar
      </button>

      {/* Playlist header */}
      <div className="flex items-center gap-5 mb-8 bg-gradient-to-b from-neutral-800/40 to-transparent p-4 md:p-6 rounded-2xl">
        {isFavorites ? (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-xl shrink-0">
            <Heart size={48} className="text-white fill-white" />
          </div>
        ) : playlistSongs.length > 0 && playlistSongs[0].cover ? (
          <img
            src={playlistSongs[0].cover}
            alt={playlist.title}
            className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover shadow-xl shrink-0"
          />
        ) : (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center shadow-xl shrink-0">
            <Music size={48} className="text-neutral-500" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-neutral-300 text-xs font-semibold uppercase tracking-wider">Playlist</p>
          <h1 className="text-white text-2xl md:text-4xl font-bold mt-1 truncate">{playlist.title}</h1>
          <p className="text-neutral-400 text-sm mt-2">
            {playlistSongs.length} {playlistSongs.length === 1 ? 'música' : 'músicas'}
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 mb-6">
        {playlistSongs.length > 0 && (
          <button
            onClick={() => onPlayAll(playlistSongs)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full px-5 py-2.5 text-sm font-bold transition-colors"
          >
            <Play size={18} className="fill-black" />
            Reproduzir
          </button>
        )}

        {!isFavorites && (
          <>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <Plus size={18} />
              Adicionar músicas
            </button>
            <button
              onClick={() => {
                setRenameValue(playlist.title);
                setShowRenameModal(true);
              }}
              className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-full px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <Pencil size={16} />
              Renomear
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 bg-neutral-800 hover:bg-red-900/60 text-neutral-300 hover:text-red-300 rounded-full px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <Trash2 size={16} />
              Excluir
            </button>
          </>
        )}
      </div>

      {/* Song list */}
      {playlistSongs.length > 0 ? (
        <div className="bg-neutral-900/40 rounded-xl p-2 md:p-4">
          <div className="flex flex-col gap-1">
            {playlistSongs.map((song, i) => (
              <div key={song.id} className="group/wrap relative">
                <SongRow
                  song={song}
                  index={i}
                  isCurrent={currentSongId === song.id}
                  isPlaying={isPlaying && currentSongId === song.id}
                  isFavorite={favoriteIds.has(song.id)}
                  onPlay={() => onPlaySong(song, playlistSongs)}
                  onToggleFavorite={onToggleFavorite}
                />
                {!isFavorites && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSong(song.id);
                    }}
                    className="absolute right-14 top-1/2 -translate-y-1/2 opacity-0 group-hover/wrap:opacity-100 text-neutral-400 hover:text-red-400 transition-all p-1"
                    aria-label="Remover da playlist"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
            <Music size={32} className="text-neutral-600" />
          </div>
          <p className="text-white text-base font-bold">
            {isFavorites ? 'Nenhuma música curtida ainda' : 'Esta playlist está vazia'}
          </p>
          <p className="text-neutral-500 text-sm mt-2 max-w-sm">
            {isFavorites
              ? 'Toque no coração ao lado de qualquer música para salvá-la aqui.'
              : 'Adicione músicas do catálogo para começar sua playlist.'}
          </p>
          {!isFavorites && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-6 flex items-center gap-2 bg-white text-black rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-neutral-200 transition-colors"
            >
              <Plus size={18} />
              Adicionar músicas
            </button>
          )}
        </div>
      )}

      {/* Add songs modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => {
            setShowAddModal(false);
            setSearchQuery('');
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-songs-title"
            className="w-full max-w-lg rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="add-songs-title" className="text-lg font-bold text-white">
                Adicionar músicas
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery('');
                }}
                aria-label="Fechar"
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar músicas..."
                className="w-full bg-neutral-800 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-neutral-500 outline-none ring-2 ring-transparent focus:ring-emerald-400/60 transition-all"
              />
            </div>

            <div className="overflow-y-auto flex-1 -mx-1 px-1">
              {availableSongs.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {availableSongs.map((song) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-800/60 transition-colors"
                    >
                      <img
                        src={song.cover}
                        alt={song.album}
                        className="w-10 h-10 rounded-md object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{song.title}</p>
                        <p className="text-xs text-neutral-400 truncate">{song.artist}</p>
                      </div>
                      <button
                        onClick={() => onAddSong(song)}
                        className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black flex items-center justify-center transition-all"
                        aria-label="Adicionar"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500 text-sm text-center py-8">
                  {searchQuery.trim()
                    ? 'Nenhuma música encontrada para esta busca.'
                    : 'Todas as músicas já estão nesta playlist.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {showRenameModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowRenameModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Renomear playlist</h2>
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                aria-label="Fechar"
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
              }}
              autoFocus
              placeholder="Nome da playlist"
              className="w-full bg-neutral-800 text-white rounded-lg px-4 py-3 text-sm placeholder:text-neutral-500 outline-none ring-2 ring-transparent focus:ring-emerald-400/60 transition-all"
            />

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRenameSubmit}
                disabled={!renameValue.trim()}
                className="rounded-full bg-white text-black px-5 py-2 text-sm font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-2">Excluir playlist</h2>
            <p className="text-neutral-400 text-sm mb-6">
              Tem certeza que deseja excluir "{playlist.title}"? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete();
                }}
                className="rounded-full bg-red-600 text-white px-5 py-2 text-sm font-semibold hover:bg-red-500 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
