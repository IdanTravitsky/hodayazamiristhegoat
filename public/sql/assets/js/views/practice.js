import { h, icon, md, highlightSql, resultTable, TOPIC_NAMES, levelDots, levelName, go, query, confirmModal } from '../ui.js';
import * as store from '../store.js';
import * as sql from '../sqlclient.js';
import { lastTable } from '../grader.js';
import { C, exerciseById } from '../content.js';
import { createWorkbench } from '../workbench.js';
import { schemaDrawer } from './schema-drawer.js';

const FILTER_KEY = 'hodaya-sql-practice-filter';

export function renderPractice(main) {
  const d = store.data();
  const q = query();
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(FILTER_KEY) || '{}'); } catch (e) { /* ignore */ }
  const f = { topic: q.get('topic') || saved.topic || 'all', level: saved.level || 0, status: saved.status || 'all' };
  const list = h('ol', { class: 'ex-list ledger' });
  const count = h('p', { class: 'hand-note' });
  const topics = Object.keys(TOPIC_NAMES).filter(t => C.exercises.some(e => e.topic === t));

  const topicBar = h('div', { class: 'filter-row', role: 'group', 'aria-label': 'Topic' });
  const levelBar = h('div', { class: 'filter-row small', role: 'group', 'aria-label': 'Level' });
  const statusBar = h('div', { class: 'filter-row small', role: 'group', 'aria-label': 'Status' });

  function chip(label, active, onclick, extra) {
    return h('button', { type: 'button', class: 'chip' + (active ? ' active' : ''), 'aria-pressed': active ? 'true' : 'false', onclick }, label, extra ? h('small', null, extra) : null);
  }
  function draw() {
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(f)); } catch (e) { /* ignore */ }
    topicBar.replaceChildren(
      chip('All', f.topic === 'all', () => { f.topic = 'all'; draw(); }, `${C.exercises.filter(e => d.solved[e.id]).length}/${C.exercises.length}`),
      ...topics.map(t => {
        const all = C.exercises.filter(e => e.topic === t);
        return chip(TOPIC_NAMES[t], f.topic === t, () => { f.topic = t; draw(); }, `${all.filter(e => d.solved[e.id]).length}/${all.length}`);
      }));
    levelBar.replaceChildren(h('span', { class: 'filter-label' }, 'Level'),
      chip('any', !f.level, () => { f.level = 0; draw(); }),
      ...[1, 2, 3].map(l => chip(levelName(l), f.level === l, () => { f.level = l; draw(); })));
    statusBar.replaceChildren(h('span', { class: 'filter-label' }, 'Show'),
      chip('everything', f.status === 'all', () => { f.status = 'all'; draw(); }),
      chip('not solved', f.status === 'open', () => { f.status = 'open'; draw(); }),
      chip('solved', f.status === 'done', () => { f.status = 'done'; draw(); }));
    const items = C.exercises.filter(e => (f.topic === 'all' || e.topic === f.topic) && (!f.level || e.level === f.level)
      && (f.status === 'all' || (f.status === 'done') === !!d.solved[e.id]));
    count.textContent = items.length ? `${items.length} exercise${items.length === 1 ? '' : 's'} here. ${items.filter(e => d.solved[e.id]).length} solved.` : 'nothing matches. loosen the filters?';
    list.replaceChildren(...items.map(e => {
      const n = C.exercises.indexOf(e) + 1;
      const s = d.solved[e.id];
      const tried = d.tries[e.id] && !s;
      return h('li', null, h('a', { class: 'ledger-row' + (s ? ' complete' : tried ? ' tried' : ''), href: `#/practice/${e.id}` },
        h('span', { class: 'ledger-num' }, String(n).padStart(2, '0')),
        h('span', { class: 'ledger-main' }, h('strong', null, e.title), h('small', null, TOPIC_NAMES[e.topic])),
        levelDots(e.level),
        h('span', { class: 'ledger-meta' }, s ? (s.tries === 1 ? 'first try' : `${s.tries} tries`) : tried ? `${d.tries[e.id]} tries so far` : ''),
        h('span', { class: 'ledger-mark', html: s ? icon('check') : '' })));
    }));
  }

  const nextOpen = C.exercises.find(e => !d.solved[e.id]);
  main.append(
    h('section', { class: 'page-head' },
      h('p', { class: 'little-intro' }, h('span', { class: 'tiny-star', html: icon('pencil') }), 'Step 3 · where the points are'),
      h('h1', null, 'Practice', h('span', { class: 'title-dot' }, '.')),
      h('p', { class: 'lead' }, 'Each exercise is checked against the real answer as soon as you run it. Column order and column names don\'t matter, the rows and values do. Three levels: warm-up, solid, and boss.'),
      nextOpen ? h('a', { class: 'continue-link', href: `#/practice/${nextOpen.id}` }, `Pick up where you are: ${nextOpen.title}`, h('span', { 'aria-hidden': 'true' }, '→')) : h('p', { class: 'hand-note' }, 'everything solved. go take a mock exam, champ.')),
    h('section', { class: 'filters' }, topicBar, h('div', { class: 'filter-split' }, levelBar, statusBar)),
    count,
    list);
  draw();
}

export function renderExercise(main, id) {
  const ex = exerciseById(id);
  if (!ex) { go('practice'); return; }
  const idx = C.exercises.indexOf(ex);
  const d = store.data();
  const sameTopic = C.exercises.filter(e => e.topic === ex.topic);
  const next = C.exercises.slice(idx + 1).find(e => !d.solved[e.id]) || C.exercises[idx + 1];
  const prev = C.exercises[idx - 1];

  const hintsBox = h('div', { class: 'hints' });
  const extra = h('div', { class: 'extra' });
  const after = h('div', { class: 'after-solve' });
  let shownHints = d.hintsSeen[ex.id] || 0;

  const bench = createWorkbench({
    mode: 'check', exercise: ex, initial: d.drafts[ex.id] || '', autofocus: window.innerWidth > 900,
    onDraft: v => store.quietly(x => { if (v.trim()) x.drafts[ex.id] = v; else delete x.drafts[ex.id]; }),
    onChecked: ({ ok, sql: text }) => {
      let tries = 0;
      store.update(x => {
        x.tries[ex.id] = (x.tries[ex.id] || 0) + 1;
        tries = x.tries[ex.id];
        if (ok && !x.solved[ex.id]) x.solved[ex.id] = { at: Date.now(), tries, hints: x.hintsSeen[ex.id] || 0, revealed: !!x.revealed[ex.id], sql: text };
        else if (ok) x.solved[ex.id].sql = text;
      });
      if (ok) showAfter();
      drawStatus();
      return tries;
    },
  });

  const status = h('span', { class: 'ex-status' });
  function drawStatus() {
    const s = store.data().solved[ex.id];
    const t = store.data().tries[ex.id] || 0;
    status.replaceChildren(s ? h('span', { class: 'solved-badge' }, h('span', { html: icon('check') }), 'solved') : t ? `${t} ${t === 1 ? 'try' : 'tries'}` : 'not tried yet');
  }

  function drawHints() {
    const hints = ex.hints || [];
    const items = hints.slice(0, shownHints).map((x, i) => h('li', { class: 'hint' }, h('span', { class: 'hint-num' }, `hint ${i + 1}`), h('div', { class: 'md', html: md(x) })));
    const more = shownHints < hints.length ? h('button', { class: 'btn small', type: 'button', onclick: () => {
      shownHints++;
      store.update(x => { x.hintsSeen[ex.id] = Math.max(x.hintsSeen[ex.id] || 0, shownHints); });
      drawHints();
    } }, h('span', { html: icon('key') }), shownHints ? `Another hint (${shownHints}/${hints.length})` : `Need a hint? (${hints.length})`) : null;
    hintsBox.replaceChildren(items.length ? h('ol', { class: 'hint-list' }, items) : '', more || '');
  }

  async function peek() {
    const o = await sql.expectedFor(ex);
    const t = lastTable(o);
    if (!t) return;
    extra.replaceChildren(h('div', { class: 'peek-box' },
      h('p', { class: 'small-label' }, `Expected result · ${t.values.length} row${t.values.length === 1 ? '' : 's'}${ex.ordered ? ' · order matters' : ''}`),
      resultTable(t, { limit: 6 }),
      t.values.length > 6 ? h('p', { class: 'small-print' }, 'showing the first 6 rows.') : null));
  }

  async function reveal() {
    const s = store.data().solved[ex.id];
    if (!s) {
      const yes = await confirmModal({ title: 'Show the solution?', text: 'It still counts if you solve it afterwards, it just won\'t be a "no hints" solve. Sometimes reading one is exactly how it clicks.', yes: 'Show it', no: 'Let me try more' });
      if (!yes) return;
      store.update(x => { x.revealed[ex.id] = true; });
    }
    showSolution();
  }
  function showSolution() {
    after.replaceChildren(h('div', { class: 'solution' },
      h('p', { class: 'small-label' }, 'One good solution'),
      h('pre', { class: 'code', html: highlightSql(ex.solution) }),
      ex.alt ? [].concat(ex.alt).map(a => h('div', null, h('p', { class: 'small-label' }, 'Also correct'), h('pre', { class: 'code', html: highlightSql(a) }))) : null,
      h('div', { class: 'md explain', html: md(ex.explain) }),
      ex.check ? h('p', { class: 'small-print' }, 'Checked with: ', h('code', null, ex.check)) : null));
  }
  function showAfter() {
    showSolution();
    const s = store.data().solved[ex.id];
    after.prepend(h('div', { class: 'solved-note' },
      h('p', { class: 'hand-note' }, s && s.tries === 1 ? 'first try. noted.' : 'solved. this one is yours now.'),
      next ? h('a', { class: 'btn primary', href: `#/practice/${next.id}` }, 'Next exercise', h('span', { 'aria-hidden': 'true' }, '→')) : h('a', { class: 'btn primary', href: '#/exam' }, 'All done. Mock exam?')));
  }

  const posInTopic = sameTopic.indexOf(ex) + 1;
  main.append(
    h('div', { class: 'ex-top' },
      h('p', { class: 'little-intro' },
        h('a', { href: '#/practice', class: 'crumb' }, 'Practice'), h('span', null, '/'),
        h('a', { href: `#/practice?topic=${ex.topic}`, class: 'crumb' }, TOPIC_NAMES[ex.topic]), h('span', null, '/'),
        `${posInTopic} of ${sameTopic.length}`),
      h('div', { class: 'ex-nav' },
        prev ? h('a', { class: 'link-under small', href: `#/practice/${prev.id}` }, '← previous') : null,
        next ? h('a', { class: 'link-under small', href: `#/practice/${next.id}` }, 'skip →') : null)),
    h('div', { class: 'ex-layout' },
      h('section', { class: 'ex-brief' },
        h('div', { class: 'ex-title-row' }, levelDots(ex.level), status),
        h('h1', { class: 'ex-title' }, ex.title),
        h('div', { class: 'md prompt', html: md(ex.prompt) }),
        ex.ordered ? h('p', { class: 'order-note' }, h('span', { html: icon('spark') }), 'Order matters in this one.') : null,
        ex.check ? h('p', { class: 'order-note' }, h('span', { html: icon('spark') }), 'This one changes data. It runs on a fresh copy each time, so experiment freely.') : null,
        hintsBox,
        h('div', { class: 'brief-actions' },
          h('button', { class: 'link-under small', type: 'button', onclick: peek }, 'peek at the expected output'),
          h('button', { class: 'link-under small', type: 'button', onclick: reveal }, 'show solution')),
        extra,
        schemaDrawer(bench)),
      h('section', { class: 'ex-work' }, bench.el, after)));

  drawStatus();
  drawHints();
  if (d.solved[ex.id]) showAfter();
  setTimeout(() => bench.refresh(), 0);
}
