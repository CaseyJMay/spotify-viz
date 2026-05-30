# Spotify Visualizer

A real-time audio visualizer for Spotify. It shows the currently playing track
and animates to a live frequency analysis of the music.

Audio is captured **in the browser** (Web Audio), so there is no virtual audio
device, loopback tool (helvum / BlackHole), or PortAudio to install. The whole
app runs from a single local server.

## Requirements

- macOS or Linux
- Python 3.9+
- Node.js 18+
- A Chromium-based browser (Chrome or Edge) - Firefox and Safari cannot share
  tab audio
- (Optional) Spotify access for the track card + playback controls

## Setup

```bash
git clone <your-repo-url>
cd spotify-viz
./install.sh
```

This creates a Python venv, installs dependencies, builds the frontend, and
creates a `.env`. No Spotify configuration is required to get started.

## Running

```bash
./start.sh
```

1. In a Chrome/Edge tab, open the **Spotify Web Player**
   (`https://open.spotify.com`) and start playing music.
2. In the visualizer tab, click **Start audio**.
3. In the share picker, choose the Spotify Web Player tab and make sure
   **"Share tab audio"** is checked.

The visualizer reacts to the music in real time.

## Spotify track info & controls (optional)

The visualizer works with audio alone. To also show the currently playing track
(title, art, progress) and use the in-app play/pause/next buttons, connect
Spotify. On first run `./start.sh` asks whether to authorize; say yes and approve
in the browser. If you skip it or it fails, the app runs in **audio-only mode**.

This requires being added to the bundled app's allow-list (Spotify development
mode allows up to 5 users). Playback control also requires Spotify Premium.

To use your **own** Spotify app instead of the bundled one, create an app at the
[Spotify Developer Dashboard](https://developer.spotify.com/dashboard), register
the redirect URI `http://127.0.0.1:5000/callback`, and set `SPOTIPY_CLIENT_ID`
in `.env`. See [SPOTIFY_SETUP.md](SPOTIFY_SETUP.md).

## Features

- Real-time 25-band frequency visualization (~60 fps, browser-side FFT)
- Currently playing track display with album art and artist info
- Playback controls (play, pause, next, previous)
- Multiple visualizer styles and genre-based presets

## Project Structure

- `spotify-viz.py` - Python backend: Spotify metadata/control proxy; serves the frontend
- `viz-frontend/` - React/TypeScript frontend (audio capture + visualizers)
- `install.sh` / `start.sh` - setup and launch
- `requirements.txt` - Python dependencies
- `.env.example` - configuration template

## Roadmap

- Capture audio directly from the native Spotify desktop app via system-audio
  sharing (Chrome 141+ / macOS 14.2+).
