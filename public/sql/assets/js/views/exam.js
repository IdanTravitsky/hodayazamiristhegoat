import { h, icon, md, highlightSql, TOPIC_NAMES, levelDots, go, confirmModal, plural } from '../ui.js';
import * as store from '../store.js';
import * as sql from '../sqlclient.js';
import { compare, lastTable } from '../grader.js';
import { C, exerciseById } from '../content.js';
import { createWorkbench } from '../workbench.js';
import { schemaDrawer } from './schema-drawer.js';

const FORMATS = {
  sprint: { name: 'Sprint', minutes: 25, write: [1, 3, 1], read: 0, dml: 0, blurb: 'Five queries, 25 minutes. A quick check-in.' },
  half: { name: 'Half exam', minutes: 60, write: [1, 3, 2], read: 3, dml: 0, blurb: 'Six queries and three reading questions in an hour.' },
  full: { name: 'Dress rehearsal', minutes: 120, write: [2, 4, 2], read: 4, dml: 1, blurb: 'The real length: two hours, nine queries, four reading questions.' },
};

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function buildExam(key) {
  const f = FORMATS[key];
  const d = store.data();
  const recent = new Set(d.exams.slice(-3).flatMap(e => e.items.map(i => i.id)));
  const pool = C.exercises.filter(e => !e.check);
  const picked = [];
  const usedTopics = new Map();
  f.write.forEach((n, li) => {
    const level = li + 1;
    const cands = shuffle(pool.filter(e => e.level === level && !picked.includes(e)))
      .sort((a, b) => (recent.has(a.id) - recent.has(b.id)) || ((usedTopics.get(a.topic) || 0) - (usedTopics.get(b.topic) || 0)));
    for (let i = 0; i < n && cands.length; i++) {
      // re-sort each time so topics spread out
      cands.sort((a, b) => (recent.has(a.id) - recent.has(b.id)) || ((usedTopics.get(a.topic) || 0) - (usedTopics.get(b.topic) || 0)));
      const e = cands.shift();
      picked.push(e);
      usedTopics.set(e.topic, (usedTopics.get(e.topic) || 0) + 1);
    }
  });
  if (f.dml) {
    const dmls = shuffle(C.exercises.filter(e => e.check));
    if (dmls[0]) picked.push(dmls[0]);
  }
  const reads = shuffle(C.quiz).sort((a, b) => (recent.has(a.id) - recent.has(b.id))).slice(0, f.read);
  const items = picked.sort((a, b) => a.level - b.level).map(e => ({ type: 'write', id: e.id, sql: '' }))
    .concat(reads.map(q => ({ type: 'read', id: q.id, choice: null })));
  return { format: key, startedAt: Date.now(), minutes: f.minutes, items, current: 0 };
}

export function renderExamHome(main) {
  const d = store.data();
  const active = d.exam;
  const left = active ? active.startedAt + active.minutes * 60000 - Date.now() : 0;
  main.append(
    h('section', { class: 'page-head' },
      h('p', { class: 'little-intro' }, h('span', { class: 'tiny-star', html: icon('sword') }), 'Step 5 · the boss fight'),
      h('h1', null, 'Mock exam', h('span', { class: 'title-dot' }, '.')),
      h('p', { class: 'lead' }, 'Timed, no hints, no peeking at answers. You can run your queries and look at the results, like on the real exam, but the grade only comes at the end.'),
      h('p', { class: 'hand-note' }, 'tip: do a sprint first. do the dress rehearsal the day before.')),
    active ? h('section', { class: 'resume paper' },
      h('div', null, h('strong', null, `${FORMATS[active.format].name} in progress`), h('p', null, left > 0 ? `${Math.ceil(left / 60000)} minutes left on the clock.` : 'Time is up. Open it to see your grade.')),
      h('a', { class: 'btn primary', href: '#/exam/run' }, left > 0 ? 'Resume' : 'Finish it', h('span', { 'aria-hidden': 'true' }, '→'))) : null,
    h('section', { class: 'start-options formats' }, Object.entries(FORMATS).map(([key, f]) => h('button', {
      class: 'start-option paper', type: 'button', disabled: !!active,
      onclick: async () => {
        const yes = await confirmModal({ title: `Start the ${f.name.toLowerCase()}?`, text: `The clock starts now: ${f.minutes} minutes. Closing the tab doesn't stop it, so pick a quiet moment.`, yes: 'Start the clock', no: 'Not yet' });
        if (!yes) return;
        store.update(x => { x.exam = buildExam(key); });
        go('exam/run');
      },
    }, h('span', { html: icon(key === 'full' ? 'sword' : key === 'half' ? 'clock' : 'spark') }), h('strong', null, f.name), h('small', null, `${f.minutes} min · ${f.write.reduce((a, b) => a + b, 0) + f.dml} queries${f.read ? ` · ${f.read} reading` : ''}`), h('span', { class: 'format-blurb' }, f.blurb)))),
    h('section', { class: 'rules' },
      h('div', { class: 'section-intro' }, h('h2', null, 'How grading works'), h('p', null, 'same idea as a strict human grader.')),
      h('ul', { class: 'facts' },
        h('li', null, 'A query is right when it returns the right rows. Column order and names are free, but extra or missing columns count as wrong.'),
        h('li', null, 'If a question says "sorted by", the order is graded too.'),
        h('li', null, 'Queries MySQL would refuse (like a plain column next to MAX() without GROUP BY) count as wrong, even if they happen to run here.'),
        h('li', null, 'When the clock hits zero, the exam submits itself with whatever you have.'))),
    d.exams.length ? h('section', { class: 'history' },
      h('div', { class: 'section-intro' }, h('h2', null, 'Past attempts'), h('p', null, 'watch the line go up.')),
      h('ol', { class: 'ledger' }, d.exams.map((e, i) => h('li', null, h('a', { class: 'ledger-row', href: `#/exam/result/${i}` },
        h('span', { class: 'ledger-num' }, String(i + 1).padStart(2, '0')),
        h('span', { class: 'ledger-main' }, h('strong', null, `${FORMATS[e.format]?.name || 'Exam'} · ${e.score} / ${e.total}`), h('small', null, new Date(e.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))),
        h('span', { class: 'ledger-meta' }, `${Math.round((e.score / e.total) * 100)}%`),
        h('span', { class: 'ledger-mark', html: e.score / e.total >= 0.8 ? icon('star') : '' })))).reverse())) : null);
}

export function renderExamRun(main) {
  const d = store.data();
  const exam = d.exam;
  if (!exam) { go('exam'); return; }
  const f = FORMATS[exam.format];
  const deadline = exam.startedAt + exam.minutes * 60000;
  const timer = h('span', { class: 'timer', role: 'timer' });
  const chips = h('div', { class: 'q-chips', role: 'group', 'aria-label': 'Questions' });
  const stage = h('div', { class: 'exam-stage' });
  let bench = null;
  let submitting = false;
  let iv = null;

  function save(fn) { store.quietly(x => { if (x.exam) fn(x.exam); }); }
  const answered = it => (it.type === 'write' ? !!(it.sql && it.sql.trim()) : it.choice != null);

  function drawChips() {
    const ex = store.data().exam;
    chips.replaceChildren(...ex.items.map((it, i) => h('button', {
      type: 'button', class: 'q-chip' + (i === ex.current ? ' now' : '') + (answered(it) ? ' filled' : ''),
      'aria-label': `Question ${i + 1}${answered(it) ? ', answered' : ''}`, 'aria-current': i === ex.current ? 'step' : null,
      onclick: () => show(i),
    }, i + 1)));
  }

  function tick() {
    const left = deadline - Date.now();
    if (left <= 0) {
      timer.textContent = '0:00';
      if (!submitting) submit(true);
      return;
    }
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    const hh = Math.floor(m / 60);
    timer.textContent = hh ? `${hh}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
    timer.classList.toggle('low', left < 5 * 60000);
  }

  function show(i) {
    save(x => { x.current = i; });
    const ex = store.data().exam;
    const it = ex.items[i];
    drawChips();
    stage.replaceChildren();
    const nav = h('div', { class: 'exam-nav' },
      i > 0 ? h('button', { class: 'btn', type: 'button', onclick: () => show(i - 1) }, '← Previous') : h('span'),
      h('span', { class: 'spacer' }),
      i < ex.items.length - 1 ? h('button', { class: 'btn primary', type: 'button', onclick: () => show(i + 1) }, 'Next →') : h('button', { class: 'btn primary', type: 'button', onclick: () => submit(false) }, 'Submit exam'));
    if (it.type === 'write') {
      const e = exerciseById(it.id);
      bench = createWorkbench({
        mode: e.check ? 'free' : 'exam', initial: it.sql || '', autofocus: true,
        runLabel: 'Run',
        onDraft: v => { save(x => { x.items[i].sql = v; }); drawChips(); },
      });
      stage.append(h('div', { class: 'ex-layout exam-layout' },
        h('section', { class: 'ex-brief' },
          h('p', { class: 'q-kind' }, `Question ${i + 1} · write a query`),
          h('div', { class: 'ex-title-row' }, levelDots(e.level)),
          h('h2', { class: 'ex-title' }, e.title),
          h('div', { class: 'md prompt', html: md(e.prompt) }),
          e.ordered ? h('p', { class: 'order-note' }, h('span', { html: icon('spark') }), 'Order matters.') : null,
          e.check ? h('p', { class: 'order-note' }, h('span', { html: icon('spark') }), 'This one changes data. Running it here won\'t change anything for real; it gets graded on a fresh copy.') : null,
          schemaDrawer(bench)),
        h('section', { class: 'ex-work' }, bench.el)), nav);
      setTimeout(() => bench.refresh(), 0);
    } else {
      const q = C.quiz.find(x => x.id === it.id);
      bench = null;
      const letters = 'ABCDEF';
      const buttons = q.options.map((o, k) => h('button', {
        type: 'button', class: 'option' + (it.choice === k ? ' chosen' : ''), 'aria-pressed': it.choice === k ? 'true' : 'false',
        onclick: () => { save(x => { x.items[i].choice = k; }); buttons.forEach((b, j) => { b.classList.toggle('chosen', j === k); b.setAttribute('aria-pressed', j === k ? 'true' : 'false'); }); drawChips(); },
      }, h('span', { class: 'option-letter' }, letters[k]), q.optionsSql ? h('pre', { class: 'code small', html: highlightSql(o) }) : h('span', { class: 'md', html: md(o) })));
      stage.append(h('section', { class: 'question exam-question' },
        h('p', { class: 'q-kind' }, `Question ${i + 1} · read and answer`),
        h('div', { class: 'md q-prompt', html: md(q.prompt) }),
        q.sql ? h('pre', { class: 'code', html: highlightSql(q.sql) }) : null,
        h('div', { class: 'options' + (q.optionsSql ? ' sql-options' : '') }, buttons),
        h('p', { class: 'small-print' }, 'No running this one. Read it like it\'s on paper.')), nav);
    }
    window.scrollTo(0, 0);
  }

  async function submit(auto) {
    if (submitting) return;
    const ex = store.data().exam;
    if (!auto) {
      const empty = ex.items.filter(it => !answered(it)).length;
      const yes = await confirmModal({ title: 'Submit the exam?', text: empty ? `${plural(empty, 'question')} still empty. You can't change answers after this.` : "You can't change answers after this.", yes: 'Submit', no: 'Keep working' });
      if (!yes) return;
    }
    submitting = true;
    clearInterval(iv);
    stage.replaceChildren(h('div', { class: 'grading' }, h('p', { class: 'hand-note' }, auto ? "time's up. grading what you have…" : 'grading…')));
    const graded = [];
    for (const it of ex.items) {
      if (it.type === 'read') {
        const q = C.quiz.find(x => x.id === it.id);
        graded.push({ ...it, ok: it.choice === q.answer });
        continue;
      }
      const e = exerciseById(it.id);
      if (!it.sql || !it.sql.trim()) { graded.push({ ...it, ok: false, title: 'No answer' }); continue; }
      try {
        let table, o;
        if (e.check) { const r = await sql.dml(it.sql, e.check); o = r.out || r; table = r.after ? lastTable(r.after) : null; }
        else { o = await sql.run(it.sql); table = lastTable(o); }
        if (o.error) { graded.push({ ...it, ok: false, title: o.error.title, message: o.error.tip }); continue; }
        const exp = lastTable(await sql.expectedFor(e));
        let v = table ? compare(exp, table, { ordered: e.ordered, sql: it.sql }) : { ok: false, title: 'No table', message: 'The query returned nothing to grade.' };
        if (v.ok && (o.notes || []).some(n => n.blocking)) v = { ok: false, title: 'MySQL would refuse it', message: (o.notes.find(n => n.blocking) || {}).msg };
        graded.push({ ...it, ok: !!v.ok, title: v.ok ? 'Correct' : v.title, message: v.message || '' });
      } catch (err) {
        graded.push({ ...it, ok: false, title: 'Could not grade', message: String(err.message || err) });
      }
    }
    const score = graded.filter(g => g.ok).length;
    let index = 0;
    store.update(x => {
      x.exams.push({ at: Date.now(), format: ex.format, minutes: ex.minutes, usedMs: Math.min(Date.now(), deadline) - ex.startedAt, score, total: graded.length, items: graded });
      index = x.exams.length - 1;
      x.exam = null;
      graded.forEach(g => {
        if (g.type === 'write' && g.ok && !x.solved[g.id]) x.solved[g.id] = { at: Date.now(), tries: 1, hints: 0, revealed: false, sql: g.sql, viaExam: true };
        if (g.type === 'read') x.quiz[g.id] = { ok: g.ok, at: Date.now(), choice: g.choice };
      });
    });
    go(`exam/result/${index}`);
  }

  main.append(
    h('div', { class: 'exam-bar' },
      h('span', { class: 'exam-name' }, h('span', { html: icon('sword') }), f.name),
      chips,
      h('span', { class: 'spacer' }),
      h('span', { class: 'timer-wrap' }, h('span', { html: icon('clock') }), timer),
      h('button', { class: 'btn small', type: 'button', onclick: () => submit(false) }, 'Submit')),
    stage);
  iv = setInterval(tick, 1000);
  tick();
  if (Date.now() < deadline) show(exam.current || 0);
  return () => clearInterval(iv);
}

export function renderExamResult(main, n) {
  const d = store.data();
  const e = d.exams[+n];
  if (!e) { go('exam'); return; }
  const pct = Math.round((e.score / e.total) * 100);
  const line = pct === 100 ? 'Hitless. Of course it was.' : pct >= 80 ? 'That is a pass with room to spare.' : pct >= 60 ? 'Passing territory. The misses below are your study list.' : 'This is what mocks are for. The misses below are exactly what to practice next.';
  const mins = Math.round(e.usedMs / 60000);
  main.append(
    h('section', { class: 'page-head result-head' },
      h('p', { class: 'little-intro' }, h('a', { href: '#/exam', class: 'crumb' }, 'Mock exam'), h('span', null, '/'), `${FORMATS[e.format]?.name || 'Exam'} · ${new Date(e.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`),
      h('div', { class: 'score-line' },
        h('h1', null, `${e.score} / ${e.total}`, h('span', { class: 'title-dot' }, '.')),
        h('div', { class: 'score-stamp' + (pct >= 80 ? ' pass' : '') }, `${pct}%`, h('span', null, pct >= 80 ? 'GRACE UNDER PRESSURE' : 'KEEP GOING'))),
      h('p', { class: 'lead' }, line),
      h('p', { class: 'hand-note' }, `${mins} of ${e.minutes} minutes used.`)),
    h('section', { class: 'review' },
      h('div', { class: 'section-intro' }, h('h2', null, 'Question by question'), h('p', null, 'open any of them to compare with a model answer.')),
      h('ol', { class: 'review-list' }, e.items.map((it, i) => {
        if (it.type === 'read') {
          const q = C.quiz.find(x => x.id === it.id);
          if (!q) return null;
          const L = 'ABCDEF';
          return h('li', { class: 'review-item' + (it.ok ? ' ok' : ' bad') }, h('details', null,
            h('summary', null, h('span', { html: icon(it.ok ? 'check' : 'cross') }), h('strong', null, `Q${i + 1}. Reading · ${TOPIC_NAMES[q.topic]}`), h('span', { class: 'review-verdict' }, it.ok ? 'right' : it.choice == null ? 'no answer' : `you said ${L[it.choice]}, it's ${L[q.answer]}`)),
            h('div', { class: 'review-body' },
              h('div', { class: 'md', html: md(q.prompt) }),
              q.sql ? h('pre', { class: 'code small', html: highlightSql(q.sql) }) : null,
              h('p', { class: 'small-label' }, `Answer: ${L[q.answer]}`),
              q.optionsSql ? h('pre', { class: 'code small', html: highlightSql(q.options[q.answer]) }) : h('div', { class: 'md', html: md(q.options[q.answer]) }),
              h('div', { class: 'md explain', html: md(q.explain) }))));
        }
        const ex = exerciseById(it.id);
        if (!ex) return null;
        return h('li', { class: 'review-item' + (it.ok ? ' ok' : ' bad') }, h('details', null,
          h('summary', null, h('span', { html: icon(it.ok ? 'check' : 'cross') }), h('strong', null, `Q${i + 1}. ${ex.title}`), h('span', { class: 'review-verdict' }, it.ok ? 'correct' : it.title || 'wrong')),
          h('div', { class: 'review-body' },
            h('div', { class: 'md', html: md(ex.prompt) }),
            h('p', { class: 'small-label' }, 'Your query'),
            it.sql ? h('pre', { class: 'code small', html: highlightSql(it.sql) }) : h('p', { class: 'small-print' }, '(empty)'),
            !it.ok && it.message ? h('div', { class: 'md small verdict-msg', html: md(it.message) }) : null,
            h('p', { class: 'small-label' }, 'A model answer'),
            h('pre', { class: 'code small', html: highlightSql(ex.solution) }),
            h('div', { class: 'md explain', html: md(ex.explain) }),
            h('a', { class: 'link-under small', href: `#/practice/${ex.id}` }, 'practice this one again →'))));
      }))),
    h('div', { class: 'quiz-actions' }, h('a', { class: 'btn primary', href: '#/exam' }, 'Back to mock exams'), h('a', { class: 'btn', href: '#/practice' }, 'Practice the misses')));
}
