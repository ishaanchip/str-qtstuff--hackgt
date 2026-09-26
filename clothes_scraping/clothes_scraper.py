from channel3_sdk import Channel3

client = Channel3()


def getClothesInfo(colors, amount_of_clothes):

    query = f"""
    Find men's shirts only that prominently feature these colors:
    {", ".join(colors)}. Make sure that the pictures feature only a singular shirt, no person in the picture and no items that aren't shirts.
    """

    results = client.products.search(
        query=query,
        config={"mode": "agentic"},
    )

    clothes = []

    for i, product in enumerate(results):

        if i >= amount_of_clothes:
            break

        # Get main image
        image_url = None

        for image in product.images:
            if image.is_main_image:
                image_url = image.cleaned_url or image.url
                break

        # Get first offer
        offer = product.offers[0] if product.offers else None

        price = None
        affiliate_url = None

        if offer:
            price = offer.price.price if offer.price else None
            affiliate_url = offer.url

        clothes.append({
            "image": image_url,
            "price": price,
            "affiliate": affiliate_url
        })

    return clothes


# TEST
colors = ["turqoise"]

clothes = getClothesInfo(colors, 3)

print("RESULTS:")

for i, clothing in enumerate(clothes, 1):
    print(f"\n--- Clothing {i} ---")
    print("Image:", clothing["image"])
    print("Price:", clothing["price"])
    print("Affiliate:", clothing["affiliate"])