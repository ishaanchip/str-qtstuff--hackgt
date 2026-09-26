"""Three hair candidates, skin rejection and deterministic dominant clustering."""
import cv2
import numpy as np
from ..config import thresholds as cfg
from .sampling import Measurement, estimate, polygon_mask, coverage, agreement, weighted_confidence


def dominant_cluster(pixels: np.ndarray) -> np.ndarray:
    """Deterministic farthest-seeded LAB Lloyd clustering; return dominant labels."""
    sample = pixels[np.linspace(0, len(pixels) - 1,
                                min(len(pixels), cfg.HAIR_CLUSTER_MAX_SAMPLES), dtype=int)]
    centers = [sample[np.argmin(np.linalg.norm(sample - np.median(sample, axis=0), axis=1))]]
    for _ in range(cfg.HAIR_CLUSTER_COUNT - 1):
        distance = np.min(np.linalg.norm(sample[:, None] - np.array(centers), axis=2), axis=1)
        if distance.max() < cfg.HAIR_CLUSTER_MIN_DISTANCE:
            break
        centers.append(sample[distance.argmax()])
    centers = np.array(centers)
    for _ in range(cfg.HAIR_CLUSTER_ITERATIONS):
        labels = np.argmin(np.linalg.norm(sample[:, None] - centers, axis=2), axis=1)
        updated = np.array([sample[labels == i].mean(axis=0) if np.any(labels == i) else c
                            for i, c in enumerate(centers)])
        if np.allclose(updated, centers, atol=0.1):
            break
        centers = updated
    labels = np.argmin(np.linalg.norm(pixels[:, None] - centers, axis=2), axis=1)
    return labels == np.bincount(labels, minlength=len(centers)).argmax()


def extract_hair(lab: np.ndarray, points: np.ndarray, hair_probability: np.ndarray,
                 skin_lab: np.ndarray | None = None) -> Measurement:
    """Estimate the dominant segmented hair color from three overlapping regions."""
    top = points[10]
    vertical = points[152] - top
    horizontal = points[454] - points[234]
    regions, debug = {}, {}
    for name, (x0, x1, y0, y1) in cfg.HAIR_REGIONS.items():
        corners = np.array([top + x * horizontal + y * vertical
                            for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))])
        region = polygon_mask(lab.shape[:2], corners)
        segmented = region & (hair_probability >= cfg.SEGMENT_CONFIDENCE)
        regions[name] = cv2.erode(segmented.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
        debug[f'{name}_region'] = region
        debug[f'{name}_segmented'] = regions[name]
    segmented = np.logical_or.reduce(list(regions.values()))
    skin_rejected = np.zeros(segmented.shape, bool)
    if skin_lab is not None:
        skin_rejected = segmented & (np.linalg.norm(lab - skin_lab, axis=2) < cfg.HAIR_SKIN_REJECTION_DELTA_E)
    candidates = segmented & ~skin_rejected
    debug.update(hair_skin_rejected=skin_rejected, hair_candidates=candidates)
    dominant = np.zeros(segmented.shape, bool)
    if candidates.sum() >= cfg.MIN_HAIR_PIXELS:
        dominant[candidates] = dominant_cluster(lab[candidates])
    sample = estimate(lab, dominant, 'hair', cfg.MIN_HAIR_PIXELS)
    retained = sample.masks['hair']
    masks = {name: region & retained for name, region in regions.items()}
    masks['hair'] = retained
    debug.update(hair_cluster_rejected=candidates & ~dominant,
                 hair_outliers=dominant & ~retained)
    # Compare the original eligible regional colors, not just the chosen cluster:
    # otherwise forcing all regions into one cluster would inflate agreement.
    regional_labs = {name: np.median(lab[region & candidates], axis=0)
                     for name, region in regions.items()
                     if (region & candidates).sum() >= cfg.MIN_HAIR_PIXELS}
    region_agreement, deltas = agreement(regional_labs, cfg.HAIR_AGREEMENT_DELTA_E)
    ratio = float(dominant.sum() / max(1, candidates.sum()))
    compactness = (float(np.exp(-(np.median(np.linalg.norm(lab[retained] - sample.lab, axis=1)) /
                                 cfg.HAIR_AGREEMENT_DELTA_E) ** 2)) if retained.any() else 0.0)
    consistency = ratio * (0.5 * compactness + 0.5 * region_agreement)
    separation = float(np.linalg.norm(sample.lab - skin_lab)) if sample.lab is not None and skin_lab is not None else None
    segmentation_quality = float(hair_probability[retained].mean()) if retained.any() else 0.0
    separation_score = segmentation_quality * (min(1.0, separation / cfg.HAIR_SKIN_SEPARATION_DELTA_E)
                                               if separation is not None else 0.0)
    # Multimodality is scored in consistency, separately from usable pixel support.
    support = coverage(int(retained.sum()), int(dominant.sum() + skin_rejected.sum()), cfg.HAIR_FULL_SUPPORT)
    diagnostics = {'valid_pixels': int(retained.sum()), 'candidate_pixels': int(candidates.sum()),
                   'dominant_cluster_ratio': ratio, 'skin_separation': separation,
                   'region_delta_e': deltas, 'region_valid_pixels': {k: int(v.sum()) for k, v in masks.items() if k != 'hair'},
                   'coverage_score': support, 'consistency_score': consistency,
                   'separation_score': separation_score, 'segmentation_score': segmentation_quality}
    warnings = sample.warnings
    if skin_lab is None:
        warnings.append('Hair: skin color unavailable; skin rejection/separation could not be assessed')
    confidence = weighted_confidence(support, consistency, separation_score) if sample.lab is not None else 0.0
    return Measurement(sample.lab, confidence, masks, warnings, diagnostics, debug)
