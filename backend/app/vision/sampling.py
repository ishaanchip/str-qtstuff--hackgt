"""Robust color estimates and masks of the exact contributing pixels."""
from dataclasses import dataclass, field
import cv2
import numpy as np
from ..color.conversions import lab_to_rgb
from ..config import thresholds as cfg


@dataclass
class Measurement:
    lab: np.ndarray | None
    confidence: float
    masks: dict[str, np.ndarray] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    diagnostics: dict[str, object] = field(default_factory=dict)
    debug_masks: dict[str, np.ndarray] = field(default_factory=dict)

    @property
    def rgb(self) -> list[int] | None:
        return lab_to_rgb(self.lab).tolist() if self.lab is not None else None

    @property
    def hex(self) -> str | None:
        return '#' + ''.join(f'{c:02X}' for c in self.rgb) if self.rgb else None

    @property
    def lightness(self) -> float | None:
        return float(self.lab[0]) if self.lab is not None else None

    @property
    def chroma(self) -> float | None:
        return float(np.linalg.norm(self.lab[1:])) if self.lab is not None else None


def polygon_mask(shape: tuple[int, int], points: np.ndarray,
                 shrink: float = 1.0) -> np.ndarray:
    """Rasterize a polygon, optionally shrinking it around its center."""
    center = points.mean(axis=0)
    points = center + shrink * (points - center)
    mask = np.zeros(shape, np.uint8)
    cv2.fillPoly(mask, [np.rint(points).astype(np.int32)], 1)
    return mask.astype(bool)


def estimate(lab_image: np.ndarray, candidates: np.ndarray, name: str,
             minimum: int, reliability: float = 1.0) -> Measurement:
    """Reject only strong adaptive LAB outliers; never trim fixed percentiles."""
    empty = np.zeros(candidates.shape, bool)
    pixels = lab_image[candidates]
    if len(pixels) < minimum:
        return Measurement(None, 0.0, {name: empty}, [f'{name}: too few usable pixels'])
    center = np.median(pixels, axis=0)
    distance = np.linalg.norm(pixels - center, axis=1)
    median_distance = np.median(distance)
    mad = np.median(np.abs(distance - median_distance))
    keep = distance <= max(cfg.MIN_COLOR_DISTANCE,
                            median_distance + cfg.COLOR_MAD_FACTOR * mad)
    if keep.sum() < minimum:
        return Measurement(None, 0.0, {name: empty}, [f'{name}: unstable color sample'])
    selected = empty.copy()
    selected[candidates] = keep
    result = np.median(pixels[keep], axis=0)
    # Local support only; extractors compute their final interpretable score.
    confidence = reliability * min(1.0, keep.sum() / minimum) * float(keep.mean())
    return Measurement(result, float(np.clip(confidence, 0, 1)), {name: selected})


def coverage(valid: int, candidate: int, full_support: int) -> float:
    """Retained fraction with a modest absolute evidence floor, not a size bias."""
    return float(min(1.0, valid / full_support) * valid / max(candidate, 1))


def agreement(labs: dict[str, np.ndarray], scale: float
              ) -> tuple[float, dict[str, float]]:
    """Pairwise Delta E 76 and smooth agreement; absent evidence is zero."""
    names = list(labs)
    deltas = {f'{a}/{b}': float(np.linalg.norm(labs[a] - labs[b]))
              for i, a in enumerate(names) for b in names[i + 1:]}
    score = float(np.mean([np.exp(-(d / scale) ** 2) for d in deltas.values()])) if deltas else 0.0
    return score, deltas


def weighted_confidence(support: float, consistency: float, quality: float) -> float:
    """40% support + 40% consistency + 20% quality, with bounded inputs."""
    return float(np.dot(cfg.CONFIDENCE_WEIGHTS, np.clip([support, consistency, quality], 0, 1)))


def combine(samples: list[Measurement], expected: int,
            disagreement_limit: float = 20.0) -> Measurement:
    """Combine regions within one photo, penalizing missing/inconsistent regions."""
    valid = [s for s in samples if s.lab is not None]
    masks = {k: v for s in samples for k, v in s.masks.items()}
    warnings = [w for s in samples for w in s.warnings]
    if not valid:
        return Measurement(None, 0, masks, warnings)
    labs = np.array([s.lab for s in valid])
    weights = np.array([max(s.confidence, 0.001) for s in valid])
    disagreement = float(np.max(np.linalg.norm(labs[:, None] - labs[None, :], axis=2)))
    if disagreement > disagreement_limit:
        warnings.append('Regions disagree in color; inspect lighting and debug masks')
    confidence = float(weights.mean() * len(valid) / expected *
                       np.exp(-disagreement / disagreement_limit))
    return Measurement(np.average(labs, axis=0, weights=weights), confidence, masks, warnings)
