import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
export const USER_EMAIL_KEY = "userEmail";
export const USER_EMAIL_EVENT = "user-email-changed";

function notifyUserEmailChanged() {
  window.dispatchEvent(new Event(USER_EMAIL_EVENT));
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function saveUserEmail(email) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!isValidEmail(normalized)) return;
  localStorage.setItem(USER_EMAIL_KEY, normalized);
  notifyUserEmailChanged();
}

export function getUserEmail() {
  const email = localStorage.getItem(USER_EMAIL_KEY);
  if (!email || !isValidEmail(email)) return null;
  return email;
}

export function clearUserEmail() {
  localStorage.removeItem(USER_EMAIL_KEY);
  notifyUserEmailChanged();
}

export function logoutUser() {
  clearUserEmail();
}

export function isLoggedIn() {
  return Boolean(getUserEmail());
}

export function getSignupValues({ firstName, lastName, gender, email, password, image }) {
  return {
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    gender,
    email: email.trim().toLowerCase(),
    password,
    ref_img: image,
  };
}

export function isSignupValid(values) {
  return Boolean(
    values.first_name &&
    values.last_name &&
    (values.gender === "male" || values.gender === "female") &&
    isValidEmail(values.email) &&
    values.password &&
    values.ref_img
  );
}

export async function checkAccount(email) {
  const { data } = await axios.get(`${API_BASE_URL}/check-account`, {
    params: { email },
  });
  return data;
}

export async function handleImageUpload(imgFile) {
  if (imgFile == null) return;

  if (typeof imgFile === "string" && /^https?:\/\//i.test(imgFile)) {
    return imgFile;
  }

  let file = imgFile;
  if (typeof imgFile === "string") {
    const response = await fetch(imgFile);
    const blob = await response.blob();
    file = new File([blob], "ref.jpg", { type: blob.type || "image/jpeg" });
  }

  const fileData = new FormData();
  fileData.append("file", file);
  fileData.append("upload_preset", "hackgt-clothing");
  const result = await axios.post(
    "https://api.cloudinary.com/v1_1/dsrfbwrcb/image/upload",
    fileData
  );
  return result.data.secure_url.toString();
}

export async function createAccount({
  first_name,
  last_name,
  email,
  password,
  ref_img,
  gender,
}) {
  const imageUrl = await handleImageUpload(ref_img);
  if (!imageUrl) {
    throw new Error("Could not upload the image. Try taking the photo again.");
  }

  const { data } = await axios.post(`${API_BASE_URL}/create-account`, {
    first_name,
    last_name,
    email,
    password,
    ref_img: imageUrl,
    gender,
  });

  return data;
}

export async function getAccount(email) {
  const { data } = await axios.get(`${API_BASE_URL}/account`, {
    params: { email },
  });
  return data;
}

export async function updateAccountImage({ email, ref_img }) {
  const imageUrl = await handleImageUpload(ref_img);
  if (!imageUrl) {
    throw new Error("Could not upload the image. Try taking the photo again.");
  }

  const { data } = await axios.put(`${API_BASE_URL}/account/image`, {
    email,
    ref_img: imageUrl,
  });
  return data;
}

export async function loginAccount({ email, password }) {
  const { data } = await axios.post(`${API_BASE_URL}/login`, {
    email,
    password,
  });

  return data;
}
