// index.js — Miss India Tiffins Service (backend)
import express from "express";
import cors from "cors";
import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

// ---- env + CORS ----
if (!process.env.JWT_SECRET) {
  console.warn("WARN: JWT_SECRET is not set. Set it in Railway variables.");
}
const RAW_ORIGIN = process.env.ORIGIN || "http://localhost:5173";
const ORIGINS = RAW_ORIGIN.split(",").map(s => s.trim()).filter(Boolean);

const corsOpts = {
  origin: ORIGINS,
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ---- app + db ----
const app = express();                 // define app BEFORE using it
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5051;

app.use(cors(corsOpts));
app.options("/(.*)", cors(corsOpts));  // Express 5 safe wildcard
app.use(express.json());

// ---- helpers ----
const sign = (u) => jwt.sign({ id: u.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
const auth = () => (req, res, next) => {
  try {
    const t = (req.headers.authorization || "").replace("Bearer ", "");
    req.user = jwt.verify(t, process.env.JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
};

// ---- health & root ----
app.get("/", (_req, res) => res.send("Miss India Tiffins Service API running. Try /health or /menu"));
app.get("/health", (_req, res) => res.json({ ok: true, service: "miss-india-tiffins" }));

// ---- auth ----
app.post("/auth/signup", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "missing_fields" });
  const hash = await bcrypt.hash(password, 10);
  try {
    const u = await prisma.user.create({ data: { name, email, password: hash } });
    res.json({ access: sign(u) });
  } catch {
    res.status(400).json({ error: "email_exists_or_invalid" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "missing_fields" });
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u || !(await bcrypt.compare(password, u.password))) return res.sendStatus(401);
  res.json({ access: sign(u) });
});

app.get("/me", auth(), async (req, res) => {
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
app.post("/orders", auth(), async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: "no_items" });

    const ids = items.map(i => Number(i.menuItemId)).filter(Number.isFinite);
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

// ---- start + shutdown ----
const server = app.listen(PORT, () =>
  console.log(`Miss India Tiffins Service API http://localhost:${PORT}`)
);
process.on("SIGINT", async () => { await prisma.$disconnect(); server.close(() => process.exit(0)); });
process.on("SIGTERM", async () => { await prisma.$disconnect(); server.close(() => process.exit(0)); });