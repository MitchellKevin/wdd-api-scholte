// Placeholder webhook endpoint. Mollie will POST payment updates server-side.
// When implementing the real Mollie integration, validate signatures and
// update the user's coin balance based on the returned paymentId/session.

export async function post({ request }){
  try{
    const body = await request.json();
    console.log('payment-webhook received', body);
    // For now just return success; in future look up the session and credit coins.
    return new Response(JSON.stringify({ ok:true, received: body }), { status: 200 });
  }catch(e){
    console.error('payment-webhook.err', e && e.message);
    return new Response(JSON.stringify({ error: e && e.message }), { status: 500 });
  }
}
