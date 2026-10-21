import { h, icon, confirmModal, toast, timeAgo } from '../ui.js';
import * as store from '../store.js';
import * as sql from '../sqlclient.js';
import { createWorkbench } from '../workbench.js';
import { schemaDrawer } from './schema-drawer.js';

export const EXAMPLES = [
  ['Look around', 'SHOW TABLES;\nDESCRIBE Track;'],
  ['Top 10 longest tracks', 'SELECT Name, ROUND(Milliseconds / 60000, 2) AS Minutes\nFROM Track\nORDER BY Milliseconds DESC\nLIMIT 10;'],
  ['Sales per year', 'SELECT YEAR(InvoiceDate) AS Year, COUNT(*) AS Invoices, SUM(Total) AS Revenue\nFROM Invoice\nGROUP BY YEAR(InvoiceDate)\nORDER BY Year;'],
  ['Who reports to whom', "SELECT CONCAT(e.FirstName, ' ', e.LastName) AS Employee,\n       CONCAT(m.FirstName, ' ', m.LastName) AS Manager\nFROM Employee e\nLEFT JOIN Employee m ON m.EmployeeId = e.ReportsTo;"],
  ['Best-selling genres', 'SELECT g.Name AS Genre, COUNT(*) AS TracksSold\nFROM InvoiceLine il\nJOIN Track t ON t.TrackId = il.TrackId\nJOIN Genre g ON g.GenreId = t.GenreId\nGROUP BY g.GenreId, g.Name\nORDER BY TracksSold DESC;'],
  ['Make a view', "CREATE VIEW CustomerSpend AS\nSELECT c.CustomerId, c.FirstName, c.LastName, SUM(i.Total) AS Spent\nFROM Customer c\nJOIN Invoice i ON i.CustomerId = c.CustomerId\nGROUP BY c.CustomerId, c.FirstName, c.LastName;\n\nSELECT * FROM CustomerSpend ORDER BY Spent DESC LIMIT 5;"],
  ['Change something', "UPDATE Track SET UnitPrice = 0.49 WHERE GenreId = 2;\nSELECT Name, UnitPrice FROM Track WHERE GenreId = 2 LIMIT 5;"],
];

export function renderPlayground(main) {
  const prefill = sessionStorage.getItem('hodaya-sql-prefill');
  sessionStorage.removeItem('hodaya-sql-prefill');
  const d = store.data();
  const historyBox = h('ol', { class: 'history-list' });

  const bench = createWorkbench({
    mode: 'sandbox', initial: prefill || d.drafts.__playground || '', minLines: 10, autofocus: true,
    placeholder: 'Anything goes here.  SELECT, INSERT, CREATE VIEW…  (Ctrl+Enter to run)',
    onDraft: v => store.quietly(x => { x.drafts.__playground = v; }),
    onRan: (o, text) => {
      store.update(x => {
        x.history = [text.trim(), ...x.history.filter(s => s !== text.trim())].slice(0, 40);
        x.historyAt = { ...(x.historyAt || {}), [text.trim()]: Date.now() };
      });
      drawHistory();
    },
  });

  function drawHistory() {
    const x = store.data();
    historyBox.replaceChildren(...(x.history.length ? x.history.slice(0, 15).map(s => h('li', null, h('button', {
      type: 'button', class: 'history-item', title: s, onclick: () => { bench.setValue(s); bench.editor.focus(); },
    }, h('code', null, s.replace(/\s+/g, ' ').slice(0, 90)), x.historyAt?.[s] ? h('small', null, timeAgo(x.historyAt[s])) : null))) : [h('li', { class: 'small-print' }, 'Your queries will show up here.')]));
  }

  const reset = h('button', { class: 'btn ghost small', type: 'button', onclick: async () => {
    const yes = await confirmModal({ title: 'Reset the playground database?', text: 'Everything you inserted, updated, deleted or created here goes back to the original Chinook data. Your progress and history stay.', yes: 'Reset it', no: 'Cancel' });
    if (!yes) return;
    await sql.resetSandbox();
    bench.clearOutput();
    toast({ kicker: 'PLAYGROUND', title: 'Fresh Chinook.', text: 'Back to the original data.', iconType: 'spark', ms: 2600 });
  } }, h('span', { html: icon('trash') }), 'Reset database');

  main.append(
    h('section', { class: 'page-head compact' },
      h('p', { class: 'little-intro' }, h('span', { class: 'tiny-star', html: icon('table') }), 'free play'),
      h('h1', null, 'Playground', h('span', { class: 'title-dot' }, '.')),
      h('p', { class: 'lead' }, 'Run anything. Changes stick here (until you reset), so this is the place to try INSERT, UPDATE, DELETE and CREATE VIEW. Several statements at once are fine, separate them with ;')),
    h('div', { class: 'play-layout' },
      h('section', { class: 'play-main' }, bench.el, h('div', { class: 'play-tools' }, reset)),
      h('aside', { class: 'play-side' },
        schemaDrawer(bench, { open: true, title: 'Tables' }),
        h('details', { class: 'side-box', open: true },
          h('summary', null, 'Examples to start from'),
          h('ul', { class: 'example-list' }, EXAMPLES.map(([name, s]) => h('li', null, h('button', { type: 'button', class: 'link-under small', onclick: () => { bench.setValue(s); bench.run(); } }, name))))),
        h('details', { class: 'side-box', open: true },
          h('summary', null, 'Recent queries'),
          historyBox))));
  drawHistory();
  setTimeout(() => { bench.refresh(); if (prefill) bench.run(); }, 0);
}
