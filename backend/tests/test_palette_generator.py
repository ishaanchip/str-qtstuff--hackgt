"""Generated palette contracts, missing measurements and catalog integration."""
import json
import numpy as np
from backend.app.color.profile import build_profile
from backend.app.color.conversions import hex_to_rgb, rgb_to_lab
from backend.app.recommendation.palette_generator import generate_palette
from backend.app.data.clothing_colors import CLOTHING_COLORS
from backend.app.api import match_clothing


def profile(skin=(65, 12, 22), hair=(20, 4, 8), eyes=(30, 6, 12)):
    return build_profile({name: {'lab': lab, 'confidence': 0.9 if lab is not None else 0}
                          for name, lab in zip(('skin', 'hair', 'eyes'), (skin, hair, eyes))})


def test_palette_is_personalized_deterministic_diverse_and_displayable():
    first = generate_palette(profile())
    assert first == generate_palette(profile())
    assert {c['hex'] for c in first} != {c['hex'] for c in generate_palette(profile((85, 25, 4), (70, 3, 4), (60, 2, 3)))}
    assert 6 <= len(first) <= 12
    assert {'neutral', 'accent'} == {c['role'] for c in first}
    assert len({c['hex'] for c in first}) == len(first)
    labs = [rgb_to_lab(hex_to_rgb(c['hex'])) for c in first]
    for i, lab in enumerate(labs):
        assert all(np.linalg.norm(lab - other) >= 12 for other in labs[:i])
        np.testing.assert_allclose(lab, first[i]['features']['lab'])
    assert all(0 <= c['score'] <= 100 and c['explanation'] for c in first)
    json.dumps(first, allow_nan=False)


def test_missing_hair_and_eyes_and_neutral_measurements_work():
    for samples in (profile(hair=None, eyes=None), profile((60, 0, 0), (20, 0, 0), None)):
        result = generate_palette(samples)
        assert result
        json.dumps(result, allow_nan=False)


def test_expanded_catalog_keeps_actual_hex_and_exposes_nearest_match():
    assert len(CLOTHING_COLORS) == 100
    assert len({c['name'] for c in CLOTHING_COLORS}) == 100
    assert len({c['hex'] for c in CLOTHING_COLORS}) == 100
    palette = generate_palette(profile())
    items = match_clothing(palette)
    assert len(items) == 48
    library = {c['name']: c['hex'] for c in CLOTHING_COLORS}
    for item in items:
        assert item['hex'] == library[item['color']]
        distances = [np.linalg.norm(rgb_to_lab(hex_to_rgb(item['hex'])) - rgb_to_lab(hex_to_rgb(c['hex']))) for c in palette]
        assert np.isclose(item['palette_distance_delta_e76'], min(distances))
    assert [i['score'] for i in items] == sorted((i['score'] for i in items), reverse=True)
