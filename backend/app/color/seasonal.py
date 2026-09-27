"""Approximate seasonal styling prototypes, never biological classifications."""
import numpy as np
from ..config import palette as cfg


def classify_season(profile: dict) -> dict:
    """Score all seasons by weighted distance; ambiguity lowers confidence."""
    feature_names = ('temperature', 'depth', 'chroma', 'contrast')
    vector = [profile[name]['score'] for name in feature_names]
    vector[0] = (vector[0] + 1) / 2
    present = np.array([v is not None for v in vector])
    values = np.array([v if v is not None else 0.5 for v in vector])
    weights = np.array(cfg.SEASON_FEATURE_WEIGHTS) * present
    scores, distances = {}, {}
    for season, prototype in cfg.SEASON_PROTOTYPES.items():
        distance = float(np.sqrt(np.average((values - prototype) ** 2, weights=weights)))
        distances[season] = distance
        scores[season] = float(np.exp(-0.5 * (distance / cfg.SEASON_DISTANCE_SCALE) ** 2))
    order = sorted(scores, key=lambda name: -scores[name])
    winner = order[0]
    margin = scores[winner] - scores[order[1]]
    confidence = float(profile['confidence'] * scores[winner] * min(1, margin / cfg.SEASON_CONFIDENCE_MARGIN))
    reasoning = [f'Temperature is {profile["temperature"]["label"]} ({profile["temperature"]["score"]:+.2f}).',
                 f'Overall depth is {profile["depth"]["label"]} ({profile["depth"]["score"]:.2f}).',
                 f'Chroma is {profile["chroma"]["label"]} ({profile["chroma"]["score"]:.2f}).',
                 f'Facial contrast is {profile["contrast"]["label"]}.',
                 f'{winner} has the smallest weighted prototype distance ({distances[winner]:.3f}); runner-up is {order[1]}.',
                 'Season labels are approximate styling heuristics, not biological classifications.']
    return {'season': winner, 'confidence': confidence, 'scores': scores,
            'distances': distances, 'margin': margin,
            'vector': {k: (float(v) if p else None) for k, v, p in zip(feature_names, values, present)},
            'reasoning': reasoning}
