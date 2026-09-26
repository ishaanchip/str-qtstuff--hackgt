"""API boundaries and color-to-clothing ranking; inference tested separately."""
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from threading import Thread
from io import BytesIO
import json
import pytest
from backend.app import api


@pytest.fixture
def server():
    server = ThreadingHTTPServer(('127.0.0.1', 0), api.Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield server
    server.shutdown()
    server.server_close()
    thread.join()


def request(server, method, path, body=None, headers=None):
    connection = HTTPConnection('127.0.0.1', server.server_port)
    connection.request(method, path, body=body, headers=headers or {})
    response = connection.getresponse()
    status, data = response.status, response.read()
    connection.close()
    return status, data


def test_private_files_are_not_served(server):
    for path in ['/../.git/config', '/.env.local', '/node_modules/express/package.json']:
        assert request(server, 'GET', path)[0] == 404
    assert request(server, 'HEAD', '/.env.local')[0] == 405
    assert request(server, 'GET', '/')[0] == 200


def test_upload_validation(server):
    assert request(server, 'POST', '/api/analyze', b'bad', {'Content-Type': 'text/plain'})[0] == 415
    assert request(server, 'POST', '/api/analyze', b'', {'Content-Type': 'image/jpeg'})[0] == 413
    assert request(server, 'POST', '/api/analyze', b'x', {'Content-Type': 'image/jpeg', 'Origin': 'https://other.example'})[0] == 403


def test_analysis_returns_ranked_clothing_in_memory(server, monkeypatch):
    def analyze(images):
        assert isinstance(images[0], BytesIO)
        assert images[0].read() == b'portrait'
        return {'recommended_colors': [
            {'name': 'Ivory', 'hex': '#FFFFF0', 'score': 42},
            {'name': 'Burgundy', 'hex': '#722F37', 'score': 90},
        ]}
    monkeypatch.setattr(api, 'analyze_photos', analyze)
    status, body = request(server, 'POST', '/api/analyze', b'portrait', {'Content-Type': 'image/jpeg'})
    assert status == 200
    items = json.loads(body)['clothing']
    assert [item['score'] for item in items] == [90, 42]
    assert items[0]['color'] == 'Burgundy'


def test_model_error_and_busy(server, monkeypatch):
    def fail(images):
        raise ValueError('Expected one face; detected 0.')
    monkeypatch.setattr(api, 'analyze_photos', fail)
    assert request(server, 'POST', '/api/analyze', b'x', {'Content-Type': 'image/png'})[0] == 422
    with api.ANALYSIS_LOCK:
        assert request(server, 'POST', '/api/analyze', b'x', {'Content-Type': 'image/png'})[0] == 429


def test_tryon_requires_explicit_local_intent(server, monkeypatch):
    calls = []
    def token(origin):
        calls.append(origin)
        return {'apiKey': 'temporary-test-token'}
    monkeypatch.setattr(api, 'create_tryon_token', token)
    origin = f'http://localhost:{server.server_port}'
    assert request(server, 'GET', '/try-on')[0] == 200
    assert request(server, 'GET', '/api/try-on/token')[0] == 404
    for headers in ({}, {'Origin': origin}, {'Origin': 'https://other.example', 'X-Try-On-Intent': 'try'}):
        assert request(server, 'POST', '/api/try-on/token', headers=headers)[0] == 403
    assert calls == []
    status, body = request(server, 'POST', '/api/try-on/token', headers={'Origin': origin, 'X-Try-On-Intent': 'try'})
    assert status == 200
    assert json.loads(body)['apiKey'] == 'temporary-test-token'
    assert calls == [origin]


def test_catalog_contains_ranked_shirts_pants_and_accessories():
    from backend.app.data.clothing_colors import CLOTHING_COLORS
    colors = [dict(color, score=index) for index, color in enumerate(CLOTHING_COLORS)]
    items = api.match_clothing(colors)
    assert len(items) == 20
    assert {item['category'] for item in items} == {'Tops', 'Layers', 'Bottoms', 'Accessories'}
    assert len([item for item in items if item['category'] == 'Accessories']) == 4
    assert [item['score'] for item in items] == sorted((item['score'] for item in items), reverse=True)


def test_tryon_token_uses_verified_tls_and_scoped_ephemeral_credentials(monkeypatch):
    import ssl
    monkeypatch.setenv('DECART_API_KEY', 'private-test-key')
    def upstream(request, *, timeout, context):
        assert request.full_url == 'https://api.decart.ai/v1/client/tokens'
        assert request.get_header('X-api-key') == 'private-test-key'
        assert context.check_hostname
        assert context.verify_mode == ssl.CERT_REQUIRED
        assert context.cert_store_stats()['x509_ca'] > 0
        assert timeout == 20
        payload = json.loads(request.data)
        assert payload['allowedOrigins'] == ['http://localhost:5174']
        assert payload['allowedModels'] == ['lucy-2.5']
        assert payload['constraints']['realtime']['maxSessionDuration'] == 300
        return BytesIO(b'{"apiKey":"ephemeral-test-token","expiresAt":"later"}')
    monkeypatch.setattr(api, 'urlopen', upstream)
    assert api.create_tryon_token('http://localhost:5174') == {'apiKey': 'ephemeral-test-token', 'expiresAt': 'later'}


@pytest.mark.parametrize('failure, expected', [
    (api.HTTPError('https://api.decart.ai', 401, 'secret-upstream-detail', {}, None), 'rejected the API key'),
    (api.HTTPError('https://api.decart.ai', 402, 'secret-upstream-detail', {}, None), 'available credits'),
    (api.HTTPError('https://api.decart.ai', 429, 'secret-upstream-detail', {}, None), 'rate-limiting'),
    (api.URLError(api.ssl.SSLCertVerificationError('secret-upstream-detail')), 'HTTPS certificate'),
    (api.URLError(TimeoutError('secret-upstream-detail')), 'timed out'),
    (api.URLError(OSError('secret-upstream-detail')), 'internet connection'),
])
def test_tryon_errors_are_specific_and_do_not_expose_upstream_details(server, monkeypatch, failure, expected):
    def fail(origin):
        raise failure
    monkeypatch.setattr(api, 'create_tryon_token', fail)
    status, body = request(server, 'POST', '/api/try-on/token', headers={
        'Origin': f'http://localhost:{server.server_port}', 'X-Try-On-Intent': 'try',
    })
    assert status == 502
    assert expected in json.loads(body)['error']
    assert b'secret-upstream-detail' not in body


@pytest.mark.parametrize('body', [b'not-json', b'{}', b'[]', b'{"apiKey":null}', b'{"apiKey":""}'])
def test_tryon_rejects_malformed_provider_response(monkeypatch, body):
    monkeypatch.setenv('DECART_API_KEY', 'private-test-key')
    monkeypatch.setattr(api, 'urlopen', lambda *args, **kwargs: BytesIO(body))
    with pytest.raises(RuntimeError, match='invalid token response'):
        api.create_tryon_token('http://localhost:5174')
