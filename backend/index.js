// index.js — Miss India Tiffins Service (backend)
import express from "express";
import cors from "cors";
import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5051;

// ---- CORS ----
const RAW_ORIGIN = process.env.ORIGIN || "http://localhost:5173";
const ORIGINS = RAW_ORIGIN.split(",").map(s => s.trim()).filter(Boolean);

// Allow browser origins in list. Allow Postman/no-origin.
const corsOpts = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    return ORIGINS.includes(origin) ? cb(null, true) : cb(new Error("CORS"));
  },
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOpts));
app.use(express.json());

// ---- helpers ----
const sign = (u) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error("JWT secret missing");
    err.code = "NO_JWT_SECRET";
    throw err;
  }
  return jwt.sign({ id: u.id }, secret, { expiresIn: "1h" });
};

const requireAuth = (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id };
    next();
  } catch {
    res.sendStatus(401);
  }
};
// Backward-compat alias if your code still calls auth()
const auth = () => requireAuth;

// ---- health & root ----
app.get("/", (_req, res) =>
  res.send("Miss India Tiffins Service API running. Try /health or /menu")
);
app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "miss-india-tiffins" })
);

// ---- auth ----
app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: "missing_fields" });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "invalid_email" });
    }
    const hash = await bcrypt.hash(password, 10);
    const u = await prisma.user.create({ data: { name, email, password: hash } });
    res.json({ access: sign(u) });
  } catch (e) {
    if (e.code === "P2002") return res.status(400).json({ error: "email_exists" });
    console.error("signup_error:", e);
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "missing_fields" });

    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) return res.sendStatus(401);

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.sendStatus(401);

    res.json({ access: sign(u) });
  } catch (e) {
    if (e.code === "NO_JWT_SECRET") return res.status(500).json({ error: "server_misconfig" });
    console.error("login_error:", e);
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/me", requireAuth, async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  res.json(u);
});

// ---- menu ----
app.get("/menu", async (_req, res) => {
  const items = await prisma.menuItem.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  res.json(
    items.map(i => ({
      id: i.id,
      name: i.name,
      description: i.description,
      isActive: i.isActive,
      priceCents: i.priceCents,
      price: (i.priceCents / 100).toFixed(2),
    }))
  );
});

app.post("/menu", async (req, res) => {
  const { name, description = null, priceCents, isActive = true } = req.body || {};
  const cents = Number(priceCents);
  if (!name || !Number.isFinite(cents) || cents <= 0) {
    return res.status(400).json({ error: "invalid_menu_item" });
  }
  const m = await prisma.menuItem.create({ data: { name, description, priceCents: cents, isActive } });
  res.status(201).json(m);
});

// ---- orders ----
app.post("/orders", requireAuth, async (req, res) => {
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
  } catch (e) {
    console.error("order_error:", e);
    res.status(400).json({ error: "invalid_order" });
  }
});

app.get("/orders/:id", requireAuth, async (req, res) => {
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

// ---- start/stop ----
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