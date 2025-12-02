# Spotify Visualizer

A real-time audio visualizer for Spotify that displays frequency bands and currently playing track information.

## Prerequisites

### System Dependencies (Linux)

Install PortAudio library (required for audio capture):

```bash
# Ubuntu/Debian
sudo apt-get install -y portaudio19-dev

# Fedora/RHEL
sudo dnf install -y portaudio-devel

# Arch Linux
sudo pacman -S portaudio
```

### Python Dependencies

All Python dependencies are managed in a virtual environment. See [QUICKSTART.md](QUICKSTART.md) for setup instructions.

## Quick Start

1. Install system dependencies (see above)
2. Set up virtual environment: `python3 -m venv venv`
3. Install Python packages: `pip install -r requirements.txt`
4. Run the app: `./run.sh`
5. Start the frontend: `cd viz-frontend && npm install && npm start`

For detailed instructions, see [QUICKSTART.md](QUICKSTART.md).

## Features

- Real-time frequency band visualization (25 bands)
- Currently playing track display
- Album cover and artist information
- Playback controls (play, pause, next, previous)
- Cross-platform audio device detection (macOS BlackHole, Linux PipeWire/PulseAudio)

## Platform Notes

### macOS
- Uses BlackHole virtual audio device (install from: https://github.com/ExistentialAudio/BlackHole)

### Linux
- Works with PipeWire (default on many modern distributions)
- Also supports PulseAudio
- Automatically detects monitor/loopback devices
- Run `pw-loopback` or `pactl load-module module-loopback` if needed

## Project Structure

- `spotify-viz.py` - Main Python backend server
- `viz-frontend/` - React/TypeScript frontend
- `venv/` - Python virtual environment (created during setup)
- `requirements.txt` - Python dependencies
- `run.sh` - Helper script to run the app with venv

