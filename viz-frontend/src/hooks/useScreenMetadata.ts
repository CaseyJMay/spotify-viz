import { useEffect, useState } from "react";
import type { Worker as TesseractWorker } from "tesseract.js";
import { Song } from "../types";

export type ScreenMetadataStatus = "idle" | "reading" | "ready" | "error";

const SAMPLE_INTERVAL_MS = 750;
const OCR_FOCUS_SETTLE_MS = 2500;
const ANALYSIS_SIZE = 32;
const ART_CHANGE_THRESHOLD = 8;
const MIN_ART_VARIANCE = 14;
const STABLE_FRAME_THRESHOLD = 3.5;
const REQUIRED_STABLE_SAMPLES = 2;

const initialSong: Song = {
  title: "Reading shared Spotify tab…",
  artists: "Keep Spotify at 100% zoom",
  album_cover: "",
  progress: -1,
  is_playing: false,
};

interface PlayerLayout {
  artX: number;
  artY: number;
  artSize: number;
  textX: number;
  textY: number;
  textWidth: number;
  textHeight: number;
}

function getPlayerLayout(width: number, height: number): PlayerLayout {
  // Spotify's fullscreen/Now Playing view centers a large square cover. The
  // proportions below match both 16:9 and taller laptop captures.
  const artSize = Math.round(Math.min(width * 0.36, height * 0.575));
  const artX = Math.round((width - artSize) / 2);
  const artY = Math.round((height - artSize) / 2 - height * 0.02);

  // Once the shared Spotify tab loses focus, Now Playing drops the compact
  // player thumbnail and leaves a persistent two-line label at bottom-left.
  // Target that stable layout instead of the short-lived focused controls.
  const textX = Math.max(16, Math.round(width * 0.017));
  const textHeight = Math.max(64, Math.round(height * 0.075));

  return {
    artX,
    artY,
    artSize,
    textX,
    textY: Math.max(0, height - Math.round(height * 0.085)),
    textWidth: Math.max(260, Math.min(640, Math.round(width * 0.36))),
    textHeight,
  };
}

function cleanOcrLine(line: string): string {
  return line
    .replace(/[|_[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, "")
    .trim();
}

function imageVariance(data: Uint8ClampedArray): number {
  let total = 0;
  let totalSquared = 0;
  const count = data.length / 4;
  for (let index = 0; index < data.length; index += 4) {
    const value = (data[index] + data[index + 1] + data[index + 2]) / 3;
    total += value;
    totalSquared += value * value;
  }
  const average = total / count;
  return Math.sqrt(Math.max(0, totalSquared / count - average * average));
}

function imageDifference(
  previous: Uint8ClampedArray,
  current: Uint8ClampedArray
): number {
  let total = 0;
  for (let index = 0; index < current.length; index += 4) {
    total += Math.abs(current[index] - previous[index]);
    total += Math.abs(current[index + 1] - previous[index + 1]);
    total += Math.abs(current[index + 2] - previous[index + 2]);
  }
  return total / ((current.length / 4) * 3);
}

function detailedBlockRatio(data: Uint8ClampedArray, size: number): number {
  const blockCount = 4;
  const blockSize = size / blockCount;
  let detailedBlocks = 0;

  for (let blockY = 0; blockY < blockCount; blockY += 1) {
    for (let blockX = 0; blockX < blockCount; blockX += 1) {
      const values: number[] = [];
      for (let y = blockY * blockSize; y < (blockY + 1) * blockSize; y += 1) {
        for (let x = blockX * blockSize; x < (blockX + 1) * blockSize; x += 1) {
          const index = (y * size + x) * 4;
          values.push((data[index] + data[index + 1] + data[index + 2]) / 3);
        }
      }
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance = Math.sqrt(
        values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
          values.length
      );
      if (variance >= 9) detailedBlocks += 1;
    }
  }

  return detailedBlocks / (blockCount * blockCount);
}

function prepareTextCrop(
  video: HTMLVideoElement,
  layout: PlayerLayout
): HTMLCanvasElement {
  const scale = 4;
  const canvas = document.createElement("canvas");
  canvas.width = layout.textWidth * scale;
  canvas.height = layout.textHeight * scale;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return canvas;

  context.drawImage(
    video,
    layout.textX,
    layout.textY,
    layout.textWidth,
    layout.textHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Spotify's label is light text on a dark surface. Converting it to crisp
  // black-on-white pixels makes the tiny UI font much easier for OCR.
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < image.data.length; index += 4) {
    const luminance =
      image.data[index] * 0.2126 +
      image.data[index + 1] * 0.7152 +
      image.data[index + 2] * 0.0722;
    const value = luminance >= 105 ? 0 : 255;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

export function useScreenMetadata(captureStream: MediaStream | null): {
  song: Song;
  available: boolean;
  status: ScreenMetadataStatus;
  error: string | null;
} {
  const [song, setSong] = useState<Song>(initialSong);
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<ScreenMetadataStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const videoTrack = captureStream?.getVideoTracks()[0];
    if (!captureStream || !videoTrack) {
      setAvailable(false);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let sampleInterval = 0;
    let pendingOcrTimeout = 0;
    let ocrBusy = false;
    let hasAlbumArt = false;
    let candidateArt: Uint8ClampedArray | null = null;
    let candidateStableSamples = 0;
    let committedArt: Uint8ClampedArray | null = null;
    let ocrCandidateKey = "";
    let ocrCandidateSamples = 0;
    let workerPromise: Promise<TesseractWorker> | null = null;
    const video = document.createElement("video");
    const analysisCanvas = document.createElement("canvas");
    const artCanvas = document.createElement("canvas");
    analysisCanvas.width = ANALYSIS_SIZE;
    analysisCanvas.height = ANALYSIS_SIZE;
    artCanvas.width = 512;
    artCanvas.height = 512;
    const analysisContext = analysisCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    const artContext = artCanvas.getContext("2d");

    setSong(initialSong);
    setAvailable(false);
    setStatus("reading");
    setError(null);
    video.muted = true;
    video.playsInline = true;
    video.srcObject = new MediaStream([videoTrack]);

    const getWorker = async (): Promise<TesseractWorker> => {
      if (!workerPromise) {
        workerPromise = import("tesseract.js").then(async ({ createWorker, PSM }) => {
          const worker = await createWorker("eng");
          await worker.setParameters({
            tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
            preserve_interword_spaces: "1",
          });
          return worker;
        });
      }
      return workerPromise;
    };

    const runOcr = async () => {
      if (cancelled || ocrBusy || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }
      ocrBusy = true;
      try {
        const layout = getPlayerLayout(video.videoWidth, video.videoHeight);
        const textCanvas = prepareTextCrop(video, layout);
        const worker = await getWorker();
        const result = await worker.recognize(textCanvas);
        if (cancelled) return;
        const lines = result.data.text
          .split(/\r?\n/)
          .map(cleanOcrLine)
          .filter((line) => line.length > 1);
        if (lines.length >= 2 && result.data.confidence >= 25) {
          const title = lines[0];
          const artists = lines.slice(1, 3).join(" · ");
          const candidateKey = `${title}\n${artists}`.toLocaleLowerCase();

          if (candidateKey === ocrCandidateKey) {
            ocrCandidateSamples += 1;
          } else {
            ocrCandidateKey = candidateKey;
            ocrCandidateSamples = 1;
          }

          if (ocrCandidateSamples < 2) {
            queueOcr(600);
            return;
          }

          setSong((current) => ({
            ...current,
            title,
            artists,
          }));
          setStatus("ready");
        }
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Screen text could not be read.");
          // Album art remains useful even when OCR assets cannot load.
          setStatus(hasAlbumArt ? "ready" : "error");
        }
      } finally {
        ocrBusy = false;
      }
    };

    function queueOcr(delay = 450) {
      window.clearTimeout(pendingOcrTimeout);
      pendingOcrTimeout = window.setTimeout(() => void runOcr(), delay);
    }

    const sampleAlbumArt = () => {
      if (
        cancelled ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        !analysisContext ||
        !artContext ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        return;
      }

      const layout = getPlayerLayout(video.videoWidth, video.videoHeight);
      analysisContext.drawImage(
        video,
        layout.artX,
        layout.artY,
        layout.artSize,
        layout.artSize,
        0,
        0,
        ANALYSIS_SIZE,
        ANALYSIS_SIZE
      );
      const pixels = analysisContext.getImageData(
        0,
        0,
        ANALYSIS_SIZE,
        ANALYSIS_SIZE
      ).data;
      if (
        imageVariance(pixels) < MIN_ART_VARIANCE ||
        detailedBlockRatio(pixels, ANALYSIS_SIZE) < 0.4
      ) {
        candidateArt = null;
        candidateStableSamples = 0;
        return;
      }

      if (
        candidateArt &&
        imageDifference(candidateArt, pixels) < STABLE_FRAME_THRESHOLD
      ) {
        candidateStableSamples += 1;
      } else {
        candidateArt = new Uint8ClampedArray(pixels);
        candidateStableSamples = 1;
      }
      if (candidateStableSamples < REQUIRED_STABLE_SAMPLES) return;
      if (
        committedArt &&
        imageDifference(committedArt, pixels) < ART_CHANGE_THRESHOLD
      ) {
        return;
      }
      committedArt = new Uint8ClampedArray(pixels);
      ocrCandidateKey = "";
      ocrCandidateSamples = 0;

      artContext.clearRect(0, 0, artCanvas.width, artCanvas.height);
      artContext.drawImage(
        video,
        layout.artX,
        layout.artY,
        layout.artSize,
        layout.artSize,
        0,
        0,
        artCanvas.width,
        artCanvas.height
      );
      const albumCover = artCanvas.toDataURL("image/jpeg", 0.95);
      hasAlbumArt = true;
      setSong({
        title: "Now playing",
        artists: "Spotify",
        album_cover: albumCover,
        progress: -1,
        is_playing: true,
      });
      setAvailable(true);
      setStatus("ready");
      // Chrome returns focus to the visualizer after sharing. Give Spotify
      // time to switch to its persistent unfocused label before taking OCR.
      queueOcr(OCR_FOCUS_SETTLE_MS);
    };

    const startReading = () => {
      sampleAlbumArt();
      sampleInterval = window.setInterval(sampleAlbumArt, SAMPLE_INTERVAL_MS);
    };

    video.addEventListener("loadeddata", startReading, { once: true });
    video.play().catch((reason: unknown) => {
      if (!cancelled) {
        setError(reason instanceof Error ? reason.message : "Shared video could not start.");
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
      window.clearInterval(sampleInterval);
      window.clearTimeout(pendingOcrTimeout);
      video.pause();
      video.srcObject = null;
      void workerPromise?.then((worker) => worker.terminate()).catch(() => {});
    };
  }, [captureStream]);

  return { song, available, status, error };
}
