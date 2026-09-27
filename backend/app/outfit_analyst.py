"""Deterministic implementation of the user's outfit-color rubric.

No wearer/profile input, LLM calls, trained weights or persistence. Scores are
styling judgments, not calibrated probabilities. See OUTFIT_SCORING.md.
"""
import colorsys
import math
from itertools import combinations
from .color.conversions import hex_to_rgb, rgb_to_hex

SWAPS = [('navy', '#1F2A44'), ('ivory', '#F5F5F0'), ('charcoal', '#36454F'),
         ('tan', '#C8A97E'), ('olive', '#6B6B3A'), ('burgundy', '#722F37'),
         ('cobalt', '#0047AB'), ('rust', '#B7410E'), ('teal', '#008080')]


def rounded(value):
    return max(1, min(10, int(math.floor(value + .5))))


def distance(a, b):
    return abs((a - b + 180) % 360 - 180)


def features(value):
    rgb = hex_to_rgb(value)
    h, l, s = colorsys.rgb_to_hls(*(rgb / 255))
    h *= 360
    neutral = (l < .14 or l > .94 or s < .14
               or (195 <= h <= 260 and l < .3)  # navy
               or (15 <= h <= 55 and (s < .65 or l < .45))  # earth neutrals
               or (45 <= h <= 95 and s < .65 and l < .5)  # olive
               or (195 <= h <= 250 and s < .65 and l < .65))  # denim
    return {'h': h, 'l': l, 's': s, 'neutral': neutral, 'hex': rgb_to_hex(rgb)}


def validate(payload):
    if not isinstance(payload, dict) or set(payload) - {'shirt_layer', 'pant', 'accessories'}:
        raise ValueError('Send shirt_layer, pant and accessories only.')
    layers = payload.get('shirt_layer', [])
    accessories = payload.get('accessories', [])
    layers = [] if layers is None else layers
    accessories = [] if accessories is None else accessories
    pant = payload.get('pant')
    if not isinstance(layers, list) or not isinstance(accessories, list) or len(layers) > 6 or len(accessories) > 12:
        raise ValueError('Use up to six layers and twelve accessories.')
    if pant is not None and not isinstance(pant, dict):
        raise ValueError('Pant must be an item or null.')
    entries = []
    for slot, items in [('shirt_layer', layers), ('pant', [pant] if pant is not None else []), ('accessories', accessories)]:
        for index, item in enumerate(items):
            if not isinstance(item, dict) or set(item) - {'item', 'color_name', 'hex', 'pattern'}:
                raise ValueError('Each item needs item, color_name, hex and pattern.')
            for key in ('item', 'color_name', 'hex', 'pattern'):
                if not isinstance(item.get(key), str) or not item[key].strip() or len(item[key]) > 200:
                    raise ValueError('Item fields must be nonempty text of at most 200 characters.')
            f = features(item['hex'])
            entries.append({**item, **f, 'slot': slot, 'index': index,
                            'patterned': item['pattern'].lower() not in ('solid', 'unknown')})
    if not entries:
        raise ValueError('Add at least one clothing item to rate.')
    return entries


def relationship(items):
    chromatic = [i['h'] for i in items if not i['neutral']]
    if not chromatic:
        return 'neutral-anchored'
    if any(i['neutral'] for i in items):
        return 'neutral-anchored'
    hues = sorted(set(round(h, 4) for h in chromatic))
    spread = max((distance(a, b) for a, b in combinations(hues, 2)), default=0)
    if spread <= 15:
        return 'monochrome'
    if spread <= 55:
        return 'analogous'
    if len(hues) >= 3:
        for origin in hues:
            for label, targets in [('triadic', (0, 120, 240)), ('split-complementary', (0, 150, 210))]:
                groups = {min(range(3), key=lambda k: distance(h, (origin + targets[k]) % 360)) for h in hues}
                if len(groups) == 3 and all(min(distance(h, (origin + t) % 360) for t in targets) <= 20 for h in hues):
                    return label
    if len(hues) == 2 and spread >= 155:
        return 'complementary'
    if len(hues) == 2 and 135 <= spread < 155:
        return 'split-complementary'
    return 'clashing' if min(i['s'] for i in items) > .65 else 'other'


def pair(a, b):
    d = distance(a['h'], b['h'])
    if a['neutral'] or b['neutral']:
        hue = 8
    elif d <= 15:
        hue = 9
    elif d <= 55 or d >= 135:
        hue = 9
    else:
        hue = 3 if min(a['s'], b['s']) > .65 else 5
    # Differences in saturation are acceptable for a related accent; not a
    # penalty on high saturation itself. Temperature contrast follows hue intent.
    saturation = 9 - 2 * abs(a['s'] - b['s'])
    temperature = 9 if hue >= 8 else 5
    return .75 * hue + .15 * saturation + .10 * temperature


def weights(entries):
    layers = [i for i in entries if i['slot'] == 'shirt_layer']
    pants = [i for i in entries if i['slot'] == 'pant']
    base = layers + pants
    w = {}
    for i in layers:
        # Outermost is last; inner layers together occupy 30% of top area.
        share = 1 if len(layers) == 1 else (.7 if i is layers[-1] else .3 / (len(layers) - 1))
        w[(i['slot'], i['index'])] = .55 * share
    for i in pants:
        w[(i['slot'], i['index'])] = .45
    total = sum(w.values())
    if base:
        w = {key: value / total for key, value in w.items()}
    return base, w


def analyze(entries):
    base, w = weights(entries)
    accessories = sorted([i for i in entries if i['slot'] == 'accessories'], key=lambda i: (i['hex'], i['pattern']))
    core = base or accessories
    label = relationship(core)
    scored = [(pair(a, b), w.get((a['slot'], a['index']), 1) * w.get((b['slot'], b['index']), 1)) for a, b in combinations(core, 2)]
    harmony = sum(v * weight for v, weight in scored) / sum(weight for _, weight in scored) if scored else 6
    if label in ('triadic', 'split-complementary') and len(core) >= 3:
        harmony = max(harmony, 8.8)
    layers = [i for i in base if i['slot'] == 'shirt_layer']
    pants = [i for i in base if i['slot'] == 'pant']
    contrast_pairs = [(i, pants[0], w[(i['slot'], i['index'])]) for i in layers] if pants and layers else []
    def contrast(a, b):
        gap = abs(a['l'] - b['l'])
        if gap < .08 and distance(a['h'], b['h']) <= 15 and abs(a['s'] - b['s']) < .15:
            return 7  # deliberate tonal dressing need not be high contrast
        return min(9, 4 + 14 * gap)
    light = sum(contrast(a, b) * weight for a, b, weight in contrast_pairs) / sum(weight for _, _, weight in contrast_pairs) if contrast_pairs else 6
    patterned = sum(i['patterned'] * w.get((i['slot'], i['index']), 1 / len(core)) for i in core)
    balance = max(1, min(10, .7 * harmony + 2.4 - (1.2 * patterned if sum(i['patterned'] for i in core) > 1 else 0)))
    cohesion = None
    if accessories:
        matches = []
        for item in accessories:
            others = base or [i for i in accessories if i is not item]
            matches.append(max((pair(item, i) for i in others), default=6))
        cohesion = sum(matches) / len(matches)
    core_score = .5 * harmony + .25 * light + .25 * balance
    if label == 'clashing' and harmony < 5:
        core_score = min(core_score, 2.3)
    overall = .88 * core_score + .12 * cohesion if accessories and base else core_score
    if all(i['neutral'] for i in entries):
        overall = min(8, overall)
    if len(entries) == 1:
        overall = 6
    return overall, label, {'shirt_pant_harmony': rounded(harmony), 'accessory_cohesion': rounded(cohesion) if cohesion is not None else None,
                            'contrast': rounded(light), 'balance': rounded(balance)}


def rate_selected_outfit(payload):
    entries = validate(payload)
    score, label, subscores = analyze(entries)
    overall = rounded(score)
    summary = ('These colors feel cohesive and deliberate.' if overall >= 9 else
               'These colors work well together.' if overall >= 7 else
               'These colors work together, with room for a clearer balance.' if overall >= 5 else
               'The main colors would benefit from a more connected palette.' if overall >= 3 else
               'The strongest colors compete with each other.')
    works = ('The neutral colors give the outfit a steady foundation.' if label == 'neutral-anchored' else
             'The repeated color family ties the pieces together.' if label == 'monochrome' else
             'The bold colors have a clear relationship.' if label in ('complementary', 'split-complementary', 'triadic') else
             'The colors have a gentle connection.' if label == 'analogous' else
             'The outfit has a distinct mix of colors to build on.')
    best = None
    best_score = score
    # Accessory order is irrelevant; stable sorting makes tie-breaking repeatable.
    for index in sorted(range(len(entries)), key=lambda k: (entries[k]['slot'], entries[k]['index'] if entries[k]['slot'] == 'shirt_layer' else entries[k]['hex'])):
        old = entries[index]
        for name, value in SWAPS:
            if value == old['hex']:
                continue
            trial = [dict(i) for i in entries]
            trial[index].update(features(value))
            trial_score = analyze(trial)[0]
            if trial_score > best_score + .01:
                best_score = trial_score
                best = (old, name, value)
    improvement = 'No color swap is needed.'
    suggested = None
    if best and best_score - score >= .5:
        old, name, suggested = best
        slot = {'shirt_layer': 'shirt/layer', 'pant': 'pant', 'accessories': 'accessory'}[old['slot']]
        improvement = f"Swap the {slot} {old['item']} for {name} ({suggested}) to better connect the outfit colors."
    elif overall < 7:
        improvement = 'No tested single color swap improves this palette enough; review the main color combination.'
    missing = [name for slot, name in [('shirt_layer', 'shirt/layer'), ('pant', 'pant'), ('accessories', 'accessories')] if not any(i['slot'] == slot for i in entries)]
    if missing:
        improvement += ' Not selected: ' + ', '.join(missing) + '; only selected items were scored.'
    return {'overall_score': overall, 'harmony_type': label, 'subscores': subscores,
            'summary': summary, 'what_works': works, 'improvement': improvement, 'suggested_hex': suggested}
