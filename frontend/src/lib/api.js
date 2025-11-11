// src/lib/api.js
const viteBase =
  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL;
const nextBase = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined;

export const API_BASE =
  (viteBase && String(viteBase).trim().replace(/\/+$/, "")) ||
  (nextBase && String(nextBase).trim().replace(/\/+$/, "")) ||
  "";

if (!API_BASE) {
  console.error("API base missing. Set VITE_API_URL or NEXT_PUBLIC_API_URL.");
}

async function http(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const text = await res.text();
  let data: any = undefined;
  try { data = text ? JSON.parse(text) : undefined; } catch {}
  if (!res.ok) {
    const err = (data && (data.error || data.message)) || res.statusText || "request_failed";
    throw new Error(String(err));
  }
  return data;
}

export function signup(payload: { name: string; email: string; password: string }) {
  return http("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload: { email: string; password: string }) {
  return http("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function me(token: string) {
  return http("/me", { headers: { Authorization: `Bearer ${token}` } });
}