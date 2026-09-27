const express = require("express");
const router = express.Router();
const { accounts } = require("../models/schema");

router.get("/account", async (req, res) => {
  try {
    const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const account = await accounts.findOne({ email }).select("-password");
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    return res.status(200).json({ account });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get account" });
  }
});

module.exports = router;
