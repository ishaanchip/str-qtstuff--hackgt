"""Confidence-weighted robust aggregation of 1–3 independent photo results."""
from itertools import combinations
import numpy as np
from ..config import palette as cfg
from ..color.conversions import lab_to_rgb, rgb_to_hex


def weighted_median(values: np.ndarray, weights: np.ndarray) -> np.ndarray:
    """Coordinate-wise weighted median, averaging an exact halfway tie."""
    values, weights = np.asarray(values, float), np.asarray(weights, float)
    if values.ndim != 2 or weights.shape != (len(values),) or not len(values):
        raise ValueError('Expected nonempty N×D values and N weights')
    if not np.isfinite(values).all() or not np.isfinite(weights).all() or np.any(weights <= 0):
        raise ValueError('Weighted median requires finite values and positive weights')
    medians = []
    for column in values.T:
        order = np.argsort(column, kind='stable')
        ordered, cumulative = column[order], np.cumsum(weights[order])
        halfway = weights.sum() / 2
        index = int(np.searchsorted(cumulative, halfway))
        value = ordered[index]
        if np.isclose(cumulative[index], halfway) and index + 1 < len(ordered):
            value = (value + ordered[index + 1]) / 2
        medians.append(value)
    return np.array(medians)


def aggregate_region(photos: list[dict], region: str) -> tuple[dict, list[str]]:
    """Reject only an isolated third photo backed by two reliable agreeing photos."""
    candidates, warnings = [], []
    for index, photo in enumerate(photos):
        if photo.get('aggregation_excluded'):
            continue
        sample = photo.get(region, {})
        if sample.get('lab') is None or sample.get('confidence', 0) < cfg.MIN_AGGREGATION_CONFIDENCE:
            warnings.append(f'{region}: photo {index + 1} has no reliable measurement')
            continue
        lab = np.asarray(sample['lab'], float)
        confidence = float(sample['confidence'])
        if lab.shape != (3,) or not np.isfinite(lab).all() or not 0 < confidence <= 1:
            raise ValueError(f'{region}: invalid LAB measurement or confidence')
        candidates.append((index, lab, confidence))
    distances = {f'{a[0] + 1}/{b[0] + 1}': float(np.linalg.norm(a[1] - b[1]))
                 for a, b in combinations(candidates, 2)}
    rejected = []
    if len(candidates) == 3:
        pairs = list(combinations(range(3), 2))
        i, j = min(pairs, key=lambda pair: np.linalg.norm(candidates[pair[0]][1] - candidates[pair[1]][1]))
        k = next(n for n in range(3) if n not in (i, j))
        pair_delta = float(np.linalg.norm(candidates[i][1] - candidates[j][1]))
        outlier_delta = min(float(np.linalg.norm(candidates[k][1] - candidates[n][1])) for n in (i, j))
        if (min(candidates[n][2] for n in (i, j)) >= cfg.MIN_CONSENSUS_CONFIDENCE
                and pair_delta <= cfg.PHOTO_CONSENSUS_DELTA_E
                and outlier_delta > max(cfg.PHOTO_OUTLIER_DELTA_E, cfg.PHOTO_OUTLIER_RATIO * pair_delta)):
            rejected.append(candidates[k][0] + 1)
            warnings.append(f'{region}: ignored outlier photo {candidates[k][0] + 1} (Delta E {outlier_delta:.1f} from consensus)')
            candidates.pop(k)
    result = {'lab': None, 'rgb': None, 'hex': None, 'confidence': 0.0,
              'photo_delta_e': distances, 'used_photos': [c[0] + 1 for c in candidates],
              'outlier_photos': rejected}
    if not candidates:
        return result, warnings
    labs = np.array([c[1] for c in candidates])
    weights = np.array([c[2] for c in candidates])
    center = weighted_median(labs, weights)
    max_delta = float(np.max(np.linalg.norm(labs[:, None] - labs[None, :], axis=2)))
    if max_delta > cfg.PHOTO_CONSENSUS_DELTA_E:
        warnings.append(f'{region}: photos disagree (Delta E {max_delta:.1f}); confidence reduced')
    agreement = float(np.exp(-(max_delta / cfg.PHOTO_AGREEMENT_SCALE) ** 2))
    confidence = float(np.average(weights, weights=weights) * agreement *
                       (1 - cfg.OUTLIER_CONFIDENCE_PENALTY * len(rejected)))
    rgb = lab_to_rgb(center)
    result.update(lab=center.tolist(), rgb=rgb.tolist(), hex=rgb_to_hex(rgb), confidence=confidence,
                  agreement_score=agreement,
                  photo_weights={str(c[0] + 1): float(c[2] / weights.sum()) for c in candidates})
    return result, warnings


def aggregate_photos(photos: list[dict]) -> tuple[dict, list[str]]:
    """Return aggregate colors plus warnings without retaining any photo pixels."""
    if not 1 <= len(photos) <= 3:
        raise ValueError('Provide between 1 and 3 photos')
    profile, warnings = {}, []
    for region in cfg.REGIONS:
        profile[region], notices = aggregate_region(photos, region)
        warnings.extend(notices)
    return profile, warnings
