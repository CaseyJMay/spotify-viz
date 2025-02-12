import asyncio
from quart import Quart, websocket
from spotipy import Spotify
from spotipy.oauth2 import SpotifyOAuth
import numpy as np
import sounddevice as sd

# Spotify Developer credentials
CLIENT_ID = "c616b8b7868b412ba56a1f77d28ad209"
CLIENT_SECRET = "bb39e133cc834fa1b46c0b70fcc6fc08"
REDIRECT_URI = "http://localhost:8888/callback"
SCOPE = "user-read-currently-playing user-read-playback-state"

# Initialize Spotify client
spotify = Spotify(auth_manager=SpotifyOAuth(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    redirect_uri=REDIRECT_URI,
    scope=SCOPE
))

# Quart app
app = Quart(__name__)

# Global variables for audio data and song metadata.
# We now add an "id" field to uniquely identify the current song.
current_song = {
    "id": "",
    "title": "",
    "artists": "",
    "album_cover": "",
    "artist_icon": "",  # New key for the artist icon URL
    "progress": 0
}
frequency_bands = {f"bucket{i}": 0 for i in range(1, 26)}  # Initialize with 25 buckets

# Define frequency ranges for 25 buckets.
bucket_ranges = [
    (20, 40), (40, 60), (60, 90), (90, 120), (120, 160),    # Sub-bass and bass
    (160, 200), (200, 250), (250, 315), (315, 400), (400, 500), # Low midrange
    (500, 630), (630, 800), (800, 1000), (1000, 1250), (1250, 1600), # Midrange
    (1600, 2000), (2000, 2500), (2500, 3150), (3150, 4000), (4000, 5000), # Upper midrange
    (5000, 6300), (6300, 8000), (8000, 10000), (10000, 12500), (12500, 20000) # Presence and brilliance
]

# Apply multipliers to balance visualization.
bucket_multipliers = [
    1.0, 1.0, 1.2, 1.2, 1.5,  # Sub-bass and bass
    1.5, 1.5, 1.8, 1.8, 2.0,  # Low midrange
    2.0, 2.2, 2.2, 2.5, 2.5,  # Midrange
    2.8, 3.0, 3.0, 3.5, 4.0,  # Upper midrange
    4.5, 5.0, 5.5, 6.0, 6.5   # Presence and brilliance
]

# Audio callback for FFT with multipliers.
def audio_callback(indata, frames, time, status):
    global frequency_bands
    audio_data = np.frombuffer(indata, dtype=np.float32)
    fft_data = np.fft.rfft(audio_data)
    fft_magnitude = np.abs(fft_data)
    sample_rate = 44100
    freq_bins = np.fft.rfftfreq(len(audio_data), d=1/sample_rate)
    for i, (low, high) in enumerate(bucket_ranges, start=1):
        bucket_key = f"bucket{i}"
        mask = (freq_bins >= low) & (freq_bins < high)
        if np.any(mask):
            raw_value = fft_magnitude[mask].mean()
            frequency_bands[bucket_key] = raw_value * bucket_multipliers[i - 1]
        else:
            frequency_bands[bucket_key] = 0

BLACKHOLE_INDEX = 0  # BlackHole 2ch is device index 0

# Ensure sounddevice listens to BlackHole.
stream = sd.InputStream(device=BLACKHOLE_INDEX, callback=audio_callback, channels=2, samplerate=48000)
stream.start()

# Fetch currently playing song and update progress.
async def fetch_current_song():
    global current_song
    while True:
        try:
            current_track = spotify.current_user_playing_track()
            if current_track and current_track["item"]:
                new_id = current_track["item"]["id"]
                track_name = current_track["item"]["name"]
                artists = ", ".join([artist["name"] for artist in current_track["item"]["artists"]])
                album_cover = current_track["item"]["album"]["images"][1]["url"]

                progress_ms = current_track.get("progress_ms", 0)
                duration_ms = current_track["item"].get("duration_ms", 1)
                progress = progress_ms / duration_ms

                # Only fetch a new artist icon if the song has changed.
                if new_id != current_song.get("id", ""):
                    # --- Fetch artist icon using the first artist's ID ---
                    first_artist = current_track["item"]["artists"][0]
                    artist_icon = ""
                    if first_artist.get("id"):
                        try:
                            artist_details = spotify.artist(first_artist["id"])
                            if artist_details and artist_details.get("images"):
                                # Use the first available image as the artist icon.
                                artist_icon = artist_details["images"][0]["url"]
                        except Exception as e:
                            print(f"Error fetching artist details: {e}")
                    
                    # Update entire song data.
                    current_song["id"] = new_id
                    current_song["title"] = track_name
                    current_song["artists"] = artists
                    current_song["album_cover"] = album_cover
                    current_song["progress"] = progress
                    current_song["artist_icon"] = artist_icon
                else:
                    # Same song, just update progress.
                    current_song["progress"] = progress
        except Exception as e:
            print(f"Error fetching song info: {e}")
        await asyncio.sleep(1)

# WebSocket endpoint.
@app.websocket("/ws")
async def song_data():
    while True:
        safe_bands = {key: float(value) for key, value in frequency_bands.items()}
        await websocket.send_json({"song": current_song, "bands": safe_bands})
        await asyncio.sleep(0.075)  # 20Hz updates

# Start background task.
@app.before_serving
async def startup():
    asyncio.create_task(fetch_current_song())

# Run Quart app.
if __name__ == "__main__":
    app.run(port=5000)
