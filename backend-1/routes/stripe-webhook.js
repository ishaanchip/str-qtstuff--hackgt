const { getStripe, fulfillPaidSession } = require("./stripePacks");

async function stripeWebhook(req, res) {
  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(400).json({ error: "STRIPE_WEBHOOK_SECRET is not set" });
  }

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const result = await fulfillPaidSession(event.data.object);
      if (!result.ok && result.status !== 404) {
        return res.status(result.status || 400).json({ error: result.error });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(400).json({ error: "Invalid Stripe webhook" });
  }
}

module.exports = stripeWebhook;
