// Profiles and progress, kept in this browser's localStorage.
// "Logging in" picks a profile; a backup code moves a profile to another device.

const KEY = 'hodaya-sql-v1';
const listeners = new Set();
let state = load();

function blank() { return { profiles: {}, current: null }; }
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? JSON.parse(raw) : blank();
    return s && s.profiles ? s : blank();
  } catch (e) { return blank(); }
}
let saveOk = true;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); saveOk = true; } catch (e) { saveOk = false; }
}
export const canSave = () => saveOk;

export function newData() {
  return {
    solved: {},      // exId -> { at, tries, hints, sql, revealed }
    tries: {},       // exId -> number of checked runs
    hintsSeen: {},   // exId -> highest hint index shown
    revealed: {},    // exId -> true if solution shown before solving
    drafts: {},      // exId -> sql
    quiz: {},        // qId -> { ok, at, choice }
    lessons: {},     // lessonId -> at
    tables: [],      // table names opened on the Chinook tour
    exams: [],       // finished mock exams
    exam: null,      // in-progress mock exam
    history: [],     // playground queries
    days: [],        // 'YYYY-MM-DD' days with activity
    trophies: {},    // id -> at
    goatPets: 0,
    last: null,      // last visited route
  };
}

export const profile = () => (state.current && state.profiles[state.current]) || null;
export const data = () => profile()?.data || null;
export const profiles = () => Object.values(state.profiles).sort((a, b) => (b.seen || 0) - (a.seen || 0));

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(kind) { listeners.forEach(fn => fn(kind)); }

export function signIn(name) {
  name = String(name || '').trim().slice(0, 40);
  if (!name) return null;
  let p = Object.values(state.profiles).find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!p) {
    const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    p = { id, name, created: Date.now(), seen: Date.now(), data: newData() };
    state.profiles[id] = p;
  }
  p.data = { ...newData(), ...p.data };
  p.seen = Date.now();
  state.current = p.id;
  save();
  emit('profile');
  return p;
}
export function signOut() { state.current = null; save(); emit('profile'); }
export function removeProfile(id) { delete state.profiles[id]; if (state.current === id) state.current = null; save(); emit('profile'); }

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Mutate the current profile's data. fn(data) may return anything. */
export function update(fn, kind = 'data') {
  const p = profile();
  if (!p) return;
  const r = fn(p.data);
  const t = today();
  if (!p.data.days.includes(t)) p.data.days.push(t);
  save();
  emit(kind);
  return r;
}
/** Update without counting as study activity (e.g. remembering the last page) */
export function quietly(fn) {
  const p = profile();
  if (!p) return;
  fn(p.data);
  save();
}

export function streak(d = data()) {
  if (!d || !d.days.length) return 0;
  const set = new Set(d.days);
  let n = 0;
  const cur = new Date();
  for (;;) {
    const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    if (set.has(k)) { n++; cur.setDate(cur.getDate() - 1); }
    else if (n === 0 && k === today()) { cur.setDate(cur.getDate() - 1); }
    else break;
  }
  return n;
}

// ---------- backup codes ----------
export function exportCode() {
  const p = profile();
  if (!p) return '';
  const json = JSON.stringify({ v: 1, name: p.name, created: p.created, data: { ...p.data, exam: null } });
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return 'HSQL1.' + btoa(bin);
}
export function importCode(code) {
  const m = String(code || '').trim().match(/^HSQL1\.([A-Za-z0-9+/=\s]+)$/);
  if (!m) throw new Error("That doesn't look like a backup code. It should start with HSQL1.");
  const bin = atob(m[1].replace(/\s/g, ''));
  const json = new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  const obj = JSON.parse(json);
  if (!obj || !obj.name || !obj.data) throw new Error('The code is incomplete.');
  let p = Object.values(state.profiles).find(x => x.name.toLowerCase() === obj.name.toLowerCase());
  if (!p) {
    const id = 'p' + Date.now().toString(36);
    p = state.profiles[id] = { id, name: obj.name, created: obj.created || Date.now(), seen: Date.now(), data: newData() };
  }
  p.data = mergeData(p.data, obj.data);
  state.current = p.id;
  save();
  emit('profile');
  return p;
}
function mergeData(a, b) {
  const out = { ...newData(), ...a };
  const keep = (x, y) => ({ ...x, ...y });
  out.solved = keep(a.solved, b.solved);
  out.tries = keep(a.tries, b.tries);
  out.hintsSeen = keep(a.hintsSeen, b.hintsSeen);
  out.revealed = keep(a.revealed, b.revealed);
  out.drafts = keep(a.drafts, b.drafts);
  out.quiz = keep(a.quiz, b.quiz);
  out.lessons = keep(a.lessons, b.lessons);
  out.trophies = keep(a.trophies, b.trophies);
  out.tables = [...new Set([...(a.tables || []), ...(b.tables || [])])];
  out.days = [...new Set([...(a.days || []), ...(b.days || [])])].sort();
  const seen = new Set((a.exams || []).map(e => e.at));
  out.exams = [...(a.exams || []), ...(b.exams || []).filter(e => !seen.has(e.at))].sort((x, y) => x.at - y.at);
  out.history = [...(b.history || []), ...(a.history || [])].slice(0, 60);
  out.goatPets = Math.max(a.goatPets || 0, b.goatPets || 0);
  return out;
}
