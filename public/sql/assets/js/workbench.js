// Editor + Run + results + verdict. Used by exercises, the mock exam, lessons and the playground.
import { h, md, icon, resultTable, pick } from './ui.js';
import { createEditor } from './editor.js';
import * as sql from './sqlclient.js';
import { compare, lastTable } from './grader.js';
import { PRAISE, FIRST_TRY, NUDGES } from './content/voice.js';

/**
 * mode: 'check' (exercise, grade against exercise.solution)
 *       'exam'  (run only, no verdict)
 *       'free'  (run on the shared DB, rolled back)
 *       'sandbox' (playground DB, changes persist)
 */
export function createWorkbench({ mode = 'free', exercise = null, initial = '', placeholder, minLines = 6, onDraft, onChecked, onRan, runLabel = 'Run', autofocus = false } = {}) {
  const host = h('div', { class: 'editor-host' });
  const out = h('div', { class: 'wb-out', 'aria-live': 'polite' });
  const runBtn = h('button', { class: 'btn primary run-btn', type: 'button' }, h('span', { html: icon('play') }), runLabel);
  const kbd = h('span', { class: 'kbd-hint' });
  const bar = h('div', { class: 'wb-bar' }, runBtn, kbd, h('span', { class: 'spacer' }));
  const el = h('div', { class: `workbench wb-${mode}` }, host, bar, out);
  let busy = false;
  let lastSql = null;

  const editor = createEditor(host, { value: initial, onRun: () => run(), onChange: v => onDraft && onDraft(v), placeholder, minLines, autofocus });
  kbd.textContent = editor.runKeyLabel;
  runBtn.addEventListener('click', () => run());

  function showError(err) {
    return h('div', { class: 'verdict bad' },
      h('div', { class: 'verdict-head' }, h('span', { html: icon('cross') }), h('strong', null, err.title)),
      h('div', { class: 'md', html: md(err.tip) }),
      err.raw && err.raw !== err.tip ? h('details', { class: 'raw-error' }, h('summary', null, 'what the database said'), h('code', null, err.raw)) : null);
  }
  function showNotes(notes) {
    if (!notes || !notes.length) return null;
    return h('div', { class: 'notes' }, notes.map(n => h('div', { class: 'note' + (n.blocking ? ' blocking' : '') },
      h('span', { class: 'note-tag' }, n.blocking ? 'MySQL says no' : 'heads up'), h('span', { class: 'md', html: md(n.msg) }))));
  }
  function showResults(o) {
    const tables = (o.results || []).filter(r => r.message || (r.columns && r.columns.length));
    if (!tables.length) return null;
    if (tables.length === 1) return resultTable(tables[0]);
    // several statements: show each, last one open
    return h('div', { class: 'multi-results' }, tables.map((t, i) => {
      const d = h('details', { class: 'stmt', open: i === tables.length - 1 ? true : null },
        h('summary', null, h('code', null, t.sql.length > 80 ? t.sql.slice(0, 80) + '…' : t.sql)), resultTable(t));
      return d;
    }));
  }

  async function run() {
    if (busy) return;
    const text = editor.getValue();
    if (!text.trim()) {
      out.replaceChildren(h('p', { class: 'hand-note soft' }, 'nothing to run yet. try SELECT * FROM Artist LIMIT 5;'));
      return;
    }
    busy = true;
    runBtn.disabled = true;
    el.classList.add('running');
    out.replaceChildren(h('p', { class: 'running-note' }, 'running…'));
    try {
      if (mode === 'check' && exercise) await runCheck(text);
      else {
        const o = mode === 'sandbox' ? await sql.sandbox(text) : await sql.run(text);
        out.replaceChildren(...[o.error ? showError(o.error) : null, showNotes(o.notes), showResults(o)].filter(Boolean));
        if (!o.error && mode === 'sandbox' && o.changes) out.prepend(h('p', { class: 'result-msg' }, `Saved in the playground copy (${o.changes} change${o.changes === 1 ? '' : 's'}). "Reset database" brings back the original.`));
        onRan && onRan(o, text);
      }
      lastSql = text;
    } catch (e) {
      if (e.message !== 'restarted') out.replaceChildren(showError({ title: 'Something broke', tip: String(e.message || e) }));
    } finally {
      busy = false;
      runBtn.disabled = false;
      el.classList.remove('running');
    }
  }

  async function runCheck(text) {
    const ex = exercise;
    let o, table;
    if (ex.check) {
      const r = await sql.dml(text, ex.check);
      o = r.out || r;
      if (r.timedOut) o = r;
      table = r.after ? lastTable(r.after) : null;
    } else {
      o = await sql.run(text);
      table = lastTable(o);
    }
    const parts = [];
    if (o.error) {
      parts.push(showError(o.error));
      out.replaceChildren(...parts, showNotes(o.notes) || '');
      onChecked && onChecked({ ok: false, error: true, sql: text });
      return;
    }
    const exp = lastTable(await sql.expectedFor(ex));
    let verdict;
    if (!exp) verdict = { ok: false, kind: 'wrong', title: 'Hmm', message: 'Could not compute the expected answer. Try again in a second.' };
    else if (!table) verdict = { ok: false, kind: 'wrong', title: ex.check ? 'Nothing changed yet' : 'No table', message: ex.check ? 'Run your INSERT / UPDATE / DELETE statement.' : 'The answer should be a SELECT that returns a table.' };
    else verdict = compare(exp, table, { ordered: ex.ordered, sql: text });
    const blocking = (o.notes || []).filter(n => n.blocking);
    if (verdict.ok && blocking.length) {
      verdict = { ok: false, kind: 'close', title: 'Right answer, but MySQL would refuse it', message: 'The rows match, but this exact query errors in MySQL (see the note below). On the exam it would count as wrong. Small fix, promise.' };
    }
    const tries = onChecked ? onChecked({ ok: verdict.ok, verdict, sql: text }) : 0;
    if (verdict.ok) {
      const line = tries === 1 ? pick(FIRST_TRY) : pick(PRAISE);
      parts.push(h('div', { class: 'verdict ok' },
        h('div', { class: 'verdict-head' }, h('span', { html: icon('check') }), h('strong', null, 'Correct.'), h('span', { class: 'praise' }, line))));
    } else {
      parts.push(h('div', { class: `verdict ${verdict.kind === 'close' ? 'close' : 'bad'}` },
        h('div', { class: 'verdict-head' }, h('span', { html: icon(verdict.kind === 'close' ? 'spark' : 'cross') }), h('strong', null, verdict.title)),
        h('div', { class: 'md', html: md(verdict.message) }),
        tries > 0 && tries % 3 === 0 ? h('p', { class: 'hand-note soft' }, pick(NUDGES)) : null));
    }
    const notes = showNotes(o.notes);
    if (notes) parts.push(notes);
    if (ex.check) {
      const msgs = (o.results || []).filter(r => r.message).map(r => r.message).join(' ');
      if (msgs) parts.push(h('p', { class: 'result-msg' }, msgs + ' (on a fresh copy of the database)'));
      if (table) parts.push(h('p', { class: 'result-caption' }, 'After your statement, the check query shows:'), resultTable(table));
    } else {
      const res = showResults(o);
      if (res) parts.push(res);
    }
    out.replaceChildren(...parts);
  }

  return {
    el, editor,
    run,
    getValue: () => editor.getValue(),
    setValue: v => editor.setValue(v),
    clearOutput: () => out.replaceChildren(),
    refresh: () => editor.refresh(),
    lastSql: () => lastSql,
  };
}
