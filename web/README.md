# Local face scan

Scans now show up to 12 generated personal palette colors and 48 illustrative
clothing suggestions (12 per category), matched against 100 named clothing colors.
See [palette methodology](../backend/PALETTE.md) for sources and scoring assumptions.

From the repository root:

```sh
.venv/bin/python -m backend.app.api --port 5173
```

Open http://localhost:5173. Use the camera, capture a portrait, and choose **Find my looks**, or upload a JPEG/PNG (maximum 10 MB). Camera access requires localhost or HTTPS and browser permission.

The server runs the existing MediaPipe and color-profile pipeline. After a successful scan, the browser opens `/try-on` with your top palette scores and clothing examples sorted by their color score. Category filtering retains the ranking. Examples are an illustrative local catalog, not live inventory. Add catalog entries in `backend/app/api.py`; their color names must match `backend/app/data/clothing_colors.py`.

- `GET /api/health`: model-file availability.
- `POST /api/analyze`: raw JPEG/PNG body with its image Content-Type; returns the pipeline JSON plus `clothing` and `catalog_note`.
- Photos are decoded in memory and are not saved. One inference runs at a time.
- Model/dependency setup is documented in `backend/README.md`. Missing models, invalid photos, and unavailable skin measurements produce errors shown on the page.
- Run the server in a normal terminal on macOS so MediaPipe can initialize graphics services.

Editable UI files are `index.html`, `scan.js`, `scan.css`, and `try-on.html`, `try-on.js`, `try-on.css`. The face scan does not use the Decart API key or send portraits to Decart.

Choose a shirt or layer, pants, and an accessory independently, then click **Try** to preview the complete outfit. Accessories include a scarf, cap, belt, and crossbody bag. Remove any selection to keep that part of your current outfit. Refresh older recommendations with a new face scan to include accessories. Loading the page, filtering, and selecting clothes do not load the SDK, request credentials, or contact Decart. Only Try opens the preview camera and requests a short-lived token using the server-side `DECART_API_KEY` from the environment or `web/.env.local`. Stop, choosing another look, or leaving the page ends the session. Sessions also stop after five minutes.

The SDK bundle is in `tryon-assets/`. Rebuild after editing `tryon-sdk.js` using `web/node_modules/.bin/vite build --config web/vite.tryon.config.mjs` from the repository root. The build does not load `.env.local`.

With the local server running, run `node web/tests/try-on.cjs` to check navigation, recommendations, and explicit Try gating using mocked scan and provider responses, without spending API credits.

Local development server only; it binds to loopback. Do not expose it publicly without a production server and appropriate access controls. Styling scores and seasonal labels are heuristics, not calibrated probabilities.

The token request uses verified HTTPS with system trust plus the `certifi` CA bundle, including on macOS Python installs without default CA certificates. Token failures distinguish authentication, credit, rate-limit, certificate, timeout, and connectivity errors without exposing upstream response bodies.
