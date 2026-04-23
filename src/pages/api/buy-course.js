import { getSession, getTokenFromRequest } from '../../../lib/auth.js';
import { buyCourse } from '../../../server/db.js';
import { COURSES } from '../../../lib/courses.js';

export async function POST({ request }) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getSession(token);
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });

    const { courseId } = await request.json();
    const course = COURSES.find(c => c.id === courseId);
    if (!course) return new Response(JSON.stringify({ error: 'Onbekend vak' }), { status: 400 });

    const ok = await buyCourse(String(user._id), courseId, course.ec);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Niet genoeg EC-Punten of al gekocht' }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  }
}
