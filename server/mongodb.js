import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);

let db;

export async function getDB() {
  if (!db) {
    await client.connect();

    console.log("Connected to:", process.env.DB_NAME);
    db = client.db(process.env.DB_NAME);

    await db.collection("users").createIndex(
      { email: 1 },
      { unique: true }
    );

    console.log("Connected to DB");
  }

  return db;
}