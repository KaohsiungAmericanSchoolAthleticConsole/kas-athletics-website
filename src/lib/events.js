// Helpers for the games & events list. Dates are stored as plain
// YYYY-MM-DD strings (school-local), so formatting uses UTC to avoid
// a game silently moving a day when the server is in another time zone.

export const SCHOOL_TIME_ZONE = 'Asia/Taipei';

export function todayInSchoolZone(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SCHOOL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const byDateTime = (a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`);

export function upcomingEvents(events = [], now = new Date()) {
  const today = todayInSchoolZone(now);
  return events.filter((e) => e.date && e.date >= today).toSorted(byDateTime);
}

export function pastEvents(events = [], now = new Date()) {
  const today = todayInSchoolZone(now);
  return events.filter((e) => e.date && e.date < today).toSorted(byDateTime).reverse();
}

function parts(date) {
  const d = new Date(`${date}T00:00:00Z`);
  const f = (opts) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts }).format(d);
  return { weekday: f({ weekday: 'short' }), month: f({ month: 'short' }), day: f({ day: 'numeric' }), year: f({ year: 'numeric' }) };
}

export function formatDate(date) {
  if (!date) return '';
  const p = parts(date);
  return `${p.weekday}, ${p.month} ${p.day}`;
}

export function dateBadge(date) {
  return date ? parts(date) : null;
}

export function formatTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function venueLabel(venue) {
  return { home: 'Home', away: 'Away', neutral: 'Neutral' }[venue] || '';
}
