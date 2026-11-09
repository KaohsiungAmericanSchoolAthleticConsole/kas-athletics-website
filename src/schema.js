// The single description of everything staff can edit.
// The admin editor builds its forms from this, and the server validates every
// save against it. To add a new editable field: add it here and use it in a
// template under src/render/. Nothing else needs to change.

const text = (key, label, opts = {}) => ({ key, label, type: 'text', max: 160, ...opts });
const area = (key, label, opts = {}) => ({ key, label, type: 'textarea', max: 5000, ...opts });
const url = (key, label, opts = {}) => ({ key, label, type: 'url', ...opts });
const image = (key, label, opts = {}) => ({ key, label, type: 'image', ...opts });

const team = {
  type: 'group',
  titleKey: 'name',
  fields: [
    text('name', 'Team name', { required: true, placeholder: 'Varsity Girls Volleyball' }),
    { key: 'slug', label: 'Web address', type: 'slug', from: 'name', help: 'Fills in automatically from the team name. Gives the team its own page.' },
    text('level', 'Level / league', { placeholder: 'High School · Varsity · TISSA' }),
    text('coach', 'Coaches', { max: 300, placeholder: 'Angela Hsu (Head Coach) · Kaitlyn Osborne (Assistant)' }),
    image('image', 'Team photo'),
    area('description', 'About the team', { max: 2000 }),
    text('practice', 'Practice times', { placeholder: 'Mon / Wed / Fri · 3:30–5:00 PM' }),
    area('roster', 'Roster (one player per line)', { max: 4000, placeholder: 'Adam Chu ’26\nEric Su ’28' }),
    {
      key: 'gallery', label: 'Photo gallery', type: 'list', addLabel: 'Add a photo', max: 40, titleKey: 'caption',
      item: { type: 'group', fields: [image('image', 'Photo', { required: true }), text('caption', 'Caption (optional)')] },
    },
  ],
};

export const SCHEMA = {
  type: 'group',
  fields: [
    {
      key: 'site', label: 'Site settings', type: 'group', icon: 'settings',
      help: 'Name, contact details, colors and the default theme.',
      fields: [
        text('name', 'Site name', { required: true }),
        text('tagline', 'Tagline'),
        text('shortName', 'Short name (scoreboard)', { max: 16, placeholder: 'KAS' }),
        text('schoolName', 'School name'),
        image('logo', 'Logo (square works best)'),
        text('phone', 'Phone'),
        text('email', 'Email'),
        area('address', 'Address', { max: 400 }),
        { key: 'brandColor', label: 'School color (accent)', type: 'color' },
        { key: 'brandColor2', label: 'Second school color (used by the Dragon theme)', type: 'color' },
        {
          key: 'defaultTheme', label: 'Default theme for new visitors', type: 'select',
          options: [
            { value: 'auto', label: 'Match the visitor’s device' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'dragon', label: 'Dragon (school colors)' },
            { value: 'contrast', label: 'High contrast' },
          ],
        },
        url('instagramUrl', 'Instagram link'),
        text('instagramHandle', 'Instagram handle', { placeholder: '@kas_athletic_council' }),
        url('youtubeUrl', 'YouTube channel (Watch Games)'),
        url('newsletterUrl', 'Newsletter sign-up link (e.g. a Google Form)'),
        text('footerNote', 'Footer note'),
      ],
    },
    {
      key: 'home', label: 'Home page', type: 'group', icon: 'home',
      help: 'The big banner, the director’s message, the video and the mission.',
      fields: [
        text('heroEyebrow', 'Small text above the title'),
        text('heroTitle', 'Main title', { required: true }),
        text('heroSubtitle', 'Subtitle', { max: 300 }),
        image('heroImage', 'Banner photo (wide)'),
        text('heroCtaLabel', 'Button text'),
        url('heroCtaLink', 'Button link'),
        {
          key: 'stats', label: 'Numbers strip', type: 'list', addLabel: 'Add a number', max: 6, titleKey: 'label',
          item: { type: 'group', fields: [text('value', 'Number', { max: 12 }), text('label', 'Label', { max: 40 })] },
        },
        text('directorName', 'Athletic director name'),
        text('directorRole', 'Athletic director title'),
        image('directorPhoto', 'Athletic director photo'),
        area('directorMessage', 'Director’s message'),
        text('videoTitle', 'Video title'),
        url('videoUrl', 'Recap video (YouTube link)'),
        area('videoCaption', 'Video caption', { max: 1000 }),
        url('calendarEmbedUrl', 'Google Calendar embed link (optional)'),
        text('missionTitle', 'Mission title'),
        area('missionBody', 'Mission text'),
      ],
    },
    {
      key: 'events', label: 'Games & events', type: 'list', addLabel: 'Add a game or event', icon: 'calendar', max: 300, titleKey: 'title',
      help: 'The next upcoming game appears in the banner at the top of every page automatically.',
      sortBy: 'date',
      item: {
        type: 'group',
        fields: [
          { key: 'date', label: 'Date', type: 'date', required: true },
          { key: 'time', label: 'Time', type: 'time' },
          { key: 'sport', label: 'Team', type: 'team', help: 'Pick the team so the game also appears on its team page and in the standings.' },
          text('title', 'Title', { required: true, placeholder: 'KAS vs. MAK' }),
          {
            key: 'venue', label: 'Home or away', type: 'select',
            options: [
              { value: 'home', label: 'Home' }, { value: 'away', label: 'Away' },
              { value: 'neutral', label: 'Neutral / tournament' },
            ],
          },
          text('location', 'Location'),
          text('opponent', 'Opponent', { placeholder: 'Morrison Academy', suggest: true, autofill: 'opponentLogo', help: 'Start typing to reuse a school you entered before (its logo is copied too). Leave empty for meets and tournaments.' }),
          image('opponentLogo', 'Opponent logo'),
          { key: 'kasScore', label: 'KAS score', type: 'score' },
          { key: 'opponentScore', label: 'Opponent score', type: 'score' },
          {
            key: 'status', label: 'Status', type: 'select',
            help: 'Leave on Automatic: games show as Final once both scores are in.',
            options: [
              { value: 'auto', label: 'Automatic' }, { value: 'live', label: 'Live now' },
              { value: 'postponed', label: 'Postponed' }, { value: 'cancelled', label: 'Cancelled' },
            ],
          },
          text('result', 'Result note', { placeholder: '2nd of 6 teams', help: 'For meets and tournaments, or extra detail like “OT”.' }),
          url('link', 'Watch / highlights link'),
          image('photo', 'Highlight photo (optional)'),
        ],
      },
    },
    {
      key: 'seasons', label: 'Sports pages', type: 'list', addLabel: 'Add a sports page', icon: 'trophy', max: 12, titleKey: 'title',
      help: 'Fall, Winter, Spring, Middle School… each becomes a page in the menu.',
      item: {
        type: 'group',
        fields: [
          text('title', 'Page title', { required: true }),
          { key: 'slug', label: 'Web address', type: 'slug', from: 'title', required: true, help: 'Fills in automatically from the page title, e.g. fall-sports.' },
          text('dates', 'Season dates', { placeholder: 'August – November' }),
          area('intro', 'Introduction', { max: 2000 }),
          image('image', 'Banner photo'),
          { key: 'teams', label: 'Teams', type: 'list', addLabel: 'Add a team', max: 40, titleKey: 'name', item: team },
        ],
      },
    },
    {
      key: 'coaches', label: 'Coaches', type: 'list', addLabel: 'Add a coach', icon: 'people', max: 120, titleKey: 'name',
      item: {
        type: 'group',
        fields: [
          text('name', 'Name', { required: true }),
          text('role', 'Role', { placeholder: 'Head Coach' }),
          text('sport', 'Sport'),
          image('photo', 'Photo'),
          text('email', 'Email'),
          area('bio', 'Short bio', { max: 1200 }),
        ],
      },
    },
    {
      key: 'contact', label: 'Contact page', type: 'group', icon: 'mail',
      fields: [
        text('title', 'Title'),
        area('intro', 'Introduction', { max: 2000 }),
        {
          key: 'people', label: 'People to contact', type: 'list', addLabel: 'Add a person', max: 20, titleKey: 'name',
          item: { type: 'group', fields: [text('name', 'Name'), text('role', 'Role'), text('email', 'Email'), text('phone', 'Phone')] },
        },
      ],
    },
    {
      key: 'links', label: 'Useful links', type: 'list', addLabel: 'Add a link', icon: 'link', max: 20, titleKey: 'label',
      item: { type: 'group', fields: [text('label', 'Label', { required: true }), url('url', 'Link', { required: true })] },
    },
  ],
};
