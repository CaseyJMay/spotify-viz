# Quick Start

## 1. Install

```bash
./install.sh
```

Creates the Python venv, installs dependencies, builds the frontend, and writes
a `.env`. Requires Python 3.9+ and Node.js 18+.

## 2. Run

```bash
./start.sh
```

- On first run you're asked whether to connect Spotify (for track info +
  controls). Say no to go straight to audio-only.
- Open the Spotify Web Player (`https://open.spotify.com`) in a Chrome/Edge tab
  and play something.
- In the visualizer tab, click **Start audio** and pick the Web Player tab with
  **"Share tab audio"** checked.

## Spotify track info & controls (optional)

The track card and play/pause/next buttons need Spotify access. The app ships
with a bundled client ID; you must be on its allow-list (Spotify dev mode caps
at 5 users), and playback control needs Spotify Premium. To use your own app,
set `SPOTIPY_CLIENT_ID` in `.env` - see [SPOTIFY_SETUP.md](SPOTIFY_SETUP.md).

Without Spotify access the app runs in audio-only mode (visuals only).

## Notes

- Use Chrome or Edge. Firefox and Safari cannot share tab audio.
- If the visuals stay flat, you likely forgot to check "Share tab audio" in the
  picker - click **Start audio** again and re-share.
- Re-authorize Spotify by deleting `.cache` and re-running `./start.sh`.
- Stop the server with `Ctrl+C`.

## Development

Run the frontend dev server with hot reload (backend must also be running):

```bash
cd viz-frontend && npm run dev
```

Vite proxies `/api` to the backend on port 5000 (see `vite.config.ts`).
