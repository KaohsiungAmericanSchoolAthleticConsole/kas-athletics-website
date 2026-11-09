// Festive themes for the public site (snow at Christmas, ghosts at Halloween…).
// Staff choose one in Site settings, or leave it on Automatic so the site
// decorates itself at the right time of year. Pure functions: this file also
// runs in the browser for the editor preview.

export const SEASONAL_OPTIONS = [
  { value: 'auto', label: 'Automatic (festive effects at the right time of year)' },
  { value: 'off', label: 'None (plain site all year)' },
  { value: 'winter', label: 'Winter / Christmas — falling snow and snow on the ground' },
  { value: 'halloween', label: 'Halloween — flying ghosts, bats and pumpkin colors' },
  { value: 'spring', label: 'Spring — drifting blossom petals' },
  { value: 'newyear', label: 'New Year — falling confetti' },
  { value: 'dragon', label: 'Dragon spirit — rising embers' },
];

export const SEASONAL_IDS = SEASONAL_OPTIONS.map((o) => o.value);

/**
 * Which decorations the page should wear today.
 * @param {{ seasonal?: string }} site
 * @param {Date} [date]
 * @returns {string} '' when plain, otherwise a SEASONAL_IDS value
 */
export function seasonalFor(site = {}, date = new Date()) {
  const choice = String(site.seasonal || 'auto');
  if (choice === 'off') return '';
  if (choice !== 'auto') return SEASONAL_IDS.includes(choice) ? choice : '';

  const month = date.getMonth() + 1;
  const day = date.getDate();
  if ((month === 12 && day >= 30) || (month === 1 && day <= 2)) return 'newyear';
  if ((month === 12 && day >= 1) || (month === 1 && day <= 7)) return 'winter';
  if (month === 10) return 'halloween';
  if (month === 3 || month === 4 || (month === 5 && day <= 5)) return 'spring';
  return '';
}

/** A friendly name for the editor ("Winter / Christmas"). */
export function seasonalLabel(id) {
  return (SEASONAL_OPTIONS.find((o) => o.value === id) || { label: 'None' }).label.split(' — ')[0];
}
