import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'scores.db');

const db = new Database(dbPath);

// create table
db.prepare(`CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_sub TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`).run();

// balances table for coin balances
db.prepare(`CREATE TABLE IF NOT EXISTS balances (
  user_sub TEXT PRIMARY KEY,
  coins INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`).run();

// purchases table to track payments
db.prepare(`CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session TEXT UNIQUE,
  package_id TEXT,
  amount INTEGER,
  currency TEXT,
  mollie_payment_id TEXT,
  status TEXT,
  user_sub TEXT,
  created_at INTEGER,
  updated_at INTEGER
)`).run();

export function saveScore(userSub, score){
  const now = Date.now();
  const stmt = db.prepare(`INSERT INTO scores (user_sub, score, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_sub) DO UPDATE SET score=excluded.score, updated_at=excluded.updated_at`);
  stmt.run(userSub, score, now);
}

export function getScore(userSub){
  const row = db.prepare(`SELECT score, updated_at FROM scores WHERE user_sub = ?`).get(userSub);
  return row || null;
}

export function getTopScores(limit = 10){
  const rows = db.prepare(`SELECT user_sub as userSub, score, updated_at FROM scores ORDER BY score DESC LIMIT ?`).all(limit);
  return rows;
}

// Purchase helpers
export function createPurchase(session, packageId, amount, currency, molliePaymentId = null, status = 'pending', userSub = null){
  const now = Date.now();
  const stmt = db.prepare(`INSERT INTO purchases (session, package_id, amount, currency, mollie_payment_id, status, user_sub, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(session) DO UPDATE SET package_id=excluded.package_id, amount=excluded.amount, currency=excluded.currency, mollie_payment_id=excluded.mollie_payment_id, status=excluded.status, user_sub=excluded.user_sub, updated_at=excluded.updated_at`);
  stmt.run(session, packageId, amount, currency, molliePaymentId, status, userSub, now, now);
  return getPurchaseBySession(session);
}

export function getPurchaseBySession(session){
  return db.prepare(`SELECT * FROM purchases WHERE session = ?`).get(session) || null;
}

export function getPurchaseByMollieId(mollieId){
  return db.prepare(`SELECT * FROM purchases WHERE mollie_payment_id = ?`).get(mollieId) || null;
}

export function setPurchaseStatusByMollieId(mollieId, status, userSub = null){
  const now = Date.now();
  const stmt = db.prepare(`UPDATE purchases SET status = ?, user_sub = COALESCE(?, user_sub), updated_at = ? WHERE mollie_payment_id = ?`);
  stmt.run(status, userSub, now, mollieId);
  return getPurchaseByMollieId(mollieId);
}

// Balance helpers
export function creditCoins(userSub, coins){
  const now = Date.now();
  const exists = db.prepare(`SELECT coins FROM balances WHERE user_sub = ?`).get(userSub);
  if(exists){
    const stmt = db.prepare(`UPDATE balances SET coins = coins + ?, updated_at = ? WHERE user_sub = ?`);
    stmt.run(coins, now, userSub);
  }else{
    const stmt = db.prepare(`INSERT INTO balances (user_sub, coins, updated_at) VALUES (?, ?, ?)`);
    stmt.run(userSub, coins, now);
  }
  return getBalance(userSub);
}

export function getBalance(userSub){
  const row = db.prepare(`SELECT coins, updated_at FROM balances WHERE user_sub = ?`).get(userSub);
  return row || { coins: 0, updated_at: null };
}
