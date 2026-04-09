export async function GET({ cookies, redirect }) {
  cookies.delete('session', { path: '/' });
  const returnTo = encodeURIComponent('http://localhost:4321');
  return redirect(
    `https://${import.meta.env.AUTH0_DOMAIN}/v2/logout?client_id=${import.meta.env.AUTH0_CLIENT_ID}&returnTo=${returnTo}`
  );
}