import { h, icon, go, toast, timeAgo } from '../ui.js';
import * as store from '../store.js';

export function renderLogin(main) {
  const profiles = store.profiles();
  const input = h('input', { id: 'nameInput', class: 'text-input', type: 'text', autocomplete: 'given-name', maxlength: 40, placeholder: 'Hodaya', 'aria-describedby': 'nameHelp' });
  const cardName = h('span', { class: 'card-name' }, '');
  const cardSince = h('span', null, new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
  const msg = h('p', { class: 'form-msg', role: 'status' });

  input.addEventListener('input', () => { cardName.textContent = input.value.trim(); cardName.classList.toggle('typed', !!input.value.trim()); });

  function enter(name) {
    const isNew = !store.profiles().some(p => p.name.toLowerCase() === String(name).trim().toLowerCase());
    const p = store.signIn(name);
    if (!p) { msg.textContent = 'Type a name first (anything works).'; input.focus(); return; }
    const after = sessionStorage.getItem('hodaya-sql-after-login') || '';
    sessionStorage.removeItem('hodaya-sql-after-login');
    go(after && after !== 'login' ? after : '');
    if (/hodaya|הודיה/i.test(p.name)) {
      setTimeout(() => toast({ kicker: isNew ? 'WELCOME' : 'WELCOME BACK', title: isNew ? 'Welcome to the study hall.' : 'Welcome back.', text: isNew ? 'Start with the Chinook tour, or jump straight into practice.' : 'Everything is where you left it.', iconType: 'star' }), 500);
    }
  }

  const form = h('form', { class: 'login-form', onsubmit: e => { e.preventDefault(); enter(input.value || ''); } },
    h('label', { for: 'nameInput', class: 'small-label' }, "Who's studying?"),
    h('div', { class: 'input-row' }, input, h('button', { class: 'btn primary', type: 'submit' }, 'Come in', h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→'))),
    h('p', { id: 'nameHelp', class: 'small-print' }, 'No password. Your name just keeps your progress separate, and it stays in this browser.'),
    msg);

  const returning = profiles.length ? h('div', { class: 'returning' },
    h('p', { class: 'small-label' }, 'Welcome back'),
    profiles.slice(0, 4).map(p => {
      const n = Object.keys(p.data?.solved || {}).length;
      return h('button', { class: 'profile-pick', type: 'button', onclick: () => enter(p.name) },
        h('span', { class: 'avatar' }, p.name.slice(0, 1).toUpperCase()),
        h('span', { class: 'pick-text' }, h('strong', null, `Continue as ${p.name}`), h('small', null, `${n} solved · ${timeAgo(p.seen || p.created)}`)),
        h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→'));
    })) : null;

  main.append(h('section', { class: 'login hero' },
    h('div', { class: 'hero-copy' },
      h('p', { class: 'little-intro' }, h('span', { class: 'tiny-star', html: icon('star') }), 'Databases 2026 · exam prep'),
      h('h1', null, 'Hodaya vs.', h('br'), 'Chinook', h('span', { class: 'title-dot' }, '.')),
      h('p', { class: 'hero-description' }, 'The exam is on Chinook, not Sakila.', h('br'), 'Same SQL, different record store.', h('br'), 'This is where you get to know it.'),
      h('p', { class: 'hero-footnote' }, h('span', { class: 'drawn-arrow' }, '↳'), 'you beat Radahn hitless. this is a music shop.'),
      returning,
      form),
    h('div', { class: 'library-card paper', 'aria-hidden': 'true' },
      h('div', { class: 'card-top' }, h('span', { html: icon('book') }), h('span', null, 'STUDY HALL · READER\'S CARD'), h('span', null, 'No. 001')),
      h('div', { class: 'card-field' }, h('small', null, 'NAME'), cardName),
      h('div', { class: 'card-grid' },
        h('div', { class: 'card-field' }, h('small', null, 'ISSUED'), cardSince),
        h('div', { class: 'card-field' }, h('small', null, 'VALID UNTIL'), h('span', null, 'the exam, at least')),
        h('div', { class: 'card-field' }, h('small', null, 'DATABASE'), h('span', null, 'Chinook v1.4.5')),
        h('div', { class: 'card-field' }, h('small', null, 'LATE FEES'), h('span', null, 'none, ever'))),
      h('div', { class: 'card-stamp' }, 'ADMIT ONE', h('span', null, 'GOAT ON FILE')),
      h('p', { class: 'card-note' }, 'tables: 11 · tracks: 3,503 · snacks: bring your own')),
  ));
  setTimeout(() => (profiles.length ? main.querySelector('.profile-pick') : input)?.focus(), 50);
}
