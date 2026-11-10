<?php get_header();
$level = get_post_meta(get_the_ID(), 'level', true);
$coach = get_post_meta(get_the_ID(), 'coach', true);
$practice = get_post_meta(get_the_ID(), 'practice', true);
$roster = get_post_meta(get_the_ID(), 'roster', true);
?>
<main>
  <section class="page-hero" aria-labelledby="page-title">
    <div class="page-hero__inner">
      <h1 id="page-title" class="page-hero__title"><?php the_title(); ?></h1>
      <?php if ($level) : ?><p class="page-hero__intro"><?php echo esc_html($level); ?></p><?php endif; ?>
    </div>
    <?php if (has_post_thumbnail()) the_post_thumbnail('large', ['class' => 'page-hero__bg']); ?>
  </section>
  <section class="section" id="team-about">
    <dl class="team-facts">
      <?php if ($coach) : ?><div><dt>Coaches</dt><dd><?php echo esc_html($coach); ?></dd></div><?php endif; ?>
      <?php if ($practice) : ?><div><dt>Practice</dt><dd><?php echo esc_html($practice); ?></dd></div><?php endif; ?>
    </dl>
    <div class="prose"><?php the_content(); ?></div>
  </section>
  <?php if ($roster) : ?>
  <section class="section" id="team-roster">
    <h2 class="section__title section__title--sm">Roster</h2>
    <ul class="roster">
      <?php foreach (array_filter(array_map('trim', explode("\n", $roster))) as $line) : ?>
        <li><span class="roster__badge" aria-hidden="true"><?php echo esc_html(mb_substr($line, 0, 2)); ?></span><span><?php echo esc_html($line); ?></span></li>
      <?php endforeach; ?>
    </ul>
  </section>
  <?php endif; ?>
</main>
<?php get_footer(); ?>