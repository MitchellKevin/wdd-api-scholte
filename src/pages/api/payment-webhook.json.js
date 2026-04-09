// Placeholder webhook endpoint. Mollie will POST payment updates server-side.
// When implementing the real Mollie integration, validate signatures and
// update the user's coin balance based on the returned paymentId/session.

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { getPurchaseBySession, getPurchaseByMollieId, setPurchaseStatusByMollieId, creditCoins } from '../../../server/db.js';

dotenv.config();
const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY || process.env.VITE_MOLLIE_API_KEY;

export async function POST({ request }){
  try{
    const body = await request.json();
    console.log('payment-webhook received', body);

    // Accept either { session, packageId, status } (from mock) or Mollie webhook with id
    if(body && body.session){
      const purchase = getPurchaseBySession(body.session);
      if(!purchase) return new Response(JSON.stringify({ error: 'unknown session' }), { status: 404 });
      const status = body.status || 'paid';
      if(status === 'paid'){
        // credit if user known
        if(purchase.user_sub){
          // determine coins from package mapping
          const mapping = { p1:1000, p5:5000, p10:10000, p20:20000, p50:50000 };
          const coins = mapping[purchase.package_id] || 0;
          creditCoins(purchase.user_sub, coins);
        }
        // update purchase status
        setPurchaseStatusByMollieId(purchase.mollie_payment_id, 'paid', purchase.user_sub);
      }
      return new Response(JSON.stringify({ ok:true, purchase }), { status: 200 });
    }

    // Mollie webhook will send { id: 'tr_xxx' } or POST with payment id — try to extract id
    const mollieId = body && (body.id || body.resourceId || body.paymentId || (body.payment && body.payment.id));
    if(!mollieId) return new Response(JSON.stringify({ error: 'no id in webhook payload' }), { status: 400 });

    // Optionally verify with Mollie API
    if(MOLLIE_API_KEY){
      const res = await fetch(`https://api.mollie.com/v2/payments/${mollieId}`, { headers: { Authorization: `Bearer ${MOLLIE_API_KEY}` } });
      const j = await res.json();
      const status = j.status;
      const purchase = getPurchaseByMollieId(mollieId);
      if(!purchase) return new Response(JSON.stringify({ error: 'purchase not found' }), { status: 404 });
      if(status === 'paid'){
        // credit user
        if(purchase.user_sub){
          const mapping = { p1:1000, p5:5000, p10:10000, p20:20000, p50:50000 };
          const coins = mapping[purchase.package_id] || 0;
          creditCoins(purchase.user_sub, coins);
        }
        setPurchaseStatusByMollieId(mollieId, 'paid', purchase.user_sub);
      }else{
        setPurchaseStatusByMollieId(mollieId, status, purchase.user_sub);
      }
      return new Response(JSON.stringify({ ok:true, mollie: j }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'no mollie key configured and no session provided' }), { status: 400 });
  }catch(e){
    console.error('payment-webhook.err', e && e.message);
    return new Response(JSON.stringify({ error: e && e.message }), { status: 500 });
  }
}
