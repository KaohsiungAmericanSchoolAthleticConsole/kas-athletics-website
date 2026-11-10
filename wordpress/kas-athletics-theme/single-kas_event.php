<?php get_header();
$opp = get_post_meta(get_the_ID(), 'opponent', true);
$k = get_post_meta(get_the_ID(), 'kas_score', true);
$o = get_post_meta(get_the_ID(), 'opp_score', true);
$team = get_post_meta(get_the_ID(), 'team', true);
?>
<main class="section">
  <article class="event-card">
    <h1 class="section__title"><?php the_title(); ?></h1>
    <p class="event__meta">
      <?php if ($team) echo esc_html($team) . ' · '; ?>
      <?php echo get_the_date(); ?>
    </p>
    <?php if ($opp) : ?>
      <div class="sb-card">
        <div class="sb-team"><span class="sb-team__name">KAS</span><span class="sb-team__score"><?php echo esc_html($k); ?></span></div>
        <div class="sb-team"><span class="sb-team__name"><?php echo esc_html($opp); ?></span><span class="sb-team__score"><?php echo esc_html($o); ?></span></div>
        <?php if ($k !== '' && $o !== '') : ?>
          <p><?php echo ((int)$k > (int)$o) ? 'Final — KAS wins' : (((int)$k < (int)$o) ? 'Final — Opponent wins' : 'Final — Tie'); ?></p>
        <?php endif; ?>
      </div>
    <?php endif; ?>
    <div class="prose"><?php the_content(); ?></div>
  </article>
</main>
<?php get_footer(); ?>