import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/auth.js';

const PROTECTED = ['/game', '/api/balance'];

export const onRequest = defineMiddleware(async ({ request, cookies, locals, redirect }, next) => {
  const sessionCookie = cookies.get('session')?.value;
  const user = await getSession(sessionCookie);

  locals.user = user;

  const url = new URL(request.url);
  if (PROTECTED.some(p => url.pathname.startsWith(p)) && !user) {
    return redirect('/login');
  }

  return next();
});