// Works out what kind of sport a team plays, so the site can give every team
// page its own little moment (a kick, a dunk, a spike...) and a captain card.
// Pure functions only: this file is also served to the browser for the editor
// preview, so it must not import anything from Node.

export const SPORT_KINDS = [
  'soccer', 'basketball', 'volleyball', 'swimming', 'running',
  'racket', 'bat', 'frisbee', 'golf', 'generic',
];

// Staff can pick one of these in the editor; '' means "work it out from the name".
export const SPORT_OPTIONS = [
  { value: '', label: 'Automatic (from the team name)' },
  { value: 'soccer', label: 'Football / soccer' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'volleyball', label: 'Volleyball' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'running', label: 'Running / cross country / track' },
  { value: 'racket', label: 'Tennis, badminton, table tennis' },
  { value: 'bat', label: 'Baseball / softball' },
  { value: 'frisbee', label: 'Ultimate frisbee' },
  { value: 'golf', label: 'Golf' },
  { value: 'generic', label: 'Other (generic Dragon)' },
];

export const SPORT_LABELS = {
  soccer: 'Football', basketball: 'Basketball', volleyball: 'Volleyball', swimming: 'Swimming',
  running: 'Running', racket: 'Racket sports', bat: 'Baseball', frisbee: 'Ultimate', golf: 'Golf', generic: 'Dragon athletics',
};

// Order matters: the first match wins ("cross country" before "country", etc.).
const RULES = [
  ['soccer', /\b(soccer|football|futbol)\b/i],
  ['basketball', /\b(basketball|hoops?)\b/i],
  ['volleyball', /\bvolleyball\b/i],
  ['swimming', /\b(swim|swimming|swim team|water polo)\b/i],
  ['running', /\b(cross[- ]?country|track|running|athletics|x country|xc)\b/i],
  ['racket', /\b(tennis|badminton|squash|table tennis|ping[- ]?pong|pickleball)\b/i],
  ['bat', /\b(baseball|softball|cricket)\b/i],
  ['frisbee', /\b(frisbee|ultimate)\b/i],
  ['golf', /\bgolf\b/i],
];

/** @returns {string} one of SPORT_KINDS */
export function detectSport(name = '', level = '') {
  const text = `${name} ${level}`;
  for (const [kind, re] of RULES) if (re.test(text)) return kind;
  return 'generic';
}

/** The team's sport: the staff choice when set, otherwise worked out from the name. */
export function sportOf(team = {}) {
  return SPORT_KINDS.includes(team.sport) ? team.sport : detectSport(team.name, team.level);
}

/** "Adam Chu ’26" -> { name: "Adam Chu", year: "Class of 2026" } */
export function playerFromLine(line = '') {
  const text = String(line).trim();
  const grad = /[’'‘](\d{2})\b/.exec(text);
  const name = text
    .replace(/\s*[’'‘]\d{2}\b/, '')
    .replace(/\s*\((?:c|captain)\)\s*$/i, '')
    .trim();
  return { name, year: grad ? `Class of 20${grad[1]}` : '' };
}

const rosterLines = (team) => String(team.roster || '')
  .split('\n').map((l) => l.trim()).filter(Boolean);

/**
 * Everything the captain reveal needs. Staff fields win; if the captain has not
 * been set yet, the player whose role mentions "captain" (or else the first
 * player card) and the team photo stand in, so every team page still gets its
 * moment. Nothing is invented beyond that.
 */
export function captainOf(team = {}) {
  const c = team.captain && typeof team.captain === 'object' ? team.captain : {};
  const pick = (key, flatKey) => String(c[key] || team[flatKey] || '').trim();
  const players = (Array.isArray(team.players) ? team.players : []).filter((p) => p && String(p.name || '').trim());
  const lead = players.find((p) => /captain/i.test(p.role || '')) || players[0]
    || { ...playerFromLine(rosterLines(team)[0] || ''), photo: '', number: '', quote: '' };
  const gallery = (team.gallery || []).find((g) => g && g.image);
  const customName = pick('name', 'captainName');
  const fromLead = (value) => (customName ? '' : String(value || '').trim());
  return {
    name: customName || String(lead.name || '').trim(),
    role: pick('role', 'captainRole') || 'Team captain',
    number: pick('number', 'captainNumber') || fromLead(lead.number),
    year: pick('year', 'captainYear') || fromLead(lead.year),
    quote: pick('quote', 'captainQuote') || fromLead(lead.quote),
    photo: pick('photo', 'captainPhoto') || fromLead(lead.photo) || team.image || (gallery ? gallery.image : ''),
    fromRoster: !customName,
  };
}
