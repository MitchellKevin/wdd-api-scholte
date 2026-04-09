import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDB } from "../../../server/mongodb";

export async function POST({ request }) {
  const { email, password } = await request.json();

  const db = await getDB();
  const user = await db.collection("users").findOne({ email });

  if (!user) {
    return new Response(JSON.stringify({ message: "User not found" }), { status: 400 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return new Response(JSON.stringify({ message: "Wrong password" }), { status: 400 });
  }

  const token = jwt.sign(
    { id: user._id },
    "SECRET",
    { expiresIn: "1h" }
  );

  return new Response(JSON.stringify({ token }), { status: 200 });
}