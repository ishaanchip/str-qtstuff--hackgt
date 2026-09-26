"""sRGB and standard CIELAB (D65), using OpenCV's float convention."""
import cv2
import colorsys
import re
import numpy as np


def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    """Convert RGB 0..255 to L* 0..100 and signed a*/b*, preserving shape."""
    values = np.asarray(rgb, dtype=np.float32)
    return cv2.cvtColor(values.reshape(-1, 1, 3) / 255.0,
                        cv2.COLOR_RGB2LAB).reshape(values.shape)


def lab_to_rgb(lab: np.ndarray) -> np.ndarray:
    """Convert standard CIELAB to rounded sRGB bytes."""
    values = np.asarray(lab, dtype=np.float32)
    rgb = cv2.cvtColor(values.reshape(-1, 1, 3), cv2.COLOR_LAB2RGB)
    return np.rint(np.clip(rgb.reshape(values.shape), 0, 1) * 255).astype(np.uint8)


def hex_to_rgb(value: str) -> np.ndarray:
    """Parse strict six-digit sRGB HEX so malformed candidates fail clearly."""
    if not isinstance(value, str) or not re.fullmatch(r'#[0-9a-fA-F]{6}', value):
        raise ValueError('Color must be a six-digit HEX string, e.g. #355E3B')
    return np.array([int(value[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.uint8)


def rgb_to_hex(rgb: np.ndarray) -> str:
    """Format an RGB triplet as uppercase HEX."""
    return '#' + ''.join(f'{int(c):02X}' for c in rgb)


def rgb_to_hsl(rgb: np.ndarray) -> tuple[float, float, float]:
    """Return hue degrees, saturation 0..1 and lightness 0..1."""
    hue, lightness, saturation = colorsys.rgb_to_hls(*(np.asarray(rgb) / 255.0))
    return float(hue * 360), float(saturation), float(lightness)


def lab_chroma_hue(lab: np.ndarray) -> tuple[float, float]:
    """Return C* and hue degrees; achromatic hue is gated by chroma elsewhere."""
    _, a, b = lab
    return float(np.hypot(a, b)), float(np.degrees(np.arctan2(b, a)) % 360)
