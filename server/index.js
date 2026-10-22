import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { db, transaction } from './db.js';
import { seedIfEmpty } from './seed.js';

seedIfEmpty();

const app = express();
app.use(express.json());

const listDishes = db.prepare(
  'SELECT id, name, price_cents, color, description FROM dishes WHERE active = 1 ORDER BY sort, id'
);
const getDish = db.prepare('SELECT id, price_cents FROM dishes WHERE id = ? AND active = 1');
const insertOrder = db.prepare('INSERT INTO orders (total_cents) VALUES (?)');
const insertItem = db.prepare(
  'INSERT INTO order_items (order_id, dish_id, qty, price_cents) VALUES (?, ?, ?, ?)'
);
const dayTotals = db.prepare(
  'SELECT COUNT(*) AS ordersCount, COALESCE(SUM(total_cents), 0) AS totalCents FROM orders WHERE business_date = ?'
);
const daySales = db.prepare(`
  SELECT d.name, SUM(oi.qty) AS qty, SUM(oi.qty * oi.price_cents) AS revenueCents
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN dishes d ON d.id = oi.dish_id
  WHERE o.business_date = ?
  GROUP BY d.id
  ORDER BY qty DESC, d.name
`);
const localToday = db.prepare("SELECT date('now', 'localtime') AS today");

app.get('/api/dishes', (req, res) => {
  res.json(listDishes.all());
});

// Prices always come from the database, never from the client — a stale or
// tampered client can't change what lands in the drawer count.
const createOrder = transaction((items) => {
  let total = 0;
  const lines = items.map(({ dishId, qty }) => {
    const dish = getDish.get(dishId);
    if (!dish) {
      throw Object.assign(new Error(`Unknown or inactive dish ${dishId}`), { status: 400 });
    }
    total += dish.price_cents * qty;
    return { dishId, qty, price: dish.price_cents };
  });
  const { lastInsertRowid: orderId } = insertOrder.run(total);
  for (const line of lines) insertItem.run(orderId, line.dishId, line.qty, line.price);
  return { orderId: Number(orderId), totalCents: total };
});

app.post('/api/orders', (req, res) => {
  const items = req.body?.items;
  const valid =
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(
      (i) => Number.isInteger(i?.dishId) && Number.isInteger(i?.qty) && i.qty >= 1 && i.qty <= 99
    );
  if (!valid) {
    return res.status(400).json({ error: 'items must be a non-empty list of { dishId, qty }' });
  }
  try {
    res.status(201).json(createOrder(items));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

function pinOk(pin) {
  const given = Buffer.from(String(pin ?? ''));
  const expected = Buffer.from(ADMIN_PIN);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

app.get('/api/admin/summary', (req, res) => {
  if (!pinOk(req.get('x-admin-pin'))) {
    return res.status(401).json({ error: 'Wrong PIN' });
  }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date ?? '')
    ? req.query.date
    : localToday.get().today;
  const { ordersCount, totalCents } = dayTotals.get(date);
  res.json({ date, ordersCount, totalCents, dishes: daySales.all(date) });
});

// In production the API server also serves the built client, so one process
// on the counter machine runs the whole register.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`CanteenCounter server running on http://localhost:${PORT}`);
});
