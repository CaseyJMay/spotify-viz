import React, { useEffect, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";

interface Song {
  title: string;
  artists: string;
  album_cover: string;
  progress: number;
  // Optionally, add an artist_icon URL if available:
  artist_icon?: string;
}

interface Bands {
  [key: string]: number;
}

interface WebSocketData {
  song: Song;
  bands: Bands;
}

const TOTAL_BARS = 50;

// Each ripple stores its creation time.
interface Ripple {
  startTime: number;
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousAlbumCoverRef = useRef<string | null>(null);
  const albumImageRef = useRef<HTMLImageElement | null>(null);
  // New ref for artist icon.
  const artistIconRef = useRef<HTMLImageElement | null>(null);
  // To cache the currently loaded artist icon URL.
  const previousArtistIconUrlRef = useRef<string | null>(null);

  const [song, setSong] = useState<Song>({
    title: "No Title",
    artists: "Unknown Artist",
    album_cover: "",
    progress: 0,
  });
  const [bands, setBands] = useState<Bands>({});

  const [gradientColors, setGradientColors] = useState<string[]>(["#000", "#000"]);
  const gradientColorsRef = useRef<string[]>(["#000", "#000"]);
  const transitionProgressRef = useRef(0);

  // --- Ripple System ---
  const ripplesRef = useRef<Ripple[]>([]);
  const lastRippleTriggerRef = useRef<number>(0);

  // --- Rotating Buffer for Bucket5 ---
  const bucket5BufferRef = useRef<{ timestamp: number; value: number }[]>([]);
  // --- Rising Edge Detection for Bucket5 ---
  const bucket5WasHighRef = useRef<boolean>(false);

  // --- Footer Visibility via Mouse Movement ---
  const lastMouseMoveRef = useRef<number>(performance.now());

  const { lastJsonMessage } = useWebSocket("ws://localhost:5000/ws", {
    shouldReconnect: () => true,
  });

  // Helper function to draw a rounded rectangle.
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  };

  // --- Data Update Effect ---
  useEffect(() => {
    if (lastJsonMessage) {
      const data = lastJsonMessage as WebSocketData;
      if (data.song) {
        setSong((prev) => {
          if (prev.album_cover !== data.song.album_cover) {
            previousAlbumCoverRef.current = null;
          }
          return {
            title: data.song.title || "No Title",
            artists: data.song.artists || "Unknown Artist",
            album_cover: data.song.album_cover || "",
            progress: data.song.progress,
            artist_icon: data.song.artist_icon, // Optional: if provided from backend
          };
        });
      }
      if (data.bands) {
        setBands(data.bands);
      }
    }
  }, [lastJsonMessage]);

  // --- Album Cover & Color Extraction Effect ---
  useEffect(() => {
    if (!song.album_cover || previousAlbumCoverRef.current === song.album_cover) return;
    previousAlbumCoverRef.current = song.album_cover;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = song.album_cover;
    img.onload = () => {
      albumImageRef.current = img;
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = img.width;
      offscreenCanvas.height = img.height;
      const ctx = offscreenCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const primaryColors = extractPrimaryColors(imageData);
        if (JSON.stringify(primaryColors) !== JSON.stringify(gradientColorsRef.current)) {
          gradientColorsRef.current = primaryColors;
          setGradientColors(primaryColors);
          transitionProgressRef.current = 0;
        }
      }
    };
  }, [song.album_cover]);

  // --- Artist Icon Effect ---
  // If a separate artist_icon URL is provided, load that.
  // Otherwise, fallback to using the album_cover.
  useEffect(() => {
    const iconUrl = song.artist_icon || song.album_cover;
    if (!iconUrl) return;
    // Only reload if the URL has changed.
    if (previousArtistIconUrlRef.current === iconUrl) return;
    previousArtistIconUrlRef.current = iconUrl;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = iconUrl;
    img.onload = () => {
      artistIconRef.current = img;
    };
  }, [song.artist_icon, song.album_cover]);

  // --- Ripple Detection Effect (Using Rotating Buffer & Rising Edge) ---
  useEffect(() => {
    const bufferDuration = 1000; // 1 second window
    const triggerFactor = 1.5;   // new value must be at least 50% higher than the average
    const debounceMs = 0;        // minimum time between triggers
    const minThreshold = 20;     // ignore very low values

    const now = performance.now();
    const currentBucket5 = bands["bucket5"] || 0;

    // Add the current bucket5 value to the buffer.
    bucket5BufferRef.current.push({ timestamp: now, value: currentBucket5 });
    // Remove entries older than bufferDuration.
    bucket5BufferRef.current = bucket5BufferRef.current.filter(
      (entry) => now - entry.timestamp <= bufferDuration
    );

    // Compute the average value in the buffer.
    const sum = bucket5BufferRef.current.reduce((acc, entry) => acc + entry.value, 0);
    const avg = bucket5BufferRef.current.length > 0 ? sum / bucket5BufferRef.current.length : 0;

    // Check if the current value is significantly above the average.
    const isHigh = avg > 0 && currentBucket5 >= triggerFactor * avg && currentBucket5 > minThreshold;

    // Only trigger on the rising edge.
    if (isHigh && !bucket5WasHighRef.current && now - lastRippleTriggerRef.current >= debounceMs) {
      ripplesRef.current.push({ startTime: now });
      lastRippleTriggerRef.current = now;
      bucket5WasHighRef.current = true;
    } else if (!isHigh) {
      bucket5WasHighRef.current = false;
    }
  }, [bands]);

  // --- Utility Functions ---
  const extractPrimaryColors = (imageData: ImageData): string[] => {
    const { data } = imageData;
    const colorBuckets: { [key: string]: number } = {};
    for (let i = 0; i < data.length; i += 4) {
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      // Skip near-white colors.
      if (r > 200 && g > 200 && b > 200 && Math.abs(r - g) < 10 && Math.abs(g - b) < 10) {
        continue;
      }
      // Calculate perceived brightness.
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      // Skip very light colors.
      if (brightness > 220) {
        continue;
      }
      const key = `${r},${g},${b}`;
      colorBuckets[key] = (colorBuckets[key] || 0) + 1;
    }
    return Object.entries(colorBuckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => `rgb(${key})`);
  };

  // --- Canvas Drawing Effect with Page Focus Handling ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize the canvas on window resize.
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Update the lastMouseMove timestamp when the mouse moves over the canvas.
    const handleMouseMove = () => {
      lastMouseMoveRef.current = performance.now();
    };
    canvas.addEventListener("mousemove", handleMouseMove);

    // Helper to draw text with ellipsis if it overflows.
    const drawEllipsedText = (
      ctx: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      maxWidth: number
    ) => {
      if (ctx.measureText(text).width <= maxWidth) {
        ctx.fillText(text, x, y);
      } else {
        let truncated = text;
        while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + "...", x, y);
      }
    };

    // The drawing function.
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const albumRadius = 150;
      const barWidth = 8;
      const maxBarLength = 100;

      // --- Draw the main background gradient ---
      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      if (gradientColorsRef.current.length < 2) {
        bgGradient.addColorStop(0, "#000");
        bgGradient.addColorStop(1, "#000");
      } else {
        gradientColorsRef.current.forEach((color, index) => {
          bgGradient.addColorStop(index / (gradientColorsRef.current.length - 1), color);
        });
      }
      ctx.globalAlpha = Math.min(transitionProgressRef.current, 1);
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;

      // --- Draw the bars (using raw band data) ---
      const angles = Array.from({ length: TOTAL_BARS }, (_, i) => (i / TOTAL_BARS) * Math.PI * 2);
      angles.forEach((angle) => {
        const adjustedAngle = Math.PI / 4 + angle;
        const bucketKey = `bucket${Math.floor(angle / (Math.PI * 2 / TOTAL_BARS)) + 1}`;
        const amplitude = bands[bucketKey] || 0;
        const barLength = Math.min(amplitude, maxBarLength);
        const xStart = centerX + Math.cos(adjustedAngle) * albumRadius;
        const yStart = centerY + Math.sin(adjustedAngle) * albumRadius;
        const xEnd = centerX + Math.cos(adjustedAngle) * (albumRadius + barLength);
        const yEnd = centerY + Math.sin(adjustedAngle) * (albumRadius + barLength);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = barWidth;
        ctx.lineCap = "round";
        ctx.shadowBlur = 5;
        ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        ctx.stroke();
        ctx.closePath();

        // Draw the mirrored bar.
        const mirrorAngle = adjustedAngle + Math.PI;
        const xStartMirror = centerX + Math.cos(mirrorAngle) * albumRadius;
        const yStartMirror = centerY + Math.sin(mirrorAngle) * albumRadius;
        const xEndMirror = centerX + Math.cos(mirrorAngle) * (albumRadius + barLength);
        const yEndMirror = centerY + Math.sin(mirrorAngle) * (albumRadius + barLength);
        ctx.beginPath();
        ctx.moveTo(xStartMirror, yStartMirror);
        ctx.lineTo(xEndMirror, yEndMirror);
        ctx.stroke();
        ctx.closePath();
      });

      // --- Draw the album cover in the center ---
      if (albumImageRef.current) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, albumRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          albumImageRef.current,
          centerX - albumRadius,
          centerY - albumRadius,
          albumRadius * 2,
          albumRadius * 2
        );
        ctx.restore();
      }

      // --- Draw Active Ripples ---
      const now = performance.now();
      const maxRippleRadius = Math.sqrt(centerX * centerX + centerY * centerY);
      const rippleLifetime = 1000; // Each ripple lasts ~1 second.
      ripplesRef.current = ripplesRef.current.filter((ripple) => {
        const elapsed = now - ripple.startTime;
        if (elapsed > rippleLifetime) return false;
        const t = elapsed / rippleLifetime;
        const currentRadius = albumRadius + t * (maxRippleRadius - albumRadius);
        const opacity = 0.3 * (1 - t);
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        return true;
      });

      // --- Draw the Integrated Footer (if applicable) ---
      const timeSinceMouse = now - lastMouseMoveRef.current;
      let footerOpacity = 0;
      if (timeSinceMouse < 3000) {
        footerOpacity = 1;
      } else if (timeSinceMouse < 4000) {
        footerOpacity = 0.4 - (timeSinceMouse - 3000) / 1000;
      }
      if (footerOpacity > 0) {
        const footerHeight = 200;
        const footerY = canvas.height - footerHeight;
        // Draw footer background gradient.
        const footerGradient = ctx.createLinearGradient(0, footerY, 0, canvas.height);
        footerGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        footerGradient.addColorStop(1, `rgba(0, 0, 0, ${0.8 * footerOpacity})`);
        ctx.fillStyle = footerGradient;
        ctx.fillRect(0, footerY, canvas.width, footerHeight);

        // Save state and set footer global alpha.
        ctx.save();
        ctx.globalAlpha = footerOpacity;

        // --- Draw Artist Icon as a Round Image ---
        const iconSize = 60;
        const iconMarginRight = 20;
        const iconX = 30;
        if (artistIconRef.current) {
          const iconY = footerY + (footerHeight - iconSize) / 2;
          ctx.save();
          // Create a circular clipping region.
          ctx.beginPath();
          ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(artistIconRef.current, iconX, iconY, iconSize, iconSize);
          ctx.restore();
        }
        // Determine text start position.
        const textX = 30 + (artistIconRef.current ? iconSize + iconMarginRight : 0);
        // Increase the text block's width by moving the progress bar further right.
        const progressBarX = 700;
        const maxTextWidth = progressBarX - textX - 10;

        // --- Draw Song Title and Artist Name ---
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.font = "bold 28px Arial";
        // Adjust text vertical positions to give more room.
        drawEllipsedText(ctx, song.title, textX, footerY + 90, maxTextWidth);
        ctx.font = "24px Arial";
        drawEllipsedText(ctx, song.artists, textX, footerY + 130, maxTextWidth);

        // --- Draw the Progress Bar (smaller height) ---
        const progressBarHeight = 6;
        const progressBarY = footerY + (footerHeight - progressBarHeight) / 2;
        const progressBarRadius = progressBarHeight / 2;
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        drawRoundedRect(ctx, progressBarX, progressBarY, canvas.width - progressBarX - 30, progressBarHeight, progressBarRadius);
        const elapsedWidth = (canvas.width - progressBarX - 30) * song.progress;
        ctx.fillStyle = "#fff";
        drawRoundedRect(ctx, progressBarX, progressBarY, elapsedWidth, progressBarHeight, progressBarRadius);

        ctx.restore();
      }
    };

    // Use a ref to hold the current animation frame ID.
    const animationFrameId = { current: 0 } as { current: number };

    // The animation loop.
    const animFrame = () => {
      draw();
      if (transitionProgressRef.current < 1) {
        transitionProgressRef.current += 0.01;
      }
      animationFrameId.current = requestAnimationFrame(animFrame);
    };

    // Start the animation.
    animationFrameId.current = requestAnimationFrame(animFrame);

    // Handle page visibility changes.
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId.current);
      } else {
        // Optionally reset time-dependent variables.
        transitionProgressRef.current = 0;
        animationFrameId.current = requestAnimationFrame(animFrame);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [bands, gradientColors, song]);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
};

export default App;
