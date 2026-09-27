from copy import deepcopy
import json
import pytest
from backend.app.outfit_analyst import rate_selected_outfit, validate, weights


def item(hex, name='piece', pattern='solid'):
    return {'item': name, 'color_name': 'ignored label', 'hex': hex, 'pattern': pattern}


def outfit(top='#1F2A44', pant='#C8A97E', accessories=None):
    return {'shirt_layer': [item(top)], 'pant': item(pant), 'accessories': accessories or []}


def test_exact_contract_and_repeatability():
    data = outfit()
    result = rate_selected_outfit(data)
    assert result == rate_selected_outfit(deepcopy(data))
    assert set(result) == {'overall_score', 'harmony_type', 'subscores', 'summary', 'what_works', 'improvement', 'suggested_hex'}
    assert set(result['subscores']) == {'shirt_pant_harmony', 'accessory_cohesion', 'contrast', 'balance'}
    assert result['subscores']['accessory_cohesion'] is None
    assert 6 <= result['overall_score'] <= 8
    assert 'accessories' in result['improvement']
    json.dumps(result, allow_nan=False)


def test_names_brands_and_color_names_do_not_change_score():
    data = outfit(); before = rate_selected_outfit(data)
    data['shirt_layer'][0].update(item='different brand and garment', color_name='wrong red')
    after = rate_selected_outfit(data)
    assert before['overall_score'] == after['overall_score']
    assert before['subscores'] == after['subscores']


def test_outermost_has_most_top_weight():
    data = outfit(); data['shirt_layer'] = [item('#FFFFFF'), item('#6B6B3A'), item('#1F2A44')]
    _, w = weights(validate(data))
    assert w[('shirt_layer', 2)] > w[('shirt_layer', 0)] + w[('shirt_layer', 1)]


def test_accessories_are_bounded_accents_and_order_independent():
    data = outfit(); base = rate_selected_outfit(data)['overall_score']
    data['accessories'] = [item('#FF00FF'), item('#00FF00')]
    result = rate_selected_outfit(data)
    assert abs(result['overall_score'] - base) <= 2
    data['accessories'].reverse()
    assert result == rate_selected_outfit(data)


def test_bold_complementary_can_score_high():
    result = rate_selected_outfit(outfit('#E61919', '#19E6E6'))
    assert result['harmony_type'] == 'complementary'
    assert result['overall_score'] >= 7


def test_missing_slots_only_score_present_items():
    result = rate_selected_outfit({'shirt_layer': [item('#FFFFFF')]})
    assert result['overall_score'] == 6
    assert 'pant' in result['improvement'] and 'accessories' in result['improvement']


@pytest.mark.parametrize('data', [{}, {'pant': []}, {'shirt_layer': 'bad'}, {'profile': {}}, {'shirt_layer': [item('red')]}, {'shirt_layer': [item('#FFFFFF',pattern='')]}])
def test_invalid_inputs(data):
    with pytest.raises(ValueError):
        rate_selected_outfit(data)


def test_patterns_can_reduce_balance_without_judging_item_names():
    data = outfit('#CC3344','#557766')
    original = rate_selected_outfit(data)
    data['shirt_layer'][0]['pattern'] = 'stripes'; data['pant']['pattern'] = 'plaid'
    patterned = rate_selected_outfit(data)
    assert patterned['subscores']['balance'] <= original['subscores']['balance']
