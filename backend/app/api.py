"""Local face-scan API and web server: python -m backend.app.api."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
import json
import os
import ssl
import certifi
from pathlib import Path
from threading import BoundedSemaphore
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from .main import DEFAULT_MODELS
from .pipeline import analyze_photos
from clothes_scraping.clothes_scraper import getClothesInfo, validate_palette, validate_occasion, CATEGORIES, ScraperError
from .product_images import register_images, get_image
from time import monotonic

WEB_ROOT = Path(__file__).resolve().parents[2] / 'web'
MAX_UPLOAD = 10 * 1024 * 1024
ANALYSIS_LOCK = BoundedSemaphore(1)
SHOP_LOCK = BoundedSemaphore(1)
SHOP_CACHE = {}


def decart_ssl_context():
    """Keep system trust and add a CA bundle for Python installs without one."""
    context = ssl.create_default_context()
    context.load_verify_locations(cafile=certifi.where())
    return context


def tryon_connection_error(error):
    """Return actionable messages without reflecting upstream bodies or secrets."""
    if isinstance(error, HTTPError):
        messages = {
            400: 'Decart rejected the try-on token settings.',
            401: 'Decart rejected the API key. Check DECART_API_KEY in web/.env.local or the server environment.',
            402: 'Decart requires available credits. Check your Decart account balance.',
            403: 'Decart denied token creation. Use a permanent server API key with permission to create client tokens.',
            422: 'Decart rejected the try-on token settings.',
            429: 'Decart is rate-limiting requests. Wait a moment, then click Try again.',
        }
        return messages.get(error.code, f'Decart could not issue a try-on token (HTTP {error.code}). Try again shortly.')
    reason = error.reason if isinstance(error, URLError) else error
    if isinstance(reason, ssl.SSLCertVerificationError):
        return 'The server could not verify Decart’s HTTPS certificate. Update the backend certifi package and check your network certificate settings.'
    if isinstance(reason, TimeoutError):
        return 'The connection to Decart timed out. Click Try to retry.'
    if isinstance(reason, ssl.SSLError):
        return 'The server could not establish a secure connection to Decart. Check your network certificate settings.'
    return 'The server could not reach Decart. Check your internet connection, DNS, or proxy, then click Try again.'


def create_tryon_token(origin):
    """Read the server secret and contact Decart only for an explicit Try request."""
    key = os.environ.get('DECART_API_KEY', '')
    if not key and (WEB_ROOT / '.env.local').is_file():
        for line in (WEB_ROOT / '.env.local').read_text().splitlines():
            name, separator, value = line.strip().partition('=')
            if separator and name.strip() == 'DECART_API_KEY':
                key = value.strip().strip('\"\'')
                break
    if not key:
        raise ValueError('Add DECART_API_KEY to web/.env.local to enable try-on.')
    payload = {'expiresIn': 60, 'allowedModels': ['lucy-2.5'],
               'allowedOrigins': [origin],
               'constraints': {'realtime': {'maxSessionDuration': 300}}}
    request = Request('https://api.decart.ai/v1/client/tokens',
                      data=json.dumps(payload).encode(), method='POST',
                      headers={'Content-Type': 'application/json', 'X-API-KEY': key})
    with urlopen(request, timeout=20, context=decart_ssl_context()) as response:
        try:
            token = json.load(response)
        except (ValueError, UnicodeError) as error:
            raise RuntimeError('Decart returned an invalid token response. Click Try to retry.') from error
    if not isinstance(token, dict) or not isinstance(token.get('apiKey'), str) or not token['apiKey']:
        raise RuntimeError('Decart returned an invalid token response. Click Try to retry.')
    return {'apiKey': token['apiKey'], 'expiresAt': token.get('expiresAt')}

# Illustrative outfit ideas, not live inventory or purchasable products.
CATALOG = [
    ('Everyday tee', 'Tops', 'Burgundy'), ('Linen shirt', 'Tops', 'Ivory'),
    ('Knit polo', 'Tops', 'Deep Teal'), ('Crewneck sweater', 'Tops', 'Rose'),
    ('Cotton cardigan', 'Layers', 'Sage'), ('Relaxed blazer', 'Layers', 'Navy'),
    ('Overshirt', 'Layers', 'Forest Green'), ('Knit jacket', 'Layers', 'Chocolate'),
    ('Straight-leg trousers', 'Bottoms', 'Taupe'), ('Classic jeans', 'Bottoms', 'Denim'),
    ('Wide-leg trousers', 'Bottoms', 'Charcoal'), ('Linen trousers', 'Bottoms', 'Cream'),
    ('Fine-knit sweater', 'Tops', 'Plum'), ('Lightweight shirt', 'Tops', 'Emerald'),
    ('Cotton tee', 'Tops', 'Cobalt'), ('Overshirt', 'Layers', 'Rust'),
    ('Woven scarf', 'Accessories', 'Sage'), ('Baseball cap', 'Accessories', 'Navy'),
    ('Leather belt', 'Accessories', 'Chocolate'), ('Crossbody bag', 'Accessories', 'Camel'),
]


def match_clothing(colors):
    by_name = {color['name']: color for color in colors}
    return sorted([
        {'id': index, 'name': name, 'category': category, 'color': color,
         'hex': by_name[color]['hex'], 'score': by_name[color]['score']}
        for index, (name, category, color) in enumerate(CATALOG) if color in by_name
    ], key=lambda item: -item['score'])


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def json_response(self, status, data):
        payload = json.dumps(data, allow_nan=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path == '/api/health':
            ready = all((DEFAULT_MODELS / name).is_file() for name in
                        ('face_landmarker.task', 'selfie_multiclass.tflite'))
            return self.json_response(200, {'models_ready': ready})
        # Serve only the new page's public files, never .env.local or node_modules.
        path = self.path.split('?')[0]
        if path.startswith('/api/clothing/image/'):
            try:
                image = get_image(path.rsplit('/', 1)[-1])
            except (ValueError, OSError):
                return self.json_response(422, {'error': 'Product photo unavailable. Try another item or search again.'})
            self.send_response(200)
            self.send_header('Content-Type', 'image/png')
            self.send_header('Content-Length', str(len(image)))
            self.send_header('Cache-Control', 'private, max-age=600')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(image)
            return
        if path == '/try-on':
            self.path = '/try-on.html'
            return super().do_GET()
        if path.startswith('/tryon-assets/'):
            asset = (WEB_ROOT / path.lstrip('/')).resolve()
            if asset.is_relative_to((WEB_ROOT / 'tryon-assets').resolve()) and asset.is_file() and asset.suffix in ('.js', '.mjs'):
                return super().do_GET()
        if path not in ('/', '/index.html', '/scan.js', '/scan.css', '/try-on.html', '/try-on.js', '/try-on.css'):
            return self.json_response(404, {'error': 'Not found'})
        return super().do_GET()

    def do_HEAD(self):
        return self.json_response(405, {'error': 'Method not allowed'})

    def do_POST(self):
        if self.path == '/api/clothing/search':
            allowed = {f'http://localhost:{self.server.server_port}', f'http://127.0.0.1:{self.server.server_port}'}
            if self.headers.get('Origin') not in allowed:
                return self.json_response(403, {'error': 'Use the local fitting room to search clothes.'})
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                return self.json_response(415, {'error': 'Send a JSON palette.'})
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 20000:
                    return self.json_response(413, {'error': 'Palette request is too large or empty.'})
                self.connection.settimeout(10)
                payload = json.loads(self.rfile.read(length))
                if not isinstance(payload, dict):
                    raise ValueError('Send a palette object.')
                colors = validate_palette(payload.get('colors'))
                occasion = validate_occasion(payload.get('occasion', ''))
                category = payload.get('category', 'Tops')
                if not isinstance(category, str) or category not in CATEGORIES:
                    raise ValueError('Choose a valid clothing category.')
            except (ValueError, OSError):
                return self.json_response(400, {'error': 'Invalid palette. Send HEX colors, scores from 0–100, and a valid clothing category.'})
            if not SHOP_LOCK.acquire(blocking=False):
                return self.json_response(429, {'error': 'A clothing search is running. Please retry shortly.'})
            try:
                key = (category, occasion, json.dumps(colors, sort_keys=True))
                cached = SHOP_CACHE.get(key)
                if cached and monotonic() - cached[0] < 600:
                    return self.json_response(200, cached[1])
                result = getClothesInfo(colors, category=category, occasion=occasion)
                register_images(result['products'])
                if not result.get('partial'):
                    if len(SHOP_CACHE) >= 32:
                        SHOP_CACHE.pop(next(iter(SHOP_CACHE)))
                    SHOP_CACHE[key] = (monotonic(), result)
                return self.json_response(200, result)
            except ScraperError as error:
                return self.json_response(503, {'error': str(error)})
            except Exception:
                return self.json_response(502, {'error': 'Clothing search failed. Please retry.'})
            finally:
                SHOP_LOCK.release()
        if self.path == '/api/try-on/token':
            expected = f'http://localhost:{self.server.server_port}'
            allowed = {expected, f'http://127.0.0.1:{self.server.server_port}'}
            origin = self.headers.get('Origin')
            if origin not in allowed or self.headers.get('X-Try-On-Intent') != 'try':
                return self.json_response(403, {'error': 'Click Try in the fitting room to start a session.'})
            try:
                return self.json_response(200, create_tryon_token(origin))
            except ValueError as error:
                return self.json_response(503, {'error': str(error)})
            except (HTTPError, URLError, TimeoutError, OSError) as error:
                return self.json_response(502, {'error': tryon_connection_error(error)})
            except RuntimeError:
                return self.json_response(502, {'error': 'Decart returned an invalid token response. Click Try to retry.'})
        if self.path != '/api/analyze':
            return self.json_response(404, {'error': 'Not found'})
        # Browser requests must originate from this local application.
        origin = self.headers.get('Origin')
        if origin and origin != 'http://' + self.headers.get('Host', ''):
            return self.json_response(403, {'error': 'Use the local face-scan page.'})
        if self.headers.get('Content-Type', '').split(';')[0] not in ('image/jpeg', 'image/png'):
            return self.json_response(415, {'error': 'Upload a JPEG or PNG portrait.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            length = 0
        if not 0 < length <= MAX_UPLOAD:
            return self.json_response(413, {'error': 'Choose an image smaller than 10 MB.'})
        if not ANALYSIS_LOCK.acquire(blocking=False):
            return self.json_response(429, {'error': 'Another scan is running. Try again shortly.'})
        try:
            self.connection.settimeout(30)
            data = self.rfile.read(length)
            if len(data) != length:
                raise ValueError('The image upload was incomplete.')
            result = analyze_photos([BytesIO(data)])
            result['clothing'] = match_clothing(result['recommended_colors'])
            result['catalog_note'] = 'Illustrative clothing ideas ranked by color, not live store inventory.'
            self.json_response(200, result)
        except (ValueError, OSError, RuntimeError) as error:
            self.json_response(422, {'error': str(error)})
        except Exception:
            self.json_response(500, {'error': 'Analysis failed. Please try a different portrait.'})
        finally:
            ANALYSIS_LOCK.release()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=5173)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Face scan ready at http://localhost:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
