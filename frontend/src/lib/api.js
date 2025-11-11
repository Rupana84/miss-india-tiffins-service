// frontend/src/lib/api.js
const base =
  (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || "")
    .replace(/\/$/, "") || "https://miss-india-tiffins-service-production.up.railway.app";

async function req(method, path, body, token) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error(`Bad JSON: ${text}`); }
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const health = () => req("GET", "/health");
export const signup = (p) => req("POST", "/auth/signup", p);
export const login  = (p) => req("POST", "/auth/login", p);
export const me     = (t) => req("GET",  "/me", null, t);