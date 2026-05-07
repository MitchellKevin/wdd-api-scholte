export const prerender = false;

// Module-level cache persists for the lifetime of the server process
const cache = new Map();

export async function GET({ request }) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');

  if (!text || text.length > 200) {
    return new Response('Missing or invalid text', { status: 400 });
  }

  const apiKey  = import.meta.env.ELEVENLABS_API_KEY;
  const voiceId = import.meta.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Adam

  if (!apiKey) {
    return new Response('ElevenLabs not configured', { status: 503 });
  }

  if (cache.has(text)) {
    return new Response(cache.get(text), {
      headers: {
        'Content-Type'  : 'audio/mpeg',
        'Cache-Control' : 'public, max-age=86400',
      },
    });
  }

  let elevRes;
  try {
    elevRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method  : 'POST',
        headers : {
          'xi-api-key'   : apiKey,
          'Content-Type' : 'application/json',
          'Accept'       : 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id       : 'eleven_multilingual_v2',
          voice_settings : { stability: 0.45, similarity_boost: 0.8 },
        }),
      }
    );
  } catch (e) {
    console.error('[TTS] fetch error:', e);
    return new Response('TTS request failed', { status: 502 });
  }

  if (!elevRes.ok) {
    const body = await elevRes.text().catch(() => '');
    console.error('[TTS] ElevenLabs error', elevRes.status, body);
    return new Response('TTS upstream error', { status: 502 });
  }

  const audio = await elevRes.arrayBuffer();
  cache.set(text, audio);

  return new Response(audio, {
    headers: {
      'Content-Type'  : 'audio/mpeg',
      'Cache-Control' : 'public, max-age=86400',
    },
  });
}
