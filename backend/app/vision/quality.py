"""Lightweight image quality penalties, without changing observed colors."""
import cv2
import numpy as np
from ..config import thresholds as cfg


def assess_quality(rgb: np.ndarray, points: np.ndarray) -> tuple[float, list[str]]:
    height, width = rgb.shape[:2]
    x0, y0 = np.maximum(np.floor(points.min(axis=0)).astype(int), 0)
    x1, y1 = np.minimum(np.ceil(points.max(axis=0)).astype(int), (width, height))
    crop = rgb[y0:y1, x0:x1]
    if not crop.size:
        raise ValueError('Face landmarks lie outside the image.')
    gray = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
    blur = float(cv2.Laplacian(gray, cv2.CV_32F).var())
    clipping = float(((gray < 8) | (gray > 247)).mean())
    factor = min(1.0, blur / cfg.BLUR_REFERENCE) * (1 - clipping)
    warnings = []
    if blur < cfg.BLUR_REFERENCE:
        warnings.append('Face is blurry; color confidence reduced')
    if clipping > 0.15:
        warnings.append('Face has substantial exposure clipping')
    if x1 - x0 < cfg.MIN_FACE_WIDTH:
        factor *= (x1 - x0) / cfg.MIN_FACE_WIDTH
        warnings.append('Face is small; use a closer portrait')
    return max(0.0, factor), warnings
