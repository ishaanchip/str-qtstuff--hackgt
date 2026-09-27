const axios = require("axios");

const MODEL_API_URL = process.env.MODEL_API_URL || "http://127.0.0.1:8000";

function imageContentType(header) {
  const type = String(header || "").split(";")[0].trim().toLowerCase();
  return type === "image/png" ? "image/png" : "image/jpeg";
}

async function analyzePortraitFromUrl(imageUrl) {
  if (typeof imageUrl !== "string" || !/^https?:\/\//i.test(imageUrl)) {
    throw new Error("ref_img must be an http image URL");
  }

  const image = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 20000,
    maxContentLength: 10 * 1024 * 1024,
  });

  const { data } = await axios.post(`${MODEL_API_URL}/api/analyze`, image.data, {
    headers: {
      "Content-Type": imageContentType(image.headers["content-type"]),
    },
    timeout: 90000,
    maxBodyLength: 10 * 1024 * 1024,
  });

  return data;
}

module.exports = { analyzePortraitFromUrl };
