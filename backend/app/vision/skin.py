"""Larger safe forehead/cheek patches with explicit cross-region agreement."""
import numpy as np
from ..config import thresholds as cfg
from .sampling import Measurement, polygon_mask, estimate, coverage, agreement, weighted_confidence


def extract_skin(lab: np.ndarray, points: np.ndarray,
                 skin_probability: np.ndarray, image_quality: float = 1.0) -> Measurement:
    """Measure three patches; score support, pairwise Delta E and lighting."""
    samples, support, masks, debug = {}, [], {}, {}
    warnings = []
    for name, indices in cfg.SKIN_PATCHES.items():
        region = polygon_mask(lab.shape[:2], points[list(indices)], cfg.SKIN_PATCH_SHRINK)
        candidates = region & (skin_probability >= cfg.SEGMENT_CONFIDENCE)
        exposure_ok = ((lab[:, :, 0] > cfg.SKIN_CLIPPED_L_RANGE[0]) &
                       (lab[:, :, 0] < cfg.SKIN_CLIPPED_L_RANGE[1]))
        sample = estimate(lab, candidates & exposure_ok, name, cfg.MIN_SKIN_PIXELS)
        retained = sample.masks[name]
        masks[name] = retained
        debug.update({f'{name}_region': region, f'{name}_candidates': candidates,
                      f'{name}_rejected': region & ~retained})
        support.append(coverage(int(retained.sum()), int(region.sum()), cfg.SKIN_FULL_SUPPORT))
        warnings.extend(sample.warnings)
        if sample.lab is not None:
            samples[name] = sample.lab
    consistency, deltas = agreement(samples, cfg.SKIN_AGREEMENT_DELTA_E)
    # Only observed pairs corroborate: 1/3 if two of three patches survive.
    consistency *= len(deltas) / 3
    union = np.logical_or.reduce(list(masks.values()))
    raw_candidates = np.logical_or.reduce([debug[f'{name}_candidates'] for name in cfg.SKIN_PATCHES])
    levels = lab[:, :, 0][raw_candidates]
    clipped = float(((levels <= cfg.SKIN_CLIPPED_L_RANGE[0]) |
                     (levels >= cfg.SKIN_CLIPPED_L_RANGE[1])).mean()) if levels.size else 1.0
    lighting = float(image_quality * (1 - clipped))
    diagnostics = {'valid_pixels': int(union.sum()), 'region_delta_e': deltas,
                   'region_valid_pixels': {name: int(mask.sum()) for name, mask in masks.items()},
                   'coverage_score': float(np.mean(support)),
                   'consistency_score': consistency, 'lighting_score': lighting}
    if not samples:
        return Measurement(None, 0, masks, warnings, diagnostics, debug)
    # Equal-region median prevents one large cheek from dominating the forehead.
    color = np.median(list(samples.values()), axis=0)
    confidence = weighted_confidence(float(np.mean(support)), consistency, lighting)
    if deltas and max(deltas.values()) > cfg.SKIN_AGREEMENT_DELTA_E:
        warnings.append('Skin regions disagree in LAB; inspect shadows, makeup and masks')
    return Measurement(color, confidence, masks, warnings, diagnostics, debug)
