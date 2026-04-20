import { MongoClient } from 'mongodb';

let db = null;

export async function getDB() {
  if (db) return db;
  const uri = process.env.MONGODB_URI || import.meta.env?.MONGODB_URI;
  const dbName = process.env.DB_NAME || import.meta.env?.DB_NAME || 'blackjack';
  if (!uri) throw new Error('MONGODB_URI not set');
  const client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  return db;
}

export const getDb = getDB;
