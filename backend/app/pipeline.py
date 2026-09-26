"""Callable Phase 4–7 pipeline wrapping the unchanged single-photo extractor."""
from pathlib import Path
from io import BytesIO
from collections.abc import Sequence
import hashlib
import numpy as np
from PIL import Image, ImageCms
from .main import analyze_image, load_image, DEFAULT_MODELS
from .vision.aggregation import aggregate_photos
from .color.profile import build_profile
from .color.seasonal import classify_season
from .data.clothing_colors import CLOTHING_COLORS
from .recommendation.color_ranker import rank_colors, group_colors
from .utils.visualization import save_debug


def analyze_photos(image_paths: Sequence[str | Path | BytesIO], model_dir: Path = DEFAULT_MODELS,
                   *, candidate_colors: list[dict] | None = None,
                   debug_dir: Path | None = None) -> dict:
    """Analyze photo paths or in-memory uploads and return JSON-ready rankings.

    Photos must depict the same person; identity is not inferred or verified.
    Recoverable per-photo errors are reported, and remaining photos are usable.
    Debug output is explicitly opt-in. Nothing is persisted by default.
    """
    if isinstance(image_paths, (str, Path)) or not 1 <= len(image_paths) <= 3:
        raise ValueError('Provide a list of 1–3 photo paths')
    if debug_dir is not None:
        debug_dir = Path(debug_dir)
        if debug_dir.exists():
            raise FileExistsError('Debug directory already exists; choose a fresh directory')
    photos, warnings, seen = [], [], set()
    analyzed = 0
    for index, path in enumerate(image_paths, 1):
        path = path if isinstance(path, BytesIO) else Path(path)
        record = {'photo': index, 'source': 'uploaded portrait' if isinstance(path, BytesIO) else str(path), 'status': 'error'}
        try:
            rgb = load_image(path)
            # Exact duplicate files cannot provide independent corroboration.
            digest = hashlib.sha256(str(rgb.shape).encode() + np.ascontiguousarray(rgb).tobytes()).hexdigest()
            measurements, notices = analyze_image(rgb, Path(model_dir))
        except (OSError, ValueError, RuntimeError, ImageCms.PyCMSError, Image.DecompressionBombError) as error:
            record['error'] = str(error)
            photos.append(record)
            warnings.append(f'Photo {index}: {error}')
            continue
        analyzed += 1
        record.update(status='ok', warnings=notices,
                      lighting_score=measurements['skin'].diagnostics.get('lighting_score'))
        if digest in seen:
            record['aggregation_excluded'] = True
            warnings.append(f'Photo {index}: duplicate decoded photo excluded from aggregation')
        seen.add(digest)
        for name, sample in measurements.items():
            record[name] = {'lab': sample.lab.tolist() if sample.lab is not None else None,
                            'rgb': sample.rgb, 'hex': sample.hex, 'confidence': sample.confidence,
                            'diagnostics': sample.diagnostics}
        if debug_dir is not None:
            save_debug(rgb, measurements, debug_dir / f'photo-{index}.png')
        photos.append(record)
        warnings.extend(f'Photo {index}: {notice}' for notice in notices)
    # Keep indices aligned to the supplied photos, including errors/duplicates.
    colors, notices = aggregate_photos(photos)
    warnings.extend(notices)
    if not analyzed:
        raise ValueError('No photos could be analyzed. ' + '; '.join(warnings))
    profile = build_profile(colors)
    season = classify_season(profile)
    profile.update(season=season['season'], season_confidence=season['confidence'],
                   season_scores=season['scores'], season_analysis=season)
    ranked = rank_colors(profile, CLOTHING_COLORS if candidate_colors is None else candidate_colors)
    return {'photos_requested': len(image_paths), 'photos_analyzed': analyzed,
            'per_photo': photos, 'profile': profile, 'recommended_colors': ranked,
            'color_groups': group_colors(ranked), 'warnings': list(dict.fromkeys(warnings)),
            'method_note': 'Numerical styling heuristics; scores are not calibrated probabilities. '
                           'Season labels are approximate. All colors remain available to wear.'}
