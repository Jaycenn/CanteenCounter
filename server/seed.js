import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, transaction } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const menu = JSON.parse(fs.readFileSync(path.join(here, 'menu.json'), 'utf8'));

const upsert = db.prepare(`
  INSERT INTO dishes (name, price_cents, color, description, sort, active)
  VALUES (@name, @price_cents, @color, @description, @sort, 1)
  ON CONFLICT(name) DO UPDATE SET
    price_cents = @price_cents,
    color = @color,
    description = @description,
    sort = @sort,
    active = 1
`);

// Dishes removed from menu.json are deactivated, never deleted — past orders
// still reference them, and end-of-day reports must keep adding up.
export const reseed = transaction(() => {
  db.prepare('UPDATE dishes SET active = 0').run();
  menu.forEach((item, i) =>
    upsert.run({
      name: item.name,
      price_cents: Math.round(item.price * 100),
      color: item.color,
      description: item.description ?? null,
      sort: i,
    })
  );
});

export function seedIfEmpty() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM dishes').get();
  if (n === 0) reseed();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  reseed();
  console.log(`Menu reseeded: ${menu.length} dishes now active.`);
}
