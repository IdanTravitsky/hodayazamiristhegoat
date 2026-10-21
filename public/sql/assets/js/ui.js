// Small DOM toolkit: element builder, markdown, pixel icons, tables, toasts, modal.

export const go = path => { location.hash = '#/' + path; };
export const query = () => new URLSearchParams(location.hash.split('?')[1] || '');

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- SQL highlighting (display only) ----------
const KW = new Set(('SELECT FROM WHERE AND OR NOT NULL IS IN LIKE BETWEEN AS ON JOIN INNER LEFT RIGHT FULL OUTER CROSS NATURAL USING ' +
  'GROUP BY HAVING ORDER ASC DESC LIMIT OFFSET DISTINCT ALL ANY SOME EXISTS UNION INTERSECT EXCEPT CASE WHEN THEN ELSE END ' +
  'INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE VIEW DROP ALTER ADD PRIMARY KEY FOREIGN REFERENCES WITH OVER PARTITION ' +
  'ROWS RANGE INTERVAL TRUE FALSE SHOW TABLES DESCRIBE DESC SEPARATOR DEFAULT CONSTRAINT INDEX IF RECURSIVE').split(' '));
export function highlightSql(sql) {
  if (!window.SqlEngine) return esc(sql);
  const toks = window.SqlEngine.tokenize(sql);
  return toks.map((t, i) => {
    if (t.t === 'str') return `<span class="tok-str">${esc(t.raw)}</span>`;
    if (t.t === 'num') return `<span class="tok-num">${esc(t.v)}</span>`;
    if (t.t === 'comment') return `<span class="tok-com">${esc(t.v)}</span>`;
    if (t.t === 'qident') return `<span class="tok-id">${esc(t.raw)}</span>`;
    if (t.t === 'word') {
      let j = i + 1;
      while (toks[j] && toks[j].t === 'ws') j++;
      if (toks[j] && toks[j].v === '(' && !KW.has(t.u)) return `<span class="tok-fn">${esc(t.v)}</span>`;
      if (KW.has(t.u)) return `<span class="tok-kw">${esc(t.v)}</span>`;
      return esc(t.v);
    }
    return esc(t.v);
  }).join('');
}

// ---------- tiny markdown ----------
function inline(s) {
  let out = esc(s);
  const codes = [];
  out = out.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => `<a href="${href}" class="link-under"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`);
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
}
export function md(text) {
  if (!text) return '';
  const lines = String(text).replace(/\r/g, '').split('\n');
  const html = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      html.push(`<pre class="code">${highlightSql(buf.join('\n'))}</pre>`);
    } else if (/^\s*- /.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*- /.test(lines[i])) {
        let item = lines[i++].replace(/^\s*- /, '');
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*- /.test(lines[i])) item += ' ' + lines[i++].trim();
        items.push(`<li>${inline(item)}</li>`);
      }
      html.push(`<ul>${items.join('')}</ul>`);
    } else if (/^\s*\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^\s*\d+\. /, ''))}</li>`);
      html.push(`<ol>${items.join('')}</ol>`);
    } else if (/^> ?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^> ?/.test(lines[i])) buf.push(lines[i++].replace(/^> ?/, ''));
      html.push(`<div class="callout">${md(buf.join('\n'))}</div>`);
    } else if (!line.trim()) {
      i++;
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(```|\s*- |\s*\d+\. |> ?)/.test(lines[i])) buf.push(lines[i++]);
      html.push(`<p>${inline(buf.join(' '))}</p>`);
    }
  }
  return html.join('');
}
export const mdEl = (text, cls = 'md') => h('div', { class: cls, html: md(text) });
export const inlineMd = text => inline(text);

// ---------- pixel icons ----------
// Paths reuse the main site's set (18x18); the rest are drawn on a 9x9 grid and doubled.
const PATHS = {
  heart: 'M3 4h4v2h2V4h4v2h2v5h-2v2h-2v2H9v2H7v-2H5v-2H3v-2H1V6h2z',
  star: 'M7 1h3v5h5v3h-5v5H7V9H2V6h5z',
  sword: 'M12 1h4v4h-2v2h-2v2h-2v2h2v2h-2v-1H8v2H6v2H3v-3h2v-2h2V9H5V7h2v2h2V7h2V5h1z',
  file: 'M3 1h8v2h2v2h2v12H3zM5 9v1h7V9zM5 12v1h7v-1z',
  goat: 'M3 8h7V5h2V2h2v4h2v6h-3v2h-2v3H9v-3H5v3H3v-3H1V9h2z',
  trophy: 'M4 1h9v3h3v6h-3v2h-2v3h3v2H3v-2h4v-3H5v-2H2V4h2zM4 6H3v2h2zM13 6v2h1V6z',
  trash: 'M2 4h14v2H2zM6 1h6v2H6zM4 7h10v9H4z',
  moon: 'M9 1h4v2h-3v2H8v6h2v2h5v-2h2v3h-2v2H7v-2H4v-3H2V6h2V3h3V1z',
  letter: 'M1 3h16v12H1zM3 5v2h2V5zM5 7v2h2V7zM7 9v2h4V9zM11 7v2h2V7zM13 5v2h2V5z',
  butterfly: 'M1 3h4v2h2v3h2V5h2V3h4v6h-2v2h2v3h-4v-2H9v4H7v-4H5v2H1v-3h2V9H1z',
  mushroom: 'M5 2h6v2h3v3h2v4h-5v5H6v-5H1V7h2V4h2z',
};
const GRIDS = {
  check: ['.........', '.......XX', '......XX.', '.....XX..', 'XX..XX...', '.XXXX....', '..XX.....', '.........', '.........'],
  play: ['.X.......', '.XX......', '.XXX.....', '.XXXX....', '.XXXXX...', '.XXXX....', '.XXX.....', '.XX......', '.X.......'],
  clock: ['..XXXXX..', '.X.....X.', 'X...X...X', 'X...X...X', 'X...XXX.X', 'X.......X', 'X.......X', '.X.....X.', '..XXXXX..'],
  key: ['.........', '.........', 'XXX......', 'X.XXXXXXX', 'XXX...X.X', '......X..', '.........', '.........', '.........'],
  book: ['.........', 'XXXX.XXXX', 'X..X.X..X', 'X.XX.XX.X', 'X..X.X..X', 'X.XX.XX.X', 'X..XXX..X', 'XXXXXXXXX', '.........'],
  table: ['XXXXXXXXX', 'X...X...X', 'XXXXXXXXX', 'X...X...X', 'X...X...X', 'XXXXXXXXX', 'X...X...X', 'X...X...X', 'XXXXXXXXX'],
  eye: ['.........', '..XXXXX..', '.X.....X.', 'X..XXX..X', 'X..XXX..X', '.X.....X.', '..XXXXX..', '.........', '.........'],
  pencil: ['.......XX', '......X.X', '.....X.X.', '....X.X..', '...X.X...', '..X.X....', '.XXX.....', 'XXX......', '.........'],
  lock: ['...XXX...', '..X...X..', '..X...X..', '.XXXXXXX.', '.XXX.XXX.', '.XXX.XXX.', '.XXXXXXX.', '.........', '.........'],
  cross: ['.........', '.XX...XX.', '..XX.XX..', '...XXX...', '..XX.XX..', '.XX...XX.', '.........', '.........', '.........'],
  sun: ['....X....', '.X.....X.', '...XXX...', '..XXXXX..', 'X.XXXXX.X', '..XXXXX..', '...XXX...', '.X.....X.', '....X....'],
  spark: ['....X....', '....X....', '...XXX...', 'XXXXXXXXX', '...XXX...', '....X....', '....X....', '.........', '.........'],
  map: ['XXX.XXX.X', 'X.X.X.X.X', 'X.XXX.XXX', 'X...X...X', 'XXX.XXX.X', 'X.X.X.X.X', 'X.XXX.XXX', '.........', '.........'],
};
function gridPath(rows) {
  let d = '';
  rows.forEach((r, y) => { [...r].forEach((c, x) => { if (c === 'X') d += `M${x * 2} ${y * 2}h2v2h-2z`; }); });
  return d;
}
const GOAT_SPRITE = `<svg class="goat-sprite" viewBox="0 0 48 40" aria-hidden="true" shape-rendering="crispEdges">
<rect x="12" y="23" width="20" height="10" fill="#b2b89b"/><rect x="13" y="21" width="18" height="10" fill="#d5d5b5"/>
<rect x="28" y="16" width="10" height="12" fill="#e6dfbf"/><rect x="32" y="20" width="2" height="2" fill="#425e53"/>
<rect x="13" y="31" width="3" height="7" fill="#78937c"/><rect x="26" y="31" width="3" height="7" fill="#78937c"/>
<rect x="29" y="12" width="2" height="4" fill="#958766"/><rect x="28" y="9" width="2" height="3" fill="#958766"/>
<rect x="35" y="12" width="2" height="4" fill="#958766"/><rect x="36" y="9" width="2" height="3" fill="#958766"/>
<rect x="35" y="27" width="2" height="4" fill="#dbd8b7"/><rect x="9" y="23" width="5" height="2" fill="#c5caab"/></svg>`;

export function icon(type, cls = '') {
  if (type === 'goat-sprite') return GOAT_SPRITE;
  const d = PATHS[type] || (GRIDS[type] ? gridPath(GRIDS[type]) : PATHS.star);
  return `<svg class="pixel-icon ${cls}" viewBox="0 0 18 18" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" fill-rule="evenodd" d="${d}"/></svg>`;
}
export const iconEl = (type, cls) => h('span', { class: 'icon-wrap', html: icon(type, cls) });
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); });
}

// ---------- result tables ----------
export function resultTable(result, opts = {}) {
  const limit = opts.limit || 200;
  const wrap = h('div', { class: 'result' });
  if (!result) return wrap;
  if (result.message) { wrap.append(h('p', { class: 'result-msg' }, result.message)); return wrap; }
  const rows = result.values;
  const table = h('table', { class: 'grid' });
  table.append(h('thead', null, h('tr', null, h('th', { class: 'rownum' }, '#'), result.columns.map(c => h('th', null, c)))));
  const tbody = h('tbody');
  const fill = (from, to) => {
    for (let i = from; i < Math.min(to, rows.length); i++) {
      tbody.append(h('tr', null, h('td', { class: 'rownum' }, i + 1), rows[i].map(v => h('td', { class: v === null ? 'null' : typeof v === 'number' ? 'num' : null }, v === null ? 'NULL' : typeof v === 'number' ? fmtNum(v) : String(v)))));
    }
  };
  fill(0, limit);
  table.append(tbody);
  const scroller = h('div', { class: 'grid-scroll' }, table);
  wrap.append(scroller);
  const meta = h('p', { class: 'result-meta' }, `${rows.length.toLocaleString()} row${rows.length === 1 ? '' : 's'}${result.truncated ? ' (stopped at the cap)' : ''}`);
  if (rows.length > limit) {
    let shown = limit;
    const more = h('button', { class: 'link-under small', type: 'button', onclick: () => { fill(shown, shown + 500); shown += 500; if (shown >= rows.length) more.remove(); } }, 'show more rows');
    meta.append(' · ', more);
  }
  wrap.append(meta);
  return wrap;
}
const fmtNum = v => (Number.isInteger(v) ? String(v) : String(+v.toFixed(6)));

// ---------- toast ----------
export function toast({ title, text, kicker = 'A SMALL DISCOVERY', iconType = 'star', ms = 5200 }) {
  const layer = document.querySelector('.toast-layer');
  const el = h('div', { class: 'toast', role: 'status' },
    h('span', { class: 'toast-icon', html: icon(iconType) }),
    h('div', null, h('small', null, kicker), h('strong', null, title), text ? h('p', null, text) : null),
    h('button', { type: 'button', 'aria-label': 'Dismiss', onclick: () => el.remove() }, '×'));
  layer.append(el);
  setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 400); }, ms);
}

// ---------- modal ----------
let lastFocus = null;
export function openModal(build, { wide = false } = {}) {
  const layer = document.getElementById('modal');
  const body = layer.querySelector('.modal-body');
  body.replaceChildren();
  build(body);
  layer.querySelector('.modal').classList.toggle('wide', wide);
  lastFocus = document.activeElement;
  layer.hidden = false;
  document.body.classList.add('modal-open');
  (layer.querySelector('[autofocus]') || layer.querySelector('.modal-close')).focus();
}
export function closeModal() {
  const layer = document.getElementById('modal');
  if (layer.hidden) return;
  layer.hidden = true;
  document.body.classList.remove('modal-open');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
export function initModal() {
  const layer = document.getElementById('modal');
  layer.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !layer.hidden) closeModal(); });
}

export function confirmModal({ title, text, yes = 'Yes', no = 'Cancel' }) {
  return new Promise(resolve => {
    let answered = false;
    openModal(body => {
      body.append(
        h('h2', { id: 'modalTitle' }, title),
        text ? h('p', { class: 'modal-text' }, text) : null,
        h('div', { class: 'modal-actions' },
          h('button', { class: 'btn primary', type: 'button', autofocus: true, onclick: () => { answered = true; closeModal(); resolve(true); } }, yes),
          h('button', { class: 'btn', type: 'button', onclick: () => { answered = true; closeModal(); resolve(false); } }, no)));
    });
    const layer = document.getElementById('modal');
    const obs = new MutationObserver(() => { if (layer.hidden) { obs.disconnect(); if (!answered) resolve(false); } });
    obs.observe(layer, { attributes: true, attributeFilter: ['hidden'] });
  });
}

export const levelName = l => ['', 'warm-up', 'solid', 'boss'][l] || '';
export function levelDots(l) {
  return h('span', { class: `level level-${l}`, title: levelName(l), 'aria-label': `Level: ${levelName(l)}` },
    [1, 2, 3].map(i => h('i', { class: i <= l ? 'on' : null })), h('span', null, levelName(l)));
}

export const TOPIC_NAMES = {
  basics: 'SELECT basics', filter: 'Filtering', agg: 'Aggregates', group: 'GROUP BY & HAVING', join: 'Joins',
  subq: 'Subqueries', func: 'Functions & CASE', set: 'UNION', dml: 'Changing data', window: 'Window functions',
};

export function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
export function plural(n, word, pl) { return `${n} ${n === 1 ? word : (pl || word + 's')}`; }
export function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
