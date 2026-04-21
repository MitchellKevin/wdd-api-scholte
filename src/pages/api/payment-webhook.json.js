// Placeholder webhook endpoint. Mollie will POST payment updates server-side.
// When implementing the real Mollie integration, validate signatures and
// update the user's coin balance based on the returned paymentId/session.

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { getPaymentByMollieId, markPaymentPaid, creditCoins } from '../../../server/db.js';

dotenv.config();
const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY || process.env.VITE_MOLLIE_API_KEY;

export async function POST({ request }){
  try{
    const body = await request.json();
    console.log('payment-webhook received', body);

    const mollieId = body && (body.id || body.resourceId || body.paymentId || (body.payment && body.payment.id));
    if(!mollieId) return new Response(JSON.stringify({ error: 'no id in webhook payload' }), { status: 400 });

    if(!MOLLIE_API_KEY) return new Response(JSON.stringify({ error: 'no mollie key configured' }), { status: 400 });

    const res = await fetch(`https://api.mollie.com/v2/payments/${mollieId}`, { headers: { Authorization: `Bearer ${MOLLIE_API_KEY}` } });
    const j = await res.json();
    const status = j.status;

    const payment = await getPaymentByMollieId(mollieId);
    if(!payment) return new Response(JSON.stringify({ error: 'payment not found' }), { status: 404 });

    if(status === 'paid'){
      if(payment.userId){
        const mapping = { p1:1000, p5:5000, p10:10000, p20:20000, p50:50000 };
        const coins = mapping[payment.packageId] || 0;
        await creditCoins(payment.userId, coins);
      }
      await markPaymentPaid(mollieId);
    }

    return new Response(JSON.stringify({ ok:true, status }), { status: 200 });
  }catch(e){
    console.error('payment-webhook.err', e && e.message);
    return new Response(JSON.stringify({ error: e && e.message }), { status: 500 });
  }
}
