<?php get_header(); ?>
<main class="section">
  <?php while (have_posts()) : the_post(); ?>
    <article>
      <h1 class="section__title"><?php the_title(); ?></h1>
      <div class="prose"><?php the_content(); ?></div>
    </article>
  <?php endwhile; ?>
</main>
<?php get_footer(); ?>
