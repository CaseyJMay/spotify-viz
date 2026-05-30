#!/usr/bin/env bash
# One-time setup for mac/Linux: Python venv + deps and the frontend build.
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found. Install Python 3.9+ and retry." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm not found. Install Node.js 18+ and retry." >&2
  exit 1
fi

echo ">>> Creating Python virtual environment (venv/)"
python3 -m venv venv
# shellcheck disable=SC1091
source venv/bin/activate

echo ">>> Installing Python dependencies"
pip install --upgrade pip >/dev/null 2>&1 || true
pip install -r requirements.txt

echo ">>> Building the frontend"
cd viz-frontend
npm ci
npm run build
cd ..

if [ ! -f .env ]; then
  cp .env.example .env
  echo ">>> Created .env from .env.example - edit it and add your SPOTIPY_CLIENT_ID."
fi

echo ""
echo "Setup complete. Next: edit .env with your Spotify client ID, then run ./start.sh"
