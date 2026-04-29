import { createMollieClient } from '@mollie/api-client';
import { getSession, getTokenFromRequest } from '../../../lib/auth.js';
import { getPaymentByMollieId, markPaymentPaid, creditCoins } from '../../../server/db.js';

export async function POST({ request }) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getSession(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Niet ingelogd' }), { status: 401 });
    }

    const { molliePaymentId } = await request.json();
    if (!molliePaymentId) {
      return new Response(JSON.stringify({ error: 'Geen betaling id' }), { status: 400 });
    }

    const existing = await getPaymentByMollieId(molliePaymentId);

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Betaling niet gevonden' }), { status: 404 });
    }

    // Controleer of de betaling bij de ingelogde gebruiker hoort
    if (String(existing.userId) !== String(user._id)) {
      return new Response(JSON.stringify({ error: 'Niet geautoriseerd' }), { status: 403 });
    }

    // Al verwerkt
    if (existing.status === 'paid') {
      return new Response(JSON.stringify({ credited: false, alreadyPaid: true }), { status: 200 });
    }

    // Controleer de status rechtstreeks bij Mollie
    const mollie = createMollieClient({ apiKey: import.meta.env.MOLLIE_API_KEY });
    const molliePayment = await mollie.payments.get(molliePaymentId);

    if (molliePayment.status !== 'paid') {
      return new Response(JSON.stringify({ credited: false }), { status: 200 });
    }

    // Coins bijschrijven
    await markPaymentPaid(molliePaymentId);
    await creditCoins(existing.userId, existing.coins);

    console.log('check-payment: coins bijgeschreven', existing.coins, 'voor gebruiker', existing.userId);

    return new Response(JSON.stringify({ credited: true, coins: existing.coins }), { status: 200 });

  } catch (e) {
    console.error('check-payment fout:', e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
