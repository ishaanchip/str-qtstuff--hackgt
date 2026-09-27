"""Standalone portrait-to-palette API, independent of the website and shopping services."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
import json
from pathlib import Path
from threading import BoundedSemaphore

from .main import DEFAULT_MODELS
from .pipeline import analyze_photos

MAX_UPLOAD = 10 * 1024 * 1024
MODEL_FILES = ('face_landmarker.task', 'selfie_multiclass.tflite')


class ModelServer(ThreadingHTTPServer):
    def __init__(self, address, *, allowed_origins=(), model_dir=DEFAULT_MODELS):
        self.allowed_origins = frozenset(allowed_origins)
        self.model_dir = Path(model_dir)
        self.analysis_lock = BoundedSemaphore(1)
        super().__init__(address, ModelHandler)


class ModelHandler(BaseHTTPRequestHandler):
    def origin_allowed(self):
        origin = self.headers.get('Origin')
        return origin is None or origin in self.server.allowed_origins

    def respond(self, status, payload=None):
        body = b'' if payload is None else json.dumps(payload, allow_nan=False).encode()
        self.send_response(status)
        origin = self.headers.get('Origin')
        if origin in self.server.allowed_origins:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Vary', 'Origin')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_OPTIONS(self):
        if not self.origin_allowed():
            return self.respond(403, {'error': 'Frontend origin is not allowed.'})
        if self.path not in ('/api/analyze', '/api/health'):
            return self.respond(404, {'error': 'Not found.'})
        return self.respond(204)

    def do_GET(self):
        if not self.origin_allowed():
            return self.respond(403, {'error': 'Frontend origin is not allowed.'})
        if self.path != '/api/health':
            return self.respond(404, {'error': 'Not found.'})
        ready = all((self.server.model_dir / name).is_file() for name in MODEL_FILES)
        return self.respond(200, {'models_ready': ready})

    def do_POST(self):
        if not self.origin_allowed():
            return self.respond(403, {'error': 'Frontend origin is not allowed.'})
        if self.path != '/api/analyze':
            return self.respond(404, {'error': 'Not found.'})
        media_type = self.headers.get('Content-Type', '').split(';')[0].strip().lower()
        if media_type not in ('image/jpeg', 'image/png'):
            return self.respond(415, {'error': 'Send a raw JPEG or PNG body, not multipart/form-data.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            length = 0
        if not 0 < length <= MAX_UPLOAD or self.headers.get('Transfer-Encoding'):
            return self.respond(413, {'error': 'Send an image of 1 byte to 10 MB with Content-Length.'})
        if not all((self.server.model_dir / name).is_file() for name in MODEL_FILES):
            return self.respond(503, {'error': 'Model files are missing. See backend/MODEL_API.md for setup.'})
        if not self.server.analysis_lock.acquire(blocking=False):
            return self.respond(429, {'error': 'Another image is being analyzed. Retry shortly.'})
        try:
            self.connection.settimeout(90)
            data = self.rfile.read(length)
            if len(data) != length:
                raise ValueError('Incomplete upload.')
            result = analyze_photos([BytesIO(data)], model_dir=self.server.model_dir)
            self.respond(200, result)
        except (ValueError, OSError, RuntimeError) as error:
            self.respond(422, {'error': str(error)})
        except Exception:
            self.respond(500, {'error': 'Analysis failed.'})
        finally:
            self.server.analysis_lock.release()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--model-dir', type=Path, default=DEFAULT_MODELS)
    parser.add_argument('--allow-origin', action='append', default=None,
                        help='Exact frontend origin; repeat for multiple frontends.')
    args = parser.parse_args()
    origins = args.allow_origin if args.allow_origin is not None else ['http://localhost:3000', 'http://localhost:5173']
    server = ModelServer((args.host, args.port), allowed_origins=origins, model_dir=args.model_dir)
    print(f'Model API ready at http://{args.host}:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
