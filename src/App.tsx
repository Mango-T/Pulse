import { useMemo, useState } from 'react';
import { Home as HomeIcon, Search as SearchIcon, Library, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { View, Song, PlayerMode, UserProfile } from '@/types';
import { songs, playlists, artists, albums, getSongsByIds } from '@/data/mockData';
import { usePlayer } from '@/hooks/usePlayer';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { PlayerBar } from '@/components/PlayerBar';
import { YouTubePlayerView } from '@/components/YouTubePlayerView';
import { HomeView } from '@/views/HomeView';
import { SearchView } from '@/views/SearchView';
import { LibraryView } from '@/views/LibraryView';
import { AuthView } from '@/views/AuthView';

function userToProfile(u: User): UserProfile {
  return {
    id: u.id,
    name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'Usuário',
    email: u.email ?? '',
    avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture || '',
  };
}

function App() {
  const [view, setView] = useState<View>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [playerMode, setPlayerMode] = useState<PlayerMode>('video');

  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const player = usePlayer();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  const profile: UserProfile | null = user ? userToProfile(user) : null;

  const favoriteSongs = useMemo(
    () => getSongsByIds([...favorites]),
    [favorites],
  );

  const handlePlaySong = (song: Song, queue?: Song[]) => {
    player.playSong(song, queue);
  };

  const handlePlayPlaylist = (playlistSongs: Song[]) => {
    if (playlistSongs.length > 0) {
      player.playSong(playlistSongs[0], playlistSongs);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
        <Loader2 size={32} className="animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <AuthView onSignInWithGoogle={signInWithGoogle} loading={authLoading} />
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-black overflow-hidden text-white select-none">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={view}
          onNavigate={setView}
          favoriteCount={favorites.size}
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
            onSignINWithGoogle={signInWithGoogle}
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
              favorites={favorites}
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
              favorites={favorites}
              onPlaySong={handlePlaySong}
              onToggleFavorite={toggleFavorite}
            />
          )}

          {view === 'library' && (
            <LibraryView
              favoriteSongs={favoriteSongs}
              currentSongId={player.currentSong?.id ?? null}
              isPlaying={player.isPlaying}
              onPlaySong={handlePlaySong}
              onToggleFavorite={toggleFavorite}
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
          if (player.currentSong) toggleFavorite(player.currentSong.id);
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
