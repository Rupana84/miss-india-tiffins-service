// src/lib/api.js
const BASE =
  (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || "")
    .replace(/\/+$/, "");

if (!BASE) console.warn("API base URL missing. Set VITE_API_URL in Vercel.");

async function request(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJSON = res.headers.get("content-type")?.includes("application/json");
  const data = isJSON ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    const msg = data?.error || `HTTP_${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export function getHealth() {
  return request("/health");
}
export function getMenu() {
  return request("/menu");
}
export function signup({ name, email, password }) {
  return request("/auth/signup", { method: "POST", body: { name, email, password } });
}
export function login({ email, password }) {
  return request("/auth/login", { method: "POST", body: { email, password } });
}
export function me(token) {
  return request("/me", { token });
}
export function createOrder({ token, items }) {
  return request("/orders", { method: "POST", body: { items }, token });
}

// Optional debug helper
export const __API_BASE__ = BASE;