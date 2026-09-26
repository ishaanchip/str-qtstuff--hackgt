# Single-photo color extraction — Phases 1–3

The default recommendation pipeline now generates a personalized palette of up to
12 colors. See [PALETTE.md](PALETTE.md) for the algorithm, research sources,
assumptions, and matching against the expanded 100-color clothing library.

## Web face scan

Run `.venv/bin/python -m backend.app.api --port 5173` from the repository root,
then open http://localhost:5173 to capture or upload a portrait, view palette scores,
and explore clothing ideas ranked by color. See [web setup](../web/README.md).

Phases 4–7 are now available through `python test_profile.py photo1.jpg [photo2.jpg photo3.jpg]`. See [PROFILE.md](PROFILE.md) for multi-photo aggregation, facial characteristics, seasonal affinities, clothing-color ranking, and callable interfaces. The single-photo extraction CLI below remains available.

## 1. Required packages

Python 3, NumPy, OpenCV (`opencv-contrib-python`, which also satisfies MediaPipe's dependency), MediaPipe Tasks, and Pillow. `pytest` is needed only for development. Version ranges are in `requirements.txt` and `requirements-dev.txt`.

Two pretrained MediaPipe assets are required: Face Landmarker and SelfieMulticlass. No custom model is trained. The [Face Landmarker guide](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/python) documents the Tasks API; the [segmentation guide](https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter) documents the six classes, including hair and face skin.

## 2. Folder structure

```text
backend/
  README.md
  requirements.txt
  requirements-dev.txt
  models/                       # downloaded assets, ignored by Git
  app/
    main.py                     # image loading, in-memory pipeline, CLI
    color/conversions.py        # sRGB ↔ CIELAB D65
    config/thresholds.py        # sampling geometry and thresholds
    vision/
      face_landmarks.py         # Tasks face landmarks + segmentation
      skin.py                   # forehead and upper cheeks
      hair.py                   # dominant hair near/above forehead
      eyes.py                   # both iris annuli
      sampling.py               # robust estimates and exact sample masks
      quality.py                # blur/exposure/face-size penalties
    utils/visualization.py      # explicit PNG debug export
  tests/test_extraction.py
```

## 3. Complete code

The complete implementation is in `app/`; run it as a module from the repository root. The existing root `test.py` is unchanged.

Skin sampling expands the original safe cheek/forehead polygons from 0.65 to 0.90 of their landmark-defined size (about 1.9× their area), intersects face-skin segmentation, and rejects clipped exposures and strong adaptive LAB outliers. It does not discard fixed lightness percentiles. The three regional medians receive equal weight in the final median, and every pair is compared with Delta E 76.

Hair sampling covers upper-center, upper-left, and upper-right face-aligned regions. Overlaps are counted once. High-confidence hair segmentation is eroded to reduce background boundary contamination; pixels within Delta E 8 of detected skin are rejected. Deterministic farthest-seeded LAB clustering (up to three clusters) selects the dominant color, followed by robust outlier removal. Region agreement is measured **before** choosing the dominant cluster, so clustering cannot create artificial cross-region agreement.

Each eye is sampled only in a **0.35–0.85 iris-radius annulus**, clipped by the eyelid opening. Radius and center come from iris landmarks; the eye polygon never becomes the color sample. Bright absolute/relative highlights are removed. Near-black pixels are rejected only when statistically darker than their own iris distribution; uniform dark brown is preserved. Consistent eyes are combined using their independent sampling quality. If eyes disagree, a clearly better sample may be used alone; equally credible conflicting eyes return unavailable. A single-eye estimate gets zero agreement credit (maximum score 0.60), rather than fabricated corroboration.

### Interpretable confidence

Every score exposes its three components and follows `0.40 × coverage + 0.40 × consistency + 0.20 × quality`. Unavailable colors always score zero. No target confidence is hard-coded. Thresholds and weights are in `app/config/thresholds.py`.

| Region | Coverage (40%) | Consistency (40%) | Quality (20%) |
|---|---|---|---|
| Skin | Average retained/geometric patch fraction, with count support saturating at 80 pixels per patch | Mean `exp(-(Delta E / 15)²)` across observed region pairs, scaled by observed pairs / 3 | Face blur/exposure/size quality × unclipped skin fraction |
| Hair | Retained/(dominant-cluster candidates + skin-rejected pixels), count support saturating at 120 pixels | Dominant-cluster ratio × mean of cluster compactness and original-region agreement | Segmentation probability × skin separation (saturating at Delta E 25); unknown skin separation earns zero credit |
| Eyes | Retained/visible-annulus fraction, count support saturating at only 12 pixels per selected eye | `exp(-(left/right Delta E / 15)²)` for two consistent eyes; zero for one eye | Iris geometry × face image quality × unhighlighted fraction |

Hair compactness uses `exp(-(median within-cluster Delta E / 18)²)` and hair region agreement uses the same scale of 18. Missing cross-region evidence earns zero agreement credit. Iris geometric quality includes ring symmetry, center alignment, visible annulus fraction, and a resolution term that saturates at a 5-pixel radius. Radii below 3 pixels or fewer than 6 usable iris pixels are unavailable. These are geometric proxies, **not per-landmark probabilities supplied by MediaPipe**.

Pixel support, agreement, and image quality are no longer repeatedly multiplied into the final score. Multicolored hair still loses dominance/consistency credit. Confidence measures sampling evidence, not the accuracy of intrinsic skin/hair/iris pigmentation or a calibrated probability. A high score cannot detect consistent color casts, contacts, makeup, or systematic landmark errors.

CIELAB uses L* 0–100 and signed a*/b*, not OpenCV's encoded 8-bit LAB. RGB/HEX are derived from the robust LAB estimate, with rounding and gamut clipping. Hair and eye `Measurement` objects also expose `lightness` and `chroma` properties. The CLI prints all confidence components and supporting counts/distances, and debug export records the same diagnostics in JSON.

All analysis runs locally in memory. No original image, intermediate mask, or measurement file is written by default. `--debug-output` explicitly saves a PNG containing the portrait, exact retained sample pixels, labeled mask legend, and swatches. It also creates `<output-stem>_masks/` containing lossless binary PNGs for every candidate, rejected, filtered, and retained mask, plus `diagnostics.json`. White pixels identify membership in that mask; filenames identify the processing stage. For eyes, `filtered` means locally usable pixels and `retained` means pixels actually used in the final combined estimate. Its right-hand panel preserves the analyzed image's pixel coordinates; black pixels were not sampled. Input EXIF orientation and embedded ICC profiles are honored, and large images are resized to at most 1600 pixels per side. Debug export refuses to overwrite an existing overview or mask directory.

The extraction command measures observed appearance. It does not infer race, ethnicity, attractiveness, health, personality, or gender. Its extraction behavior is unchanged; aggregation and styling are separate modules described in [PROFILE.md](PROFILE.md). Lighting correction, product ranking, and API integration remain outside the implementation.

## 4. macOS setup/run commands

Run from the repository root. Use a Python interpreter for which MediaPipe provides a wheel on your Mac; Apple Silicon with Python 3.13 was tested here.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements-dev.txt

mkdir -p backend/models
curl -fL https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task \
  -o backend/models/face_landmarker.task
curl -fL https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite \
  -o backend/models/selfie_multiclass.tflite

python -m backend.app.main '/absolute/path/to/portrait.jpg' \
  --debug-output debug-output/portrait.png
```

Omit `--debug-output` to save nothing. Choose a fresh output filename for each run. Use `--model-dir /path/to/models` to override the bundled model directory. JPEG and opaque PNG are suitable; convert iPhone HEIC files to JPEG first.

## 5. Example test command

```bash
source .venv/bin/activate
python -m pytest backend/tests -q

# Optional full inference test using a public MediaPipe sample portrait:
curl -fL https://storage.googleapis.com/mediapipe-assets/portrait.jpg \
  -o /tmp/fashion-portrait.jpg
python -m backend.app.main /tmp/fashion-portrait.jpg \
  --debug-output debug-output/sample.png
```

Tests cover LAB reference values, gentle skin gradients, skin-region disagreement, clipped exposure, skin rejection from hair, dominant clustering, near-black irises, statistical pupil outliers, glare, conflicting eyes, better-eye fallback, exact mask exports, unavailable regions, EXIF orientation, and overwrite protection. These synthetic checks do not establish accuracy across real-world portraits.

Verified locally: 28 tests passed, dependency checks passed, and full inference plus visual debug inspection succeeded on the public sample portrait with Python 3.13.5, MediaPipe 0.10.35, OpenCV 4.14.0, NumPy 2.5.3, and Pillow 12.3.0. On the same public portrait, confidence changed from skin/hair/eyes 0.33/0.34/0.09 to 0.91/0.70/0.82. This comparison verifies behavior on one image, not calibration or general accuracy. On sandboxed macOS, MediaPipe may abort while initializing graphics services; run the CLI in a normal Terminal session.

## 6. Expected output

Actual public-sample output (rounded here; CLI also prints the component scores and per-eye diagnostics):

```text
SKIN
RGB: [228, 171, 144]
HEX: #E4AB90
LAB: [74.63, 17.34, 22.33]
Confidence: 0.91
valid_pixels: 1589
region_delta_e: {"forehead/right_cheek": 7.28, "forehead/left_cheek": 7.44, "right_cheek/left_cheek": 7.39}
lighting_score: 0.994

HAIR
RGB: [112, 106, 102]
HEX: #706A66
LAB: [45.18, 1.70, 3.14]
Confidence: 0.70
valid_pixels: 2929
dominant_cluster_ratio: 0.401
skin_separation: 38.48

EYES
RGB: [50, 39, 39]
HEX: #322727
LAB: [16.81, 5.59, 1.95]
Confidence: 0.82
left_valid_pixels: 59
right_valid_pixels: 73
left_right_delta_e: 8.21
highlight_percentage: 3.65
selected_eyes: ["right_iris", "left_iris"]

Confidence is a heuristic quality score, not a calibrated probability.
Debug image: debug-output/sample.png
Masks and diagnostics: debug-output/sample_masks
```

Unusable regions print `unavailable` for RGB, HEX, and LAB, with confidence `0.00` and a warning on stderr. Exit status is 2 on input/model errors or unavailable skin; partial results with usable skin return 0. MediaPipe may emit native runtime messages on stderr.

## 7. Common failure cases

- No face or multiple faces: use a solo, forward-facing portrait. Detection intentionally requests up to two faces to reject ambiguous inputs.
- Small/closed eyes, eyelashes, glasses, glare, or enlarged pupils: iris estimates may be unavailable or contaminated. The pupil boundary is a conservative geometric approximation; iris landmarks do not segment the pupil. Use a sharp close-up with visible irises.
- Hats, baldness, cropped hair, hair against similar backgrounds, or sparse strands: segmentation may leave too little hair. Inspect the exact mask; do not treat an unavailable result as black hair.
- Makeup, facial hair, bangs, occlusion, or heavy shadows: segmentation and robust trimming reduce contamination but cannot guarantee clean skin patches.
- Colored lighting, white balance, filters, and uneven exposure alter the measured colors. This phase does not estimate intrinsic pigmentation or normalize illumination. Capture diffuse daylight without beauty filters.
- Dyed/multicolored hair: the dominant visible cluster is reported; it may omit highlights or secondary colors.
- Strong pose or head rotation: landmark patches and iris approximations become less reliable. Use a frontal portrait.
- Missing/corrupt models or unsupported MediaPipe wheel: re-download the two documented models or select a compatible Python/macOS architecture. Do not install both `opencv-python` and `opencv-contrib-python`; they share the `cv2` namespace.
- Transparent images or unsupported formats: export an opaque JPEG/PNG. Malformed ICC profiles fail instead of silently producing incorrect colors.
