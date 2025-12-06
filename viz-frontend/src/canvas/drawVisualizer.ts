import { Bands, Song, Config, Ripple } from "../types";
import {
  TOTAL_BARS,
  ALBUM_RADIUS,
  BAR_WIDTH,
  MAX_BAR_LENGTH,
  FOOTER_HEIGHT,
  ART_SIZE,
  ART_X,
  ART_OFFSET_Y,
  PROGRESS_BAR_HEIGHT,
  PROGRESS_BAR_OFFSET_Y,
  BASS_THUMP_DURATION,
  BASS_THUMP_SCALE_MIN,
  RIPPLE_LIFETIME,
  RIPPLE_OPACITY,
  RIPPLE_LINE_WIDTH,
} from "../constants";
import { drawRoundedRect, drawEllipsedText } from "../utils";

interface DrawVisualizerParams {
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
  menuVisible: boolean;
}

export function drawVisualizer({
  ctx,
  canvas,
  bands,
  song,
  config,
  gradientColors,
  transitionProgress,
  albumImage,
  ripples,
  lastRippleTrigger,
  menuVisible,
}: DrawVisualizerParams): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Draw background gradient
  const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (gradientColors.length < 2) {
    bgGradient.addColorStop(0, "#000");
    bgGradient.addColorStop(1, "#000");
  } else {
    gradientColors.forEach((color, index) => {
      bgGradient.addColorStop(index / (gradientColors.length - 1), color);
    });
  }
  ctx.globalAlpha = Math.min(transitionProgress, 1);
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  // Draw frequency bars
  const angles = Array.from({ length: TOTAL_BARS }, (_, i) => (i / TOTAL_BARS) * Math.PI * 2);
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
    ctx.drawImage(albumImage, -ALBUM_RADIUS, -ALBUM_RADIUS, ALBUM_RADIUS * 2, ALBUM_RADIUS * 2);
    ctx.restore();
  }

  // Draw ripples
  const nowTime = performance.now();
  const maxRippleRadius = Math.sqrt(centerX * centerX + centerY * centerY);
  ripples
    .filter((ripple) => {
      const elapsed = nowTime - ripple.startTime;
      return elapsed <= RIPPLE_LIFETIME;
    })
    .forEach((ripple) => {
      const elapsed = nowTime - ripple.startTime;
      const t = elapsed / RIPPLE_LIFETIME;
      const currentRadius = ALBUM_RADIUS + t * (maxRippleRadius - ALBUM_RADIUS);
      const opacity = RIPPLE_OPACITY * (1 - t);
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = RIPPLE_LINE_WIDTH;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
    });

  // Draw footer
  if (menuVisible) {
    drawFooter(ctx, canvas, song, albumImage);
  }
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  song: Song,
  albumImage: HTMLImageElement | null
): void {
  const footerY = canvas.height - FOOTER_HEIGHT;

  // Background fade
  const footerGradient = ctx.createLinearGradient(0, footerY, 0, canvas.height);
  footerGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  footerGradient.addColorStop(1, "rgba(0, 0, 0, 0.3)");
  ctx.fillStyle = footerGradient;
  ctx.fillRect(0, footerY, canvas.width, FOOTER_HEIGHT);

  ctx.save();

  // Album art
  const artY = footerY + (FOOTER_HEIGHT - ART_SIZE) / 2 + ART_OFFSET_Y;
  if (albumImage) {
    ctx.save();
    ctx.beginPath();
    const radius = 6;
    ctx.moveTo(ART_X + radius, artY);
    ctx.lineTo(ART_X + ART_SIZE - radius, artY);
    ctx.quadraticCurveTo(ART_X + ART_SIZE, artY, ART_X + ART_SIZE, artY + radius);
    ctx.lineTo(ART_X + ART_SIZE, artY + ART_SIZE - radius);
    ctx.quadraticCurveTo(ART_X + ART_SIZE, artY + ART_SIZE, ART_X + ART_SIZE - radius, artY + ART_SIZE);
    ctx.lineTo(ART_X + radius, artY + ART_SIZE);
    ctx.quadraticCurveTo(ART_X, artY + ART_SIZE, ART_X, artY + ART_SIZE - radius);
    ctx.lineTo(ART_X, artY + radius);
    ctx.quadraticCurveTo(ART_X, artY, ART_X + radius, artY);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(albumImage, ART_X, artY, ART_SIZE, ART_SIZE);
    ctx.restore();
  }

  // Song info
  const textX = ART_X + ART_SIZE + 20;
  const albumCenterY = artY + ART_SIZE / 2;
  const maxTextWidth = canvas.width - textX - 200;

  ctx.textAlign = "left";
  ctx.font = "600 16px 'Segoe UI', -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  drawEllipsedText(ctx, song.title, textX, albumCenterY - 8, maxTextWidth);

  ctx.font = "400 14px 'Segoe UI', -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  drawEllipsedText(ctx, song.artists, textX, albumCenterY + 16, maxTextWidth);

  // Progress bar
  const progressBarY = footerY + FOOTER_HEIGHT - PROGRESS_BAR_OFFSET_Y;
  const progressBarX = textX;
  const progressBarWidth = canvas.width - progressBarX - 24;
  const elapsedWidth = progressBarWidth * song.progress;

  if (elapsedWidth > 0) {
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, progressBarX, progressBarY, elapsedWidth, PROGRESS_BAR_HEIGHT, 1.5);
  }

  ctx.restore();
}

