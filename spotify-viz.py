#!/usr/bin/env python3
"""
Spotify Visualizer Backend

Slim metadata/control proxy: polls the Spotify Web API for the currently
playing track and proxies playback controls. Audio capture now happens in the
browser (Web Audio), so there is no PortAudio/loopback dependency here. Also
serves the built frontend so the whole app runs from one server.
"""

import asyncio
import os
import signal
import sys
import threading
import webbrowser

from quart import Quart, jsonify, redirect, request, send_from_directory
from spotipy import Spotify
from spotipy.cache_handler import CacheFileHandler
from spotipy.oauth2 import SpotifyPKCE


def load_env(path: str = ".env") -> None:
    """Minimal .env loader (KEY=value lines); avoids a python-dotenv dependency."""
    if not os.path.isfile(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))


load_env()

# Bundled PKCE client ID. PKCE clients are public (no secret), so this is safe
# to ship. The app runs in Spotify "development mode": up to 5 users, each
# allow-listed by email in the dashboard. Set SPOTIPY_CLIENT_ID in .env to use
# your own app instead.
DEFAULT_CLIENT_ID = "c616b8b7868b412ba56a1f77d28ad209"
CLIENT_ID = os.environ.get("SPOTIPY_CLIENT_ID") or DEFAULT_CLIENT_ID
REDIRECT_URI = os.environ.get("SPOTIPY_REDIRECT_URI", "http://127.0.0.1:5000/callback")
SCOPE = "user-read-currently-playing user-read-playback-state user-modify-playback-state"
PORT = int(os.environ.get("PORT", "5000"))

BUILD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "viz-frontend", "build")

app = Quart(__name__)
spotify: Spotify = None  # set once auth succeeds; None => audio-only mode
spotify_enabled = False
auth_manager: SpotifyPKCE = None  # built in init_auth()
auth_url = None  # cached authorize URL (keeps the PKCE verifier consistent)

current_song = {
    "id": "", "title": "", "artists": "", "album_cover": "",
    "artist_icon": "", "progress": 0, "is_playing": False, "genres": []
}
shutdown_event = asyncio.Event()
fetch_task = None


async def fetch_current_song():
    """Poll Spotify for the currently playing track.

    Always runs; it simply idles until Spotify auth is enabled (which may happen
    after the server starts, once the user finishes the browser auth flow).
    """
    global current_song
    while not shutdown_event.is_set():
        if not spotify_enabled or spotify is None:
            await asyncio.sleep(1)
            continue
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
                            # Genres live on the artist, not the track.
                            artist = spotify.artist(item["artists"][0]["id"])
                            if artist.get("images"):
                                artist_icon = artist["images"][0]["url"]
                            if artist.get("genres"):
                                genres = artist["genres"]
                        except Exception:
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


def get_active_device_id():
    """Return the active device ID, falling back to the first available one."""
    try:
        playback = spotify.current_playback()
        if playback and playback.get("device") and playback["device"].get("id"):
            return playback["device"]["id"]

        devices = spotify.devices()
        if devices and devices.get("devices") and len(devices["devices"]) > 0:
            return devices["devices"][0]["id"]

        return None
    except Exception:
        return None


@app.route("/api/song")
async def get_song():
    # `available` lets the frontend hide the track card/controls in audio-only mode.
    return jsonify({**current_song, "available": spotify_enabled})


@app.route("/api/control/<action>", methods=["POST"])
async def control_playback(action):
    if not spotify_enabled:
        return jsonify({"status": "error", "error": "Spotify not connected"}), 503
    try:
        device_id = get_active_device_id()

        if action == "play":
            spotify.start_playback(device_id=device_id) if device_id else spotify.start_playback()
        elif action == "pause":
            spotify.pause_playback()
        elif action == "next":
            spotify.next_track()
        elif action == "back":
            spotify.previous_track()
        else:
            return jsonify({"error": "Invalid action"}), 400

        return jsonify({"status": "ok", "action": action}), 200
    except Exception as e:
        error_msg = str(e)
        if "404" in error_msg or "Not found" in error_msg:
            return jsonify({
                "status": "error",
                "error": "No active device found. Start playing music on a Spotify device first."
            }), 404
        return jsonify({"status": "error", "error": error_msg}), 500


def _success_page(heading: str, body: str, redirect_after: bool = False) -> str:
    extra = "<script>setTimeout(function(){location.href='/'},1200)</script>" if redirect_after else ""
    return (
        "<html><body style=\"font-family:sans-serif;background:#111;color:#eee;"
        "text-align:center;padding-top:80px\">"
        f"<h1>{heading}</h1><p>{body}</p>"
        "<p><a style=\"color:#1db954\" href=\"/\">Continue</a></p>"
        f"{extra}</body></html>"
    )


@app.route("/login")
async def login():
    """Kick off (or restart) the Spotify authorization flow."""
    if auth_manager is None or spotify_enabled:
        return redirect("/")
    return redirect(auth_url or auth_manager.get_authorize_url())


@app.route("/callback")
async def callback():
    """OAuth redirect target. Exchanges the code and enables Spotify live."""
    error = request.args.get("error")
    if error:
        return _success_page(
            "Spotify authorization failed",
            f"{error}. The visualizer still works in audio-only mode.",
        ), 400

    code = request.args.get("code")
    if not code or auth_manager is None:
        return redirect("/")

    try:
        auth_manager.get_access_token(code)
        _enable_spotify()
        print(">>> Spotify connected: track info and controls enabled.", flush=True)
        return _success_page(
            "Connected to Spotify",
            "Returning to the visualizer\u2026",
            redirect_after=True,
        )
    except Exception as e:
        return _success_page(
            "Authorization error",
            f"{e}. The visualizer still works in audio-only mode.",
        ), 400


@app.route("/")
@app.route("/<path:path>")
async def serve_frontend(path: str = ""):
    """Serve the built frontend, with SPA fallback to index.html."""
    target = os.path.join(BUILD_DIR, path)
    if path and os.path.isfile(target):
        return await send_from_directory(BUILD_DIR, path)
    return await send_from_directory(BUILD_DIR, "index.html")


@app.before_serving
async def startup():
    global fetch_task
    fetch_task = asyncio.create_task(fetch_current_song())


@app.after_serving
async def shutdown():
    global fetch_task
    shutdown_event.set()
    if fetch_task and not fetch_task.done():
        fetch_task.cancel()
        try:
            await fetch_task
        except asyncio.CancelledError:
            pass


def signal_handler(signum, frame):
    print("\n\n>>> Shutting down <<<", flush=True)
    os._exit(0)


def _enable_spotify():
    global spotify, spotify_enabled
    spotify = Spotify(auth_manager=auth_manager)
    spotify_enabled = True


def init_auth():
    """Set up PKCE auth.

    Returns the Spotify authorize URL if interactive auth is needed, or None if a
    cached token already works. The actual code exchange happens later in the
    /callback route (our own server), which is far more reliable than spotipy's
    one-shot local callback server.
    """
    global auth_manager, auth_url

    cache_handler = CacheFileHandler()
    auth_manager = SpotifyPKCE(
        client_id=CLIENT_ID,
        redirect_uri=REDIRECT_URI,
        scope=SCOPE,
        open_browser=False,
        cache_handler=cache_handler,
    )

    # A cached token may be stale or from an older auth flow (e.g. a non-PKCE
    # token won't refresh under PKCE). Treat any cache failure as "no token"
    # and clear it so we can re-authorize cleanly instead of silently degrading.
    token_info = None
    try:
        token_info = auth_manager.validate_token(cache_handler.get_cached_token())
    except Exception:
        try:
            os.remove(cache_handler.cache_path)
        except OSError:
            pass

    if token_info:
        _enable_spotify()
        print(">>> Spotify connected: track info and controls enabled.", flush=True)
        return None

    # Generate the URL once so the PKCE verifier stays consistent with /callback.
    auth_url = auth_manager.get_authorize_url()
    return auth_url


def main():
    if not os.path.isdir(BUILD_DIR):
        print("ERROR: frontend build not found. Run ./install.sh (or `npm run build` in viz-frontend) first.", flush=True)
        sys.exit(1)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    pending_auth_url = init_auth()

    app_url = f"http://127.0.0.1:{PORT}"
    # If Spotify isn't connected yet, open the authorize URL; after approving,
    # /callback returns to the app. Otherwise just open the app.
    open_url = pending_auth_url or app_url
    threading.Timer(1.0, lambda: webbrowser.open(open_url)).start()

    print(f">>> Spotify Visualizer running at {app_url}", flush=True)
    if pending_auth_url:
        print(">>> Spotify not connected: a browser tab will open to authorize.", flush=True)
        print(f">>> For audio-only, just open {app_url} (or visit {app_url}/login later to connect).", flush=True)

    app.run(port=PORT, use_reloader=False)


if __name__ == "__main__":
    main()
