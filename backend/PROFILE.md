# Multi-photo profiles and clothing colors — Phases 4–7

The existing `python -m backend.app.main` command still performs single-photo extraction. The new pipeline calls that same extractor independently for each of 1–3 photos, then aggregates its measurements and scores a curated library of 44 clothing colors. No extraction model, confidence formula, or mask logic was replaced. There are no new packages, trained models, clothing datasets, APIs, or frontend integrations.

## Run on macOS

From the repository root, after the setup in [README.md](README.md):

```bash
source .venv/bin/activate

# One photo is sufficient.
python test_profile.py '/absolute/path/to/photo1.jpg'

# Use different photos of the SAME person.
python test_profile.py \
  ./test_images/photo1.jpg \
  ./test_images/photo2.jpg \
  ./test_images/photo3.jpg

# Full machine-readable result, explicitly saved by shell redirection.
python test_profile.py ./test_images/photo1.jpg --json > profile.json

# Optional original extraction debug images and all masks; directory must be new.
python test_profile.py ./test_images/photo1.jpg --debug-dir debug-output/profile-run

python -m pytest -q
```

Use actual paths to your own files; `test_images/` is an example, not an included portrait dataset. JPEG and opaque PNG are supported as before. Nothing is saved by default. `--json` emits JSON on stdout; native MediaPipe logs may appear on stderr. Shell `>` replaces an existing destination file, so choose a fresh filename. The app's debug export refuses to overwrite an existing directory.

Photos must show the same person; the pipeline does not identify people or verify identity. Exact duplicate decoded images are still independently analyzed and included in per-photo results, but excluded from aggregation so repeated files do not masquerade as independent evidence. This does not detect near-duplicates or guarantee independent lighting.

## Callable interfaces

```python
from backend.app.pipeline import analyze_photos
from backend.app.recommendation.clothing_score import score_clothing_color
from backend.app.recommendation.color_ranker import rank_colors

result = analyze_photos(['photo1.jpg', 'photo2.jpg'])
profile = result['profile']

one_color = score_clothing_color(profile, {'name': 'Forest Green', 'hex': '#355E3B'})
ranked = rank_colors(profile, [
    {'name': 'Deep Teal', 'hex': '#006D6F'},
    {'name': 'Burgundy', 'hex': '#722F37'},
])
```

`analyze_photos` returns ordinary JSON-ready dictionaries:

- `photos_requested`, `photos_analyzed`: counts; duplicate inputs are analyzed but marked `aggregation_excluded`.
- `per_photo`: input index/path, status, extraction warnings, skin/hair/eyes LAB/RGB/HEX/confidence/diagnostics, and lighting score when available. Failed photos retain their error and input index.
- `profile`: aggregated colors, continuous characteristics with labels/confidence, raw pairwise contrast measurements, season winner/confidence, and all seasonal scores/distances/reasoning.
- `recommended_colors`: all candidates sorted by descending score, each with six components, dynamically computed LAB/HSL/color characteristics, and scoring diagnostics.
- `color_groups`: disjoint strongest/good/experimental/lower groups. Groups can be empty.
- `warnings` and `method_note`: uncertainty, exclusions, and interpretation.

Invalid photo counts fail before inference. A failed image does not discard successful images. Missing hair/eyes remain unavailable, reduce profile confidence, and receive no invented hue. At least one usable skin measurement is required; if all images fail, the error includes their causes. Missing models use the original setup instructions.

## Modules and tuning

```text
backend/app/
  pipeline.py
  vision/aggregation.py
  color/temperature.py
  color/profile.py
  color/contrast.py
  color/harmony.py
  color/seasonal.py
  recommendation/clothing_score.py
  recommendation/color_ranker.py
  data/clothing_colors.py
  config/palette.py
  config/scoring.py
test_profile.py
```

`color/conversions.py` remains the single source of RGB/LAB conversions and now also supplies HEX parsing, HSL, and LAB chroma/hue. All numerical rules are deterministic. Color names are display labels and never enter a scoring formula.

### Aggregation

Each region is aggregated separately with a coordinate-wise confidence-weighted median; an exact half-weight tie averages the two neighboring values. Measurements below confidence 0.15 are omitted. RGB and HEX are derived from the aggregate LAB.

With three eligible measurements, a pair can establish consensus only when both confidence scores are at least 0.35 and their Delta E 76 is at most 12. The third measurement is ignored only if it is more than `max(22, 2 × pair distance)` from both members. With only two disagreeing photos, the pipeline cannot identify which is wrong: it retains the robust weighted estimate, warns, and lowers confidence.

Aggregate confidence is the confidence-weighted mean input confidence, multiplied by `exp(-(maximum retained pair Delta E / 25)²)`. Each excluded outlier adds a 10% penalty. A single photo retains its confidence; adding repeated consistent observations does not automatically boost confidence toward 1. Raw pair distances, retained indices, rejected indices, and normalized input weights are returned. These rules estimate consistency; they do not remove illumination color casts.

### Facial characteristics

- **Temperature**: skin weight 0.65, hair 0.20, eyes 0.15, multiplied by measurement confidence and renormalized. Skin uses `tanh(C* × sin(hue − 50°) / 12)`, a configurable pink-to-golden styling axis. Hair, eyes, and garments use `cos(hue − 60°) × C*/(C* + 12)`. Low chroma tends to neutral. The skin axis is a stylistic convention, not a validated measurement of undertone.
- **Depth**: `1 − L*/100`, combined with weights skin 0.40, hair 0.35, eyes 0.25 and confidence. It does not use skin alone when other measurements exist.
- **Chroma**: confidence-weighted `sqrt(a*²+b*²)` with the same 0.40/0.35/0.25 weights, divided by 40 and clamped to [0,1]. Per-region C* and the unclamped aggregate C* are included.
- **Contrast**: for each available pair, `0.70 × min(|ΔL*|/60,1) + 0.30 × min(Delta E/70,1)`. The final score is a confidence-weighted RMS, emphasizing large observed differences. Both raw Delta E and L* differences are returned. Contrast needs at least two colors; otherwise its score is null and its label is unknown.

Feature confidence reflects weighted available evidence; missing regions reduce it. Overall profile confidence is the mean of the four characteristic confidences. Label thresholds and all scales are in `config/palette.py`.

### Seasonal palettes

The vector is `[(temperature+1)/2, depth, chroma, contrast]`. Each configurable season prototype lives in [0,1]⁴. Weighted Euclidean distance uses temperature/depth/chroma/contrast weights **0.45/0.20/0.20/0.15**. Missing contrast is omitted from distance, not treated as an observed neutral value.

Each affinity is `exp(-0.5 × (distance/0.40)²)`. All four affinities and distances are returned; affinities do not sum to one and are not probabilities. Winner confidence multiplies overall profile confidence, winner affinity, and a best-versus-runner-up margin factor. Close alternatives therefore lower confidence. Seasonal analysis is an **approximate styling heuristic, not an objective biological classification**.

### Garment scoring

All six components are bounded [0,1]. Final score is 100 times their weighted sum:

| Component | Weight | Continuous comparison |
|---|---:|---|
| Temperature | 25% | Gaussian difference in temperature; neutral profiles have broader tolerance |
| Value | 20% | 55% overall-depth match + 45% skin/garment L* gap match; target gap grows with facial contrast |
| Chroma | 15% | Gaussian difference between facial normalized chroma and garment C*/80 |
| Harmony | 15% | Confidence/chroma-weighted hue relationships to skin/hair/eyes, blended with low-chroma neutral value harmony |
| Season | 15% | Similarity to all seasonal prototypes weighted by their affinities; low seasonal confidence defers to the numerical profile |
| Eyes | 10% | Analogous/complementary iris relationship, attenuated toward 0.5 by weak eye confidence or low chroma |

Facial C*/40 and garment C*/80 are separate styling scales: clothing may be more saturated than a face while still obtaining a chroma match. This is explicitly tunable, not a physical equivalence. Hue harmony uses circular LAB hue differences with Gaussian width 25° around analogous (0°/30°), complementary (180°), split-complementary (150°), and triadic (120°) targets. Achromatic colors receive no arbitrary hue bonus.

Groups use configurable score thresholds: strongest ≥80, good ≥65; among remaining colors, strong harmony plus a substantial L* gap is marked experimental contrast. Other colors are lower matches. Every candidate is returned, and no group means a person cannot wear a color.

## Verification and example

55 tests pass, including all 28 extraction tests. New tests cover warm/cool, light/deep, muted/bright, low/high contrast, circular harmony, every season prototype, uncertainty, bounded/reproducible scores, names having no effect, two-photo disagreement, three-photo outlier rejection, weak-consensus protection, full pipeline integration, failed inputs, duplicates, JSON serialization, and opt-in exports.

Full single-photo inference was also run on the previously supplied portrait. Its extraction colors remain unchanged. Example summary (rounded):

```text
Temperature score: 0.002 (neutral)
Depth score: 0.593 (medium)
Chroma score: 0.400 (medium)
Skin-hair Delta E: 76.470
Skin-eye Delta E: 55.123
Hair-eye Delta E: 25.772
Contrast score: 0.794 (high)
Spring score: 0.700
Summer score: 0.752
Autumn score: 0.807
Winter score: 0.754
Season: Autumn (heuristic confidence 0.149)

Color: Burgundy
HEX: #722F37
Temperature: 0.918
Value: 0.960
Chroma: 1.000
Harmony: 0.975
Season: 0.858
Eye enhancement: 0.683
Final score: 91.47/100
```

The default CLI prints the top **10**, not just this one illustrative entry. On this photo the next two are Deep Teal (90.05) and Plum (89.37). The season winner is tentative, as its confidence indicates. Synthetic tests and a sample portrait verify implementation behavior; they do not establish perceptual accuracy, population-wide reliability, or calibrated styling preferences. Mixed lighting, filters, makeup, contacts, and extraction errors still affect the profile. Personal preference remains outside this numerical ranking.
