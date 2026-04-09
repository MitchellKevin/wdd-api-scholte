export async function GET(){
  return new Response('Auth callback not used. Use /login and /signup instead.', { status: 410 });
}