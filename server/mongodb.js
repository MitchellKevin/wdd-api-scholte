import { MongoClient } from 'mongodb';

let database = null;

export async function getDB() {
  if (database) return database;

  const uri = process.env.MONGODB_URI || import.meta.env?.MONGODB_URI;
  const dbName = process.env.DB_NAME || import.meta.env?.DB_NAME || 'blackjack';

  if (!uri) throw new Error('MONGODB_URI is not set in environment variables');

  const client = new MongoClient(uri);
  await client.connect();

  database = client.db(dbName);

  // Ensure usernames are unique
  await database.collection('users').createIndex({ username: 1 }, { unique: true });

  return database;
}

export const getDb = getDB;
