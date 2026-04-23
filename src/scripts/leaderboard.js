async function loadLeaderboard() {
  const token = localStorage.getItem('token');
  let myUsername = null;

  if (token) {
    try {
      const me = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } });
      if (me.ok) myUsername = (await me.json()).username;
    } catch {}
  }

  try {
    const res = await fetch('/api/leaderboard.json');
    if (!res.ok) throw new Error();
    const { top } = await res.json();

    document.getElementById('loading').style.display = 'none';
    const list = document.getElementById('list');

    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };

    top.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'row' + (p.rank <= 3 ? ' rank-' + p.rank : '');
      row.style.animationDelay = (i * 60) + 'ms';

      const rankBadge = document.createElement('div');
      rankBadge.className = 'rank-badge' + (medals[p.rank] ? ' medal' : '');
      rankBadge.textContent = medals[p.rank] ?? String(p.rank);

      const player = document.createElement('div');
      player.className = 'player';

      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = p.username.slice(0, 2).toUpperCase();

      const nameWrap = document.createElement('div');
      nameWrap.style.cssText = 'display:flex;align-items:center;gap:6px;min-width:0';

      const nameEl = document.createElement('span');
      nameEl.className = 'username' + (p.username === myUsername ? ' me' : '');
      nameEl.textContent = p.username;

      nameWrap.appendChild(nameEl);

      if (p.username === myUsername) {
        const badge = document.createElement('span');
        badge.className = 'you-badge';
        badge.textContent = 'JIJ';
        nameWrap.appendChild(badge);
      }

      player.appendChild(avatar);
      player.appendChild(nameWrap);

      const coinsWrap = document.createElement('div');
      coinsWrap.className = 'coins-wrap';

      const coinIcon = document.createElement('span');
      coinIcon.className = 'coin-icon';
      coinIcon.textContent = '🪙';

      const coinsEl = document.createElement('span');
      coinsEl.className = 'coins';
      coinsEl.textContent = p.coins_amount.toLocaleString('nl-NL');

      coinsWrap.appendChild(coinIcon);
      coinsWrap.appendChild(coinsEl);

      row.appendChild(rankBadge);
      row.appendChild(player);
      row.appendChild(coinsWrap);
      list.appendChild(row);
    });

    if (top.length === 0) {
      list.textContent = 'Nog geen spelers.';
      list.style.cssText = 'text-align:center;color:rgba(255,255,255,0.3);padding:32px 0;font-size:14px';
    }
  } catch {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
  }
}

loadLeaderboard();
