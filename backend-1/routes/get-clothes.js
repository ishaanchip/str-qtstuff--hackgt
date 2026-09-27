const express = require("express");
const { Channel3 } = require("@channel3/sdk");
const router = express.Router();

const CATEGORY_QUERIES = {
  tops: {
    items: "shirts, polos, and sweaters",
    singular: "top",
  },
  bottoms: {
    items: "shorts, pants, and jeans",
    singular: "bottom",
  },
  accessories: {
    items: "watches, bracelets, and necklaces",
    singular: "accessory",
  },
};

function getClient() {
  const apiKey = process.env.CHANNEL3_API_KEY;
  return apiKey ? new Channel3({ apiKey }) : new Channel3();
}

async function getClothesInfo(colors, amountOfClothes, gender, category) {
  const audience = gender === "female" ? "women's" : "men's";
  const { items, singular } = CATEGORY_QUERIES[category];
  const query = `
        Find ${audience} ${items} only that prominently feature these colors:
        ${colors.join(", ")}.
        No models/persons in the picture and no items that aren't ${items}.
        Make sure that the pictures feature only a singular ${singular}.
    `;

  const client = getClient();
  const results = await client.products.search({
    query,
    limit: amountOfClothes,
    config: { mode: "agentic" },
  });

  const products = Array.isArray(results) ? results : results?.data || [];
  const clothes = [];
  let i = 0;

  for (const product of products) {
    if (i >= amountOfClothes) {
      break;
    }

    let imageUrl = null;
    for (const image of product.images || []) {
      if (image.is_main_image) {
        imageUrl = image.cleaned_url || image.url;
        break;
      }
    }

    const offer =
      product.offers && product.offers.length > 0 ? product.offers[0] : null;

    let price = null;
    let affiliateUrl = null;

    if (offer) {
      price = offer.price ? offer.price.price : null;
      affiliateUrl = offer.url;
    }

    clothes.push({
      name: product.title || "Item",
      image: imageUrl,
      price,
      affiliate: affiliateUrl,
    });

    i++;
  }

  return clothes;
}

router.post("/clothes-search", async (req, res) => {
  try {
    const colors = Array.isArray(req.body.colors)
      ? req.body.colors.filter((color) => typeof color === "string" && color.trim())
      : [];
    const amountOfClothes = Math.max(1, Math.min(Math.floor(Number(req.body.amountOfClothes)) || 10, 10));
    const gender = req.body.gender === "female" ? "female" : "male";

    if (!colors.length) {
      return res.status(400).json({ error: "colors are required" });
    }

    if (!process.env.CHANNEL3_API_KEY) {
      return res.status(503).json({
        error: "CHANNEL3_API_KEY is not set on the server yet.",
      });
    }

    const results = await Promise.allSettled(
      ["tops", "bottoms", "accessories"].map((category) =>
        getClothesInfo(colors, amountOfClothes, gender, category)
      )
    );
    if (results.every((result) => result.status === "rejected")) {
      return res.status(502).json({
        error: "Clothes search is temporarily unavailable. Please try again.",
      });
    }
    const [tops, bottoms, accessories] = results.map((result) =>
      result.status === "fulfilled" ? result.value : []
    );

    return res.status(200).json({ tops, bottoms, accessories });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Failed to search clothes",
    });
  }
});

module.exports = router;
