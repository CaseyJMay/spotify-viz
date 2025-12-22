import { Visualizer, VisualizerParams } from "./types";
import {
  TOTAL_BARS,
  ALBUM_RADIUS,
  BAR_WIDTH,
  MAX_BAR_LENGTH,
  BASS_THUMP_DURATION,
  BASS_THUMP_SCALE_MIN,
} from "../constants";

export const radialBarsVisualizer: Visualizer = {
  name: "Radial Bars",
  description: "Classic circular frequency bars radiating from the center",
  draw: (params: VisualizerParams) => {
    const { ctx, canvas, bands, config, albumImage, lastRippleTrigger } = params;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw frequency bars
    const angles = Array.from(
      { length: TOTAL_BARS },
      (_, i) => (i / TOTAL_BARS) * Math.PI * 2
    );
    angles.forEach((angle) => {
      const adjustedAngle = Math.PI / 4 + angle;
      const bucketKey = `bucket${Math.floor(angle / (Math.PI * 2 / TOTAL_BARS)) + 1}`;
      const amplitude = bands[bucketKey] || 0;
      const barLength = Math.min(amplitude, MAX_BAR_LENGTH);
      const xStart = centerX + Math.cos(adjustedAngle) * ALBUM_RADIUS;
      const yStart = centerY + Math.sin(adjustedAngle) * ALBUM_RADIUS;
      const xEnd = centerX + Math.cos(adjustedAngle) * (ALBUM_RADIUS + barLength);
      const yEnd = centerY + Math.sin(adjustedAngle) * (ALBUM_RADIUS + barLength);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = BAR_WIDTH;
      ctx.lineCap = "round";
      ctx.shadowBlur = 5;
      ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.moveTo(xStart, yStart);
      ctx.lineTo(xEnd, yEnd);
      ctx.stroke();
      ctx.closePath();

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
      ctx.closePath();
    });

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

