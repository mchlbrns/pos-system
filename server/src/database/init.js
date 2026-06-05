/**
 * @module database/init
 * @description SQLite database initialization with all tables, indexes, and triggers.
 * Uses better-sqlite3 for synchronous, high-performance SQLite access.
 */

'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/** @type {import('better-sqlite3').Database|null} */
let db = null;

/**
 * Returns the singleton database instance, creating it if necessary.
 * @returns {import('better-sqlite3').Database}
 */
function getDatabase() {
  if (db) return db;

  const dbPath = process.env.DB_PATH || './data/pos.db';
  
  if (dbPath === ':memory:') {
    db = new Database(':memory:');
    return db;
  }

  const absolutePath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(__dirname, '..', '..', dbPath);

  // Ensure the data directory exists
  const dir = path.dirname(absolutePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(absolutePath);

  // Performance & reliability pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -20000'); // 20 MB

  return db;
}

/**
 * Creates all tables required by the POS system.
 * Safe to call multiple times (uses IF NOT EXISTS).
 */
function initializeDatabase() {
  const db = getDatabase();

  db.exec(`
    -- ============================================================
    -- BUSINESSES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS businesses (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      type          TEXT    NOT NULL CHECK (type IN ('waterstation', 'laundry', 'motorepair', 'general')),
      address       TEXT,
      phone         TEXT,
      tin           TEXT,
      logo_url      TEXT,
      settings      TEXT    DEFAULT '{}',  -- JSON
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- USERS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier', 'manager')),
      full_name     TEXT    NOT NULL,
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- CATEGORIES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS categories (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name          TEXT    NOT NULL,
      description   TEXT,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- PRODUCTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS products (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id       INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name              TEXT    NOT NULL,
      description       TEXT,
      sku               TEXT,
      barcode           TEXT,
      price             REAL    NOT NULL DEFAULT 0,
      cost              REAL    NOT NULL DEFAULT 0,
      quantity          REAL    NOT NULL DEFAULT 0,
      unit              TEXT    NOT NULL DEFAULT 'pc',
      is_active         INTEGER NOT NULL DEFAULT 1,
      plugin_attributes TEXT    DEFAULT '{}',  -- JSON
      image_url         TEXT,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- CUSTOMERS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS customers (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name            TEXT    NOT NULL,
      phone           TEXT,
      email           TEXT,
      address         TEXT,
      notes           TEXT,
      loyalty_points  REAL    NOT NULL DEFAULT 0,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- TRANSACTIONS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS transactions (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id         INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id             INTEGER NOT NULL REFERENCES users(id),
      customer_id         INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      transaction_number  TEXT    NOT NULL UNIQUE,
      subtotal            REAL    NOT NULL DEFAULT 0,
      tax_amount          REAL    NOT NULL DEFAULT 0,
      discount_amount     REAL    NOT NULL DEFAULT 0,
      total               REAL    NOT NULL DEFAULT 0,
      status              TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'voided', 'refunded')),
      payment_method      TEXT,
      notes               TEXT,
      plugin_attributes   TEXT    DEFAULT '{}',  -- JSON
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- LINE ITEMS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS line_items (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id    INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      product_id        INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name      TEXT    NOT NULL,
      quantity          REAL    NOT NULL DEFAULT 1,
      unit_price        REAL    NOT NULL DEFAULT 0,
      discount          REAL    NOT NULL DEFAULT 0,
      subtotal          REAL    NOT NULL DEFAULT 0,
      plugin_attributes TEXT    DEFAULT '{}',  -- JSON
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- PAYMENTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS payments (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id    INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      method            TEXT    NOT NULL CHECK (method IN ('cash', 'gcash', 'maya', 'card', 'bank_transfer')),
      amount            REAL    NOT NULL DEFAULT 0,
      reference_number  TEXT,
      change_amount     REAL    NOT NULL DEFAULT 0,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- PRINT TEMPLATES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS print_templates (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name          TEXT    NOT NULL,
      type          TEXT    NOT NULL CHECK (type IN ('receipt', 'kitchen', 'label')),
      template      TEXT    NOT NULL,
      is_default    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- PRINTER JOBS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS printer_jobs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      template_id   INTEGER REFERENCES print_templates(id) ON DELETE SET NULL,
      transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
      printer_name  TEXT,
      status        TEXT    NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'printing', 'completed', 'failed')),
      payload       TEXT    DEFAULT '{}',  -- JSON
      attempts      INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- PLUGINS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS plugins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL UNIQUE,
      type          TEXT    NOT NULL,
      version       TEXT    NOT NULL DEFAULT '1.0.0',
      is_active     INTEGER NOT NULL DEFAULT 1,
      config        TEXT    DEFAULT '{}',  -- JSON
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- SETTINGS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS settings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      key           TEXT    NOT NULL,
      value         TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(business_id, key)
    );

    -- ============================================================
    -- INDEXES
    -- ============================================================
    CREATE INDEX IF NOT EXISTS idx_products_business     ON products(business_id);
    CREATE INDEX IF NOT EXISTS idx_products_category     ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_barcode      ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_sku          ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_transactions_business ON transactions(business_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user     ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_status   ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_number   ON transactions(transaction_number);
    CREATE INDEX IF NOT EXISTS idx_line_items_txn        ON line_items(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_payments_txn          ON payments(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_customers_business    ON customers(business_id);
    CREATE INDEX IF NOT EXISTS idx_customers_phone       ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_printer_jobs_status   ON printer_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_settings_biz_key      ON settings(business_id, key);
  `);

  return db;
}

/**
 * Closes the database connection gracefully.
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDatabase, initializeDatabase, closeDatabase };
