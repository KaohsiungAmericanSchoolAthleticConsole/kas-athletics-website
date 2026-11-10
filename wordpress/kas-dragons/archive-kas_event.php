<?php
/** The schedule: /events/ */
if (!defined('ABSPATH')) {
    exit;
}
get_header();
$kas_upcoming = kas_upcoming_events();
$kas_past = array_slice(kas_past_events(), 0, 30);
echo kas_crumbs(array(array(home_url('/'), 'Home'), array('', 'Schedule'))); // phpcs:ignore
echo kas_page_hero('Games & events', 'Schedule', 'Home games, away trips and everything in between. Come cheer the Dragons on — we play louder with you there.'); // phpcs:ignore
?>
<section class="section" aria-labelledby="upcoming-title">
  <h2 id="upcoming-title" class="section__title section__title--sm">Upcoming</h2>
  <p class="section__intro">Put these in your calendar. The next one might be the best one.</p>
  <?php echo $kas_upcoming ? kas_event_list($kas_upcoming) : kas_empty('No games on the board yet — the next season drops soon.'); // phpcs:ignore ?>
</section>
<?php if ($kas_past) : ?>
<section class="section" aria-labelledby="past-title">
  <h2 id="past-title" class="section__title section__title--sm">Recent results</h2>
  <?php echo kas_event_list($kas_past, true, 'event-list event-list--past'); // phpcs:ignore ?>
</section>
<?php endif; ?>
<?php
get_footer();
