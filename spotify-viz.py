#!/usr/bin/env python3
"""
Spotify Visualizer Backend
Simple version - uses microphone input
"""

import asyncio
import signal
import sys
import os
from quart import Quart, websocket, request, jsonify
from spotipy import Spotify
from spotipy.oauth2 import SpotifyOAuth
import numpy as np
import sounddevice as sd

# Configuration
CLIENT_ID = "c616b8b7868b412ba56a1f77d28ad209"
CLIENT_SECRET = "bb39e133cc834fa1b46c0b70fcc6fc08"
REDIRECT_URI = "http://127.0.0.1:5000/callback"
SCOPE = "user-read-currently-playing user-read-playback-state user-modify-playback-state"

spotify = Spotify(auth_manager=SpotifyOAuth(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    redirect_uri=REDIRECT_URI,
    scope=SCOPE
))

app = Quart(__name__)

@app.after_request
async def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

# Global State
current_song = {
    "id": "", "title": "", "artists": "", "album_cover": "",
    "artist_icon": "", "progress": 0, "is_playing": False, "genres": []
}
frequency_bands = {f"bucket{i}": 0 for i in range(1, 26)}
shutdown_event = asyncio.Event()
stream = None
fetch_task = None

BUCKET_RANGES = [
    (20, 40), (40, 60), (60, 90), (90, 120), (120, 160),
    (160, 200), (200, 250), (250, 315), (315, 400), (400, 500),
    (500, 630), (630, 800), (800, 1000), (1000, 1250), (1250, 1600),
    (1600, 2000), (2000, 2500), (2500, 3150), (3150, 4000), (4000, 5000),
    (5000, 6300), (6300, 8000), (8000, 10000), (10000, 12500), (12500, 20000)
]

BUCKET_MULTIPLIERS = [
    1.0, 1.0, 1.2, 1.2, 1.5, 1.5, 1.5, 1.8, 1.8, 2.0,
    2.0, 2.2, 2.2, 2.5, 2.5, 2.8, 3.0, 3.0, 3.5, 4.0,
    4.5, 5.0, 5.5, 6.0, 6.5
]

# Audio Processing
# Cache freq_bins calculation (only depends on block size)
_freq_bins_cache = None
_sample_rate = 44100

def audio_callback(indata, frames, time, status):
    """Process audio and calculate frequency bands."""
    global frequency_bands, _freq_bins_cache
    
    audio_data = np.frombuffer(indata, dtype=np.float32)
    fft_data = np.fft.rfft(audio_data)
    fft_magnitude = np.abs(fft_data)
    
    # Cache freq_bins calculation (only recalc if block size changes)
    if _freq_bins_cache is None or len(_freq_bins_cache) != len(audio_data):
        _freq_bins_cache = np.fft.rfftfreq(len(audio_data), d=1/_sample_rate)
    
    freq_bins = _freq_bins_cache
    
    for i, (low, high) in enumerate(BUCKET_RANGES, start=1):
        mask = (freq_bins >= low) & (freq_bins < high)
        if np.any(mask):
            raw_value = fft_magnitude[mask].mean()
            frequency_bands[f"bucket{i}"] = raw_value * BUCKET_MULTIPLIERS[i - 1]
        else:
            frequency_bands[f"bucket{i}"] = 0

def init_audio():
    """Initialize audio input stream - uses default microphone."""
    global stream
    try:
        stream = sd.InputStream(
            callback=audio_callback,
            channels=2,
            samplerate=48000,
            blocksize=1024
        )
        stream.start()
        return True
    except Exception as e:
        stream = None
        return False

# Spotify API
async def fetch_current_song():
    """Fetch currently playing song from Spotify."""
    global current_song
    while not shutdown_event.is_set():
        try:
            track = spotify.current_user_playing_track()
            if track and track.get("item"):
                item = track["item"]
                new_id = item["id"]
                
                if new_id != current_song.get("id", ""):
                    artist_icon = ""
                    genres = []
                    if item["artists"]:
                        try:
                            # Get genres from the primary artist (tracks don't have genres, artists do)
                            artist = spotify.artist(item["artists"][0]["id"])
                            if artist.get("images"):
                                artist_icon = artist["images"][0]["url"]
                            if artist.get("genres"):
                                genres = artist["genres"]
                        except:
                            pass
                    
                    current_song.update({
                        "id": new_id,
                        "title": item["name"],
                        "artists": ", ".join([a["name"] for a in item["artists"]]),
                        "album_cover": item["album"]["images"][1]["url"] if len(item["album"]["images"]) > 1 else "",
                        "artist_icon": artist_icon,
                        "genres": genres,
                    })
                
                progress_ms = track.get("progress_ms", 0)
                duration_ms = item.get("duration_ms", 1)
                current_song["progress"] = progress_ms / duration_ms
                current_song["is_playing"] = track.get("is_playing", False)
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            if "NameResolutionError" not in str(e) and "Connection" not in str(e):
                pass
        
        await asyncio.sleep(1)

# API Endpoints
@app.websocket("/ws")
async def websocket_endpoint():
    """WebSocket for real-time data."""
    while not shutdown_event.is_set():
        try:
            # Only convert to float once per update
            safe_bands = {k: float(v) for k, v in frequency_bands.items()}
            await websocket.send_json({"song": current_song, "bands": safe_bands})
            await asyncio.sleep(0.08)  # Slightly reduced rate for better performance
        except (asyncio.CancelledError, Exception):
            break

@app.route("/callback")
async def oauth_callback():
    """Spotify OAuth callback."""
    error = request.args.get('error')
    if error:
        return f"<html><body><h1>Error: {error}</h1></body></html>", 400
    return """
    <html><body>
        <h1>✓ Authorized!</h1>
        <p>You can close this window.</p>
        <script>setTimeout(() => window.close(), 2000);</script>
    </body></html>
    """, 200

@app.route("/control/<action>", methods=["POST"])
async def control_playback(action):
    """Control Spotify playback."""
    try:
        actions = {
            "play": spotify.start_playback,
            "pause": spotify.pause_playback,
            "next": spotify.next_track,
            "back": spotify.previous_track
        }
        if action not in actions:
            return jsonify({"error": "Invalid action"}), 400
        actions[action]()
        return jsonify({"status": "ok", "action": action}), 200
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

# Lifecycle
@app.before_serving
async def startup():
    global fetch_task
    fetch_task = asyncio.create_task(fetch_current_song())

@app.after_serving
async def shutdown():
    global stream, fetch_task
    shutdown_event.set()
    
    if fetch_task and not fetch_task.done():
        fetch_task.cancel()
        try:
            await fetch_task
        except asyncio.CancelledError:
            pass
    
    if stream:
        try:
            stream.stop()
            stream.close()
        except:
            pass

def cleanup():
    global stream
    if stream:
        try:
            stream.stop()
            stream.close()
        except:
            pass

def signal_handler(signum, frame):
    print("\n\n>>> Ctrl+C received! <<<", flush=True)
    cleanup()
    os._exit(0)

# Main
if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    signal.siginterrupt(signal.SIGINT, True)
    
    init_audio()
    
    try:
        app.run(port=5000, use_reloader=False)
    except KeyboardInterrupt:
        cleanup()
    finally:
        cleanup()
