// Boot, routing, header, trophies, theme, the goat.
import { h, icon, hydrateIcons, toast, openModal, closeModal, initModal, pick, go } from './ui.js';
import * as store from './store.js';
import * as sql from './sqlclient.js';
import { C, loadContent } from './content.js';
import { TROPHIES } from './content/trophies.js';
import { GOAT } from './content/voice.js';

import { renderLogin } from './views/login.js';
import { renderHome } from './views/home.js';
import { renderChinook } from './views/chinook.js';
import { renderLearn, renderLesson } from './views/learn.js';
import { renderPractice, renderExercise } from './views/practice.js';
import { renderUnderstand } from './views/understand.js';
import { renderExamHome, renderExamRun, renderExamResult } from './views/exam.js';
import { renderPlayground } from './views/playground.js';
import { renderCheatsheet } from './views/cheatsheet.js';

const main = document.getElementById('main');
let cleanup = null;

const ROUTES = [
  [/^$/, renderHome],
  [/^login$/, renderLogin, { open: true }],
  [/^chinook(?:\/(\w+))?$/, renderChinook],
  [/^learn$/, renderLearn],
  [/^learn\/([\w-]+)$/, renderLesson],
  [/^practice$/, renderPractice],
  [/^practice\/([\w-]+)$/, renderExercise],
  [/^understand(?:\/([\w-]+))?$/, renderUnderstand],
  [/^exam$/, renderExamHome],
  [/^exam\/run$/, renderExamRun],
  [/^exam\/result\/(\d+)$/, renderExamResult],
  [/^playground$/, renderPlayground],
  [/^cheatsheet$/, renderCheatsheet, { open: true }],
];

function currentPath() {
  return decodeURIComponent(location.hash.replace(/^#\/?/, '').split('?')[0]).replace(/\/$/, '');
}

function route() {
  const path = currentPath();
  let match = null;
  for (const [re, fn, opts] of ROUTES) {
    const m = path.match(re);
    if (m) { match = { fn, args: m.slice(1), opts: opts || {} }; break; }
  }
  if (!match) { go(''); return; }
  if (!store.profile() && !match.opts.open) {
    sessionStorage.setItem('hodaya-sql-after-login', path);
    if (path !== 'login') { history.replaceState(null, '', '#/login'); match = { fn: renderLogin, args: [], opts: {} }; }
  }
  if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.error(e); } }
  cleanup = null;
  closeModal();
  main.replaceChildren();
  main.className = 'page-' + (path.split('/')[0] || 'home');
  document.querySelectorAll('.site-nav a').forEach(a => {
    const target = a.getAttribute('href').replace(/^#\//, '');
    a.classList.toggle('active', target && (path === target || path.startsWith(target + '/')));
    if (a.classList.contains('active')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  try {
    cleanup = match.fn(main, ...match.args);
  } catch (e) {
    console.error(e);
    main.append(h('div', { class: 'page-head' }, h('h1', null, 'Oops.'), h('p', null, 'This page tripped over something. Reloading usually fixes it.')));
  }
  if (store.profile() && path !== 'login') store.quietly(d => { d.last = path; });
  window.scrollTo(0, 0);
  updateHeader();
}

// ---------- header ----------
function updateHeader() {
  const p = store.profile();
  const btn = document.getElementById('profileButton');
  btn.hidden = !p;
  if (p) btn.replaceChildren(h('span', { class: 'avatar', 'aria-hidden': 'true' }, p.name.slice(0, 1).toUpperCase()), h('span', { class: 'profile-name' }, p.name));
  const d = store.data();
  const got = d ? Object.keys(d.trophies).length : 0;
  document.getElementById('trophyCount').textContent = `${got} / ${TROPHIES.length}`;
  document.getElementById('trophyButton').hidden = !p;
}

function openProfileMenu() {
  const p = store.profile();
  if (!p) return;
  openModal(body => {
    const codeBox = h('textarea', { class: 'code-box', readonly: true, rows: 4, 'aria-label': 'Your backup code' });
    const importBox = h('textarea', { class: 'code-box', rows: 3, placeholder: 'Paste a backup code (HSQL1.…)', 'aria-label': 'Backup code to import' });
    const msg = h('p', { class: 'form-msg', role: 'status' });
    body.append(
      h('h2', { id: 'modalTitle' }, `Signed in as ${p.name}`),
      h('p', { class: 'modal-text' }, 'Your progress lives in this browser. To continue on another device (say, the laptop you take the exam on), copy your backup code here and paste it there.'),
      h('div', { class: 'modal-section' },
        h('button', { class: 'btn', type: 'button', onclick: () => { codeBox.value = store.exportCode(); codeBox.select(); try { navigator.clipboard.writeText(codeBox.value); msg.textContent = 'Copied to the clipboard.'; } catch (e) { msg.textContent = 'Select it and copy.'; } } }, 'Make a backup code'),
        codeBox),
      h('div', { class: 'modal-section' },
        h('label', { class: 'small-label' }, 'Bring progress from another device'),
        importBox,
        h('button', { class: 'btn', type: 'button', onclick: () => { try { const q = store.importCode(importBox.value); msg.textContent = `Merged. Welcome back, ${q.name}.`; updateHeader(); evaluateTrophies(true); route(); } catch (e) { msg.textContent = e.message; } } }, 'Import')),
      msg,
      h('div', { class: 'modal-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => { store.signOut(); closeModal(); go('login'); } }, 'Switch person / sign out')),
    );
  });
}

function openTrophies() {
  const d = store.data();
  if (!d) return;
  const got = TROPHIES.filter(t => d.trophies[t.id]).length;
  openModal(body => {
    body.append(
      h('h2', { id: 'modalTitle' }, 'Little trophies.'),
      h('p', { class: 'modal-text' }, `${got} of ${TROPHIES.length}. Nothing here is on the exam. They're just nice.`),
      h('div', { class: 'trophy-ledger' }, TROPHIES.map(t => {
        const on = !!d.trophies[t.id];
        return h('div', { class: 'trophy-row' + (on ? ' complete' : '') },
          h('span', { html: icon(on ? t.icon : 'lock') }),
          h('div', null, h('h3', null, on ? t.name : 'Not yet'), h('p', null, on ? t.desc : t.hint)),
          h('span', { class: 'trophy-mark' }, on ? '✓' : '?'));
      })),
      h('p', { class: 'local-save-note' }, store.canSave() ? 'Remembered in this browser.' : 'This browser is not allowing saves, so these reset when you leave.'));
  });
}

// ---------- trophies ----------
export function evaluateTrophies(silent = false) {
  const d = store.data();
  if (!d) return;
  const ctx = { exercises: C.exercises, lessons: C.lessons, quiz: C.quiz, tableCount: (sql.schema()?.tables || []).length };
  const fresh = [];
  for (const t of TROPHIES) {
    if (d.trophies[t.id]) continue;
    let ok = false;
    try { ok = ctx.exercises.length > 0 && t.test(d, ctx); } catch (e) { ok = false; }
    if (ok) fresh.push(t);
  }
  if (!fresh.length) return;
  store.quietly(x => { fresh.forEach(t => { x.trophies[t.id] = Date.now(); }); });
  updateHeader();
  if (!silent) fresh.forEach((t, i) => setTimeout(() => toast({ kicker: 'TROPHY UNLOCKED', title: t.name, text: t.desc, iconType: 'trophy' }), 400 + i * 900));
}

// ---------- theme ----------
function applyTheme(theme, remember) {
  const night = theme === 'night';
  if (night) document.documentElement.dataset.theme = 'night'; else delete document.documentElement.dataset.theme;
  if (remember) { try { localStorage.setItem('hodaya-sql-theme', night ? 'night' : 'day'); } catch (e) { /* private mode */ } }
  const btn = document.querySelector('.theme-button');
  btn.innerHTML = icon(night ? 'sun' : 'moon');
  btn.setAttribute('aria-label', night ? 'Switch to day mode' : 'Switch to night mode');
  btn.title = night ? 'Day mode' : 'Night mode';
  document.querySelector('meta[name=theme-color]').content = night ? '#262329' : '#eeede5';
}

// ---------- goat ----------
function petGoat() {
  const hearts = document.querySelector('.goat-hearts');
  hearts.hidden = false;
  hearts.innerHTML = icon('heart') + icon('heart') + icon('heart');
  hearts.classList.remove('go'); void hearts.offsetWidth; hearts.classList.add('go');
  clearTimeout(petGoat.t);
  petGoat.t = setTimeout(() => { hearts.hidden = true; }, 2600);
  if (store.profile()) {
    store.quietly(d => { d.goatPets = (d.goatPets || 0) + 1; });
    const n = store.data().goatPets;
    toast({ kicker: 'THE GOAT', title: pick(GOAT), text: n > 1 ? `Pets so far: ${n}.` : null, iconType: 'goat', ms: 3800 });
    evaluateTrophies();
  }
}

// ---------- boot ----------
async function boot() {
  hydrateIcons();
  initModal();
  applyTheme(document.documentElement.dataset.theme === 'night' ? 'night' : 'day', false);
  document.querySelector('.theme-button').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'night' ? 'day' : 'night', true));
  document.getElementById('profileButton').addEventListener('click', openProfileMenu);
  document.getElementById('trophyButton').addEventListener('click', openTrophies);
  document.querySelector('.footer-goat').addEventListener('click', petGoat);
  store.onChange(kind => { updateHeader(); if (kind !== 'profile') evaluateTrophies(); });

  try {
    await Promise.all([sql.init(), loadContent()]);
  } catch (e) {
    console.error(e);
    main.replaceChildren(h('div', { class: 'page-head' }, h('h1', null, 'The database did not load.'),
      h('p', null, 'Check the internet connection and reload. If this is a very old browser, try a recent Chrome, Firefox or Safari.'),
      h('p', { class: 'small-print' }, String(e.message || e))));
    return;
  }
  window.addEventListener('hashchange', route);
  route();
  evaluateTrophies(true);
}

boot();
