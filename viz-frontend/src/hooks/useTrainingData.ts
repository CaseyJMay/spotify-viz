import { useState, useRef, useCallback } from "react";
import { Bands, Song } from "../types";

export interface TrainingSample {
  timestamp: number;
  bands: Bands;
  song?: {
    title: string;
    artists: string;
    genres?: string[];
  };
  label: "bass_hit" | "not_bass";
}

export function useTrainingData() {
  const [samples, setSamples] = useState<TrainingSample[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recordingStartTimeRef = useRef<number>(0);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    recordingStartTimeRef.current = performance.now();
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const recordSample = useCallback(
    (bands: Bands, song?: Song, label: "bass_hit" | "not_bass" = "bass_hit") => {
      if (!isRecording) return;

      const sample: TrainingSample = {
        timestamp: performance.now() - recordingStartTimeRef.current,
        bands: { ...bands }, // Deep copy
        label,
      };

      if (song) {
        sample.song = {
          title: song.title,
          artists: song.artists,
          genres: song.genres,
        };
      }

      setSamples((prev) => [...prev, sample]);
    },
    [isRecording]
  );

  const clearSamples = useCallback(() => {
    setSamples([]);
  }, []);

  const exportData = useCallback(() => {
    const dataStr = JSON.stringify(samples, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bass-training-data-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [samples]);

  return {
    samples,
    isRecording,
    startRecording,
    stopRecording,
    recordSample,
    clearSamples,
    exportData,
  };
}

