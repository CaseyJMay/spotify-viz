import { API_BASE_URL } from "../constants";

export function usePlaybackControls() {
  const handlePlayPause = async (isPlaying: boolean) => {
    try {
      const action = isPlaying ? "pause" : "play";
      await fetch(`${API_BASE_URL}/control/${action}`, { method: "POST" });
    } catch (e) {
      // Silently fail - network errors are expected occasionally
    }
  };

  const handleNext = async () => {
    try {
      await fetch(`${API_BASE_URL}/control/next`, { method: "POST" });
    } catch (e) {
      // Silently fail
    }
  };

  const handleBack = async () => {
    try {
      await fetch(`${API_BASE_URL}/control/back`, { method: "POST" });
    } catch (e) {
      // Silently fail
    }
  };

  return { handlePlayPause, handleNext, handleBack };
}

