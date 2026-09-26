"""Personalized CIELCh candidates; design assumptions documented in PALETTE.md."""
import numpy as np
from ..color.conversions import lab_chroma_hue, lab_to_rgb, rgb_to_lab, rgb_to_hex
from ..config.palette import REGIONS
from .clothing_score import score_clothing_color


def generate_palette(profile: dict) -> list[dict]:
    """Return up to 12 distinct, scored sRGB colors, including up to 3 neutrals.

    Hue relationships propose candidates, never guarantee aesthetic suitability.
    All distances and scores use the actual rounded sRGB output after gamut mapping.
    """
    hues = [(float(h), 'hue exploration') for h in range(0, 360, 30)]
    for region in REGIONS:
        sample = profile[region]
        if sample['lab'] is None or sample['confidence'] <= 0:
            continue
        chroma, hue = lab_chroma_hue(sample['lab'])
        if chroma < 8:
            continue  # Hue is unstable for nearly achromatic measurements.
        for offset, relationship in ((0, 'echo'), (-30, 'analogous'), (30, 'analogous'),
                                     (180, 'complementary'), (-150, 'split complementary'),
                                     (150, 'split complementary'), (120, 'triadic'), (-120, 'triadic')):
            hues.append(((hue + offset) % 360, f'{relationship} to {region}'))
    center = 100 * (1 - profile['depth']['score'])
    lightnesses = sorted(set(float(np.clip(center + shift, 18, 92))
                            for shift in (-30, -15, 0, 15, 30)))
    target_chroma = 15 + 45 * profile['chroma']['score']
    candidates = {}
    for role, chromas in (('neutral', (0, 5)),
                          ('accent', (max(15, target_chroma - 12), target_chroma, target_chroma + 12))):
        for hue, relationship in hues:
            for lightness in lightnesses:
                for chroma in chromas:
                    # Reduce chroma until round-trip error is small, preserving L/h
                    # instead of accepting a heavily clipped out-of-gamut color.
                    mapped_chroma = chroma
                    for _ in range(40):
                        angle = np.radians(hue)
                        lab = np.array([lightness, mapped_chroma * np.cos(angle), mapped_chroma * np.sin(angle)])
                        rgb = lab_to_rgb(lab)
                        actual_lab = rgb_to_lab(rgb)
                        if np.linalg.norm(actual_lab - lab) <= 2:
                            break
                        mapped_chroma *= 0.9
                    value = rgb_to_hex(rgb)
                    if value in candidates:
                        continue
                    actual_chroma, _ = lab_chroma_hue(actual_lab)
                    actual_role = 'neutral' if actual_chroma < 10 else 'accent'
                    scored = score_clothing_color(profile, {'name': f'{actual_role.title()} {value}', 'hex': value})
                    scored.update(role=actual_role, explanation=(
                        'Low-chroma neutral at a profile-relative lightness.' if actual_role == 'neutral'
                        else f'Candidate from {relationship}; ranked by measured color compatibility.'),
                        source='generated')
                    candidates[value] = scored
    ranked = sorted(candidates.values(), key=lambda color: (-color['score'], color['hex']))
    selected = []
    for role, limit in (('neutral', 3), ('accent', 9)):
        count = 0
        for color in ranked:
            if color['role'] != role:
                continue
            lab = np.array(color['features']['lab'])
            if any(np.linalg.norm(lab - other['features']['lab']) < 12 for other in selected):
                continue
            selected.append(color)
            count += 1
            if count == limit:
                break
    return sorted(selected, key=lambda color: -color['score'])
