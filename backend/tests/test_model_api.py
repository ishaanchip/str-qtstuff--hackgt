"""Standalone frontend contract without MediaPipe inference or shopping imports."""
from http.client import HTTPConnection
from threading import Thread
import json
import pytest
from backend.app import model_api


@pytest.fixture
def server(tmp_path):
    for name in model_api.MODEL_FILES:
        (tmp_path / name).touch()
    server = model_api.ModelServer(('127.0.0.1', 0), allowed_origins=['http://localhost:3000'], model_dir=tmp_path)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield server
    server.shutdown(); server.server_close(); thread.join()


def request(server, method, path, body=None, headers=None):
    client = HTTPConnection('127.0.0.1', server.server_port)
    client.request(method, path, body=body, headers=headers or {})
    response = client.getresponse()
    result = response.status, dict(response.getheaders()), response.read()
    client.close()
    return result


def test_cors_preflight_and_rejected_origin(server):
    status, headers, _ = request(server, 'OPTIONS', '/api/analyze', headers={'Origin':'http://localhost:3000', 'Access-Control-Request-Method':'POST', 'Access-Control-Request-Headers':'content-type'})
    assert status == 204
    assert headers['Access-Control-Allow-Origin'] == 'http://localhost:3000'
    assert headers['Access-Control-Allow-Headers'] == 'Content-Type'
    assert request(server,'OPTIONS','/api/analyze',headers={'Origin':'https://unapproved.example'})[0] == 403
    assert request(server,'GET','/.env.local')[0] == 404


def test_raw_photo_returns_pipeline_response_without_shopping(server, monkeypatch):
    def analyze(images, model_dir):
        assert images[0].read() == b'portrait'
        assert model_dir == server.model_dir
        return {'recommended_colors':[{'name':'Teal','hex':'#008080','score':90}], 'profile':{}, 'warnings':[]}
    monkeypatch.setattr(model_api, 'analyze_photos', analyze)
    status, headers, body = request(server,'POST','/api/analyze',b'portrait',{'Content-Type':'image/jpeg','Origin':'http://localhost:3000'})
    assert status == 200
    assert headers['Access-Control-Allow-Origin'] == 'http://localhost:3000'
    assert json.loads(body)['recommended_colors'][0]['hex'] == '#008080'
    assert 'clothing' not in json.loads(body)


def test_errors_and_busy(server, monkeypatch):
    assert request(server,'POST','/api/analyze',b'bad',{'Content-Type':'multipart/form-data'})[0] == 415
    assert request(server,'POST','/api/analyze',b'',{'Content-Type':'image/png'})[0] == 413
    with server.analysis_lock:
        assert request(server,'POST','/api/analyze',b'x',{'Content-Type':'image/png'})[0] == 429
    def fail(*args, **kwargs):
        raise ValueError('Expected one face.')
    monkeypatch.setattr(model_api,'analyze_photos',fail)
    status, headers, body = request(server,'POST','/api/analyze',b'x',{'Content-Type':'image/png','Origin':'http://localhost:3000'})
    assert status == 422
    assert 'Access-Control-Allow-Origin' in headers
    assert json.loads(body)['error'] == 'Expected one face.'
    assert server.analysis_lock.acquire(blocking=False)
    server.analysis_lock.release()


def test_missing_models(server):
    assert json.loads(request(server,'GET','/api/health')[2])['models_ready']
    (server.model_dir / model_api.MODEL_FILES[0]).unlink()
    assert not json.loads(request(server,'GET','/api/health')[2])['models_ready']
    assert request(server,'POST','/api/analyze',b'x',{'Content-Type':'image/png'})[0] == 503


@pytest.mark.parametrize('path', ['/', '/index.html', '/scan.js', '/try-on', '/tryon-assets/sdk.js'])
def test_api_does_not_serve_removed_frontend(server, path):
    status, headers, body = request(server, 'GET', path)
    assert status == 404
    assert headers['Content-Type'] == 'application/json'
    assert json.loads(body) == {'error': 'Not found.'}


def test_api_does_not_expose_try_on_provider(server):
    assert request(server, 'POST', '/api/try-on/token', b'{}',
                   {'Content-Type': 'application/json'})[0] == 404
