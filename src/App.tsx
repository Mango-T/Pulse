
import { useCallback, useMemo, useState } from 'react';
import { Home as HomeIcon, Search as SearchIcon, Library, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { View, Song, PlayerMode, UserProfile, YTPlaylist, UserPlaylist } from '@/types';
import { songs, playlists, artists, albums } from '@/data/mockData';
import { usePlayer } from '@/hooks/usePlayer';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { usePlaylists } from '@/hooks/usePlaylists';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { PlayerBar } from '@/components/PlayerBar';
import { YouTubePlayerView } from '@/components/YouTubePlayerView';
import { HomeView } from '@/views/HomeView';
import { SearchView } from '@/views/SearchView';
import { LibraryView } from '@/views/LibraryView';
import { ChannelView } from '@/views/ChannelView';
import { PlaylistView } from '@/views/PlaylistView';
import { UserPlaylistView } from '@/views/UserPlaylistView';

function userToProfile(u: User): UserProfile {
  return {
    id: u.id,
    name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'Usuário',
    email: u.email ?? '',
    avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture || '',
  };
}

export function App() {
  const [view, setView] = useState<View>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [playerMode, setPlayerMode] = useState<PlayerMode>('video');
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YTPlaylist | null>(null);
  const [selectedUserPlaylistId, setSelectedUserPlaylistId] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalReason, setLoginModalReason] = useState<'favorite' | 'playlist'>('favorite');

  const {
    user,
    loading: authLoading,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const player = usePlayer();

  const {
    favoriteIds,
    favoriteSongs,
    toggleFavorite,
    isFavorite,
  } = useFavorites(user?.id ?? null, authLoading);

  const {
    playlists: userPlaylists,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    getPlaylistById,
  } = usePlaylists(user?.id ?? null);

  const handleFavoriteClick = useCallback(
    (song: Song) => {
      if (authLoading) return;

      if (!user) {
        setLoginModalReason('favorite');
        setShowLoginModal(true);
        return;
      }

      toggleFavorite(song);
    },
    [authLoading, user, toggleFavorite],
  );

  const handleCreatePlaylist = useCallback(
  (title: string) => {
    if (authLoading) return;

    if (!user) {
      setLoginModalReason('playlist');
      setShowLoginModal(true);
      return;
    }

    createPlaylist(title);
  },
  [authLoading, user, createPlaylist]
);

  const profile: UserProfile | null = user ? userToProfile(user) : null;

  const favoritesPlaylist: UserPlaylist = useMemo(
    () => ({
      id: 'favorites',
      title: 'Favoritos',
      songs: favoriteSongs,
      createdAt: 0,
    }),
    [favoriteSongs],
  );

  const handlePlaySong = (song: Song, queue?: Song[]) => {
    player.playSong(song, queue);
  };

  const handlePlayPlaylist = (playlistSongs: Song[]) => {
    if (playlistSongs.length > 0) {
      player.playSong(playlistSongs[0], playlistSongs);
    }
  };

  const selectedUserPlaylist = selectedUserPlaylistId
    ? selectedUserPlaylistId === 'favorites'
      ? favoritesPlaylist
      : getPlaylistById(selectedUserPlaylistId)
    : null;

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
        <Loader2 size={32} className="animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-black overflow-hidden text-white select-none">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={view}
          onNavigate={setView}
          favoriteCount={favoriteIds.size}
          user={profile}
          onSignOut={signOut}
        />

        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-neutral-900 to-black rounded-lg mr-2 max-md:rounded-none max-md:mr-0">
          <TopBar
            view={view}
            onNavigate={setView}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isLoggedIn={!!profile}
            onSignInWithGoogle={signInWithGoogle}
          />

          <YouTubePlayerView
            song={player.currentSong}
            mode={playerMode}
            onModeChange={setPlayerMode}
            error={player.ytError}
          />

          {view === 'home' && (
            <HomeView
              songs={songs}
              playlists={playlists}
              artists={artists}
              albums={albums}
              currentSongId={player.currentSong?.id ?? null}
              isPlaying={player.isPlaying}
              favorites={favoriteIds}
              onPlaySong={handlePlaySong}
              onPlayPlaylist={handlePlayPlaylist}
              onToggleFavorite={handleFavoriteClick}
            />
          )}

          {view === 'search' && (
            <SearchView
              query={searchQuery}
              currentSongId={player.currentSong?.id ?? null}
              isPlaying={player.isPlaying}
              favorites={favoriteIds}
              onPlaySong={handlePlaySong}
              onToggleFavorite={handleFavoriteClick}
              onOpenChannel={(channelId) => {
                setSelectedChannelId(channelId);
                setView('channel');
              }}
              onOpenPlaylist={(playlist) => {
                setSelectedPlaylist(playlist);
                setView('playlist');
              }}
            />
          )}

          {view === 'channel' && selectedChannelId && (
            <ChannelView
              channelId={selectedChannelId}
              currentSongId={player.currentSong?.id ?? null}
              isPlaying={player.isPlaying}
              favorites={favoriteIds}
              onPlaySong={handlePlaySong}
              onToggleFavorite={handleFavoriteClick}
              onOpenPlaylist={(playlist) => {
                setSelectedPlaylist(playlist);
                setView('playlist');
              }}
              onBack={() => setView('search')}
            />
          )}

          {view === 'playlist' && selectedPlaylist && (
            <PlaylistView
              playlistId={selectedPlaylist.id}
              playlistTitle={selectedPlaylist.title}
              playlistCover={selectedPlaylist.cover}
              currentSongId={player.currentSong?.id ?? null}
              isPlaying={player.isPlaying}
              favorites={favoriteIds}
              onPlaySong={handlePlaySong}
              onToggleFavorite={handleFavoriteClick}
              onBack={() => setView(selectedChannelId ? 'channel' : 'search')}
            />
          )}

          {view === 'library' && (
            <LibraryView
              favoriteSongs={favoriteSongs}
              playlists={userPlaylists}
              currentSongId={player.currentSong?.id ?? null}
              isPlaying={player.isPlaying}
              onPlayPlaylist={handlePlayPlaylist}
              onOpenPlaylist={(playlistId) => {
                if (playlistId !== 'favorites' && !user) {
                  setLoginModalReason('playlist');
                  setShowLoginModal(true);
                  return;
                }
                setSelectedUserPlaylistId(playlistId);
                setView('my-playlist');
              }}
              onCreatePlaylist={handleCreatePlaylist}
            />
          )}

          {view === 'my-playlist' && selectedUserPlaylist && (
            <UserPlaylistView
              playlist={selectedUserPlaylist}
              isFavorites={selectedUserPlaylistId === 'favorites'}
              currentSongId={player.currentSong?.id ?? null}
              isPlaying={player.isPlaying}
              favoriteIds={favoriteIds}
              onPlaySong={handlePlaySong}
              onPlayAll={handlePlayPlaylist}
              onToggleFavorite={handleFavoriteClick}
              onAddSong={(song) => {
                if (authLoading) return;
                if (!user) {
                  setLoginModalReason('playlist');
                  setShowLoginModal(true);
                  return;
                }
                if (selectedUserPlaylistId && selectedUserPlaylistId !== 'favorites') {
                  addSongToPlaylist(selectedUserPlaylistId, song);
                }
              }}
              onRemoveSong={(songId) => {
                if (authLoading) return;
                if (!user) {
                  setLoginModalReason('playlist');
                  setShowLoginModal(true);
                  return;
                }
                if (selectedUserPlaylistId && selectedUserPlaylistId !== 'favorites') {
                  removeSongFromPlaylist(selectedUserPlaylistId, songId);
                }
              }}
              onRename={(newTitle) => {
                if (authLoading) return;
                if (!user) {
                  setLoginModalReason('playlist');
                  setShowLoginModal(true);
                  return;
                }
                if (selectedUserPlaylistId && selectedUserPlaylistId !== 'favorites') {
                  renamePlaylist(selectedUserPlaylistId, newTitle);
                }
              }}
              onDelete={() => {
                if (authLoading) return;
                if (!user) {
                  setLoginModalReason('playlist');
                  setShowLoginModal(true);
                  return;
                }
                if (selectedUserPlaylistId && selectedUserPlaylistId !== 'favorites') {
                  deletePlaylist(selectedUserPlaylistId);
                  setSelectedUserPlaylistId(null);
                  setView('library');
                }
              }}
              onBack={() => setView('library')}
            />
          )}
        </main>
      </div>

      <PlayerBar
        song={player.currentSong}
        isPlaying={player.isPlaying}
        currentTime={player.currentTime}
        duration={player.duration}
        volume={player.volume}
        shuffle={player.shuffle}
        repeat={player.repeat}
        isFavorite={player.currentSong ? isFavorite(player.currentSong.id) : false}
        onTogglePlay={player.togglePlay}
        onNext={() => player.playNext(false)}
        onPrev={player.playPrev}
        onSeek={player.seek}
        onVolumeChange={player.setVolume}
        onToggleShuffle={player.toggleShuffle}
        onCycleRepeat={player.cycleRepeat}
        onToggleFavorite={() => {
          if (player.currentSong) {
            handleFavoriteClick(player.currentSong);
          }
        }}
      />

      <nav className="md:hidden flex items-center justify-around bg-neutral-950 border-t border-neutral-800/50 py-2 z-50">
        {[
          { id: 'home' as View, label: 'Início', icon: HomeIcon },
          { id: 'search' as View, label: 'Buscar', icon: SearchIcon },
          { id: 'library' as View, label: 'Biblioteca', icon: Library },
        ].map((item) => {
          const Icon = item.icon;
          const active = view === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 transition-colors ${
                active ? 'text-white' : 'text-neutral-500'
              }`}
            >
              <Icon size={20} className={active ? 'text-emerald-400' : ''} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {showLoginModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
            className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="login-modal-title" className="text-lg font-semibold text-white">
                Entre no Pulse
              </h2>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setShowLoginModal(false)}
                className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-neutral-300">
              {loginModalReason === 'playlist'
                ? 'Para criar uma playlist, faça login.'
                : 'Para salvar músicas nos favoritos, faça login.'}
            </p>

            <button
              type="button"
              onClick={() => {
                setShowLoginModal(false);
                void signInWithGoogle();
              }}
              className="w-full rounded-full bg-emerald-500 px-4 py-3 font-semibold text-black hover:bg-emerald-400"
            >
              Fazer login com Google
            </button>

            <button
              type="button"
              onClick={() => setShowLoginModal(false)}
              className="mt-3 w-full rounded-full px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Agora não
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
