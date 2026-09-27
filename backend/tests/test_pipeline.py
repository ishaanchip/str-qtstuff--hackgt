"""Full Phase 4–7 integration with deterministic extraction fixtures."""
import json
from pathlib import Path
import numpy as np
import pytest
from backend.app import pipeline
from backend.app.vision.sampling import Measurement


@pytest.fixture
def extraction(monkeypatch):
    calls = []

    def load(path):
        if path.name == 'missing.jpg':
            raise OSError('file not found')
        index = int(path.stem[-1])
        return np.full((20, 20, 3), index, np.uint8)

    def analyze(rgb, model_dir):
        index = int(rgb[0, 0, 0])
        calls.append(index)
        colors = {'skin': [65 + index, 12, 22], 'hair': [20, 4, 8], 'eyes': [30, 6, 12]}
        if index == 3:
            colors['skin'] = [25, -20, -15]
        return {name: Measurement(np.array(lab, float), 0.9,
                                  diagnostics={'lighting_score': 0.95}) for name, lab in colors.items()}, []

    monkeypatch.setattr(pipeline, 'load_image', load)
    monkeypatch.setattr(pipeline, 'analyze_image', analyze)
    return calls


def test_three_photos_preserve_per_photo_and_reject_outlier(extraction, tmp_path):
    result = pipeline.analyze_photos([tmp_path / f'photo{i}.jpg' for i in (1, 2, 3)])
    assert extraction == [1, 2, 3]
    assert result['photos_analyzed'] == 3
    assert len(result['per_photo']) == 3
    assert result['per_photo'][2]['skin']['lab'] == [25, -20, -15]
    assert result['profile']['skin']['outlier_photos'] == [3]
    assert len(result['recommended_colors']) == 44
    assert all(p['lighting_score'] == 0.95 for p in result['per_photo'])
    assert list(tmp_path.iterdir()) == []  # No photos, masks or output stored by default.
    json.dumps(result, allow_nan=False)


def test_errors_preserve_indices_and_remaining_photo_works(extraction):
    result = pipeline.analyze_photos(['missing.jpg', 'photo1.jpg'])
    assert result['photos_analyzed'] == 1
    assert result['per_photo'][0]['status'] == 'error'
    assert result['profile']['skin']['used_photos'] == [2]
    assert any('file not found' in warning for warning in result['warnings'])
    with pytest.raises(ValueError, match='file not found'):
        pipeline.analyze_photos(['missing.jpg'])


def test_duplicates_analyzed_but_not_counted_as_independent_evidence(extraction):
    result = pipeline.analyze_photos(['photo1.jpg', 'photo1.jpg'])
    assert extraction == [1, 1]
    assert result['per_photo'][1]['skin']['lab'] is not None
    assert result['per_photo'][1]['aggregation_excluded']
    assert result['profile']['skin']['used_photos'] == [1]
    assert result['profile']['skin']['confidence'] == pytest.approx(0.9)


def test_debug_export_is_opt_in_and_does_not_overwrite(extraction, tmp_path):
    path = tmp_path / 'debug'
    pipeline.analyze_photos(['photo1.jpg'], debug_dir=path)
    assert (path / 'photo-1.png').is_file()
    assert (path / 'photo-1_masks' / 'diagnostics.json').is_file()
    with pytest.raises(FileExistsError):
        pipeline.analyze_photos(['photo1.jpg'], debug_dir=path)


@pytest.mark.parametrize('paths', [[], ['x'] * 4, 'photo1.jpg', Path('photo1.jpg')])
def test_invalid_photo_count_fails_before_inference(extraction, paths):
    with pytest.raises(ValueError, match='1–3'):
        pipeline.analyze_photos(paths)
    assert extraction == []


def test_empty_custom_library_is_respected(extraction):
    result = pipeline.analyze_photos(['photo1.jpg'], candidate_colors=[])
    assert result['recommended_colors'] == []
    assert all(not values for values in result['color_groups'].values())
