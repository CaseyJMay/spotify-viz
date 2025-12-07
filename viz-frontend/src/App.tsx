import React, { useEffect, useRef, useState } from "react";
import { Config } from "./types";
import {
  useSpotifyData,
  useMenuVisibility,
  usePlaybackControls,
  useRippleDetection,
  useImageLoading,
  useGenreSettings,
  usePianoParticles,
} from "./hooks";
import { PlaybackControls, ConfigMenu } from "./components";
import { drawVisualizer } from "./canvas";

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState<Config>({
    ripples: true,
    bassThump: false,
    pianoParticles: false,
  });

  // Custom hooks
  const { song, bands, isPlaying } = useSpotifyData();
  const { menuVisible, menuExpanded, setMenuExpanded } = useMenuVisibility();
  const { handlePlayPause, handleNext, handleBack } = usePlaybackControls();
  const { ripplesRef, lastRippleTriggerRef } = useRippleDetection(bands, config);
  const {
    gradientColors,
    gradientColorsRef,
    transitionProgressRef,
    albumImageRef,
  } = useImageLoading(song);

  // Genre-based settings (auto-apply enabled by default)
  const { recordOverride } = useGenreSettings({
    song,
    config,
    onConfigChange: setConfig,
    autoApply: true,
  });

  // Piano particles (needs canvas dimensions)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const { particlesRef: pianoParticlesRef } = usePianoParticles(
    bands,
    config,
    canvasSize.width,
    canvasSize.height
  );

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      setCanvasSize({ width: canvas.width, height: canvas.height });
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const handleMouseMove = () => {
      // Track mouse movement for footer visibility
    };
    canvas.addEventListener("mousemove", handleMouseMove);

    const animationFrameId = { current: 0 } as { current: number };

    const animFrame = () => {
      drawVisualizer({
        ctx,
        canvas,
        bands,
        song,
        config,
        gradientColors: gradientColorsRef.current,
        transitionProgress: transitionProgressRef.current,
        albumImage: albumImageRef.current,
        ripples: ripplesRef.current,
        lastRippleTrigger: lastRippleTriggerRef.current,
        pianoParticles: pianoParticlesRef.current,
        menuVisible,
      });

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
  }, [bands, gradientColors, song, config, menuVisible, ripplesRef, lastRippleTriggerRef, gradientColorsRef, transitionProgressRef, albumImageRef, pianoParticlesRef]);

  return (
    <>
      <ConfigMenu
        visible={menuVisible}
        expanded={menuExpanded}
        config={config}
        onToggleExpanded={() => setMenuExpanded((prev) => !prev)}
        onConfigChange={(updates) => {
          recordOverride(updates); // Record user override
          setConfig((prev) => ({ ...prev, ...updates }));
        }}
      />
      <PlaybackControls
        isPlaying={isPlaying}
        onPlayPause={() => handlePlayPause(isPlaying)}
        onNext={handleNext}
        onBack={handleBack}
        visible={menuVisible}
      />
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </>
  );
};

export default App;
