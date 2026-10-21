// Compares her result set with the expected one, and explains the difference kindly.
// Lenient where MySQL graders usually are: column order, column names, 4.5 vs 4.50,
// '2021' vs 2021, text case and outer spaces, '2021-01-01' vs '2021-01-01 00:00:00'.

const r2 = x => { const r = Math.round(x * 100) / 100; return (Object.is(r, -0) ? 0 : r).toFixed(2); };

export function canon(v) {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number') return 'n' + r2(v);
  let s = String(v).trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return 'n' + r2(parseFloat(s));
  s = s.replace(/^(\d{4}-\d{2}-\d{2}) 00:00:00$/, '$1');
  return 's' + s.toLowerCase();
}

const show = v => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(+v.toFixed(4)) : `'${v}'`);

function multiset(rows) {
  const m = new Map();
  for (const r of rows) { const k = r.join('\u0001'); m.set(k, (m.get(k) || 0) + 1); }
  return m;
}
function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const m = multiset(a);
  for (const r of b) {
    const k = r.join('\u0001'), n = m.get(k);
    if (!n) return false;
    m.set(k, n - 1);
  }
  return true;
}

// Find an injective mapping expected column i -> actual column j with identical value multisets.
function mapColumns(E, A, ec, ac) {
  const sig = (rows, j) => rows.map(r => r[j]).sort().join('\u0002');
  const se = Array.from({ length: ec }, (_, i) => sig(E, i));
  const sa = Array.from({ length: ac }, (_, j) => sig(A, j));
  const cand = se.map(s => sa.map((x, j) => (x === s ? j : -1)).filter(j => j >= 0));
  const used = new Set(), map = [];
  const order = cand.map((c, i) => i).sort((a, b) => cand[a].length - cand[b].length);
  const go = k => {
    if (k === order.length) return true;
    const i = order[k];
    for (const j of cand[i]) {
      if (used.has(j)) continue;
      used.add(j); map[i] = j;
      if (go(k + 1)) return true;
      used.delete(j);
    }
    return false;
  };
  if (!cand.every(c => c.length)) return null;
  // row-level check: try mappings until one also matches whole rows (bounded search)
  return go(0) ? map : null;
}

const project = (rows, map) => rows.map(r => map.map(j => r[j]));

/**
 * @param exp {columns, values}  expected (from the model solution)
 * @param act {columns, values}  hers
 * @param opts {ordered}
 * @returns {ok, title, message, kind}  kind: 'ok' | 'close' | 'wrong'
 */
export function compare(exp, act, opts = {}) {
  const E = exp.values.map(r => r.map(canon));
  const A = act.values.map(r => r.map(canon));
  const ec = exp.columns.length, ac = act.columns.length;
  const ne = E.length, na = A.length;
  const expCols = exp.columns.join(', ');

  if (!ac) return { ok: false, kind: 'wrong', title: 'No result table', message: 'That ran, but returned no table to check. The answer should be a SELECT.' };

  if (ne !== na) {
    let message = `You got **${na}** row${na === 1 ? '' : 's'}, the answer has **${ne}**.`;
    const distinctA = [...new Set(A.map(r => r.join('\u0001')))];
    const expNull = exp.values.some(r => r.some(v => v === null));
    const actNull = act.values.some(r => r.some(v => v === null));
    if (na === ne + 1 && actNull && !expNull) message += ' One of your rows has a **NULL** in it. Rows with no value (like tracks without a composer) may need filtering out with `IS NOT NULL`.';
    else if (na > ne && distinctA.length === ne && ac === ec) message += ' Your rows repeat. Try **DISTINCT**, or check whether a JOIN is duplicating rows.';
    else if (na > ne) message += ' Too many: maybe a missing condition, a missing GROUP BY column, or a JOIN that multiplies rows.';
    else if (na === 0) message += ' Nothing came back. Check your WHERE conditions (spelling, quotes, AND vs OR).';
    else message += ' Too few: maybe a condition is too strict, an INNER JOIN drops rows a LEFT JOIN would keep, or a LIMIT.';
    return { ok: false, kind: 'wrong', title: 'Row count is off', message };
  }

  if (ac !== ec) {
    if (ac > ec) {
      const sub = mapColumns(E, A, ec, ac);
      if (sub && sameMultiset(E, project(A, sub))) {
        const extra = act.columns.filter((_, j) => !sub.includes(j));
        return { ok: false, kind: 'close', title: 'Right data, extra columns', message: `Everything needed is there, plus extra column${extra.length > 1 ? 's' : ''} (**${extra.join(', ')}**). The answer has only: **${expCols}**.` };
      }
    }
    return { ok: false, kind: 'wrong', title: 'Different columns', message: `You have ${ac} column${ac === 1 ? '' : 's'}, the answer has **${ec}** (${expCols}).` };
  }

  const map = mapColumns(E, A, ec, ac);
  if (map) {
    const P = project(A, map);
    if (opts.ordered) {
      if (P.every((r, i) => r.join('\u0001') === E[i].join('\u0001'))) return { ok: true, kind: 'ok' };
      if (sameMultiset(E, P)) return { ok: false, kind: 'close', title: 'Right rows, wrong order', message: 'All the right rows, in a different order. Check your **ORDER BY** (which column, and ASC vs DESC).' };
    } else if (sameMultiset(E, P)) {
      return { ok: true, kind: 'ok' };
    }
  }

  // Same shape, different values: find the first differing cell (positional) to point at.
  const ms = multiset(A);
  for (const r of E) {
    const k = r.join('\u0001');
    if (ms.get(k)) ms.set(k, ms.get(k) - 1);
  }
  let near = false;
  for (let i = 0; i < Math.min(ne, 200); i++) {
    for (let j = 0; j < ec; j++) {
      const x = exp.values[i][j], y = act.values[i] && act.values[i][j];
      const nx = parseFloat(x), ny = parseFloat(y);
      if (!isNaN(nx) && !isNaN(ny) && nx !== ny && Math.abs(nx - ny) <= Math.max(0.1, Math.abs(nx) * 0.01)) near = true;
    }
  }
  if (near) return { ok: false, kind: 'close', title: 'Very close', message: 'Same shape and nearly the same numbers. Probably rounding: check **ROUND(x, 2)** or which column you add up.' };

  for (let i = 0; i < ne; i++) {
    for (let j = 0; j < ec; j++) {
      if (E[i][j] !== A[i][j]) {
        return {
          ok: false, kind: 'wrong', title: 'Some values differ',
          message: `Same number of rows and columns, but the values don't match. First difference: row ${i + 1}, column **${exp.columns[j]}**: you have ${show(act.values[i][j])}, the answer has ${show(exp.values[i][j])}.${opts.ordered ? '' : ' (Order doesn\'t matter here, so this may just be a different row.)'}`,
        };
      }
    }
  }
  return { ok: false, kind: 'wrong', title: 'Not quite', message: 'Same shape, different values.' };
}

/** Last result set that is a table, or null */
export function lastTable(out) {
  if (!out || !out.results) return null;
  for (let i = out.results.length - 1; i >= 0; i--) if (out.results[i].columns && out.results[i].columns.length) return out.results[i];
  return null;
}
