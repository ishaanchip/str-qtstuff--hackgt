# Local face scan

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

## Outfit color rating

**Current contract:** `POST /api/outfit/rate` accepts `shirt_layer` (inner to outer
items), `pant` (one item or null), and `accessories` (items). Each item contains
`item`, `color_name`, `hex`, and `pattern`. It returns only `overall_score` (integer
1–10), `harmony_type`, `subscores`, `summary`, `what_works`, `improvement`, and
`suggested_hex`. This replaces the previous image/profile and 0–100 contract.
The website now supports multiple layers and accessories; Make outermost changes
layer order. The rating uses the selected colors even while try-on is active.
No wearer measurements, camera frame, or brand enters this deterministic rubric.
HEX overrides color names. Unknown product patterns remain unknown; selected
colors are estimates when only the search palette HEX is available.

The following describes the **previous experimental scorer**, retained in source
for research comparisons; it is no longer used by the rating endpoint.

Once clothing is added to Build your outfit, click **Rate my outfit**. Before
try-on, this scores selected product colors (photo-measured HEX when available,
otherwise the searched palette color), equally weighted per item. During a live
preview, the browser captures the generated frame instead. Both modes send the
original face-scan measurements to `POST /api/outfit/rate`. The existing SelfieMulticlass model
isolates clothing; deterministic LAB clustering extracts up to five major colors.
Frames with fewer than 500 confident clothing pixels or less than 3% clothing
coverage return an actionable error instead of a score.

The score combines 60% area-weighted personal palette compatibility with 40%
coordination between visible colors using the empirical Ou–Luo pair-harmony model.
The personal palette score and 60/40 blend remain application styling choices.
See [scoring research](../backend/OUTFIT_SCORING.md) for equations and limitations.
With only one dominant color, the score uses personal palette compatibility alone.
The UI displays the breakdown, detected colors and a color suggestion. Changing
or stopping the outfit preview aborts pending ratings and clears old results.

The original facial measurements are used; the generated face is not rescanned.
Scores describe the visible generated frame, not fit or attractiveness. Small
accessories, off-screen clothing, patterns and lighting can affect coverage and
color extraction. No rating feedback, images, or training examples are stored.

Verification: `node web/tests/outfit-rating.cjs` uses synthetic video and mocked
services, defaults to localhost:5174, and accepts `TEST_BASE_URL` for another port.


### Clothing-only try-on references

Product references are segmented locally before the reference board is built.
Only high-confidence clothing pixels survive; skin, hair and backgrounds are
replaced with white and the image is cropped to the clothing. The original product
image is never used as a fallback if isolation fails. Small accessories and photos
outside the segmentation model's capabilities may therefore be unavailable for
try-on. Shopping thumbnails still show the original product photo.

The Decart prompt explicitly preserves the camera person's identity and facial
features, with prompt enhancement disabled. These changes reduce reference-face
transfer but cannot guarantee perfect face preservation in generated video.


Personal palette compatibility retains the strict display preset and penalty for
uneven item matches. Coordination now uses the published Ou–Luo equations,
without the previous exponent, fixed neutral score, or color-wheel bonuses.
Suggestions evaluate the whole outfit and report a projected score only when a
single replacement improves it by at least three points. Neither the research
model nor the combined score has been validated on this app's users or outfits.
