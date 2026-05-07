export async function GET({ cookies, redirect }){
  cookies.delete('session', { path: '/' });
  return redirect('/');
}