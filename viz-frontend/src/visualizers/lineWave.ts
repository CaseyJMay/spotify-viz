import { Visualizer, VisualizerParams } from "./types";
import {
  ALBUM_RADIUS,
  BASS_THUMP_DURATION,
  BASS_THUMP_SCALE_MIN,
} from "../constants";

export const lineWaveVisualizer: Visualizer = {
  name: "Line Wave",
  description: "Smooth waveform line visualization",
  draw: (params: VisualizerParams) => {
    const { ctx, canvas, bands, config, albumImage, lastRippleTrigger } = params;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const width = canvas.width;
    const height = canvas.height;

    // Draw waveform line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(255, 255, 255, 0.5)";

    // Create waveform from frequency bands
    const numPoints = 200;
    const waveHeight = height * 0.3;
    const centerYPos = centerY;

    ctx.beginPath();
    for (let i = 0; i <= numPoints; i++) {
      const x = (i / numPoints) * width;
      // Map frequency bands to waveform
      const bandIndex = Math.floor((i / numPoints) * 25); // 25 frequency bands
      const bucketKey = `bucket${Math.min(bandIndex + 1, 25)}`;
      const amplitude = bands[bucketKey] || 0;
      const y = centerYPos + (amplitude / 100) * waveHeight * Math.sin((i / numPoints) * Math.PI * 4);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

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

