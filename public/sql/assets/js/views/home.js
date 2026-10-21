import { h, icon, TOPIC_NAMES, plural } from '../ui.js';
import * as store from '../store.js';
import * as sql from '../sqlclient.js';
import { C } from '../content.js';
import { greeting } from '../content/voice.js';

function squares(done, total, max = 14) {
  const n = Math.min(total, max);
  const filled = total ? Math.round((done / total) * n) : 0;
  return h('span', { class: 'squares', 'aria-hidden': 'true' }, Array.from({ length: n }, (_, i) => h('i', { class: i < filled ? 'on' : null })));
}

export function renderHome(main) {
  const p = store.profile();
  const d = store.data();
  const g = greeting(p.name);
  const ex = C.exercises;
  const solved = ex.filter(e => d.solved[e.id]).length;
  const tables = (sql.schema()?.tables || []).length || 11;
  const lessonsDone = C.lessons.filter(l => d.lessons[l.id]).length;
  const quizOk = C.quiz.filter(q => d.quiz[q.id]?.ok).length;
  const best = d.exams.length ? Math.max(...d.exams.map(e => Math.round((e.score / e.total) * 100))) : null;

  const nextEx = ex.find(e => !d.solved[e.id]);
  const steps = [
    { n: 1, icon: 'map', title: 'Meet Chinook', sub: 'The 11 tables, how they connect, and what changed from Sakila.', href: '#/chinook', done: Math.min(d.tables.length, tables), total: tables },
    { n: 2, icon: 'book', title: 'Refresh the basics', sub: 'Short lessons with examples you can run.', href: '#/learn', done: lessonsDone, total: C.lessons.length },
    { n: 3, icon: 'pencil', title: 'Practice', sub: 'Write queries, get them checked instantly.', href: nextEx ? `#/practice/${nextEx.id}` : '#/practice', done: solved, total: ex.length },
    { n: 4, icon: 'eye', title: 'Understand', sub: 'Read queries and predict what they do.', href: '#/understand', done: quizOk, total: C.quiz.length },
    { n: 5, icon: 'sword', title: 'Mock exam', sub: best == null ? 'Timed, no hints. Like the real thing.' : `Best so far: ${best}%.`, href: '#/exam', done: best == null ? 0 : best, total: 100, pct: true },
  ];
  const current = steps.find(s => s.done < s.total * (s.pct ? 0.8 : 1)) || steps[4];

  let lead;
  if (!solved && !d.tables.length) lead = ['Start with a ten minute tour of Chinook.', 'Then practice until it gets boring.', 'Boring is good. Boring means ready.'];
  else {
    const weakest = Object.keys(TOPIC_NAMES)
      .map(t => ({ t, left: ex.filter(e => e.topic === t && !d.solved[e.id]).length, total: ex.filter(e => e.topic === t).length }))
      .filter(x => x.total && x.left).sort((a, b) => b.left / b.total - a.left / a.total)[0];
    lead = [`${plural(solved, 'exercise')} solved out of ${ex.length}.`,
      weakest ? `Most room to grow: ${TOPIC_NAMES[weakest.t]} (${weakest.left} left).` : 'Every exercise done. Time for mock exams.',
      store.streak() > 1 ? `${store.streak()} days in a row. Look at you.` : 'A little every day beats a lot the night before.'];
  }

  const hero = h('section', { class: 'hero home-hero' },
    h('div', { class: 'hero-copy' },
      h('p', { class: 'little-intro' }, h('span', { class: 'tiny-star', html: icon('star') }), 'Databases 2026 · Chinook exam prep'),
      h('h1', null, g.title.replace(/[.?]$/, ''), h('span', { class: 'title-dot' }, g.title.slice(-1))),
      h('p', { class: 'hero-description' }, lead.flatMap((l, i) => (i ? [h('br'), l] : [l]))),
      h('p', { class: 'hero-footnote' }, h('span', { class: 'drawn-arrow' }, '↳'), g.note),
      h('a', { class: 'continue-link', href: current.href }, `Next up: ${current.title}`, h('span', { 'aria-hidden': 'true' }, '→'))),
    h('div', { class: 'plan paper' },
      h('div', { class: 'paper-heading' }, h('span', { html: icon('file') }), h('span', null, 'THE PLAN'), h('span', null, 'in this order')),
      h('ol', { class: 'plan-list' }, steps.map(s => h('li', { class: 'plan-row' + (s === current ? ' current' : '') + (s.done >= s.total && s.total ? ' complete' : '') },
        h('a', { href: s.href },
          h('span', { class: 'plan-icon', html: icon(s.done >= s.total && s.total ? 'check' : s.icon) }),
          h('span', { class: 'plan-text' }, h('strong', null, s.title), h('small', null, s.sub)),
          h('span', { class: 'plan-progress' }, s.pct ? (s.done ? `${s.done}%` : 'not yet') : `${s.done} / ${s.total}`, squares(s.done, s.total, 10)))))),
      h('p', { class: 'plan-note' }, 'tip: steps 3 and 4 are where the points are.')));

  const topics = h('section', { class: 'topic-progress' },
    h('div', { class: 'section-intro' }, h('h2', null, 'By topic'), h('p', null, 'one square per exercise. fill them in.')),
    h('div', { class: 'topic-rows' }, Object.entries(TOPIC_NAMES).map(([t, name]) => {
      const list = ex.filter(e => e.topic === t);
      if (!list.length) return null;
      const n = list.filter(e => d.solved[e.id]).length;
      const firstOpen = list.find(e => !d.solved[e.id]);
      return h('a', { class: 'topic-row', href: firstOpen ? `#/practice/${firstOpen.id}` : `#/practice?topic=${t}` },
        h('span', { class: 'topic-name' }, name),
        h('span', { class: 'squares big', 'aria-hidden': 'true' }, list.map(e => h('i', { class: d.solved[e.id] ? 'on' : null, title: e.title }))),
        h('span', { class: 'topic-count' }, `${n}/${list.length}`),
        h('span', { class: 'topic-go' }, firstOpen ? 'practice →' : 'done ✓'));
    })));

  const notice = h('section', { class: 'notice-wrap' },
    h('article', { class: 'notice paper' },
      h('div', { class: 'paper-heading' }, h('span', { html: icon('letter') }), h('span', null, 'FROM THE COURSE'), h('span', null, 'the fine print')),
      h('h3', null, 'About the exam'),
      h('ul', { class: 'notice-list' },
        h('li', null, h('strong', null, 'Due Wednesday, 23:59.'), ' It opens once you start it.'),
        h('li', null, h('strong', null, 'Two hours'), ' from the moment you begin. Pick a calm slot.'),
        h('li', null, 'There is an official ', h('strong', null, 'practice exam'), ' on the course site. You can take it as many times as you like. Do it at least once.'),
        h('li', null, "It's on ", h('strong', null, 'Chinook'), ', not Sakila. (Hence this whole place.)'),
        h('li', null, 'No extensions except illness or reserve duty.')),
      h('p', { class: 'notice-hand' }, 'the plan: tour → practice → one mock exam → the real thing.')),
    h('div', { class: 'notice-side' },
      h('h3', null, 'How to use this place'),
      h('p', null, 'Every exercise checks your answer against the real data the moment you run it. Column order and names don\'t matter, the rows do.'),
      h('p', null, 'Write MySQL like on the exam: ', h('code', null, 'YEAR()'), ', ', h('code', null, 'CONCAT()'), ', ', h('code', null, 'LIMIT'), '. If something would work here but break in MySQL, you\'ll get a heads up.'),
      h('p', null, h('a', { class: 'link-under', href: '#/cheatsheet' }, 'Cheat sheet'), ' for a quick look, ', h('a', { class: 'link-under', href: '#/playground' }, 'Playground'), ' for poking around freely.')));

  main.append(hero, topics, notice);
}
