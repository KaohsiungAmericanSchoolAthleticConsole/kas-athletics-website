// The section ("block") library for the page builder.
// Every page is a list of sections. Each block type here defines:
//   label/group/hint  – how it appears in the "Add section" gallery
//   fields            – what can be edited (validated like the rest of the schema)
//   defaults()        – starting content when a student adds it
// Renderers live in src/render/sections.js (one per type).
// To add a new layout: add it here, add its renderer, add a test.

import { text, area, url, image, bool, select, list } from './fieldkit.js';

export const BACKGROUNDS = [['default', 'Page'], ['alt', 'Light'], ['dark', 'Dark'], ['brand', 'School red'], ['navy', 'Navy']];
export const SPACING = [['compact', 'Compact'], ['normal', 'Normal'], ['roomy', 'Roomy']];
export const ALIGN = [['left', 'Left'], ['center', 'Center']];

/** Style options every section has. */
export const COMMON_FIELDS = [
  select('bg', 'Background', BACKGROUNDS),
  select('space', 'Spacing', SPACING),
  select('align', 'Text alignment', ALIGN),
];

const button = (n = '') => [text(`button${n}Label`, `Button ${n || ''} text`.replace('  ', ' ')), url(`button${n}Link`, `Button ${n || ''} link`.replace('  ', ' '))];

export const BLOCK_GROUPS = ['Banners', 'Text', 'Photos', 'Games & teams', 'People', 'Media'];

export const BLOCKS = {
  hero: {
    label: 'Big banner', group: 'Banners', hint: 'Full-width photo with a big title',
    fields: [text('eyebrow', 'Small text above'), text('title', 'Title', { required: true }), area('subtitle', 'Subtitle', { max: 400 }),
      image('image', 'Background photo'), ...button(), ...button(2)],
    defaults: () => ({ eyebrow: 'Kaohsiung American School', title: 'Your big headline', subtitle: 'A short sentence about this page.', image: '', buttonLabel: 'Learn more', buttonLink: '/events', button2Label: '', button2Link: '' }),
  },
  heroSplit: {
    label: 'Split banner', group: 'Banners', hint: 'Title on one side, photo on the other',
    fields: [text('eyebrow', 'Small text above'), text('title', 'Title', { required: true }), area('subtitle', 'Subtitle', { max: 400 }), image('image', 'Photo'), ...button()],
    defaults: () => ({ eyebrow: 'KAS Dragons', title: 'A headline that grabs attention', subtitle: 'Tell visitors what this page is about.', image: '', buttonLabel: 'See the schedule', buttonLink: '/events' }),
  },
  pageHeader: {
    label: 'Page title', group: 'Banners', hint: 'Simple page heading with an intro',
    fields: [text('eyebrow', 'Small text above'), text('title', 'Title', { required: true }), area('intro', 'Introduction', { max: 600 }), image('image', 'Background photo (optional)')],
    defaults: () => ({ eyebrow: 'KAS Athletics', title: 'Page title', intro: 'A sentence or two introducing this page.', image: '' }),
  },
  cta: {
    label: 'Call to action', group: 'Banners', hint: 'Bold colored band with a button',
    fields: [text('title', 'Title'), area('text', 'Text', { max: 400 }), ...button()],
    defaults: () => ({ title: 'Never miss a game.', text: 'Follow the Dragons for schedules, results and big news.', buttonLabel: 'See the schedule', buttonLink: '/events', bg: 'brand' }),
  },
  heading: {
    label: 'Heading', group: 'Text', hint: 'A section title with a short intro',
    fields: [text('kicker', 'Small text above'), text('title', 'Title'), area('intro', 'Introduction', { max: 800 })],
    defaults: () => ({ kicker: 'Section', title: 'A clear heading', intro: '' }),
  },
  text: {
    label: 'Text', group: 'Text', hint: 'Paragraphs of text',
    fields: [text('title', 'Title'), area('body', 'Text')],
    defaults: () => ({ title: 'A short title', body: 'Write your story here. Press Enter twice to start a new paragraph.' }),
  },
  statement: {
    label: 'Big statement', group: 'Text', hint: 'Huge words beside a paragraph',
    fields: [text('title', 'Big words'), area('body', 'Text')],
    defaults: () => ({ title: 'More than winning.', body: 'What we believe, in a few sentences.', bg: 'dark' }),
  },
  textImage: {
    label: 'Text + photo', group: 'Text', hint: 'Story with a photo beside it',
    fields: [text('kicker', 'Small text above'), text('title', 'Title'), area('body', 'Text'), image('image', 'Photo'),
      select('imageSide', 'Photo side', [['right', 'Right'], ['left', 'Left']]), ...button()],
    defaults: () => ({ kicker: 'Spotlight', title: 'Tell a story', body: 'Describe a team, an athlete or a big moment.', image: '', imageSide: 'right', buttonLabel: '', buttonLink: '' }),
  },
  stats: {
    label: 'Numbers', group: 'Text', hint: 'Big numbers with labels',
    fields: [list('items', 'Numbers', [text('value', 'Number', { max: 16 }), text('label', 'Label', { max: 60 })], { max: 6, titleKey: 'label', addLabel: 'Add a number' })],
    defaults: () => ({ items: [{ value: '21', label: 'Teams' }, { value: '3', label: 'Seasons' }, { value: '100+', label: 'Athletes' }] }),
  },
  marquee: {
    label: 'Scrolling words', group: 'Text', hint: 'Huge words that slide as you scroll',
    fields: [area('words', 'Words (one per line)', { max: 600 })],
    defaults: () => ({ words: 'Fight Like a Dragon\nHome of the Dragons\nGo KAS' }),
  },
  divider: {
    label: 'Space', group: 'Text', hint: 'Breathing room or a thin line',
    fields: [bool('line', 'Show a line')],
    defaults: () => ({ line: true }),
  },
  gallery: {
    label: 'Photo grid', group: 'Photos', hint: 'A grid of photos with captions',
    fields: [text('title', 'Title'), list('items', 'Photos', [image('image', 'Photo'), text('caption', 'Caption')], { max: 40, titleKey: 'caption', addLabel: 'Add a photo' })],
    defaults: () => ({ title: 'Photos', items: [{ image: '', caption: '' }, { image: '', caption: '' }, { image: '', caption: '' }] }),
  },
  cards: {
    label: 'Cards', group: 'Photos', hint: 'Photo cards with a title and text',
    fields: [text('title', 'Title'), area('intro', 'Introduction', { max: 600 }),
      list('items', 'Cards', [image('image', 'Photo'), text('title', 'Title'), area('text', 'Text', { max: 600 }), url('link', 'Link (optional)')], { max: 24, titleKey: 'title', addLabel: 'Add a card' })],
    defaults: () => ({ title: 'Highlights', intro: '', items: [1, 2, 3].map((n) => ({ image: '', title: `Card ${n}`, text: 'A sentence about this.', link: '' })) }),
  },
  upcomingGames: {
    label: 'Upcoming games', group: 'Games & teams', hint: 'Next games from the schedule (automatic)',
    fields: [text('kicker', 'Small text above'), text('title', 'Title'), select('count', 'How many', [['2', '2'], ['4', '4'], ['6', '6'], ['8', '8']])],
    defaults: () => ({ kicker: 'Up next', title: 'On the schedule', count: '4' }),
  },
  results: {
    label: 'Latest results', group: 'Games & teams', hint: 'Recent final scores (automatic)',
    fields: [text('kicker', 'Small text above'), text('title', 'Title'), select('count', 'How many', [['2', '2'], ['4', '4'], ['6', '6'], ['8', '8']])],
    defaults: () => ({ kicker: 'Results', title: 'Latest scores', count: '4' }),
  },
  seasonTiles: {
    label: 'Season tiles', group: 'Games & teams', hint: 'Links to every sports season (automatic)',
    fields: [text('kicker', 'Small text above'), text('title', 'Title')],
    defaults: () => ({ kicker: 'Programs', title: 'Find your season' }),
  },
  quote: {
    label: 'Quote', group: 'People', hint: 'A message with a photo and name',
    fields: [text('kicker', 'Small text above'), text('title', 'Title'), image('photo', 'Photo'), area('text', 'Quote'), text('name', 'Name'), text('role', 'Role')],
    defaults: () => ({ kicker: 'In their words', title: 'A message to our Dragons', photo: '', text: 'Write the quote here.', name: 'Name', role: 'Role' }),
  },
  coaches: {
    label: 'Coaches', group: 'People', hint: 'Every coach with photo and bio (automatic)',
    fields: [text('title', 'Title (optional)')],
    defaults: () => ({ title: '' }),
  },
  contact: {
    label: 'Contact details', group: 'People', hint: 'Phone, email, address and people',
    fields: [text('title', 'Title (optional)')],
    defaults: () => ({ title: '' }),
  },
  video: {
    label: 'Video', group: 'Media', hint: 'A YouTube video (loads when played)',
    fields: [text('kicker', 'Small text above'), text('title', 'Title'), url('url', 'YouTube link'), image('poster', 'Cover photo'), area('caption', 'Caption', { max: 600 }), bool('withSocial', 'Show “Follow the Dragons” beside it')],
    defaults: () => ({ kicker: 'Watch', title: 'Season recap', url: '', poster: '', caption: '', withSocial: false }),
  },
  social: {
    label: 'Follow us', group: 'Media', hint: 'Instagram and YouTube links (from Site settings)',
    fields: [text('title', 'Title'), area('text', 'Text', { max: 400 })],
    defaults: () => ({ title: 'Follow the Dragons', text: 'Game-day photos, highlights and announcements.' }),
  },
  calendar: {
    label: 'Google Calendar', group: 'Media', hint: 'Embed the sports calendar',
    fields: [text('kicker', 'Small text above'), text('title', 'Title'), url('url', 'Google Calendar embed link')],
    defaults: () => ({ kicker: 'Calendar', title: 'KAS sports calendar', url: '' }),
  },
};

/** Full field list (style + content) for one block type, as a schema group. */
export function blockSchema(type) {
  const def = BLOCKS[type];
  if (!def) return null;
  return { type: 'group', fields: [select('type', 'Layout', Object.keys(BLOCKS).map((k) => [k, BLOCKS[k].label])), ...COMMON_FIELDS, ...def.fields] };
}

/** A brand-new section of this type, ready to insert. */
export function newBlock(type) {
  return { type, bg: 'default', space: 'normal', align: 'left', ...BLOCKS[type].defaults() };
}

/** Starting points for a new page. */
export const PAGE_TEMPLATES = {
  blank: { label: 'Blank', hint: 'Just a page title', blocks: ['pageHeader'] },
  spotlight: { label: 'Team spotlight', hint: 'Banner, story, photos and a quote', blocks: ['heroSplit', 'textImage', 'gallery', 'quote', 'cta'] },
  recap: { label: 'Event recap', hint: 'Banner, write-up, video and photos', blocks: ['hero', 'text', 'video', 'gallery'] },
  announcement: { label: 'Announcement', hint: 'Heading, details and a button', blocks: ['pageHeader', 'text', 'cta'] },
  results: { label: 'Results page', hint: 'Games, scores and season links', blocks: ['pageHeader', 'results', 'upcomingGames', 'seasonTiles'] },
};
