<?php get_header(); ?>
<main>
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero__inner">
      <h1 id="hero-title" class="hero__title"><?php echo esc_html(get_theme_mod('hero_title', 'Home of the Dragons')); ?></h1>
      <p class="hero__subtitle"><?php echo esc_html(get_theme_mod('hero_subtitle', '')); ?></p>
    </div>
  </section>
  <?php if (have_posts()) : while (have_posts()) : the_post(); the_content(); endwhile; endif; ?>
</main>
<?php get_footer(); ?>
