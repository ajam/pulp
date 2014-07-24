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

  $('#ajmint-mainmenu-trigger').click(function() {
    if ( $(this).hasClass('ajmint-expanded') ) {
      $icon = $(this).find('span.ajmint-icon-up-dir');
      $icon.addClass('ajmint-icon-down-dir');
      $icon.removeClass('ajmint-icon-up-dir');

      $(this).removeClass('ajmint-expanded');
    } else {
      $icon = $(this).find('span.ajmint-icon-down-dir');
      $icon.addClass('ajmint-icon-up-dir');
      $icon.removeClass('ajmint-icon-down-dir');

      $(this).addClass('ajmint-expanded');
    }
  });

  function resizeDropdownWidth() {
    if ($(window).width() >= 822) {
      $('#ajmint-dropdown').width($(window).width() - 260);
    } else {
      $('#ajmint-dropdown').width('auto');
    }
  }

  $(window).on('resize', function() {
    resizeDropdownWidth();
  });

  resizeDropdownWidth();

});


(function(){

	window.AJMINT = window.AJMINT || {};

  $('.ajmint-social-btn[data-type="twitter"]').click(function(e){
    AJMINT.sendTweet(e);
    e.stopPropagation()
    return false
  });

  $('.ajmint-social-btn[data-type="facebook"]').click(function(e){
  	AJMINT.sendFbShare(e);
  });


  AJMINT.percentEncode = function(string){
    return string.replace(/#/g, '%23').replace(/,/g, '%2c').replace(/ /g, '%20')
  }

	/* Usage: $el.click( function(e) { AJMINT.sendTweet(e) }) */
	// This function only needs e but if you want to pass in special text or a url hash, you can
  AJMINT.sendTweet = function(e, text, route){
    var base_url = 'https://twitter.com/intent/tweet?url=' + ((!route) ? window.location.href : ('http://' + window.location.hostname + window.location.pathname + route));
    text = (text) ? text : 'Syria\'s War: Where would seven million displaced people fit?';

    var tweet_text  = "&text=" + text,
        via_account = 'ajam',
        related     = "&related=ajam",
        counter_url = "&counturl=" + window.location.hostname + window.location.pathname;

    var twitter_url = AJMINT.percentEncode(base_url + tweet_text + ' via @' + via_account + related + counter_url);

    var leftPos = e.pageX - 400,
        topPos = e.pageY - 350;

    var settings = 'width=500,height=300,top=' + topPos + ',left=' + leftPos + ',scrollbars=no,location=0,statusbars=0,menubars=0,toolbars=0,resizable=0';
    
    window.open(twitter_url, 'Tweet', settings)
  }

  AJMINT.sendFbShare = function(e){
    var base_url = 'http://www.facebook.com/dialog/feed',
        app_id   = '?app_id=535698929817296',
        page_url = '&link=' + window.location.href;
    
    var description = "&description=Including refugees and those internally displaced, Syria's war has affected seven million people. But what do seven million people look like? Using Census data, this interactive shows where seven million people live in your area to illustrate the scope of this regional humanitarian crisis.",
        redirect    = '&redirect_uri=http://projects.aljazeera.com',
        image       = '&image=http://projects.aljazeera.com/2013/pi/images/socialmedia_promo.png';

    var facebook_url = base_url + app_id + page_url + description + redirect + image;
        facebook_url = AJMINT.percentEncode(facebook_url);
    console.log(facebook_url)
    var leftPos = e.pageX - 400,
        topPos = e.pageY - 350;

    var settings = 'width=900,height=450,top=' + topPos + ',left=' + leftPos + ',scrollbars=no,location=0,statusbars=0,menubars=0,toolbars=0,resizable=0';
    
    window.open(facebook_url, 'Share', settings);
  }

  AJMINT.sendGplusShare = function(e){
    var base_url = 'https://plus.google.com/share',
        page_url = '?url=' + window.location.href;

    var gplus_url = base_url + page_url;
        gplus_url = AJMINT.percentEncode(gplus_url);
    console.log(gplus_url)

    var settings = 'width=600,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no';
    
    window.open(gplus_url, 'Share', settings);
  }


}).call(this);