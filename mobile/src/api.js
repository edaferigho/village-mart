/**
 * Village Mart mobile — API client.
 *
 * Talks to the SAME backend endpoints as the website (the Next.js app
 * deployed on Vercel): /api/products, /api/categories, /api/cart,
 * /api/orders, /api/orders/mine, /api/auth/pair/claim.
 *
 * Identity is attached to every request:
 *   • Authorization: Bearer <session token>  when signed in, and
 *   • x-device-id: <uuid>                    always (guest carts).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://village-mart-black.vercel.app";

const TOKEN_KEY = "vm_session_token";
const DEVICE_KEY = "vm_device_id";

/** Stable random id for this device (drives guest cart ownership). */
export async function getDeviceId() {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = "mob-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

/** fetch wrapper: attaches identity headers and parses JSON errors. */
export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  headers["x-device-id"] = await getDeviceId();

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error ?? `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}
