const panel   = document.getElementById('panel');
const buttons = document.querySelectorAll('.game-btn');

// Pick game from URL hash on load
const initialSlug = location.hash.slice(1);
if (initialSlug) loadGame(initialSlug);

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    const slug = btn.dataset.slug;
    history.replaceState(null, '', '#' + slug);
    loadGame(slug);
  });
});

function setActive(slug) {
  buttons.forEach(b => b.classList.toggle('active', b.dataset.slug === slug));
}

async function loadGame(slug) {
  setActive(slug);
  showLoading();

  try {
    const res  = await fetch(`/api/rules.json?game=${encodeURIComponent(slug)}`);
    const data = await res.json();

    if (!res.ok || data.error) { showError(data.error ?? 'Fout bij het laden'); return; }
    showArticle(data);
  } catch {
    showError('Geen verbinding met Wikipedia');
  }
}

function showLoading() {
  panel.innerHTML = `
    <div class="rules-loading">
      <div class="spinner"></div>
      Laden via Wikipedia…
    </div>`;
}

function showError(msg) {
  panel.innerHTML = `<p class="rules-error">⚠️ ${msg}</p>`;
}

function showArticle(data) {
  const thumbHtml = data.thumbnail
    ? `<img class="article-thumb" src="${esc(data.thumbnail)}" alt="${esc(data.wikiTitle)}" loading="lazy">`
    : '';

  const sectionsHtml = (data.sections ?? []).map(sec => {
    // Split text into paragraphs
    const paragraphs = sec.text
      .split('\n')
      .filter(p => p.trim())
      .map(p => `<p>${esc(p)}</p>`)
      .join('');

    if (sec.title === null) {
      // Intro — no heading, render directly
      return `<div class="section-intro">${paragraphs}</div>`;
    }

    const tag = sec.level <= 2 ? 'h3' : 'h4';
    return `
      <div class="article-section">
        <${tag} class="section-title">${esc(sec.title)}</${tag}>
        <div class="section-body">${paragraphs}</div>
      </div>`;
  }).join('');

  panel.innerHTML = `
    <article class="rules-article">
      <div class="article-header">
        ${thumbHtml}
        <div class="article-meta">
          <h2 class="article-title">${esc(data.title)}</h2>
          <p class="article-source">Bron: Wikipedia (Nederlands)</p>
        </div>
      </div>

      <div class="article-body">
        ${sectionsHtml}
      </div>

      ${data.sourceUrl ? `
        <a class="wiki-link" href="${esc(data.sourceUrl)}" target="_blank" rel="noopener">
          🔗 Volledig artikel op Wikipedia
        </a>` : ''}
    </article>`;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
