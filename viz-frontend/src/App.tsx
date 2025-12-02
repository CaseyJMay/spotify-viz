import React, { useEffect, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";

interface Song {
  title: string;
  artists: string;
  album_cover: string;
  progress: number;
  is_playing: boolean;
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

// Helper: compute median from an array.
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousAlbumCoverRef = useRef<string | null>(null);
  const albumImageRef = useRef<HTMLImageElement | null>(null);
  const artistIconRef = useRef<HTMLImageElement | null>(null);
  const previousArtistIconUrlRef = useRef<string | null>(null);

  const [song, setSong] = useState<Song>({
    title: "No Title",
    artists: "Unknown Artist",
    album_cover: "",
    progress: 0,
    is_playing: false,
  });
  const [bands, setBands] = useState<Bands>({});

  const [gradientColors, setGradientColors] = useState<string[]>(["#000", "#000"]);
  const gradientColorsRef = useRef<string[]>(["#000", "#000"]);
  const transitionProgressRef = useRef(0);

  // --- Configuration State (for ripples & bass thump) ---
  const [config, setConfig] = useState({
    ripples: true,
    bassThump: false,
  });

  // --- Playback State (synced with Spotify) ---
  const [isPlaying, setIsPlaying] = useState(false);

  // --- Ripple System ---
  const ripplesRef = useRef<Ripple[]>([]);
  const lastRippleTriggerRef = useRef<number>(0);

  // --- Rotating Buffer for Bucket5 (short-term) ---
  const bucket5BufferRef = useRef<{ timestamp: number; value: number }[]>([]);
  const bucket5WasHighRef = useRef<boolean>(false);

  // --- Song Bass Baseline (for dynamic threshold) ---
  const songBassBaselineRef = useRef<number>(0);
  const volumeBufferRef = useRef<{ timestamp: number; value: number }[]>([]);

  // --- Footer/Menu Visibility via Mouse Movement ---
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const lastMouseMoveRef = useRef<number>(performance.now());

  const { lastJsonMessage } = useWebSocket("ws://localhost:5000/ws", {
    shouldReconnect: () => true,
  });

  // Global mousemove listener for the menu and controls.
  useEffect(() => {
    let timeoutId: number;
    const handleGlobalMouseMove = () => {
      setMenuVisible(true);
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setMenuVisible(false), 5000);
    };
    document.addEventListener("mousemove", handleGlobalMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      clearTimeout(timeoutId);
    };
  }, []);

  // --- Playback Control Handlers ---
  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await fetch("http://localhost:5000/control/pause", { method: "POST" });
      } else {
        await fetch("http://localhost:5000/control/play", { method: "POST" });
      }
      // We do not toggle isPlaying locally because it's updated from Spotify.
    } catch (e) {
      console.error(e);
    }
  };

  const handleNext = async () => {
    try {
      await fetch("http://localhost:5000/control/next", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleBack = async () => {
    try {
      await fetch("http://localhost:5000/control/back", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
  };

  // --- Helper function to draw a rounded rectangle.
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
            songBassBaselineRef.current = 0;
          }
          setIsPlaying(data.song.is_playing);
          return {
            title: data.song.title || "No Title",
            artists: data.song.artists || "Unknown Artist",
            album_cover: data.song.album_cover || "",
            progress: data.song.progress,
            is_playing: data.song.is_playing,
            artist_icon: data.song.artist_icon,
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
  useEffect(() => {
    const iconUrl = song.artist_icon || song.album_cover;
    if (!iconUrl) return;
    if (previousArtistIconUrlRef.current === iconUrl) return;
    previousArtistIconUrlRef.current = iconUrl;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = iconUrl;
    img.onload = () => {
      artistIconRef.current = img;
    };
  }, [song.artist_icon, song.album_cover]);

// --- Ripple Detection Effect (using max for currentAmplitude and average for threshold) ---
useEffect(() => {
    if (!config.ripples) return;
    const bufferDuration = 1000; // short-term window (1 second)
    const longTermDuration = 1000; // long-term window (5 seconds)
    const debounceMs = 0; // minimum time between triggers
    const MIN_THRESHOLD = 25; // hard lower bound for the threshold
  
    // Use buckets 1-5.
    const bucketIndices = [1, 2, 3, 4, 5];
    const currentBuckets = bucketIndices.map(i => bands[`bucket${i}`] || 0);
    // Use the maximum amplitude from these buckets.
    const currentAmplitude = Math.max(...currentBuckets);
  
    // Log the amplitudes for buckets 1-5.
    console.log(
      "Buckets 1-5:",
      bucketIndices.map(i => `bucket${i}: ${bands[`bucket${i}`]?.toFixed(2)}`).join(", ")
    );
  
    const now = performance.now();
  
    // Update the short-term buffer with the current maximum amplitude.
    bucket5BufferRef.current.push({ timestamp: now, value: currentAmplitude });
    bucket5BufferRef.current = bucket5BufferRef.current.filter(
      (entry) => now - entry.timestamp <= bufferDuration
    );
  
    // Update the long-term volume buffer (5 seconds).
    volumeBufferRef.current.push({ timestamp: now, value: currentAmplitude });
    volumeBufferRef.current = volumeBufferRef.current.filter(
      (entry) => now - entry.timestamp <= longTermDuration
    );
  
    // Compute the average from the long-term buffer.
    const volumeValues = volumeBufferRef.current.map(entry => entry.value);
    const averageVolume = volumeValues.reduce((acc, v) => acc + v, 0) / (volumeValues.length || 1);
    const dynamicThreshold = Math.max(MIN_THRESHOLD, averageVolume * 1.5);
  
    const isHigh = currentAmplitude > dynamicThreshold;
  
    console.log(`Current Amplitude: ${currentAmplitude.toFixed(2)}; Dynamic Threshold: ${dynamicThreshold.toFixed(2)}`);
  
    if (isHigh && !bucket5WasHighRef.current && now - lastRippleTriggerRef.current >= debounceMs) {
      ripplesRef.current.push({ startTime: now });
      lastRippleTriggerRef.current = now;
      bucket5WasHighRef.current = true;
      console.log(
        `Bass Hit: Buckets 1-5: ${bucketIndices.map(i => bands[`bucket${i}`]?.toFixed(2)).join(", ")}, ` +
        `Dynamic Threshold: ${dynamicThreshold.toFixed(2)}, ` +
        `Current Amplitude: ${currentAmplitude.toFixed(2)}`
      );
    } else if (!isHigh) {
      bucket5WasHighRef.current = false;
    }
  }, [bands, config.ripples]);
  
  
  

  // --- Utility Functions ---
  const extractPrimaryColors = (imageData: ImageData): string[] => {
    const { data } = imageData;
    const colorBuckets: { [key: string]: number } = {};
    for (let i = 0; i < data.length; i += 4) {
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      if (r > 200 && g > 200 && b > 200 && Math.abs(r - g) < 10 && Math.abs(g - b) < 10) continue;
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      if (brightness > 220) continue;
      const key = `${r},${g},${b}`;
      colorBuckets[key] = (colorBuckets[key] || 0) + 1;
    }
    return Object.entries(colorBuckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => `rgb(${key})`);
  };

  // --- Canvas Drawing Effect with Bass "Thump" on Album Cover ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const handleMouseMove = () => {
      lastMouseMoveRef.current = performance.now();
    };
    canvas.addEventListener("mousemove", handleMouseMove);

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

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const albumRadius = 150;
      const barWidth = 8;
      const maxBarLength = 100;

      // --- Draw main background gradient ---
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

      // --- Draw bars ---
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

      // --- Draw album cover with bass "thump" effect ---
      if (albumImageRef.current) {
        let scale = 1;
        if (config.bassThump) {
          const nowTime = performance.now();
          const effectDuration = 100;
          const bassDelta = nowTime - lastRippleTriggerRef.current;
          if (bassDelta < effectDuration) {
            const half = effectDuration / 2;
            scale = bassDelta < half
              ? 1 - 0.05 * (bassDelta / half)
              : 0.9 + 0.1 * ((bassDelta - half) / half);
          }
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, albumRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.drawImage(
          albumImageRef.current,
          -albumRadius,
          -albumRadius,
          albumRadius * 2,
          albumRadius * 2
        );
        ctx.restore();
      }

      // --- Draw Active Ripples ---
      const nowTime = performance.now();
      const maxRippleRadius = Math.sqrt(centerX * centerX + centerY * centerY);
      const rippleLifetime = 1000;
      ripplesRef.current = ripplesRef.current.filter((ripple) => {
        const elapsed = nowTime - ripple.startTime;
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

      // --- Draw Integrated Footer ---
      const timeSinceMouse = nowTime - lastMouseMoveRef.current;
      let footerOpacity = 0;
      if (timeSinceMouse < 3000) {
        footerOpacity = 1;
      } else if (timeSinceMouse < 4000) {
        footerOpacity = 0.4 - (timeSinceMouse - 3000) / 1000;
      }
      if (footerOpacity > 0) {
        const footerHeight = 200;
        const footerY = canvas.height - footerHeight;
        const footerGradient = ctx.createLinearGradient(0, footerY, 0, canvas.height);
        footerGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        footerGradient.addColorStop(1, `rgba(0, 0, 0, ${0.8 * footerOpacity})`);
        ctx.fillStyle = footerGradient;
        ctx.fillRect(0, footerY, canvas.width, footerHeight);

        ctx.save();
        ctx.globalAlpha = footerOpacity;
        const iconSize = 60;
        const iconMarginRight = 20;
        const iconX = 30;
        if (artistIconRef.current) {
          const iconY = footerY + (footerHeight - iconSize) / 2;
          ctx.save();
          ctx.beginPath();
          ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(artistIconRef.current, iconX, iconY, iconSize, iconSize);
          ctx.restore();
        }
        const textX = 30 + (artistIconRef.current ? iconSize + iconMarginRight : 0);
        const progressBarX = 400;
        const maxTextWidth = progressBarX - textX - 10;

        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.font = "bold 22px Arial";
        drawEllipsedText(ctx, song.title, textX, footerY + 90, maxTextWidth);
        ctx.font = "18px Arial";
        drawEllipsedText(ctx, song.artists, textX, footerY + 130, maxTextWidth);
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

    const animationFrameId = { current: 0 } as { current: number };

    const animFrame = () => {
      draw();
      if (transitionProgressRef.current < 1) {
        transitionProgressRef.current += 0.01;
      }
      animationFrameId.current = requestAnimationFrame(animFrame);
    };

    animationFrameId.current = requestAnimationFrame(animFrame);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId.current);
      } else {
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
  }, [bands, gradientColors, song, config.bassThump]);

  return (
    <>
      {/* Top-right config menu */}
      <div
        style={{
          position: "fixed",
          top: 10,
          right: 10,
          zIndex: 1000,
          opacity: menuVisible ? 1 : 0,
          transition: "opacity 0.5s",
          color: "#fff",
          textAlign: "right",
        }}
      >
        <button
          onClick={() => setMenuExpanded((prev) => !prev)}
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            fontSize: "24px",
            cursor: "pointer",
          }}
        >
          ...
        </button>
        {menuExpanded && (
          <div
            style={{
              background: "rgba(0, 0, 0, 0.7)",
              padding: "10px",
              borderRadius: "5px",
              marginTop: "5px",
              textAlign: "left",
            }}
          >
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={config.ripples}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, ripples: e.target.checked }))
                  }
                />
                Enable Ripples
              </label>
            </div>
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={config.bassThump}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, bassThump: e.target.checked }))
                  }
                />
                Enable Bass Thump
              </label>
            </div>
          </div>
        )}
      </div>
      {/* Bottom overlay control buttons */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: 0,
          right: 0,
          zIndex: 1000,
          textAlign: "center",
          opacity: menuVisible ? 1 : 0,
          transition: "opacity 0.5s",
        }}
      >
        <button
          onClick={handleBack}
          style={{
            margin: "0 10px",
            padding: "10px",
            fontSize: "24px",
            cursor: "pointer",
            background: "transparent",
            border: "none",
            color: "#fff",
          }}
        >
          ⏮
        </button>
        <button
          onClick={handlePlayPause}
          style={{
            margin: "0 10px",
            padding: "10px",
            fontSize: "24px",
            cursor: "pointer",
            background: "transparent",
            border: "none",
            color: "#fff",
          }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button
          onClick={handleNext}
          style={{
            margin: "0 10px",
            padding: "10px",
            fontSize: "24px",
            cursor: "pointer",
            background: "transparent",
            border: "none",
            color: "#fff",
          }}
        >
          ⏭
        </button>
      </div>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </>
  );
};

export default App;
