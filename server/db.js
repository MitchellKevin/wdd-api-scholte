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
