import { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import { Song, Bands, WebSocketData } from "../types";
import { WS_URL } from "../constants";

export function useSpotifyData() {
  const [song, setSong] = useState<Song>({
    title: "No Title",
    artists: "Unknown Artist",
    album_cover: "",
    progress: 0,
    is_playing: false,
  });
  const [bands, setBands] = useState<Bands>({});
  const [isPlaying, setIsPlaying] = useState(false);

  const { lastJsonMessage } = useWebSocket(WS_URL, {
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (lastJsonMessage) {
      const data = lastJsonMessage as WebSocketData;
      if (data.song) {
        setSong((prev) => ({
          title: data.song.title || "No Title",
          artists: data.song.artists || "Unknown Artist",
          album_cover: data.song.album_cover || "",
          progress: data.song.progress,
          is_playing: data.song.is_playing,
          artist_icon: data.song.artist_icon,
          genres: data.song.genres || [],
        }));
        setIsPlaying(data.song.is_playing);
      }
      if (data.bands) {
        setBands(data.bands);
      }
    }
  }, [lastJsonMessage]);

  return { song, bands, isPlaying };
}

