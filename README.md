# Live clothing try-on

## Lucy 2.5 browser app

The browser app in `web/` uses Decart Lucy 2.5 to show the user wearing a shirt
from uploaded outfit images. It has original-camera and generated-video previews,
editable instructions, whole-outfit switching during a session, and Start/Stop controls.
Lucy produces edited video; it does not generate or export a 3D garment mesh.

### Setup and run

Install Node.js 22.12+ (or a newer supported version), then:

```sh
cd web
npm ci
cp .env.example .env.local
```

Set `DECART_API_KEY` in `web/.env.local` to your key from the
[Decart dashboard](https://platform.decart.ai/api-keys), then run:

```sh
npm run dev
```

Open **http://localhost:5173**. Add a shirt, jeans, and/or up to four accessories (PNG/JPEG/WebP, up to 10 MB each),
click **Start try-on**, and allow camera access. Keep your full body visible when trying jeans. Change
the selected items or instructions and click **Apply outfit** to update the live session.
Each category is optional; at least one item is required. Accessories can be added
in batches and removed individually. Shirt and jeans uploads replace their own slot.
Use **View outfit reference** to inspect the combined reference image.
**Stop camera** ends the session and releases the camera. Close the Python webcam
preview if it is still using the camera. No microphone permission is requested.

The UI shows setup instructions and disables Start when the server key is absent.
Restart the server after changing `.env.local`. To use a different local port,
set `PORT=5175` in that file. The app uses one origin for frontend and backend.

### Credentials and session behavior

The permanent key stays in the Node server. The browser requests a short-lived
client token, scoped to Lucy 2.5 and the current localhost origin. Tokens expire
after 60 seconds for starting connections, and sessions have a separate
five-minute server-enforced limit. A five-second token issuance cooldown limits
accidental repeated starts. These follow Decart's
[client-token API](https://docs.platform.decart.ai/getting-started/client-tokens).

The app sends camera video and the selected reference image to Decart only after
Start. Decart account access/credits and an internet connection are required;
API usage is billed by Decart. Files and camera video are not saved by this app.
The browser combines all selected items into a labeled reference board because
Lucy accepts one reference image per update. The prompt identifies each category
and asks for all selected items to be worn together. This is an approximate
reference-image approach, not separate garment layers; small accessories and exact
item fidelity may vary. Prompt updates include the complete board because `set()`
replaces the whole state. Both are included in the initial connection as well. See the
[realtime SDK reference](https://docs.platform.decart.ai/sdks/javascript-realtime).

The server binds only to `127.0.0.1` and rejects unknown hosts and token-request
origins. This is a local prototype: before hosting it publicly, add user
authentication, per-user quotas/rate limits, HTTPS, and explicit deployed origins.
Never prefix the permanent key with `VITE_`; those variables enter browser bundles.
`.env.local` is ignored by Git and Vite's dev server blocks `.env` files.

### Build and checks

```sh
cd web
npm test
npm run build
npm start
```

`npm start` serves the built app and the token API together on localhost.
For browser tests (synthetic media; no real webcam or Decart calls):

```sh
npx playwright install chromium
npm run test:browser
```

Tests cover restricted token issuance, key/error secrecy, image+prompt updates,
camera cleanup, Stop during pending connections, upload validation, camera errors,
and mobile layout. Live Lucy quality/latency must be tested with your account.

## Local Python 3D mesh prototype

The original Python implementation below remains available for local processing
and mesh export, independently of Lucy.

This prototype takes a 2D shirt image, builds a UV-textured mesh with front, back,
and side surfaces, and fits it to a person's tracked shoulders, hips, and elbows.
It renders that mesh over a webcam feed with depth testing and approximate
forearm/hand occlusion. Press **q** or **Esc** to quit, or **s** to export the
currently fitted mesh to `output/fitted_shirt.obj`.

## Run

Use Python 3.11–3.13 with a supported MediaPipe wheel:

```sh
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python transposer.py --download-model
```

The first run downloads Google's pose landmarker model to `models/`. Later runs
can omit `--download-model`. Use `--model PATH` for an existing model file.
Camera frames are processed locally. No video is saved by this script.

To use your shirt image:

```sh
python transposer.py --shirt path/to/shirt.png
```

Use a tightly cropped, upright, front-facing **short-sleeved shirt** on a transparent
background, with sleeves spread to either side. The script normalizes its bounds
and assumes shoulder anchors near 27% and 73% of image width, 5% of image height,
and a hem near 98% of image height. Other cuts or poses need different anchors and
skinning. This is not a general clothing recognition model.

For a colored shirt on a plain white background:

```sh
python transposer.py --shirt path/to/shirt.jpg --remove-white-background
```

Background removal only clears near-white pixels connected to the border; use a
transparent cutout for white shirts or complex backgrounds. Enclosed white logos
are retained. A built-in blue shirt is used when `--shirt` is omitted.

Keep shoulders and hips in view, facing the camera. The preview is mirrored by
default. Options include `--camera 1`, `--no-mirror`, `--ease 1.15` for a wider fit,
`--depth 0.15` for less volume, and `--no-arm-occlusion` if the approximate arm masks
cause artifacts. `--resolution 16` reduces CPU rendering work; the default is 24.
Tracking loss hides the garment and resets smoothing.

## Preview and export without a camera

```sh
python transposer.py --preview output/preview.png --export output/shirt.obj
```

This saves a synthetic mannequin preview and an OBJ mesh with sibling MTL and PNG
texture files. Add `--shirt` to test your own image. These operations do not require
MediaPipe tracking or its model. `--export` by itself exports the reference mesh
and then starts the camera; combine it with `--preview` for a headless run.

The exported mesh is static, measured in approximate meters, and uses MediaPipe's
camera-oriented axes (x right, y down, z away), centered near the hips. Import it
with the material and texture, and convert axes as needed for your 3D engine. Live
exports capture the current fitted shape; they do not contain an animation rig.

## Scope and limitations

This is a **webcam augmented-reality prototype**, not a VR headset application.
The shirt is a real triangle mesh, but its thickness and shape are procedural
estimates. The back repeats the front image. The joined panels are an approximate
shell, without physically correct neck, cuff, and hem openings. A single image
does not provide sewing patterns, true garment dimensions, fabric mechanics, or
unseen textures. There is no cloth simulation, full body surface reconstruction,
or sizing recommendation.

Projection uses a fitted weak-perspective camera. Tracking, fit, and occlusion
are approximate, especially with strong turns, crossed arms, loose garments, or
partly hidden bodies. Only forearms/hands have explicit body occlusion; the rest
of the body is not reconstructed as an occluding surface. The renderer runs on
the CPU and is not intended to meet a VR headset's frame-rate requirements.

For Quest/Unity or WebXR, the next integration needs the selected headset/runtime,
its avatar/body tracking, a GPU renderer, and a rigged garment or cloth simulation.
The OBJ export is a starting asset, not a complete headset integration.

The tracking implementation uses the current
[MediaPipe Pose Landmarker Tasks API](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/python),
which provides normalized image landmarks and estimated 3D world landmarks.

## Validation

```sh
python -m pip install pytest
python -m pytest tests -q
```

Tests cover mesh volume and closed edges, translation/rotation and sleeve fitting,
camera projection, depth ordering, occlusion, background handling, tracking loss,
and headless preview/export. Synthetic rendering does not establish real-person
fit quality; webcam testing is still needed on the target device.
