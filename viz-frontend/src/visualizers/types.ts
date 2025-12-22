import { Bands, Song, Config, Ripple, PianoParticle } from "../types";

export interface VisualizerParams {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  bands: Bands;
  song: Song;
  config: Config;
  gradientColors: string[];
  transitionProgress: number;
  albumImage: HTMLImageElement | null;
  ripples: Ripple[];
  lastRippleTrigger: number;
  pianoParticles: PianoParticle[];
  menuVisible: boolean;
}

export interface Visualizer {
  name: string;
  description: string;
  draw: (params: VisualizerParams) => void;
}

