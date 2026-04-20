import { ObjectId } from 'mongodb';
import { getDB } from './mongodb.js';

// ─── Coins ────────────────────────────────────────────────────────────────────

export async function getBalance(userId) {
  const db = await getDB();
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { coins_amount: 1 } }
  );
  return user?.coins_amount ?? 0;
}

export async function setBalance(userId, amount) {
  const db = await getDB();
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: { coins_amount: amount } }
  );
}

export async function creditCoins(userId, amount) {
  const db = await getDB();
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $inc: { coins_amount: amount } }
  );
}

export async function deductCoins(userId, amount) {
  const db = await getDB();

  // Only deduct if the user has enough coins ($gte = greater than or equal)
  const result = await db.collection('users').updateOne(
    { _id: new ObjectId(userId), coins_amount: { $gte: amount } },
    { $inc: { coins_amount: -amount } }
  );

  const success = result.modifiedCount === 1;
  return success;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function createPayment(data) {
  const db = await getDB();
  const result = await db.collection('payments').insertOne(data);
  return result.insertedId;
}

export async function getPaymentByMollieId(mollieId) {
  const db = await getDB();
  return db.collection('payments').findOne({ molliePaymentId: mollieId });
}

export async function markPaymentPaid(mollieId) {
  const db = await getDB();
  await db.collection('payments').updateOne(
    { molliePaymentId: mollieId },
    { $set: { status: 'paid', paidAt: new Date() } }
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getTopPlayers(limit = 10) {
  const db = await getDB();
  return db.collection('users')
    .find({}, { projection: { username: 1, coins_amount: 1 } })
    .sort({ coins_amount: -1 })
    .limit(limit)
    .toArray();
}
