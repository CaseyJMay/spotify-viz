import { useEffect, useRef } from "react";
import { Song, Config } from "../types";
import { getGenreSettings, DEFAULT_SETTINGS } from "../config/genreSettings";

interface UseGenreSettingsProps {
  song: Song;
  config: Config;
  onConfigChange: (updates: Partial<Config>) => void;
  autoApply: boolean;
}

/**
 * Hook to apply genre-based default settings when the song changes.
 * Only applies settings if autoApply is true and the song's genre matches a configuration.
 * 
 * @param song - Current song with genres
 * @param config - Current config state
 * @param onConfigChange - Callback to update config
 * @param autoApply - Whether to automatically apply genre-based settings
 */
export function useGenreSettings({
  song,
  config,
  onConfigChange,
  autoApply,
}: UseGenreSettingsProps) {
  const lastSongIdRef = useRef<string>("");
  const userOverridesRef = useRef<Partial<Config>>({});
  const isApplyingGenreSettingsRef = useRef(false);
  const configRef = useRef(config);

  // Keep config ref in sync
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    // Only apply if auto-apply is enabled and song has changed
    if (!autoApply) {
      return;
    }

    // Create a unique ID for the song (using title + artists as fallback if no ID)
    const songId = song.title + song.artists;
    
    // Only apply settings when song changes
    if (songId === lastSongIdRef.current) {
      return;
    }

    lastSongIdRef.current = songId;
    isApplyingGenreSettingsRef.current = true;

    // Debug logging
    console.log("[Genre Settings] Song changed:", {
      title: song.title,
      artists: song.artists,
      genres: song.genres || [],
    });

    // Get genre-based settings
    const genreSettings = song.genres && song.genres.length > 0
      ? getGenreSettings(song.genres)
      : null;

    console.log("[Genre Settings] Genre settings result:", genreSettings);

    const currentConfig = configRef.current;

    if (genreSettings) {
      // Apply genre-based settings, but respect user overrides
      const newConfig: Partial<Config> = {
        ripples: userOverridesRef.current.ripples ?? genreSettings.ripples,
        bassThump: userOverridesRef.current.bassThump ?? genreSettings.bassThump,
        pianoParticles: userOverridesRef.current.pianoParticles ?? genreSettings.pianoParticles,
      };

      console.log("[Genre Settings] Applying config:", newConfig, "Current:", currentConfig);

      // Only update if different from current config
      if (
        newConfig.ripples !== currentConfig.ripples ||
        newConfig.bassThump !== currentConfig.bassThump ||
        newConfig.pianoParticles !== currentConfig.pianoParticles
      ) {
        onConfigChange(newConfig);
      }
    } else {
      // No genre match, apply defaults
      const newConfig: Partial<Config> = {
        ripples: userOverridesRef.current.ripples ?? DEFAULT_SETTINGS.ripples,
        bassThump: userOverridesRef.current.bassThump ?? DEFAULT_SETTINGS.bassThump,
        pianoParticles: userOverridesRef.current.pianoParticles ?? DEFAULT_SETTINGS.pianoParticles,
      };

      console.log("[Genre Settings] No match, applying defaults:", newConfig);

      if (
        newConfig.ripples !== currentConfig.ripples ||
        newConfig.bassThump !== currentConfig.bassThump ||
        newConfig.pianoParticles !== currentConfig.pianoParticles
      ) {
        onConfigChange(newConfig);
      }
    }

    // Reset flag after a short delay to allow state updates
    setTimeout(() => {
      isApplyingGenreSettingsRef.current = false;
    }, 100);
  }, [song.title, song.artists, song.genres, autoApply, onConfigChange]);

  return {
    /**
     * Record a user override so it persists across genre changes.
     * Call this when the user manually changes settings.
     */
    recordOverride: (updates: Partial<Config>) => {
      // Only record if this is a manual change (not from genre settings)
      if (!isApplyingGenreSettingsRef.current) {
        userOverridesRef.current = { ...userOverridesRef.current, ...updates };
      }
    },
    /**
     * Clear all user overrides and reapply genre settings
     */
    clearOverrides: () => {
      userOverridesRef.current = {};
      // Trigger reapplication by resetting last song ID
      lastSongIdRef.current = "";
    },
  };
}

