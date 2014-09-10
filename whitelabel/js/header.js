$(document).ready(function() {
  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
      $('body').addClass('mobile');
  }

  $('#ajmint-hamburger').click(function() {
    if ( $('.ajmint-menuitem').hasClass('ajmint-expanded') ) {
      $('.ajmint-menuitem').removeClass('ajmint-expanded');
    } else {
      $('.ajmint-menuitem').addClass('ajmint-expanded');
    }
  });

  $('#ajmint-mainmenu-trigger').on('mouseenter', expandDropdown);

  $('#ajmint-mainmenu-trigger').on('mouseleave', closeDropdown);

	function closeDropdown(){
    $icon = $(this).find('span.ajmint-icon-up-dir');
    $icon.addClass('ajmint-icon-down-dir');
    $icon.removeClass('ajmint-icon-up-dir');

    $(this).removeClass('ajmint-expanded');
	}

	function expandDropdown(){
    $icon = $(this).find('span.ajmint-icon-down-dir');
    $icon.addClass('ajmint-icon-up-dir');
    $icon.removeClass('ajmint-icon-down-dir');

    $(this).addClass('ajmint-expanded');
	}

  function resizeDropdownWidth() {
    if ($(window).width() >= 822) {
      $('#ajmint-dropdown').width($(window).width() - 260);
    } else {
      $('#ajmint-dropdown').width('auto');
    }
  }

  $(window).on('resize', function() {
    resizeDropdownWidth_throttled();
  });

  var resizeDropdownWidth_throttled = _.throttle(resizeDropdownWidth, 300);

  resizeDropdownWidth();

});