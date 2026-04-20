import mollieClient from '@mollie/api-client';
import { getPaymentByMollieId, markPaymentPaid, creditCoins } from '../../../server/db.js';

export async function POST({ request }) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const id = params.get('id');
    if (!id) return new Response('ok', { status: 200 });

    const mollie = mollieClient({ apiKey: process.env.MOLLIE_API_KEY });
    const molliePayment = await mollie.payments.get(id);

    if (!molliePayment.isPaid()) return new Response('ok', { status: 200 });

    const existing = await getPaymentByMollieId(id);
    if (!existing || existing.status === 'paid') return new Response('ok', { status: 200 });

    await markPaymentPaid(id);
    await creditCoins(existing.userId, existing.coins);

    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error('webhook error', e);
    return new Response('ok', { status: 200 });
  }
}
