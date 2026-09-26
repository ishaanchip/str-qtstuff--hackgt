"""Single-photo CLI for Phase 1–3 skin, hair and iris color extraction."""
import argparse
import json
from io import BytesIO
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageCms, ImageOps, UnidentifiedImageError
from .color.conversions import rgb_to_lab
from .config.thresholds import MAX_IMAGE_SIDE
from .vision.face_landmarks import detect_regions
from .vision.skin import extract_skin
from .vision.hair import extract_hair
from .vision.eyes import extract_eyes
from .vision.quality import assess_quality
from .vision.sampling import Measurement
from .utils.visualization import save_debug

DEFAULT_MODELS = Path(__file__).resolve().parents[1] / 'models'


def load_image(path: Path) -> np.ndarray:
    """Honor EXIF orientation and embedded ICC profiles; return bounded sRGB."""
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source)
        if 'A' in image.getbands() or 'transparency' in image.info:
            raise ValueError('Use an opaque RGB portrait; transparency is unsupported.')
        if image.info.get('icc_profile'):
            image = ImageCms.profileToProfile(
                image, ImageCms.ImageCmsProfile(BytesIO(image.info['icc_profile'])),
                ImageCms.createProfile('sRGB'), outputMode='RGB')
        else:
            image = image.convert('RGB')
        image.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE), Image.Resampling.LANCZOS)
        return np.array(image, dtype=np.uint8)


def analyze_image(rgb: np.ndarray, model_dir: Path = DEFAULT_MODELS
                  ) -> tuple[dict[str, Measurement], list[str]]:
    """Analyze in memory; returned masks align with the input RGB array."""
    points, hair_probability, skin_probability = detect_regions(rgb, model_dir)
    lab = rgb_to_lab(rgb)
    quality, warnings = assess_quality(rgb, points)
    skin = extract_skin(lab, points, skin_probability, quality)
    results = {'skin': skin,
               'hair': extract_hair(lab, points, hair_probability, skin.lab),
               'eyes': extract_eyes(lab, points, quality)}
    for result in results.values():
        warnings.extend(result.warnings)
    return results, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image', type=Path)
    parser.add_argument('--model-dir', type=Path, default=DEFAULT_MODELS)
    parser.add_argument('--debug-output', type=Path,
                        help='Save an overview PNG plus individual binary masks and diagnostic JSON')
    args = parser.parse_args()
    try:
        if args.debug_output and args.debug_output.exists():
            raise ValueError('Debug output already exists; choose a new path (files are never overwritten).')
        rgb = load_image(args.image)
        results, warnings = analyze_image(rgb, args.model_dir)
        if args.debug_output:
            save_debug(rgb, results, args.debug_output)
        for name, result in results.items():
            print(f'\n{name.upper()}')
            print(f'RGB: {result.rgb if result.rgb is not None else "unavailable"}')
            print(f'HEX: {result.hex or "unavailable"}')
            lab = [round(float(value), 2) for value in result.lab] if result.lab is not None else 'unavailable'
            print(f'LAB: {lab}\nConfidence: {result.confidence:.2f}')
            for key, value in result.diagnostics.items():
                print(f'{key}: {json.dumps(value, allow_nan=False)}')
        print('\nConfidence is a heuristic quality score, not a calibrated probability.')
        for warning in dict.fromkeys(warnings):
            print(f'Warning: {warning}', file=sys.stderr)
        if args.debug_output:
            print(f'Debug image: {args.debug_output}')
            print(f'Masks and diagnostics: {args.debug_output.with_name(args.debug_output.stem + "_masks")}')
        return 0 if results['skin'].lab is not None else 2
    except (OSError, ValueError, RuntimeError, UnidentifiedImageError,
            ImageCms.PyCMSError, Image.DecompressionBombError) as error:
        print(f'Error: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
