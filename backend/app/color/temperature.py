"""Continuous LAB temperature proxies for styling, not measured undertones."""
import numpy as np
from ..config import palette as cfg
from .conversions import lab_chroma_hue


def color_temperature(lab: np.ndarray, *, skin: bool = False) -> float:
    """Hue projection attenuated toward neutral at low chroma.

    Skin uses a configurable pink-to-golden axis inside its usual hue range.
    Other colors use a warm-axis projection. Neither axis is a biological fact.
    """
    chroma, hue = lab_chroma_hue(lab)
    if skin:
        projection = chroma * np.sin(np.radians(hue - cfg.SKIN_NEUTRAL_HUE))
        return float(np.tanh(projection / cfg.SKIN_TEMPERATURE_SCALE))
    return float(np.cos(np.radians(hue - cfg.WARM_HUE)) *
                 chroma / (chroma + cfg.TEMPERATURE_CHROMA_SCALE))


def temperature_label(score: float) -> str:
    """Map a continuous [-1, 1] score to a configurable display label."""
    labels = ('cool', 'cool-neutral', 'neutral', 'warm-neutral', 'warm')
    return labels[int(np.searchsorted(cfg.TEMPERATURE_LABEL_BOUNDS, score, side='right'))]
