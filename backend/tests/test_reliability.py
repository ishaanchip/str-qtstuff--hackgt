"""Behavioral regression tests for clean evidence, contamination and abstention."""
import json
import numpy as np
from PIL import Image
import pytest
from backend.app.config import thresholds as cfg
from backend.app.vision.skin import extract_skin
from backend.app.vision.hair import extract_hair, dominant_cluster
from backend.app.vision.eyes import extract_eyes, iris_mask
from backend.app.vision.sampling import estimate, polygon_mask
from backend.app.utils.visualization import save_debug
from test_extraction import eye_points


def skin_fixture():
    points = np.zeros((478, 2), np.float32)
    for i, indices in enumerate(cfg.SKIN_PATCHES.values()):
        angles = np.linspace(0, 2 * np.pi, len(indices), endpoint=False)
        points[list(indices)] = np.column_stack((35 + 60 * i + 22 * np.cos(angles),
                                                  35 + 22 * np.sin(angles)))
    return np.full((75, 200, 3), [60, 12, 18], np.float32), points, np.ones((75, 200))


def test_skin_clean_regions_have_evidence_and_lighting_counts():
    lab, points, probability = skin_fixture()
    clean = extract_skin(lab, points, probability)
    poor_light = extract_skin(lab, points, probability, image_quality=0.2)
    assert clean.confidence > 0.70
    assert len(clean.diagnostics['region_delta_e']) == 3
    assert all(n > 200 for n in clean.diagnostics['region_valid_pixels'].values())
    assert clean.confidence - poor_light.confidence == pytest.approx(0.16)
    mask = polygon_mask(lab.shape[:2], points[list(cfg.SKIN_PATCHES['left_cheek'])])
    lab[mask] = [30, 12, 18]
    conflicting = extract_skin(lab, points, probability)
    assert conflicting.confidence < clean.confidence - 0.2
    assert max(conflicting.diagnostics['region_delta_e'].values()) > 25


def test_skin_gentle_gradient_is_not_percentile_trimmed():
    lab = np.zeros((20, 20, 3), np.float32)
    lab[:, :, 0] = np.linspace(45, 65, 20)[None, :]
    lab[:, :, 1:] = [12, 18]
    sample = estimate(lab, np.ones((20, 20), bool), 'forehead', 40)
    assert sample.masks['forehead'].sum() == 400


def hair_fixture():
    points = np.zeros((478, 2), np.float32)
    points[[10, 152, 234, 454]] = [[80, 70], [80, 145], [30, 95], [130, 95]]
    lab = np.full((160, 160, 3), [95, 0, 0], np.float32)
    probability = np.zeros((160, 160))
    probability[25:65, 20:140] = 0.99
    lab[25:65, 20:140] = [25, 5, 10]
    return lab, points, probability


def test_hair_three_regions_reject_skin_and_retain_dominant_color():
    lab, points, probability = hair_fixture()
    skin = np.array([60, 12, 18])
    lab[25:40, 20:50] = skin
    lab[25:40, 90:120] = [80, 5, 10]
    result = extract_hair(lab, points, probability, skin)
    np.testing.assert_allclose(result.lab, [25, 5, 10])
    assert result.confidence > 0.65
    assert result.debug_masks['hair_skin_rejected'].any()
    assert not result.masks['hair'][25:40, 20:50].any()
    assert all(result.masks[name].any() for name in cfg.HAIR_REGIONS)
    np.testing.assert_array_equal(result.masks['hair'], np.logical_or.reduce([result.masks[n] for n in cfg.HAIR_REGIONS]))


def test_clustering_is_deterministic_and_multicolor_reduces_confidence():
    pixels = np.array([[20, 5, 8]] * 100 + [[65, 15, 20]] * 30 + [[95, 0, 0]] * 10)
    first = dominant_cluster(pixels)
    np.testing.assert_array_equal(first, dominant_cluster(pixels))
    assert first[:100].all() and not first[100:].any()
    lab, points, probability = hair_fixture()
    skin = np.array([60, 12, 18])
    clean = extract_hair(lab, points, probability, skin)
    lab[25:65, 20:60] = [70, 0, 0]
    lab[25:65, 60:100] = [45, 0, 0]
    varied = extract_hair(lab, points, probability, skin)
    assert varied.diagnostics['dominant_cluster_ratio'] < 0.5
    assert varied.confidence < clean.confidence - 0.15


def iris_fixture(color=(15, 4, 6)):
    points = eye_points()
    lab = np.full((70, 120, 3), [100, 0, 0], np.float32)
    for geometry in cfg.EYE_REGIONS.values():
        lab[iris_mask(lab.shape[:2], points, *geometry)] = color
    return lab, points


@pytest.mark.parametrize('lightness', [3.0, 7.0, 15.0, 45.0])
def test_dark_and_light_irises_are_preserved(lightness):
    lab, points = iris_fixture((lightness, 2, 4))
    result = extract_eyes(lab, points)
    np.testing.assert_allclose(result.lab, [lightness, 2, 4])
    assert result.confidence > 0.50
    assert not any(mask.any() for name, mask in result.debug_masks.items() if 'dark_outliers' in name)


def test_glints_and_statistical_pupil_outliers_are_removed():
    lab, points = iris_fixture((25, 5, 8))
    lab[30, 36] = [0, 0, 0]
    lab[30, 86] = [100, 0, 0]
    result = extract_eyes(lab, points)
    np.testing.assert_allclose(result.lab, [25, 5, 8])
    assert result.debug_masks['right_iris_dark_outliers'][30, 36]
    assert result.debug_masks['left_iris_highlights'][30, 86]
    assert not result.masks['right_iris'][30, 36]
    assert not result.masks['left_iris'][30, 86]


def test_better_eye_survives_other_eye_glare_and_reports_unverified_agreement():
    lab, points = iris_fixture()
    bad = iris_mask(lab.shape[:2], points, *cfg.EYE_REGIONS['left_iris'])
    lab[bad] = [100, 0, 0]
    result = extract_eyes(lab, points)
    np.testing.assert_allclose(result.lab, [15, 4, 6])
    assert result.diagnostics['selected_eyes'] == ['right_iris']
    assert result.diagnostics['agreement_score'] == 0
    assert 0.50 < result.confidence <= 0.60 + 1e-9
    assert result.diagnostics['left_valid_pixels'] == 0
    assert not result.masks['left_iris'].any()


def test_conflicting_but_poor_eye_falls_back_to_better_eye():
    lab, points = iris_fixture()
    bad = iris_mask(lab.shape[:2], points, *cfg.EYE_REGIONS['left_iris'])
    ys, xs = np.where(bad)
    lab[bad] = [65, 5, 8]
    lab[ys[:len(ys) * 3 // 4], xs[:len(xs) * 3 // 4]] = [100, 0, 0]
    result = extract_eyes(lab, points)
    assert result.diagnostics['left_right_delta_e'] > cfg.EYE_DISAGREEMENT_DELTA_E
    assert result.diagnostics['selected_eyes'] == ['right_iris']
    np.testing.assert_allclose(result.lab, [15, 4, 6])


def test_tiny_iris_abstains_and_glare_reduces_confidence():
    lab, points = iris_fixture()
    clean = extract_eyes(lab, points)
    for geometry in cfg.EYE_REGIONS.values():
        mask = iris_mask(lab.shape[:2], points, *geometry)
        ys, xs = np.where(mask)
        lab[ys[::3], xs[::3]] = [100, 0, 0]
    glare = extract_eyes(lab, points)
    assert glare.confidence < clean.confidence - 0.1
    for center, ring, _ in cfg.EYE_REGIONS.values():
        points[list(ring)] = points[center] + (points[list(ring)] - points[center]) * 0.1
    assert extract_eyes(lab, points).lab is None


def test_all_debug_masks_are_exported_exactly(tmp_path):
    lab, points = iris_fixture()
    result = extract_eyes(lab, points)
    path = tmp_path / 'eyes.png'
    save_debug(np.zeros_like(lab, dtype=np.uint8), {'eyes': result}, path)
    directory = tmp_path / 'eyes_masks'
    expected = {**result.debug_masks, **{f'{k}_retained': v for k, v in result.masks.items()}}
    for name, mask in expected.items():
        with Image.open(directory / f'{name}.png') as image:
            np.testing.assert_array_equal(np.asarray(image), mask.astype(np.uint8) * 255)
    diagnostic = json.loads((directory / 'diagnostics.json').read_text())
    assert diagnostic['eyes']['confidence'] == result.confidence
    assert len(list(directory.glob('*.png'))) == len(expected)


@pytest.mark.parametrize('lightness', [0, 100])
def test_clipped_skin_does_not_get_high_confidence_from_agreement(lightness):
    lab, points, probability = skin_fixture()
    lab[:, :, :] = [lightness, 0, 0]
    result = extract_skin(lab, points, probability)
    assert result.lab is None and result.confidence == 0
    assert result.diagnostics['lighting_score'] == 0


def test_hair_similar_to_skin_has_lower_separation_confidence():
    lab, points, probability = hair_fixture()
    far = extract_hair(lab, points, probability, np.array([60, 12, 18]))
    near = extract_hair(lab, points, probability, np.array([35, 5, 10]))
    assert near.confidence < far.confidence
    assert near.diagnostics['separation_score'] < far.diagnostics['separation_score']
    identical = extract_hair(lab, points, probability, np.array([25, 5, 10]))
    assert identical.lab is None and identical.confidence == 0


def test_no_valid_regions_report_zero_confidence():
    lab, points, probability = skin_fixture()
    skin = extract_skin(lab, points, np.zeros_like(probability))
    assert skin.confidence == 0 and skin.diagnostics['valid_pixels'] == 0
    lab, points = iris_fixture()
    lab[:, :, :] = [100, 0, 0]
    eyes = extract_eyes(lab, points)
    assert eyes.confidence == 0 and eyes.lab is None
