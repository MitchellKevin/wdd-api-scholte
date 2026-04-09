import { exchangeCode, getUserInfo, createSession } from '../../../lib/auth.js';

export async function GET({ url, cookies, redirect }) {
  const code      = url.searchParams.get('code');
  const state     = url.searchParams.get('state');
  const savedState = cookies.get('oauth_state')?.value;

  if (!code || state !== savedState) {
    return new Response('Invalid state', { status: 400 });
  }

  const tokens  = await exchangeCode(code);
  const user    = await getUserInfo(tokens.access_token);
  const session = await createSession({
    sub:   user.sub,
    email: user.email,
    name:  user.name,
  });

  cookies.delete('oauth_state', { path: '/' });
  cookies.set('session', session, {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7,
    path:     '/',
  });

  return redirect('/game');
}