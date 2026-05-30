import { useEffect, useState } from "react";
import { Song } from "../types";
import { API_BASE_URL } from "../constants";

const POLL_INTERVAL_MS = 1000;

// Track metadata only. Audio bands now come from useAudioCapture (browser-side
// Web Audio), so this just polls the backend for the currently playing song.
export function useSpotifyData() {
  const [song, setSong] = useState<Song>({
    title: "No Title",
    artists: "Unknown Artist",
    album_cover: "",
    progress: 0,
    is_playing: false,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  // Whether Spotify metadata/controls are connected. False => audio-only mode,
  // so the UI hides the track card and playback controls.
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/song`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data) return;
        setAvailable(!!data.available);
        setSong({
          title: data.title || "No Title",
          artists: data.artists || "Unknown Artist",
          album_cover: data.album_cover || "",
          progress: data.progress,
          is_playing: data.is_playing,
          artist_icon: data.artist_icon,
          genres: data.genres || [],
        });
        setIsPlaying(!!data.is_playing);
      } catch {
        // Backend unreachable: drop to audio-only rather than show stale controls.
        if (!cancelled) setAvailable(false);
      }
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { song, isPlaying, available };
}
