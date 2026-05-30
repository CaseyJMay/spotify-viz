# Visualizer Frontend

React + TypeScript + Vite frontend for the Spotify Visualizer. Captures audio in
the browser (Web Audio) and renders the visualizers. For full setup see the
[root README](../README.md).

## Scripts

- `npm run dev` - dev server with hot reload on port 3000 (proxies `/api` to the
  backend on port 5000). The Python backend must be running.
- `npm run build` - production build into `build/` (served by the backend).
- `npm run preview` - preview a production build locally.

## Audio capture

`src/hooks/useAudioCapture.ts` uses `getDisplayMedia` to capture a shared tab's
audio and an `AnalyserNode` to compute the 25 frequency bands in
`src/audio/buckets.ts`. Requires a Chromium-based browser.
