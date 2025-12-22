import { Visualizer, VisualizerParams } from "./types";
import {
  ALBUM_RADIUS,
  MAX_BAR_LENGTH,
  BASS_THUMP_DURATION,
  BASS_THUMP_SCALE_MIN,
} from "../constants";

// Equalizer-style constants
const EQUALIZER_BAR_COUNT = 64; // Optimized count for smooth performance
const NUM_BUCKETS = 25;

// Interpolate between two values
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const equalizerBarsVisualizer: Visualizer = {
  name: "Equalizer Bars",
  description: "Smooth seamless equalizer-style circular frequency bars",
  draw: (params: VisualizerParams) => {
    const { ctx, canvas, bands, config, albumImage, lastRippleTrigger } = params;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Pre-calculate all amplitudes with interpolation for smooth transitions
    const amplitudes: number[] = [];
    for (let i = 0; i < EQUALIZER_BAR_COUNT; i++) {
      const bucketPos = (i / EQUALIZER_BAR_COUNT) * NUM_BUCKETS;
      const bucketIndex = Math.floor(bucketPos);
      const t = bucketPos - bucketIndex;
      
      const bucket1 = Math.min(bucketIndex, NUM_BUCKETS - 1);
      const bucket2 = Math.min(bucketIndex + 1, NUM_BUCKETS - 1);
      
      const amp1 = bands[`bucket${bucket1 + 1}`] || 0;
      const amp2 = bands[`bucket${bucket2 + 1}`] || 0;
      
      // Interpolate between adjacent buckets for smooth transitions
      const amplitude = lerp(amp1, amp2, t);
      amplitudes.push(Math.min(amplitude, MAX_BAR_LENGTH));
    }
    
    // Draw seamless frequency bars
    const angleStep = (Math.PI * 2) / EQUALIZER_BAR_COUNT;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    
    for (let i = 0; i < EQUALIZER_BAR_COUNT; i++) {
      const angle = (i / EQUALIZER_BAR_COUNT) * Math.PI * 2;
      const adjustedAngle = Math.PI / 4 + angle;
      const barLength = amplitudes[i];
      
      if (barLength <= 0) continue;
      
      const innerRadius = ALBUM_RADIUS;
      const outerRadius = ALBUM_RADIUS + barLength;
      
      // Calculate bar edges
      const angle1 = adjustedAngle - angleStep / 2;
      const angle2 = adjustedAngle + angleStep / 2;
      
      // Draw bar
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(angle1) * innerRadius,
        centerY + Math.sin(angle1) * innerRadius
      );
      ctx.lineTo(
        centerX + Math.cos(angle1) * outerRadius,
        centerY + Math.sin(angle1) * outerRadius
      );
      ctx.lineTo(
        centerX + Math.cos(angle2) * outerRadius,
        centerY + Math.sin(angle2) * outerRadius
      );
      ctx.lineTo(
        centerX + Math.cos(angle2) * innerRadius,
        centerY + Math.sin(angle2) * innerRadius
      );
      ctx.closePath();
      ctx.fill();
      
      // Mirror bar (opposite side)
      const mirrorAngle = adjustedAngle + Math.PI;
      const mirrorAngle1 = mirrorAngle - angleStep / 2;
      const mirrorAngle2 = mirrorAngle + angleStep / 2;
      
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(mirrorAngle1) * innerRadius,
        centerY + Math.sin(mirrorAngle1) * innerRadius
      );
      ctx.lineTo(
        centerX + Math.cos(mirrorAngle1) * outerRadius,
        centerY + Math.sin(mirrorAngle1) * outerRadius
      );
      ctx.lineTo(
        centerX + Math.cos(mirrorAngle2) * outerRadius,
        centerY + Math.sin(mirrorAngle2) * outerRadius
      );
      ctx.lineTo(
        centerX + Math.cos(mirrorAngle2) * innerRadius,
        centerY + Math.sin(mirrorAngle2) * innerRadius
      );
      ctx.closePath();
      ctx.fill();
    }

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

