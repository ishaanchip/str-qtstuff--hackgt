"""Conservative photo-color screening, not a garment segmentation model."""
from io import BytesIO
from http.client import HTTPException
import numpy as np
from PIL import Image, ImageOps
from backend.app.product_images import download_image
from backend.app.color.conversions import rgb_to_lab, hex_to_rgb, lab_to_rgb, rgb_to_hex


def measure_match(data, target_hex):
    with Image.open(BytesIO(data)) as image:
        if image.width * image.height > 20_000_000:
            return None
        image = ImageOps.exif_transpose(image).convert('RGBA')
        image.thumbnail((160, 160))
        pixels = np.asarray(image)
    if min(pixels.shape[:2]) < 12:
        return None
    lab = rgb_to_lab(pixels[:, :, :3])
    alpha = pixels[:, :, 3]
    mask = alpha > 240
    if (alpha < 20).mean() < 0.05:
        # Only trust opaque product photos with a near-uniform background.
        border = np.concatenate((lab[:2].reshape(-1, 3), lab[-2:].reshape(-1, 3),
                                 lab[:, :2].reshape(-1, 3), lab[:, -2:].reshape(-1, 3)))
        background = np.median(border, axis=0)
        if np.percentile(np.linalg.norm(border - background, axis=1), 90) > 10:
            return None
        mask &= np.linalg.norm(lab - background, axis=2) > 12
    foreground = lab[mask]
    if len(foreground) < 100 or len(foreground) < 0.08 * alpha.size:
        return None
    target = rgb_to_lab(hex_to_rgb(target_hex))
    distances = np.linalg.norm(foreground - target, axis=1)
    coverage = float((distances <= 22).mean())
    measured = np.median(foreground, axis=0)
    distance = float(np.linalg.norm(measured - target))
    # A small matching logo/trim must not qualify an otherwise different garment.
    if coverage < 0.60 or distance > 18:
        return None
    target_chroma, measured_chroma = np.linalg.norm(target[1:]), np.linalg.norm(measured[1:])
    if target_chroma >= 15:
        if measured_chroma < 8:
            return None
        hue_gap = abs((np.degrees(np.arctan2(target[2], target[1]) - np.arctan2(measured[2], measured[1])) + 180) % 360 - 180)
        if hue_gap > 25:
            return None
    elif target_chroma < 8 and measured_chroma > 12:
        return None
    return {'measured_hex': rgb_to_hex(lab_to_rgb(measured)), 'distance_delta_e76': round(distance, 2),
            'matching_foreground_fraction': round(coverage, 3)}


def verify_product(product):
    if not product.get('image'):
        return None
    try:
        match = measure_match(download_image(product['image']), product['palette_hex'])
    except (OSError, ValueError, HTTPException, Image.DecompressionBombError):
        return None
    if not match:
        return None
    return {**product, 'photo_color_match': match, 'match_method': 'Foreground photo color check'}
