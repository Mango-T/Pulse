export type View = 'home' | 'search' | 'library' | 'channel' | 'playlist' | 'my-playlist';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

export type PlayerMode = 'video' | 'audio';

export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  cover: string;
  duration: number;
  melody: number[];
  bass: number[];
  tempo: number;
  waveform: OscillatorType;
  youtubeId?: string;
}

export interface Artist {
  id: string;
  name: string;
  photo: string;
  bio: string;
  monthlyListeners: string;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  cover: string;
  year: number;
  songIds: string[];
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  cover: string;
  songIds: string[];
}

export interface Channel {
  id: string;
  name: string;
  avatar: string;
  description: string;
  isLocal: boolean;
}

export interface YTPlaylist {
  id: string;
  title: string;
  cover: string;
  videoCount: string;
  channelName: string;
}

export interface UserPlaylist {
  id: string;
  title: string;
  songs: Song[];
  createdAt: number;
}
