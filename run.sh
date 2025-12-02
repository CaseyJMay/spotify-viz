#!/bin/bash
# Helper script to run the Spotify visualizer with virtual environment

# Trap signals to ensure cleanup
cleanup() {
    echo ""
    echo "Shutting down..."
    # Kill any child processes
    jobs -p | xargs -r kill 2>/dev/null
    # Force kill if needed
    pkill -P $$ 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Activate virtual environment
source venv/bin/activate

# Run the app - signals should be passed through
python3 spotify-viz.py

