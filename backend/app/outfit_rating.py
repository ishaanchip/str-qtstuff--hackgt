"""ML clothing segmentation followed by explicit, untrained color styling rules."""
from itertools import combinations
import cv2
import numpy as np
from .main import load_image, DEFAULT_MODELS
from .vision.face_landmarks import probability_map
from .color.conversions import rgb_to_lab, lab_to_rgb, rgb_to_hex
from .color.profile import build_profile
from .color.research_harmony import pair_harmony, MODEL_ID, SOURCE
from .recommendation.clothing_score import score_clothing_color


def original_profile(value):
    """Rebuild derived features from bounded original scan measurements."""
    colors = {}
    if not isinstance(value, dict):
        raise ValueError('Run a face scan before rating your outfit.')
    for name in ('skin', 'hair', 'eyes'):
        sample = value.get(name)
        if not isinstance(sample, dict):
            raise ValueError('Invalid face scan. Please scan again.')
        lab = sample.get('lab')
        confidence = sample.get('confidence')
        if not isinstance(confidence, (float, int)) or not np.isfinite(confidence) or not 0 <= confidence <= 1:
            raise ValueError('Invalid scan confidence.')
        if lab is not None:
            try:
                lab = np.asarray(lab, dtype=float)
            except (TypeError, ValueError):
                raise ValueError('Invalid facial color.') from None
            if lab.shape != (3,) or not np.isfinite(lab).all() or not 0 <= lab[0] <= 100 or np.any(np.abs(lab[1:]) > 160):
                raise ValueError('Invalid facial color.')
            lab = lab.tolist()
        colors[name] = {'lab': lab, 'confidence': confidence}
    return build_profile(colors)


def clothing_mask(rgb, model_dir=DEFAULT_MODELS):
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    options = vision.ImageSegmenterOptions(
        base_options=python.BaseOptions(model_asset_path=str(model_dir / 'selfie_multiclass.tflite')),
        output_confidence_masks=True, output_category_mask=False)
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
    with vision.ImageSegmenter.create_from_options(options) as segmenter:
        result = segmenter.segment(image)
        if not result.confidence_masks or len(result.confidence_masks) != 6:
            raise ValueError('Clothing detection model is unavailable.')
        probabilities = probability_map(result.confidence_masks[4].numpy_view(), rgb.shape[:2])
    return probabilities


def extract_colors(rgb, probabilities):
    mask = cv2.erode((probabilities >= 0.8).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    count = int(mask.sum())
    coverage = count / mask.size
    if count < 500 or coverage < 0.03:
        raise ValueError('Not enough clothing is clearly visible. Stand back in even light and retry.')
    pixels = rgb_to_lab(rgb[mask])
    pixels = pixels[::max(1, len(pixels) // 8000)][:8000]
    # Deterministic farthest-point initialization; avoid random scoring changes.
    centers = [np.median(pixels, axis=0)]
    for _ in range(4):
        distances = np.min(np.linalg.norm(pixels[:, None] - np.array(centers), axis=2), axis=1)
        if distances.max() < 12:
            break
        centers.append(pixels[np.argmax(distances)])
    centers = np.array(centers)
    for _ in range(15):
        labels = np.argmin(np.linalg.norm(pixels[:, None] - centers, axis=2), axis=1)
        updated = np.array([np.median(pixels[labels == i], axis=0) if np.any(labels == i) else center for i, center in enumerate(centers)])
        if np.allclose(updated, centers):
            break
        centers = updated
    labels = np.argmin(np.linalg.norm(pixels[:, None] - centers, axis=2), axis=1)
    groups = []
    for i in np.argsort([-np.sum(labels == j) for j in range(len(centers))]):
        share = float(np.mean(labels == i))
        if share < 0.05:
            continue
        # Merge nearby clusters produced by texture or shading.
        match = next((g for g in groups if np.linalg.norm(g['lab'] - centers[i]) < 15), None)
        if match is not None:
            match['share'] += share
        else:
            groups.append({'lab': centers[i], 'share': share})
    total = sum(g['share'] for g in groups)
    colors = [{'hex': rgb_to_hex(lab_to_rgb(g['lab'])), 'share': g['share'] / total} for g in groups]
    return colors, {'clothing_coverage': coverage, 'mean_clothing_probability': float(probabilities[mask].mean())}


def strict_score(value):
    """Styling preset: reserve high ratings for consistently strong matches."""
    return 100 * (float(np.clip(value, 0, 100)) / 100) ** 1.6


def _components(colors, ratings):
    personal = sum(c['share'] * r['score'] for c, r in zip(colors, ratings))
    spread = np.sqrt(sum(c['share'] * (r['score'] - personal) ** 2 for c, r in zip(colors, ratings)))
    personal = strict_score(personal - 0.35 * spread)
    pairs = []
    for i, j in combinations(range(len(colors)), 2):
        pair = pair_harmony(ratings[i]['features']['lab'], ratings[j]['features']['lab'])
        pairs.append({**pair, 'colors': [colors[i]['hex'], colors[j]['hex']],
                      'weight': colors[i]['share'] * colors[j]['share']})
    coordination = (sum(p['score'] * p['weight'] for p in pairs) / sum(p['weight'] for p in pairs)) if pairs else None
    score = 0.6 * personal + 0.4 * coordination if coordination is not None else personal
    return float(score), float(personal), coordination, pairs


def _normalize_colors(colors):
    # Identical swatches are one color, even if multiple garments share it.
    from .color.conversions import hex_to_rgb
    grouped = {}
    if not isinstance(colors, list) or not 1 <= len(colors) <= 6:
        raise ValueError('Choose one to six clothing colors.')
    for color in colors:
        hex_value = rgb_to_hex(hex_to_rgb(color['hex']))
        share = color['share']
        if not isinstance(share, (float, int)) or not np.isfinite(share) or share <= 0:
            raise ValueError('Color shares must be positive and finite.')
        grouped[hex_value] = grouped.get(hex_value, 0) + share
    total = sum(grouped.values())
    return [{'hex': h, 'share': w / total} for h, w in sorted(grouped.items())]


def rate_colors(colors, profile):
    colors = _normalize_colors(colors)
    ratings = [score_clothing_color(profile, c['hex']) for c in colors]
    score, personal, coordination, pairs = _components(colors, ratings)
    # Evaluate replacements against BOTH components, rather than suggesting the
    # best isolated skin match even when it clashes with the rest of the outfit.
    from .data.clothing_colors import CLOTHING_COLORS
    candidates = [score_clothing_color(profile, c) for c in CLOTHING_COLORS]
    by_hex = {r['hex']: r for r in ratings + candidates}
    improvement = None
    best_score = score
    for index, old in enumerate(colors):
        for candidate in candidates:
            if candidate['hex'] == old['hex']:
                continue
            proposed = _normalize_colors([{**c, 'hex': candidate['hex']} if i == index else c
                                          for i, c in enumerate(colors)])
            trial = _components(proposed, [by_hex[c['hex']] for c in proposed])[0]
            if trial > best_score + 1e-9:
                best_score = trial
                improvement = {'from_hex': old['hex'], 'to_hex': candidate['hex'],
                               'name': candidate['name'], 'projected_score': round(trial, 1),
                               'gain': round(trial - score, 1)}
    suggestion = 'No single color replacement in the reference palette improves this score by at least 3 points.'
    if improvement and best_score - score >= 3:
        suggestion = (f"Try replacing {improvement['from_hex']} with {improvement['name']} "
                      f"({improvement['to_hex']}); estimated outfit color score: {improvement['projected_score']}/100.")
    else:
        improvement = None
    explanation = ('60% personal palette and 40% research-based pair harmony. Hue, chroma and lightness are evaluated together.' if pairs else
                   'One distinct outfit color: personal palette scoring only; coordination cannot be assessed.')
    if pairs:
        weakest = min(pairs, key=lambda p: p['score'])
        explanation += f" Lowest pair harmony: {' with '.join(weakest['colors'])} ({weakest['score']:.1f}/100)."
    return {'score': round(score, 1), 'palette_score': round(personal, 1),
            'coordination_score': round(coordination, 1) if coordination is not None else None,
            'colors': [{**c, 'palette_score': round(strict_score(r['score']), 1)} for c, r in zip(colors, ratings)],
            'explanation': explanation, 'suggestion': suggestion, 'suggested_replacement': improvement,
            'coordination_model': {'id': MODEL_ID, 'source': SOURCE,
                                   'aggregation': 'share-product-weighted pairs', 'pairs': pairs},
            'method_note': 'Clothing is detected with ML. Pair harmony uses Ou & Luo (2006); personal palette and the 60/40 blend remain styling choices. Laboratory color-pair research is not validation on outfits or skin tones. Scores are not probabilities.'}


def rate_outfit(image, scan):
    profile = original_profile(scan)
    rgb = load_image(image)
    colors, quality = extract_colors(rgb, clothing_mask(rgb))
    return {**rate_colors(colors, profile), 'quality': quality}
