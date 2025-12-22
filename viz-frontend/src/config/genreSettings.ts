import { Config } from "../types";

/**
 * Genre-based default settings configuration.
 * These settings are applied automatically when a song's genre matches.
 * Users can still manually override these settings.
 */
export interface GenreSettings {
  ripples: boolean;
  bassThump: boolean;
  pianoParticles: boolean;
}

export const GENRE_SETTINGS: Record<string, GenreSettings> = {
  // Classical/Neoclassical genres - no bass thump, no ripples, but piano particles
  classical: { ripples: false, bassThump: false, pianoParticles: true },
  neoclassical: { ripples: false, bassThump: false, pianoParticles: true },
  "neoclassical darkwave": { ripples: false, bassThump: false, pianoParticles: true },
  opera: { ripples: false, bassThump: false, pianoParticles: false },
  "classical performance": { ripples: false, bassThump: false, pianoParticles: true },
  
  // Acoustic - no bass thump, no ripples
  acoustic: { ripples: false, bassThump: false, pianoParticles: false },
  "acoustic pop": { ripples: false, bassThump: false, pianoParticles: false },
  "acoustic rock": { ripples: false, bassThump: false, pianoParticles: false },
  
  // Jazz - no bass thump, no ripples
  jazz: { ripples: false, bassThump: false, pianoParticles: false },
  "jazz fusion": { ripples: false, bassThump: false, pianoParticles: false },
  "smooth jazz": { ripples: false, bassThump: false, pianoParticles: false },
  bebop: { ripples: false, bassThump: false, pianoParticles: false },
  swing: { ripples: false, bassThump: false, pianoParticles: false },
  
  // Piano - no bass thump, no ripples, but piano particles
  piano: { ripples: false, bassThump: false, pianoParticles: true },
  "piano rock": { ripples: false, bassThump: false, pianoParticles: true },
  
  // New Age - similar to piano, gentle particles
  "new age": { ripples: false, bassThump: false, pianoParticles: true },
  newage: { ripples: false, bassThump: false, pianoParticles: true },
  
  // Folk - no ripples
  folk: { ripples: false, bassThump: false, pianoParticles: false },
  "folk rock": { ripples: false, bassThump: false, pianoParticles: false },
  "indie folk": { ripples: false, bassThump: false, pianoParticles: false },
  
  // Ambient/Electronic - no ripples
  ambient: { ripples: false, bassThump: false, pianoParticles: false },
  "ambient pop": { ripples: false, bassThump: false, pianoParticles: false },
  
  // Electronic/Dance - no ripples, bass thump enabled
  electronic: { ripples: false, bassThump: true, pianoParticles: false },
  edm: { ripples: false, bassThump: true, pianoParticles: false },
  house: { ripples: false, bassThump: true, pianoParticles: false },
  techno: { ripples: false, bassThump: true, pianoParticles: false },
  trance: { ripples: false, bassThump: true, pianoParticles: false },
  dubstep: { ripples: false, bassThump: true, pianoParticles: false },
  "drum and bass": { ripples: false, bassThump: true, pianoParticles: false },
  
  // Rock/Metal - no ripples, bass thump enabled
  rock: { ripples: false, bassThump: true, pianoParticles: false },
  "hard rock": { ripples: false, bassThump: true, pianoParticles: false },
  metal: { ripples: false, bassThump: true, pianoParticles: false },
  "heavy metal": { ripples: false, bassThump: true, pianoParticles: false },
  punk: { ripples: false, bassThump: true, pianoParticles: false },
  
  // Hip-Hop/Rap - no ripples, bass thump enabled
  hip: { ripples: false, bassThump: true, pianoParticles: false },
  "hip hop": { ripples: false, bassThump: true, pianoParticles: false },
  rap: { ripples: false, bassThump: true, pianoParticles: false },
  trap: { ripples: false, bassThump: true, pianoParticles: false },
  
  // Pop - no ripples, bass thump enabled
  pop: { ripples: false, bassThump: true, pianoParticles: false },
  "dance pop": { ripples: false, bassThump: true, pianoParticles: false },
  "electro pop": { ripples: false, bassThump: true, pianoParticles: false },
  
  // R&B/Soul - no ripples, bass thump enabled
  "r&b": { ripples: false, bassThump: true, pianoParticles: false },
  soul: { ripples: false, bassThump: true, pianoParticles: false },
  funk: { ripples: false, bassThump: true, pianoParticles: false },
};

/**
 * Get default settings for a given genre.
 * Returns null if no specific settings are defined for the genre.
 */
export function getGenreSettings(genres: string[]): GenreSettings | null {
  if (!genres || genres.length === 0) {
    return null;
  }

  // Normalize genres to lowercase for matching
  const normalizedGenres = genres.map((g) => g.toLowerCase().trim());

  // Check for exact matches first
  for (const genre of normalizedGenres) {
    if (GENRE_SETTINGS[genre]) {
      console.log(`[Genre Settings] Exact match found: "${genre}"`);
      return GENRE_SETTINGS[genre];
    }
  }

  // Check for partial matches (e.g., "jazz fusion" contains "jazz")
  for (const genre of normalizedGenres) {
    for (const [key, settings] of Object.entries(GENRE_SETTINGS)) {
      // Check if genre contains key or key contains genre
      if (genre.includes(key) || key.includes(genre)) {
        console.log(`[Genre Settings] Partial match: "${genre}" matches "${key}"`);
        return settings;
      }
    }
  }

  console.log(`[Genre Settings] No match found for genres:`, normalizedGenres);
  return null;
}

/**
 * Default settings when no genre match is found.
 */
export const DEFAULT_SETTINGS: GenreSettings = {
  ripples: false,
  bassThump: false,
  pianoParticles: false,
};

