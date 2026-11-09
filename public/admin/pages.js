// Extra editor pages: Staff accounts and Help.
import { h } from './dom.js';

const MIN_PASSWORD = 10;

function suggestPassword() {
  const words = ['dragon', 'court', 'goal', 'relay', 'spike', 'serve', 'pitch', 'track', 'swim', 'rally', 'block', 'assist'];
  const bytes = crypto.getRandomValues(new Uint32Array(4));
  return `${words[bytes[0] % words.length]}-${words[bytes[1] % words.length]}-${words[bytes[2] % words.length]}-${10 + (bytes[3] % 90)}`;
}

/**
 * @param {Function} api
 * @param {{ toast: Function, username: string }} ctx
 */
export function renderAccounts(api, { toast, username }) {
  const list = h('ul', { class: 'accounts' }, h('li', { class: 'muted' }, 'Loading…'));
  const error = h('p', { class: 'form-error', role: 'alert', hidden: true });

  async function load() {
    try {
      const { users } = await api('GET', '/api/users');
      list.replaceChildren(...users.map((u) => h('li', {},
        h('span', {}, h('strong', {}, u.username), u.isYou ? h('span', { class: 'badge' }, 'You') : null),
        u.isYou ? h('span', { class: 'muted small' }, 'Change your password from the sidebar.') : h('span', { class: 'accounts__actions' },
          h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: () => reset(u.username) }, 'Reset password'),
          h('button', { type: 'button', class: 'btn btn--quiet btn--sm', onclick: () => remove(u.username) }, 'Remove')))));
    } catch (err) { list.replaceChildren(h('li', { class: 'form-error' }, err.message)); }
  }

  async function reset(name) {
    const password = suggestPassword();
    if (!confirm(`Give ${name} a new password?\n\nNew password: ${password}\n\nWrite it down and pass it on privately. ${name} will be signed out.`)) return;
    try {
      await api('POST', '/api/users/reset', { username: name, password });
      toast(`New password set for ${name}.`);
    } catch (err) { toast(err.message, 'error'); }
  }

  async function remove(name) {
    if (!confirm(`Remove ${name}? They will no longer be able to sign in.`)) return;
    try {
      await api('DELETE', `/api/users/${encodeURIComponent(name)}`);
      toast(`${name} was removed.`);
      load();
    } catch (err) { toast(err.message, 'error'); }
  }

  const userInput = h('input', { name: 'username', required: true, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'e.g. angela', pattern: '[A-Za-z0-9._-]{2,32}' });
  const passInput = h('input', { name: 'password', required: true, minlength: MIN_PASSWORD, autocomplete: 'new-password', value: suggestPassword() });
  const form = h('form', { class: 'accounts__form', onsubmit: async (e) => {
    e.preventDefault();
    error.hidden = true;
    try {
      await api('POST', '/api/users', { username: userInput.value.trim(), password: passInput.value });
      toast(`Account created for ${userInput.value.trim()}. Share the password with them privately.`);
      userInput.value = '';
      passInput.value = suggestPassword();
      load();
    } catch (err) { error.textContent = err.message; error.hidden = false; }
  } },
  h('h2', { class: 'subtitle' }, 'Add a staff member'),
  h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Username'), userInput,
    h('span', { class: 'field__help' }, 'Letters, numbers, dots or dashes. No spaces.')),
  h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Starting password'), passInput,
    h('span', { class: 'field__help' }, `At least ${MIN_PASSWORD} characters. We suggested one; they can change it after signing in.`)),
  error,
  h('div', {}, h('button', { type: 'submit', class: 'btn btn--primary' }, 'Create account')));

  load();
  return h('div', { class: 'group' },
    h('p', { class: 'muted' }, `Signed in as ${username}. Everyone listed here can edit the whole website.`),
    list, form);
}

const STEPS = [
  ['Change something', 'Easiest: open “Edit on the page” (top of the sidebar), pick a page, then click any outlined text and type, or use “Change photo” on a picture. For games, scores and settings, use the other sections. Nothing is public yet.'],
  ['Add a photo', 'Press “Upload photo” or drag a picture onto the box. Large phone photos are made smaller automatically.'],
  ['Publish', 'Press the red “Publish changes” button at the top. Your changes appear on the website straight away. Ctrl + S (⌘ + S on Mac) does the same.'],
  ['Changed your mind?', '“Discard changes” throws away everything since you last published. Already published something wrong? Open “Undo history”, load an earlier version and publish it.'],
];

const TASKS = [
  ['Add a game', 'Games & events → “Add a game or event”. Fill in the date, pick the team, type the opponent. It appears on the Schedule, the Scores page and the team’s page.'],
  ['Enter a final score', 'Games & events → open the game → fill in “KAS score” and “Opponent score” → Publish. The game shows as Final and the standings update by themselves.'],
  ['Show a game as live', 'Open the game → Status: “Live now”. Update the scores as it goes and publish each time; the Scores page refreshes every minute. Set Status back to “Automatic” afterwards.'],
  ['Add a team', 'Sports pages → open a season → Teams → “Add a team”. The web address fills in from the name.'],
  ['Add a new staff member', 'Staff accounts → enter a username → “Create account”, then give them the password privately.'],
];

export function renderHelp() {
  return h('div', { class: 'help' },
    h('h2', { class: 'subtitle' }, 'The basics'),
    h('ol', { class: 'help__steps' }, STEPS.map(([title, text]) => h('li', {}, h('strong', {}, title), h('p', {}, text)))),
    h('h2', { class: 'subtitle' }, 'Common tasks'),
    h('dl', { class: 'help__tasks' }, TASKS.map(([title, text]) => h('div', {}, h('dt', {}, title), h('dd', {}, text)))),
    h('h2', { class: 'subtitle' }, 'Good to know'),
    h('ul', { class: 'help__notes' },
      h('li', {}, 'Red messages tell you exactly which box needs fixing. Nothing is published until they are fixed.'),
      h('li', {}, 'If two people edit at the same time, the second person to publish is warned instead of overwriting the first person’s work.'),
      h('li', {}, 'If you get signed out while editing, sign back in: your unpublished changes are still there.'),
      h('li', {}, 'Links must start with https:// (we add it for you if you type www…). Pages on this site start with /, like /scores.')));
}
