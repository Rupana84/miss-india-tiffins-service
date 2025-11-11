// index.js — Miss India Tiffins Service (backend, ESM)
import express from "express";
import cors from "cors";
import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

// ---- config ----
const PORT = process.env.PORT || 5051;
const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  console.warn("WARN: JWT_SECRET is not set. Set it in Railway variables.");
}
const ORIGINS = (process.env.ORIGIN || "http://localhost:5173")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// ---- app & db ----
const app = express();
const prisma = new PrismaClient();

// ---- middleware ----
app.use(express.json());
app.use(
  cors({
    origin: ORIGINS,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    optionsSuccessStatus: 204,
  })
);

// ---- helpers ----
const signJwt = (user) =>
  jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });

const auth = () => (req, res, next) => {
  try {
    const raw = req.headers.authorization || "";
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
    if (!token) return res.sendStatus(401);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.sendStatus(401);
  }
};

const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").toLowerCase());

// ---- health & root ----
app.get("/", (_req, res) =>
  res.send("Miss India Tiffins Service API. Try /health")
);
app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "miss-india-tiffins" })
);

// ---- auth ----
app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ error: "invalid_email" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "weak_password" });
    }

    const hash = await bcrypt.hash(password, 10);
    const u = await prisma.user.create({
      data: { name, email, password: hash },
      select: { id: true },
    });
    return res.json({ access: signJwt(u) });
  } catch (e) {
    // Prisma unique constraint
    if (e?.code === "P2002") {
      return res.status(400).json({ error: "email_exists" });
    }
    return res.status(500).json({ error: "signup_failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) return res.sendStatus(401);
    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.sendStatus(401);
    return res.json({ access: signJwt(u) });
  } catch {
    return res.status(500).json({ error: "login_failed" });
  }
});

app.get("/me", auth(), async (req, res) => {
  const me = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  if (!me) return res.sendStatus(404);
  res.json(me);
});

// ---- menu ----
app.get("/menu", async (_req, res) => {
  const items = await prisma.menuItem.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
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

app.post("/menu", async (req, res) => {
  const { name, description = null, priceCents, isActive = true } = req.body || {};
  const cents = Number(priceCents);
  if (!name || !Number.isFinite(cents) || cents <= 0) {
    return res.status(400).json({ error: "invalid_menu_item" });
  }
  const m = await prisma.menuItem.create({
    data: { name, description, priceCents: cents, isActive },
  });
  res.status(201).json(m);
});

// ---- orders ----
app.post("/orders", auth(), async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: "no_items" });

    const ids = items.map(i => Number(i.menuItemId)).filter(Number.isFinite);
    if (!ids.length) return res.status(400).json({ error: "bad_items" });

    const dbItems = await prisma.menuItem.findMany({ where: { id: { in: ids } } });
    if (!dbItems.length) return res.status(400).json({ error: "bad_items" });

    const lines = items.map(i => {
      const mid = Number(i.menuItemId);
      const qty = Math.max(1, Number(i.qty ?? i.quantity ?? 1));
      const found = dbItems.find(x => x.id === mid);
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

// ---- start & shutdown ----
const server = app.listen(PORT, () =>
  console.log(`API listening on :${PORT}`)
);
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});