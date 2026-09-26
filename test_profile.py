"""Run Phase 4–7: python test_profile.py photo1.jpg [photo2.jpg photo3.jpg]."""
import argparse
import json
from pathlib import Path
import sys
from backend.app.pipeline import analyze_photos
from backend.app.main import DEFAULT_MODELS


def print_summary(result: dict, top: int = 10) -> None:
    """Print profile and the six numeric contributions for each top color."""
    profile = result['profile']
    print(f'Photos analyzed: {result["photos_analyzed"]}/{result["photos_requested"]}')
    for name in ('skin', 'hair', 'eyes'):
        sample = profile[name]
        print(f'{name.upper()}: RGB={sample["rgb"]} HEX={sample["hex"]} LAB={sample["lab"]} confidence={sample["confidence"]:.3f}')
    for name in ('temperature', 'depth', 'chroma'):
        feature = profile[name]
        print(f'{name.title()} score: {feature["score"]:.3f} ({feature["label"]})')
    for pair in ('skin_hair', 'skin_eye', 'hair_eye'):
        value = profile['contrast'][pair + '_delta_e']
        print(f'{pair.replace("_", "-").capitalize()} Delta E: {value if value is not None else "unavailable"}')
    print(f'Contrast score: {profile["contrast"]["score"]} ({profile["contrast"]["label"]})')
    for name, score in profile['season_scores'].items():
        print(f'{name} score: {score:.3f}')
    print(f'Season: {profile["season"]} (heuristic confidence {profile["season_confidence"]:.3f})')
    for reason in profile['season_analysis']['reasoning']:
        print(f'  {reason}')
    print('\nTop clothing colors:')
    labels = {'temperature': 'Temperature', 'value': 'Value', 'chroma': 'Chroma',
              'harmony': 'Harmony', 'season': 'Season', 'eyes': 'Eye enhancement'}
    for color in result['recommended_colors'][:top]:
        print(f'\nColor: {color["name"]}\nHEX: {color["hex"]}')
        for key, label in labels.items():
            print(f'{label}: {color["components"][key]:.3f}')
        print(f'Final score: {color["score"]:.2f}/100')
    print('\nGroups: ' + ', '.join(f'{name}={len(colors)}' for name, colors in result['color_groups'].items()))
    print(result['method_note'])
    for warning in result['warnings']:
        print(f'Warning: {warning}', file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('photos', nargs='+', type=Path)
    parser.add_argument('--model-dir', type=Path, default=DEFAULT_MODELS)
    parser.add_argument('--debug-dir', type=Path, help='Opt in to per-photo mask exports; must be new')
    parser.add_argument('--json', action='store_true', help='Emit full JSON instead of the text summary')
    args = parser.parse_args()
    try:
        result = analyze_photos(args.photos, args.model_dir, debug_dir=args.debug_dir)
        if args.json:
            print(json.dumps(result, indent=2, allow_nan=False))
        else:
            print_summary(result)
        return 0
    except (ValueError, OSError, RuntimeError) as error:
        print(f'Error: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
