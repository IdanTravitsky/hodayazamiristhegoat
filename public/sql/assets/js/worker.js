/* Runs every query off the main thread, so a runaway JOIN can be stopped
 * (the page terminates and restarts this worker) instead of freezing the tab. */
const VERSION = new URL(self.location.href).searchParams.get('v') || '0';
importScripts('../vendor/sql-wasm.js?v=' + VERSION, 'engine.js?v=' + VERSION);

let engine = null;
let main = null;     // shared DB for exercises; every run is rolled back
let sandbox = null;  // playground DB; keeps changes until reset
const ready = (async () => {
  const SQL = await initSqlJs({ locateFile: () => '../vendor/sql-wasm.wasm' });
  const res = await fetch('../db/chinook.sqlite?v=' + VERSION);
  if (!res.ok) throw new Error('Could not load the Chinook database (' + res.status + ')');
  const bytes = new Uint8Array(await res.arrayBuffer());
  engine = SqlEngine.create(SQL, bytes);
  main = engine.open();
})();

function rolledBack(db, sql, opts) {
  db.exec('SAVEPOINT practice');
  try {
    return engine.run(db, sql, opts);
  } finally {
    try { db.exec('ROLLBACK TO practice; RELEASE practice'); } catch (e) { /* user ended the transaction */ }
  }
}

const ops = {
  schema: () => engine.schema(),
  // Exercise / quiz runs: never leave a trace.
  run: ({ sql, maxRows }) => rolledBack(main, sql, { maxRows }),
  // Playground: real changes, until "reset".
  sandbox: ({ sql, maxRows }) => {
    if (!sandbox) sandbox = engine.open();
    const out = engine.run(sandbox, sql, { maxRows });
    if (/\b(CREATE|DROP|ALTER)\b/i.test(sql)) out.schema = engine.refreshSchema(sandbox);
    return out;
  },
  resetSandbox: () => { if (sandbox) sandbox.close(); sandbox = null; return { schema: engine.refreshSchema(main) }; },
  // Data-changing exercises: run on a fresh copy, then read the result back with a check query.
  dml: ({ sql, check }) => {
    const db = engine.open();
    try {
      const out = engine.run(db, sql);
      if (out.error) return { out };
      const after = engine.run(db, check);
      return { out, after };
    } finally { db.close(); }
  },
};

self.onmessage = async (e) => {
  const { id, op, args } = e.data;
  try {
    await ready;
    const result = ops[op](args || {});
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
