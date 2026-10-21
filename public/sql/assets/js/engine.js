/* SQL engine: sql.js (SQLite) taught to speak enough MySQL for a databases course.
 *
 * Classic script on purpose: the Web Worker loads it with importScripts, and the
 * Node test harness loads it with require(). Exposes `SqlEngine`.
 *
 * What it does on top of plain SQLite:
 *  - MySQL functions: YEAR(), MONTH(), CONCAT() (NULL-propagating), IF(), LEFT(), DATEDIFF(), ...
 *  - MySQL syntax rewrites: x > ALL (subquery), = ANY, EXTRACT(YEAR FROM d), DATE_ADD(d, INTERVAL n DAY),
 *    TIMESTAMPDIFF(YEAR, a, b), GROUP_CONCAT(... SEPARATOR ', '), # comments, \' escapes, "strings".
 *  - int / int gives a decimal like MySQL (SQLite would truncate 5/2 to 2).
 *  - SHOW TABLES, DESCRIBE t, SHOW COLUMNS FROM t, USE db.
 *  - Friendly error messages, and warnings for things that run here but MySQL rejects.
 */
(function (root) {
  'use strict';

  // ---------- tokenizer ----------
  const WORD = /[A-Za-z_À-￿][A-Za-z0-9_$À-￿]*/y;
  const NUM = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
  const OPS = ['<=>', '<>', '!=', '<=', '>=', '||', '&&', '::', '=', '<', '>', '+', '-', '*', '/', '%', '(', ')', ',', ';', '.', '!', '~', '^', '|', '&', '?', ':', '@'];

  function tokenize(sql) {
    const out = [];
    let i = 0;
    const n = sql.length;
    while (i < n) {
      const c = sql[i];
      if (/\s/.test(c)) {
        let j = i + 1;
        while (j < n && /\s/.test(sql[j])) j++;
        out.push({ t: 'ws', v: sql.slice(i, j) });
        i = j;
      } else if (c === '-' && sql[i + 1] === '-') {
        let j = sql.indexOf('\n', i);
        if (j < 0) j = n;
        out.push({ t: 'comment', v: sql.slice(i, j) });
        i = j;
      } else if (c === '#') {
        let j = sql.indexOf('\n', i);
        if (j < 0) j = n;
        out.push({ t: 'comment', v: '--' + sql.slice(i + 1, j) });
        i = j;
      } else if (c === '/' && sql[i + 1] === '*') {
        let j = sql.indexOf('*/', i + 2);
        j = j < 0 ? n : j + 2;
        out.push({ t: 'comment', v: sql.slice(i, j) });
        i = j;
      } else if (c === "'" || c === '"') {
        // MySQL string: '' or \' escapes; both quote styles are strings in MySQL.
        let j = i + 1, val = '', closed = false;
        while (j < n) {
          const d = sql[j];
          if (d === '\\' && j + 1 < n) {
            const e = sql[j + 1];
            // MySQL keeps \% and \_ as-is so LIKE can use them as literal % and _
            val += e === 'n' ? '\n' : e === 't' ? '\t' : e === '0' ? '' : (e === '%' || e === '_') ? '\\' + e : e;
            j += 2;
          } else if (d === c) {
            if (sql[j + 1] === c) { val += c; j += 2; }
            else { closed = true; j++; break; }
          } else { val += d; j++; }
        }
        out.push({ t: 'str', v: val, q: c, raw: sql.slice(i, j), closed });
        i = j;
      } else if (c === '`' || c === '[') {
        const close = c === '`' ? '`' : ']';
        let j = sql.indexOf(close, i + 1);
        j = j < 0 ? n : j + 1;
        out.push({ t: 'qident', v: sql.slice(i + 1, j - 1), raw: sql.slice(i, j) });
        i = j;
      } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(sql[i + 1] || ''))) {
        NUM.lastIndex = i;
        const m = NUM.exec(sql);
        out.push({ t: 'num', v: m[0] });
        i += m[0].length;
      } else {
        WORD.lastIndex = i;
        const m = WORD.exec(sql);
        if (m) {
          out.push({ t: 'word', v: m[0], u: m[0].toUpperCase() });
          i += m[0].length;
        } else {
          const op = OPS.find(o => sql.startsWith(o, i)) || c;
          out.push({ t: 'op', v: op });
          i += op.length;
        }
      }
    }
    return out;
  }

  const sqlString = s => "'" + String(s).replace(/'/g, "''") + "'";

  function untokenize(tokens) {
    return tokens.map(t => {
      if (t.t === 'str') return t.out != null ? t.out : sqlString(t.v);
      if (t.t === 'qident') return t.raw;
      return t.v;
    }).join('');
  }

  const isWs = t => t && (t.t === 'ws' || t.t === 'comment');
  function nextIdx(tokens, i) { let j = i + 1; while (j < tokens.length && isWs(tokens[j])) j++; return j; }
  function prevIdx(tokens, i) { let j = i - 1; while (j >= 0 && isWs(tokens[j])) j--; return j; }
  function matchParen(tokens, open) {
    let depth = 0;
    for (let k = open; k < tokens.length; k++) {
      if (tokens[k].t !== 'op') continue;
      if (tokens[k].v === '(') depth++;
      else if (tokens[k].v === ')' && --depth === 0) return k;
    }
    return -1;
  }
  const W = (v) => ({ t: 'word', v, u: v.toUpperCase() });
  const OP = (v) => ({ t: 'op', v });
  const S = (v) => ({ t: 'str', v });
  const SP = { t: 'ws', v: ' ' };

  // ---------- statement splitting ----------
  function splitStatements(sql) {
    const tokens = tokenize(sql);
    const stmts = [];
    let cur = [];
    for (const t of tokens) {
      if (t.t === 'op' && t.v === ';') { stmts.push(cur); cur = []; }
      else cur.push(t);
    }
    stmts.push(cur);
    return stmts.filter(s => s.some(t => !isWs(t)));
  }

  // ---------- MySQL -> SQLite rewrites (token level) ----------
  const UNITS = new Set(['YEAR', 'QUARTER', 'MONTH', 'WEEK', 'DAY', 'HOUR', 'MINUTE', 'SECOND', 'MICROSECOND']);
  const CMP = new Set(['=', '<>', '!=', '<', '>', '<=', '>=']);

  function rewrite(tokens) {
    let t = tokens.slice();

    // DB qualifier: Chinook.Track -> Track
    for (let i = 0; i < t.length; i++) {
      const w = t[i];
      if ((w.t === 'word' && w.u === 'CHINOOK') || (w.t === 'qident' && w.v.toUpperCase() === 'CHINOOK')) {
        const j = i + 1;
        if (t[j] && t[j].t === 'op' && t[j].v === '.') { t.splice(i, 2); i--; }
      }
    }

    // CAST(x AS DATE|DATETIME|SIGNED|UNSIGNED|INT) ; strip MySQL-only DDL words
    for (let i = 0; i < t.length; i++) {
      const w = t[i];
      if (w.t !== 'word') continue;
      if (w.u === 'CAST') {
        const p = nextIdx(t, i);
        if (t[p] && t[p].v === '(') {
          const close = matchParen(t, p);
          if (close > 0) {
            const last = prevIdx(t, close);
            const as = prevIdx(t, last);
            if (t[as] && t[as].u === 'AS' && t[last].t === 'word') {
              const ty = t[last].u;
              if (ty === 'DATE' || ty === 'DATETIME') {
                t.splice(as, close - as); // drop "AS DATE"
                t[i] = W(ty === 'DATE' ? 'DATE' : 'DATETIME');
              } else if (ty === 'SIGNED' || ty === 'UNSIGNED') {
                t[last] = W('INTEGER');
              }
            }
          }
        }
      } else if (w.u === 'AUTO_INCREMENT') {
        // SQLite only auto-numbers a column declared exactly INTEGER
        for (let k = i - 1; k >= 0 && t[k].v !== ',' && t[k].v !== '('; k--) {
          if (t[k].t === 'word' && /^(TINY|SMALL|MEDIUM|BIG)?INT$/.test(t[k].u)) { t[k] = W('INTEGER'); break; }
        }
        t[i] = { t: 'ws', v: ' ' };
      } else if (w.u === 'UNSIGNED' && t[prevIdx(t, i)] && /INT|DECIMAL|NUMERIC|\)/i.test(t[prevIdx(t, i)].v)) {
        t[i] = { t: 'ws', v: ' ' };
      } else if (w.u === 'ENGINE' || w.u === 'CHARSET' || (w.u === 'DEFAULT' && t[nextIdx(t, i)] && /^(CHARSET|CHARACTER)$/i.test(t[nextIdx(t, i)].v))) {
        // table options after the closing paren: ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        const prev = t[prevIdx(t, i)];
        if (prev && (prev.v === ')' || /^(InnoDB|MyISAM|utf8\w*|latin1)$/i.test(prev.v))) {
          let j = i;
          while (j < t.length && !(t[j].t === 'op' && t[j].v === ';')) j++;
          t.splice(i, j - i);
        }
      }
    }

    // ISNULL(x) -> mysql_isnull(x) ; RLIKE -> REGEXP ; <=> -> IS ; DIV -> integer division marker
    for (let i = 0; i < t.length; i++) {
      const w = t[i];
      if (w.t === 'word' && w.u === 'ISNULL' && t[nextIdx(t, i)] && t[nextIdx(t, i)].v === '(') t[i] = W('mysql_isnull');
      else if (w.t === 'word' && w.u === 'RLIKE') t[i] = W('REGEXP');
      else if (w.t === 'op' && w.v === '<=>') t[i] = W('IS');
      else if (w.t === 'op' && w.v === '&&') t[i] = W('AND');
    }

    // TIMESTAMPDIFF(UNIT, ...) / EXTRACT(UNIT FROM x) / DATE_ADD(x, INTERVAL n UNIT)
    for (let i = 0; i < t.length; i++) {
      const w = t[i];
      if (w.t !== 'word') continue;
      if ((w.u === 'TIMESTAMPDIFF' || w.u === 'TIMESTAMPADD') && t[nextIdx(t, i)]?.v === '(') {
        const u = nextIdx(t, nextIdx(t, i));
        if (t[u]?.t === 'word' && UNITS.has(t[u].u)) t[u] = S(t[u].u);
      } else if (w.u === 'EXTRACT' && t[nextIdx(t, i)]?.v === '(') {
        const u = nextIdx(t, nextIdx(t, i));
        const f = nextIdx(t, u);
        if (t[u]?.t === 'word' && UNITS.has(t[u].u) && t[f]?.u === 'FROM') { t[u] = S(t[u].u); t[f] = OP(','); }
      } else if (w.u === 'INTERVAL') {
        // INTERVAL <expr> UNIT  ->  <expr>, 'UNIT'
        let j = nextIdx(t, i), depth = 0;
        for (; j < t.length; j++) {
          const x = t[j];
          if (x.v === '(') depth++;
          else if (x.v === ')') { if (depth === 0) break; depth--; }
          else if (depth === 0 && x.t === 'word' && UNITS.has(x.u)) {
            t[j] = S(x.u);
            t.splice(j, 0, OP(','), SP);
            t[i] = { t: 'ws', v: '' };
            break;
          }
        }
      }
    }

    // GROUP_CONCAT([DISTINCT] x [ORDER BY ...] SEPARATOR s) -> mysql_gc([DISTINCT] (x) || char(1) || (s) [ORDER BY ...])
    // (SQLite wants the separator before ORDER BY, and refuses DISTINCT with two arguments.)
    for (let i = 0; i < t.length; i++) {
      if (t[i].t !== 'word' || t[i].u !== 'GROUP_CONCAT') continue;
      const open = nextIdx(t, i);
      if (t[open]?.v !== '(') continue;
      const close = matchParen(t, open);
      if (close < 0) continue;
      let depth = 0, sep = -1, order = -1;
      for (let k = open + 1; k < close; k++) {
        if (t[k].v === '(') depth++;
        else if (t[k].v === ')') depth--;
        else if (depth === 0 && t[k].t === 'word') {
          if (t[k].u === 'SEPARATOR') sep = k;
          else if (t[k].u === 'ORDER' && t[nextIdx(t, k)]?.u === 'BY' && order < 0) order = k;
        }
      }
      if (sep < 0) continue;
      let argStart = nextIdx(t, open);
      const distinct = t[argStart]?.u === 'DISTINCT';
      if (distinct) argStart = nextIdx(t, argStart);
      const argEnd = order >= 0 && order < sep ? order : sep;
      const arg = t.slice(argStart, argEnd);
      const sepTokens = t.slice(sep + 1, order > sep ? order : close);
      const orderTokens = order >= 0 ? t.slice(order, order < sep ? sep : close) : [];
      const repl = [W('mysql_gc'), OP('(')]
        .concat(distinct ? [W('DISTINCT'), SP] : [], [OP('(')], arg, tokenize(') || char(1) || ('), sepTokens, [OP(')'), SP], orderTokens, [OP(')')]);
      t.splice(i, close - i + 1, ...repl);
    }

    // x op ALL/ANY/SOME (subquery)
    for (let i = 0; i < t.length; i++) {
      const w = t[i];
      if (w.t !== 'word' || !(w.u === 'ALL' || w.u === 'ANY' || w.u === 'SOME')) continue;
      const p = prevIdx(t, i), o = nextIdx(t, i);
      if (!t[p] || t[p].t !== 'op' || !CMP.has(t[p].v) || t[o]?.v !== '(') continue;
      const close = matchParen(t, o);
      if (close < 0) continue;
      const inner = t.slice(o + 1, close);
      const op = t[p].v, all = w.u === 'ALL';
      let repl;
      if (op === '=' && !all) { t[p] = W('IN'); repl = [OP('('), ...inner, OP(')')]; }
      else if ((op === '<>' || op === '!=') && all) { t[p] = W('NOT IN'); repl = [OP('('), ...inner, OP(')')]; }
      else {
        const wantMax = (op === '>' || op === '>=') === all;
        const agg = wantMax ? 'MAX' : 'MIN';
        repl = tokenize(`(WITH __q(v) AS (`).concat(inner, tokenize(`) SELECT ${agg}(v) FROM __q)`));
      }
      t.splice(i, close - i + 1, ...repl);
    }

    // x = (SELECT ...) must get at most one row, or MySQL raises error 1242 (SQLite would silently take the first)
    for (let i = 0; i < t.length; i++) {
      if (t[i].t !== 'op' || !CMP.has(t[i].v)) continue;
      const o = nextIdx(t, i);
      if (t[o]?.v !== '(' || t[nextIdx(t, o)]?.u !== 'SELECT') continue;
      const close = matchParen(t, o);
      if (close < 0) continue;
      const inner = t.slice(o + 1, close);
      const repl = tokenize('(WITH __one(v) AS (').concat(inner, tokenize(') SELECT CASE WHEN COUNT(*) > 1 THEN mysql_too_many() ELSE MAX(v) END FROM __one)'));
      t.splice(o, close - o + 1, ...repl);
      i = o;
    }

    // Dates: the database stores midnight datetimes as 'YYYY-MM-DD' (see build_db.py), so a literal
    // '2023-01-01 00:00:00' must lose its zero time to compare equal, just as MySQL treats them.
    for (const x of t) {
      if (x.t === 'str' && /^\d{4}-\d{2}-\d{2} 00:00:00$/.test(x.v)) x.v = x.v.slice(0, 10);
    }
    // LIKE 'a\_b' : MySQL's default escape character is the backslash
    for (let i = 0; i < t.length; i++) {
      if (t[i].t !== 'word' || t[i].u !== 'LIKE') continue;
      const p = nextIdx(t, i);
      if (t[p]?.t === 'str' && t[p].v.includes('\\') && t[nextIdx(t, p)]?.u !== 'ESCAPE') t.splice(p + 1, 0, SP, W('ESCAPE'), SP, S('\\'));
    }

    // MySQL: int / int is a decimal. Make SQLite agree: a / b -> a * 1.0 / b
    for (let i = 0; i < t.length; i++) {
      if (t[i].t === 'op' && t[i].v === '/') { t.splice(i, 1, OP('*'), SP, { t: 'num', v: '1.0' }, SP, OP('/')); i += 4; }
    }
    for (let i = 0; i < t.length; i++) {
      if (t[i].t === 'word' && t[i].u === 'DIV') t[i] = OP('/');
    }
    return t;
  }

  // ---------- MySQL function library ----------
  function parseDate(v) {
    if (v == null) return null;
    const m = String(v).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (!m) return null;
    return { y: +m[1], mo: +m[2], d: +m[3], h: +(m[4] || 0), mi: +(m[5] || 0), s: +(m[6] || 0), hasTime: !!m[4] };
  }
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const fmtDate = p => `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
  const fmtDateTime = p => `${fmtDate(p)} ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}`;
  const toUTC = p => Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  const fromUTC = (ms, hasTime) => { const d = new Date(ms); return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), hasTime }; };
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dow = p => new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay();
  const doy = p => Math.round((Date.UTC(p.y, p.mo - 1, p.d) - Date.UTC(p.y, 0, 1)) / 864e5) + 1;
  function nowParts() { const d = new Date(); return { y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), mi: d.getMinutes(), s: d.getSeconds(), hasTime: true }; }

  function toText(x) {
    if (x == null) return null;
    if (typeof x === 'number') return Number.isInteger(x) ? String(x) : String(+x.toFixed(10));
    if (x instanceof Uint8Array) return '[blob]';
    return String(x);
  }
  const num = x => (x == null ? null : typeof x === 'number' ? x : (parseFloat(x) || 0));
  const truthy = x => x != null && num(x) !== 0;

  function addInterval(v, n, unit) {
    const p = parseDate(v);
    if (!p || n == null) return null;
    n = Math.trunc(num(n));
    unit = String(unit).toUpperCase();
    let r;
    if (unit === 'YEAR' || unit === 'MONTH' || unit === 'QUARTER') {
      const months = unit === 'YEAR' ? n * 12 : unit === 'QUARTER' ? n * 3 : n;
      const total = p.y * 12 + (p.mo - 1) + months;
      const y = Math.floor(total / 12), mo = (total % 12) + 1;
      const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      r = { ...p, y, mo, d: Math.min(p.d, last) };
    } else {
      const ms = { WEEK: 6048e5, DAY: 864e5, HOUR: 36e5, MINUTE: 6e4, SECOND: 1e3 }[unit];
      if (!ms) return null;
      r = fromUTC(toUTC(p) + n * ms, p.hasTime || unit === 'HOUR' || unit === 'MINUTE' || unit === 'SECOND');
    }
    return r.hasTime ? fmtDateTime(r) : fmtDate(r);
  }

  function dateFormat(v, f) {
    const p = parseDate(v);
    if (!p || f == null) return null;
    return String(f).replace(/%(.)/g, (_, c) => {
      switch (c) {
        case 'Y': return String(p.y);
        case 'y': return pad(p.y % 100);
        case 'm': return pad(p.mo);
        case 'c': return String(p.mo);
        case 'd': return pad(p.d);
        case 'e': return String(p.d);
        case 'H': return pad(p.h);
        case 'k': return String(p.h);
        case 'h': case 'I': return pad(((p.h + 11) % 12) + 1);
        case 'l': return String(((p.h + 11) % 12) + 1);
        case 'i': return pad(p.mi);
        case 's': case 'S': return pad(p.s);
        case 'p': return p.h < 12 ? 'AM' : 'PM';
        case 'M': return MONTHS[p.mo - 1];
        case 'b': return MONTHS[p.mo - 1].slice(0, 3);
        case 'W': return DAYS[dow(p)];
        case 'a': return DAYS[dow(p)].slice(0, 3);
        case 'w': return String(dow(p));
        case 'j': return pad(doy(p), 3);
        case 'T': return `${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}`;
        case '%': return '%';
        default: return c;
      }
    });
  }

  function tsDiff(unit, a, b) {
    const p = parseDate(a), q = parseDate(b);
    if (!p || !q) return null;
    unit = String(unit).toUpperCase();
    if (unit === 'YEAR' || unit === 'MONTH' || unit === 'QUARTER') {
      let months = (q.y - p.y) * 12 + (q.mo - p.mo);
      const rest = (x) => ((x.d * 24 + x.h) * 60 + x.mi) * 60 + x.s;
      if (months > 0 && rest(q) < rest(p)) months--;
      else if (months < 0 && rest(q) > rest(p)) months++;
      return unit === 'YEAR' ? Math.trunc(months / 12) : unit === 'QUARTER' ? Math.trunc(months / 3) : months;
    }
    const ms = { WEEK: 6048e5, DAY: 864e5, HOUR: 36e5, MINUTE: 6e4, SECOND: 1e3 }[unit];
    return ms ? Math.trunc((toUTC(q) - toUTC(p)) / ms) : null;
  }

  // MySQL SUBSTRING: 1-based, negative counts from the end, position 0 gives ''
  function mysqlSubstr(s, pos, len) {
    if (s == null || pos == null) return null;
    const ch = [...toText(s)];
    pos = Math.trunc(num(pos));
    if (pos === 0) return '';
    const start = pos > 0 ? pos - 1 : ch.length + pos;
    if (start < 0 || start >= ch.length) return '';
    if (len === undefined) return ch.slice(start).join('');
    if (len == null) return null;
    const n = Math.trunc(num(len));
    return n <= 0 ? '' : ch.slice(start, start + n).join('');
  }

  function weekMode0(p) {
    const jan1 = dow({ y: p.y, mo: 1, d: 1 });
    return Math.floor((doy(p) - 1 + jan1) / 7) + (jan1 === 0 ? 1 : 0);
  }

  const FUNCS = {
    // dates
    year: [1, v => parseDate(v)?.y ?? null],
    month: [1, v => parseDate(v)?.mo ?? null],
    day: [1, v => parseDate(v)?.d ?? null],
    dayofmonth: [1, v => parseDate(v)?.d ?? null],
    hour: [1, v => parseDate(v)?.h ?? null],
    minute: [1, v => parseDate(v)?.mi ?? null],
    second: [1, v => parseDate(v)?.s ?? null],
    quarter: [1, v => { const p = parseDate(v); return p ? Math.ceil(p.mo / 3) : null; }],
    dayofweek: [1, v => { const p = parseDate(v); return p ? dow(p) + 1 : null; }],
    weekday: [1, v => { const p = parseDate(v); return p ? (dow(p) + 6) % 7 : null; }],
    dayofyear: [1, v => { const p = parseDate(v); return p ? doy(p) : null; }],
    week: [1, v => { const p = parseDate(v); return p ? weekMode0(p) : null; }],
    dayname: [1, v => { const p = parseDate(v); return p ? DAYS[dow(p)] : null; }],
    monthname: [1, v => { const p = parseDate(v); return p ? MONTHS[p.mo - 1] : null; }],
    now: [0, () => fmtDateTime(nowParts())],
    sysdate: [0, () => fmtDateTime(nowParts())],
    curdate: [0, () => fmtDate(nowParts())],
    curtime: [0, () => fmtDateTime(nowParts()).slice(11)],
    datediff: [2, (a, b) => { const p = parseDate(a), q = parseDate(b); return p && q ? Math.round((Date.UTC(p.y, p.mo - 1, p.d) - Date.UTC(q.y, q.mo - 1, q.d)) / 864e5) : null; }],
    timestampdiff: [3, tsDiff],
    date_add: [3, (d, n, u) => addInterval(d, n, u)],
    date_sub: [3, (d, n, u) => addInterval(d, -num(n), u)],
    adddate: [2, (d, n) => addInterval(d, n, 'DAY')],
    subdate: [2, (d, n) => addInterval(d, -num(n), 'DAY')],
    date_format: [2, dateFormat],
    extract: [2, (u, v) => { const p = parseDate(v); if (!p) return null; return { YEAR: p.y, MONTH: p.mo, DAY: p.d, HOUR: p.h, MINUTE: p.mi, SECOND: p.s, QUARTER: Math.ceil(p.mo / 3), WEEK: weekMode0(p) }[String(u).toUpperCase()] ?? null; }],
    last_day: [1, v => { const p = parseDate(v); return p ? fmtDate({ ...p, d: new Date(Date.UTC(p.y, p.mo, 0)).getUTCDate() }) : null; }],
    // strings
    concat: [-1, (...a) => (a.some(x => x == null) ? null : a.map(toText).join(''))],
    concat_ws: [-1, (sep, ...a) => (sep == null ? null : a.filter(x => x != null).map(toText).join(toText(sep)))],
    left: [2, (s, n) => (s == null || n == null ? null : toText(s).slice(0, Math.max(0, num(n))))],
    right: [2, (s, n) => (s == null || n == null ? null : (num(n) <= 0 ? '' : toText(s).slice(-num(n))))],
    mid: [-1, mysqlSubstr],
    substring: [-1, mysqlSubstr],
    substr: [-1, mysqlSubstr],
    upper: [1, s => (s == null ? null : toText(s).toUpperCase())],
    lower: [1, s => (s == null ? null : toText(s).toLowerCase())],
    length: [1, s => (s == null ? null : s instanceof Uint8Array ? s.length : new TextEncoder().encode(toText(s)).length)],
    octet_length: [1, s => (s == null ? null : new TextEncoder().encode(toText(s)).length)],
    locate: [-1, (sub, s, pos) => { if (sub == null || s == null) return null; const from = Math.max(0, (num(pos) || 1) - 1); return toText(s).toLowerCase().indexOf(toText(sub).toLowerCase(), from) + 1; }],
    instr: [2, (s, sub) => (s == null || sub == null ? null : toText(s).toLowerCase().indexOf(toText(sub).toLowerCase()) + 1)],
    char_length: [1, s => (s == null ? null : [...toText(s)].length)],
    character_length: [1, s => (s == null ? null : [...toText(s)].length)],
    ucase: [1, s => (s == null ? null : toText(s).toUpperCase())],
    lcase: [1, s => (s == null ? null : toText(s).toLowerCase())],
    lpad: [3, (s, n, p) => { if (s == null || n == null || p == null) return null; s = toText(s); n = num(n); if (s.length >= n) return s.slice(0, n); return toText(p) ? s.padStart(n, toText(p)) : null; }],
    rpad: [3, (s, n, p) => { if (s == null || n == null || p == null) return null; s = toText(s); n = num(n); if (s.length >= n) return s.slice(0, n); return toText(p) ? s.padEnd(n, toText(p)) : null; }],
    reverse: [1, s => (s == null ? null : [...toText(s)].reverse().join(''))],
    repeat: [2, (s, n) => (s == null || n == null ? null : toText(s).repeat(Math.max(0, Math.min(10000, num(n)))))],
    space: [1, n => ' '.repeat(Math.max(0, Math.min(10000, num(n))))],
    strcmp: [2, (a, b) => { if (a == null || b == null) return null; a = toText(a).toLowerCase(); b = toText(b).toLowerCase(); return a < b ? -1 : a > b ? 1 : 0; }],
    substring_index: [3, (s, d, c) => { if (s == null || d == null || c == null) return null; s = toText(s); d = toText(d); c = Math.trunc(num(c)); if (!d || !c) return ''; const parts = s.split(d); return c > 0 ? parts.slice(0, c).join(d) : parts.slice(c).join(d); }],
    format: [2, (x, d) => (x == null ? null : Number(num(x)).toLocaleString('en-US', { minimumFractionDigits: Math.max(0, num(d)), maximumFractionDigits: Math.max(0, num(d)) }))],
    // numbers
    truncate: [2, (x, d) => { if (x == null || d == null) return null; const f = 10 ** num(d); return Math.trunc(num(x) * f) / f; }],
    mod: [2, (a, b) => (a == null || b == null || num(b) === 0 ? null : num(a) % num(b))],
    pow: [2, (a, b) => (a == null || b == null ? null : num(a) ** num(b))],
    power: [2, (a, b) => (a == null || b == null ? null : num(a) ** num(b))],
    sqrt: [1, x => (x == null || num(x) < 0 ? null : Math.sqrt(num(x)))],
    floor: [1, x => (x == null ? null : Math.floor(num(x)))],
    ceil: [1, x => (x == null ? null : Math.ceil(num(x)))],
    ceiling: [1, x => (x == null ? null : Math.ceil(num(x)))],
    sign: [1, x => (x == null ? null : Math.sign(num(x)))],
    pi: [0, () => Math.PI],
    rand: [0, () => Math.random()],
    ln: [1, x => (x == null || num(x) <= 0 ? null : Math.log(num(x)))],
    log: [1, x => (x == null || num(x) <= 0 ? null : Math.log(num(x)))],
    log10: [1, x => (x == null || num(x) <= 0 ? null : Math.log10(num(x)))],
    log2: [1, x => (x == null || num(x) <= 0 ? null : Math.log2(num(x)))],
    exp: [1, x => (x == null ? null : Math.exp(num(x)))],
    greatest: [-1, (...a) => (a.some(x => x == null) ? null : a.reduce((m, x) => (cmp(x, m) > 0 ? x : m)))],
    least: [-1, (...a) => (a.some(x => x == null) ? null : a.reduce((m, x) => (cmp(x, m) < 0 ? x : m)))],
    // control flow
    if: [3, (c, a, b) => (truthy(c) ? a : b)],
    mysql_isnull: [1, x => (x == null ? 1 : 0)],
    mysql_too_many: [0, () => { throw new Error('Subquery returns more than 1 row'); }],
    regexp: [2, (pattern, s) => { if (pattern == null || s == null) return null; try { return new RegExp(toText(pattern), 'i').test(toText(s)) ? 1 : 0; } catch (e) { return 0; } }],
    database: [0, () => 'Chinook'],
    version: [0, () => '8.0 (practice)'],
  };
  function cmp(a, b) {
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    const x = String(a).toLowerCase(), y = String(b).toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }

  function installFunctions(db) {
    for (const [name, [arity, impl]] of Object.entries(FUNCS)) {
      const f = function () { return impl.apply(null, arguments); };
      Object.defineProperty(f, 'length', { value: arity });
      db.create_function(name, f);
    }
    // GROUP_CONCAT with a custom SEPARATOR (see rewrite): each value arrives as "value\x01separator"
    db.create_aggregate('mysql_gc', {
      init: () => null,
      step: (state, v) => {
        if (v == null) return state;
        const s = String(v), cut = s.indexOf('\x01');
        const st = state || { parts: [], sep: ',' };
        st.parts.push(cut < 0 ? s : s.slice(0, cut));
        if (cut >= 0) st.sep = s.slice(cut + 1);
        return st;
      },
      finalize: state => (state ? state.parts.join(state.sep) : null),
    });
  }

  // ---------- MySQL portability lint ----------
  const AGG = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'GROUP_CONCAT', 'STD', 'STDDEV', 'VARIANCE']);
  const KEYWORDS = new Set(('SELECT DISTINCT ALL AS FROM WHERE AND OR NOT NULL IS IN LIKE BETWEEN CASE WHEN THEN ELSE END ' +
    'TRUE FALSE ASC DESC OVER PARTITION BY ORDER ROWS RANGE UNBOUNDED PRECEDING FOLLOWING CURRENT ROW INTERVAL ' +
    'YEAR MONTH DAY HOUR MINUTE SECOND WEEK QUARTER EXISTS ESCAPE SEPARATOR CURRENT_DATE CURRENT_TIMESTAMP REGEXP DIV MOD').split(' '));

  function topLevelSelectItems(tokens) {
    // returns { items: Token[][], hasGroupBy } for the first top-level SELECT
    let depth = 0, start = -1, end = tokens.length, hasGroupBy = false;
    for (let i = 0; i < tokens.length; i++) {
      const x = tokens[i];
      if (x.v === '(') depth++;
      else if (x.v === ')') depth--;
      else if (depth === 0 && x.t === 'word') {
        if (x.u === 'SELECT' && start < 0) start = i + 1;
        else if (x.u === 'FROM' && start >= 0 && end === tokens.length) end = i;
        else if (x.u === 'GROUP' && tokens[nextIdx(tokens, i)]?.u === 'BY') hasGroupBy = true;
        else if ((x.u === 'UNION' || x.u === 'INTERSECT' || x.u === 'EXCEPT') && start >= 0) { if (end === tokens.length) end = i; break; }
      }
    }
    if (start < 0) return null;
    const items = [];
    let cur = [];
    depth = 0;
    for (let i = start; i < end; i++) {
      const x = tokens[i];
      if (x.v === '(') depth++;
      if (x.v === ')') depth--;
      if (depth === 0 && x.t === 'op' && x.v === ',') { items.push(cur); cur = []; } else cur.push(x);
    }
    items.push(cur);
    return { items, hasGroupBy };
  }

  // ---------- query blocks (one per SELECT, subqueries included) ----------
  const TYPE_WORDS = 'INT INTEGER CHAR VARCHAR SIGNED UNSIGNED DECIMAL NUMERIC DATE DATETIME TIME TEXT BINARY DOUBLE FLOAT'.split(' ');
  TYPE_WORDS.forEach(w => KEYWORDS.add(w));
  ['FOR', 'USING', 'ON', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'NATURAL', 'LIMIT', 'OFFSET', 'HAVING', 'GROUP', 'UNION', 'WITH', 'LEADING', 'TRAILING', 'BOTH', 'UNKNOWN'].forEach(w => KEYWORDS.add(w));
  const JOIN_WORDS = new Set(['JOIN', 'INNER', 'LEFT', 'RIGHT', 'CROSS', 'NATURAL', 'OUTER', 'FULL', 'STRAIGHT_JOIN']);

  const sig = toks => toks.filter(x => !isWs(x)).map(x => (x.t === 'word' ? x.u : x.t === 'qident' ? x.v.toUpperCase() : x.t === 'str' ? "'" + x.v + "'" : x.v)).join('');
  const startsSubquery = (t, i) => { const n = t[nextIdx(t, i)]; return n && n.t === 'word' && (n.u === 'SELECT' || n.u === 'WITH'); };

  /** Every SELECT block: its clauses split at its own depth. */
  function queryBlocks(tokens) {
    const t = tokens.filter(x => !isWs(x));
    const blocks = [];
    for (let s = 0; s < t.length; s++) {
      if (t[s].t !== 'word' || t[s].u !== 'SELECT') continue;
      const cl = { select: [], from: [], where: [], group: [], having: [], order: [] };
      let cur = 'select', depth = 0;
      for (let i = s + 1; i < t.length; i++) {
        const x = t[i];
        if (x.v === '(') depth++;
        else if (x.v === ')') { if (depth === 0) break; depth--; }
        if (depth === 0 && x.t === 'word') {
          const nb = t[i + 1] && t[i + 1].u === 'BY';
          if (x.u === 'UNION' || x.u === 'INTERSECT' || x.u === 'EXCEPT') break;
          if (x.u === 'FROM' && cur === 'select') { cur = 'from'; continue; }
          if (x.u === 'WHERE') { cur = 'where'; continue; }
          if (x.u === 'GROUP' && nb) { cur = 'group'; i++; continue; }
          if (x.u === 'HAVING') { cur = 'having'; continue; }
          if (x.u === 'ORDER' && nb) { cur = 'order'; i++; continue; }
          if (x.u === 'LIMIT') { cur = 'limit'; continue; }
        }
        if (cl[cur]) cl[cur].push(x);
      }
      blocks.push(cl);
    }
    return blocks;
  }

  function splitTop(toks) {
    const out = [];
    let cur = [], depth = 0;
    for (const x of toks) {
      if (x.v === '(') depth++;
      if (x.v === ')') depth--;
      if (depth === 0 && x.v === ',') { out.push(cur); cur = []; } else cur.push(x);
    }
    if (cur.length) out.push(cur);
    return out;
  }
  function skipParen(tk, i) { let d = 0; for (let j = i; j < tk.length; j++) { if (tk[j].v === '(') d++; else if (tk[j].v === ')' && --d === 0) return j; } return tk.length - 1; }

  /** Column references in an expression, outside aggregates and subqueries. */
  function analyzeExpr(tk) {
    const refs = [];
    let agg = false, window = false;
    for (let i = 0; i < tk.length; i++) {
      const x = tk[i];
      if (x.v === '(' && startsSubquery(tk, i)) { i = skipParen(tk, i); continue; }
      if (x.t === 'word' && x.u === 'OVER') { window = true; if (tk[i + 1]?.v === '(') i = skipParen(tk, i + 1); continue; }
      if (x.t === 'word' && AGG.has(x.u) && tk[i + 1]?.v === '(') { agg = true; i = skipParen(tk, i + 1); continue; }
      if (x.t !== 'word' && x.t !== 'qident') continue;
      if (x.t === 'word' && (KEYWORDS.has(x.u) || tk[i + 1]?.v === '(')) continue;
      if (tk[i + 1]?.v === '.' && tk[i + 2] && (tk[i + 2].t === 'word' || tk[i + 2].t === 'qident')) {
        refs.push({ qual: x.v.toLowerCase(), col: tk[i + 2].v, text: x.v + '.' + tk[i + 2].v });
        i += 2;
        continue;
      }
      if (tk[i + 1]?.v === '.' && tk[i + 2]?.v === '*') { i += 2; continue; }
      refs.push({ qual: null, col: x.v, text: x.v });
    }
    return { refs, agg, window };
  }

  function selectItem(item) {
    const tk = item.filter(x => !isWs(x));
    let alias = null, expr = tk;
    const n = tk.length;
    if (n >= 3 && tk[n - 2].t === 'word' && tk[n - 2].u === 'AS') { alias = tk[n - 1].v; expr = tk.slice(0, n - 2); }
    else if (n >= 2) {
      const last = tk[n - 1], prev = tk[n - 2];
      const lastOk = (last.t === 'word' && !KEYWORDS.has(last.u)) || last.t === 'qident' || last.t === 'str';
      const prevOk = prev.t === 'qident' || prev.t === 'num' || prev.t === 'str' || prev.v === ')' || (prev.t === 'word' && (!KEYWORDS.has(prev.u) || prev.u === 'END' || prev.u === 'NULL'));
      if (lastOk && prevOk && prev.v !== '.') { alias = last.v; expr = tk.slice(0, n - 1); }
    }
    const star = (expr.length === 1 && expr[0].v === '*') || (expr.length === 3 && expr[2].v === '*');
    return { alias, expr, sig: sig(expr), star, ...analyzeExpr(expr) };
  }

  /** FROM clause: alias -> real table (null for derived tables). */
  function fromTables(fromToks, schema) {
    const map = new Map();
    const names = new Map((schema ? schema.tables : []).map(t => [t.name.toLowerCase(), t]));
    let derivedNoAlias = false;
    let expectTable = true;
    const isAlias = a => a && (a.t === 'qident' || (a.t === 'word' && !KEYWORDS.has(a.u) && !JOIN_WORDS.has(a.u)));
    for (let i = 0; i < fromToks.length; i++) {
      const x = fromToks[i];
      if (x.v === ',' || (x.t === 'word' && x.u === 'JOIN')) { expectTable = true; continue; }
      if (!expectTable) continue;
      if (x.t === 'word' && JOIN_WORDS.has(x.u)) continue;
      if (x.v === '(') {
        const close = skipParen(fromToks, i);
        const isSub = startsSubquery(fromToks, i);
        let j = close + 1;
        if (fromToks[j]?.u === 'AS') j++;
        if (isAlias(fromToks[j])) { map.set(fromToks[j].v.toLowerCase(), null); i = j; }
        else { if (isSub) derivedNoAlias = true; i = close; }
        expectTable = false;
        continue;
      }
      if (x.t === 'word' || x.t === 'qident') {
        const t = names.get(x.v.toLowerCase()) || null;
        let j = i + 1;
        if (fromToks[j]?.u === 'AS') j++;
        if (isAlias(fromToks[j])) { map.set(fromToks[j].v.toLowerCase(), t); i = j; }
        else map.set(x.v.toLowerCase(), t);
        expectTable = false;
      }
    }
    return { map, derivedNoAlias };
  }

  function resolve(ref, from) {
    if (ref.qual) return from.map.has(ref.qual) ? { table: from.map.get(ref.qual) } : null; // outer reference
    const hits = [...new Set([...from.map.values()].filter(t => t && t.columns.some(c => c.name.toLowerCase() === ref.col.toLowerCase())))];
    return hits.length === 1 ? { table: hits[0] } : null;
  }
  const pkOf = table => { const pks = table ? table.columns.filter(c => c.pk) : []; return pks.length === 1 ? pks[0].name.toLowerCase() : null; };

  function checkBlocks(tokens, schema, add) {
    for (const b of queryBlocks(tokens)) {
      const from = fromTables(b.from, schema);
      if (from.derivedNoAlias) add('derived', 'MySQL needs a name for every subquery in FROM (error 1248). Add an alias after the closing parenthesis: `FROM (SELECT ...) AS t`.', true);
      const items = splitTop(b.select).map(selectItem);
      const aliases = new Set(items.map(it => it.alias && it.alias.toLowerCase()).filter(Boolean));
      const realCols = new Set([...from.map.values()].filter(Boolean).flatMap(t => t.columns.map(c => c.name.toLowerCase())));

      // aliases can't be used in WHERE in MySQL (WHERE runs before SELECT names things)
      const w = b.where;
      for (let i = 0; i < w.length; i++) {
        const x = w[i];
        if (x.v === '(' && startsSubquery(w, i)) { i = skipParen(w, i); continue; }
        if ((x.t === 'word' || x.t === 'qident') && w[i - 1]?.v !== '.' && w[i + 1]?.v !== '(' && w[i + 1]?.v !== '.') {
          const k = x.v.toLowerCase();
          if (aliases.has(k) && !realCols.has(k)) {
            add('where-alias', `MySQL can't use the alias **${x.v}** inside WHERE (error 1054): WHERE runs before SELECT gives things names. Repeat the expression instead, or filter in HAVING / an outer query.`, true);
            break;
          }
        }
      }

      const groupItems = splitTop(b.group).map(g => g.filter(x => !isWs(x)));
      if (!groupItems.length) {
        // no GROUP BY: an aggregate next to a plain column is error 1140
        if (items.some(it => it.agg && !it.window) && items.some(it => !it.agg && !it.window && (it.refs.length || it.star))) {
          add('groupby', 'MySQL would reject this: it mixes a plain column with an aggregate (COUNT/SUM/MAX...) but has no GROUP BY. SQLite quietly returns something, MySQL throws error 1140. Add a GROUP BY, or use ORDER BY ... LIMIT 1 / a subquery.', true);
        }
        continue;
      }
      // ONLY_FULL_GROUP_BY: every plain column must be grouped, or depend on a grouped primary key
      const gSigs = new Set(groupItems.map(sig));
      const gRefs = groupItems.flatMap(g => analyzeExpr(g).refs).map(r => ({ ...r, res: resolve(r, from) }));
      const covered = (r, res) => gRefs.some(g => {
        const sameTable = g.res && g.res.table && g.res.table === res.table;
        if (g.col.toLowerCase() === r.col.toLowerCase()) return !r.qual || !g.qual || r.qual === g.qual || sameTable;
        return sameTable && pkOf(res.table) === g.col.toLowerCase();
      });
      for (const it of items) {
        if (it.window || it.star) continue;
        if (gSigs.has(it.sig) || (it.alias && gSigs.has(it.alias.toUpperCase()))) continue;
        let flagged = false;
        for (const r of it.refs) {
          const res = resolve(r, from);
          if (!res || !res.table) continue; // outer, derived or unknown: don't guess
          if (!covered(r, res)) {
            add('groupby-full', `MySQL would reject this (error 1055): **${r.text}** is in the SELECT but not in the GROUP BY, and it isn't inside an aggregate. Add it to the GROUP BY (or group by its table's id).`, true);
            flagged = true;
            break;
          }
        }
        if (flagged) break;
      }
    }
  }

  const CHINOOK = new Set(['album', 'artist', 'customer', 'employee', 'genre', 'invoice', 'invoiceline', 'mediatype', 'playlist', 'track']);
  function checkInsert(tokens, schema, add) {
    const t = tokens.filter(x => !isWs(x));
    if (t[0]?.u !== 'INSERT') return;
    let i = 1;
    if (t[i]?.u === 'IGNORE') i++;
    if (t[i]?.u === 'INTO') i++;
    const name = t[i] && t[i].v.toLowerCase();
    if (!name || !CHINOOK.has(name) || t[i + 1]?.v !== '(') return;
    const table = schema && schema.tables.find(x => x.name.toLowerCase() === name);
    const pk = table && table.columns.find(c => c.pk);
    if (!pk) return;
    const close = skipParen(t, i + 1);
    const cols = t.slice(i + 2, close).filter(x => x.t === 'word' || x.t === 'qident').map(x => x.v.toLowerCase());
    if (!cols.includes(pk.name.toLowerCase())) {
      add('insert-id', `In MySQL, Chinook's **${pk.name}** is a plain INT, not AUTO_INCREMENT, so leaving it out fails (error 1364). Include it with a new value, e.g. one more than \`SELECT MAX(${pk.name}) FROM ${table.name}\`.`, true);
    }
  }

  function lint(tokens, schema) {
    const notes = [];
    const add = (code, msg, blocking) => { if (!notes.some(n => n.code === code)) notes.push({ code, msg, blocking: !!blocking }); };
    for (let i = 0; i < tokens.length; i++) {
      const x = tokens[i];
      if (x.t === 'op' && x.v === '||') add('pipes', 'In MySQL, `||` means OR, not "glue these strings". Use `CONCAT(a, b)` instead.', true);
      if (x.t === 'op' && x.v === '::') add('pgcast', '`::` casts are PostgreSQL. In MySQL use `CAST(x AS ...)`.', true);
      if (x.t === 'str' && x.q === '"' && schema && schema.columnSet.has(x.v.toLowerCase())) {
        add('dq', `"${x.v}" in double quotes is a text value in MySQL, not a column. Write ${x.v} or \`${x.v}\` instead.`);
      }
    }
    const nextWord = i => tokens[nextIdx(tokens, i)];
    for (let i = 0; i < tokens.length; i++) {
      const x = tokens[i];
      if (x.t !== 'word') continue;
      const call = nextWord(i)?.v === '(';
      if (call && ['STRFTIME', 'JULIANDAY', 'PRINTF', 'IIF', 'TYPEOF', 'UNIXEPOCH'].includes(x.u)) add('sqlite-' + x.u, `\`${x.u.toLowerCase()}()\` is SQLite-only. MySQL won't know it.${x.u === 'STRFTIME' ? ' Use `YEAR(d)`, `MONTH(d)` or `DATE_FORMAT(d, \'%Y-%m\')`.' : x.u === 'IIF' ? ' Use `IF(cond, a, b)` or `CASE`.' : ''}`, true);
      if (call && x.u === 'DATETIME') add('sqlite-datetime', '`datetime()` is SQLite-only. In MySQL use `NOW()` or just compare to a string like \'2023-01-01\'.', true);
      if (call && ['GETDATE', 'LEN', 'NVL', 'DATEPART', 'CHARINDEX'].includes(x.u)) add('other-' + x.u, `\`${x.u}()\` is from another database. MySQL equivalents: GETDATE→NOW, LEN→CHAR_LENGTH, NVL→IFNULL, DATEPART→YEAR/MONTH, CHARINDEX→LOCATE.`, true);
      if (x.u === 'TOP' && tokens[prevIdx(tokens, i)]?.u === 'SELECT') add('top', '`SELECT TOP n` is SQL Server. MySQL uses `... ORDER BY ... LIMIT n` at the end.', true);
      if (x.u === 'ILIKE') add('ilike', '`ILIKE` is PostgreSQL. In MySQL plain `LIKE` already ignores case.', true);
      if (x.u === 'FULL' && /^(OUTER|JOIN)$/.test(nextWord(i)?.u || '')) add('full', 'MySQL has no FULL OUTER JOIN. Write a LEFT JOIN, then `UNION` the matching RIGHT JOIN.', true);
    }
    if (tokens.some(x => x.t === 'word' && x.u === 'SELECT')) checkBlocks(tokens, schema, add);
    checkInsert(tokens, schema, add);
    return notes;
  }

  // ---------- schema ----------
  function readSchema(db) {
    const tables = [];
    const res = db.exec("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name");
    const names = res.length ? res[0].values.map(r => r[0]) : [];
    for (const name of names) {
      const cols = db.exec(`PRAGMA table_info(${sqlString(name)})`)[0]?.values || [];
      const fks = db.exec(`PRAGMA foreign_key_list(${sqlString(name)})`)[0]?.values || [];
      let count = null;
      try { count = db.exec(`SELECT COUNT(*) FROM "${name}"`)[0].values[0][0]; } catch (e) { /* view error */ }
      tables.push({
        name,
        count,
        columns: cols.map(c => ({ name: c[1], type: c[2], notnull: !!c[3], pk: c[5] > 0 })),
        fks: fks.map(f => ({ table: f[2], from: f[3], to: f[4] })),
      });
    }
    const columnSet = new Set();
    tables.forEach(t => t.columns.forEach(c => columnSet.add(c.name.toLowerCase())));
    return { tables, columnSet };
  }

  function mysqlType(t) {
    const u = (t || '').toUpperCase();
    if (u.startsWith('NVARCHAR')) return u.replace('NVARCHAR', 'varchar').replace(/ COLLATE.*/, '').toLowerCase();
    if (u === 'INTEGER') return 'int';
    if (u.startsWith('NUMERIC')) return u.replace('NUMERIC', 'decimal').toLowerCase();
    return (t || '').toLowerCase();
  }

  // ---------- friendly errors ----------
  function lev(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return dp[a.length][b.length];
  }
  function closest(word, list, max = 3) {
    return list.map(x => [x, lev(word, x)]).filter(([x, d]) => d <= Math.max(2, Math.floor(word.length / 3)) || x.toLowerCase().includes(word.toLowerCase()) || word.toLowerCase().includes(x.toLowerCase()))
      .sort((a, b) => a[1] - b[1]).slice(0, max).map(x => x[0]);
  }

  function friendlyError(message, schema) {
    const msg = String(message || '').replace(/^Error: /, '');
    const tables = schema ? schema.tables.map(t => t.name) : [];
    const allCols = schema ? [...new Set(schema.tables.flatMap(t => t.columns.map(c => c.name)))] : [];
    const whereCol = c => schema ? schema.tables.filter(t => t.columns.some(x => x.name.toLowerCase() === c.toLowerCase())).map(t => t.name) : [];
    let m;
    if ((m = msg.match(/no such column: (.+)$/))) {
      const full = m[1].trim();
      const [qual, col] = full.includes('.') ? full.split('.') : [null, full];
      const sugg = closest(col, allCols);
      let tip = `There's no column called **${full}**.`;
      if (qual && whereCol(col).length) tip += ` ${col} does exist (in ${whereCol(col).join(', ')}), so check that **${qual}** is the right table or alias and that it's in your FROM/JOIN.`;
      else if (sugg.length) tip += ` Did you mean ${sugg.map(s => `**${s}**`).join(' or ')}?`;
      if (/^(the|and|or)$/i.test(col)) tip += ' (Maybe a missing comma or quote?)';
      if (/^[a-z]+$/i.test(col) && !sugg.length) tip += " If you meant a text value, put it in quotes: 'like this'.";
      return { title: 'Unknown column', tip, raw: msg };
    }
    if ((m = msg.match(/no such table: (.+)$/))) {
      const name = m[1].trim().replace(/^main\./, '');
      const sugg = closest(name, tables);
      const sakila = { film: 'Track', actor: 'Artist', rental: 'Invoice', payment: 'Invoice', staff: 'Employee', category: 'Genre', inventory: 'Track', customers: 'Customer', tracks: 'Track', albums: 'Album', artists: 'Artist', invoices: 'Invoice', employees: 'Employee', genres: 'Genre' }[name.toLowerCase()];
      let tip = `There's no table called **${name}** in Chinook.`;
      if (sakila && !sugg.includes(sakila)) tip += ` You might want **${sakila}**${/^(film|actor|rental|payment|staff|category|inventory)$/i.test(name) ? ' (that one is from Sakila)' : ' (Chinook table names are singular)'}.`;
      else if (sugg.length) tip += ` Did you mean ${sugg.map(s => `**${s}**`).join(' or ')}?`;
      return { title: 'Unknown table', tip, raw: msg };
    }
    if ((m = msg.match(/ambiguous column name: (.+)$/))) {
      const col = m[1].trim();
      const where = whereCol(col);
      return { title: 'Which table?', tip: `**${col}** exists in more than one of your tables${where.length ? ` (${where.join(', ')})` : ''}. Put the table or alias in front, like **t.${col}**.`, raw: msg };
    }
    if ((m = msg.match(/near "(.+?)": syntax error/))) {
      const near = m[1];
      const u = near.toUpperCase();
      let tip = `SQL got confused right around **${near}**.`;
      if (u === 'FROM') tip += ' Often a comma right before FROM, or a missing column before it.';
      else if (u === 'WHERE') tip += ' WHERE must come right after FROM/JOINs and before GROUP BY / ORDER BY.';
      else if (u === 'GROUP' || u === 'HAVING') tip += ' Clause order is: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT.';
      else if (u === 'ORDER' || u === 'LIMIT') tip += ' ORDER BY and LIMIT go at the very end (inside a UNION, only once at the end).';
      else if (u === 'ON') tip += ' ON belongs right after a JOIN: `JOIN Album a ON a.AlbumId = t.AlbumId`.';
      else if (u === 'JOIN') tip += ' Check the line before: a JOIN follows a table name, not a comma.';
      else if (u === ',') tip += ' Maybe an extra comma, or a comma right after SELECT.';
      else if (u === ')') tip += ' Check the parentheses and any trailing comma inside them.';
      else tip += ' Check for a missing comma, quote or keyword just before it.';
      return { title: 'Syntax error', tip, raw: msg };
    }
    if (/incomplete input/.test(msg)) return { title: 'Unfinished query', tip: 'The query ends too early. Usually a missing **)** or a quote that never closes.', raw: msg };
    if (/unrecognized token/.test(msg)) return { title: 'Odd character', tip: 'There is a character SQL does not understand. Often an unclosed quote, or a fancy quote (’ “ ”) pasted from somewhere. Use plain \' quotes.', raw: msg };
    if (/misuse of aggregate/.test(msg)) return { title: 'Aggregate in the wrong place', tip: 'You can\'t use COUNT/SUM/AVG/MAX inside WHERE. WHERE filters rows before grouping. Filter groups with **HAVING** instead, or compare to a subquery.', raw: msg };
    if (/a GROUP BY clause is required before HAVING/.test(msg)) return { title: 'HAVING without GROUP BY', tip: 'HAVING filters groups, so it needs a GROUP BY before it. If you meant to filter single rows, use WHERE.', raw: msg };
    if ((m = msg.match(/no such function: (\w+)/))) {
      const f = m[1];
      const sugg = closest(f, Object.keys(FUNCS).concat(['count', 'sum', 'avg', 'min', 'max', 'round', 'upper', 'lower', 'length', 'substr', 'substring', 'trim', 'replace', 'ifnull', 'coalesce', 'abs', 'group_concat', 'date']).filter(x => !x.startsWith('mysql_')));
      return { title: 'Unknown function', tip: `**${f}()** isn't a function here.${sugg.length ? ` Did you mean ${sugg.map(s => `**${s.toUpperCase()}()**`).join(' or ')}?` : ''}`, raw: msg };
    }
    if ((m = msg.match(/wrong number of arguments to function (\w+)/))) return { title: 'Wrong number of arguments', tip: `**${m[1].toUpperCase()}()** got the wrong number of values inside its parentheses.`, raw: msg };
    if (/Subquery returns more than 1 row/.test(msg)) return { title: 'Subquery returned several rows', tip: 'You compared with `=` (or `<`, `>`) to a subquery that returns **more than one row**. MySQL refuses that (error 1242). If you mean "any of these", use **IN (subquery)**. If you need one value, make the subquery return one row (MAX, a tighter WHERE, LIMIT 1).', raw: msg };
    if (/sub-select returns (\d+) columns - expected 1/.test(msg) || /row value misused/.test(msg) || /has \d+ values for 1 columns/.test(msg)) return { title: 'Subquery returns too much', tip: 'A subquery used with `=`, `>` or `IN` must return exactly **one column**. Select only the column you compare against.', raw: msg };
    if (/ORDER BY term out of range/.test(msg)) return { title: 'ORDER BY number too big', tip: '`ORDER BY 3` means "the 3rd column of the SELECT". Your SELECT doesn\'t have that many.', raw: msg };
    if (/SELECTs to the left and right of UNION do not have the same number of result columns/.test(msg)) return { title: 'UNION column count', tip: 'Both sides of a UNION must select the **same number of columns**, in matching order.', raw: msg };
    if (/UNIQUE constraint failed|PRIMARY KEY/.test(msg)) return { title: 'Duplicate key', tip: 'That primary key value already exists. Pick a new id (try `SELECT MAX(...)` first).', raw: msg };
    if (/NOT NULL constraint failed: (.+)/.test(msg)) return { title: 'Missing required value', tip: `**${msg.match(/NOT NULL constraint failed: (.+)/)[1]}** can't be NULL. Give it a value in your INSERT.`, raw: msg };
    if (/FOREIGN KEY constraint failed/.test(msg)) return { title: 'Foreign key says no', tip: 'MySQL would refuse this too (errors 1451 / 1452). Either other rows still point at the row you are deleting (like albums pointing at an artist: delete or update those first), or you are pointing at an id that does not exist (like a SupportRepId with no such employee).', raw: msg };
    if (/table (\w+) already exists/.test(msg)) return { title: 'Already exists', tip: 'A table/view with that name already exists. Drop it first or pick another name.', raw: msg };
    if (/no such window function/.test(msg)) return { title: 'Window function', tip: 'That function can\'t be used with OVER().', raw: msg };
    if (/misuse of window function/.test(msg)) return { title: 'Window function in the wrong place', tip: 'Window functions (ROW_NUMBER, RANK...) can\'t go in WHERE. Wrap the query in a subquery and filter outside it.', raw: msg };
    if (/too many terms in compound SELECT|too many columns/.test(msg)) return { title: 'Too big', tip: msg, raw: msg };
    return { title: 'SQL error', tip: msg, raw: msg };
  }

  // ---------- running ----------
  const MAX_ROWS = 20000;

  function special(tokens, db, schema) {
    const w = tokens.filter(x => !isWs(x));
    if (!w.length) return null;
    const u = w.map(x => (x.t === 'word' ? x.u : x.t === 'qident' ? x.v : x.v));
    const tableArg = x => (x ? (x.t === 'qident' ? x.v : x.v) : '');
    if (u[0] === 'USE') return { columns: ['Info'], values: [['Using database Chinook']] };
    if (u[0] === 'SHOW' && u[1] === 'DATABASES') return { columns: ['Database'], values: [['Chinook']] };
    if (u[0] === 'SHOW' && (u[1] === 'TABLES' || (u[1] === 'FULL' && u[2] === 'TABLES'))) {
      return { columns: ['Tables_in_Chinook'], values: schema.tables.map(t => [t.name]) };
    }
    let name = null;
    if (u[0] === 'DESCRIBE' || u[0] === 'DESC' || u[0] === 'EXPLAIN' && w.length === 2) name = tableArg(w[1]);
    if (u[0] === 'SHOW' && u[1] === 'COLUMNS' && (u[2] === 'FROM' || u[2] === 'IN')) name = tableArg(w[3]);
    if (name) {
      const t = schema.tables.find(x => x.name.toLowerCase() === name.toLowerCase().replace(/^chinook\./, ''));
      if (!t) throw new Error(`no such table: ${name}`);
      const fkCols = new Set(t.fks.map(f => f.from));
      return {
        columns: ['Field', 'Type', 'Null', 'Key', 'Default', 'Extra'],
        values: t.columns.map(c => [c.name, mysqlType(c.type), c.notnull || c.pk ? 'NO' : 'YES', c.pk ? 'PRI' : fkCols.has(c.name) ? 'MUL' : '', null, '']),
      };
    }
    return null;
  }

  function runStatement(db, sql, maxRows) {
    const stmt = db.prepare(sql);
    try {
      const columns = stmt.getColumnNames();
      const values = [];
      let truncated = false;
      while (stmt.step()) {
        if (values.length >= maxRows) { truncated = true; break; }
        values.push(stmt.get());
      }
      return { columns, values, truncated };
    } finally {
      stmt.free();
    }
  }

  const isQuery = tokens => {
    const first = tokens.find(x => !isWs(x));
    return first && first.t === 'word' && /^(SELECT|WITH|VALUES|PRAGMA)$/.test(first.u) || (first && first.v === '(');
  };

  /** Run user SQL. Returns { results:[{columns,values,truncated,sql}], changes, notes, error } */
  function run(db, sql, schema, opts = {}) {
    const maxRows = opts.maxRows || MAX_ROWS;
    const out = { results: [], changes: 0, notes: [], error: null, statements: 0 };
    let stmts;
    try { stmts = splitStatements(sql); } catch (e) { out.error = friendlyError(e.message, schema); return out; }
    if (!stmts.length) { out.error = { title: 'Nothing to run', tip: 'Write a query first. Try `SELECT * FROM Artist;`' }; return out; }
    for (let tokens of stmts) {
      out.statements++;
      for (const n of lint(tokens, schema)) if (!out.notes.some(x => x.code === n.code)) out.notes.push(n);
      const text = untokenize(tokens).trim();
      try {
        const sp = special(tokens, db, schema);
        if (sp) { out.results.push({ ...sp, sql: text, truncated: false }); continue; }
        // CREATE OR REPLACE VIEW v  ->  DROP VIEW IF EXISTS v; CREATE VIEW v
        const nw = tokens.filter(x => !isWs(x));
        if (nw[0]?.u === 'CREATE' && nw[1]?.u === 'OR' && nw[2]?.u === 'REPLACE' && nw[3]?.u === 'VIEW' && nw[4]) {
          db.run('DROP VIEW IF EXISTS ' + (nw[4].t === 'qident' ? nw[4].raw : nw[4].v));
          tokens = tokens.filter(x => x !== nw[1] && x !== nw[2]);
        }
        const rtoks = rewrite(tokens);
        const rewritten = untokenize(rtoks).trim();
        if (isQuery(tokens)) {
          const r = runStatement(db, rewritten, maxRows);
          if (rewritten !== text) {
            // unaliased expressions are named after their SQL text; show what she typed, not our rewrite
            const o = topLevelSelectItems(tokens), rw = topLevelSelectItems(rtoks);
            if (o && rw && o.items.length === rw.items.length && o.items.length === r.columns.length) {
              r.columns = r.columns.map((c, k) => (c === untokenize(rw.items[k]).trim() ? untokenize(o.items[k]).trim() : c));
            }
          }
          out.results.push({ ...r, sql: text });
        } else {
          db.run(rewritten);
          const changed = db.getRowsModified();
          out.changes += changed;
          const verb = (tokens.find(x => x.t === 'word') || {}).u || '';
          out.results.push({ columns: [], values: [], sql: text, message: messageFor(verb, changed) });
        }
      } catch (e) {
        out.error = friendlyError(e.message, schema);
        out.error.statement = text;
        break;
      }
    }
    return out;
  }

  function messageFor(verb, n) {
    const rows = `${n} row${n === 1 ? '' : 's'}`;
    switch (verb) {
      case 'INSERT': case 'REPLACE': return `${rows} inserted.`;
      case 'UPDATE': return `${rows} updated.`;
      case 'DELETE': return `${rows} deleted.`;
      case 'CREATE': return 'Created.';
      case 'DROP': return 'Dropped.';
      case 'ALTER': return 'Altered.';
      default: return 'Done.';
    }
  }

  function create(SQL, bytes) {
    let schema = null;
    const open = () => {
      const db = new SQL.Database(bytes);
      db.exec('PRAGMA foreign_keys = ON');
      installFunctions(db);
      if (!schema) schema = readSchema(db);
      return db;
    };
    return {
      open,
      schema: () => schema,
      refreshSchema: db => (schema = readSchema(db)),
      run: (db, sql, opts) => run(db, sql, schema, opts),
    };
  }

  const api = { create, tokenize, untokenize, rewrite, lint, splitStatements, friendlyError, readSchema, installFunctions, mysqlType };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SqlEngine = api;
})(typeof self !== 'undefined' ? self : this);
