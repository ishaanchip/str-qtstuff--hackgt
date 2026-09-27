"""Provider schema, palette filtering, safe links and API failure boundaries."""
import json
import httpx
import pytest
from channel3_sdk import Channel3
from clothes_scraping import clothes_scraper as scraper
from backend.app import api
from backend.tests.test_api import server, request


@pytest.fixture(autouse=True)
def product_photo(monkeypatch):
    from io import BytesIO
    from PIL import Image, ImageDraw
    from clothes_scraping import color_match
    image = Image.new('RGBA', (80, 80), (0, 0, 0, 0))
    ImageDraw.Draw(image).rectangle((10, 10, 70, 70), fill='#008080')
    output = BytesIO(); image.save(output, 'PNG')
    monkeypatch.setattr(color_match, 'download_image', lambda url: output.getvalue())


def product(identifier='shirt', domain='nike.com', url='https://www.buy.trychannel3.com/test'):
    return {'id': identifier, 'title': 'Cotton shirt', 'brands': [{'id': 'brand', 'name': 'Nike'}],
            'images': [{'url': 'https://images.example/shirt.png', 'is_main_image': True}],
            'offers': [{'domain': domain, 'url': url, 'availability': 'InStock',
                        'price': {'price': 40, 'currency': 'USD'}, 'condition': 'new'}]}


def test_real_sdk_schema_hex_filters_dedup_and_brand_links():
    calls = []
    def provider(request):
        body = json.loads(request.content)
        calls.append(body)
        assert body['filters']['colors']['palette'] == [{'hex': ['#008080', '#722F37'][len(calls)-1]}]
        assert body['filters']['colors']['match'] == 'strict'
        assert body['filters']['website_ids'] == list(scraper.BRAND_DOMAINS)
        assert 'Outdoor wedding' in body['query']
        return httpx.Response(200, json={'products': [product(), product('retailer', 'marketplace.example'),
            product('unsafe', url='javascript:alert(1)'), product('fake', 'nike.com.evil.example')]})
    with httpx.Client(transport=httpx.MockTransport(provider)) as transport:
        client = Channel3(api_key='test-key', httpx_client=transport)
        result = scraper.search_palette(client, [{'hex': '#008080', 'score': 90, 'name': 'Teal'},
                                                 {'hex': '#722F37', 'score': 80, 'name': 'Wine'}], occasion='Outdoor wedding')
    assert len(calls) == 2
    assert len(result['products']) == 1
    assert result['products'][0]['price'] == 40
    assert result['products'][0]['store'] == 'nike.com'
    assert result['products'][0]['palette_hex'] == '#008080'


def test_missing_key_is_actionable_and_import_has_no_side_effect(monkeypatch, tmp_path):
    monkeypatch.delenv('CHANNEL3_API_KEY', raising=False)
    monkeypatch.setattr(scraper, 'ENV_FILE', tmp_path / 'missing')
    with pytest.raises(scraper.ScraperError, match='CHANNEL3_API_KEY to web/.env.local'):
        scraper.getClothesInfo([{'hex': '#008080', 'score': 90}])
    scraper.ENV_FILE.write_text('CHANNEL3_API_KEY="file-key"\n')
    assert scraper.api_key() == 'file-key'
    monkeypatch.setenv('CHANNEL3_API_KEY', 'environment-key')
    assert scraper.api_key() == 'environment-key'


@pytest.mark.parametrize('colors', [None, [], [{'hex':'bad'}], [{'hex':'#FFFFFF','score':float('nan')}],
                                    [{'hex':'#FFFFFF','score':101}]])
def test_invalid_palette(colors):
    with pytest.raises(ValueError):
        scraper.validate_palette(colors)


def test_shop_api_validation_cache_and_safe_errors(server, monkeypatch):
    api.SHOP_CACHE.clear()
    calls = []
    def search(colors, category, occasion):
        calls.append((colors, category, occasion))
        return {'products': [], 'partial': False}
    monkeypatch.setattr(api, 'getClothesInfo', search)
    headers = {'Content-Type':'application/json', 'Origin':f'http://localhost:{server.server_port}'}
    body = json.dumps({'colors':[{'hex':'#008080','score':90}], 'category':'Tops'})
    assert request(server, 'POST', '/api/clothing/search', body, {'Content-Type':'application/json'})[0] == 403
    assert request(server, 'POST', '/api/clothing/search', '{}', headers)[0] == 400
    for _ in range(2):
        assert request(server, 'POST', '/api/clothing/search', body, headers)[0] == 200
    assert len(calls) == 1
    occasion_body = json.dumps({'colors':[{'hex':'#008080','score':90}], 'category':'Tops', 'occasion':'Outdoor wedding'})
    assert request(server, 'POST', '/api/clothing/search', occasion_body, headers)[0] == 200
    assert len(calls) == 2
    assert calls[-1][-1] == 'Outdoor wedding'
    invalid = json.dumps({'colors':[{'hex':'#008080','score':90}], 'occasion':'x' * 301})
    assert request(server, 'POST', '/api/clothing/search', invalid, headers)[0] == 400
    api.SHOP_CACHE.clear()
    def fail(*args, **kwargs):
        raise RuntimeError('secret-key-and-upstream-response')
    monkeypatch.setattr(api, 'getClothesInfo', fail)
    status, data = request(server, 'POST', '/api/clothing/search', body, headers)
    assert status == 502
    assert b'secret-key' not in data


def test_all_category_searches_each_slot_and_keeps_product_categories():
    from types import SimpleNamespace
    calls = []
    def search(**kwargs):
        query = kwargs['query']
        category = next(name for name, text in scraper.CATEGORIES.items() if name != 'All' and text in query)
        calls.append(category)
        return [SimpleNamespace(id=category, title=category, brands=[], images=[SimpleNamespace(url='https://images.example/p.png', cleaned_url=None, is_main_image=True)], offers=[
            SimpleNamespace(domain='nike.com', url='https://nike.com/product', availability='InStock',
                            condition='new', price=None)])]
    client = SimpleNamespace(products=SimpleNamespace(search=search))
    result = scraper.search_palette(client, [{'name':'Teal','hex':'#008080','score':90}], 'All', 'Wedding')
    assert set(calls) == {'Tops', 'Layers', 'Bottoms', 'Accessories'}
    assert {item['category'] for item in result['products']} == set(calls)
    assert not result['partial']
