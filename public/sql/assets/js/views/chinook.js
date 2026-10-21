import { h, icon, md, esc, highlightSql, resultTable, go } from '../ui.js';
import * as store from '../store.js';
import * as sql from '../sqlclient.js';
import { STORY, TABLES, SAKILA, GOTCHAS, JOIN_PATHS, LAYOUT } from '../content/schema.js';

const W = 172, HEAD = 30, ROW = 19;
const mysqlType = t => (window.SqlEngine ? window.SqlEngine.mysqlType(t) : t);

function geometry(schema) {
  const g = {};
  for (const t of schema.tables) {
    const L = LAYOUT[t.name];
    if (!L) continue;
    const more = t.columns.length - L.show.length;
    const rows = L.show.length + (more > 0 ? 1 : 0);
    g[t.name] = { ...L, w: W, h: HEAD + rows * ROW, more, table: t };
  }
  return g;
}
const rowY = (g, table, col) => g[table].y + HEAD + g[table].show.indexOf(col) * ROW + ROW / 2;
const left = (g, t) => g[t].x, right = (g, t) => g[t].x + W, bottom = (g, t) => g[t].y + g[t].h;

// FK -> PK edges with hand-routed waypoints (no crossings).
function edges(g) {
  const E = [];
  const add = (from, to, pts, manyAt, oneAt) => E.push({ from, to, pts, manyAt, oneAt });
  // [x,y] points; manyAt/oneAt: {x,y,dir} where dir is the direction the line enters the box
  {
    const y1 = rowY(g, 'Album', 'ArtistId'), y2 = rowY(g, 'Artist', 'ArtistId');
    add('Album', 'Artist', [[left(g, 'Album'), y1], [207, y1], [207, y2], [right(g, 'Artist'), y2]], 'start-left', 'end-right');
  }
  {
    const y1 = rowY(g, 'Track', 'AlbumId'), y2 = rowY(g, 'Album', 'AlbumId');
    add('Track', 'Album', [[left(g, 'Track'), y1], [417, y1], [417, y2], [right(g, 'Album'), y2]], 'start-left', 'end-right');
  }
  {
    const y1 = rowY(g, 'Track', 'MediaTypeId'), y2 = rowY(g, 'MediaType', 'MediaTypeId');
    add('Track', 'MediaType', [[right(g, 'Track'), y1], [620, y1], [620, y2], [left(g, 'MediaType'), y2]], 'start-right', 'end-left');
  }
  {
    const y1 = rowY(g, 'Track', 'GenreId'), y2 = rowY(g, 'Genre', 'GenreId');
    add('Track', 'Genre', [[right(g, 'Track'), y1], [632, y1], [632, y2], [left(g, 'Genre'), y2]], 'start-right', 'end-left');
  }
  {
    const y1 = rowY(g, 'PlaylistTrack', 'PlaylistId'), y2 = rowY(g, 'Playlist', 'PlaylistId');
    add('PlaylistTrack', 'Playlist', [[left(g, 'PlaylistTrack'), y1], [right(g, 'Playlist'), y2]], 'start-left', 'end-right');
  }
  {
    const y1 = rowY(g, 'PlaylistTrack', 'TrackId'), yb = bottom(g, 'Track');
    add('PlaylistTrack', 'Track', [[right(g, 'PlaylistTrack'), y1], [417, y1], [417, 252], [478, 252], [478, yb]], 'start-right', 'end-bottom');
  }
  {
    const yt = g.InvoiceLine.y, yb = bottom(g, 'Track');
    add('InvoiceLine', 'Track', [[540, yt], [540, yb]], 'start-top', 'end-bottom');
  }
  {
    const y1 = rowY(g, 'InvoiceLine', 'InvoiceId'), y2 = rowY(g, 'Invoice', 'InvoiceId');
    add('InvoiceLine', 'Invoice', [[right(g, 'InvoiceLine'), y1], [627, y1], [627, y2], [left(g, 'Invoice'), y2]], 'start-right', 'end-left');
  }
  {
    const y1 = rowY(g, 'Invoice', 'CustomerId'), y2 = rowY(g, 'Customer', 'CustomerId');
    add('Invoice', 'Customer', [[right(g, 'Invoice'), y1], [837, y1], [837, y2], [left(g, 'Customer'), y2]], 'start-right', 'end-left');
  }
  {
    const y1 = rowY(g, 'Customer', 'SupportRepId'), y2 = rowY(g, 'Employee', 'EmployeeId');
    add('Customer', 'Employee', [[right(g, 'Customer'), y1], [1046, y1], [1046, y2], [right(g, 'Employee'), y2]], 'start-right', 'end-right');
  }
  {
    const y1 = rowY(g, 'Employee', 'ReportsTo'), y2 = rowY(g, 'Employee', 'EmployeeId');
    add('Employee', 'Employee', [[left(g, 'Employee'), y1], [840, y1], [840, y2], [left(g, 'Employee'), y2]], 'start-left', 'end-left');
  }
  return E;
}

function crowFoot([x, y], side) {
  // three short lines fanning into the box on the "many" end
  const d = 9;
  if (side.endsWith('left')) return `M${x - d} ${y}L${x} ${y - 5}M${x - d} ${y}L${x} ${y}M${x - d} ${y}L${x} ${y + 5}`;
  if (side.endsWith('right')) return `M${x + d} ${y}L${x} ${y - 5}M${x + d} ${y}L${x} ${y}M${x + d} ${y}L${x} ${y + 5}`;
  if (side.endsWith('top')) return `M${x} ${y - d}L${x - 5} ${y}M${x} ${y - d}L${x} ${y}M${x} ${y - d}L${x + 5} ${y}`;
  return `M${x} ${y + d}L${x - 5} ${y}M${x} ${y + d}L${x} ${y}M${x} ${y + d}L${x + 5} ${y}`;
}
function oneBar([x, y], side) {
  const d = 7;
  if (side.endsWith('left')) return `M${x - d} ${y - 5}V${y + 5}`;
  if (side.endsWith('right')) return `M${x + d} ${y - 5}V${y + 5}`;
  if (side.endsWith('bottom')) return `M${x - 5} ${y + d}H${x + 5}`;
  return `M${x - 5} ${y - d}H${x + 5}`;
}

function erdSvg(schema, selected) {
  const g = geometry(schema);
  const E = edges(g);
  const related = new Set([selected]);
  E.forEach(e => { if (e.from === selected || e.to === selected) { related.add(e.from); related.add(e.to); } });
  let s = `<svg class="erd" viewBox="0 0 1060 530" role="img" aria-label="Chinook schema diagram: 11 tables and how they connect">`;
  s += '<g class="edges">';
  for (const e of E) {
    const on = selected && (e.from === selected || e.to === selected);
    const cls = selected ? (on ? 'edge on' : 'edge dim') : 'edge';
    const d = 'M' + e.pts.map(p => p.join(' ')).join('L');
    s += `<g class="${cls}"><path d="${d}"/><path class="mark" d="${crowFoot(e.pts[0], e.manyAt)}"/><path class="mark" d="${oneBar(e.pts[e.pts.length - 1], e.oneAt)}"/></g>`;
  }
  s += '</g>';
  for (const [name, b] of Object.entries(g)) {
    const t = b.table;
    const fk = new Set(t.fks.map(f => f.from));
    const state = !selected ? '' : name === selected ? ' selected' : related.has(name) ? ' related' : ' dim';
    s += `<g class="box${state}" data-table="${name}" tabindex="0" role="button" aria-label="${name} table, ${t.count} rows">`;
    s += `<rect class="box-bg" x="${b.x}" y="${b.y}" width="${W}" height="${b.h}"/>`;
    s += `<rect class="box-head" x="${b.x}" y="${b.y}" width="${W}" height="${HEAD}"/>`;
    s += `<text class="box-title" x="${b.x + 10}" y="${b.y + 20}">${name}</text>`;
    s += `<text class="box-count" x="${b.x + W - 10}" y="${b.y + 20}" text-anchor="end">${t.count.toLocaleString()}</text>`;
    b.show.forEach((c, i) => {
      const col = t.columns.find(x => x.name === c);
      const y = b.y + HEAD + i * ROW + 13.5;
      const key = col?.pk ? 'PK' : fk.has(c) ? 'FK' : '';
      s += `<text class="col${col?.pk ? ' pk' : ''}${fk.has(c) ? ' fk' : ''}" x="${b.x + 10}" y="${y}">${esc(c)}</text>`;
      if (key) s += `<text class="key ${key.toLowerCase()}" x="${b.x + W - 10}" y="${y}" text-anchor="end">${col?.pk && fk.has(c) ? 'PK FK' : key}</text>`;
    });
    if (b.more > 0) s += `<text class="col more" x="${b.x + 10}" y="${b.y + HEAD + b.show.length * ROW + 13.5}">+ ${b.more} more</text>`;
    s += '</g>';
  }
  s += '</svg>';
  return s;
}

export function renderChinook(main, param) {
  const schema = sql.schema();
  const base = schema.tables.filter(t => LAYOUT[t.name]);
  let selected = param && base.some(t => t.name === param) ? param : null;

  const diagram = h('div', { class: 'erd-scroll' });
  const detail = h('section', { class: 'table-detail', 'aria-live': 'polite' });
  const picker = h('div', { class: 'table-picker', role: 'group', 'aria-label': 'Pick a table' });

  function markSeen(name) {
    const d = store.data();
    if (d && !d.tables.includes(name)) store.update(x => { x.tables.push(name); });
  }

  function draw() {
    diagram.innerHTML = erdSvg(schema, selected);
    diagram.querySelectorAll('.box').forEach(b => {
      const pickIt = () => select(b.dataset.table === selected ? null : b.dataset.table, true);
      b.addEventListener('click', pickIt);
      b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickIt(); } });
    });
    const seen = new Set(store.data()?.tables || []);
    picker.replaceChildren(...base.map(t => h('button', {
      type: 'button', class: 'chip' + (t.name === selected ? ' active' : '') + (seen.has(t.name) ? ' seen' : ''), 'aria-pressed': t.name === selected ? 'true' : 'false',
      onclick: () => select(t.name === selected ? null : t.name, true),
    }, t.name)));
  }

  function select(name, scroll) {
    selected = name;
    history.replaceState(null, '', name ? `#/chinook/${name}` : '#/chinook');
    if (name) markSeen(name);
    draw();
    renderDetail();
    if (scroll && name && window.innerWidth < 900) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderDetail() {
    if (!selected) {
      const seen = store.data()?.tables.length || 0;
      detail.replaceChildren(h('div', { class: 'detail-empty' },
        h('p', { class: 'hand-note' }, '↑ click any table to open it'),
        h('p', null, `You've opened ${seen} of ${base.length} tables.`)));
      return;
    }
    const t = schema.tables.find(x => x.name === selected);
    const info = TABLES[selected] || { cols: {}, facts: [] };
    const fks = t.fks;
    const incoming = schema.tables.flatMap(o => o.fks.filter(f => f.table === selected).map(f => ({ from: o.name, col: f.from, to: f.to })));
    const peek = h('div', { class: 'peek' });
    const alias = { Artist: 'ar', Album: 'al', Track: 't', Genre: 'g', MediaType: 'mt', Playlist: 'p', PlaylistTrack: 'pt', Employee: 'e', Customer: 'c', Invoice: 'i', InvoiceLine: 'il' };
    const joinLine = (a, ac, b, bc) => `JOIN ${b} ${alias[b]} ON ${alias[b]}.${bc} = ${alias[a]}.${ac}`;
    const links = [
      ...fks.map(f => ({ other: f.table, text: f.table === selected ? `${selected}.${f.from} points to another ${selected} (its manager)` : `each ${selected} has one ${f.table} (via ${f.from})`, sql: f.table === selected ? `FROM Employee e LEFT JOIN Employee m ON m.EmployeeId = e.ReportsTo` : `FROM ${selected} ${alias[selected]} ${joinLine(selected, f.from, f.table, f.to)}` })),
      ...incoming.filter(x => x.from !== selected).map(x => ({ other: x.from, text: `one ${selected} has many ${x.from} rows (${x.from}.${x.col})`, sql: `FROM ${selected} ${alias[selected]} JOIN ${x.from} ${alias[x.from]} ON ${alias[x.from]}.${x.col} = ${alias[selected]}.${x.to}` })),
    ];
    detail.replaceChildren(
      h('div', { class: 'detail-head' },
        h('h2', null, selected),
        h('p', { class: 'detail-meta' }, `${t.count.toLocaleString()} rows · ${t.columns.length} columns`, info.sakila ? h('span', { class: 'sakila-tag' }, `Sakila cousin: ${info.sakila}`) : null)),
      h('p', { class: 'detail-blurb' }, info.blurb || ''),
      h('div', { class: 'detail-grid' },
        h('div', null,
          h('h3', { class: 'mini-head' }, 'Columns'),
          h('div', { class: 'table-scroll' }, h('table', { class: 'cols-table' },
            h('thead', null, h('tr', null, h('th', null, 'Column'), h('th', null, 'Type'), h('th', null, 'Key'), h('th', null, 'Notes'))),
            h('tbody', null, t.columns.map(c => {
              const f = fks.find(x => x.from === c.name);
              return h('tr', null,
                h('td', null, h('code', null, c.name)),
                h('td', { class: 'type' }, mysqlType(c.type) + (c.notnull || c.pk ? '' : ' · null ok')),
                h('td', null, [c.pk ? h('span', { class: 'key-badge pk' }, 'PK') : null, f ? h('a', { class: 'key-badge fk', href: `#/chinook/${f.table}`, onclick: e => { e.preventDefault(); select(f.table, true); } }, `FK → ${f.table}`) : null]),
                h('td', { class: 'md small', html: md(info.cols[c.name] || '') }));
            }))))),
        h('div', null,
          h('h3', { class: 'mini-head' }, 'Good to know'),
          h('ul', { class: 'facts' }, (info.facts || []).map(f => h('li', { html: md(f) }))),
          links.length ? h('h3', { class: 'mini-head' }, 'How it connects') : null,
          h('ul', { class: 'links' }, links.map(l => h('li', null,
            h('button', { type: 'button', class: 'link-under', onclick: () => select(l.other, true) }, l.other), ': ', l.text,
            h('pre', { class: 'code small', html: highlightSql(l.sql) })))),
          h('div', { class: 'detail-actions' },
            h('button', { class: 'btn', type: 'button', onclick: async () => { peek.replaceChildren(h('p', { class: 'running-note' }, 'looking…')); const o = await sql.run(`SELECT * FROM ${selected} LIMIT 8`); peek.replaceChildren(resultTable(o.results[0])); } }, h('span', { html: icon('eye') }), 'Peek at 8 rows'),
            h('button', { class: 'btn ghost', type: 'button', onclick: () => { sessionStorage.setItem('hodaya-sql-prefill', `SELECT *\nFROM ${selected}\nLIMIT 20;`); go('playground'); } }, 'Open in Playground')))),
      peek);
  }

  main.append(
    h('section', { class: 'page-head' },
      h('p', { class: 'little-intro' }, h('span', { class: 'tiny-star', html: icon('map') }), 'Step 1 · the map'),
      h('h1', null, 'Meet Chinook', h('span', { class: 'title-dot' }, '.')),
      h('div', { class: 'lead md', html: md(STORY) })),
    h('section', { class: 'erd-section' },
      h('div', { class: 'section-intro' }, h('h2', null, 'The whole thing, on one page'), h('p', null, 'crow\'s foot = the "many" side. click a table.')),
      picker,
      diagram,
      detail),
    h('section', { class: 'sakila-section' },
      h('div', { class: 'section-intro' }, h('h2', null, 'Coming from Sakila'), h('p', null, 'same ideas, new names.')),
      h('div', { class: 'table-scroll' }, h('table', { class: 'map-table' },
        h('thead', null, h('tr', null, h('th', null, 'In Sakila'), h('th', null, 'In Chinook'), h('th', null, 'Note'))),
        h('tbody', null, SAKILA.map(([a, b, n]) => h('tr', null, h('td', null, h('code', null, a)), h('td', null, h('code', null, b)), h('td', null, n))))))),
    h('section', { class: 'gotcha-section' },
      h('div', { class: 'section-intro' }, h('h2', null, 'Traps worth knowing'), h('p', null, 'the stuff exam questions like to poke at.')),
      h('ol', { class: 'gotchas' }, GOTCHAS.map(g => h('li', null, h('strong', null, g.t), h('div', { class: 'md', html: md(g.d) }))))),
    h('section', { class: 'paths-section' },
      h('div', { class: 'section-intro' }, h('h2', null, 'Join paths you will use a lot'), h('p', null, 'copy, run, tweak.')),
      h('div', { class: 'paths' }, JOIN_PATHS.map(p => {
        const out = h('div');
        return h('div', { class: 'path' },
          h('h3', null, p.q),
          h('pre', { class: 'code', html: highlightSql(p.sql) }),
          h('div', { class: 'path-actions' },
            h('button', { class: 'btn small', type: 'button', onclick: async () => { const o = await sql.run(p.sql); out.replaceChildren(resultTable(o.results[0], { limit: 10 })); } }, h('span', { html: icon('play') }), 'Run'),
            h('button', { class: 'link-under small', type: 'button', onclick: () => { sessionStorage.setItem('hodaya-sql-prefill', p.sql); go('playground'); } }, 'edit in playground')),
          out);
      }))),
  );
  draw();
  renderDetail();
  if (selected) markSeen(selected);
}
