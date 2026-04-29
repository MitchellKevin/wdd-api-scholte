const WIKI_API = 'https://nl.wikipedia.org/w/api.php';

const GAMES = {
  blackjack:               { title: 'Blackjack',             wikiPage: 'Blackjack' },
  roulette:                { title: 'Roulette',              wikiPage: 'Roulette_(spel)' },
  mines:                   { title: 'Mines',                 wikiPage: 'Mijnenveger' },
  poker:                   { title: "Texas Hold'em Poker",   wikiPage: "Texas Hold 'em" },
};

// In-memory cache: wikiPage → { data, expires }
const cache = new Map();
const TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchWiki(wikiPage) {
  const cached = cache.get(wikiPage);
  if (cached && Date.now() < cached.expires) return cached.data;

  const params = new URLSearchParams({
    action:       'query',
    titles:       wikiPage,
    prop:         'extracts|pageimages|info',
    explaintext:  'true',
    piprop:       'thumbnail',
    pithumbsize:  '240',
    inprop:       'url',
    format:       'json',
    origin:       '*',
  });

  const res = await fetch(`${WIKI_API}?${params}`, {
    headers: { 'User-Agent': 'CMD-Casino/1.0 (school project; nl.wikipedia.org)' },
  });

  if (!res.ok) return null;

  const d = await res.json();
  const page = Object.values(d.query.pages)[0];
  if (page.missing !== undefined) return null;

  const data = {
    wikiTitle:  page.title,
    sections:   parseExtract(page.extract),
    thumbnail:  page.thumbnail?.source ?? null,
    sourceUrl:  page.fullurl ?? `https://nl.wikipedia.org/wiki/${encodeURIComponent(wikiPage)}`,
  };

  cache.set(wikiPage, { data, expires: Date.now() + TTL_MS });
  return data;
}

// Split plain-text extract into [{title, text, level}] sections
function parseExtract(extract) {
  if (!extract) return [];

  // ==+ captures both == and === headers; \1 backreferences the opening ==
  const parts = extract.split(/\n+(==+)\s*(.+?)\s*\1\n/);
  const sections = [];

  // parts[0] is intro text, then [level-markers, title, text, level-markers, title, text, ...]
  if (parts[0].trim()) {
    sections.push({ title: null, level: 1, text: parts[0].trim() });
  }

  for (let i = 1; i < parts.length; i += 3) {
    const level = parts[i].length;   // 2 = main section, 3 = subsection
    const title = parts[i + 1];
    const text  = (parts[i + 2] ?? '').trim();
    if (title && text) sections.push({ title, level, text });
  }

  return sections;
}

export async function GET({ url }) {
  const slug = url.searchParams.get('game');

  if (slug) {
    const game = GAMES[slug];
    if (!game) {
      return json({ error: 'Spel niet gevonden', available: Object.keys(GAMES) }, 404);
    }

    const wiki = await fetchWiki(game.wikiPage);
    if (!wiki) {
      return json({ error: 'Wikipedia niet bereikbaar' }, 502);
    }

    return json({ slug, title: game.title, ...wiki });
  }

  const list = Object.entries(GAMES).map(([slug, { title, wikiPage }]) => ({
    slug, title, wikiPage,
    endpoint: `/api/rules.json?game=${slug}`,
  }));

  return json({ games: list });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}
