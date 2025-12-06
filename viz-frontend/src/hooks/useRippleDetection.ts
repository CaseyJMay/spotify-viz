import { useEffect, useRef } from "react";
import { Bands, Ripple, Config } from "../types";
import {
  BUFFER_DURATION,
  LONG_TERM_DURATION,
  DEBOUNCE_MS,
  MIN_THRESHOLD,
  BASS_BUCKET_INDICES,
} from "../constants";

export function useRippleDetection(bands: Bands, config: Config) {
  const ripplesRef = useRef<Ripple[]>([]);
  const lastRippleTriggerRef = useRef<number>(0);
  const bucket5BufferRef = useRef<{ timestamp: number; value: number }[]>([]);
  const bucket5WasHighRef = useRef<boolean>(false);
  const volumeBufferRef = useRef<{ timestamp: number; value: number }[]>([]);

  useEffect(() => {
    if (!config.ripples) return;

    const currentBuckets = BASS_BUCKET_INDICES.map((i) => bands[`bucket${i}`] || 0);
    const currentAmplitude = Math.max(...currentBuckets);
    const now = performance.now();

    // Update buffers
    bucket5BufferRef.current.push({ timestamp: now, value: currentAmplitude });
    bucket5BufferRef.current = bucket5BufferRef.current.filter(
      (entry) => now - entry.timestamp <= BUFFER_DURATION
    );

    volumeBufferRef.current.push({ timestamp: now, value: currentAmplitude });
    volumeBufferRef.current = volumeBufferRef.current.filter(
      (entry) => now - entry.timestamp <= LONG_TERM_DURATION
    );

    // Compute dynamic threshold
    const volumeValues = volumeBufferRef.current.map((entry) => entry.value);
    const averageVolume =
      volumeValues.reduce((acc, v) => acc + v, 0) / (volumeValues.length || 1);
    const dynamicThreshold = Math.max(MIN_THRESHOLD, averageVolume * 1.5);

    const isHigh = currentAmplitude > dynamicThreshold;

    if (
      isHigh &&
      !bucket5WasHighRef.current &&
      now - lastRippleTriggerRef.current >= DEBOUNCE_MS
    ) {
      ripplesRef.current.push({ startTime: now });
      lastRippleTriggerRef.current = now;
      bucket5WasHighRef.current = true;
    } else if (!isHigh) {
      bucket5WasHighRef.current = false;
    }

    // Clean up old ripples (done in drawVisualizer)
  }, [bands, config.ripples]);

  return { ripplesRef, lastRippleTriggerRef };
}

