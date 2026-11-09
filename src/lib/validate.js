// Validates and cleans content against src/schema.js.
// Returns a brand-new object: unknown keys are dropped, strings trimmed,
// and anything unsafe (bad URLs, odd colors) reported as an error.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const SCORE_RE = /^\d{1,4}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set(['admin', 'api', 'uploads', 'css', 'js', 'img', 'events', 'coaches', 'contact', 'scores']);
const DEFAULT_MAX = 160;

export function isSafeLink(value) {
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return true;
  return value.startsWith('/') && !value.startsWith('//');
}

export function isSafeImage(value) {
  if (/^\/(uploads|img)\/[A-Za-z0-9._/-]+$/.test(value) && !value.includes('..')) return true;
  return /^https:\/\//i.test(value);
}

function checkString(field, value, path, errors) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string' && typeof value !== 'number') {
    errors.push({ path, message: `${field.label} must be text.` });
    return '';
  }
  const s = String(value).replace(/\r\n/g, '\n').trim();
  const max = field.max ?? (field.type === 'textarea' ? 5000 : DEFAULT_MAX);
  if (field.required && !s) errors.push({ path, message: `${field.label} is required.` });
  if (s.length > max) errors.push({ path, message: `${field.label} is too long (max ${max} characters).` });
  if (!s) return '';

  const invalid = (msg) => errors.push({ path, message: `${field.label}: ${msg}` });
  switch (field.type) {
    case 'url': if (!isSafeLink(s)) invalid('use a full link starting with https:// or a page like /fall-sports.'); break;
    case 'image': if (!isSafeImage(s)) invalid('upload a photo or use an https:// image link.'); break;
    case 'color': if (!COLOR_RE.test(s)) invalid('pick a color like #C8102E.'); break;
    case 'date': if (!DATE_RE.test(s) || Number.isNaN(Date.parse(s))) invalid('use a real date.'); break;
    case 'time': if (!TIME_RE.test(s)) invalid('use a time like 15:30.'); break;
    case 'slug':
      if (!SLUG_RE.test(s)) invalid('use lowercase letters, numbers and dashes only.');
      else if (RESERVED_SLUGS.has(s)) invalid(`"${s}" is reserved, please choose another.`);
      break;
    case 'score': if (!SCORE_RE.test(s)) invalid('use a whole number like 3.'); break;
    case 'select':
      if (!field.options.some((o) => o.value === s)) invalid('choose one of the options.');
      break;
    default: break;
  }
  return s;
}

function checkList(field, value, path, errors) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    errors.push({ path, message: `${field.label} must be a list.` });
    return [];
  }
  if (field.max && value.length > field.max) {
    errors.push({ path, message: `${field.label} can have at most ${field.max} items.` });
  }
  return value.slice(0, field.max ?? value.length).map((item, i) => checkValue(field.item, item, `${path}[${i}]`, errors));
}

function checkGroup(field, value, path, errors) {
  const src = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    field.fields.map((f) => [f.key, checkValue(f, src[f.key], path ? `${path}.${f.key}` : f.key, errors)]),
  );
}

function checkValue(field, value, path, errors) {
  if (field.type === 'group') return checkGroup(field, value, path, errors);
  if (field.type === 'list') return checkList(field, value, path, errors);
  if (field.type === 'boolean') return value === true;
  return checkString(field, value, path, errors);
}

function checkUniqueSlugs(content, errors) {
  const seen = new Set();
  (content.seasons || []).forEach((s, i) => {
    if (s.slug) {
      if (seen.has(s.slug)) errors.push({ path: `seasons[${i}].slug`, message: `Two pages use the address "${s.slug}".` });
      seen.add(s.slug);
    }
    const teamSlugs = new Set();
    (s.teams || []).forEach((t, j) => {
      if (!t.slug) return;
      if (teamSlugs.has(t.slug)) errors.push({ path: `seasons[${i}].teams[${j}].slug`, message: `Two teams in ${s.title || 'this page'} use the address "${t.slug}".` });
      teamSlugs.add(t.slug);
    });
  });
}

/**
 * @param {object} schema root group schema
 * @param {unknown} input untrusted content
 * @returns {{ value: object, errors: Array<{path: string, message: string}> }}
 */
export function validateContent(schema, input) {
  const errors = [];
  const value = checkGroup(schema, input, '', errors);
  checkUniqueSlugs(value, errors);
  return { value, errors };
}
