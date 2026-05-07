const TYPE_LABELS = {
  vak: 'Vak', project: 'Project', stage: 'Stage', minor: 'Minor'
};

let allCourses = [];
let purchased = [];
let balance = 0;
let totalEc = 0;

async function load() {
  const token = sessionStorage.getItem('token');
  if (!token) { location.href = '/login'; return; }

  const [coursesRes, meRes] = await Promise.all([
    fetch('/api/courses.json', { headers: { Authorization: 'Bearer ' + token } }),
    fetch('/api/me',           { headers: { Authorization: 'Bearer ' + token } }),
  ]);

  if (!coursesRes.ok) { location.href = '/login'; return; }

  const data = await coursesRes.json();
  const me   = meRes.ok ? await meRes.json() : {};

  allCourses = data.courses;
  purchased  = data.purchased ?? [];
  balance    = me.coins_amount ?? 0;
  totalEc    = data.totalEc;

  render();
}

function render() {
  document.getElementById('hdr-balance').textContent = balance.toLocaleString('nl-NL');

  const earnedEc = allCourses
    .filter(c => purchased.includes(c.id))
    .reduce((s, c) => s + c.ec, 0);
  const pct = totalEc > 0 ? Math.round((earnedEc / totalEc) * 100) : 0;

  document.getElementById('progress-label').textContent = `${earnedEc} / ${totalEc} EC behaald`;
  document.getElementById('progress-pct').textContent = `${pct}%`;
  document.getElementById('progress-fill').style.width = pct + '%';

  const diploma = document.getElementById('diploma-banner');
  diploma.style.display =
    purchased.length === allCourses.length && allCourses.length > 0 ? 'flex' : 'none';

  const jaren = {};
  for (const c of allCourses) {
    if (!jaren[c.jaar]) jaren[c.jaar] = [];
    jaren[c.jaar].push(c);
  }

  const container = document.getElementById('jaren-container');
  container.innerHTML = '';

  for (const jaar of Object.keys(jaren).map(Number).sort()) {
    const section = document.createElement('div');
    section.className = 'jaar-section';

    const label = document.createElement('div');
    label.className = 'jaar-label';
    label.textContent = `Jaar ${jaar}`;
    section.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'courses-grid';
    for (const course of jaren[jaar]) grid.appendChild(buildCard(course));

    section.appendChild(grid);
    container.appendChild(section);
  }
}

function buildCard(course) {
  const owned = purchased.includes(course.id);
  const card  = document.createElement('div');
  card.className = 'course-card' + (owned ? ' owned' : '');

  const top = document.createElement('div');
  top.className = 'card-top';

  const name = document.createElement('div');
  name.className = 'course-name';
  name.textContent = course.name;

  const badge = document.createElement('span');
  badge.className = `type-badge type-${course.type}`;
  badge.textContent = TYPE_LABELS[course.type] ?? course.type;

  top.appendChild(name);
  top.appendChild(badge);

  const bottom = document.createElement('div');
  bottom.className = 'card-bottom';

  const ec = document.createElement('div');
  ec.className = 'ec-label';
  ec.innerHTML = `<b>${course.ec}</b> EC`;

  if (owned) {
    const tag = document.createElement('span');
    tag.className = 'owned-tag';
    tag.textContent = '✓ Gehaald';
    bottom.appendChild(ec);
    bottom.appendChild(tag);
  } else {
    const btn = document.createElement('button');
    btn.className = 'buy-btn';
    btn.textContent = 'Kopen';
    btn.disabled = balance < course.ec;
    btn.addEventListener('click', () => buyClick(course, btn));
    bottom.appendChild(ec);
    bottom.appendChild(btn);
  }

  card.appendChild(top);
  card.appendChild(bottom);
  return card;
}

async function buyClick(course, btn) {
  const token = sessionStorage.getItem('token');
  const msg   = document.getElementById('global-msg');
  btn.disabled = true; btn.textContent = 'Bezig…';
  msg.textContent = ''; msg.className = '';

  try {
    const res = await fetch('/api/buy-course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ courseId: course.id }),
    });
    const data = await res.json();
    if (res.ok) {
      purchased.push(course.id);
      balance -= course.ec;
      render();
    } else {
      msg.className = 'err';
      msg.textContent = data.error || 'Kopen mislukt';
      btn.disabled = false; btn.textContent = 'Kopen';
    }
  } catch {
    msg.className = 'err'; msg.textContent = 'Netwerkfout';
    btn.disabled = false; btn.textContent = 'Kopen';
  }
}

load();
