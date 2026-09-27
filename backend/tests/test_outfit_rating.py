from io import BytesIO
import json
import numpy as np
import pytest
from PIL import Image
from backend.app import outfit_rating as rating


def scan():
    return {'skin': {'lab': [55, 12, 22], 'confidence': .9},
            'hair': {'lab': [20, 3, 5], 'confidence': .8},
            'eyes': {'lab': [30, 5, 8], 'confidence': .7}}


def test_background_excluded_and_shares_normalized():
    rgb = np.full((150, 150, 3), [0, 255, 0], np.uint8)
    rgb[25:125, 25:75] = [180, 30, 30]
    rgb[25:125, 75:125] = [30, 30, 180]
    mask = np.zeros((150, 150)); mask[25:125, 25:125] = .95
    colors, quality = rating.extract_colors(rgb, mask)
    assert len(colors) == 2
    assert sum(c['share'] for c in colors) == pytest.approx(1)
    assert all(int(c['hex'][3:5], 16) < 40 for c in colors)
    assert quality['mean_clothing_probability'] == pytest.approx(.95)


def test_insufficient_clothing_has_no_score():
    with pytest.raises(ValueError, match='Not enough clothing'):
        rating.extract_colors(np.zeros((100, 100, 3), np.uint8), np.full((100, 100), .5))


def test_scoring_weights_single_color_and_original_measurements():
    profile = rating.original_profile(scan())
    colors = [{'hex': '#803030', 'share': .6}, {'hex': '#303080', 'share': .4}]
    result = rating.rate_colors(colors, profile)
    assert result['score'] == pytest.approx(.6 * result['palette_score'] + .4 * result['coordination_score'], abs=.1)
    single = rating.rate_colors([{'hex': '#803030', 'share': 1}], profile)
    assert single['coordination_score'] is None
    assert single['score'] == single['palette_score']
    altered = scan(); altered['temperature'] = {'score': -999}
    assert rating.original_profile(altered)['temperature'] == profile['temperature']
    json.dumps(result, allow_nan=False)


@pytest.mark.parametrize('lab', [[float('nan'), 0, 0], [101, 0, 0], [2, 3], 'bad'])
def test_invalid_original_scan(lab):
    value = scan(); value['skin']['lab'] = lab
    with pytest.raises(ValueError):
        rating.original_profile(value)


def test_image_to_rating_uses_segmentation_and_preserves_scan(monkeypatch):
    image = Image.new('RGB', (100, 100), '#225588'); stream = BytesIO(); image.save(stream, 'PNG'); stream.seek(0)
    monkeypatch.setattr(rating, 'clothing_mask', lambda rgb: np.full(rgb.shape[:2], .99))
    original = scan(); before = json.dumps(original)
    result = rating.rate_outfit(stream, original)
    assert 0 <= result['score'] <= 100
    assert json.dumps(original) == before


@pytest.mark.parametrize('value', [20, 50, 70, 90])
def test_strict_scale_lowers_intermediate_scores(value):
    assert 0 < rating.strict_score(value) < value
    assert rating.strict_score(value + 1) > rating.strict_score(value)


def test_inconsistent_matches_are_penalized(monkeypatch):
    def score(profile, color):
        value = profile[color]
        return {'hex': color, 'name': color, 'score': value,
                'features': {'lab': [50, 0, 0]}}
    monkeypatch.setattr(rating, 'score_clothing_color', score)
    # Keep suggestion generation out of this isolated aggregation comparison.
    monkeypatch.setattr('backend.app.data.clothing_colors.CLOTHING_COLORS', [])
    colors = [{'hex': '#111111', 'share': .5}, {'hex': '#222222', 'share': .5}]
    # Strong enough scores to avoid suggestion lookup; identical mean, different spread.
    balanced = rating.rate_colors(colors, {'#111111': 96, '#222222': 96})
    uneven = rating.rate_colors(colors, {'#111111': 92, '#222222': 100})
    assert uneven['palette_score'] < balanced['palette_score']
    assert balanced['coordination_score'] < 75
    assert rating.strict_score(100) == 100
    assert rating.strict_score(0) == 0


def test_duplicate_colors_do_not_invent_coordination():
    profile = rating.original_profile(scan())
    single = rating.rate_colors([{'hex': '#225588', 'share': 1}], profile)
    duplicate = rating.rate_colors([{'hex': '#225588', 'share': .2}, {'hex': '#225588', 'share': .8}], profile)
    assert duplicate == single


def test_research_provenance_and_replacement_improve_total_score():
    profile = rating.original_profile(scan())
    colors = [{'hex': '#FF00FF', 'share': .5}, {'hex': '#00FF00', 'share': .5}]
    result = rating.rate_colors(colors, profile)
    assert result['coordination_model']['id'] == 'ou-luo-2006-v1'
    change = result['suggested_replacement']
    assert change is not None
    updated = [{**c, 'hex': change['to_hex']} if c['hex'] == change['from_hex'] else c for c in colors]
    after = rating.rate_colors(updated, profile)
    assert after['score'] == change['projected_score']
    assert after['score'] >= result['score'] + 3
    reverse = rating.rate_colors(list(reversed(colors)), profile)
    assert reverse == result
