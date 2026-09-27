# Palette-based clothing search

Add your Channel3 API key to **`web/.env.local`**:

```dotenv
CHANNEL3_API_KEY=your_channel3_api_key
```

Obtain a key from https://www.trychannel3.com/ . An exported `CHANNEL3_API_KEY`
variable takes precedence over the file. The Python server reads the file when a
search runs; saving the key and clicking **Retry clothing search** is sufficient.
Do not add the key to browser JavaScript or prefix it with `VITE_`.
`web/.env.example` lists the supported server credentials. `.env.local` is ignored
by Git and is not served by the local web server.

Install dependencies and start from the repository root:

```sh
python -m pip install -r backend/requirements.txt
python -m backend.app.api --port 5173
```

After a face scan, the fitting room automatically searches the top three unique
palette HEX colors through `POST /api/clothing/search`. Changing the shopping
category performs another search; successful results are cached server-side for
10 minutes. Each uncached search uses up to three Channel3 searches, so provider
usage applies. Only color codes and clothing search criteria go to Channel3, not
portraits or facial measurements.

The scraper's `getClothesInfo` now accepts a list of `{name, hex, score}` records
and returns `{products, partial, note}`. Imports do not create clients or run test
searches. Search iteration is bounded to eight products per color, deduplicates
product IDs, and returns at most 18 products. SDK 4.1.0 is pinned and tested with
its real models and a mocked HTTP transport.

## Matching and links

Channel3's color filter treats multiple colors as AND, so each top color receives
its own query with `match: standard`. Results are provider color matches, not
independently measured garment colors; the UI says **Searched for** and does not
pretend that the palette score is a garment match score.

`BRAND_DOMAINS` in `clothes_scraper.py` controls the brand stores searched (Nike,
Adidas, Uniqlo, Gap, J.Crew, Everlane, Patagonia, H&M, Zara, Abercrombie). Returned
offers must belong to one of these stores. Out-of-stock and used offers are
excluded. Shopping cards use the actual returned product URL; links may route
through Channel3 attribution before opening the brand product page. No product
links or inventory are invented. Empty and failed searches show retry guidance.

Shopping results and illustrative suggestions are shown separately; both can be
added to the same outfit slots.

Provider references:
- https://docs.trychannel3.com/guides/offer
- https://docs.trychannel3.com/guides/product

## Occasions and product try-on

The optional occasion field accepts up to 300 characters (for example, “outdoor
wedding, smart casual”). Submit **Find clothes** to search again. Occasion text
is included in Channel3's query while HEX, store and category filters remain in
place. It is semantic search guidance, not a guaranteed dress-code classifier.
Changing category keeps the occasion; clearing the field removes that guidance.
Cache keys include the occasion. The text is sent to Channel3 and included in the
try-on prompt when Try is clicked.

Shopping cards with reference photos now have **Add to outfit**. Store products
share the existing shirt/layer, pants and accessory slots. Their actual photos
are composed into one labeled reference board for Lucy, alongside text describing
any selected illustrative pieces. Only clicking **Try** starts the camera and
sends the reference board to Decart. Matching remains an AI-generated preview,
not a guarantee of exact fit or product reproduction.

Reference images are fetched through opaque, server-registered URLs to avoid
cross-origin canvas failures. The server only fetches images returned by the
provider, checks public HTTPS destinations at each redirect, pins validated IPs,
limits downloads to 8 MB and decoded images to 20 million pixels, and converts
them to PNG. References expire after one hour. Missing or expired photos produce
an error rather than silently replacing the selected product with a generic item.

## Palette and category filters

The fitting room now shows only real shopping results, with no illustrative
clothing grid or automatically selected demo outfit. Every palette swatch is a
keyboard-accessible color filter. Clicking a swatch searches its single HEX code;
**All palette colors** restores the top-three-color search. Selected outfit pieces
remain in place across filter changes.

**Find → All** searches all four categories concurrently and interleaves their
results, keeping category metadata for correct outfit slots. This uses up to
12 provider searches for three colors, or four for a single selected color;
single-category searches use up to three, or one for a selected color. Occasion,
category and palette filters compose and are included in the search cache key.

## Product photo color screening

Search now uses the SDK's `strict` color mode and names the target color/HEX in
its query. Before returning a card, the server checks that same displayed photo:
transparent pixels are excluded; opaque photos are accepted only when the border
provides a near-uniform removable background. Unclear or unavailable photos are
omitted. At least 60% of the estimated foreground must be within Delta E 76 of 22,
and its median must be within 18 of the target, with additional hue/chroma checks.
These thresholds are conservative engineering heuristics, not calibrated color
accuracy. Shadows, people, mixed garments and white-on-white photos can cause
false rejections; this is not a garment segmentation model.

Accepted items include `photo_color_match` diagnostics and sort by increasing
color distance. The swatch remains the requested color; measured photo HEX is
shown separately. No color verification is inferred from the palette score.
Verification fetches up to eight photos per color/category using bounded thread
pools. Empty results are reported rather than padded with unchecked items.
