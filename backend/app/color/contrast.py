"""Pairwise facial contrast emphasizing L* differences over chromatic distance."""
from itertools import combinations
import numpy as np
from ..config import palette as cfg


def compute_contrast(colors: dict) -> dict:
    """Confidence-weighted RMS of available pair contrasts, with raw distances."""
    result, scores, weights = {}, [], []
    for a, b in combinations(cfg.REGIONS, 2):
        key = f'{a}_{b}'.replace('eyes', 'eye')
        first, second = colors[a], colors[b]
        delta, gap = None, None
        if first['lab'] is not None and second['lab'] is not None:
            delta = float(np.linalg.norm(np.array(first['lab']) - second['lab']))
            gap = abs(float(first['lab'][0] - second['lab'][0]))
            score = (cfg.CONTRAST_LIGHTNESS_WEIGHT * min(1, gap / cfg.CONTRAST_L_SCALE) +
                     (1 - cfg.CONTRAST_LIGHTNESS_WEIGHT) * min(1, delta / cfg.CONTRAST_DELTA_E_SCALE))
            weight = min(first['confidence'], second['confidence'])
            if weight > 0:
                scores.append(score)
                weights.append(weight)
        result[f'{key}_delta_e'] = delta
        result[f'{key}_lightness_difference'] = gap
    score = float(np.sqrt(np.average(np.square(scores), weights=weights))) if weights else None
    label = ('low', 'medium', 'high')[int(np.searchsorted(cfg.CONTRAST_LABEL_BOUNDS, score))] if score is not None else 'unknown'
    result.update(score=score, label=label, confidence=float(sum(weights) / 3))
    return result
