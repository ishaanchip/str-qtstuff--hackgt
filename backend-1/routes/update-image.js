const express = require("express");
const router = express.Router();
const { accounts } = require("../models/schema");
const { analyzePortraitFromUrl } = require("./analyze-portrait");

router.put("/account/image", async (req, res) => {
  try {
    const { email, ref_img } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !ref_img) {
      return res.status(400).json({ error: "email and ref_img are required" });
    }

    let color_palette;
    try {
      color_palette = await analyzePortraitFromUrl(ref_img);
    } catch (err) {
      return res.status(502).json({
        error:
          err.response?.data?.error ||
          "Could not rebuild the color palette from this photo. Keep your face clear and try again.",
      });
    }

    const account = await accounts.findOneAndUpdate(
      { email: normalizedEmail },
      { $set: { ref_img, color_palette } },
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
