// Talks to the SQL worker. A query that runs too long gets the worker terminated and
// restarted, so the page never freezes (the playground sandbox resets when that happens).

// Bump when the engine, worker or database changes, so browsers fetch the new ones.
export const VERSION = '2026-10-21a';
const TIMEOUT_MS = 12000;
let worker = null;
let seq = 0;
const pending = new Map();
let schemaCache = null;
const schemaListeners = new Set();

function start() {
  worker = new Worker(new URL('./worker.js?v=' + VERSION, import.meta.url));
  worker.onmessage = e => {
    const { id, result, error } = e.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    clearTimeout(p.timer);
    if (error) p.reject(new Error(error)); else p.resolve(result);
  };
  worker.onerror = e => {
    for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error(e.message || 'The SQL engine crashed.')); }
    pending.clear();
  };
}

function call(op, args = {}) {
  if (!worker) start();
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      worker.terminate();
      worker = null;
      for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('restarted')); }
      pending.clear();
      resolve({
        results: [], notes: [], changes: 0, timedOut: true,
        error: { title: 'Stopped: too slow', tip: `That query was still running after ${TIMEOUT_MS / 1000} seconds, so it was stopped. Usually this means a JOIN without its ON condition (every row times every row), or a comma between tables with no WHERE linking them.` },
      });
    }, TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    worker.postMessage({ id, op, args });
  });
}

export async function init() {
  schemaCache = await call('schema');
  return schemaCache;
}
export const schema = () => schemaCache;
export function onSchema(fn) { schemaListeners.add(fn); return () => schemaListeners.delete(fn); }
function setSchema(s) { if (s) { schemaCache = s; schemaListeners.forEach(fn => fn(s)); } }

/** Run on the shared DB; every change is rolled back. */
export const run = (sql, maxRows) => call('run', { sql, maxRows });
/** Run in the playground sandbox; changes stay until reset. */
export async function sandbox(sql) {
  const out = await call('sandbox', { sql });
  if (out.schema) setSchema(out.schema);
  return out;
}
export async function resetSandbox() {
  const out = await call('resetSandbox');
  setSchema(out.schema);
  return out;
}
/** DML exercise: run sql on a fresh copy, then `check`. */
export const dml = (sql, check) => call('dml', { sql, check });

// Expected results are computed once per session.
const expected = new Map();
export async function expectedFor(ex) {
  if (expected.has(ex.id)) return expected.get(ex.id);
  const p = ex.check ? dml(ex.solution, ex.check).then(r => r.after) : run(ex.solution);
  expected.set(ex.id, p);
  p.then(r => { if (!r || r.timedOut) expected.delete(ex.id); }, () => expected.delete(ex.id));
  return p;
}
