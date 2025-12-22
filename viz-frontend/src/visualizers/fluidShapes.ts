import { Visualizer, VisualizerParams } from "./types";
import {
  ALBUM_RADIUS,
  BASS_THUMP_DURATION,
  BASS_THUMP_SCALE_MIN,
} from "../constants";

export const fluidShapesVisualizer: Visualizer = {
  name: "Fluid Shapes",
  description: "Organic flowing shapes that respond to music",
  draw: (params: VisualizerParams) => {
    const { ctx, canvas, bands, config, albumImage, lastRippleTrigger } = params;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw fluid shapes based on frequency bands
    const numShapes = 8;
    const baseRadius = 80;

    for (let i = 0; i < numShapes; i++) {
      const angle = (i / numShapes) * Math.PI * 2;
      const bucketKey = `bucket${Math.min(i + 1, 25)}`;
      const amplitude = bands[bucketKey] || 0;
      const radius = baseRadius + (amplitude / 100) * 150;
      const x = centerX + Math.cos(angle) * (radius * 0.3);
      const y = centerY + Math.sin(angle) * (radius * 0.3);

      // Create fluid blob shape
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + (amplitude / 100) * 0.25})`;
      ctx.shadowBlur = 20;
      ctx.shadowColor = `rgba(255, 255, 255, ${0.3 + (amplitude / 100) * 0.2})`;

      ctx.beginPath();
      // Create organic blob using multiple curves
      // Use amplitude-based variation for consistent shape
      const points = 12;
      for (let p = 0; p <= points; p++) {
        const pointAngle = (p / points) * Math.PI * 2;
        const variation = Math.sin(pointAngle * 2 + i) * 0.2 + 0.8;
        const pointRadius = radius * variation;
        const px = x + Math.cos(pointAngle) * pointRadius;
        const py = y + Math.sin(pointAngle) * pointRadius;
        if (p === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
    }

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

