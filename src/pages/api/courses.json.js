import { getSession, getTokenFromRequest } from '../../../lib/auth.js';
import { getPurchasedCourses } from '../../../server/db.js';
import { COURSES, TOTAL_EC } from '../../../lib/courses.js';

export async function GET({ request }) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getSession(token);
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });

    const purchased = await getPurchasedCourses(String(user._id));
    return new Response(JSON.stringify({ courses: COURSES, purchased, totalEc: TOTAL_EC }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  }
}
