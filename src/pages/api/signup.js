import "dotenv/config";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

if (!uri) {
  throw new Error("MONGODB_URI is missing in .env");
}

let client;
let db;

export async function connectDB() {
  if (db) return db;

  client = new MongoClient(uri);
  await client.connect();

  db = client.db(dbName);

  console.log("MongoDB connected:", dbName);

  return db;
}

console.log("URI =", process.env.MONGODB_URI);