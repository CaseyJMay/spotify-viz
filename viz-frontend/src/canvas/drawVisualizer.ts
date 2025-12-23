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

  // Draw ripples with controlled distortion
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
      const baseRadius = ALBUM_RADIUS + t * (maxRippleRadius - ALBUM_RADIUS);
      const opacity = RIPPLE_OPACITY * (1 - t);
      
      // Use ripple startTime as seed for consistent distortion per ripple
      const seed = ripple.startTime;
      const distortionAmount = 5 * (1 - t * 0.5); // Reduced distortion, less as ripple expands
      const waveFrequency = 8; // Lower frequency for smoother waves
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = RIPPLE_LINE_WIDTH;
      ctx.beginPath();
      
      // Draw wavy circle with smooth curves
      const numPoints = 128; // More points for smoother curves
      const points: Array<{ x: number; y: number }> = [];
      
      // Calculate all points first
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        
        // Add smoother wave distortion using sine waves with lower frequencies
        const wave1 = Math.sin(angle * waveFrequency + seed * 0.001) * distortionAmount;
        const wave2 = Math.sin(angle * (waveFrequency * 1.5) + seed * 0.0015) * (distortionAmount * 0.5);
        const wave3 = Math.sin(angle * (waveFrequency * 2.1) + seed * 0.0008) * (distortionAmount * 0.3);
        
        // Combine waves for organic distortion
        const radius = baseRadius + wave1 + wave2 + wave3;
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        points.push({ x, y });
      }
      
      // Draw with smooth bezier curves
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

  // No background gradient - clean, minimal look

  ctx.save();

  // Progress bar position - at bottom of footer
  const progressBarY = footerY + FOOTER_HEIGHT - PROGRESS_BAR_OFFSET_Y;
  
  // Album art - bottom edge aligned with progress bar center, moved down 5px
  const artY = progressBarY - ART_SIZE + 5; // Bottom of art aligns with progress bar, moved down 5px
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

  // Song info - positioned above progress bar, aligned with album art
  const textX = ART_X + ART_SIZE + 20;
  const maxTextWidth = canvas.width - textX - 200;
  
  // Position text above progress bar
  const textBaseY = progressBarY - 14; // 14px above progress bar
  
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  
  // Title - larger, positioned above artist
  ctx.font = "700 21px 'Segoe UI', -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  const titleY = textBaseY - 26; // More spacing between title and artist
  drawEllipsedText(ctx, song.title, textX, titleY, maxTextWidth);

  // Artist - larger, positioned between title and progress bar
  ctx.font = "400 17px 'Segoe UI', -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  const artistY = textBaseY - 2; // Just above progress bar
  drawEllipsedText(ctx, song.artists, textX, artistY, maxTextWidth);

  // Progress bar - aligned with text start
  const progressBarX = textX;
  const progressBarWidth = canvas.width - progressBarX - 32;
  const elapsedWidth = progressBarWidth * song.progress;

  // Draw full progress bar track (unplayed portion) - thin and subtle
  const trackHeight = 2; // Thinner track for unplayed portion
  const trackY = progressBarY + (PROGRESS_BAR_HEIGHT - trackHeight) / 2; // Center vertically
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)"; // Semi-transparent white
  drawRoundedRect(ctx, progressBarX, trackY, progressBarWidth, trackHeight, 1);

  // Draw played portion on top - thicker and brighter
  if (elapsedWidth > 0) {
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, progressBarX, progressBarY, elapsedWidth, PROGRESS_BAR_HEIGHT, 1.5);
  }

  ctx.restore();
}

