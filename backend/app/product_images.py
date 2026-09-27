"""Bounded same-origin product references; only provider-registered images are fetched."""
from io import BytesIO
from http.client import HTTPSConnection, HTTPException
from ipaddress import ip_address
from secrets import token_urlsafe
from socket import getaddrinfo, create_connection, SOCK_STREAM
from ssl import create_default_context
from threading import Lock
from time import monotonic
from urllib.parse import urlsplit, urljoin
import certifi
from PIL import Image, ImageOps, UnidentifiedImageError

REFERENCES = {}
LOCK = Lock()
MAX_BYTES = 8 * 1024 * 1024


def register_images(products):
    with LOCK:
        now = monotonic()
        for token in list(REFERENCES):
            if now - REFERENCES[token]['created'] > 3600:
                del REFERENCES[token]
        for product in products:
            if not product.get('image'):
                continue
            if len(REFERENCES) >= 600:
                REFERENCES.pop(next(iter(REFERENCES)))
            token = token_urlsafe(24)
            REFERENCES[token] = {'url': product['image'], 'created': now}
            product['reference_image'] = '/api/clothing/image/' + token


def public_target(url):
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError('Invalid image URL')
    addresses = list(dict.fromkeys(info[4][0] for info in getaddrinfo(parsed.hostname, 443, type=SOCK_STREAM)))
    if not addresses or any(not ip_address(address).is_global for address in addresses):
        raise ValueError('Image must be hosted publicly')
    return parsed, addresses[0]


def download_image(url):
    # Pin the validated IP while retaining the hostname for certificate validation.
    for _ in range(4):
        parsed, address = public_target(url)
        context = create_default_context(cafile=certifi.where())
        connection = HTTPSConnection(parsed.hostname, timeout=10, context=context)
        raw = create_connection((address, 443), timeout=10)
        try:
            connection.sock = context.wrap_socket(raw, server_hostname=parsed.hostname)
            connection.request('GET', (parsed.path or '/') + ('?' + parsed.query if parsed.query else ''),
                               headers={'Accept': 'image/*', 'User-Agent': 'FittingRoom/1.0'})
            response = connection.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                url = urljoin(url, response.getheader('Location', ''))
                continue
            if response.status != 200:
                raise ValueError('Product image request failed')
            data = response.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise ValueError('Product image too large')
            return data
        finally:
            connection.close()
            raw.close()
    raise ValueError('Too many image redirects')


def get_image(token):
    with LOCK:
        entry = REFERENCES.get(token)
        if not entry or monotonic() - entry['created'] > 3600:
            raise ValueError('Product reference expired; search again')
        url = entry['url']
    try:
        with Image.open(BytesIO(download_image(url))) as image:
            if image.width * image.height > 20_000_000:
                raise ValueError('Product image dimensions too large')
            image = ImageOps.exif_transpose(image)
            image.thumbnail((1024, 1024))
            output = BytesIO()
            garment_reference(image).save(output, format='PNG')
            return output.getvalue()
    except (UnidentifiedImageError, Image.DecompressionBombError, HTTPException) as error:
        raise ValueError('Invalid product image') from error


def garment_reference(image):
    """Send only confidently segmented clothing, never the original model photo."""
    import numpy as np
    import cv2
    from .outfit_rating import clothing_mask
    rgb = np.array(image.convert('RGB'))
    mask = cv2.erode((clothing_mask(rgb) >= .8).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    if mask.sum() < 150 or mask.mean() < .01:
        raise ValueError('Could not isolate clothing from this product photo. Choose another product reference.')
    clean = np.full_like(rgb, 255)
    clean[mask] = rgb[mask]
    ys, xs = np.where(mask)
    return Image.fromarray(clean[ys.min():ys.max()+1, xs.min():xs.max()+1])
