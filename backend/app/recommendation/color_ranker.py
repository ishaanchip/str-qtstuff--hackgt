"""Stable color ranking and descriptive styling groups."""
from ..config import scoring as cfg
from .clothing_score import score_clothing_color


def rank_colors(profile: dict, candidate_colors: list[dict]) -> list[dict]:
    """Sort descending, preserving candidate order on ties; never ban colors."""
    return sorted((score_clothing_color(profile, color) for color in candidate_colors),
                  key=lambda result: -result['score'])


def group_colors(ranked: list[dict]) -> dict[str, list[dict]]:
    """Partition results; experimental describes contrast, not a prohibition."""
    groups = {name: [] for name in ('strongest_matches', 'good_matches',
                                   'experimental_contrast_colors', 'lower_matches')}
    for color in ranked:
        if color['score'] >= cfg.STRONG_MATCH_SCORE:
            group = 'strongest_matches'
        elif color['score'] >= cfg.GOOD_MATCH_SCORE:
            group = 'good_matches'
        elif (color['components']['harmony'] >= cfg.EXPERIMENTAL_HARMONY_MIN and
              color['diagnostics']['skin_lightness_gap'] >= cfg.EXPERIMENTAL_GAP_MIN):
            group = 'experimental_contrast_colors'
        else:
            group = 'lower_matches'
        groups[group].append(color)
    return groups
