import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const TOKEN_PACKS = [
  { id: "starter", tokens: 1000, price: "9.99", bonus: null, stack: 1 },
  { id: "plus", tokens: 2800, price: "24.99", bonus: 12, stack: 2 },
  { id: "pro", tokens: 5000, price: "39.99", bonus: 25, stack: 3 },
  { id: "mega", tokens: 13500, price: "99.99", bonus: 35, stack: 4 },
];

export async function createCheckoutSession(email, packId) {
  const { data } = await axios.post(`${API_BASE_URL}/buy-tokens`, { email, packId });
  return data;
}

export async function fulfillCheckout(sessionId) {
  const { data } = await axios.post(`${API_BASE_URL}/fulfill-tokens`, { sessionId });
  return data;
}
