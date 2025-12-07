import { useEffect, useRef } from "react";
import { Bands, PianoParticle, Config } from "../types";
import {
  PIANO_BUCKET_INDICES,
  PIANO_PARTICLE_MIN_THRESHOLD,
  PIANO_PARTICLE_DEBOUNCE_MS,
  PIANO_PARTICLE_VELOCITY_MIN,
  PIANO_PARTICLE_VELOCITY_MAX,
  PIANO_PARTICLE_SIZE_MIN,
  PIANO_PARTICLE_SIZE_MAX,
} from "../constants";

export function usePianoParticles(
  bands: Bands,
  config: Config,
  canvasWidth: number,
  canvasHeight: number
) {
  const particlesRef = useRef<PianoParticle[]>([]);
  const lastParticleTriggerRef = useRef<number>(0);
  const wasHighRef = useRef<boolean>(false);
  const volumeBufferRef = useRef<{ timestamp: number; value: number }[]>([]);

  useEffect(() => {
    if (!config.pianoParticles) {
      particlesRef.current = [];
      return;
    }

    const currentBuckets = PIANO_BUCKET_INDICES.map((i) => bands[`bucket${i}`] || 0);
    const currentAmplitude = Math.max(...currentBuckets);
    const now = performance.now();

    // Update volume buffer for dynamic threshold
    volumeBufferRef.current.push({ timestamp: now, value: currentAmplitude });
    volumeBufferRef.current = volumeBufferRef.current.filter(
      (entry) => now - entry.timestamp <= 1000
    );

    // Compute dynamic threshold
    const volumeValues = volumeBufferRef.current.map((entry) => entry.value);
    const averageVolume =
      volumeValues.reduce((acc, v) => acc + v, 0) / (volumeValues.length || 1);
    const dynamicThreshold = Math.max(PIANO_PARTICLE_MIN_THRESHOLD, averageVolume * 1.2);

    const isHigh = currentAmplitude > dynamicThreshold;

    // Create particle on rising edge
    if (
      isHigh &&
      !wasHighRef.current &&
      now - lastParticleTriggerRef.current >= PIANO_PARTICLE_DEBOUNCE_MS
    ) {
      // Create 1-3 particles per key hit
      const particleCount = Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 2 : 3;
      
      for (let i = 0; i < particleCount; i++) {
        // Random horizontal position across the screen
        const x = Math.random() * canvasWidth;
        // Start at bottom of screen
        const startY = canvasHeight;

        particlesRef.current.push({
          startTime: now + i * 10, // Slight stagger
          x,
          y: startY,
          velocity:
            PIANO_PARTICLE_VELOCITY_MIN +
            Math.random() * (PIANO_PARTICLE_VELOCITY_MAX - PIANO_PARTICLE_VELOCITY_MIN),
          size:
            PIANO_PARTICLE_SIZE_MIN +
            Math.random() * (PIANO_PARTICLE_SIZE_MAX - PIANO_PARTICLE_SIZE_MIN),
          opacity: 0.6 + Math.random() * 0.4,
        });
      }

      lastParticleTriggerRef.current = now;
      wasHighRef.current = true;
    } else if (!isHigh) {
      wasHighRef.current = false;
    }

    // Clean up old particles
    particlesRef.current = particlesRef.current.filter(
      (particle) => now - particle.startTime <= 2000
    );
  }, [bands, config.pianoParticles, canvasWidth, canvasHeight]);

  return { particlesRef };
}

