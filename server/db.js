import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
fs.mkdirSync(dataDir, { recursive: true });

// node:sqlite is built into Node itself (22.5+), so there is nothing to
// compile — the register installs the same way on Windows, Mac, and Linux.
export const db = new DatabaseSync(path.join(dataDir, 'canteen.db'));
db.exec('PRAGMA journal_mode = WAL');

// Runs fn atomically: either every statement lands or none do.
export function transaction(fn) {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
}

// Databases created before a column existed get it added in place.
function ensureColumn(table, column, ddl) {
  const { n } = db
    .prepare('SELECT COUNT(*) AS n FROM pragma_table_info(?) WHERE name = ?')
    .get(table, column);
  if (n === 0) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS dishes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    color       TEXT    NOT NULL,
    description TEXT,
    sort        INTEGER NOT NULL DEFAULT 0,
    active      INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    total_cents   INTEGER NOT NULL,
    business_date TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    order_id    INTEGER NOT NULL REFERENCES orders(id),
    dish_id     INTEGER NOT NULL REFERENCES dishes(id),
    qty         INTEGER NOT NULL CHECK (qty > 0),
    price_cents INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_business_date ON orders(business_date);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`);

ensureColumn('dishes', 'description', 'description TEXT');
