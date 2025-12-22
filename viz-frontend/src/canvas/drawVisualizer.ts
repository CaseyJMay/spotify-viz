import { Bands, Song, Config, Ripple, PianoParticle } from "../types";
import {
  FOOTER_HEIGHT,
  ART_SIZE,
  ART_X,
  ART_OFFSET_Y,
  PROGRESS_BAR_HEIGHT,
  PROGRESS_BAR_OFFSET_Y,
  ALBUM_RADIUS,
  RIPPLE_LIFETIME,
  RIPPLE_OPACITY,
  RIPPLE_LINE_WIDTH,
  PIANO_PARTICLE_LIFETIME,
} from "../constants";
import { drawRoundedRect, drawEllipsedText } from "../utils";
import { getVisualizer, DEFAULT_VISUALIZER } from "../visualizers";

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
  pianoParticles: PianoParticle[];
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
  pianoParticles,
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

  // Draw selected visualizer
  const visualizerId = config.visualizer || DEFAULT_VISUALIZER;
  const visualizer = getVisualizer(visualizerId);
  visualizer.draw({
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
    pianoParticles,
    menuVisible,
  });

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

  // Draw piano particles
  if (config.pianoParticles && pianoParticles.length > 0) {
    pianoParticles.forEach((particle) => {
      const elapsed = nowTime - particle.startTime;
      if (elapsed > PIANO_PARTICLE_LIFETIME) return;

      const t = elapsed / PIANO_PARTICLE_LIFETIME;
      const currentY = particle.y - particle.velocity * elapsed;
      const currentOpacity = particle.opacity * (1 - t);
      const currentSize = particle.size * (1 - t * 0.3); // Slight size fade

      // Soft, warm white/cream color for piano
      ctx.fillStyle = `rgba(255, 250, 240, ${currentOpacity})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(255, 250, 240, ${currentOpacity * 0.5})`;
      
      ctx.beginPath();
      ctx.arc(particle.x, currentY, currentSize, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

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

