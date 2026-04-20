import { createMollieClient } from '@mollie/api-client';
import { getSession, getTokenFromRequest } from '../../../lib/auth.js';
import { createPayment } from '../../../server/db.js';

const PACKAGES = {
  p1:  { coins: 1000,  price: '1.00',  label: '1000 coins voor €1' },
  p5:  { coins: 5000,  price: '5.00',  label: '5000 coins voor €5' },
  p10: { coins: 10000, price: '10.00', label: '10000 coins voor €10' }
};

export async function POST({ request }) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getSession(token);
    if (!user) return new Response(JSON.stringify({ error: 'Niet ingelogd' }), { status: 401 });

    const { packageId } = await request.json();
    const pkg = PACKAGES[packageId];
    if (!pkg) return new Response(JSON.stringify({ error: 'Ongeldig pakket' }), { status: 400 });

    const mollie = createMollieClient({ apiKey: import.meta.env.MOLLIE_API_KEY });
    const baseUrl = import.meta.env.SITE_URL || 'http://localhost:4321';

    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

    const payment = await mollie.payments.create({
      amount: { currency: 'EUR', value: pkg.price },
      description: pkg.label,
      method: 'ideal',
      redirectUrl: `${baseUrl}/shop?payment=success`,
      ...(!isLocalhost && { webhookUrl: `${baseUrl}/api/webhook` }),
      metadata: { packageId, userId: String(user._id) }
    });

    await createPayment({
      molliePaymentId: payment.id,
      userId: String(user._id),
      packageId,
      coins: pkg.coins,
      status: 'pending',
      createdAt: new Date()
    });

    return new Response(JSON.stringify({ paymentUrl: payment.getCheckoutUrl() }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  }
}
