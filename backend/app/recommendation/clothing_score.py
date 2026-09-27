"""Explainable deterministic garment-color scoring, without learned rankings."""
import numpy as np
from ..color.conversions import hex_to_rgb, rgb_to_lab, rgb_to_hsl, rgb_to_hex, lab_chroma_hue
from ..color.temperature import color_temperature
from ..color.harmony import harmony_scores
from ..color.seasonal import classify_season
from ..config import palette
from ..config import scoring as cfg


def _similarity(difference: float, width: float) -> float:
    return float(np.exp(-0.5 * (difference / width) ** 2))


def _harmony(profile: dict, hue: float, chroma: float, value_score: float) -> tuple[float, dict]:
    references, weights = {}, []
    for name in palette.REGIONS:
        sample = profile[name]
        if sample['lab'] is None:
            continue
        reference_chroma, reference_hue = lab_chroma_hue(sample['lab'])
        weight = sample['confidence'] * reference_chroma / (reference_chroma + cfg.NEUTRAL_CHROMA_SCALE)
        references[name] = harmony_scores(hue, reference_hue)
        weights.append((max(references[name].values()), weight))
    total = sum(w for _, w in weights)
    hue_score = sum(score * w for score, w in weights) / total if total else 0.5
    neutral_strength = float(np.exp(-(chroma / cfg.NEUTRAL_CHROMA_SCALE) ** 2))
    neutral_score = 0.5 + 0.5 * value_score
    score = neutral_strength * neutral_score + (1 - neutral_strength) * hue_score
    return float(score), {'references': references, 'neutral_strength': neutral_strength,
                         'neutral': neutral_score}


def score_clothing_color(profile: dict, clothing_color: dict | str) -> dict:
    """Return 0–100 score, six 0–1 components and numerical color diagnostics."""
    color = {'name': clothing_color, 'hex': clothing_color} if isinstance(clothing_color, str) else clothing_color
    rgb = hex_to_rgb(color['hex'])
    lab = rgb_to_lab(rgb)
    chroma, hue = lab_chroma_hue(lab)
    hsl = rgb_to_hsl(rgb)
    temperature = color_temperature(lab)
    lightness = float(lab[0] / 100)
    depth = 1 - lightness
    chroma_normalized = min(1.0, chroma / palette.GARMENT_CHROMA_SCALE)
    user_temperature = profile['temperature']['score']
    width = cfg.TEMPERATURE_WIDTH + cfg.NEUTRAL_TEMPERATURE_EXTRA_WIDTH * (1 - abs(user_temperature))
    temperature_score = _similarity(temperature - user_temperature, width)

    user_contrast = profile['contrast']['score']
    skin_lightness = profile['skin']['lab'][0] / 100
    gap = abs(lightness - skin_lightness)
    target_gap = cfg.CONTRAST_GAP_BASE + cfg.CONTRAST_GAP_RANGE * (user_contrast if user_contrast is not None else 0.5)
    depth_match = _similarity(depth - profile['depth']['score'], cfg.VALUE_WIDTH)
    gap_match = _similarity(gap - target_gap, cfg.VALUE_WIDTH) if user_contrast is not None else 0.5
    value_score = cfg.VALUE_DEPTH_WEIGHT * depth_match + cfg.VALUE_CONTRAST_WEIGHT * gap_match
    chroma_score = _similarity(chroma_normalized - profile['chroma']['score'], cfg.CHROMA_WIDTH)
    harmony_score, harmony_detail = _harmony(profile, hue, chroma, value_score)

    eye = profile['eyes']
    eye_score = 0.5  # Unknown hue gets no bonus or penalty.
    eye_detail = {}
    if eye['lab'] is not None:
        eye_chroma, eye_hue = lab_chroma_hue(eye['lab'])
        eye_detail = harmony_scores(hue, eye_hue)
        hue_affinity = max(eye_detail['analogous'], eye_detail['complementary'])
        evidence = (eye['confidence'] * eye_chroma / (eye_chroma + cfg.NEUTRAL_CHROMA_SCALE) *
                    chroma / (chroma + cfg.NEUTRAL_CHROMA_SCALE))
        eye_score += evidence * (hue_affinity - 0.5)

    season = profile.get('season_analysis') or classify_season(profile)
    garment_vector = np.array([(temperature + 1) / 2, depth, chroma_normalized])
    user_vector = np.array([(user_temperature + 1) / 2, profile['depth']['score'], profile['chroma']['score']])
    profile_distance = float(np.sqrt(np.average((garment_vector - user_vector) ** 2, weights=cfg.SEASON_COLOR_WEIGHTS)))
    profile_match = _similarity(profile_distance, cfg.SEASON_COLOR_WIDTH)
    season_affinities = {}
    for name, prototype in palette.SEASON_PROTOTYPES.items():
        distance = float(np.sqrt(np.average((garment_vector - prototype[:3]) ** 2, weights=cfg.SEASON_COLOR_WEIGHTS)))
        season_affinities[name] = _similarity(distance, cfg.SEASON_COLOR_WIDTH)
    total = sum(season['scores'].values())
    seasonal_match = sum(season_affinities[name] * score for name, score in season['scores'].items()) / total
    # Uncertain seasons defer to the numerical profile; no winner-only lookup.
    season_score = season['confidence'] * seasonal_match + (1 - season['confidence']) * profile_match
    components = {'temperature': temperature_score, 'value': value_score, 'chroma': chroma_score,
                  'harmony': harmony_score, 'season': season_score, 'eyes': float(eye_score)}
    score = 100 * sum(cfg.SCORE_WEIGHTS[name] * value for name, value in components.items()) / sum(cfg.SCORE_WEIGHTS.values())
    return {'name': color.get('name', color['hex']), 'hex': rgb_to_hex(rgb),
            'score': float(np.clip(score, 0, 100)), 'components': components,
            'features': {'rgb': rgb.tolist(), 'lab': lab.tolist(),
                         'hsl': {'hue': hsl[0], 'saturation': hsl[1], 'lightness': hsl[2]},
                         'temperature': temperature, 'lightness': lightness, 'depth': depth,
                         'chroma': chroma, 'normalized_chroma': chroma_normalized, 'lab_hue': hue},
            'diagnostics': {'skin_lightness_gap': gap, 'target_lightness_gap': target_gap,
                            'depth_match': depth_match, 'contrast_gap_match': gap_match,
                            'harmony': harmony_detail, 'eye_harmony': eye_detail,
                            'season_affinities': season_affinities}}
