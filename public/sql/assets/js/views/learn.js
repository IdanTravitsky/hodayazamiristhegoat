import { h, icon, md, highlightSql, resultTable, TOPIC_NAMES, levelDots, go } from '../ui.js';
import * as store from '../store.js';
import * as sql from '../sqlclient.js';
import { C, lessonById } from '../content.js';
import { createWorkbench } from '../workbench.js';

export function renderLearn(main) {
  const d = store.data();
  const done = C.lessons.filter(l => d.lessons[l.id]).length;
  main.append(
    h('section', { class: 'page-head' },
      h('p', { class: 'little-intro' }, h('span', { class: 'tiny-star', html: icon('book') }), 'Step 2 · refresh'),
      h('h1', null, 'Learn', h('span', { class: 'title-dot' }, '.')),
      h('p', { class: 'lead' }, 'Short refreshers, every example runs on Chinook. You saw all of this on Sakila; this is the same SQL with the new tables, plus the traps the exam likes.'),
      h('p', { class: 'hand-note' }, `${done} of ${C.lessons.length} read. skim what you know, slow down where it hurts.`)),
    C.lessons.length ? h('ol', { class: 'lesson-list ledger' }, C.lessons.map((l, i) => h('li', null,
      h('a', { class: 'ledger-row' + (d.lessons[l.id] ? ' complete' : ''), href: `#/learn/${l.id}` },
        h('span', { class: 'ledger-num' }, String(i + 1).padStart(2, '0')),
        h('span', { class: 'ledger-main' }, h('strong', null, l.title), h('small', null, l.blurb)),
        h('span', { class: 'ledger-meta' }, l.topic === 'window' ? 'bonus · ' : '', `${l.minutes || 5} min`),
        h('span', { class: 'ledger-mark', html: d.lessons[l.id] ? icon('check') : '' }))))) : h('p', { class: 'hand-note' }, 'lessons are on their way.'));
}

export function exampleBlock(x) {
  const out = h('div', { class: 'example-out' });
  const code = h('pre', { class: 'code', html: highlightSql(x.sql) });
  const wrap = h('div', { class: 'example' });
  let bench = null;
  const runBtn = h('button', { class: 'btn small', type: 'button' }, h('span', { html: icon('play') }), 'Run');
  const editBtn = h('button', { class: 'link-under small', type: 'button' }, 'edit it');
  runBtn.addEventListener('click', async () => {
    out.replaceChildren(h('p', { class: 'running-note' }, 'running…'));
    const o = await sql.run(x.sql);
    const parts = [];
    if (o.error) parts.push(h('div', { class: 'verdict bad' }, h('div', { class: 'verdict-head' }, h('span', { html: icon('cross') }), h('strong', null, o.error.title)), h('div', { class: 'md', html: md(o.error.tip) })));
    (o.notes || []).forEach(n => parts.push(h('div', { class: 'note' + (n.blocking ? ' blocking' : '') }, h('span', { class: 'note-tag' }, n.blocking ? 'MySQL says no' : 'heads up'), h('span', { class: 'md', html: md(n.msg) }))));
    const tables = (o.results || []).filter(r => r.columns.length || r.message);
    if (tables.length) parts.push(resultTable(tables[tables.length - 1], { limit: 25 }));
    out.replaceChildren(...parts);
  });
  editBtn.addEventListener('click', () => {
    if (bench) return;
    bench = createWorkbench({ mode: 'free', initial: x.sql, minLines: 3, autofocus: true });
    code.replaceWith(bench.el);
    runBtn.parentElement.remove();
    out.remove();
    bench.refresh();
  });
  wrap.append(code, h('div', { class: 'example-bar' }, runBtn, editBtn, x.note ? h('span', { class: 'example-note' }, x.note) : null), out);
  return wrap;
}

export function renderLesson(main, id) {
  const l = lessonById(id);
  if (!l) { go('learn'); return; }
  const idx = C.lessons.indexOf(l);
  const prev = C.lessons[idx - 1], next = C.lessons[idx + 1];
  const d = store.data();
  const practice = (l.practice && l.practice.length ? l.practice.map(pid => C.exercises.find(e => e.id === pid)).filter(Boolean)
    : C.exercises.filter(e => e.topic === l.topic)).slice(0, 6);

  const doneBtn = h('button', { class: 'btn primary', type: 'button' });
  const setDone = () => {
    const isDone = !!store.data().lessons[l.id];
    doneBtn.replaceChildren(h('span', { html: icon(isDone ? 'check' : 'book') }), isDone ? 'Read ✓' : 'Mark as read');
    doneBtn.classList.toggle('primary', !isDone);
  };
  doneBtn.addEventListener('click', () => {
    store.update(x => { if (x.lessons[l.id]) delete x.lessons[l.id]; else x.lessons[l.id] = Date.now(); });
    setDone();
  });
  setDone();

  const toc = h('nav', { class: 'lesson-toc', 'aria-label': 'In this lesson' },
    h('p', { class: 'small-label' }, 'In this lesson'),
    h('ol', null, (l.sections || []).map((s, i) => h('li', null, h('a', { href: `#/learn/${l.id}`, onclick: e => { e.preventDefault(); document.getElementById(`s${i}`)?.scrollIntoView({ behavior: 'smooth' }); } }, s.h)))),
    h('p', { class: 'small-label' }, 'Then'),
    h('ol', null, h('li', null, h('a', { href: `#/learn/${l.id}`, onclick: e => { e.preventDefault(); document.getElementById('traps')?.scrollIntoView({ behavior: 'smooth' }); } }, 'Traps')),
      h('li', null, h('a', { href: `#/learn/${l.id}`, onclick: e => { e.preventDefault(); document.getElementById('try')?.scrollIntoView({ behavior: 'smooth' }); } }, 'Try it yourself'))));

  main.append(
    h('section', { class: 'page-head lesson-head' },
      h('p', { class: 'little-intro' }, h('a', { href: '#/learn', class: 'crumb' }, 'Learn'), h('span', null, '/'), `Lesson ${idx + 1} · ${TOPIC_NAMES[l.topic] || l.topic}${l.topic === 'window' ? ' · bonus' : ''}`),
      h('h1', null, l.title),
      h('p', { class: 'lead' }, l.blurb),
      h('p', { class: 'hand-note' }, `about ${l.minutes || 5} minutes`)),
    h('div', { class: 'lesson-layout' },
      toc,
      h('article', { class: 'lesson' },
        (l.sections || []).map((s, i) => h('section', { class: 'lesson-section', id: `s${i}` },
          h('h2', null, s.h),
          h('div', { class: 'md', html: md(s.md) }),
          (s.examples || []).map(exampleBlock))),
        l.pitfalls && l.pitfalls.length ? h('section', { class: 'lesson-section traps', id: 'traps' },
          h('h2', null, 'Traps'),
          h('ul', { class: 'trap-list' }, l.pitfalls.map(p => h('li', { html: md(p) })))) : null,
        h('section', { class: 'lesson-section', id: 'try' },
          h('h2', null, 'Try it yourself'),
          practice.length ? h('ul', { class: 'ledger compact' }, practice.map(e => h('li', null,
            h('a', { class: 'ledger-row' + (d.solved[e.id] ? ' complete' : ''), href: `#/practice/${e.id}` },
              h('span', { class: 'ledger-main' }, h('strong', null, e.title)),
              levelDots(e.level),
              h('span', { class: 'ledger-mark', html: d.solved[e.id] ? icon('check') : '' }))))) : h('p', null, 'Practice exercises for this one are coming.')),
        h('div', { class: 'lesson-foot' },
          doneBtn,
          h('span', { class: 'spacer' }),
          prev ? h('a', { class: 'link-under', href: `#/learn/${prev.id}` }, `← ${prev.title}`) : null,
          next ? h('a', { class: 'link-under', href: `#/learn/${next.id}` }, `${next.title} →`) : h('a', { class: 'link-under', href: '#/practice' }, 'Off to practice →')))));
}
