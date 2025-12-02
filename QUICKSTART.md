# Quick Start Guide

## Setup

1. **Install system dependencies** (Linux only, one-time setup):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y portaudio19-dev
   
   # Fedora/RHEL
   sudo dnf install -y portaudio-devel
   
   # Arch Linux
   sudo pacman -S portaudio
   ```

2. **Create and activate virtual environment** (if not already done):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup audio loopback** (if needed):
   ```bash
   ./setup-audio-loopback.sh
   ```
   Or simply run: `pw-loopback` (PipeWire) or `pactl load-module module-loopback` (PulseAudio)

## Running the App

### Option 1: Use the helper script (easiest)
```bash
./run.sh
```

### Option 2: Manual activation
```bash
source venv/bin/activate
python3 spotify-viz.py
```

### Option 3: Frontend (in separate terminal)
```bash
cd viz-frontend
npm install
npm start
```

## Deactivating Virtual Environment

When you're done, deactivate the virtual environment:
```bash
deactivate
```

## Notes

- The virtual environment keeps all Python dependencies isolated to this project
- Always activate the venv before running the app: `source venv/bin/activate`
- The `run.sh` script automatically activates the venv for you

