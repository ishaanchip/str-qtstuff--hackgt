# Personalized color palettes

The default `analyze_photos` pipeline generates colors from the measured profile
instead of ranking the 44 fixed catalog colors. Explicit `candidate_colors`,
including an empty list, still selects the custom-library path.

`app/recommendation/palette_generator.py` explores CIELCh (polar CIELAB)
lightness/chroma variants and hue relationships to reliable skin, hair and eye
measurements. A broad hue sweep avoids making traditional harmony rules mandatory.
Near-neutral or unavailable measurements do not seed hue relationships. Chroma is
reduced for out-of-gamut candidates until the sRGB round-trip error is at most
2 Delta E 76. Scoring and selection use the rounded, displayed sRGB color.

The result contains up to 12 colors: up to 3 neutrals and 9 accents, separated by
at least 12 Delta E 76. Each includes a HEX code, score, components, role,
explanation and diagnostics. Results are deterministic. Some profiles may yield
fewer colors because diversity is enforced rather than padded with duplicates.

## Evidence and assumptions

- [CIE definition of CIELAB color difference](https://cie.co.at/eilvterm/17-23-077)
  supports the Euclidean color-distance calculation used for palette diversity
  and catalog matching. This is Delta E 76, not CIEDE2000; it is an approximate
  perceptual distance, not an aesthetic score.
- [Perrett and Sprengelmeyer (2021), Clothing Aesthetics](https://doi.org/10.1177/20416695211053361)
  investigated clothing-color choices for fair and tanned skin. It motivates
  considering continuous color properties and empirical preferences, but does
  not validate this algorithm across skin tones or establish universal rules.
  We do not turn the study's skin categories into recommendation rules.
- Analogous, complementary, split-complementary and triadic offsets are design
  hypotheses used to propose colors. Applying these offsets in CIELCh is an
  implementation choice, not a research-validated aesthetic formula.
- Score weights (temperature 30%, value 25%, chroma 20%, harmony 15%, eyes 10%),
  sampling intervals, chroma gating, gamut tolerance and diversity thresholds
  are explicit product heuristics. None were fitted to the cited study.
  Seasonal scores remain available as descriptions with zero ranking weight.

The implementation is research-informed color measurement plus heuristic styling,
not a trained or scientifically validated attractiveness predictor. Scores are
not probabilities. Lighting, camera white balance and personal taste still matter.
Preference learning and illumination correction are not implemented.

## Clothing and UI

The expanded 100-color `clothing_colors.py` list remains the illustrative catalog's
color inventory. The API explores tees, overshirts, trousers and scarves in every
color, alongside the original outfit examples, and returns the best 12 per category.
The API maps each garment to its nearest generated color in Delta E 76, keeping
the garment's original name and HEX. Its ranking score is the matched palette
score multiplied by `exp(-0.5 * (distance / 30)^2)`; 30 is a heuristic tolerance.
The response exposes `palette_hex` and `palette_distance_delta_e76` to distinguish
an approximate catalog match from an exact palette color. Custom-library results
retain the previous name-based catalog matching behavior.

Run `python test_profile.py portrait.jpg` for JSON/CLI results, or start
`python -m backend.app.api --port 5173` and scan a portrait to see the generated
swatches and matched clothing. Model setup remains in README.md.
