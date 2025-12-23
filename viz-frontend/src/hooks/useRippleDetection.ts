import { useEffect, useRef } from "react";
import { Bands, Ripple, Config } from "../types";
import {
  BUFFER_DURATION,
  LONG_TERM_DURATION,
  DEBOUNCE_MS,
  MIN_THRESHOLD,
  BASS_BUCKET_INDICES,
} from "../constants";

// Primary bass frequencies: buckets 1-2 (20-60 Hz) - most reliable indicators
// Training data shows bucket1 is highest in 52% of samples, bucket2 in 33%
const PRIMARY_BASS_BUCKET_INDICES = [1, 2];
// Secondary bass frequencies: buckets 3-4 (60-120 Hz) - included for completeness
const SECONDARY_BASS_BUCKET_INDICES = [3, 4];
// All bass buckets for comprehensive detection
const ALL_BASS_BUCKET_INDICES = [1, 2, 3, 4];
// Mid/high frequencies to check for bass dominance
const MID_HIGH_BUCKET_INDICES = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

// Short-term baseline window for rising edge detection (ms)
const SHORT_TERM_WINDOW = 150;
// Minimum rise factor required (e.g., 1.5x means current must be 1.5x recent baseline)
// Training data: strong rises observed, but we want reliable detection
const MIN_RISE_FACTOR = 1.5; // Balanced for catch rate
// Minimum absolute amplitude to consider (prevents noise triggers)
// Training data (141 samples): primary bass median 118.9, 25th percentile 72.6, 10th percentile 48.6
// We use a conservative threshold since rising edge detection handles most of the work
const MIN_ABSOLUTE_AMPLITUDE = 35; // Filters noise while allowing rising edge to catch hits
// Minimum bass dominance ratio (primary_bass/mid-high)
// Training data: median 7.21, 25th percentile 3.73, 10th percentile 1.57
// Using 2.0 for balanced sensitivity - catches most hits while filtering false positives
const MIN_BASS_DOMINANCE_RATIO = 2.0;
// Minimum time between detections (ms) - prevents multiple triggers from same bass hit
const MIN_DETECTION_INTERVAL_MS = 150;
// After triggering, signal must drop to this fraction of the peak before allowing another detection
const DROP_THRESHOLD_FRACTION = 0.6;

export function useRippleDetection(bands: Bands, config: Config) {
  const ripplesRef = useRef<Ripple[]>([]);
  const lastRippleTriggerRef = useRef<number>(0);
  const bassHistoryRef = useRef<{ timestamp: number; value: number }[]>([]);
  // Track the peak value when we last triggered, and whether we're in cooldown
  const lastTriggerPeakRef = useRef<number>(0);
  const isInCooldownRef = useRef<boolean>(false);

  useEffect(() => {
    if (!config.ripples) return;

    const now = performance.now();

    // Get primary bass frequencies (buckets 1-2) - most reliable indicators
    const primaryBassBuckets = PRIMARY_BASS_BUCKET_INDICES.map((i) => bands[`bucket${i}`] || 0);
    const primaryBassAmplitude = Math.max(...primaryBassBuckets);
    
    // Get all bass frequencies for comprehensive detection
    const allBassBuckets = ALL_BASS_BUCKET_INDICES.map((i) => bands[`bucket${i}`] || 0);
    const currentBassAmplitude = Math.max(...allBassBuckets);

    // Get mid/high frequencies for dominance check
    const midHighBuckets = MID_HIGH_BUCKET_INDICES.map((i) => bands[`bucket${i}`] || 0);
    const midHighAmplitude = Math.max(...midHighBuckets);

    // Update history buffer using primary bass (buckets 1-2) for more reliable baseline
    bassHistoryRef.current.push({ timestamp: now, value: primaryBassAmplitude });
    bassHistoryRef.current = bassHistoryRef.current.filter(
      (entry) => now - entry.timestamp <= BUFFER_DURATION
    );

    // Rising edge detection: check if we have a significant rise from recent baseline
    const recentHistory = bassHistoryRef.current.filter(
      (entry) => now - entry.timestamp <= SHORT_TERM_WINDOW && entry.timestamp !== now
    );

    if (recentHistory.length === 0) {
      // Not enough history yet, skip
      return;
    }

    // Use minimum of recent history for baseline - more sensitive to rises from quiet moments
    const recentMin = Math.min(...recentHistory.map(entry => entry.value));
    // Also calculate average as a secondary check
    const recentAvg = recentHistory.reduce((acc, entry) => acc + entry.value, 0) / recentHistory.length;
    // Use the lower of the two for more sensitive detection
    const recentBaseline = Math.min(recentMin, recentAvg);

    // Calculate rise factor using primary bass amplitude (buckets 1-2)
    const riseFactor = recentBaseline > 0 ? primaryBassAmplitude / recentBaseline : 0;

    // Check for bass dominance: bass should be significantly higher than mid/high
    // Use primary bass (buckets 1-2) for dominance check - most reliable
    const bassDominance = midHighAmplitude > 0 
      ? primaryBassAmplitude / midHighAmplitude 
      : Infinity;

    // Check if we're in cooldown - signal must drop below threshold before allowing another detection
    const timeSinceLastTrigger = now - lastRippleTriggerRef.current;
    const hasDroppedEnough = lastTriggerPeakRef.current === 0 || 
      primaryBassAmplitude <= lastTriggerPeakRef.current * DROP_THRESHOLD_FRACTION;
    
    // Exit cooldown if enough time has passed and signal has dropped
    if (isInCooldownRef.current && timeSinceLastTrigger >= MIN_DETECTION_INTERVAL_MS && hasDroppedEnough) {
      isInCooldownRef.current = false;
      lastTriggerPeakRef.current = 0;
    }

    // Requirements for a bass hit (based on training data analysis):
    // 1. Primary bass (buckets 1-2) must exceed minimum absolute threshold
    // 2. Must have significant rise from recent baseline (rising edge)
    // 3. Bass must dominate mid/high frequencies (ratio >= 2.0, training data shows mean 5.58)
    // 4. Not in cooldown period (prevents multiple triggers from same bass hit)
    const hasSignificantRise = riseFactor >= MIN_RISE_FACTOR;
    const exceedsMinimum = primaryBassAmplitude >= MIN_ABSOLUTE_AMPLITUDE;
    const bassDominates = bassDominance >= MIN_BASS_DOMINANCE_RATIO;
    const notInCooldown = !isInCooldownRef.current;

    if (hasSignificantRise && exceedsMinimum && bassDominates && notInCooldown) {
      ripplesRef.current.push({ startTime: now });
      lastRippleTriggerRef.current = now;
      lastTriggerPeakRef.current = primaryBassAmplitude;
      isInCooldownRef.current = true;
    }
  }, [bands, config.ripples]);

  return { ripplesRef, lastRippleTriggerRef };
}

