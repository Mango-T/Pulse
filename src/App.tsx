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
import { AuthView } from '@/views/AuthView';
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

  const {
    user,
    loading: authLoading,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const player = usePlayer();

  const {
    favorites,
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
        setShowLoginModal(true);
        return;
      }

      toggleFavorite(song);
    },
    [authLoading, user, toggleFavorite],
  );

  const handleCreatePlaylist = useCallback(
    (...args: Parameters<typeof createPlaylist>) => {
      if (authLoading) return;

      if (!user) {
        setShowLoginModal(true);
        return;
      }

      return createPlaylist(...args);
    },
    [authLoading, user, createPlaylist],
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
              onToggleFavorite={toggleFavorite}
            />
          )}

          {view === 'search' && (
            <SearchView
              query={searchQuery}
              currentSongId={player.currentSong?.id ?? null}
              isPlaying={player.isPlaying}
              favorites={favoriteIds}
              onPlaySong={handlePlaySong}
              onToggleFavorite={toggleFavorite}
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
              onToggleFavorite={toggleFavorite}
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
              onToggleFavorite={toggleFavorite}
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
                setSelectedUserPlaylistId(playlistId);
                setView('my-playlist');
              }}
              onCreatePlaylist={(title) => {
                createPlaylist(title);
              }}
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
              onToggleFavorite={toggleFavorite}
              onAddSong={(song) => {
                if (selectedUserPlaylistId) addSongToPlaylist(selectedUserPlaylistId, song);
              }}
              onRemoveSong={(songId) => {
                if (selectedUserPlaylistId) removeSongFromPlaylist(selectedUserPlaylistId, songId);
              }}
              onRename={(newTitle) => {
                if (selectedUserPlaylistId) renamePlaylist(selectedUserPlaylistId, newTitle);
              }}
              onDelete={() => {
                if (selectedUserPlaylistId) {
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
          if (player.currentSong) toggleFavorite(player.currentSong);
        }}
      />

      {/* Mobile bottom nav */}
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
    </div>
  );
}

export default App;
