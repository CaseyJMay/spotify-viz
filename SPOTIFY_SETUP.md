# Spotify Setup (optional)

The visualizer runs without Spotify (audio-only). Spotify access only adds the
now-playing track card and the in-app playback controls.

## How access works

The app ships with a **bundled** PKCE client ID, so most users don't configure
anything. Because Spotify runs the app in **development mode**, two limits apply:

- Up to **5 users** total, each added by email to the app's allow-list in the
  dashboard. Not on the list - you stay in audio-only mode.
- The app owner must keep **Spotify Premium**, and **playback control** requires
  the listening user to have Premium too.

On first `./start.sh`, you're asked whether to authorize. Approve in the browser;
the token caches to `.cache` (gitignored) so later runs don't prompt. To
re-authorize, delete `.cache` and run again.

## Using your own Spotify app

To avoid the shared allow-list (e.g. for your own 5 users), create your own app:

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   and click **Create app**. Copy the **Client ID** (PKCE - no secret needed).
2. Add this exact Redirect URI (it must match `SPOTIPY_REDIRECT_URI`, including
   the `127.0.0.1` host and no trailing slash):

```
http://127.0.0.1:5000/callback
```

3. In `.env`, set:

```
SPOTIPY_CLIENT_ID=your_own_client_id
```

4. Add your users (by email) to the app's allow-list in the dashboard.

## Troubleshooting

- **Stuck in audio-only mode** - you're likely not on the allow-list, declined
  authorization, or lack Premium. Track info is optional; visuals still work.
- **"INVALID_CLIENT: Insecure redirect URI"** - the dashboard Redirect URI must
  exactly match `SPOTIPY_REDIRECT_URI`.
- **Re-authorize** - delete `.cache` and run `./start.sh` again.
