<?php
/** A season: /sports/<season>/ with all its teams. */
if (!defined('ABSPATH')) {
    exit;
}
get_header();
$kas_season = kas_season(get_queried_object());
$kas_count = count($kas_season['teams']);
echo kas_crumbs(array(array(home_url('/'), 'Home'), array('', $kas_season['title']))); // phpcs:ignore
echo kas_page_hero($kas_season['dates'] ?: 'KAS Athletics', $kas_season['title'], $kas_season['intro'], $kas_season['image']); // phpcs:ignore
?>
<section class="section" aria-labelledby="season-teams">
  <div class="section__head">
    <h2 id="season-teams" class="section__title section__title--sm">Our teams<?php echo $kas_count ? ' <span class="count">' . (int) $kas_count . '</span>' : ''; ?></h2>
    <p class="section__intro">Every practice, every game, every Dragon. Pick a team and meet them.</p>
  </div>
  <?php
  if ($kas_count) {
      echo '<ul class="team-grid">' . implode('', array_map('kas_team_card', $kas_season['teams'])) . '</ul>'; // phpcs:ignore
  } else {
      echo kas_empty('Teams for this season will be announced soon — watch this space.'); // phpcs:ignore
  }
  ?>
</section>
<?php
get_footer();
