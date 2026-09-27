from io import BytesIO
import pytest
from PIL import Image
from backend.app import product_images as images
from backend.tests.test_api import server, request


def test_only_registered_images_are_served_and_decoded(server, monkeypatch):
    image = BytesIO()
    Image.new('RGB', (20, 30), 'red').save(image, 'JPEG')
    monkeypatch.setattr(images, 'download_image', lambda url: image.getvalue())
    assert request(server, 'GET', '/api/clothing/image/unknown')[0] == 422
    products = [{'image': 'https://cdn.example/product.jpg'}]
    images.register_images(products)
    status, data = request(server, 'GET', products[0]['reference_image'])
    assert status == 200
    assert Image.open(BytesIO(data)).format == 'PNG'
    token = products[0]['reference_image'].rsplit('/', 1)[-1]
    images.REFERENCES[token]['created'] -= 3601
    assert request(server, 'GET', products[0]['reference_image'])[0] == 422


@pytest.mark.parametrize('url', ['http://example.com/p.png', 'https://user:pass@example.com/p.png', 'https://example.com:8080/p.png'])
def test_bad_image_urls_are_rejected(url):
    with pytest.raises(ValueError):
        images.public_target(url)


@pytest.mark.parametrize('address', ['127.0.0.1', '10.0.0.1', '169.254.169.254', '::1'])
def test_private_resolved_addresses_are_rejected(monkeypatch, address):
    monkeypatch.setattr(images, 'getaddrinfo', lambda *a, **kw: [(0, 0, 0, '', (address, 443))])
    with pytest.raises(ValueError):
        images.public_target('https://cdn.example/product.png')


def test_invalid_image_data_is_not_forwarded(monkeypatch):
    products = [{'image': 'https://cdn.example/product.jpg'}]
    images.register_images(products)
    monkeypatch.setattr(images, 'download_image', lambda url: b'<html>not a photo</html>')
    with pytest.raises(ValueError):
        images.get_image(products[0]['reference_image'].rsplit('/',1)[-1])
