import { Visualizer } from "./types";
import { radialBarsVisualizer } from "./radialBars";
import { equalizerBarsVisualizer } from "./equalizerBars";
import { lineWaveVisualizer } from "./lineWave";
import { fluidShapesVisualizer } from "./fluidShapes";

export const VISUALIZERS: Record<string, Visualizer> = {
  radialBars: radialBarsVisualizer,
  equalizerBars: equalizerBarsVisualizer,
  lineWave: lineWaveVisualizer,
  fluidShapes: fluidShapesVisualizer,
};

export const DEFAULT_VISUALIZER = "fluidShapes";

export function getVisualizer(id: string): Visualizer {
  return VISUALIZERS[id] || VISUALIZERS[DEFAULT_VISUALIZER];
}

export function getVisualizerList(): Visualizer[] {
  return Object.values(VISUALIZERS);
}

export * from "./types";

