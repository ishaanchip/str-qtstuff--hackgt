"""Circular hue-angle harmony with chroma-aware neutral handling."""
import numpy as np
from ..config import scoring as cfg


def hue_distance(first: float, second: float) -> float:
    """Smallest angular separation in degrees, including wraparound at 360."""
    return float(abs((first - second + 180) % 360 - 180))


def harmony_scores(hue: float, reference: float) -> dict[str, float]:
    """Continuous analogous/complementary/split/triadic affinities, each 0..1."""
    distance = hue_distance(hue, reference)
    return {name: float(max(np.exp(-0.5 * ((distance - target) / cfg.HARMONY_WIDTH_DEGREES) ** 2)
                                for target in targets))
            for name, targets in cfg.HARMONY_TARGETS.items()}
