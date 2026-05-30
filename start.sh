#!/usr/bin/env bash
# Launch the app: one server that serves the frontend and proxies Spotify.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d venv ]; then
  echo "ERROR: venv not found. Run ./install.sh first." >&2
  exit 1
fi

if [ ! -d viz-frontend/build ]; then
  echo "ERROR: frontend not built. Run ./install.sh first." >&2
  exit 1
fi

# shellcheck disable=SC1091
source venv/bin/activate
exec python3 spotify-viz.py
