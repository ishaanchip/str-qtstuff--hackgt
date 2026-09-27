const express = require("express");
const router = express.Router();
const { accounts } = require("../models/schema");

router.put("/account/image", async (req, res) => {
  try {
    const { email, ref_img } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !ref_img) {
      return res.status(400).json({ error: "email and ref_img are required" });
    }

    const account = await accounts.findOneAndUpdate(
      { email: normalizedEmail },
      { $set: { ref_img } },
      { new: true }
    ).select("-password");

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    return res.status(200).json({ account });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update image" });
  }
});

module.exports = router;
