import { Visualizer, VisualizerParams } from "./types";
import {
  ALBUM_RADIUS,
  MAX_BAR_LENGTH,
  BASS_THUMP_DURATION,
  BASS_THUMP_SCALE_MIN,
} from "../constants";

// Smoothing constants
const SMOOTH_POINTS = 128; // High resolution for smooth blob
const NUM_BUCKETS = 25;
const SMOOTHING_RADIUS = 4; // Moderate smoothing to preserve frequency character
const SMOOTHING_PASSES = 1; // Single pass to maintain peaks

// Interpolate between two values
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Apply Gaussian-weighted smoothing to an array
function smoothArray(values: number[], radius: number): number[] {
  const smoothed: number[] = [];
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let weightSum = 0;
    for (let j = -radius; j <= radius; j++) {
      const idx = (i + j + values.length) % values.length; // Wrap around
      // Gaussian weight (heavier weight for closer points)
      const distance = Math.abs(j);
      const weight = Math.exp(-(distance * distance) / (2 * (radius / 2) * (radius / 2)));
      sum += values[idx] * weight;
      weightSum += weight;
    }
    smoothed.push(sum / weightSum);
  }
  return smoothed;
}

// Apply multiple passes of smoothing
function multiPassSmooth(values: number[], radius: number, passes: number): number[] {
  let smoothed = [...values];
  for (let i = 0; i < passes; i++) {
    smoothed = smoothArray(smoothed, radius);
  }
  return smoothed;
}

export const fluidShapesVisualizer: Visualizer = {
  name: "Fluid Shapes",
  description: "Smooth morphing blob ring that follows the music",
  draw: (params: VisualizerParams) => {
    const { ctx, canvas, bands, config, albumImage, lastRippleTrigger } = params;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Step 1: Get interpolated frequency data for HALF the circle (like radial bars)
    const halfPoints = SMOOTH_POINTS / 2;
    const rawAmplitudes: number[] = [];
    for (let i = 0; i < halfPoints; i++) {
      const bucketPos = (i / halfPoints) * NUM_BUCKETS;
      const bucketIndex = Math.floor(bucketPos);
      const t = bucketPos - bucketIndex;
      
      const bucket1 = Math.min(bucketIndex, NUM_BUCKETS - 1);
      const bucket2 = Math.min(bucketIndex + 1, NUM_BUCKETS - 1);
      
      const amp1 = bands[`bucket${bucket1 + 1}`] || 0;
      const amp2 = bands[`bucket${bucket2 + 1}`] || 0;
      
      const amplitude = lerp(amp1, amp2, t);
      rawAmplitudes.push(Math.min(amplitude, MAX_BAR_LENGTH));
    }

    // Step 2: Apply multiple passes of aggressive smoothing
    const smoothedHalf = multiPassSmooth(rawAmplitudes, SMOOTHING_RADIUS, SMOOTHING_PASSES);
    
    // Step 3: Mirror to create full circle (diagonal repetition pattern)
    const fullAmplitudes = [...smoothedHalf, ...smoothedHalf];

    // Step 4: Draw smooth closed blob path using Catmull-Rom-like smooth curves
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(255, 255, 255, 0.4)";

    ctx.beginPath();
    const points: Array<{ x: number; y: number }> = [];
    
    // First pass: calculate all points
    for (let i = 0; i <= SMOOTH_POINTS; i++) {
      const angle = (i / SMOOTH_POINTS) * Math.PI * 2;
      const adjustedAngle = Math.PI / 4 + angle;
      const amplitude = fullAmplitudes[i % fullAmplitudes.length];
      
      const radius = ALBUM_RADIUS + amplitude;
      const x = centerX + Math.cos(adjustedAngle) * radius;
      const y = centerY + Math.sin(adjustedAngle) * radius;
      points.push({ x, y });
    }
    
    // Second pass: draw with smooth curves using bezier curves
    if (points.length > 0) {
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        const p0 = points[(i - 1 + points.length) % points.length];
        const p1 = points[i % points.length];
        const p2 = points[(i + 1) % points.length];
        
        // Calculate control points for smooth bezier curve
        const cp1x = p0.x + (p1.x - p0.x) * 0.5;
        const cp1y = p0.y + (p1.y - p0.y) * 0.5;
        const cp2x = p1.x - (p2.x - p1.x) * 0.5;
        const cp2y = p1.y - (p2.y - p1.y) * 0.5;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.x, p1.y);
      }
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
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

