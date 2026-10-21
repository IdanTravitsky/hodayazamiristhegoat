// Compact table/column reference next to an editor. Click a name to type it in.
import { h } from '../ui.js';
import * as sql from '../sqlclient.js';
import { insertAtCursor } from '../editor.js';

const ORDER = ['Artist', 'Album', 'Track', 'Genre', 'MediaType', 'Playlist', 'PlaylistTrack', 'Employee', 'Customer', 'Invoice', 'InvoiceLine'];

export function schemaDrawer(bench, { open = false, title = 'Chinook at a glance' } = {}) {
  const body = h('div', { class: 'drawer-body' });
  function draw() {
    const s = sql.schema();
    if (!s) return;
    const tables = [...s.tables].sort((a, b) => (ORDER.indexOf(a.name) + 1 || 99) - (ORDER.indexOf(b.name) + 1 || 99));
    body.replaceChildren(...tables.map(t => {
      const fk = new Map(t.fks.map(f => [f.from, f.table]));
      return h('div', { class: 'drawer-table' },
        h('button', { type: 'button', class: 'drawer-name', title: `Insert ${t.name}`, onclick: () => bench && insertAtCursor(bench.editor, t.name) }, t.name),
        h('span', { class: 'drawer-cols' }, t.columns.map(c => h('button', {
          type: 'button', class: 'drawer-col' + (c.pk ? ' pk' : '') + (fk.has(c.name) ? ' fk' : ''),
          title: c.pk ? 'primary key' : fk.has(c.name) ? `links to ${fk.get(c.name)}` : '',
          onclick: () => bench && insertAtCursor(bench.editor, c.name),
        }, c.name))));
    }));
  }
  draw();
  const off = sql.onSchema(draw);
  const el = h('details', { class: 'schema-drawer', open: open ? true : null },
    h('summary', null, title, h('small', null, ' · click a name to insert it')),
    body,
    h('p', { class: 'small-print' }, h('span', { class: 'drawer-col pk legend' }, 'key'), ' primary key  ', h('span', { class: 'drawer-col fk legend' }, 'link'), ' foreign key · ', h('a', { class: 'link-under', href: '#/chinook' }, 'full map')));
  el.addEventListener('toggle', () => { if (!document.body.contains(el)) off(); });
  return el;
}
