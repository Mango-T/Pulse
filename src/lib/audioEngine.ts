import type { Song } from '@/types';

type Callback = () => void;
type TimeCallback = (currentTime: number, duration: number) => void;
type PlayStateCallback = (isPlaying: boolean) => void;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  private timeTimer: ReturnType<typeof setInterval> | null = null;

  private currentSong: Song | null = null;
  private isPlaying = false;
  private volume = 0.7;
  private elapsed = 0;
  private lastTickTime = 0;

  private melodyIndex = 0;
  private bassIndex = 0;
  private nextMelodyTime = 0;
  private nextBassTime = 0;

  onTimeUpdate: TimeCallback | null = null;
  onEnded: Callback | null = null;
  onPlayStateChange: PlayStateCallback | null = null;

  private ensureContext(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  load(song: Song): void {
    this.currentSong = song;
    this.elapsed = 0;
    this.melodyIndex = 0;
    this.bassIndex = 0;
  }

  play(song: Song, offset = 0): void {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    this.stopOscillators();
    this.currentSong = song;
    this.elapsed = offset;
    this.isPlaying = true;

    const now = this.ctx.currentTime;
    this.nextMelodyTime = now;
    this.nextBassTime = now;
    this.melodyIndex = Math.floor(offset / song.tempo) % song.melody.length;
    this.bassIndex = Math.floor(offset / (song.tempo * 2)) % song.bass.length;
    this.lastTickTime = now;

    this.runScheduler();
    this.startTimeTracking();
    this.onPlayStateChange?.(true);
  }

  resume(): void {
    if (!this.currentSong || this.isPlaying) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.isPlaying = true;
    const now = this.ctx.currentTime;
    this.nextMelodyTime = now;
    this.nextBassTime = now;
    this.lastTickTime = now;

    this.runScheduler();
    this.startTimeTracking();
    this.onPlayStateChange?.(true);
  }

  pause(): void {
    this.isPlaying = false;
    this.stopOscillators();
    this.clearScheduler();
    this.stopTimeTracking();
    this.onPlayStateChange?.(false);
  }

  stop(): void {
    this.pause();
    this.elapsed = 0;
    this.melodyIndex = 0;
    this.bassIndex = 0;
  }

  seek(time: number): void {
    if (!this.currentSong) return;
    const wasPlaying = this.isPlaying;
    this.stopOscillators();
    this.clearScheduler();
    this.elapsed = Math.max(0, Math.min(time, this.currentSong.duration));

    if (wasPlaying) {
      this.isPlaying = false;
      this.resume();
    } else {
      this.onTimeUpdate?.(this.elapsed, this.currentSong.duration);
    }
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  getCurrentTime(): number {
    return this.elapsed;
  }

  getCurrentSong(): Song | null {
    return this.currentSong;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private runScheduler = (): void => {
    if (!this.ctx || !this.currentSong || !this.isPlaying) return;

    const song = this.currentSong;
    const lookahead = 0.12;

    while (this.nextMelodyTime < this.ctx.currentTime + lookahead) {
      this.scheduleNote(
        song.melody[this.melodyIndex % song.melody.length],
        this.nextMelodyTime,
        song.tempo * 0.9,
        song.waveform,
        0.18,
      );
      this.melodyIndex++;
      this.nextMelodyTime += song.tempo;
    }

    const bassDuration = song.tempo * 2;
    while (this.nextBassTime < this.ctx.currentTime + lookahead) {
      this.scheduleNote(
        song.bass[this.bassIndex % song.bass.length],
        this.nextBassTime,
        bassDuration * 0.9,
        'sine',
        0.12,
      );
      this.bassIndex++;
      this.nextBassTime += bassDuration;
    }

    this.schedulerTimer = setTimeout(this.runScheduler, 25);
  };

  private scheduleNote(
    freq: number,
    time: number,
    duration: number,
    type: OscillatorType,
    peakGain: number,
  ): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private stopOscillators(): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.05);
    }
  }

  private startTimeTracking(): void {
    this.stopTimeTracking();
    this.timeTimer = setInterval(() => {
      if (!this.ctx || !this.isPlaying || !this.currentSong) return;

      const now = this.ctx.currentTime;
      const delta = now - this.lastTickTime;
      this.lastTickTime = now;
      this.elapsed += delta;

      if (this.elapsed >= this.currentSong.duration) {
        this.elapsed = this.currentSong.duration;
        this.onTimeUpdate?.(this.elapsed, this.currentSong.duration);
        this.onEnded?.();
      } else {
        this.onTimeUpdate?.(this.elapsed, this.currentSong.duration);
      }
    }, 200);
  }

  private stopTimeTracking(): void {
    if (this.timeTimer) {
      clearInterval(this.timeTimer);
      this.timeTimer = null;
    }
  }

  private clearScheduler(): void {
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }
}

export const audioEngine = new AudioEngine();
