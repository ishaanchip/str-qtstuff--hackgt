"""Synthetic tests: known colors, outlier resistance, masks and failure paths."""
from pathlib import Path
import numpy as np
import pytest
from PIL import Image
from backend.app.color.conversions import rgb_to_lab, lab_to_rgb
from backend.app.vision.sampling import estimate, combine, Measurement
from backend.app.vision.eyes import iris_mask, extract_eyes
from backend.app.vision.hair import extract_hair
from backend.app.vision.skin import extract_skin
from backend.app.vision.face_landmarks import probability_map
from backend.app.config.thresholds import EYE_REGIONS, SKIN_PATCHES
from backend.app.main import load_image
from backend.app.utils.visualization import save_debug


def test_lab_uses_standard_signed_units():
    rgb = np.array([[255, 255, 255], [0, 0, 0], [255, 0, 0], [0, 255, 0]])
    lab = rgb_to_lab(rgb)
    np.testing.assert_allclose(lab[0], [100, 0, 0], atol=0.1)
    np.testing.assert_allclose(lab[2], [53.24, 80.09, 67.20], atol=0.2)
    assert lab[3, 1] < 0
    np.testing.assert_allclose(lab_to_rgb(lab), rgb, atol=1)


def test_tasks_probability_mask_channel_and_resolution():
    mask = probability_map(np.full((12, 10, 1), 0.8), (24, 20))
    assert mask.shape == (24, 20)
    np.testing.assert_allclose(mask, 0.8)


def test_estimator_rejects_glare_and_records_exact_pixels():
    rgb = np.full((20, 20, 3), [184, 137, 111], dtype=np.uint8)
    rgb[:2] = 255
    result = estimate(rgb_to_lab(rgb), np.ones((20, 20), bool), 'forehead', 40)
    np.testing.assert_allclose(result.rgb, [184, 137, 111], atol=1)
    assert not result.masks['forehead'][:2].any()
    assert result.masks['forehead'][2:].all()
    assert 0 < result.confidence <= 1


def test_missing_region_is_unavailable():
    result = estimate(np.zeros((10, 10, 3)), np.zeros((10, 10), bool), 'hair', 60)
    assert result.rgb is None and result.hex is None and result.confidence == 0
    assert not result.masks['hair'].any()


def test_disagreement_and_missing_regions_reduce_confidence():
    first = Measurement(np.array([50, 10, 10]), 0.9)
    same = combine([first, first], 2)
    missing = combine([first, Measurement(None, 0)], 2)
    different = combine([first, Measurement(np.array([90, -10, -10]), 0.9)], 2)
    assert missing.confidence < same.confidence
    assert different.confidence < same.confidence
    assert different.warnings


def eye_points() -> np.ndarray:
    points = np.zeros((478, 2), np.float32)
    for i, (center, ring, lids) in enumerate(EYE_REGIONS.values()):
        origin = np.array([30 + 50 * i, 30])
        points[center] = origin
        points[list(ring)] = origin + np.array([[12, 0], [0, -12], [-12, 0], [0, 12]])
        points[list(lids)] = origin + np.array([[-18, 0], [-10, -11], [10, -11], [18, 0], [10, 11], [-10, 11]])
    return points


def test_iris_excludes_pupil_sclera_and_reflection():
    points = eye_points()
    lab = np.full((70, 120, 3), [100, 0, 0], dtype=np.float32)
    for args in EYE_REGIONS.values():
        mask = iris_mask(lab.shape[:2], points, *args)
        lab[mask] = [40, 8, 15]
    lab[30, 38] = [100, 0, 0]
    result = extract_eyes(lab, points)
    np.testing.assert_allclose(result.lab, [40, 8, 15])
    assert not result.masks['right_iris'][30, 30]
    assert not result.masks['right_iris'][30, 38]
    assert not result.masks['right_iris'][30, 45]


def test_disagreeing_eyes_are_not_blended():
    points = eye_points()
    lab = np.full((70, 120, 3), [100, 0, 0], dtype=np.float32)
    for i, args in enumerate(EYE_REGIONS.values()):
        lab[iris_mask(lab.shape[:2], points, *args)] = [30 + 40 * i, 8, 15]
    result = extract_eyes(lab, points)
    assert result.lab is None and result.confidence == 0


def test_skin_segmentation_rejects_non_skin():
    points = np.zeros((478, 2), np.float32)
    for indices in SKIN_PATCHES.values():
        angles = np.linspace(0, 2 * np.pi, len(indices), endpoint=False)
        points[list(indices)] = np.column_stack((50 + 25 * np.cos(angles), 50 + 25 * np.sin(angles)))
    lab = np.full((100, 100, 3), [60, 10, 20], dtype=np.float32)
    assert extract_skin(lab, points, np.zeros((100, 100))).lab is None
    np.testing.assert_allclose(extract_skin(lab, points, np.ones((100, 100))).lab, [60, 10, 20])


def test_hair_segmentation_excludes_background():
    points = np.zeros((478, 2), np.float32)
    points[[10, 152, 234, 454]] = [[50, 45], [50, 90], [20, 65], [80, 65]]
    lab = np.full((100, 100, 3), [90, -20, 20], dtype=np.float32)
    lab[10:35, 25:75] = [25, 5, 10]
    probability = np.zeros((100, 100))
    probability[10:35, 25:75] = 0.99
    result = extract_hair(lab, points, probability)
    np.testing.assert_allclose(result.lab, [25, 5, 10])
    assert not result.masks['hair'][probability == 0].any()


def test_debug_export_is_explicit_and_never_overwrites(tmp_path: Path):
    rgb = np.full((30, 30, 3), 128, np.uint8)
    result = estimate(rgb_to_lab(rgb), np.ones((30, 30), bool), 'forehead', 40)
    path = tmp_path / 'debug.png'
    save_debug(rgb, {'skin': result}, path)
    with Image.open(path) as image:
        assert image.size == (720, 250)
    with pytest.raises(FileExistsError):
        save_debug(rgb, {'skin': result}, path)


def test_loader_honors_exif_and_rejects_transparency(tmp_path: Path):
    path = tmp_path / 'rotated.jpg'
    image = Image.new('RGB', (60, 30))
    exif = Image.Exif()
    exif[274] = 6
    image.save(path, exif=exif)
    assert load_image(path).shape == (60, 30, 3)
    path = tmp_path / 'transparent.png'
    Image.new('RGBA', (30, 30)).save(path)
    with pytest.raises(ValueError, match='opaque'):
        load_image(path)
