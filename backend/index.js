// index.js — Miss India Tiffins Service (backend)
import express from "express";
import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5051;

// --- config ---
if (!process.env.JWT_SECRET) {
  console.warn("WARN: JWT_SECRET is not set. Set it in Railway variables.");
}
const RAW_ORIGIN = process.env.ORIGIN || "http://localhost:5173";
const ORIGINS = RAW_ORIGIN.split(",").map(s => s.trim()).filter(Boolean);

// --- middleware ---
app.use(express.json());

// CORS + preflight (Express 5 safe; no wildcards in route patterns)
app.use((req, res, next) => {
  const reqOrigin = req.headers.origin;
  const allowOrigin = ORIGINS.includes(reqOrigin) ? reqOrigin : ORIGINS[0];
  if (allowOrigin) res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// helpers
const sign = (u) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error("JWT secret missing");
    err.code = "NO_JWT_SECRET";
    throw err;
  }
  return jwt.sign({ id: u.id }, secret, { expiresIn: "1h" });
};

// --- health & root ---
app.get("/", (_req, res) => res.send("Miss India Tiffins Service API running. Try /health or /menu"));
app.get("/health", (_req, res) => res.json({ ok: true, service: "miss-india-tiffins" }));

// --- auth ---
// /auth/signup with proper Prisma error mapping
app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: "missing_fields" });

    // very basic email check to avoid obvious 400s
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "invalid_email" });
    }

    const hash = await bcrypt.hash(password, 10);
    const u = await prisma.user.create({ data: { name, email, password: hash } });
    return res.json({ access: sign(u) });
  } catch (e) {
    if (e.code === "P2002") return res.status(400).json({ error: "email_exists" });
    console.error("signup_error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// /auth/login with logging and clean 401
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "missing_fields" });

    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) return res.sendStatus(401);

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.sendStatus(401);

    return res.json({ access: sign(u) });
  } catch (e) {
    if (e.code === "NO_JWT_SECRET") return res.status(500).json({ error: "server_misconfig" });
    console.error("login_error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});
// --- menu ---
app.get("/menu", async (_req, res) => {
  const items = await prisma.menuItem.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" }
  });
  const view = items.map(i => ({
    id: i.id,
    name: i.name,
    description: i.description,
    isActive: i.isActive,
    priceCents: i.priceCents,
    price: (i.priceCents / 100).toFixed(2),
  }));
  res.json(view);
});

// keep open for demo; add auth/role later if needed
app.post("/menu", async (req, res) => {
  const { name, description = null, priceCents, isActive = true } = req.body || {};
  const cents = Number(priceCents);
  if (!name || !Number.isFinite(cents) || cents <= 0) {
    return res.status(400).json({ error: "invalid_menu_item" });
  }
  const m = await prisma.menuItem.create({ data: { name, description, priceCents: cents, isActive } });
  res.status(201).json(m);
});

// --- orders ---
app.post("/orders", auth(), async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: "no_items" });

    const ids = items.map(i => Number(i.menuItemId)).filter(Number.isFinite);
    if (!ids.length) return res.status(400).json({ error: "bad_items" });

    const db = await prisma.menuItem.findMany({ where: { id: { in: ids } } });
    if (!db.length) return res.status(400).json({ error: "bad_items" });

    const lines = items.map(i => {
      const mid = Number(i.menuItemId);
      const qty = Math.max(1, Number(i.qty ?? i.quantity ?? 1));
      const found = db.find(x => x.id === mid);
      if (!found) throw new Error("bad_item");
      return { menuItemId: found.id, quantity: qty };
    });

    const order = await prisma.order.create({
      data: { userId: req.user.id, items: { create: lines } },
      include: { items: { include: { menuItem: true } } },
    });

    res.status(201).json({ id: order.id, status: order.status, items: order.items });
  } catch {
    res.status(400).json({ error: "invalid_order" });
  }
});

app.get("/orders/:id", auth(), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad_order_id" });

  const o = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { menuItem: true } } },
  });
  if (!o || o.userId !== req.user.id) return res.sendStatus(404);
  res.json(o);
});

app.patch("/orders/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const allowed = new Set(["PENDING", "PAID", "CANCELLED"]);
  const status = String(req.body?.status || "").toUpperCase();

  if (!Number.isFinite(id) || !allowed.has(status)) {
    return res.status(400).json({ error: "invalid_status" });
  }
  const o = await prisma.order.update({ where: { id }, data: { status } });
  res.json(o);
});

// --- graceful shutdown ---
const server = app.listen(PORT, () =>
  console.log(`Miss India Tiffins Service API http://localhost:${PORT}`)
);

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});