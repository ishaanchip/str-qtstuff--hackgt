const TOKEN_PACKS = {
  starter: { tokens: 1000, unitAmount: 999, name: "1,000 tokens" },
  plus: { tokens: 2800, unitAmount: 2499, name: "2,800 tokens" },
  pro: { tokens: 5000, unitAmount: 3999, name: "5,000 tokens" },
  mega: { tokens: 13500, unitAmount: 9999, name: "13,500 tokens" },
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return require("stripe")(key);
}

async function fulfillPaidSession(session) {
  const { accounts } = require("../models/schema");

  if (!session || session.payment_status !== "paid") {
    return { ok: false, error: "Payment is not complete", status: 400 };
  }

  const email =
    typeof session.metadata?.email === "string"
      ? session.metadata.email.trim().toLowerCase()
      : "";
  const packId = session.metadata?.packId;
  const tokensToAdd = TOKEN_PACKS[packId]?.tokens;

  if (!email || !tokensToAdd) {
    return { ok: false, error: "Checkout session is missing pack details", status: 400 };
  }

  const existing = await accounts.findOne({
    email,
    paid_sessions: session.id,
  });

  if (existing) {
    const safe = existing.toObject();
    delete safe.password;
    return { ok: true, alreadyFulfilled: true, account: safe, tokens: existing.tokens };
  }

  await accounts.updateOne(
    {
      email,
      $or: [{ tokens: { $exists: false } }, { tokens: null }],
    },
    { $set: { tokens: 5000 } }
  );

  const account = await accounts
    .findOneAndUpdate(
      { email, paid_sessions: { $ne: session.id } },
      {
        $inc: { tokens: tokensToAdd },
        $addToSet: { paid_sessions: session.id },
      },
      { new: true }
    )
    .select("-password");

  if (!account) {
    const current = await accounts.findOne({ email }).select("-password");
    if (!current) {
      return { ok: false, error: "Account not found", status: 404 };
    }
    return { ok: true, alreadyFulfilled: true, account: current, tokens: current.tokens };
  }

  return { ok: true, alreadyFulfilled: false, account, tokens: account.tokens };
}

module.exports = { TOKEN_PACKS, getStripe, fulfillPaidSession };
