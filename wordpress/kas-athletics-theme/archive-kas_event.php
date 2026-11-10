<?php get_header(); ?>
<main class="section">
  <h1 class="section__title">Scores &amp; schedule</h1>
  <ol class="event-list">
    <?php while (have_posts()) : the_post();
      $opp = get_post_meta(get_the_ID(), 'opponent', true);
      $k = get_post_meta(get_the_ID(), 'kas_score', true);
      $o = get_post_meta(get_the_ID(), 'opp_score', true);
    ?>
      <li class="event">
        <div class="event__body">
          <h3 class="event__title"><?php the_title(); ?></h3>
          <?php if ($opp) : ?><p class="event__meta"><?php echo esc_html($opp); ?> <?php echo esc_html($k); ?>–<?php echo esc_html($o); ?></p><?php endif; ?>
        </div>
      </li>
    <?php endwhile; ?>
  </ol>
</main>
<?php get_footer(); ?>