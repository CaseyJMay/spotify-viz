export const TOTAL_BARS = 50;
export const API_BASE_URL = "http://localhost:5000";
export const WS_URL = "ws://localhost:5000/ws";

// Canvas drawing constants
export const ALBUM_RADIUS = 150;
export const BAR_WIDTH = 8;
export const MAX_BAR_LENGTH = 100;

// Footer constants
export const FOOTER_HEIGHT = 140;
export const ART_SIZE = 80;
export const ART_X = 24;
export const ART_OFFSET_Y = 13;
export const PROGRESS_BAR_HEIGHT = 3;
export const PROGRESS_BAR_OFFSET_Y = 20;

// Ripple detection constants
export const BUFFER_DURATION = 1000;
export const LONG_TERM_DURATION = 1000;
export const DEBOUNCE_MS = 0;
export const MIN_THRESHOLD = 25;
export const BASS_BUCKET_INDICES = [1, 2, 3, 4, 5];

// Bass thump constants
export const BASS_THUMP_DURATION = 100;
export const BASS_THUMP_SCALE_MIN = 0.9;

// Ripple constants
export const RIPPLE_LIFETIME = 1000;
export const RIPPLE_OPACITY = 0.3;
export const RIPPLE_LINE_WIDTH = 8;

// Piano particle constants
// Piano notes range from ~30 Hz (A0) to ~4200 Hz (C8)
// Buckets: 3-19 cover ~60-4000 Hz (full piano range including lower notes)
export const PIANO_BUCKET_INDICES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
export const PIANO_PARTICLE_LIFETIME = 2000;
export const PIANO_PARTICLE_MIN_THRESHOLD = 15;
export const PIANO_PARTICLE_DEBOUNCE_MS = 50;
export const PIANO_PARTICLE_VELOCITY_MIN = 0.5;
export const PIANO_PARTICLE_VELOCITY_MAX = 1.2;
export const PIANO_PARTICLE_SIZE_MIN = 4;
export const PIANO_PARTICLE_SIZE_MAX = 10;

