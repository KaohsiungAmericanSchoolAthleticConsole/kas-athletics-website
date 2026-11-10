<?php get_header(); ?>
<main class="section">
  <h1 class="section__title">Coaches</h1>
  <ul class="coach-grid">
    <?php
    $q = new WP_Query(['post_type' => 'kas_team', 'posts_per_page' => -1, 'orderby' => 'title', 'order' => 'ASC']);
    // Coaches are stored as a separate option; fall back to a simple list.
    $coaches = get_option('kas_coaches', []);
    foreach ($coaches as $c) : ?>
      <li class="coach-card">
        <?php if (!empty($c['photo'])) : ?><img class="coach__photo" src="<?php echo esc_url($c['photo']); ?>" alt="<?php echo esc_attr($c['name']); ?>"><?php endif; ?>
        <h3 class="coach__name"><?php echo esc_html($c['name']); ?></h3>
        <p class="coach__role"><?php echo esc_html($c['role']); ?></p>
        <?php if (!empty($c['sport'])) : ?><p class="coach__sport"><?php echo esc_html($c['sport']); ?></p><?php endif; ?>
        <?php if (!empty($c['bio'])) : ?><p class="coach__bio"><?php echo esc_html($c['bio']); ?></p><?php endif; ?>
      </li>
    <?php endforeach; ?>
  </ul>
</main>
<?php get_footer(); ?>