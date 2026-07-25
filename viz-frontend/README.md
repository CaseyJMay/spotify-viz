# VizJam Frontend

React + TypeScript + Vite frontend for VizJam. Captures Spotify tab audio and
screen metadata locally in the browser and renders the visualizers. For full setup see the
[root README](../README.md).

## Scripts

- `npm run dev` - dev server with hot reload on port 3000 (proxies `/api` to the
  backend on port 5000). The Python backend must be running.
- `npm run build` - static production build into `build/`. Spotify API polling
  is disabled unless `VITE_SPOTIFY_API_ENABLED=true` is set.
- `npm run preview` - preview a production build locally.

## Audio capture

`src/hooks/useAudioCapture.ts` uses `getDisplayMedia` to capture a shared tab's
audio and an `AnalyserNode` to compute the 25 frequency bands in
`src/audio/buckets.ts`. Requires a Chromium-based browser.
