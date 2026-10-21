import { h, icon, md, highlightSql, resultTable, TOPIC_NAMES, go, pick } from '../ui.js';
import * as store from '../store.js';
import * as sql from '../sqlclient.js';
import { C } from '../content.js';
import { PRAISE } from '../content/voice.js';

const SET_KEY = 'hodaya-sql-quiz-set';
const KIND = { output: 'What does it return?', rows: 'How many rows?', 'pick-query': 'Which query?', bug: "What's wrong?", blank: 'Fill the gap', schema: 'Know the schema', order: 'Order of things' };

function getSet() { try { return JSON.parse(sessionStorage.getItem(SET_KEY) || 'null'); } catch (e) { return null; } }
function setSet(s) { try { sessionStorage.setItem(SET_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function startSet(ids, label) {
  if (!ids.length) return;
  setSet({ ids, i: 0, label, right: 0, answered: 0 });
  go(`understand/${ids[0]}`);
}

export function renderUnderstand(main, id) {
  if (id) return renderQuestion(main, id);
  const d = store.data();
  const Q = C.quiz;
  const ok = Q.filter(q => d.quiz[q.id]?.ok).length;
  const missed = Q.filter(q => d.quiz[q.id] && !d.quiz[q.id].ok);
  const fresh = Q.filter(q => !d.quiz[q.id]);
  const topics = Object.keys(TOPIC_NAMES).filter(t => Q.some(q => q.topic === t));

  main.append(
    h('section', { class: 'page-head' },
      h('p', { class: 'little-intro' }, h('span', { class: 'tiny-star', html: icon('eye') }), 'Step 4 · reading SQL'),
      h('h1', null, 'Understand', h('span', { class: 'title-dot' }, '.')),
      h('p', { class: 'lead' }, 'Half of a SQL exam is reading queries and knowing what they really do. Predict first, then run it and see. Every question explains the trap behind it.'),
      h('p', { class: 'hand-note' }, Q.length ? `${ok} of ${Q.length} answered right so far.` : 'questions are on their way.')),
    h('section', { class: 'quiz-start' },
      h('div', { class: 'start-options' },
        h('button', { class: 'start-option paper', type: 'button', disabled: !Q.length, onclick: () => startSet(shuffle(fresh.length >= 10 ? fresh : Q).slice(0, 10).map(q => q.id), 'Mixed set') },
          h('span', { html: icon('spark') }), h('strong', null, 'A mixed set of 10'), h('small', null, fresh.length ? 'new questions first' : 'shuffled from everything')),
        h('button', { class: 'start-option paper', type: 'button', disabled: !missed.length, onclick: () => startSet(shuffle(missed).map(q => q.id), 'Second chances') },
          h('span', { html: icon('key') }), h('strong', null, 'Second chances'), h('small', null, missed.length ? `${missed.length} you missed before` : 'nothing missed yet. nice.')),
        h('button', { class: 'start-option paper', type: 'button', disabled: !Q.length, onclick: () => startSet(Q.map(q => q.id), 'Everything, in order') },
          h('span', { html: icon('book') }), h('strong', null, 'All of them, in order'), h('small', null, `${Q.length} questions, topic by topic`)))),
    h('section', { class: 'quiz-topics' },
      h('div', { class: 'section-intro' }, h('h2', null, 'By topic'), h('p', null, '✓ right · ✗ missed · ○ not yet')),
      topics.map(t => {
        const qs = Q.filter(q => q.topic === t);
        return h('div', { class: 'quiz-topic' },
          h('div', { class: 'quiz-topic-head' },
            h('h3', null, TOPIC_NAMES[t]),
            h('button', { class: 'link-under small', type: 'button', onclick: () => startSet(qs.map(q => q.id), TOPIC_NAMES[t]) }, `do these ${qs.length} →`)),
          h('div', { class: 'quiz-dots' }, qs.map((q, i) => {
            const a = d.quiz[q.id];
            return h('a', { class: 'quiz-dot' + (a ? (a.ok ? ' ok' : ' bad') : ''), href: `#/understand/${q.id}`, title: KIND[q.kind] || q.kind, onclick: () => setSet({ ids: qs.map(x => x.id), i, label: TOPIC_NAMES[t], right: 0, answered: 0 }) },
              a ? (a.ok ? '✓' : '✗') : '○');
          })));
      })));
}

function renderQuestion(main, id) {
  const Q = C.quiz;
  const q = Q.find(x => x.id === id);
  if (!q) { go('understand'); return; }
  let set = getSet();
  if (!set || !set.ids.includes(id)) { const qs = Q.filter(x => x.topic === q.topic); set = { ids: qs.map(x => x.id), i: 0, label: TOPIC_NAMES[q.topic], right: 0, answered: 0 }; }
  set.i = set.ids.indexOf(id);
  setSet(set);
  const nextId = set.ids[set.i + 1];
  const prevAnswer = store.data().quiz[q.id];

  const optsBox = h('div', { class: 'options' + (q.optionsSql ? ' sql-options' : ''), role: 'group', 'aria-label': 'Answers' });
  const feedback = h('div', { class: 'quiz-feedback', 'aria-live': 'polite' });
  const runOut = h('div');
  let answered = false;

  const letters = 'ABCDEF';
  const buttons = q.options.map((o, i) => h('button', { type: 'button', class: 'option', onclick: () => answer(i) },
    h('span', { class: 'option-letter' }, letters[i]),
    q.optionsSql ? h('pre', { class: 'code small', html: highlightSql(o) }) : h('span', { class: 'md', html: md(o) })));
  optsBox.append(...buttons);

  function answer(i) {
    if (answered) return;
    answered = true;
    const ok = i === q.answer;
    buttons.forEach((b, k) => {
      b.disabled = true;
      b.classList.toggle('right', k === q.answer);
      b.classList.toggle('wrong', k === i && !ok);
      b.classList.toggle('dim', k !== q.answer && k !== i);
    });
    store.update(x => { x.quiz[q.id] = { ok, at: Date.now(), choice: i }; });
    set.answered++; if (ok) set.right++;
    setSet(set);
    const runnable = (q.runSql || q.sql) && q.run !== false;
    feedback.replaceChildren(
      h('div', { class: 'verdict ' + (ok ? 'ok' : 'bad') },
        h('div', { class: 'verdict-head' }, h('span', { html: icon(ok ? 'check' : 'cross') }), h('strong', null, ok ? 'Right.' : `Not quite. It's ${letters[q.answer]}.`), ok ? h('span', { class: 'praise' }, pick(PRAISE)) : null),
        h('div', { class: 'md', html: md(q.explain) })),
      h('div', { class: 'quiz-actions' },
        runnable ? h('button', { class: 'btn', type: 'button', onclick: runIt }, h('span', { html: icon('play') }), 'Run it and see') : null,
        h('span', { class: 'spacer' }),
        nextId ? h('a', { class: 'btn primary', href: `#/understand/${nextId}` }, 'Next question', h('span', { 'aria-hidden': 'true' }, '→'))
          : h('button', { class: 'btn primary', type: 'button', onclick: finish }, 'Finish set')),
      runOut);
    feedback.querySelector('.btn.primary')?.focus();
  }

  async function runIt() {
    runOut.replaceChildren(h('p', { class: 'running-note' }, 'running…'));
    const o = await sql.run(q.runSql || q.sql);
    const parts = [];
    if (o.error) parts.push(h('div', { class: 'verdict bad' }, h('div', { class: 'verdict-head' }, h('span', { html: icon('cross') }), h('strong', null, o.error.title)), h('div', { class: 'md', html: md(o.error.tip) })));
    (o.notes || []).forEach(n => parts.push(h('div', { class: 'note' + (n.blocking ? ' blocking' : '') }, h('span', { class: 'note-tag' }, n.blocking ? 'MySQL says no' : 'heads up'), h('span', { class: 'md', html: md(n.msg) }))));
    const t = (o.results || []).filter(r => r.columns.length).pop();
    if (t) parts.push(resultTable(t, { limit: 25 }));
    runOut.replaceChildren(...parts);
  }

  function finish() {
    const s = getSet();
    const right = s ? s.right : 0, total = s ? s.answered : 0;
    sessionStorage.removeItem(SET_KEY);
    main.replaceChildren(h('section', { class: 'page-head set-done' },
      h('p', { class: 'little-intro' }, h('span', { class: 'tiny-star', html: icon('star') }), s?.label || 'Set'),
      h('h1', null, `${right} out of ${total}`, h('span', { class: 'title-dot' }, '.')),
      h('p', { class: 'lead' }, right === total ? 'Every single one. Reading SQL is clearly not the problem.' : right >= total * 0.7 ? 'Solid. The misses are now in "Second chances", worth one more look.' : 'The misses are saved in "Second chances". Read the explanations, they are the whole point.'),
      h('div', { class: 'quiz-actions' }, h('a', { class: 'btn primary', href: '#/understand' }, 'Back to Understand'), h('a', { class: 'btn', href: '#/practice' }, 'Go practice'))));
  }

  main.append(
    h('div', { class: 'ex-top' },
      h('p', { class: 'little-intro' }, h('a', { href: '#/understand', class: 'crumb' }, 'Understand'), h('span', null, '/'), set.label || TOPIC_NAMES[q.topic], h('span', null, '/'), `${set.i + 1} of ${set.ids.length}`),
      h('div', { class: 'quiz-progress', 'aria-hidden': 'true' }, set.ids.map((x, k) => h('i', { class: k < set.i ? 'past' : k === set.i ? 'now' : null })))),
    h('section', { class: 'question' },
      h('p', { class: 'q-kind' }, KIND[q.kind] || 'Question', h('span', null, ` · ${TOPIC_NAMES[q.topic]}`)),
      h('div', { class: 'md q-prompt', html: md(q.prompt) }),
      q.sql ? h('pre', { class: 'code', html: highlightSql(q.sql) }) : null,
      optsBox,
      prevAnswer ? h('p', { class: 'small-print' }, `Last time: ${prevAnswer.ok ? 'right' : 'missed'}. Answer again, it updates.`) : null,
      feedback));
  const onKey = e => {
    if (answered || e.target.closest('input, textarea, .CodeMirror')) return;
    const k = 'abcdef'.indexOf(e.key.toLowerCase());
    if (k >= 0 && k < q.options.length) answer(k);
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}
