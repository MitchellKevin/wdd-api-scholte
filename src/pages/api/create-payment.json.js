import { nanoid } from 'nanoid';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createPurchase } from '../../../server/db.js';
import { getSession, getTokenFromRequest } from '../../../lib/auth.js';

dotenv.config();
const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY || process.env.VITE_MOLLIE_API_KEY;

export async function POST({ request }){
  try{
    const body = await request.json();
    const { packageId } = body;
    if(!packageId) return new Response(JSON.stringify({ error: 'missing packageId' }), { status: 400 });
    // Packages mapping (must match public/shop.js)
    const PACKAGES = {
      p1: { coins: 1000, amount: '1.00' },
      p5: { coins: 5000, amount: '5.00' },
      p10: { coins: 10000, amount: '10.00' },
      p20: { coins: 20000, amount: '20.00' },
      p50: { coins: 50000, amount: '50.00' }
    };
    const pkg = PACKAGES[packageId];
    if(!pkg) return new Response(JSON.stringify({ error: 'unknown package' }), { status: 400 });

    const session = nanoid();

    // try to extract user from Authorization header or cookie
    let userSub = null;
    try{
      const token = getTokenFromRequest(request);
      const user = await getSession(token);
      if(user && user._id) userSub = String(user._id);
    }catch(err){
      console.warn('create-payment: auth token invalid or missing');
    }

    if(!MOLLIE_API_KEY){
      // fallback to mock payment url
      const paymentUrl = `/mock-payment?session=${session}&pkg=${encodeURIComponent(packageId)}`;
      // persist the purchase as pending so webhook simulation can find it
      createPurchase(session, packageId, Math.round(parseFloat(pkg.amount) * 100), 'EUR', null, 'pending', userSub);
      return new Response(JSON.stringify({ ok:true, paymentUrl }), { status: 200 });
    }

    // Create Mollie payment
    const res = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOLLIE_API_KEY}`
      },
      body: JSON.stringify({
        amount: { currency: 'EUR', value: pkg.amount },
        description: `Buy ${pkg.coins} coins`,
        redirectUrl: `${process.env.BASE_URL || ''}/shop`,
        webhookUrl: `${process.env.BASE_URL || ''}/api/payment-webhook.json`,
        metadata: { session, packageId }
      })
    });

    const j = await res.json();
    if(!res.ok){
      console.error('mollie create payment failed', j);
      return new Response(JSON.stringify({ error: 'mollie_create_failed', detail: j }), { status: 502 });
    }

  // store purchase record with mollie payment id and pending status
  createPurchase(session, packageId, Math.round(parseFloat(pkg.amount) * 100), 'EUR', j.id, 'pending', userSub);

    // mollie returns _links.checkout.href to redirect user
    const paymentUrl = j._links && j._links.checkout && j._links.checkout.href;
    return new Response(JSON.stringify({ ok:true, paymentUrl }), { status: 200 });
  }catch(e){
    console.error('create-payment.err', e && e.message);
    return new Response(JSON.stringify({ error: e && e.message }), { status: 500 });
  }
}
