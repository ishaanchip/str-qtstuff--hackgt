"""Equation regressions and behavioral checks; not human-rating validation."""
import math
import numpy as np
import pytest
from backend.app.color.research_harmony import pair_harmony


def test_neutral_pair_matches_published_terms():
    # Independent substitution in Ou & Luo Eq. 11, L1=L2=50, C1=C2=0.
    expected = {
        'chromatic': .04 + .53 * math.tanh(.8),
        'lightness_sum': .28 + .54 * math.tanh(-.98),
        'lightness_contrast': .14 + .15 * math.tanh(-2),
        'hue': 2 * (.5 + .5 * math.tanh(-2)) * (-.08 - .14 * math.sin(math.radians(50)) - .07),
    }
    result = pair_harmony([50, 0, 0], [50, 0, 0])
    assert result['terms'] == pytest.approx(expected, abs=1e-10)
    assert result['raw'] == pytest.approx(sum(expected.values()), abs=1e-10)
    assert result['score'] == pytest.approx(56.7082126798)


def test_chromatic_distance_uses_lab_units_not_degrees():
    result = pair_harmony([50, 30, 0], [50, -30, 0])
    assert result['terms']['chromatic'] == pytest.approx(.04 + .53 * math.tanh(.8 - .045 * 60))
    close = pair_harmony([50, 30, 0], [50, 29, 5])
    assert close['score'] > result['score']  # No automatic complementary bonus.


def test_neutrals_depend_on_lightness_not_a_constant():
    flat = pair_harmony([50, 0, 0], [50, 0, 0])
    contrast = pair_harmony([30, 0, 0], [70, 0, 0])
    assert contrast['score'] > flat['score']
    assert contrast['terms']['lightness_sum'] == flat['terms']['lightness_sum']


def test_pair_symmetry_finite_scores_and_hue_wrap():
    rng = np.random.default_rng(17)
    for _ in range(100):
        a = [rng.uniform(0, 100), *rng.uniform(-100, 100, 2)]
        b = [rng.uniform(0, 100), *rng.uniform(-100, 100, 2)]
        result = pair_harmony(a, b)
        assert result['score'] == pytest.approx(pair_harmony(b, a)['score'])
        assert np.isfinite(result['raw']) and 0 <= result['score'] <= 100
    left = pair_harmony([50, 20, -1e-6], [60, 30, 5])
    right = pair_harmony([50, 20, 1e-6], [60, 30, 5])
    assert left['score'] == pytest.approx(right['score'], abs=1e-4)


@pytest.mark.parametrize('bad', [[float('nan'), 0, 0], [50, float('inf'), 0], [50, 0], [101, 0, 0]])
def test_bad_lab_rejected(bad):
    with pytest.raises(ValueError):
        pair_harmony(bad, [50, 0, 0])
