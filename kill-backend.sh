#!/bin/bash
# Helper script to kill any remaining backend processes

echo "Killing Spotify visualizer processes..."

# Kill by process name
pkill -f "spotify-viz.py" 2>/dev/null

# Kill by port (if something is still listening)
if lsof -ti:5000 > /dev/null 2>&1; then
    echo "Killing process on port 5000..."
    lsof -ti:5000 | xargs kill -9 2>/dev/null
fi

# Wait a moment
sleep 0.5

# Check if anything is still running
if pgrep -f "spotify-viz.py" > /dev/null; then
    echo "Force killing remaining processes..."
    pkill -9 -f "spotify-viz.py" 2>/dev/null
    sleep 0.5
fi

# Final check
if pgrep -f "spotify-viz.py" > /dev/null; then
    echo "Warning: Some processes may still be running"
    pgrep -f "spotify-viz.py"
else
    echo "All processes killed successfully"
fi

