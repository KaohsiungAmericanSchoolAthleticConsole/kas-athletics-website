<?php get_header(); ?>
<main class="section">
  <h1 class="section__title">Teams</h1>
  <ul class="season-grid">
    <?php while (have_posts()) : the_post(); ?>
      <li class="season-card team-card">
        <a href="<?php the_permalink(); ?>">
          <?php if (has_post_thumbnail()) the_post_thumbnail('medium', ['class' => 'season-card__img']); ?>
          <span class="season-card__body">
            <span class="season-card__title"><?php the_title(); ?></span>
          </span>
        </a>
      </li>
    <?php endwhile; ?>
  </ul>
</main>
<?php get_footer(); ?>