"""Ou & Luo (2006), Color Research & Application 31:191–204, Eq. 11.

DOI: 10.1002/col.20208. Independent implementation of the published equations.
The model predicts laboratory two-color harmony, not outfit preference or skin
compatibility. The display scale uses the paper's observed [-1.24, 1.39] range;
clipping outside it is an application choice, not a calibrated probability.
"""
import math
import numpy as np

MODEL_ID = 'ou-luo-2006-v1'
SOURCE = 'https://doi.org/10.1002/col.20208'


def _hue_effect(lightness, chroma, hue):
    strength = 0.5 + 0.5 * math.tanh(-2 + 0.5 * chroma)
    base = (-0.08 - 0.14 * math.sin(math.radians(hue + 50))
            - 0.07 * math.sin(math.radians(2 * hue + 90)))
    x = (90 - hue) / 10
    yellow = ((0.22 * lightness - 12.8) / 10) * math.exp(x - math.exp(x))
    return strength * (base + yellow)


def pair_harmony(first, second):
    """Return symmetric pair prediction and interpretable model terms for LAB."""
    values = np.asarray([first, second], dtype=float)
    if values.shape != (2, 3) or not np.isfinite(values).all():
        raise ValueError('Harmony requires two finite LAB colors.')
    if np.any((values[:, 0] < 0) | (values[:, 0] > 100)) or np.any(np.abs(values[:, 1:]) > 160):
        raise ValueError('LAB colors are outside the supported range.')
    l1, a1, b1 = values[0]; l2, a2, b2 = values[1]
    c1, c2 = math.hypot(a1, b1), math.hypot(a2, b2)
    h1, h2 = math.degrees(math.atan2(b1, a1)) % 360, math.degrees(math.atan2(b2, a2)) % 360
    # CIELAB delta-H squared, not a distance measured in hue degrees.
    delta_h_squared = max(0., (a1 - a2) ** 2 + (b1 - b2) ** 2 - (c1 - c2) ** 2)
    delta_c = math.sqrt(delta_h_squared + ((c1 - c2) / 1.46) ** 2)
    chromatic = 0.04 + 0.53 * math.tanh(0.8 - 0.045 * delta_c)
    lightness_sum = 0.28 + 0.54 * math.tanh(-3.88 + 0.029 * (l1 + l2))
    lightness_contrast = 0.14 + 0.15 * math.tanh(-2 + 0.2 * abs(l1 - l2))
    hue = _hue_effect(l1, c1, h1) + _hue_effect(l2, c2, h2)
    raw = chromatic + lightness_sum + lightness_contrast + hue
    return {'raw': float(raw), 'score': float(np.clip(100 * (raw + 1.24) / 2.63, 0, 100)),
            'terms': {'chromatic': float(chromatic), 'lightness_sum': float(lightness_sum),
                      'lightness_contrast': float(lightness_contrast), 'hue': float(hue)}}
