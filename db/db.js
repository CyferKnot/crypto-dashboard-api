// db/db.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.resolve('./db/crypto.db');

export async function initDB() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT,
      token_symbol TEXT,
      token_address TEXT,
      balance REAL,
      usd_price REAL,
      usd_value REAL,
      UNIQUE(wallet_address, token_address)
    );

    CREATE TABLE IF NOT EXISTS price_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_symbol TEXT NOT NULL UNIQUE,
      buy_target REAL,
      profit_target REAL,
      alert_sent INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS alerts_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_symbol TEXT,
      trigger_price REAL,
      direction TEXT,
      action TEXT,
      triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

export async function getDB() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
}

// --- Query Functions ---

export async function upsertHolding(holding) {
  const db = await getDB();
  const { wallet_address, token_symbol, token_address, balance, usd_price, usd_value } = holding;
  await db.run(
    `INSERT INTO holdings (wallet_address, token_symbol, token_address, balance, usd_price, usd_value)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(wallet_address, token_address) DO UPDATE SET
       balance=excluded.balance,
       usd_price=excluded.usd_price,
       usd_value=excluded.usd_value`,
    [wallet_address, token_symbol, token_address, balance, usd_price, usd_value]
  );
}

export async function getAllHoldings() {
  const db = await getDB();
  return db.all(`SELECT * FROM holdings`);
}

export async function getHoldingsByWallet(wallet_address) {
  const db = await getDB();
  return db.all(`SELECT * FROM holdings WHERE wallet_address = ?`, [wallet_address]);
}

export async function setPriceTarget(token_symbol, buy_target, profit_target) {
  const db = await getDB();
  await db.run(
    `INSERT INTO price_targets (token_symbol, buy_target, profit_target)
     VALUES (?, ?, ?)
     ON CONFLICT(token_symbol) DO UPDATE SET
       buy_target=excluded.buy_target,
       profit_target=excluded.profit_target`,
    [token_symbol, buy_target, profit_target]
  );
}

export async function getPriceTargets() {
  const db = await getDB();
  return db.all(`SELECT * FROM price_targets`);
}

export async function getPriceTargetForToken(token_symbol) {
  const db = await getDB();
  return db.get(`SELECT * FROM price_targets WHERE token_symbol = ?`, [token_symbol]);
}

export async function logAlert(token_symbol, trigger_price, direction, action) {
  const db = await getDB();
  await db.run(
    `INSERT INTO alerts_log (token_symbol, trigger_price, direction, action)
     VALUES (?, ?, ?, ?)`,
    [token_symbol, trigger_price, direction, action]
  );
}

export async function getAlertsLog(limit = 100) {
  const db = await getDB();
  return db.all(
    `SELECT * FROM alerts_log ORDER BY triggered_at DESC LIMIT ?`,
    [limit]
  );
}

export async function setAlertSent(token_symbol, sent = true) {
  const db = await getDB();
  await db.run(
    `UPDATE price_targets SET alert_sent = ? WHERE token_symbol = ?`,
    [sent ? 1 : 0, token_symbol]
  );
}

export async function getTriggeredTargets(currentPrices) {
  const db = await getDB();
  const targets = await db.all(`SELECT * FROM price_targets WHERE alert_sent = 0`);
  return targets.filter(row => {
    const price = currentPrices[row.token_symbol.toLowerCase()]?.usd;
    if (!price) return false;
    return (row.buy_target && price <= row.buy_target) || (row.profit_target && price >= row.profit_target);
  });
}

export async function clearAllAlertFlags() {
  const db = await getDB();
  await db.run(`UPDATE price_targets SET alert_sent = 0`);
}

export async function deleteAllHoldings() {
  const db = await getDB();
  await db.run(`DELETE FROM holdings`);
}
