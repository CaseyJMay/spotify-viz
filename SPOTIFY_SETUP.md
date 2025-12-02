# Spotify OAuth Setup

## Important: Update Your Spotify Developer Dashboard

The redirect URI has been changed to: `http://127.0.0.1:5000/callback`

You **must** add this exact redirect URI to your Spotify app settings:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app (Client ID: `c616b8b7868b412ba56a1f77d28ad209`)
3. Click "Edit Settings"
4. Under "Redirect URIs", add:
   ```
   http://127.0.0.1:5000/callback
   ```
5. Click "Add" and then "Save"

## Why the change?

- Changed from `http://localhost:8888/callback` to `http://127.0.0.1:5000/callback`
- Uses `127.0.0.1` instead of `localhost` (Spotify's recommendation)
- Matches the actual server port (5000)
- Added proper callback endpoint handler

## Testing

After updating the redirect URI in the dashboard:
1. Restart the backend: `./run.sh`
2. The OAuth flow should work correctly
3. When you authorize, you'll be redirected to `http://127.0.0.1:5000/callback`

## Troubleshooting

If you still get "INVALID_CLIENT: Insecure redirect URI":
- Make sure the redirect URI in the dashboard **exactly** matches: `http://127.0.0.1:5000/callback`
- Check for typos (no trailing slashes, correct port number)
- Wait a few minutes after saving - Spotify sometimes takes time to propagate changes
- Clear your browser cache and try again

