const express = require("express");
const router = express.Router();
const { accounts } = require("../models/schema");
const { TOKEN_PACKS, getStripe } = require("./stripePacks");

router.post("/buy-tokens", async (req, res) => {
  try {
    const normalizedEmail =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const packId = typeof req.body.packId === "string" ? req.body.packId : "";
    const pack = TOKEN_PACKS[packId];

    if (!normalizedEmail) {
      return res.status(400).json({ error: "email is required" });
    }

    if (!pack) {
      return res.status(400).json({ error: "Invalid token pack" });
    }

    const account = await accounts.findOne({ email: normalizedEmail }).select("_id");
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    const origin = process.env.ORIGIN || "http://localhost:5173";
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: normalizedEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pack.unitAmount,
            product_data: {
              name: pack.name,
              description: `${pack.tokens.toLocaleString()} tokens for grwm`,
            },
          },
        },
      ],
      success_url: `${origin}/token-market?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/token-market?canceled=1`,
      metadata: {
        email: normalizedEmail,
        packId,
        tokens: String(pack.tokens),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    if (err.message === "STRIPE_SECRET_KEY is not set") {
      return res.status(500).json({ error: "Stripe is not configured on the server" });
    }
    return res.status(500).json({ error: "Failed to start checkout" });
  }
});

module.exports = router;
