// frontend/src/lib/api.js
const BASE =
  import.meta.env?.VITE_API_URL ||
  (typeof window !== "undefined" && window.__API_URL__) ||
  "http://localhost:5051";

const request = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    ...opts,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
};

export const signup = ({ name, email, password }) =>
  request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const login = ({ email, password }) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const me = (token) =>
  request("/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

export const menu = () => request("/menu");