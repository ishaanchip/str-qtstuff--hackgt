const express = require("express");
const router = express.Router();
const { getStripe, fulfillPaidSession } = require("./stripePacks");

router.post("/fulfill-tokens", async (req, res) => {
  try {
    const sessionId =
      typeof req.body.sessionId === "string" ? req.body.sessionId.trim() : "";

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const result = await fulfillPaidSession(session);

    if (!result.ok) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.status(200).json({
      account: result.account,
      tokens: result.tokens,
      alreadyFulfilled: result.alreadyFulfilled,
    });
  } catch (err) {
    if (err.message === "STRIPE_SECRET_KEY is not set") {
      return res.status(500).json({ error: "Stripe is not configured on the server" });
    }
    return res.status(500).json({ error: "Failed to confirm payment" });
  }
});

module.exports = router;
