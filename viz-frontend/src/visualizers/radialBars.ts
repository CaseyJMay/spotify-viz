import { Visualizer, VisualizerParams } from "./types";
import {
  TOTAL_BARS,
  ALBUM_RADIUS,
  BAR_WIDTH,
  MAX_BAR_LENGTH,
  BASS_THUMP_DURATION,
  BASS_THUMP_SCALE_MIN,
} from "../constants";

// Store smoothed amplitudes for each bar (persists across frames)
const smoothedAmplitudes = new Map<number, number>();

// Interpolate between two values
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Smooth amplitude using exponential moving average
function smoothAmplitude(key: number, newValue: number, smoothingFactor: number = 0.3): number {
  const previous = smoothedAmplitudes.get(key) || 0;
  const smoothed = previous + (newValue - previous) * smoothingFactor;
  smoothedAmplitudes.set(key, smoothed);
  return smoothed;
}

// Minimum bar length to ensure there's always a small line visible
const MIN_BAR_LENGTH = 3;

export const radialBarsVisualizer: Visualizer = {
  name: "Radial Bars",
  description: "Classic circular frequency bars radiating from the center",
  draw: (params: VisualizerParams) => {
    const { ctx, canvas, bands, config, albumImage, lastRippleTrigger } = params;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw frequency bars with interpolated bars for smoother look
    const numBars = TOTAL_BARS * 2; // Double the bars with interpolation
    const angles = Array.from(
      { length: numBars },
      (_, i) => (i / numBars) * Math.PI * 2
    );
    
    // Reduced shadow for cleaner look
    ctx.shadowBlur = 3;
    ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
    
    angles.forEach((angle, index) => {
      const adjustedAngle = Math.PI / 4 + angle;
      
      // Map to frequency buckets with interpolation
      const bucketPos = (index / numBars) * TOTAL_BARS;
      const bucketIndex = Math.floor(bucketPos);
      const t = bucketPos - bucketIndex;
      
      const bucket1 = Math.min(bucketIndex, TOTAL_BARS - 1);
      const bucket2 = Math.min(bucketIndex + 1, TOTAL_BARS - 1);
      
      const amp1 = bands[`bucket${bucket1 + 1}`] || 0;
      const amp2 = bands[`bucket${bucket2 + 1}`] || 0;
      
      // Interpolate between adjacent buckets
      const rawAmplitude = lerp(amp1, amp2, t);
      
      // Apply smoothing to reduce jarring transitions (reduced smoothing)
      const smoothedAmplitude = smoothAmplitude(index, rawAmplitude, 0.55);
      
      // Scale down max bar length proportionally (reduce by 25%)
      const scaledMaxLength = MAX_BAR_LENGTH * 0.75;
      
      // Ensure minimum bar length so there's always a small line visible
      const barLength = Math.max(MIN_BAR_LENGTH, Math.min(smoothedAmplitude, scaledMaxLength));
      
      // Slightly thinner bars with better spacing
      const xStart = centerX + Math.cos(adjustedAngle) * ALBUM_RADIUS;
      const yStart = centerY + Math.sin(adjustedAngle) * ALBUM_RADIUS;
      const xEnd = centerX + Math.cos(adjustedAngle) * (ALBUM_RADIUS + barLength);
      const yEnd = centerY + Math.sin(adjustedAngle) * (ALBUM_RADIUS + barLength);

      // Cleaner, more refined styling - straight edges for crisp look
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = BAR_WIDTH * 0.75; // Thinner for smoother look
      ctx.lineCap = "butt"; // Straight edges instead of rounded
      ctx.beginPath();
      ctx.moveTo(xStart, yStart);
      ctx.lineTo(xEnd, yEnd);
      ctx.stroke();

      // Mirror bar
      const mirrorAngle = adjustedAngle + Math.PI;
      const xStartMirror = centerX + Math.cos(mirrorAngle) * ALBUM_RADIUS;
      const yStartMirror = centerY + Math.sin(mirrorAngle) * ALBUM_RADIUS;
      const xEndMirror = centerX + Math.cos(mirrorAngle) * (ALBUM_RADIUS + barLength);
      const yEndMirror = centerY + Math.sin(mirrorAngle) * (ALBUM_RADIUS + barLength);
      ctx.beginPath();
      ctx.moveTo(xStartMirror, yStartMirror);
      ctx.lineTo(xEndMirror, yEndMirror);
      ctx.stroke();
    });
    
    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw album cover with bass thump effect
    if (albumImage) {
      let scale = 1;
      if (config.bassThump) {
        const nowTime = performance.now();
        const bassDelta = nowTime - lastRippleTrigger;
        if (bassDelta < BASS_THUMP_DURATION) {
          const half = BASS_THUMP_DURATION / 2;
          scale =
            bassDelta < half
              ? 1 - 0.05 * (bassDelta / half)
              : BASS_THUMP_SCALE_MIN + 0.1 * ((bassDelta - half) / half);
        }
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, ALBUM_RADIUS, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.drawImage(
        albumImage,
        -ALBUM_RADIUS,
        -ALBUM_RADIUS,
        ALBUM_RADIUS * 2,
        ALBUM_RADIUS * 2
      );
      ctx.restore();
    }
  },
};

