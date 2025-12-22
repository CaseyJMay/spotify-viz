import { useEffect, useRef, useState } from "react";
import { Song } from "../types";
import { extractPrimaryColors, ensureReadableColors } from "../utils";

export function useImageLoading(song: Song) {
  const [gradientColors, setGradientColors] = useState<string[]>(["#000", "#000"]);
  const gradientColorsRef = useRef<string[]>(["#000", "#000"]);
  const transitionProgressRef = useRef(0);
  const albumImageRef = useRef<HTMLImageElement | null>(null);
  const artistIconRef = useRef<HTMLImageElement | null>(null);
  const previousAlbumCoverRef = useRef<string | null>(null);
  const previousArtistIconUrlRef = useRef<string | null>(null);
  const songBassBaselineRef = useRef<number>(0);

  // Load album cover and extract colors
  useEffect(() => {
    if (!song.album_cover || previousAlbumCoverRef.current === song.album_cover) return;
    previousAlbumCoverRef.current = song.album_cover;
    songBassBaselineRef.current = 0;

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
        // Darken colors that are too bright for readability
        const readableColors = ensureReadableColors(primaryColors, 180, 0.4);
        if (JSON.stringify(readableColors) !== JSON.stringify(gradientColorsRef.current)) {
          gradientColorsRef.current = readableColors;
          setGradientColors(readableColors);
          transitionProgressRef.current = 0;
        }
      }
    };
  }, [song.album_cover]);

  // Load artist icon
  useEffect(() => {
    const iconUrl = song.artist_icon || song.album_cover;
    if (!iconUrl || previousArtistIconUrlRef.current === iconUrl) return;
    previousArtistIconUrlRef.current = iconUrl;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = iconUrl;
    img.onload = () => {
      artistIconRef.current = img;
    };
  }, [song.artist_icon, song.album_cover]);

  return {
    gradientColors,
    gradientColorsRef,
    transitionProgressRef,
    albumImageRef,
    artistIconRef,
    songBassBaselineRef,
  };
}

