import { createMollieClient } from '@mollie/api-client';
import { getSession, getTokenFromRequest } from '../../../lib/auth.js';
import { createPayment } from '../../../server/db.js';

const PACKAGES = {
  p1:  { coins: 60,  price: '2.60',  label: '60 EC-Punten voor €2,60' },
  p5:  { coins: 120,  price: '5.10',  label: '120 EC-Punten voor €5,10' },
  p10: { coins: 180, price: '7.60', label: '180 EC-Punten voor €7,60' }
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

    // Bepaal de base URL vanuit de binnenkomende request zodat dit
    // automatisch werkt op zowel localhost als productie (Render).
    // Render zet x-forwarded-proto op 'https'; lokaal valt het terug op 'http'.
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host  = request.headers.get('host');
    const baseUrl = proto + '://' + host;

    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

    const payment = await mollie.payments.create({
      amount:      { currency: 'EUR', value: pkg.price },
      description: pkg.label,
      method:      'ideal',
      redirectUrl: baseUrl + '/shop?payment=success',
      ...(!isLocalhost && { webhookUrl: baseUrl + '/api/webhook' }),
      metadata:    { packageId, userId: String(user._id) }
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
