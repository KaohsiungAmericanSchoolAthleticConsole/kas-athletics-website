<?php get_header(); ?>
<main class="section">
  <h1 class="section__title">Scoreboard</h1>
  <div class="sb">
    <div class="sb-main">
      <ul class="sb-grid">
        <?php
        $q = new WP_Query(['post_type' => 'kas_event', 'posts_per_page' => 50, 'orderby' => 'date', 'order' => 'DESC']);
        while ($q->have_posts()) : $q->the_post();
            $opp = get_post_meta(get_the_ID(), 'opponent', true);
            $k = get_post_meta(get_the_ID(), 'kas_score', true);
            $o = get_post_meta(get_the_ID(), 'opp_score', true);
        ?>
          <li class="sb-card">
            <article>
              <p class="sb-card__sport"><?php the_title(); ?></p>
              <div class="sb-card__teams">
                <div class="sb-team"><span class="sb-team__name">KAS</span><span class="sb-team__score"><?php echo esc_html($k); ?></span></div>
                <?php if ($opp) : ?>
                <div class="sb-team"><span class="sb-team__name"><?php echo esc_html($opp); ?></span><span class="sb-team__score"><?php echo esc_html($o); ?></span></div>
                <?php endif; ?>
              </div>
              <p class="sb-status"><strong><?php echo ($k !== '' && $o !== '') ? 'Final' : 'Upcoming'; ?></strong><span><?php echo get_the_date(); ?></span></p>
            </article>
          </li>
        <?php endwhile; wp_reset_postdata(); ?>
      </ul>
    </div>
  </div>
</main>
<?php get_footer(); ?>