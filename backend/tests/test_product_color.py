from io import BytesIO
from PIL import Image, ImageDraw
from clothes_scraping.color_match import measure_match, verify_product


def photo(color, background=(0, 0, 0, 0), accent=None):
    image = Image.new('RGBA', (100, 100), background)
    draw = ImageDraw.Draw(image)
    draw.rectangle((20, 10, 80, 90), fill=color)
    if accent:
        draw.rectangle((40, 40, 50, 50), fill=accent)
    output = BytesIO(); image.save(output, 'PNG')
    return output.getvalue()


def test_matching_garment_passes_transparent_and_uniform_backgrounds():
    for background in ((0,0,0,0), 'white'):
        result = measure_match(photo('#008080', background), '#008080')
        assert result['distance_delta_e76'] < 1
        assert result['matching_foreground_fraction'] > .95


def test_wrong_color_and_small_matching_logo_are_rejected():
    assert measure_match(photo('#FF0000'), '#008080') is None
    assert measure_match(photo('#FF0000', accent='#008080'), '#008080') is None


def test_matching_background_does_not_qualify_wrong_garment():
    assert measure_match(photo('#FF0000', '#008080'), '#008080') is None


def test_unknown_flat_photo_missing_and_invalid_images_are_rejected(monkeypatch):
    assert measure_match(photo('white','white'), '#FFFFFF') is None
    assert verify_product({'image':None,'palette_hex':'#008080'}) is None
    monkeypatch.setattr('clothes_scraping.color_match.download_image', lambda url:b'bad')
    assert verify_product({'image':'https://example.com/p','palette_hex':'#008080'}) is None


def test_similar_shade_is_distinguished_from_exact_match():
    exact = measure_match(photo('#008080'), '#008080')
    near = measure_match(photo('#108888'), '#008080')
    assert near is not None
    assert exact['distance_delta_e76'] < near['distance_delta_e76']
