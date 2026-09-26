"""Iris-only annuli, adaptive glint/pupil rejection and better-eye fallback."""
import numpy as np
from ..config import thresholds as cfg
from .sampling import Measurement, polygon_mask, coverage, weighted_confidence


def iris_geometry(shape: tuple[int, int], points: np.ndarray, center_index: int,
                  ring: tuple[int, ...], lids: tuple[int, ...]
                  ) -> tuple[np.ndarray, float, float]:
    """Return a clipped annulus, radius and geometric landmark-quality proxy."""
    center = points[center_index]
    boundary = points[list(ring)]
    distances = np.linalg.norm(boundary - center, axis=1)
    radius = float(np.median(distances))
    empty = np.zeros(shape, bool)
    if not np.isfinite(radius) or radius < cfg.MIN_IRIS_RADIUS:
        return empty, radius, 0.0
    yy, xx = np.ogrid[:shape[0], :shape[1]]
    distance = np.hypot(xx - center[0], yy - center[1])
    annulus = ((distance >= cfg.IRIS_INNER_RADIUS * radius) &
               (distance <= cfg.IRIS_OUTER_RADIUS * radius))
    mask = annulus & polygon_mask(shape, points[list(lids)], cfg.IRIS_LID_SHRINK)
    roundness = float(distances.min() / max(distances.max(), 1e-6))
    centering = max(0.0, 1.0 - float(np.linalg.norm(boundary.mean(axis=0) - center)) / radius)
    visible = min(1.0, mask.sum() / max(annulus.sum(), 1) / cfg.IRIS_FULL_VISIBLE_FRACTION)
    resolution = min(1.0, radius / cfg.IRIS_FULL_RADIUS)
    return mask, radius, float(roundness * centering * visible * resolution)


def iris_mask(shape: tuple[int, int], points: np.ndarray, center_index: int,
              ring: tuple[int, ...], lids: tuple[int, ...]) -> np.ndarray:
    """Sample 0.35–0.85 radius; the eyelid polygon only clips this annulus."""
    return iris_geometry(shape, points, center_index, ring, lids)[0]


def sample_eye(lab: np.ndarray, points: np.ndarray, name: str,
               geometry: tuple, image_quality: float) -> Measurement:
    """Keep dark irises; reject near-black only if below an adaptive lower fence."""
    candidates, radius, landmark_quality = iris_geometry(lab.shape[:2], points, *geometry)
    highlights = np.zeros(candidates.shape, bool)
    dark_outliers = np.zeros(candidates.shape, bool)
    if candidates.any():
        levels = lab[:, :, 0][candidates]
        median = float(np.median(levels))
        mad = float(np.median(np.abs(levels - median)))
        high_fence = median + max(cfg.IRIS_HIGHLIGHT_DELTA_L, cfg.IRIS_OUTLIER_MAD_FACTOR * mad)
        low_fence = median - max(cfg.IRIS_DARK_DELTA_L, cfg.IRIS_OUTLIER_MAD_FACTOR * mad)
        highlights = candidates & ((lab[:, :, 0] >= cfg.IRIS_HIGHLIGHT_L) | (lab[:, :, 0] > high_fence))
        dark_outliers = candidates & (lab[:, :, 0] < cfg.IRIS_NEAR_BLACK_L) & (lab[:, :, 0] < low_fence)
    retained = candidates & ~highlights & ~dark_outliers
    count, total = int(retained.sum()), int(candidates.sum())
    highlight_fraction = float(highlights.sum() / max(total, 1))
    support = coverage(count, total, cfg.IRIS_FULL_SUPPORT)
    quality = landmark_quality * image_quality * (1 - highlight_fraction)
    local = support * quality
    color = np.median(lab[retained], axis=0) if count >= cfg.MIN_IRIS_PIXELS and landmark_quality > 0 else None
    warnings = []
    if color is None:
        retained = np.zeros(candidates.shape, bool)
        warnings.append(f'{name}: insufficient usable iris evidence')
    diagnostics = {'valid_pixels': int(retained.sum()), 'radius': radius,
                   'candidate_pixels': total, 'highlight_pixels': int(highlights.sum()),
                   'highlight_percentage': 100 * highlight_fraction, 'coverage_score': support,
                   'landmark_quality': landmark_quality, 'quality_score': quality,
                   'local_reliability': local}
    debug = {f'{name}_annulus': candidates, f'{name}_highlights': highlights,
             f'{name}_dark_outliers': dark_outliers, f'{name}_filtered': retained.copy()}
    return Measurement(color, local if color is not None else 0, {name: retained}, warnings, diagnostics, debug)


def extract_eyes(lab: np.ndarray, points: np.ndarray, image_quality: float = 1.0) -> Measurement:
    """Combine consistent irises, or use a demonstrably better single sample."""
    samples = {name: sample_eye(lab, points, name, geometry, image_quality)
               for name, geometry in cfg.EYE_REGIONS.items()}
    available = [(name, sample) for name, sample in samples.items() if sample.lab is not None]
    warnings = [w for sample in samples.values() for w in sample.warnings]
    debug = {k: v for sample in samples.values() for k, v in sample.debug_masks.items()}
    selected = available
    delta, agreement_score = None, 0.0
    if len(available) == 2:
        delta = float(np.linalg.norm(available[0][1].lab - available[1][1].lab))
        better, poorer = sorted(available, key=lambda item: item[1].confidence, reverse=True)
        clear_winner = (better[1].confidence >= cfg.EYE_MIN_LOCAL_QUALITY and
                        better[1].confidence >= cfg.EYE_BETTER_QUALITY_RATIO * max(poorer[1].confidence, 1e-6))
        if delta > cfg.EYE_DISAGREEMENT_DELTA_E:
            if clear_winner:
                selected = [better]
                warnings.append('Eyes disagree; using the eye with stronger independent sampling quality')
            else:
                selected = []
                warnings.append('Eyes disagree without a clearly better sample; no combined color reported')
        elif clear_winner and poorer[1].confidence < cfg.EYE_MIN_LOCAL_QUALITY:
            selected = [better]
            warnings.append('Using the better eye; the other eye has poor sampling quality')
        else:
            agreement_score = float(np.exp(-(delta / cfg.EYE_DISAGREEMENT_DELTA_E) ** 2))
    if len(selected) == 1:
        warnings.append('Single-eye estimate: left/right agreement is unverified (agreement score 0)')
    masks = {name: (sample.masks[name] if any(name == key for key, _ in selected)
                    else np.zeros(lab.shape[:2], bool)) for name, sample in samples.items()}
    total = sum(int(s.diagnostics['candidate_pixels']) for s in samples.values())
    highlights = sum(int(s.diagnostics['highlight_pixels']) for s in samples.values())
    support = float(np.mean([s.diagnostics['coverage_score'] for _, s in selected])) if selected else 0.0
    quality = float(np.mean([s.diagnostics['quality_score'] for _, s in selected])) if selected else 0.0
    diagnostics = {'left_valid_pixels': samples['left_iris'].diagnostics['valid_pixels'],
                   'right_valid_pixels': samples['right_iris'].diagnostics['valid_pixels'],
                   'left_right_delta_e': delta, 'highlight_percentage': 100 * highlights / max(total, 1),
                   'selected_eyes': [name for name, _ in selected],
                   'coverage_score': support, 'agreement_score': agreement_score,
                   'quality_score': quality,
                   'per_eye': {name: s.diagnostics for name, s in samples.items()}}
    color = np.average([s.lab for _, s in selected], axis=0,
                       weights=[max(s.confidence, 1e-6) for _, s in selected]) if selected else None
    confidence = weighted_confidence(support, agreement_score, quality) if selected else 0.0
    return Measurement(color, confidence, masks, warnings, diagnostics, debug)
