import { createMollieClient } from '@mollie/api-client';
import { getPaymentByMollieId, markPaymentPaid, creditCoins } from '../../../server/db.js';

export async function POST({ request }) {
  try {
    // Mollie stuurt de webhook als form-encoded body: id=tr_xxxxx
    const body = await request.text();
    const params = new URLSearchParams(body);
    const id = params.get('id');

    if (!id) {
      console.error('webhook: geen id ontvangen');
      return new Response('ok', { status: 200 });
    }

    // Controleer de betaalstatus rechtstreeks bij Mollie
    const mollie = createMollieClient({ apiKey: import.meta.env.MOLLIE_API_KEY });
    const molliePayment = await mollie.payments.get(id);

    if (molliePayment.status !== 'paid') {
      // Nog niet betaald (bijv. pending of cancelled) — niets doen
      return new Response('ok', { status: 200 });
    }

    // Zoek de bijbehorende betaling in onze database
    const existing = await getPaymentByMollieId(id);

    if (!existing) {
      console.error('webhook: betaling niet gevonden in database voor id', id);
      return new Response('ok', { status: 200 });
    }

    if (existing.status === 'paid') {
      // Al verwerkt, voorkom dubbele bijschrijving
      return new Response('ok', { status: 200 });
    }

    // Schrijf de coins bij en markeer als betaald
    await markPaymentPaid(id);
    await creditCoins(existing.userId, existing.coins);

    console.log('webhook: betaling verwerkt', id, '- coins bijgeschreven:', existing.coins, 'voor gebruiker', existing.userId);

    return new Response('ok', { status: 200 });

  } catch (e) {
    console.error('webhook fout:', e.message);
    return new Response('ok', { status: 200 });
  }
}
