const express = require("express");
const router = express.Router();
const { accounts } = require("../models/schema");

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const account = await accounts.findOne({ email: normalizedEmail });
    if (!account || account.password !== password) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const loggedIn = account.toObject();
    delete loggedIn.password;

    return res.status(200).json({ account: loggedIn });
  } catch (err) {
    return res.status(500).json({ error: "Failed to log in" });
  }
});

module.exports = router;
