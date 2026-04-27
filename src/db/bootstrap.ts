import type * as SQLite from 'expo-sqlite';

const SCHEMA_VERSION = 1;

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT,
    barcode TEXT,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT NOT NULL DEFAULT 'pc',
    cost INTEGER NOT NULL DEFAULT 0,
    price INTEGER NOT NULL DEFAULT 0,
    stock REAL NOT NULL DEFAULT 0,
    low_stock REAL NOT NULL DEFAULT 5,
    image_path TEXT,
    favorite INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,
  `CREATE INDEX IF NOT EXISTS products_barcode_idx ON products(barcode);`,
  `CREATE INDEX IF NOT EXISTS products_name_idx ON products(name);`,

  `CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    type TEXT NOT NULL,
    qty REAL NOT NULL,
    unit_cost INTEGER NOT NULL DEFAULT 0,
    ref_table TEXT,
    ref_id INTEGER,
    note TEXT,
    occurred_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,

  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    note TEXT,
    balance INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,

  `CREATE TABLE IF NOT EXISTS merchants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    note TEXT,
    balance INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,

  `CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total INTEGER NOT NULL,
    discount INTEGER NOT NULL DEFAULT 0,
    paid INTEGER NOT NULL DEFAULT 0,
    method TEXT NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    note TEXT,
    occurred_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,
  `CREATE INDEX IF NOT EXISTS sales_date_idx ON sales(occurred_at);`,

  `CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    name TEXT NOT NULL,
    qty REAL NOT NULL,
    unit_price INTEGER NOT NULL,
    unit_cost INTEGER NOT NULL DEFAULT 0,
    line_total INTEGER NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS customer_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    sale_id INTEGER REFERENCES sales(id),
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    note TEXT,
    occurred_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,

  `CREATE TABLE IF NOT EXISTS merchant_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL REFERENCES merchants(id),
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    note TEXT,
    occurred_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,

  `CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    opening_float INTEGER NOT NULL DEFAULT 0,
    closing_counted INTEGER,
    expected INTEGER,
    variance INTEGER,
    note TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS cash_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES cash_sessions(id),
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    ref_table TEXT,
    ref_id INTEGER,
    note TEXT,
    occurred_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,
  `CREATE INDEX IF NOT EXISTS cash_movements_session_idx ON cash_movements(session_id);`,
  `CREATE INDEX IF NOT EXISTS cash_movements_date_idx ON cash_movements(occurred_at);`,

  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
];

const SEED_SETTINGS: Array<[string, string]> = [
  ['storeName', 'My Store'],
  ['currencySymbol', '₱'],
  ['lowStockDefault', '5'],
  ['schemaVersion', String(SCHEMA_VERSION)],
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const stmt of STATEMENTS) {
      await db.execAsync(stmt);
    }
    for (const [k, v] of SEED_SETTINGS) {
      await db.runAsync('INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?);', [k, v]);
    }
  });
}
