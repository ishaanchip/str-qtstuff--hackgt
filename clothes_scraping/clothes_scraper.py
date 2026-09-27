"""Channel3 clothing discovery. Importing this module never contacts the provider."""
from itertools import islice
from pathlib import Path
from urllib.parse import urlsplit
import math
import os
import re
from concurrent.futures import ThreadPoolExecutor
from itertools import zip_longest
from clothes_scraping.color_match import verify_product

ENV_FILE = Path(__file__).resolve().parents[1] / 'web' / '.env.local'
BRAND_DOMAINS = ('nike.com', 'adidas.com', 'uniqlo.com', 'gap.com', 'jcrew.com',
                 'everlane.com', 'patagonia.com', 'hm.com', 'zara.com', 'abercrombie.com')
CATEGORIES = {'All': 'all clothing', 'Tops': 'shirts, T-shirts and polos', 'Layers': 'jackets and cardigans',
              'Bottoms': 'pants and trousers', 'Accessories': 'scarves and hats'}


class ScraperError(RuntimeError):
    pass


def api_key():
    key = os.environ.get('CHANNEL3_API_KEY', '').strip()
    if not key and ENV_FILE.is_file():
        for line in ENV_FILE.read_text().splitlines():
            name, sep, value = line.strip().partition('=')
            if sep and name.strip() == 'CHANNEL3_API_KEY':
                key = value.strip().strip('\"\'')
                break
    return key


def safe_url(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = urlsplit(value)
        if parsed.scheme == 'https' and parsed.hostname and not parsed.username and not parsed.password:
            return value
    except ValueError:
        pass
    return None


def storefront(domain):
    if not isinstance(domain, str):
        return None
    domain = domain.lower().removeprefix('www.').rstrip('.')
    return next((brand for brand in BRAND_DOMAINS if domain == brand or domain.endswith('.' + brand)), None)


def validate_palette(colors):
    if not isinstance(colors, list) or not 1 <= len(colors) <= 100:
        raise ValueError('Provide 1–100 palette colors.')
    cleaned = []
    for color in colors:
        if not isinstance(color, dict) or not re.fullmatch(r'#[0-9a-fA-F]{6}', str(color.get('hex', ''))):
            raise ValueError('Palette colors need six-digit HEX codes.')
        score = color.get('score', 0)
        if isinstance(score, bool) or not isinstance(score, (int, float)) or not math.isfinite(score) or not 0 <= score <= 100:
            raise ValueError('Palette scores must be between 0 and 100.')
        cleaned.append({'hex': color['hex'].upper(), 'score': score,
                        'name': str(color.get('name', color['hex']))[:80]})
    unique = {}
    for color in sorted(cleaned, key=lambda c: -c['score']):
        unique.setdefault(color['hex'], color)
    return list(unique.values())[:3]


def validate_occasion(value):
    if not isinstance(value, str) or len(value) > 300 or any(ord(c) < 32 and c not in '\n\t' for c in value):
        raise ValueError('Occasion must be text of up to 300 characters.')
    return ' '.join(value.split())


def search_palette(client, colors, category='Tops', occasion=''):
    """One HEX filter per query: Channel3 combines multiple colors with AND."""
    if category == 'All':
        categories = [name for name in CATEGORIES if name != 'All']
        results, failures = [], 0
        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = [pool.submit(search_palette, client, colors, name, occasion) for name in categories]
            for future in futures:
                try:
                    results.append(future.result())
                except ScraperError:
                    failures += 1
        if not results:
            raise ScraperError('Clothing search is unavailable. Please retry.')
        # Interleave categories so the result limit does not exclude pants/accessories.
        products, seen = [], set()
        for row in zip_longest(*(result['products'] for result in results)):
            for product in row:
                if product and product['id'] not in seen:
                    products.append(product)
                    seen.add(product['id'])
        return {'products': sorted(products[:18], key=lambda item: item['photo_color_match']['distance_delta_e76']), 'partial': bool(failures) or any(r['partial'] for r in results),
                'note': results[0]['note']}
    found, seen, failures = [], set(), 0
    for color in colors:
        try:
            products = client.products.search(
                query=(f"Clothing: {CATEGORIES[category]}. The garment must be predominantly {color['name']} ({color['hex']}). Match the actual garment, not its background or a small logo. Prefer product-only photos."
                       + (f" Select clothing appropriate for this occasion and dress code: {occasion}." if occasion else '')),
                filters={'colors': {'palette': [{'hex': color['hex']}], 'match': 'strict'},
                         'website_ids': list(BRAND_DOMAINS), 'availability': ['InStock'], 'conditions': ['new']},
                limit=8, request_options={'timeout_in_seconds': 20, 'max_retries': 0})
            # Bound iteration so the SDK cannot auto-fetch unlimited result pages.
            for product in islice(products, 8):
                if (product.id, color['hex']) in seen:
                    continue
                offers = [o for o in (product.offers or []) if storefront(o.domain)
                          and o.availability != 'OutOfStock' and o.condition in (None, 'new')
                          and safe_url(o.url)]
                # Accept only brand links or Channel3's documented attributed buy links.
                offers = [o for o in offers if storefront(urlsplit(o.url).hostname) == storefront(o.domain)
                          or urlsplit(o.url).hostname in ('buy.trychannel3.com', 'www.buy.trychannel3.com')]
                if not offers:
                    continue
                offer = offers[0]
                images = sorted(product.images or [], key=lambda i: not i.is_main_image)
                image = next((url for i in images if (url := safe_url(i.cleaned_url) or safe_url(i.url))), None)
                price = offer.price.price if offer.price else None
                if price is not None and (not math.isfinite(price) or price < 0):
                    price = None
                found.append({'id': product.id, 'name': product.title, 'category': category,
                              'brand': ', '.join(b.name for b in (product.brands or [])),
                              'image': image, 'url': offer.url, 'store': storefront(offer.domain),
                              'price': price, 'currency': offer.price.currency if offer.price else None,
                              'palette_hex': color['hex'], 'palette_name': color['name'],
                              'palette_score': color['score'], 'match_method': 'Channel3 HEX color filter'})
                seen.add((product.id, color['hex']))
        except Exception:
            failures += 1
    if failures == len(colors):
        raise ScraperError('Clothing search is unavailable. Check your Channel3 key, credits and connection, then retry.')
    with ThreadPoolExecutor(max_workers=4) as pool:
        verified = [item for item in pool.map(verify_product, found) if item is not None]
    verified.sort(key=lambda item: item['photo_color_match']['distance_delta_e76'])
    unique = {}
    for item in verified:
        unique.setdefault(item['id'], item)
    return {'products': list(unique.values())[:18], 'partial': bool(failures),
            'note': 'Product photos screened for a predominantly matching foreground color; closest photo matches first. '
                    'Photos with uncertain backgrounds or insufficient matching color are omitted. Lighting and store variants can still differ. '
                    'Links may use Channel3 tracking before opening the brand store. Prices and stock can change.'}


def getClothesInfo(colors, amount_of_clothes=18, category='Tops', occasion=''):
    """Search a scored HEX palette; keep the original scraper entry point."""
    colors = validate_palette(colors)
    occasion = validate_occasion(occasion)
    if category not in CATEGORIES:
        raise ValueError('Choose Tops, Layers, Bottoms or Accessories.')
    key = api_key()
    if not key:
        raise ScraperError('Add CHANNEL3_API_KEY to web/.env.local to enable clothing search.')
    try:
        import httpx
        from channel3_sdk import Channel3
    except ImportError as error:
        raise ScraperError('Install backend/requirements.txt to enable clothing search.') from error
    with httpx.Client(timeout=20) as http_client:
        client = Channel3(api_key=key, httpx_client=http_client)
        result = search_palette(client, colors, category, occasion)
    result['products'] = result['products'][:max(0, min(amount_of_clothes, 18))]
    return result


if __name__ == '__main__':
    import json
    print(json.dumps(getClothesInfo([{'name': 'Teal', 'hex': '#008080', 'score': 90}], 6), indent=2))
