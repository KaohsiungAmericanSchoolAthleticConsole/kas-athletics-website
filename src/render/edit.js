// Markers for the on-page ("click to edit") editor.
// When a signed-in staff member views the site, templates add small data-*
// attributes that tell /admin/inline.js which content field each piece of
// text, photo or list comes from. For everyone else these return nothing,
// so public pages are unchanged.
//
// Rendering is synchronous, so a module-level flag scoped by renderWithEdit()
// is safe: it is always reset before any other request is handled.

import { raw, esc } from '../lib/html.js';

let active = false;

export const editing = () => active;

/** Render with edit markers on or off; the flag never leaks past this call. */
export function renderWithEdit(on, fn) {
  active = Boolean(on);
  try {
    return fn();
  } finally {
    active = false;
  }
}

/**
 * Editable text. Use on the element whose entire text IS the field.
 * @param {string} path content path, e.g. "home.heroTitle" or "seasons[0].teams[2].name"
 * @param {{ multiline?: boolean, placeholder?: string }} [opts]
 */
export function ed(path, { multiline = false, placeholder = '' } = {}) {
  if (!active) return '';
  return raw(` data-edit="${esc(path)}"${multiline ? ' data-edit-multiline' : ''}${placeholder ? ` data-placeholder="${esc(placeholder)}"` : ''}`);
}

/** Editable photo (an <img> or the placeholder shown when there is none). */
export const edImg = (path) => (active ? raw(` data-edit-image="${esc(path)}"`) : '');

/** A list whose direct children can be dragged into a new order. */
export const edList = (path) => (active ? raw(` data-edit-list="${esc(path)}"`) : '');

/** Show an optional field while editing even when it is empty, so it can be filled in. */
export const showWhenEditing = (value) => Boolean(value) || active;
