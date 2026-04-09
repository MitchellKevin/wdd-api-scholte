import { nanoid } from 'nanoid';

// In a real integration this endpoint would call Mollie's Create Payment API
// using server-side credentials, then return the payment URL to the client.
// For now we return a mock URL so the UI can be tested.

export async function post({ request }){
  try{
    const body = await request.json();
    const { packageId } = body;
    if(!packageId) return new Response(JSON.stringify({ error: 'missing packageId' }), { status: 400 });
    // create a mock payment session id
    const session = nanoid();
    const paymentUrl = `/mock-payment?session=${session}&pkg=${encodeURIComponent(packageId)}`;
    return new Response(JSON.stringify({ ok:true, paymentUrl }), { status: 200 });
  }catch(e){
    console.error('create-payment.err', e && e.message);
    return new Response(JSON.stringify({ error: e && e.message }), { status: 500 });
  }
}
