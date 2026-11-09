// Small helpers for describing editable fields (used by schema.js and blocks.js).
// Field types the editor and validator understand:
//   text, textarea, url, image, color, date, time, select, slug, score, team, boolean,
//   group (fields: [...]), list (item: {...}), blocks (page sections; see blocks.js)

export const text = (key, label, opts = {}) => ({ key, label, type: 'text', max: 160, ...opts });
export const area = (key, label, opts = {}) => ({ key, label, type: 'textarea', max: 5000, ...opts });
export const url = (key, label, opts = {}) => ({ key, label, type: 'url', ...opts });
export const image = (key, label, opts = {}) => ({ key, label, type: 'image', ...opts });
export const bool = (key, label, opts = {}) => ({ key, label, type: 'boolean', ...opts });
export const select = (key, label, options, opts = {}) => ({
  key, label, type: 'select', options: options.map(([value, text_]) => ({ value, label: text_ })), ...opts,
});
export const list = (key, label, itemFields, opts = {}) => ({
  key, label, type: 'list', max: 40, item: { type: 'group', fields: itemFields }, ...opts,
});
