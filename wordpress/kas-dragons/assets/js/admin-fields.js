// Photo pickers in the Team / Game / Coach / Season edit boxes.
// Uses the WordPress media library; stores attachment IDs in a hidden input.
(function ($) {
  'use strict';

  function preview(box, attachments) {
    var area = box.find('.kas-media__preview').empty();
    attachments.forEach(function (a) {
      var sizes = a.sizes || {};
      var src = (sizes.thumbnail || sizes.medium || sizes.full || a).url;
      $('<img>', { src: src, alt: '' }).appendTo(area);
    });
  }

  $(document).on('click', '.kas-media__pick', function (event) {
    event.preventDefault();
    var box = $(this).closest('.kas-media');
    var input = box.find('input[type=hidden]');
    var multiple = box.data('multiple') === 1 || box.data('multiple') === '1';
    var frame = wp.media({
      title: multiple ? 'Choose photos' : 'Choose a photo',
      button: { text: 'Use ' + (multiple ? 'these photos' : 'this photo') },
      library: { type: 'image' },
      multiple: multiple ? 'add' : false,
    });
    frame.on('open', function () {
      var selection = frame.state().get('selection');
      String(input.val() || '').split(',').filter(Boolean).forEach(function (id) {
        var item = wp.media.attachment(id);
        item.fetch();
        selection.add(item);
      });
    });
    frame.on('select', function () {
      var chosen = frame.state().get('selection').toJSON();
      input.val(chosen.map(function (a) { return a.id; }).join(','));
      preview(box, chosen);
    });
    frame.open();
  });

  $(document).on('click', '.kas-media__clear', function (event) {
    event.preventDefault();
    var box = $(this).closest('.kas-media');
    box.find('input[type=hidden]').val('');
    box.find('.kas-media__preview').empty();
  });
})(jQuery);
