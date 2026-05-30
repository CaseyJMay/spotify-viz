import { useCallback, useEffect, useRef, useState } from "react";
import { Bands } from "../types";
import { computeBands } from "../audio/buckets";

export type CaptureStatus = "idle" | "capturing" | "error" | "unsupported";

const FFT_SIZE = 2048;
// Lower smoothing keeps the snappy response of the original raw-FFT pipeline.
const SMOOTHING_TIME_CONSTANT = 0.5;
// Throttle React state updates so the detection hooks/draw effect don't
// re-render 60x/sec; ~60ms keeps the old WebSocket cadence while removing the
// network hop and server-side throttle.
const UPDATE_INTERVAL_MS = 60;

function isSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === "function"
  );
}

/**
 * Captures audio from a shared tab/window via getDisplayMedia and turns it into
 * the 25 visualizer bands using a Web Audio AnalyserNode. Replaces the old
 * Python/PortAudio loopback pipeline. Requires a user gesture to start.
 */
export function useAudioCapture() {
  const [bands, setBands] = useState<Bands>({});
  const [status, setStatus] = useState<CaptureStatus>(
    isSupported() ? "idle" : "unsupported"
  );
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    dataRef.current = null;
    setBands({});
    setStatus(isSupported() ? "idle" : "unsupported");
  }, []);

  const start = useCallback(async () => {
    if (!isSupported()) {
      setStatus("unsupported");
      return;
    }
    setError(null);
    try {
      // video:true is required for Chrome to surface the audio-sharing option;
      // we drop the video track immediately since only audio is needed.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { systemAudio: "include" } as MediaTrackConstraints,
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        setError(
          'No audio was shared. Re-share and make sure "Share tab audio" is checked.'
        );
        setStatus("error");
        return;
      }
      stream.getVideoTracks().forEach((t) => t.stop());

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(
        new MediaStream(audioTracks)
      );
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
      source.connect(analyser);

      streamRef.current = stream;
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      dataRef.current = new Float32Array(
        new ArrayBuffer(analyser.frequencyBinCount * Float32Array.BYTES_PER_ELEMENT)
      );
      lastUpdateRef.current = 0;

      // Fires when the user hits the browser's "Stop sharing" control.
      audioTracks[0].addEventListener("ended", stop);

      setStatus("capturing");

      const tick = () => {
        const analyserNode = analyserRef.current;
        const data = dataRef.current;
        if (analyserNode && data) {
          analyserNode.getFloatFrequencyData(data);
          const now = performance.now();
          if (now - lastUpdateRef.current >= UPDATE_INTERVAL_MS) {
            lastUpdateRef.current = now;
            setBands(computeBands(data, audioCtx.sampleRate, analyserNode.fftSize));
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      // The picker being dismissed is not an error worth surfacing.
      if (e instanceof DOMException && e.name === "NotAllowedError") {
        setStatus("idle");
        return;
      }
      setError(e instanceof Error ? e.message : "Failed to start audio capture.");
      setStatus("error");
    }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return { bands, status, error, start, stop };
}
