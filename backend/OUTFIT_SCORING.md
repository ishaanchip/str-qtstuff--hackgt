# Current outfit rater: deterministic color rubric

`app/outfit_analyst.py` implements the supplied slot-based specification. The
public endpoint uses this module, not the older image/profile scoring pipeline.
It is a deterministic rule model, not newly trained ML or an LLM. ML remains in
clothing extraction elsewhere in the application.

Input: `shirt_layer` is an ordered list (outermost last), `pant` is an item or
null, and `accessories` is a list. Each item has `item`, `color_name`, `hex`, and
`pattern`. HEX controls scoring; names are used only in explanation text. The
API rejects wearer/profile data and image uploads for this endpoint.

Output has exactly seven fields: `overall_score` (integer 1–10), `harmony_type`,
`subscores` (`shirt_pant_harmony`, `accessory_cohesion`, `contrast`, `balance`),
`summary`, `what_works`, `improvement`, and `suggested_hex`. Missing accessories
produce null accessory cohesion. Missing slots are noted in improvement.

## Explicit implementation choices

- Tops account for 55% and pants 45% of the base area, normalized over present
  slots. The outermost layer gets 70% of the top weight, inner layers share 30%.
- Accessory cohesion contributes 12% of the final score when a base is present,
  regardless of accessory count. Accessories echo a base color or form an accent.
- HSL thresholds identify neutral families from HEX: dark/light/gray, navy,
  earth colors, olive and denim. Names never determine neutrality.
- Hue templates recognize monochrome, analogous, complementary,
  split-complementary and three-color triadic palettes. Boldness alone incurs
  no penalty. Lightness, saturation, temperature relationships and multiple
  patterns affect the remaining factors.
- All-neutral scores are capped at 8; a single selected item scores 6 because
  there is no between-item relationship to judge. Missing slots are not penalized.
- Suggestions test explicit reference-color swaps and name a slot. Tiny gains
  below 0.5 points are not suggested. Predictions are not guarantees of preference.
- No user feedback, images or ratings are saved. Repeated identical inputs
  produce identical output. These weights are application choices, not learned
  or empirically calibrated fashion ratings.

## Earlier research implementation

`color/research_harmony.py` independently implements Ou & Luo (2006), equation 11,
[DOI 10.1002/col.20208](https://doi.org/10.1002/col.20208).
It remains tested but is not the current public rater. Its laboratory two-color
harmony measure does not implement the user's new bold-color/neutral rules.
[Schloss & Palmer (2011)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3037488/)
distinguish perceived harmony from preference; neither source validates the new
slot rubric, seasonal skin matching or fashion judgments. A human-rated held-out
benchmark would be required before making accuracy claims.
