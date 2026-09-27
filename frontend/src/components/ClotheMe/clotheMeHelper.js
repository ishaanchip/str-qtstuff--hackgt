import axios from "axios";
import { notifyTokensChanged } from "../Home/homeHelper";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function formatPrice(price) {
  if (price == null || price === "") return "";
  if (typeof price === "object") {
    const amount = price.price ?? price.amount ?? price.value;
    if (amount == null) return "";
    return formatPrice(amount);
  }
  const amount = Number(price);
  if (Number.isFinite(amount)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
  return String(price);
}

export function getBestColors(palette) {
  const groups = palette?.color_groups || {};
  const fromGroups = [
    ...(groups.strongest_matches || []),
    ...(groups.good_matches || []),
  ].filter((color) => color?.hex && color?.name);

  if (fromGroups.length) return fromGroups;

  return (palette?.recommended_colors || [])
    .filter((color) => color?.hex && color?.name)
    .slice(0, 16);
}

export async function searchClothes({ colors, amountOfClothes = 3, gender = "male" }) {
  const { data } = await axios.post(
    `${API_BASE_URL}/clothes-search`,
    { colors, amountOfClothes, gender },
    { timeout: 90000 }
  );
  return {
    tops: data.tops || [],
    bottoms: data.bottoms || [],
    accessories: data.accessories || [],
  };
}

export async function tryOn(email, garments = []) {
  const { data } = await axios.post(
    `${API_BASE_URL}/try-on`,
    { email, garments },
    { timeout: 60000 }
  );
  notifyTokensChanged(data.tokens ?? data.account?.tokens);
  return data;
}
