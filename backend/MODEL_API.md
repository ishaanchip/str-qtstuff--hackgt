# Connect a new frontend to the color model

Run the independent service in `backend/app/model_api.py`. It imports the image
analysis and palette pipeline directly, with no dependency on `web/`, Channel3,
Decart, API keys, or the website's `api.py`.

This is a portrait-to-palette service: pretrained MediaPipe models locate facial
regions, Python measures their colors, and styling heuristics rank clothing
colors. It is not one trained neural network that predicts clothing preferences.

## Setup

Run from the repository root:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements-model.txt
mkdir -p backend/models
curl -fL https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task -o backend/models/face_landmarker.task
curl -fL https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite -o backend/models/selfie_multiclass.tflite
python -m backend.app.model_api --port 8000 --allow-origin http://localhost:3000
```

Use a Python version with MediaPipe wheels for your platform. On macOS, run in a
normal terminal so MediaPipe can initialize graphics services.
`--allow-origin` must match the frontend's scheme, hostname and port exactly.
Repeat it for multiple frontends, e.g. `--allow-origin http://localhost:5173`.
Without the flag, localhost ports 3000 and 5173 are allowed. `127.0.0.1` is a
different browser origin. No wildcard or credentialed CORS is enabled.

## Frontend example (React, Next.js client component, or plain JavaScript)

```js
const MODEL_API = 'http://localhost:8000';

export async function analyzePortrait(file) {
  if (!file || !['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Choose a JPEG or PNG portrait.');
  }
  const response = await fetch(`${MODEL_API}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    body: file, // Raw File/Blob, NOT FormData or base64 JSON.
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Analysis failed.');
  return result;
}

// In your file input's change handler:
// const result = await analyzePortrait(event.target.files[0]);
// setColors(result.recommended_colors);
// Render each color with backgroundColor: color.hex.
```

The browser sends its Origin automatically; the API handles the CORS preflight.
Camera captures work too: turn a canvas capture into a JPEG Blob, then pass it to
`analyzePortrait`.

## API contract

- `GET /api/health` → `{ "models_ready": true }` when both model files exist.
  This checks files, not a full inference run.
- `POST /api/analyze`: raw JPEG/PNG, at most 10 MB; exactly one face per image.
- `OPTIONS /api/analyze`: browser preflight.

Successful analysis returns the existing `analyze_photos` JSON:

| Field | Content |
| --- | --- |
| `profile.skin`, `profile.hair`, `profile.eyes` | Extracted RGB, HEX, LAB, confidence and sampling diagnostics; unavailable regions may have null colors |
| `profile.temperature`, `depth`, `chroma`, `contrast` | Numerical appearance features |
| `profile.season`, `season_confidence` | Approximate seasonal styling label |
| `recommended_colors` | Descending scores: `{name, hex, score, components, features, diagnostics}` |
| `color_groups` | Strongest, good, experimental and lower-scoring groups |
| `warnings`, `method_note` | Input limitations and interpretation |
| `per_photo`, `photos_requested`, `photos_analyzed` | Measurement provenance |

There are no shopping products, product URLs or try-on credentials in this API.
It processes portraits in memory and does not write photos by default.
Styling scores are not calibrated probabilities.

Errors use `{ "error": "message" }`: 403 unapproved origin, 413 invalid size,
415 unsupported upload format, 422 invalid image/face analysis, 429 busy,
503 missing model files, or 500 unexpected failure.

Test without a frontend:

```sh
curl http://localhost:8000/api/health
curl -X POST http://localhost:8000/api/analyze \
  -H 'Content-Type: image/jpeg' --data-binary @portrait.jpg
```

## Moving to another repository

Copy the entire `backend/` directory (including `__init__.py` and the model files,
which are downloaded separately because Git ignores them). Install
`requirements-model.txt` and run from the directory containing `backend/`.
`web/` and `clothes_scraping/` are unnecessary. Keep the whole `app/` package
because the pipeline imports vision, color, configuration and recommendation
modules. The existing `api.py` need not be run or imported.

For Python callers with no HTTP layer:

```python
from backend.app.pipeline import analyze_photos
result = analyze_photos(['portrait.jpg'])
```

For deployment, replace localhost with the backend's HTTPS URL and configure
its frontend origin. This standard-library server is a local-development entry
point; production hosting needs a production HTTP server, authentication and
request limits. CORS is browser access control, not authentication.
