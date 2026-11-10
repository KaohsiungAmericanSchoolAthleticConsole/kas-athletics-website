// The "captain's moment" at the top of every team page.
//
// A stadium-style panel: a sport pictogram runs in and plays the ball, then the
// captain's photo and name arrive. Every sport gets its own picture and ball,
// so a football page kicks a football and a volleyball page spikes a volleyball.
//
// The animation is decoration only (the scene is aria-hidden) and is switched
// on by site.js when the panel scrolls into view. Without JavaScript, or with
// reduced motion, everything is simply visible and still.
import { html, raw } from '../lib/html.js';
import { captainOf, sportOf, SPORT_LABELS } from '../lib/sport.js';
import { photo, initials } from './parts.js';
import { icon } from './layout.js';
import { ed, showWhenEditing, editing } from './edit.js';

const WORD = {
  soccer: 'Goal', basketball: 'Slam', volleyball: 'Spike', swimming: 'Stroke',
  running: 'Sprint', racket: 'Ace', bat: 'Hit', frisbee: 'Fly', golf: 'Birdie', generic: 'Dragons',
};

const POSE = {
  soccer: 'kick', basketball: 'jump', volleyball: 'spike', swimming: 'swim',
  running: 'run', racket: 'serve', bat: 'swing', frisbee: 'run', golf: 'swing', generic: 'jump',
};

// Olympic-pictogram style athletes: a filled head and thick round strokes.
const ATHLETES = {
  kick: '<circle class="head" cx="96" cy="52" r="17"/><path d="M96 74 92 136"/><path d="M95 88 130 106"/><path d="M95 88 64 72"/><path d="M92 136 106 188 102 244"/><path class="limb-kick" d="M92 136 128 164 160 178"/>',
  jump: '<circle class="head" cx="120" cy="46" r="17"/><path d="M120 68 118 126"/><path d="M118 82 94 36"/><path d="M118 82 146 34"/><path d="M118 126 94 166 110 200"/><path d="M118 126 146 166 130 204"/>',
  spike: '<circle class="head" cx="112" cy="50" r="17"/><path d="M112 72 108 130"/><path d="M110 86 140 44"/><path d="M110 86 82 62"/><path d="M108 130 86 170 100 204"/><path d="M108 130 138 168 124 204"/>',
  swim: '<circle class="head" cx="198" cy="126" r="16"/><path d="M184 134 Q142 156 96 142"/><path d="M172 132 Q152 96 122 104"/><path d="M150 146 Q142 112 110 116"/><path d="M96 142 Q74 154 54 146"/><path d="M96 142 Q78 170 58 176"/>',
  run: '<circle class="head" cx="110" cy="52" r="16"/><path d="M108 72 94 130"/><path d="M102 86 132 108"/><path d="M102 86 74 98"/><path d="M94 130 128 158 118 206"/><path d="M94 130 66 152 44 176"/>',
  serve: '<circle class="head" cx="104" cy="50" r="16"/><path d="M104 72 100 134"/><path d="M100 86 128 54"/><path d="M100 86 76 102"/><path d="M100 134 118 182 116 238"/><path d="M100 134 78 180 66 234"/>',
  swing: '<circle class="head" cx="92" cy="54" r="16"/><path d="M92 76 96 136"/><path d="M95 90 128 100"/><path d="M95 90 70 78"/><path d="M96 136 116 184 114 240"/><path d="M96 136 74 182 62 238"/>',
};

const PROPS = {
  racket: '<path class="prop" d="M128 54 142 42"/><ellipse class="prop" cx="152" cy="32" rx="17" ry="21" transform="rotate(28 152 32)"/>',
  bat: '<path class="prop" d="M128 100 178 68"/>',
  golf: '<path class="prop" d="M128 100 152 132 140 158"/>',
};

const BALLS = {
  soccer: '<circle cx="24" cy="24" r="21" fill="#fff" stroke="#101014" stroke-width="2.5"/><path d="M24 12 33 19 29 30 19 30 15 19Z" fill="#101014"/>',
  basketball: '<circle cx="24" cy="24" r="21" fill="#e2661a" stroke="#101014" stroke-width="2.5"/><path d="M3 24h42M24 3v42M9 9c8 8 22 8 30 0M9 39c8-8 22-8 30 0" stroke="#101014" stroke-width="2" fill="none"/>',
  volleyball: '<circle cx="24" cy="24" r="21" fill="#fff" stroke="#101014" stroke-width="2.5"/><path d="M24 3c8 10 8 30 0 42M4 17c12 2 28 12 34 24M44 17c-12 2-28 12-34 24" stroke="#101014" stroke-width="2" fill="none"/>',
  swimming: '<circle cx="16" cy="30" r="7" fill="none" stroke="#eaf7ff" stroke-width="2.5"/><circle cx="33" cy="18" r="5" fill="none" stroke="#eaf7ff" stroke-width="2.5"/><circle cx="28" cy="38" r="3.5" fill="none" stroke="#eaf7ff" stroke-width="2"/>',
  running: '<path d="M6 24h14M12 12l8 12-8 12M26 8l6 8-6 8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  racket: '<circle cx="24" cy="24" r="20" fill="#d7f24a" stroke="#101014" stroke-width="2.5"/><path d="M8 12c10 6 22 10 32 6M10 38c8-8 18-16 28-20" fill="none" stroke="#101014" stroke-width="2"/>',
  bat: '<circle cx="24" cy="24" r="20" fill="#fff" stroke="#101014" stroke-width="2.5"/><path d="M12 10c8 6 8 22 0 28M36 10c-8 6-8 22 0 28" fill="none" stroke="#d43429" stroke-width="2" stroke-dasharray="3 3"/>',
  frisbee: '<ellipse cx="24" cy="24" rx="21" ry="8" fill="#fff" stroke="#101014" stroke-width="2.5"/><ellipse cx="24" cy="22" rx="12" ry="4" fill="none" stroke="#101014" stroke-width="1.5"/>',
  golf: '<circle cx="24" cy="24" r="19" fill="#fff" stroke="#101014" stroke-width="2"/><circle cx="18" cy="19" r="2" fill="#c9c9c9"/><circle cx="29" cy="22" r="2" fill="#c9c9c9"/><circle cx="22" cy="30" r="2" fill="#c9c9c9"/>',
  generic: '<path d="M24 4l5 13 14 1-11 9 4 14-12-8-12 8 4-14L5 18l14-1z" fill="#ffd34d" stroke="#101014" stroke-width="1.5"/>',
};

// The pitch / court / pool behind the athlete. Thin, quiet lines.
const FIELDS = {
  soccer: '<path d="M830 150h300v250H830z"/><path d="M830 150h75M905 150v250M980 150v250M1055 150v250M830 275h300"/><path d="M0 400h1200"/>',
  basketball: '<path d="M960 70h130v120H960z"/><path d="M1010 190h90"/><path d="M1010 190l20 72M1100 190l-20 72M1030 262h50M1010 226h90M1022 244h66"/>',
  volleyball: '<path d="M620 150v250M1200 150v250M620 200h580M620 260h580M620 320h580"/><path d="M700 200v200M780 200v200M860 200v200M940 200v200M1020 200v200M1100 200v200"/>',
  swimming: '<path d="M0 322q60-26 120 0t120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0"/><path d="M0 362q60-26 120 0t120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0"/><path d="M0 400h1200"/>',
  running: '<path d="M0 290q600-130 1200 0"/><path d="M0 330q600-130 1200 0"/><path d="M0 370q600-130 1200 0"/><path d="M1070 180v220M1112 180v220"/>',
  racket: '<path d="M600 180v220M1200 180v220M600 225h600M600 275h600M600 325h600"/><path d="M690 225v150M780 225v150M870 225v150M960 225v150M1050 225v150M1140 225v150"/>',
  bat: '<path d="M600 400 790 240 980 400"/><path d="M790 240v-40"/><path d="M560 400h480"/>',
  frisbee: '<path d="M0 400h1200M300 400V250M900 400V250M300 250h600"/><path d="M600 250v150"/>',
  golf: '<path d="M980 110v250M980 110h76l-16 22 16 22h-76"/><ellipse cx="1016" cy="372" rx="36" ry="9"/>',
  generic: '<path d="M140 400V130M1060 400V130M70 130h140M990 130h140"/><path d="M140 130 40 400M1060 130l100 270"/>',
};

function scene(sport) {
  return html`
    <svg class="captain__field" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      ${raw(FIELDS[sport] || FIELDS.generic)}
    </svg>`;
}

/**
 * @param {object} content
 * @param {object} team
 * @param {string} base content path of the team, e.g. seasons[0].teams[2]
 * @param {object} season
 */
export function captainReveal(content, team, base, season) {
  const cap = captainOf(team);
  // Every team gets its moment, even before a captain has been chosen.
  const heading = cap.name || (editing() ? 'Add a captain' : 'Captain to be announced');
  const sport = sportOf(team);
  const hasRoster = (team.players || []).some((p) => p && String(p.name || '').trim());
  const photoPath = `${base}.captain.photo`;

  return html`
    <section class="captain" id="team-captain" data-sport="${sport}" aria-labelledby="captain-title">
      <div class="captain__scene" aria-hidden="true">
        ${scene(sport)}
        <span class="captain__word">${WORD[sport] || WORD.generic}</span>
        <svg class="captain__athlete" viewBox="0 0 240 260" aria-hidden="true" focusable="false">
          ${raw(ATHLETES[POSE[sport]] || ATHLETES.kick)}${raw(PROPS[sport] || '')}
        </svg>
        <svg class="captain__ball" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${raw(BALLS[sport] || BALLS.generic)}</svg>
      </div>
      <div class="captain__inner">
        <div class="captain__copy">
          <p class="kicker">${SPORT_LABELS[sport]}${season?.title ? ` · ${season.title}` : ''}</p>
          <p class="captain__lead">Captain’s moment</p>
          <h2 class="captain__name" id="captain-title"${ed(`${base}.captain.name`, { placeholder: 'Captain’s name' })}>${heading}</h2>
          <p class="captain__meta">
            <span${ed(`${base}.captain.role`, { placeholder: 'Team captain' })}>${cap.role}</span>
            ${cap.year ? html`<span class="captain__dot" aria-hidden="true">·</span><span>${cap.year}</span>` : ''}
            ${showWhenEditing(team.level) ? html`<span class="captain__dot" aria-hidden="true">·</span><span${ed(`${base}.level`, { placeholder: 'Level' })}>${team.level}</span>` : ''}
          </p>
          ${cap.quote || editing() ? html`
            <blockquote class="captain__quote"${ed(`${base}.captain.quote`, { multiline: true, placeholder: 'Add a line from the captain (optional)' })}>${cap.quote}</blockquote>` : ''}
          <div class="captain__actions">
            ${hasRoster ? html`<a class="btn btn--primary" href="#team-roster">Meet the team ${icon('arrow')}</a>` : ''}
          </div>
        </div>
        <figure class="captain__card">
          ${photo(cap.photo, cap.name || team.name, { cls: 'captain__img', width: 800, height: 1000, fallback: initials(cap.name || team.name), edit: photoPath })}
          <figcaption class="captain__badge">
            <span class="captain__c" aria-hidden="true">C</span>
            <span class="captain__badge-text">
              ${cap.number || editing() ? html`<strong${ed(`${base}.captain.number`, { placeholder: '00' })}>${cap.number || '00'}</strong>` : ''}
              <span>${cap.role}</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>`;
}
