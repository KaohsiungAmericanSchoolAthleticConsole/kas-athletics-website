<?php
/**
 * A team page: /teams/<team>/ (ported from src/render/team.js).
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();

$kas_post = get_queried_object();
$kas_terms = get_the_terms($kas_post, 'kas_season');
$kas_term = is_array($kas_terms) && $kas_terms ? $kas_terms[0] : null;
$kas_season = $kas_term ? kas_season($kas_term) : array('title' => '', 'url' => '', 'teams' => array());
$kas_team = kas_team($kas_post, $kas_term);

$kas_games = array_values(array_filter(kas_events(), fn($e) => $e['sport'] !== '' && strcasecmp(trim($e['sport']), trim($kas_team['name'])) === 0));
$kas_upcoming = kas_upcoming_events($kas_games);
$kas_past = kas_past_events($kas_games);
$kas_players = $kas_team['players'];

$kas_crumbs = array(array(home_url('/'), 'Home'));
if ($kas_term) {
    $kas_crumbs[] = array($kas_season['url'], $kas_season['title']);
}
$kas_crumbs[] = array('', $kas_team['name']);
echo kas_crumbs($kas_crumbs); // phpcs:ignore WordPress.Security.EscapeOutput
echo kas_page_hero(implode(' · ', array_filter(array($kas_season['title'], $kas_team['level']))), $kas_team['name'], '', $kas_team['image']); // phpcs:ignore
echo kas_captain_reveal($kas_team, $kas_season['title']); // phpcs:ignore

$kas_jump = array_filter(array(
    '#team-captain' => 'Captain',
    '#team-schedule' => ($kas_upcoming || $kas_past) ? 'Schedule' : '',
    '#team-roster' => $kas_players ? 'Roster' : '',
));
?>
<section class="section section--tight team-intro" id="team-about" aria-label="About the team">
  <?php if ($kas_term) : ?>
    <a class="text-link" href="<?php echo esc_url($kas_season['url']); ?>">← All <?php echo esc_html($kas_season['title']); ?></a>
  <?php endif; ?>
  <?php if (count($kas_jump) > 1) : ?>
    <nav class="jump-nav" aria-label="On this page"><span class="jump-nav__label">On this page</span>
      <?php foreach ($kas_jump as $kas_href => $kas_label) : ?>
        <a href="<?php echo esc_attr($kas_href); ?>"><?php echo esc_html($kas_label); ?></a>
      <?php endforeach; ?>
    </nav>
  <?php endif; ?>
  <dl class="team-facts">
    <?php if ($kas_team['coach'] !== '') : ?><div><dt>Coaches</dt><dd><?php echo esc_html($kas_team['coach']); ?></dd></div><?php endif; ?>
    <?php if ($kas_team['practice'] !== '') : ?><div><dt>Practice</dt><dd><?php echo esc_html($kas_team['practice']); ?></dd></div><?php endif; ?>
    <?php if ($kas_players) : ?><div><dt>Squad</dt><dd><?php echo (int) count($kas_players); ?> players</dd></div><?php endif; ?>
  </dl>
  <?php if ($kas_team['description'] !== '') : ?>
    <div class="team-intro__text"><?php echo kas_paragraphs($kas_team['description']); // phpcs:ignore ?></div>
  <?php endif; ?>
</section>

<?php if ($kas_upcoming || $kas_past) : ?>
<section class="section" id="team-schedule" aria-labelledby="team-schedule-title">
  <h2 id="team-schedule-title" class="section__title section__title--sm">Schedule &amp; results</h2>
  <?php echo $kas_upcoming ? kas_event_list($kas_upcoming) : ''; // phpcs:ignore ?>
  <?php echo $kas_past ? kas_event_list($kas_past, true, 'event-list event-list--past') : ''; // phpcs:ignore ?>
</section>
<?php endif; ?>

<?php if ($kas_players) : ?>
<section class="section" id="team-roster" aria-labelledby="team-roster-title">
  <h2 id="team-roster-title" class="section__title section__title--sm">Roster <span class="count"><?php echo (int) count($kas_players); ?></span></h2>
  <p class="section__intro">The Dragons who make it happen.</p>
  <ul class="player-grid"><?php echo implode('', array_map('kas_player_card', $kas_players)); // phpcs:ignore ?></ul>
</section>
<?php endif; ?>

<?php if ($kas_team['gallery'] && !$kas_players) : ?>
<section class="section" id="team-photos" aria-labelledby="team-photos-title">
  <h2 id="team-photos-title" class="section__title section__title--sm">Photos</h2>
  <p class="section__intro">Game day, practice and everything in between.</p>
  <ul class="gallery">
    <?php foreach ($kas_team['gallery'] as $kas_i => $kas_src) : ?>
      <li><a href="<?php echo esc_url($kas_src); ?>" target="_blank" rel="noopener">
        <?php echo kas_photo($kas_src, $kas_team['name'] . ' photo ' . ($kas_i + 1), array('width' => 600, 'height' => 400)); // phpcs:ignore ?>
      </a></li>
    <?php endforeach; ?>
  </ul>
</section>
<?php endif; ?>

<?php
// Previous / next team in the same season.
$kas_ids = array_column($kas_season['teams'], 'id');
$kas_pos = array_search($kas_team['id'], $kas_ids, true);
if ($kas_pos !== false && count($kas_ids) > 1) :
    $kas_prev = $kas_season['teams'][$kas_pos - 1] ?? null;
    $kas_next = $kas_season['teams'][$kas_pos + 1] ?? null;
    ?>
<nav class="team-pager" aria-label="More teams in <?php echo esc_attr($kas_season['title']); ?>">
  <?php if ($kas_prev) : ?>
    <a class="team-pager__link team-pager__link--prev" href="<?php echo esc_url($kas_prev['url']); ?>"><span>← Previous team</span><strong><?php echo esc_html($kas_prev['name']); ?></strong></a>
  <?php else : ?><span aria-hidden="true"></span><?php endif; ?>
  <a class="team-pager__all" href="<?php echo esc_url($kas_season['url']); ?>">All <?php echo esc_html($kas_season['title']); ?></a>
  <?php if ($kas_next) : ?>
    <a class="team-pager__link team-pager__link--next" href="<?php echo esc_url($kas_next['url']); ?>"><span>Next team →</span><strong><?php echo esc_html($kas_next['name']); ?></strong></a>
  <?php else : ?><span aria-hidden="true"></span><?php endif; ?>
</nav>
<?php endif; ?>

<?php
get_footer();
