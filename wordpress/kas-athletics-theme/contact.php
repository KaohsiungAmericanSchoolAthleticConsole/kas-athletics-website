<?php get_header(); ?>
<main class="section">
  <h1 class="section__title"><?php the_title(); ?></h1>
  <div class="prose"><?php the_content(); ?></div>
  <?php
  $people = get_option('kas_contact_people', []);
  if ($people) : ?>
    <ul class="contact__list">
      <?php foreach ($people as $p) : ?>
        <li class="contact__person">
          <strong><?php echo esc_html($p['name']); ?></strong>
          <span><?php echo esc_html($p['role']); ?></span>
          <?php if (!empty($p['email'])) : ?><a href="mailto:<?php echo esc_attr($p['email']); ?>"><?php echo esc_html($p['email']); ?></a><?php endif; ?>
          <?php if (!empty($p['phone'])) : ?><span><?php echo esc_html($p['phone']); ?></span><?php endif; ?>
        </li>
      <?php endforeach; ?>
    </ul>
  <?php endif; ?>
</main>
<?php get_footer(); ?>