export interface Song {
  title: string;
  artists: string;
  album_cover: string;
  progress: number;
  is_playing: boolean;
  artist_icon?: string;
  genres?: string[];
}

export interface Bands {
  [key: string]: number;
}

export interface WebSocketData {
  song: Song;
  bands: Bands;
}

export interface Ripple {
  startTime: number;
}

export interface PianoParticle {
  startTime: number;
  x: number;
  y: number;
  velocity: number;
  size: number;
  opacity: number;
}

export interface Config {
  ripples: boolean;
  bassThump: boolean;
  pianoParticles: boolean;
}

