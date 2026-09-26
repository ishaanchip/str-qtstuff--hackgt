"""Numerical facial color profile built only from observed aggregate colors."""
import numpy as np
from ..config import palette as cfg
from .conversions import lab_chroma_hue
from .temperature import color_temperature, temperature_label
from .contrast import compute_contrast


def _weighted_feature(colors: dict, values: dict, weights: dict) -> tuple[float, float]:
    """Use confidence in influence and retain missing-evidence confidence loss."""
    effective = {name: weights[name] * colors[name]['confidence'] for name in values}
    support = sum(effective.values())
    if support <= 0:
        raise ValueError('No reliable color evidence for facial profile')
    return float(sum(values[n] * effective[n] for n in values) / support), float(support / sum(weights.values()))


def build_profile(colors: dict) -> dict:
    """Compute temperature, depth, chroma and contrast, preserving measurements."""
    if colors['skin']['lab'] is None:
        raise ValueError('No reliable skin measurement; use a clear, evenly lit portrait')
    valid = {name: sample for name, sample in colors.items()
             if name in cfg.REGIONS and sample['lab'] is not None and sample['confidence'] > 0}
    temperatures = {n: color_temperature(s['lab'], skin=n == 'skin') for n, s in valid.items()}
    depths = {n: float(np.clip(1 - s['lab'][0] / 100, 0, 1)) for n, s in valid.items()}
    chromas = {n: lab_chroma_hue(s['lab'])[0] for n, s in valid.items()}
    temperature, t_conf = _weighted_feature(colors, temperatures, cfg.TEMPERATURE_WEIGHTS)
    depth, d_conf = _weighted_feature(colors, depths, cfg.FEATURE_WEIGHTS)
    chroma_lab, c_conf = _weighted_feature(colors, chromas, cfg.FEATURE_WEIGHTS)
    chroma = float(np.clip(chroma_lab / cfg.FACIAL_CHROMA_SCALE, 0, 1))
    contrast = compute_contrast(colors)
    profile = {**colors,
               'temperature': {'score': temperature, 'label': temperature_label(temperature),
                               'confidence': t_conf, 'per_region': temperatures},
               'depth': {'score': depth, 'label': ('light', 'medium', 'deep')[int(np.searchsorted(cfg.DEPTH_LABEL_BOUNDS, depth))],
                         'confidence': d_conf, 'per_region': depths},
               'chroma': {'score': chroma, 'label': ('muted', 'medium', 'bright')[int(np.searchsorted(cfg.CHROMA_LABEL_BOUNDS, chroma))],
                          'confidence': c_conf, 'lab_chroma': chroma_lab, 'per_region': chromas},
               'contrast': contrast}
    profile['confidence'] = float(np.mean([t_conf, d_conf, c_conf, contrast['confidence']]))
    return profile
