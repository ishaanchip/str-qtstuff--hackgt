"""Explicitly requested debug export; no photos are saved by analysis itself."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from ..vision.sampling import Measurement

MASK_COLORS = {
    'forehead': (255, 180, 0), 'right_cheek': (0, 220, 100),
    'left_cheek': (0, 180, 255), 'hair': (230, 70, 220),
    'right_iris': (255, 60, 60), 'left_iris': (130, 110, 255),
}


def save_debug(rgb: np.ndarray, measurements: dict[str, Measurement], path: Path) -> None:
    """Save overview plus lossless binary masks and a diagnostic JSON sidecar."""
    mask_dir = path.with_name(path.stem + '_masks')
    if path.exists() or mask_dir.exists():
        raise FileExistsError('Debug image or mask directory already exists; choose a new output path.')
    height, width = rgb.shape[:2]
    masks = np.zeros_like(rgb)
    for result in measurements.values():
        for name, mask in result.masks.items():
            masks[mask] = MASK_COLORS.get(name, MASK_COLORS['hair'])
    canvas = Image.new('RGB', (max(720, width * 2), height + 220), '#202020')
    canvas.paste(Image.fromarray(rgb), (0, 0))
    canvas.paste(Image.fromarray(masks), (width, 0))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, height + 8), 'LEFT: input (oriented/resized) | RIGHT: exact retained sample pixels', fill='white')
    for i, (name, color) in enumerate(MASK_COLORS.items()):
        x, y = 12 + (i % 3) * 230, height + 32 + (i // 3) * 22
        draw.rectangle((x, y, x + 12, y + 12), fill=color)
        draw.text((x + 18, y), name, fill='white')
    for i, (name, result) in enumerate(measurements.items()):
        y = height + 86 + i * 38
        draw.rectangle((12, y, 58, y + 28), fill=tuple(result.rgb) if result.rgb else '#555555')
        draw.text((70, y + 7), f'{name.upper()}  {result.hex or "unavailable"}  confidence={result.confidence:.2f}', fill='white')
    path.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation prevents accidentally overwriting the input or another file.
    with path.open('xb') as output:
        canvas.save(output, format='PNG')
    mask_dir.mkdir(exist_ok=False)
    for result in measurements.values():
        exports = {**result.debug_masks, **{f'{name}_retained': mask for name, mask in result.masks.items()}}
        for name, mask in exports.items():
            with (mask_dir / f'{name}.png').open('xb') as output:
                Image.fromarray(mask.astype(np.uint8) * 255).save(output, format='PNG')
    diagnostics = {name: {'confidence': result.confidence, 'rgb': result.rgb,
                           'lab': result.lab.tolist() if result.lab is not None else None,
                           'warnings': result.warnings, **result.diagnostics}
                   for name, result in measurements.items()}
    with (mask_dir / 'diagnostics.json').open('x') as output:
        json.dump(diagnostics, output, indent=2, allow_nan=False)
