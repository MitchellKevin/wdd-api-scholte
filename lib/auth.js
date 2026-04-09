import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(import.meta.env.SESSION_SECRET);

const AUTH0_DOMAIN    = import.meta.env.AUTH0_DOMAIN;
const CLIENT_ID       = import.meta.env.AUTH0_CLIENT_ID;
const CLIENT_SECRET   = import.meta.env.AUTH0_CLIENT_SECRET;
const CALLBACK_URL    = import.meta.env.AUTH0_CALLBACK_URL;

export function getLoginUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    scope: 'openid profile email',
    state,
  });
  return `https://${AUTH0_DOMAIN}/authorize?${params}`;
}

export async function exchangeCode(code) {
  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: CALLBACK_URL,
    }),
  });
  if (!res.ok) throw new Error('Token exchange failed');
  return res.json();
}

export async function getUserInfo(accessToken) {
  const res = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

export async function createSession(user) {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
}

export async function getSession(cookie) {
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(cookie, secret);
    return payload.user;
  } catch {
    return null;
  }
}