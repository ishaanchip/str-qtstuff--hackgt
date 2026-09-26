"""Numerical behavior tests independent of MediaPipe inference and datasets."""
import json
import numpy as np
import pytest
from backend.app.color.conversions import lab_to_rgb, rgb_to_hex, hex_to_rgb, rgb_to_hsl
from backend.app.color.temperature import color_temperature
from backend.app.color.profile import build_profile
from backend.app.color.seasonal import classify_season
from backend.app.color.harmony import hue_distance, harmony_scores
from backend.app.config import palette, scoring
from backend.app.vision.aggregation import aggregate_photos, weighted_median
from backend.app.recommendation.clothing_score import score_clothing_color
from backend.app.recommendation.color_ranker import rank_colors, group_colors
from backend.app.data.clothing_colors import CLOTHING_COLORS


def measurement(lab, confidence=0.9):
    rgb = lab_to_rgb(np.array(lab))
    return {'lab': list(lab), 'rgb': rgb.tolist(), 'hex': rgb_to_hex(rgb), 'confidence': confidence}


def colors(skin=(65, 12, 22), hair=(20, 4, 8), eyes=(30, 6, 12)):
    return {n: measurement(lab) for n, lab in zip(palette.REGIONS, (skin, hair, eyes))}


def profile_for(samples=None):
    profile = build_profile(colors() if samples is None else samples)
    profile['season_analysis'] = classify_season(profile)
    return profile


def test_temperature_warm_cool_and_achromatic():
    warm = build_profile(colors(skin=(65, 5, 30)))
    cool = build_profile(colors(skin=(65, 25, 4)))
    assert warm['temperature']['score'] > 0.5
    assert cool['temperature']['score'] < -0.15
    assert warm['temperature']['label'] == 'warm'
    assert cool['temperature']['label'].startswith('cool')
    assert color_temperature([50, 0, 0]) == 0


def test_depth_uses_hair_and_eyes_not_skin_alone():
    light = build_profile(colors((85, 12, 15), (80, 5, 8), (75, 5, 10)))
    deep = build_profile(colors((35, 12, 15), (10, 5, 8), (15, 5, 10)))
    assert light['depth']['label'] == 'light'
    assert deep['depth']['label'] == 'deep'
    same_skin = build_profile(colors((85, 12, 15), (10, 5, 8), (15, 5, 10)))
    assert same_skin['depth']['score'] > light['depth']['score'] + 0.3


def test_chroma_and_contrast_ranges():
    muted = build_profile(colors((60, 2, 3), (58, 2, 3), (59, 2, 3)))
    bright = build_profile(colors((85, 30, 35), (10, 30, 35), (20, 30, 35)))
    assert muted['chroma']['label'] == 'muted'
    assert bright['chroma']['label'] == 'bright'
    assert muted['contrast']['label'] == 'low'
    assert bright['contrast']['label'] == 'high'
    assert bright['contrast']['skin_hair_lightness_difference'] == 75


def test_missing_colors_lower_profile_confidence_and_do_not_invent_hue():
    complete = profile_for()
    partial = colors()
    partial['eyes'] = {'lab': None, 'confidence': 0}
    partial['hair'] = {'lab': None, 'confidence': 0}
    profile = profile_for(partial)
    assert profile['contrast']['score'] is None
    assert profile['confidence'] < complete['confidence']
    scored = score_clothing_color(profile, '#2288AA')
    assert scored['components']['eyes'] == 0.5
    assert len(classify_season(profile)['scores']) == 4


def test_circular_hue_harmonies():
    assert hue_distance(350, 10) == 20
    assert harmony_scores(180, 0)['complementary'] == 1
    assert harmony_scores(30, 0)['analogous'] == 1
    assert harmony_scores(150, 0)['split_complementary'] == 1
    assert harmony_scores(120, 0)['triadic'] == 1
    assert harmony_scores(90, 0)['analogous'] < 0.1


@pytest.mark.parametrize('season,vector', list(palette.SEASON_PROTOTYPES.items()))
def test_each_season_prototype_wins_its_own_distance(season, vector):
    profile = profile_for()
    for name, value in zip(('temperature', 'depth', 'chroma', 'contrast'), vector):
        profile[name]['score'] = value * 2 - 1 if name == 'temperature' else value
    result = classify_season(profile)
    assert result['season'] == season
    assert result['scores'][season] == pytest.approx(1)
    assert all(0 <= value <= 1 for value in result['scores'].values())


def test_season_ambiguity_and_low_evidence_reduce_confidence():
    profile = profile_for()
    confident = classify_season(profile)
    profile['confidence'] *= 0.1
    assert classify_season(profile)['confidence'] == pytest.approx(confident['confidence'] * 0.1)


def test_weighted_median_and_two_photo_disagreement():
    np.testing.assert_allclose(weighted_median(np.array([[0], [100]]), np.array([0.9, 0.2])), [0])
    np.testing.assert_allclose(weighted_median(np.array([[0], [100]]), np.array([1, 1])), [50])
    first, bad = colors(), colors(skin=(20, -20, -20))
    bad['skin']['confidence'] = 0.2
    aggregate, warnings = aggregate_photos([first, bad])
    np.testing.assert_allclose(aggregate['skin']['lab'], first['skin']['lab'])
    assert aggregate['skin']['confidence'] < first['skin']['confidence']
    assert not aggregate['skin']['outlier_photos']
    assert any('disagree' in w for w in warnings)


def test_consensus_rejects_even_high_confidence_outlier():
    first, second, outlier = colors(), colors(skin=(66, 13, 23)), colors(skin=(25, -20, -15))
    outlier['skin']['confidence'] = 0.99
    aggregate, warnings = aggregate_photos([first, second, outlier])
    assert aggregate['skin']['outlier_photos'] == [3]
    assert aggregate['skin']['used_photos'] == [1, 2]
    assert np.linalg.norm(np.array(aggregate['skin']['lab']) - first['skin']['lab']) < 2
    assert aggregate['skin']['confidence'] < 0.9
    assert any('outlier photo 3' in w for w in warnings)


def test_weak_pair_cannot_overrule_reliable_photo_and_no_false_consensus():
    first, second, third = colors(), colors(), colors(skin=(25, -20, -15))
    first['skin']['confidence'] = second['skin']['confidence'] = 0.2
    aggregate, _ = aggregate_photos([first, second, third])
    assert aggregate['skin']['outlier_photos'] == []
    np.testing.assert_allclose(aggregate['skin']['lab'], third['skin']['lab'])
    far = [colors(skin=(20, 0, 0)), colors(skin=(50, 20, 0)), colors(skin=(80, 0, 20))]
    aggregate, _ = aggregate_photos(far)
    assert aggregate['skin']['outlier_photos'] == []
    assert aggregate['skin']['confidence'] < 0.1


def test_single_photo_and_unreliable_measurements():
    original = colors()
    aggregate, _ = aggregate_photos([original])
    np.testing.assert_allclose(aggregate['skin']['lab'], original['skin']['lab'])
    assert aggregate['skin']['confidence'] == pytest.approx(0.9)
    original['eyes']['confidence'] = 0.01
    aggregate, notices = aggregate_photos([original])
    assert aggregate['eyes']['lab'] is None
    assert notices
    with pytest.raises(ValueError, match='1 and 3'):
        aggregate_photos([])


def test_scores_bounded_weighted_explainable_and_groups_partition():
    profile = profile_for()
    ranked = rank_colors(profile, CLOTHING_COLORS)
    assert len(ranked) == len(CLOTHING_COLORS)
    assert [r['score'] for r in ranked] == sorted([r['score'] for r in ranked], reverse=True)
    for color in ranked:
        assert 0 <= color['score'] <= 100
        assert all(0 <= v <= 1 for v in color['components'].values())
        assert color['score'] == pytest.approx(100 * sum(scoring.SCORE_WEIGHTS[k] * v for k, v in color['components'].items()))
    grouped = group_colors(ranked)
    assert sum(map(len, grouped.values())) == len(ranked)
    assert len({c['hex'] for group in grouped.values() for c in group}) == len(ranked)
    assert rank_colors(profile, CLOTHING_COLORS) == ranked
    json.dumps(ranked, allow_nan=False)


def test_temperature_tolerance_and_color_names_do_not_determine_scores():
    profile = profile_for()
    profile['temperature']['score'] = 0.8
    warm = score_clothing_color(profile, '#D98F25')
    cool = score_clothing_color(profile, '#2266CC')
    assert warm['components']['temperature'] > cool['components']['temperature'] > 0
    profile['temperature']['score'] = 0
    assert score_clothing_color(profile, '#2266CC')['components']['temperature'] > cool['components']['temperature']
    first = score_clothing_color(profile, {'name': 'Warm Test', 'hex': '#2266CC'})
    second = score_clothing_color(profile, {'name': 'Cool Test', 'hex': '#2266CC'})
    assert first['score'] == second['score']


def test_eyes_are_at_most_ten_percent_and_gray_has_no_hue_bonus():
    profile = profile_for()
    first = score_clothing_color(profile, '#2266CC')
    profile['eyes'] = measurement((50, -25, 20))
    second = score_clothing_color(profile, '#2266CC')
    # Check isolated eye-component contribution; harmony also uses eyes by design.
    assert abs(first['components']['eyes'] - second['components']['eyes']) * scoring.SCORE_WEIGHTS['eyes'] * 100 <= 10
    profile['eyes'] = measurement((50, 0, 0))
    assert score_clothing_color(profile, '#888888')['components']['eyes'] == pytest.approx(0.5)


def test_hex_validation_and_hsl_order():
    assert rgb_to_hsl(hex_to_rgb('#FF0000')) == pytest.approx((0, 1, 0.5))
    with pytest.raises(ValueError, match='six-digit'):
        score_clothing_color(profile_for(), '#XYZ')
