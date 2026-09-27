const express = require("express");
const router = express.Router();
const { accounts } = require("../models/schema");

router.post("/create-account", async (req, res) => {
  try {
    const { first_name, last_name, email, password, ref_img, gender } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!first_name || !normalizedEmail || !password || !ref_img || !gender) {
      return res.status(400).json({
        error: "first_name, email, password, ref_img, and gender are required",
      });
    }

    const existingAccount = await accounts.exists({ email: normalizedEmail });
    if (existingAccount) {
      return res.status(409).json({
        error: "Account was not created. An account with this email already exists.",
        exists: true,
      });
    }

    const account = await accounts.create({
      first_name,
      last_name,
      email: normalizedEmail,
      password,
      ref_img,
      gender,
    });

    const created = account.toObject();
    delete created.password;

    return res.status(201).json({ account: created });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      if (field === "email") {
        return res.status(409).json({
          error: "Account was not created. An account with this email already exists.",
          exists: true,
        });
      }
      return res.status(409).json({ error: `${field} already exists` });
    }

    return res.status(500).json({ error: "Failed to create account" });
  }
});

module.exports = router;
