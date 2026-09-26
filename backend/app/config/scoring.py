"""Continuous garment scoring weights, widths and display groups."""
# Product heuristics, not coefficients fitted to research. See backend/PALETTE.md.
# Season remains a descriptive diagnostic; it does not determine the ranking.
SCORE_WEIGHTS = {'temperature': 0.30, 'value': 0.25, 'chroma': 0.20,
                 'harmony': 0.15, 'season': 0.0, 'eyes': 0.10}
TEMPERATURE_WIDTH = 0.65
NEUTRAL_TEMPERATURE_EXTRA_WIDTH = 0.65
VALUE_WIDTH = 0.30
VALUE_DEPTH_WEIGHT = 0.55
VALUE_CONTRAST_WEIGHT = 0.45
CONTRAST_GAP_BASE = 0.10
CONTRAST_GAP_RANGE = 0.50
CHROMA_WIDTH = 0.30
HARMONY_WIDTH_DEGREES = 25.0
HARMONY_TARGETS = {'analogous': (0.0, 30.0), 'complementary': (180.0,),
                   'split_complementary': (150.0,), 'triadic': (120.0,)}
NEUTRAL_CHROMA_SCALE = 12.0
SEASON_COLOR_WEIGHTS = (0.50, 0.25, 0.25)
SEASON_COLOR_WIDTH = 0.40
STRONG_MATCH_SCORE = 80.0
GOOD_MATCH_SCORE = 65.0
EXPERIMENTAL_HARMONY_MIN = 0.80
EXPERIMENTAL_GAP_MIN = 0.40
