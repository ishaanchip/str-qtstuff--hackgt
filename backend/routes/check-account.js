const express = require("express");
const router = express.Router();
const { accounts } = require("../models/schema");

router.get("/check-account", async (req, res) => {
  try {
    const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const account = await accounts.exists({ email });

    return res.status(200).json({
      email,
      exists: Boolean(account),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to check account" });
  }
});

module.exports = router;
