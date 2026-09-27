# Portrait-to-palette ML backend

A standalone Python service that analyzes a portrait and returns measured skin,
hair and eye colors, a styling profile, and ranked clothing colors as JSON.
The previous frontend has been removed; connect any frontend over HTTP.

## Setup and run

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
mkdir -p backend/models
curl -fL https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task -o backend/models/face_landmarker.task
curl -fL https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite -o backend/models/selfie_multiclass.tflite
python -m backend.app.model_api --port 8000 --allow-origin http://localhost:3000
```

Set `--allow-origin` to the exact URL of your new frontend; repeat the flag for
additional origins. On macOS, run in a normal terminal for MediaPipe graphics access.

- `GET /api/health` reports whether model files are present.
- `POST /api/analyze` accepts a raw JPEG/PNG body, up to 10 MB, and returns JSON.
- `OPTIONS /api/analyze` handles browser CORS preflight.

See [frontend integration and API contract](backend/MODEL_API.md) for a fetch
example, response fields, and error codes. To merge into another project, copy
`backend/`, install its requirements, and download its two model files. Neither
root-level `models/` nor `output/` is needed.

## Test

```sh
python -m pip install -r backend/requirements-dev.txt
python -m pytest backend/tests -q
```

The model files are ignored by Git. Photos are processed in memory. MediaPipe
locates facial regions; color measurements and styling rankings use heuristics.
The HTTP server is intended for local development.
