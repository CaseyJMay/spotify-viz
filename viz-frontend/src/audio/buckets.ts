import { Bands } from "../types";

// 25 logarithmic frequency buckets (Hz). Ported from spotify-viz.py so the
// browser-side FFT produces the same band layout the visualizers expect.
export const BUCKET_RANGES: ReadonlyArray<readonly [number, number]> = [
  [20, 40], [40, 60], [60, 90], [90, 120], [120, 160],
  [160, 200], [200, 250], [250, 315], [315, 400], [400, 500],
  [500, 630], [630, 800], [800, 1000], [1000, 1250], [1250, 1600],
  [1600, 2000], [2000, 2500], [2500, 3150], [3150, 4000], [4000, 5000],
  [5000, 6300], [6300, 8000], [8000, 10000], [10000, 12500], [12500, 20000],
];

// Per-bucket gain that compensates for the natural rolloff of high frequencies.
export const BUCKET_MULTIPLIERS: ReadonlyArray<number> = [
  1.0, 1.0, 1.2, 1.2, 1.5, 1.5, 1.5, 1.8, 1.8, 2.0,
  2.0, 2.2, 2.2, 2.5, 2.5, 2.8, 3.0, 3.0, 3.5, 4.0,
  4.5, 5.0, 5.5, 6.0, 6.5,
];

export const BUCKET_COUNT = BUCKET_RANGES.length;

// Single tuning knob. The old numpy path emitted linear FFT magnitudes that the
// visualizers expect in roughly the 0-120 range (bass hits ~100). AnalyserNode
// gives normalized amplitude (0..1), so we scale it back up. Raise for punchier
// visuals, lower if Line Wave/bars clip. Tune with audio playing.
const LINEAR_GAIN = 1000;

// Below this dB the bin is treated as silence (avoids 10^(huge negative)).
const SILENCE_FLOOR_DB = -90;

/**
 * Map an AnalyserNode dB spectrum into the 25 visualizer buckets, converting to
 * linear magnitude so the dynamic range matches the original numpy pipeline.
 * `freqData` is getFloatFrequencyData output in dB (length = fftSize / 2).
 */
export function computeBands(
  freqData: Float32Array,
  sampleRate: number,
  fftSize: number
): Bands {
  const binWidth = sampleRate / fftSize;
  const bands: Bands = {};

  for (let i = 0; i < BUCKET_COUNT; i++) {
    const [low, high] = BUCKET_RANGES[i];
    const startBin = Math.max(0, Math.floor(low / binWidth));
    const endBin = Math.min(freqData.length - 1, Math.ceil(high / binWidth));

    let sum = 0;
    let count = 0;
    for (let bin = startBin; bin <= endBin; bin++) {
      const db = freqData[bin];
      sum += db > SILENCE_FLOOR_DB ? Math.pow(10, db / 20) : 0;
      count++;
    }

    const mean = count > 0 ? sum / count : 0;
    bands[`bucket${i + 1}`] = mean * BUCKET_MULTIPLIERS[i] * LINEAR_GAIN;
  }

  return bands;
}
