const express = require("express");
const axios = require("axios");
const router = express.Router();
const { accounts } = require("../models/schema");

const TRY_ON_COST = 1000;
const CATEGORY_ORDER = ["tops", "bottoms", "accessories"];

function normalizeGarments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      name: typeof item?.name === "string" ? item.name.trim() : "",
      image: typeof item?.image === "string" ? item.image.trim() : "",
      category: CATEGORY_ORDER.includes(item?.category) ? item.category : "",
    }))
    .filter((item) => item.name || item.image);
}

function buildPrompt(garments) {
  const byCategory = { tops: [], bottoms: [], accessories: [] };
  garments.forEach((item) => {
    if (byCategory[item.category] && item.name) {
      byCategory[item.category].push(item.name);
    }
  });

  const parts = [];
  if (byCategory.tops[0]) {
    parts.push(`change the person's top to ${byCategory.tops[0]}`);
  }
  if (byCategory.bottoms[0]) {
    parts.push(`change the person's bottoms to ${byCategory.bottoms[0]}`);
  }
  if (byCategory.accessories[0]) {
    parts.push(`add ${byCategory.accessories[0]} as an accessory`);
  }

  const fallback = garments
    .map((item) => item.name)
    .filter(Boolean)
    .join(", ");

  const outfit = parts.length
    ? parts.join(", ")
    : `dress the person in ${fallback || "the attached clothing"}`;

  return `Dress the person in the selected outfit: ${outfit}. Use the attached clothing image as the visual reference for the garments. Keep the same face, body, identity, and camera pose.`;
}

async function createDecartToken() {
  const origin = (process.env.ORIGIN || "http://localhost:5173").replace(/\/$/, "");
  const response = await fetch("https://api.decart.ai/v1/client/tokens", {
    method: "POST",
    headers: {
      "x-api-key": process.env.DECART_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expiresIn: 300,
      allowedModels: ["lucy-2.5"],
      allowedOrigins: [origin],
      constraints: { realtime: { maxSessionDuration: 180 } },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Could not create Decart session");
  }

  return {
    apiKey: payload.apiKey || payload.api_key,
    expiresAt: payload.expiresAt || payload.expires_at,
  };
}

async function fetchReferenceImage(garments) {
  const ranked = [...garments].sort((a, b) => {
    const aRank = CATEGORY_ORDER.indexOf(a.category);
    const bRank = CATEGORY_ORDER.indexOf(b.category);
    return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
  });

  for (const item of ranked) {
    if (!item.image) continue;
    try {
      const { data, headers } = await axios.get(item.image, {
        responseType: "arraybuffer",
        timeout: 15000,
      });
      const mime = headers["content-type"] || "image/jpeg";
      return `data:${mime};base64,${Buffer.from(data).toString("base64")}`;
    } catch (err) {
      console.log(`try-on reference image failed: ${err.message}`);
    }
  }

  return null;
}

router.post("/try-on", async (req, res) => {
  try {
    const normalizedEmail =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const garments = normalizeGarments(req.body.garments);

    if (!normalizedEmail) {
      return res.status(400).json({ error: "email is required" });
    }

    if (!garments.length) {
      return res.status(400).json({ error: "Add a top, bottom, or accessory first." });
    }

    if (!process.env.DECART_API_KEY) {
      return res.status(503).json({
        error: "DECART_API_KEY is not set on the server yet.",
      });
    }

    const token = await createDecartToken();
    if (!token.apiKey) {
      return res.status(502).json({ error: "Could not start live try-on." });
    }

    await accounts.updateOne(
      {
        email: normalizedEmail,
        $or: [{ tokens: { $exists: false } }, { tokens: null }],
      },
      { $set: { tokens: 5000 } }
    );

    const account = await accounts
      .findOneAndUpdate(
        { email: normalizedEmail, tokens: { $gte: TRY_ON_COST } },
        { $inc: { tokens: -TRY_ON_COST } },
        { new: true }
      )
      .select("-password");

    if (!account) {
      const existing = await accounts.findOne({ email: normalizedEmail }).select("tokens");
      if (!existing) {
        return res.status(404).json({ error: "Account not found" });
      }

      return res.status(400).json({
        error: "Not enough tokens to try on",
        tokens: existing.tokens ?? 0,
      });
    }

    const referenceImage = await fetchReferenceImage(garments);

    return res.status(200).json({
      account,
      tokens: account.tokens,
      apiKey: token.apiKey,
      expiresAt: token.expiresAt,
      prompt: buildPrompt(garments),
      referenceImage,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to try on" });
  }
});

module.exports = router;
