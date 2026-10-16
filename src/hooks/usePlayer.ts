import { useCallback, useEffect, useRef, useState } from 'react';
import type { Song } from '@/types';
import { audioEngine } from '@/lib/audioEngine';
import { youtubePlayer } from '@/lib/youtubePlayer';

type Source = 'local' | 'youtube';

export function usePlayer() {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('off');
  const [ytError, setYtError] = useState<string | null>(null);

  const sourceRef = useRef<Source>('local');
  const repeatRef = useRef(repeat);
  repeatRef.current = repeat;
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const indexRef = useRef(currentIndex);
  indexRef.current = currentIndex;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const advanceGuardRef = useRef(false);

  const getSource = useCallback((song: Song): Source => {
    return song.youtubeId ? 'youtube' : 'local';
  }, []);

  const stopCurrentSource = useCallback(() => {
    if (sourceRef.current === 'local') {
      audioEngine.pause();
    } else {
      youtubePlayer.pause();
    }
  }, []);

  const startSong = useCallback(
    (song: Song, source: Source) => {
      if (source === 'local') {
        youtubePlayer.pause();
        sourceRef.current = 'local';
        audioEngine.play(song, 0);
      } else {
        audioEngine.pause();
        sourceRef.current = 'youtube';
        setYtError(null);
        youtubePlayer.loadAndPlay(song);
      }
    },
    [],
  );

  const advanceToNext = useCallback(
    (auto: boolean) => {
      const q = queueRef.current;
      if (q.length === 0) return;

      const isShuffle = shuffleRef.current;
      let nextIdx: number;

      if (isShuffle) {
        if (q.length === 1) {
          nextIdx = indexRef.current;
        } else {
          do {
            nextIdx = Math.floor(Math.random() * q.length);
          } while (nextIdx === indexRef.current);
        }
      } else {
        nextIdx = indexRef.current + 1;
        if (nextIdx >= q.length) {
          if (repeatRef.current === 'all' || !auto) {
            nextIdx = 0;
          } else {
            stopCurrentSource();
            setIsPlaying(false);
            return;
          }
        }
      }

      const nextSong = q[nextIdx];
      if (!nextSong) return;

      stopCurrentSource();
      setCurrentIndex(nextIdx);
      setCurrentSong(nextSong);
      setCurrentTime(0);
      setDuration(nextSong.youtubeId ? 0 : nextSong.duration);
      startSong(nextSong, getSource(nextSong));
    },
    [getSource, startSong, stopCurrentSource],
  );

  // Setup callbacks once — these are the single source of truth for state
  useEffect(() => {
    audioEngine.onTimeUpdate = (time, dur) => {
      if (sourceRef.current !== 'local') return;
      setCurrentTime(time);
      setDuration(dur);
    };
    audioEngine.onPlayStateChange = (playing) => {
      if (sourceRef.current !== 'local') return;
      setIsPlaying(playing);
    };
    audioEngine.onEnded = () => {
      if (sourceRef.current !== 'local') return;
      if (advanceGuardRef.current) return;
      advanceGuardRef.current = true;
      setTimeout(() => { advanceGuardRef.current = false; }, 500);
      if (repeatRef.current === 'one') {
        const song = queueRef.current[indexRef.current];
        if (song) startSong(song, getSource(song));
        return;
      }
      advanceToNext(true);
    };

    youtubePlayer.onTimeUpdate = (time, dur) => {
      if (sourceRef.current !== 'youtube') return;
      const safeTime = isFinite(time) && time >= 0 ? time : 0;
      const safeDur = isFinite(dur) && dur > 0 ? dur : 0;
      setCurrentTime(safeTime);
      if (safeDur > 0) setDuration(safeDur);
    };
    youtubePlayer.onPlayStateChange = (playing) => {
      if (sourceRef.current !== 'youtube') return;
      setIsPlaying(playing);
    };
    youtubePlayer.onEnded = () => {
      if (sourceRef.current !== 'youtube') return;
      if (advanceGuardRef.current) return;
      advanceGuardRef.current = true;
      setTimeout(() => { advanceGuardRef.current = false; }, 500);
      if (repeatRef.current === 'one') {
        const song = queueRef.current[indexRef.current];
        if (song) startSong(song, getSource(song));
        return;
      }
      advanceToNext(true);
    };
    youtubePlayer.onError = (msg) => {
      if (sourceRef.current !== 'youtube') return;
      setIsPlaying(false);
      setYtError(msg);
    };
    youtubePlayer.onReady = () => {
      youtubePlayer.setVolume(volumeRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playSong = useCallback(
    (song: Song, newQueue?: Song[]) => {
      if (newQueue) {
        const idx = newQueue.findIndex((s) => s.id === song.id);
        setQueue(newQueue);
        setCurrentIndex(idx >= 0 ? idx : 0);
      } else {
        const idx = queueRef.current.findIndex((s) => s.id === song.id);
        if (idx >= 0) {
          setCurrentIndex(idx);
        } else {
          setQueue([song]);
          setCurrentIndex(0);
        }
      }
      const source = getSource(song);
      stopCurrentSource();
      setCurrentSong(song);
      setCurrentTime(0);
      setDuration(song.youtubeId ? 0 : song.duration);
      startSong(song, source);
    },
    [getSource, startSong, stopCurrentSource],
  );

  const togglePlay = useCallback(() => {
    if (!currentSong) return;
    if (sourceRef.current === 'youtube') {
      if (isPlaying) youtubePlayer.pause();
      else youtubePlayer.play();
    } else {
      if (isPlaying) audioEngine.pause();
      else audioEngine.resume();
    }
  }, [currentSong, isPlaying]);

  const playNext = useCallback(
    (auto = false) => {
      advanceToNext(auto);
    },
    [advanceToNext],
  );

  const playPrev = useCallback(() => {
    const q = queueRef.current;
    if (q.length === 0) return;

    const elapsed =
      sourceRef.current === 'youtube'
        ? youtubePlayer.getCurrentTime()
        : audioEngine.getCurrentTime();

    if (elapsed > 3) {
      if (sourceRef.current === 'youtube') {
        youtubePlayer.seek(0);
      } else {
        audioEngine.seek(0);
      }
      setCurrentTime(0);
      return;
    }

    let prevIdx = indexRef.current - 1;
    if (prevIdx < 0) prevIdx = q.length - 1;

    const prevSong = q[prevIdx];
    if (!prevSong) return;

    stopCurrentSource();
    setCurrentIndex(prevIdx);
    setCurrentSong(prevSong);
    setCurrentTime(0);
    setDuration(prevSong.youtubeId ? 0 : prevSong.duration);
    startSong(prevSong, getSource(prevSong));
  }, [getSource, startSong, stopCurrentSource]);

  const seek = useCallback((time: number) => {
    const safeTime = Math.max(0, isFinite(time) ? time : 0);
    setCurrentTime(safeTime);
    if (sourceRef.current === 'youtube') {
      youtubePlayer.seek(safeTime);
    } else {
      audioEngine.seek(safeTime);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const safeVol = Math.max(0, Math.min(1, vol));
    setVolumeState(safeVol);
    volumeRef.current = safeVol;
    audioEngine.setVolume(safeVol);
    youtubePlayer.setVolume(safeVol);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => !s);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => {
      if (r === 'off') return 'all';
      if (r === 'all') return 'one';
      return 'off';
    });
  }, []);

  return {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    currentIndex,
    shuffle,
    repeat,
    ytError,
    playSong,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
  };
}
