(function(){
	'use strict';

	// This could be used to fire page events that can then be picked up at various other parts of the code
	// Useful for analytics
	// window.pulpPageEvents = _.extend({}, Backbone.Events);

	var State = Backbone.Model.extend({
		initialize: function(){
			this.set('single-page-width', parseInt( $('#pages').css('max-width') ));
			this.set('format', {});
			this.set('zoom', null);
		},
		setPageFormat: function(page){
			this.set('format', this.determineLayoutInformation( page ) );
		},
		determineLayoutInformation: function(page){
			var bookend = this.determineBookend(page);
			var format = this.determinePageFormat();
			return { format: format, bookend: bookend };
		},
		determinePageFormat: function(windowWidth){
			windowWidth = windowWidth || $(window).width();
			var format,
					current_format = this.get('format').format;
			var dynamic_page_width = parseInt($('.page-container.viewing img').css('width')) || parseInt($('.page-container img').css('width')),
					static_page_width = this.get('single-page-width'),
					page_limit = 635;

			// console.log(windowWidth, dynamic_page_width, dynamic_page_width*2 + PULP_SETTINGS.gutterWidth)
			if (windowWidth > dynamic_page_width*2 + PULP_SETTINGS.gutterWidth) {
				// If the window is wide enough for two pages
				format = 'double';
			} else if (windowWidth <= page_limit) {
				// If it's less than a single page
				format = 'mobile';
			} else {
				// Everything else
				format = 'single';
			}
			return format;
		},
		determineBookend: function(page){
			var this_page = page || states.currentPage,
					bookend;
			if (this_page == 1) {
				bookend = 'true';
			} else {
				bookend = 'false'
			}
			return bookend;
		}
	});

	var state = new State;

	var states = {
		currentPage: '1',
		currentHotspot: '',
		lastPage: '',
		lastHotspot: '',
		scaleMultiplier: 1,
		firstRun: true,
		showNavHelpers: true
	}

	var helpers = {
		setTransitionCss: function(property, value, transitionDuration){
			var css = {}, duration = 0;
			css[property] = value;
			css = helpers.addDuration(css, transitionDuration);
			return css;
		},
		addDuration: function(cssObj, transitionDuration){
			var duration = transitionDuration ? PULP_SETTINGS.transitionDuration : 0;
			_.extend(cssObj, {'transition-duration': duration});
			return cssObj;
		},
		saveCurrentStates: function(page, hotspot, lastPage){
			var formatState = state.get('format'),
					format = formatState.format,
					bookend = formatState.bookend;

			if (format == 'double' && bookend == 'false' && page % 2 != 0) page = page - 1;
			if (page) states.currentPage = page;
			if (hotspot) states.currentHotspot = hotspot;
			if (lastPage) states.lastPage = lastPage;
		},
		hashToPageHotspotDict: function(hash){
			// If for some reason it has a slash as the last character, cut it so as to not mess up the split
			// if (hash.charAt(hash.length - 1) == '/') hash = hash.substring(0, hash.length -1);
			hash = hash.replace('#', '').split('/'); // `#1/3` -> ["1", "3"]
			hash = _.map(hash, function(val) { return Number(val)}); // Convert to number  ["1", "3"] -> [1, 3]
			return { page: hash[0], hotspot: hash[1] }
		},
		getNavDirection: function(e, code){
			var direction;
			// console.log(code)
			// Only allow this only one panel is visible, i.e. not during a transition
			if (code == 37 || code == 38 || code == 39 || code == 40 || code == 'swipeleft' || code == 'swiperight'){
				// Don't do the default behavior if it's an arrow, swipe or pinch
				e.preventDefault();
				e.stopPropagation();

				// Do this
				// Left arrow
				if (code == 37 || code == 'swiperight'){
					direction = 'prev';
				}
				// Right arrow
				else if (code == 39 || code == 'swipeleft'){
					direction = 'next';
				} 
				// Esc, up, down arrows
				else if (code == 27 || code == 38 || code == 40 ) {
					direction = false;
				}

				return direction;
			}
			return false;
		},
		toggleFullScreen: function(){
		  if ((document.fullScreenElement && document.fullScreenElement !== null) || (!document.mozFullScreen && !document.webkitIsFullScreen)) {
		    if (document.documentElement.requestFullScreen) {  
		      document.documentElement.requestFullScreen();  
		    } else if (document.documentElement.mozRequestFullScreen) {  
		      document.documentElement.mozRequestFullScreen();  
		    } else if (document.documentElement.webkitRequestFullScreen) {  
		      document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);  
		    }
		  } else {  
		    if (document.cancelFullScreen) {  
		      document.cancelFullScreen();  
		    } else if (document.mozCancelFullScreen) {  
		      document.mozCancelFullScreen();  
		    } else if (document.webkitCancelFullScreen) {  
		      document.webkitCancelFullScreen();  
		    }  
		  }  
		},
		sortByNumber: function(a,b) {
			return a.number - b.number;
		}
	}

	var templates = {
		pageFactory: _.template( $('#page-template').html() ),
		endnoteFactory: _.template( $('#endnote-template').html() )
	}

	var layout = {
		init: function(){
			this.mainContent = '#main-content-wrapper'
			this.drawerContainer = '#side-drawer-container';
			this.drawerContent = '#side-drawer-content';
			this.drawerHandle = '#side-drawer-handle';
			// An Ajam custom implementation:
			// Disable swipe detection if the drawer is open
			// If we didn't do this, then the page would be listening for swipes to change pages when we're using the slide gesture to close the drawer
			$.detectSwipe.scrollExceptionCondition = function(){
				return ($('body').attr('data-side-drawer-open') == 'true' || $('body').attr('data-side-drawer-state') == 'changing' );
			}
			this.slideContentArea(true);
		},
		bakeMasks: function(){
			$('#pages').append('<div class="mask" data-orientation="horizontal" id="top-mask"></div>')
								 .append('<div class="mask" data-orientation="horizontal" id="bottom-mask"></div>')
								 .append('<div class="mask" data-orientation="vertical" id="left-mask"></div>')
								 .append('<div class="mask" data-orientation="vertical" id="right-mask"></div>');
		},
		bakePages: function(pages){
			var page_markup, $page;
			states.pages_max = pages.length;
			// Sort pages before baking
			pages = pages.sort(helpers.sortByNumber);
			// Add `_pages_max` info to header
			var $header_page_display = $('.header-item[data-which="page-number"]');
			$header_page_display.find('#pages-max').html(states.pages_max);
			$header_page_display.find('input').attr('max', states.pages_max);
			for (var i = 0; i < pages.length; i++){
				// For non-lazy loading of cover images
				_.extend(pages[i], {img_format: PULP_SETTINGS.imgFormat});
				page_markup = templates.pageFactory(pages[i]);
				$('#pages').append(page_markup);
				$page = $('#page-'+pages[i].number);

				// Add listeners
				listeners.hotspotClicks( $page );
				listeners.pageTransitions();
			}
			// Set the z-index of the last page to 1000 so it can be on top of `#btns`
			$('#page-container-'+states.pages_max).css('z-index', '1000')

			// Once images are loaded, measure the hotspot locations
			layout.measurePageElements(function(){
				// Listen for changes in state
				listeners.state();
				// Read the hash and navigate
				routing.init();

				// Secrets
				// $('body').append('<img id="easter-egg-img" src="imgs/assets/spy.png"/>');

			});
		},
		measureHotspotsHeaderOffset: function(){
			$('#pages').attr('data-offset-top', $('#pages').offset().top);
			$('.hotspot').each(function(index, hs){
				var $hs = $(hs);
				$hs.attr('data-top', $hs.offset().top );
				$hs.attr('data-left', $hs.offset().left );
				$hs.attr('data-width', $hs.width() );
				$hs.attr('data-height', $hs.height() );
			});
		},
		measurePageElements: function(cb){
			layout.measureImgSetPageHeight(function(){
				layout.measureHotspotsHeaderOffset();
				if (cb) cb();
			});
		},
		measureImgSetPageHeight: function(cb){
			// Set the images to auto so that they expand according to the 100% rules of its parents
			// The resulting image dimensions will then be what we want to set to the parent so that the hotspot
			// container has the same dimensions as the child.
			// This is necessary because the image sizes down in keeping with the aspect ratio
			// But its parents don't.
			// You could try a javascript implementation of this, but that has its own issues.
			var $pages = $('#pages'),
					$pagesWrapper = $('#pages-wrapper');

			var auto_width_height = {
				'max-width': 'auto',
				'max-height': 'auto'
			};

			$pages.css(auto_width_height);
			$pagesWrapper.css(auto_width_height);

			$pages.imagesLoaded().done(function(){
				var $img = $pages.find('img'),
						img_width,
						img_height,
						img_width_wrapper;

				img_width = img_width_wrapper = $img.width();
				img_height = $img.height();

				var format = state.determinePageFormat();

				if (format == 'double') {
					img_width = img_width*2;
					img_width_wrapper = img_width+PULP_SETTINGS.gutterWidth;
					if (init.browser[0] == 'Firefox') img_width_wrapper = img_width_wrapper - 1; // Minus one for sub-pixel rendering hack
				}
				// Apply the dimensions from the image to the wrapper
				// Apply a bit of a margin on pages_wrapper to accommodate the gutter
				var groups = [
					{el: $pages,        width: img_width}, 
					{el: $pagesWrapper, width: img_width_wrapper}
				];

				_.each(groups, function(group) { 
					group.el.css('max-width', (group.width)+'px').css('max-height', img_height+'px');
				});

				// Also apply this height to the btns overlay
				$('#btns').css('height', img_height+'px');
				// And to the header, which shouldn't go below 960
				var header_width = _.max([960, img_width]);
				$('#header').css('max-width', header_width+'px');
				if (cb) cb();
			});
		},
		implementPageFormat: {
			bookend: function(){
				if (states.currentPage == '2') { 
					$('#page-container-3').addClass('exit-to-right').addClass('right-page');
				} else if (states.currentPage != '1') {
					$('#page-container-'+ (states.currentPage + 1)).addClass('exit-to-right')//.addClass('right-page');
				}
			},
			mobile: function(){
				this.single();
			},
			single: function(){
				$('.right-page').removeClass('viewing').removeClass('right-page');
			},
			double: function(){
				var $pageContainer,
						current_id;

				var formatState = state.get('format'),
						bookend = formatState.bookend;
				// Clear all hotspot info since we're in double mode
				states.hotspot = '';
				states.lastHotspot = '';

				current_id = +states.currentPage;
				// Get the id of the current page based on what is visible
				// var alt_current_id = +$('.page-container.viewing').attr('id').split('-')[2]; // `page-container-1` -> 1
				// console.log(current_id, alt_current_id)
				// If it's an odd page that means we were on a right page, so the current focus should now be on the left page
				if (current_id % 2 != 0 && current_id != 1) {
					current_id--;
					// Make that adjustment in our global state tracker
					// helpers.saveCurrentStates(current_id);
				}
				$pageContainer = $('#page-container-' + current_id);
				if ($pageContainer.hasClass('right-page')) { $pageContainer.removeClass('right-page'); }
				$pageContainer.addClass('viewing');
				if (current_id != 1) {
					$('#page-container-' + (current_id + 1)).addClass('right-page').addClass('viewing');
				}
			}
		},
		update: function(){
			// What's done on window resize:
			// See if we can accommodate single or double
			state.setPageFormat();
			// If we're on page 2 and we're now in double, kill the expand helper because they've done what we've asked
			if (states.currentPage == 2){
				layout.toggleNavHelpers(false);
			}
			// Grab the page
			var $page = $('#page-'+states.currentPage);
			// Scale the page back down to 1x1, ($page, transitionDuration)
			zooming.toPage($page, false);
			// Set a new page height
			layout.measurePageElements( function(){
				// If we're on desktop then you can forget about the hotspot
				routing.set.prune();
				// Get what page and hotspot we're on
				var location_hash = window.location.hash;
				if (location_hash) {
					// Turn the location hash into a more readable dictionary `{page: Number, hotspot: Number}`
					var page_hotspot = helpers.hashToPageHotspotDict(location_hash);
					// Show hide appropriate nav btns
					// This also gets called hash change, but if we're going from double to single then the hash won't change
					// This will cause problems if we go from the last page to second to last, the number doesn't change but we do need to change the buttns
					layout.showAppropriateNavBtns(page_hotspot.page);
					// And initiate zooming to that hotspot, (page_number, hotspot_number, transitionDuration)
					routing.read(page_hotspot.page, page_hotspot.hotspot, false);
				}
			});
		},
		displayPageNumber: function(page){
			page = +page;
			var formatState = state.get('format'),
					format = formatState.format;
			// var format = state.determinePageFormat();
			// If we're double and it's an even page and it's not the last page, then put it on the odd page
			// if (format != 'single' && page % 2 == 0 && page != states.pages_max) page = +page + 1;

			// If it's a wide format
			// And we're navigating to an odd page, then subtract it down so the route puts you on the even page with the odd page visible to the right
			if ( format == 'double' && page > 1 && page % 2 != 0 ){
				page = page - 1;
			}
			$('.header-item[data-which="page-number"] .header-text input').val(page)//.blur();
		},
		showAppropriateNavBtns: function(page){
			page = +page;
			var direction,
					format = state.get('format').format;

			if (page == 1) { 
				direction = 'prev';
			} else if (page == states.pages_max || (format == 'double' && page == states.pages_max - 1) ){
				direction = 'next';
		 	}
		 	$('.main-nav-btn-container').removeClass('full').css('display', 'inline-block');
		 	if (direction){
			 	$('.main-nav-btn-container[data-dir="'+direction+'"]').hide();
			 	$('.main-nav-btn-container[data-dir="'+this.otherDir(direction)+'"]').addClass('full');
		 	}

		},
		otherDir: function(dir){
			if (dir == 'prev') return 'next';
			if (dir == 'next') return 'prev';
		},
		toggleNavHelpers: function(show){
			$('.nav-helpers').toggle(show);
		},
		navHelpersMode: function(mode){
			$('.nav-helpers-child').hide();
			$('.nav-helpers-child[data-mode="'+mode+'"]').show();
		},
		toggleDesktopDrawer: function(){
			$('#desktop-drawer-container').toggle();
		},
		bakeEndnotes: function(endnotes){
			endnotes.sort(helpers.sortByNumber)
			_.each(endnotes, function(endnote){
				var endnote_markup = templates.endnoteFactory({endnote: endnote});
				// Bake into desktop and mobile endnotes containers
				$('.endnotes').append(endnote_markup);
			})
		},
		catchDrawerScroll: function(e){
			if ($('body').attr('data-side-drawer') == 'true'){
				if(!$(layout.drawerContent).has($(e.target)).length || $(layout.drawerContent).height() < $(layout.drawerContainer).height()){
					e.preventDefault();
					layout.slideContentArea();
				}
			}
		},
		slideContentArea: function(open){
			var $body = $('body');
			var drawer_state = $body.attr('data-side-drawer-state');

			if (drawer_state) { 
				$body.attr('data-side-drawer-state', 'changing'); 
			}
			open = open || $body.attr('data-side-drawer-open') == 'true';
			$body.attr('data-side-drawer-open', !open);
			_.delay(this.onDrawerTransitionEnd, PULP_SETTINGS.drawerTransitionDuration);

		},
		onDrawerTransitionEnd: function(e){
			$('body').attr('data-side-drawer-state', 'stable');
		},
		dragDrawer: function(e){
			//Disable scrolling by preventing default touch behaviour
			e.preventDefault();
			e.stopPropagation();
			var orig = e.originalEvent;
			var x = Number(orig.changedTouches[0].pageX);

			this.last_x = this.last_x || x;
			var d_x = this.last_x - x;

			// Move a div with id "rect"
			var current_translateX = +$('#main-content-wrapper').css('transform').match(/(-?[0-9\.]+)/g)[4]; // http://stackoverflow.com/questions/5968227/get-the-value-of-webkit-transform-of-an-element-with-jquery
			$('body[data-side-drawer-open="true"]	#main-content-wrapper').css({
				'transition-duration': '0',
				'transform': 'translateX(' + (current_translateX - d_x) + 'px)'
			});
			this.last_x = x;
			return false;
		},
		snapDrawer: function(){
			this.last_x = false;
			$(layout.mainContent).css({
				'transition-duration': PULP_SETTINGS.drawerTransitionDuration,
				'transform': 'auto'
			});
			layout.slideContentArea(true);
		},
		goToPage: {
			focus: function(focus, forceFocus){
				// Do you show the tooltip?
				// $('.tooltipped-i').attr('data-focus', focus);

				// Firefox loses control of the text area unless we reapply focus
				// if (focus || forceFocus){
				// 	$('.tooltipped-i input').focus();
				// }

			},
			navigate: function(go, pageNumber){
				var page_number_str = pageNumber.toString()
				if (go) {
					routing.router.navigate(page_number_str, {trigger: true});

					// You could hook analytics in here

				} else {
					// This will only get come into play if we are on double format and we have navigated to page 3 in the input box and hit return
					// We won't be initiating a page change but we do want the display number to change
					layout.displayPageNumber(pageNumber);
				}
				layout.goToPage.focus(false);
			},
			deny: function(){
				var current_page = states.currentPage;
				layout.displayPageNumber(current_page);
				// layout.goToPage.focus(false);
			}
		},
		fullScreenChange: function(){
			// You could use this function to listen for fullscreen event changes for analytics
			// Exiting
		  if ((document.fullScreenElement && document.fullScreenElement !== null) || (!document.mozFullScreen && !document.webkitIsFullScreen)) {
				mode = 'exit';
			} 
			// Entering
			else {
				mode = 'enter';
			}
	  }
	}

	var listeners = {
		header: function(){
			$('.header-item-container[data-btn="fullscreen"]').on('click', function(){
				helpers.toggleFullScreen();

			});

			// Alternative format options for download
			$('.btn-dropdown[data-which="alt-formats"] a,.drawer-section-container[data-section="downloads"] a').on('click', function(){
				// You could use this for analytics
				return true;
			});

			// Which endnotes were clicked
			$('.endnotes').on('click', 'a', function(){
				// You could use this for analytics
				return true;
			});

			$('.header-item-container[data-action="drawer"], .section-title-close[data-action="drawer"]').on('click', function(){
				$('.header-item-container[data-action="drawer"]').toggleClass('active');
				layout.slideContentArea();
				// You could use this for analytics in knowing whether endnotes or drawer was opened
				// Everyone's configuration is different but reach out if you have questions

			});

			$('.tooltipped-i input').on('focus', function(){
				var that = this;
				// If there is no selection
				if (!window.getSelection().focusNode){
					// Chrome doesn't like this so put it in a try catch
					try {
						that.setSelectionRange(0,999); 
					}
					catch (e){
						$(that).select();
					}
				}
			});
			$('.tooltipped-i input').on('blur', function(){
				var that = this;
				layout.goToPage.deny();
			});

			$('.header-item[data-which="page-number"] input').on('keydown', function(e){
				// Stop propagation so the arrows don't trigger a page change
				e.stopPropagation();
			});

			// Listen for key up so we have the final value
			$('.header-item[data-which="page-number"] input').on('keyup', function(e){
				e.stopPropagation();
				var page_number = +$(this).val() || 1,
						keyCode = e.keyCode,
						current_page = states.currentPage,
						is_new_page = current_page != page_number

				// Do some validation on the page_number so it stays within our page bounds
				if (page_number < 1){
					page_number = 1;
				} else if (page_number > states.pages_max) {
					page_number = states.pages_max;
				}
				// // Enable tooltop based on whether we're going to a different page
				layout.goToPage.focus(is_new_page, true);

				// Listen for the enter key
				// But only if there is a value 
				if (page_number && keyCode === 13 ) {
					// Navigate to that page
					layout.goToPage.navigate(is_new_page, page_number);

					$('.tooltipped-i input').blur();

					// Escape key will turn the number into the page we're currently on
				} else if (keyCode == 27) {
					layout.goToPage.deny();
				}

			});

			// Share buttons
			$('.social-btn').on('click', function(e){
				var which = $(this).attr('data-which');
				social.share[which](e);
			});

		},
		resize: function(){
			layout.updateDebounce = _.debounce(layout.update, 500);
			window.addEventListener('resize', function(){
				layout.updateDebounce();
			})
		},
		state: function(){
			state.on('change:format', function(model, formats) {
				// $('#pages').attr('data-format', format)
				$('body').attr('data-format', formats.format);
				$('body').attr('data-bookend', formats.bookend);
				if (formats.bookend == 'false'){
					layout.implementPageFormat[formats.format]();
				} else {
					layout.implementPageFormat.bookend();
				}
			});
			state.on('change:zoom', function(model, zoom) {
				// $('#pages').attr('data-state', zoom);
				$('body').attr('data-state', zoom);
			});
		},
		hotspotClicks: function($page){
			$page.on('click', '.hotspot', function() {
				routing.set.fromHotspotClick( $(this) );
			});
		},
		keyboardAndGestures: function(){
			$('body').keydown(function(e){
				var direction = helpers.getNavDirection(e, e.keyCode);
				routing.set.fromKeyboardOrGesture(direction);
			});

			$(document).on('swipeleft', function(e){
				var direction = helpers.getNavDirection(e, 'swipeleft');
				routing.set.fromKeyboardOrGesture(direction);
			});

			$(document).on('swiperight', function(e){
				var direction = helpers.getNavDirection(e, 'swiperight');
				routing.set.fromKeyboardOrGesture(direction);
			});

			$(document).on('pinchin pinchout', function(e){
				// `fromHotspotClick` expects a jQuery object of a hotspot
				// So let's grab the last hotpot, if there was one
				// Or else the first one one on this page
				var current_page = states.currentPage,
						current_hotspot = states.currentHotspot || '1';

				var $dummyHotspot = $('<div class="dummy-hotspot" data-hotspot-id="'+current_page+'-'+current_hotspot+'"></div>');
				routing.set.fromHotspotClick( $dummyHotspot );
				$dummyHotspot.remove();
			});

			$('.main-nav-btn-container').on('click', function(){
				var direction = $(this).attr('data-dir');
				// Another hook for analytics
				routing.set.fromKeyboardOrGesture(direction);
			});

			$('#pages').on('click', '.mask', function() {
				routing.set.fromHotspotClick( $(this) );
			});

			$('#pages').on('click', '.internal-link[data-destination="endnotes"]', function() {
				$('.header-item-container[data-action="drawer"]').toggleClass('active');
				layout.slideContentArea();
				// Other analytics hooks could go here

			});

		},
		pageTransitions: function(){
			$('.page-container').on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', transitions.onAnimationEnd_throttled)
		},
		drawer: function(){
			// Disable scroll bug on iOS
			new ScrollFix(document.getElementById('side-drawer-container'));
			$('body').on('touchmove', layout.catchDrawerScroll);
			$(layout.drawerHandle).on('touchstart touchmove', layout.dragDrawer);
			$(layout.drawerHandle).on('touchend', layout.snapDrawer);
			$(layout.drawerHandle).on('click', layout.snapDrawer);
		},
		fullscreen: function(){
			document.addEventListener('webkitfullscreenchange', layout.fullScreenChange, false);
			document.addEventListener('mozfullscreenchange', layout.fullScreenChange, false);
			document.addEventListener('fullscreenchange', layout.fullScreenChange, false);
			document.addEventListener('MSFullscreenChange', layout.fullScreenChange, false);		
		}
	}

	// Determine the correct hotspot and page number based on direction
	var leafing = {
		prev: {
			page: function(pp_info){
				var formatState = state.get('format'),
						format = formatState.format,
						bookend = formatState.bookend;
				if (pp_info.page != 1){
					if (format != 'double' && bookend == 'false'){
						pp_info.page--;
					} else {
						if (pp_info.page != 2){
							pp_info.page = pp_info.page - 2;
						} else {
							pp_info.page = pp_info.page - 1;
						}
					}
				}
				pp_info.hotspot = '';
				states.lastHotspot = '';
				return pp_info;
			},
			hotspot: function(pp_info){
				var this_page_hotspot_max;
				// Decrease our hotspot cursor by one
				pp_info.hotspot--;
				// If that's less than zero then that means we were on a full view page, so go to the last hotspot of the previous panel
				if (pp_info.hotspot < 0){
					pp_info.hotspot = '' // Go to panel view

					if (pp_info.page != 1) { 
						pp_info.page--;
						this_page_hotspot_max = Number($('#page-'+pp_info.page).attr('data-length'));

						// If this page has hotspots
						// Start off with the last hotspot
						if (this_page_hotspot_max) {
							states.lastHotspot = this_page_hotspot_max + 1;
						}

					}

				} else if(pp_info.hotspot < 1){ // If that takes us below the first hotspot, go to the full view of this page
					states.lastHotspot = '';
					pp_info.hotspot = '';
				}
				return pp_info;
			}
		},
		next: {
			page: function(pp_info, hotspot_max, pages_max){
				var increment_by = 1;
				var formatState = state.get('format'),
						format = formatState.format,
						bookend = formatState.bookend;

				if (format == 'double' && bookend == 'false') { increment_by = 2; }

				if ( (pp_info.page + increment_by) <= pages_max ){
					pp_info.page = pp_info.page + increment_by
					states.lastHotspot = ''
				}
				pp_info.hotspot = '';
				return pp_info;
			},
			hotspot: function(pp_info, hotspot_max, pages_max){
				// Increase our hotspot cursor by one
				pp_info.hotspot++;

				// If that exceeds the number of hotspots on this page, go to the full view of the next page
				if (pp_info.hotspot > hotspot_max){
					pp_info = leafing.next.page(pp_info, null, pages_max);
				}
				return pp_info;
			}
		}
	}

	// Change pages
	var transitions = {
		goIfNecessary: function(currentPage, newPage){
			var formatState = state.get('format'),
					format = formatState.format,
					bookend = formatState.bookend;
			// If it's a wide format
			// And we're navigating to an odd page, then subtract it down so the route puts you on the even page with the odd page visible to the right
			if ( format == 'double' && bookend == 'false' && newPage % 2 != 0 ){
				newPage = newPage - 1;
				routing.router.navigate(newPage.toString(), { replace: true });
				// Keep the dispay up to date
				layout.displayPageNumber(newPage);
			}
			var classes = this.determineTransition(currentPage, newPage, format, bookend);			
			if (classes) {
				transitions.movePages(currentPage, newPage, classes);
			}
		},
		determineTransition: function(currentPage, newPage, format, bookend){
			var classes;

			// This first condition protects against the case where you start from an odd page and expand the window to double format
			// In this case, the `currentPage` and `newPage` numbers differ, but you don't want to animate the transition, it should just snap into place
			// This could probably be handled more elegantly, but this works and is *hopefully* the very last bug to fix.
			if (format != 'double' || currentPage - newPage != 1 || bookend != 'false'){
				// The page is different so let's change it!
				if (currentPage != newPage){
					// Next page
					if ( currentPage < newPage ) {
						classes = transitions.moveForward();
					// Previous page
					} else {
						classes = transitions.moveBack();
					}
				}
			}

			return classes;
		},
		moveForward: function(){
			var classes =  {
				exiting: 'exit-to-left',
				entering: 'enter-from-right'
			}
			return classes;
		},
		moveBack: function(){
			var classes =  {
				exiting: 'exit-to-right',
				entering: 'enter-from-left'
			}
			return classes;
		},
		movePages: function(currentPage, newPage, classes){
			var format = state.get('format').format,
					bookend = state.get('format').bookend;

			if (format != 'double' || bookend == 'true'){
				// Exit the current page
				$('#page-container-'+currentPage).addClass(classes.exiting);
				// Enter the next page, the one that is shown in the hash
				$('#page-container-'+newPage).addClass(classes.entering);//.addClass('viewing');
			} else {
				// Exit both the current and one shown in the url since they are already viewable
				// If it's the current page it will look nicer if it exits starting from the center.
				var first_page_exit_classes = '';
				if (currentPage == 1) { 
					first_page_exit_classes = ' center-page'; 
				}

				$('#page-container-'+currentPage).addClass(classes.exiting + first_page_exit_classes);
				$('#page-container-'+(currentPage + 1) ).addClass(classes.exiting);
				// Enter the next two
				$('#page-container-'+newPage).addClass(classes.entering).addClass('viewing');
				$('#page-container-'+(newPage + 1) ).addClass(classes.entering).addClass('right-page').addClass('viewing');
			}
			// You could hook analytics in here
		},
		onAnimationEnd: function(){
			// Remove all navigation classes, which will have finished their animation since we're inside that callback
			$('.page-container').removeClass('enter-from-left')
						 .removeClass('enter-from-right')
						 .removeClass('exit-to-left')
						 .removeClass('exit-to-right')
						 .removeClass('center-page');
			
			// Set the scale to 1 with no transitionDuration
			$('#page-container-'+states.lastPage).removeClass('viewing').find('.page').css(helpers.setTransitionCss('transform', 'scale(1)', false));
			// If we were on a double view, do the same for its next page
			// Unless we're coming from the coming
			var formatState = state.get('format'),
					format = formatState.format,
					bookend = formatState.bookend;
			if (format == 'double' && bookend == 'false' && states.lastPage != 1) {
				$('#page-container-'+ (+states.lastPage + 1) ).removeClass('viewing').removeClass('right-page').find('.page').css(helpers.setTransitionCss('transform', 'scale(1)', false));
			} else if (bookend == 'true' && states.currentPage == 1 ) {
				$('#page-container-'+ (+states.lastPage + 1) ).removeClass('viewing').removeClass('right-page');
			}
			state.set('zoom','page');
		}
	}

	var routing = {
		setInitRouteChecks: function(page, triggerLazyLoad, cb){
			var transition_duration = true,
					formatState = state.get('format'),
					format = formatState.format;
			// If our URL we came from is a hotspot then lazyLoad won't be triggered
			// Because it's categorically false when navigating to a hotspot
			// The only time that changes would be when we're on a first run
			// So it has a fall back to `true` in that scenario
			triggerLazyLoad = triggerLazyLoad || states.firstRun;
			if (states.firstRun) { 
				var show_nav_helpers = false;
				// If starting on the first page
				if (PULP_SETTINGS.startOnFirstPage || page == '1') {
					page = '1';
					show_nav_helpers = true;
				}
				helpers.saveCurrentStates(page); 
				transition_duration = false;
				// Show the nav helpers
				layout.toggleNavHelpers(show_nav_helpers);
				layout.navHelpersMode('intro');
			} else if (states.showNavHelpers && page == '2' && format == 'single'){
				layout.navHelpersMode('expand');
				states.showNavHelpers = false;
			} else {
				layout.toggleNavHelpers(false);
			}
			// Load the image for the next n pages if they still have placeholder images
			if (triggerLazyLoad) { this.lazyLoadImages(page); }
			layout.displayPageNumber(page);
			layout.showAppropriateNavBtns(page);
			cb(transition_duration, page);
		},
		lazyLoadImages: function(page){
			page = +page;
			var extent = PULP_SETTINGS.lazyLoadExtent,
					min_range = page - extent,
					max_range = page + extent;

			if (min_range <= 0) min_range = 1;
			if (max_range > states.pages_max) max_range = states.pages_max + 1; // Plus one because `_.range` is exclusive.

			var range = _.range(min_range, max_range),
					page_number,
					$img,
					src;

			for (var i = 0; i < range.length; i++){
				page_number = range[i];
				$img = $('#page-container-'+page_number).find('img');
				src = $img.attr('src');
				if (src.indexOf('data:image\/gif') > -1) {
					$img.attr('src', 'imgs/pages/page-'+page_number+'.'+PULP_SETTINGS.imgFormat );
				}
			}

		},
		init: function(){
			routing.Router = Backbone.Router.extend({
				routes: {
					":page(/)": "page", // Take me to a page
					":page/:hotspot": 'hotspot' // Take me to a specific hotspot
				}
			});

			routing.router = new routing.Router;

			routing.router.on('route:page', function(page) {
				// Second arg is lazy load trigger	
				routing.setInitRouteChecks(page, true, function(transitionDuration, goToPage){
					routing.read(goToPage, null, transitionDuration);
				});
			});

			routing.router.on('route:hotspot', function(page, hotspot) {
				routing.setInitRouteChecks(page, null, function(transitionDuration){;
					// If we're on desktop, kill the hotspot
					if (state.get('format').format != 'mobile' ) {
						hotspot = '';
						routing.router.navigate(page, { replace: true });
					}
					routing.read(page, hotspot, transitionDuration);
				});
			});

			// For bookmarkable Urls
			Backbone.history.start();
			routing.onPageLoad(window.location.hash);
		},
		onPageLoad: function(locationHash){
			// If it doesn't have a hash on load then go to the first page
			var destination;
			if (!locationHash || PULP_SETTINGS.startOnFirstPage){
				destination = '1';
			} else {
				destination	= states.currentPage;
			}
			routing.router.navigate(destination.toString(), { trigger: true, replace: true });
		},
		set: {
			fromHotspotClick: function($hotspot){
				// Only do this on mobile, this check is pretty extraneous since the btn overlay prevents this on desktop
				if (state.get('format').format == 'mobile'){
					var page_hotspot = $hotspot.attr('data-hotspot-id').split('-'), // `1-1` -> ["1", "1"];
							page = page_hotspot[0],
							hotspot = page_hotspot[1],
							hash = '',
							direction = '';

					// If you've tapped on the active hotspot...
					if (states.currentPage == page && states.currentHotspot == hotspot) {
						states.lastHotspot = hotspot; // Record the last hotspot you were on. You can then pick up from here on swipe.
						states.currentHotspot  = hotspot = '' // Set the current hotspot and hotspot variable to nothing to signify that you're on a page view
						hash = page; // And in the url hash, display only the page number.
						direction = 'zoom_out';
					}else{
						hash = page + '/' + hotspot; // Otherwise, send the page and hotspot to the route.
						direction = 'zoom_in';
					}
					// You could hook analytics in here

					// Change the hash
					routing.router.navigate(hash, {trigger: true});
				}
			},
			fromKeyboardOrGesture: function(direction){
				// direction can be: next, prev, pageView or false if it wasn't a key code we captured
				// If the body is changing then don't do anything
				if (direction && $('body').attr('data-state') != 'page-change'){
					var pp_info = helpers.hashToPageHotspotDict( window.location.hash ),
							hotspot_max = Number( $('#page-'+pp_info.page).attr('data-length') ),
							formatState = state.get('format'),
							format = formatState.format,
							bookend = formatState.bookend,
							leaf_to;
					// console.log('starting',pp_info.hotspot, states.lastHotspot)

					pp_info.page = pp_info.page || 1; // If there's no page, go to the first page
					//Evaluate this as a string in case it's zero and that's meaningfull
					pp_info.hotspot = pp_info.hotspot || states.lastHotspot || 0; // If there was no hotspot in the hash, see if there was a saved hotspot states, if not start at zero
					
					states.lastHotspot = pp_info.hotspot;
					
					// Send it to the appropriate function to transform the new page and hotspot locations
					if (format == 'mobile' && bookend == 'false') {
						leaf_to = 'hotspot';
					} else {
						leaf_to = 'page';
					}

					pp_info = leafing[direction][leaf_to](pp_info, hotspot_max, states.pages_max);
					// Add our new info to the hash
					// or not if we're going to a full pulle
					var newhash = pp_info.page.toString();
					if (pp_info.hotspot){
						newhash += '/' + pp_info.hotspot
					}
					// // Store the previous hash
					// states.previousPage = helpers.hashToPageHotspotDict( window.location.hash ).page;
					// Go to there
					routing.router.navigate(newhash, {trigger: true});
				}
			},
			prune: function(){
				// Remove the hotspot from the hash if you're on desktop
				// Turn the location hash into a more readable dictionary `{page: Number, hotspot: Number}`
				var pp_info = helpers.hashToPageHotspotDict(window.location.hash);
				if (state.get('format').format != 'mobile' && pp_info.hotspot){
					routing.router.navigate(pp_info.page.toString(), { replace: true } );
					states.currentHotspot = '';
				}
			}
		},
		// Reads the route
		// Switches pages if necessary
		// Scales to page view if no hotspot is set
		// Delegates zooms to hotspot if it is
		read: function(page, hotspot, transitionDuration){
			// TODO, this function currently does too much
			// It should be broken out
			var css;
			var exiting_class, entering_class;
			var $page_container = $('#page-container-'+page);

			// Make the current page visible if it isn't
			if (!$page_container.hasClass('viewing')) $page_container.addClass('viewing');
			if (states.firstRun) { helpers.saveCurrentStates(page, hotspot); states.firstRun = false; };
			
			// Make the page variable a number
			page = +page;

			// Set the page format based on the window width and page number
			// Useful for setting/unsetting the bookend page format, which needs to be checked on each page turn
			state.setPageFormat(page);

			// Transition to a new page if these numbers are different
			transitions.goIfNecessary(+states.currentPage, page);

			// Now zoom to the appropriate hotspot or page
			if (state.get('format').format == 'mobile' && hotspot){
				zooming.toHotspot(page, hotspot, transitionDuration);
			}else{
				// If no hotspot specified, reset to full page view
				zooming.toPage( $('#page-'+page), true );
			}

			// Save the current page and hotspot to what the route said, save previous route's information as previous page.
			helpers.saveCurrentStates(page, hotspot, states.currentPage);

		}
	}

	var zooming = {
		toPage: function($page, transitionDuration){
			var page_number = $page.attr('id').split('-')[1]; // `page-1` -> "1"
			// Reset zoom to full page view
			var page_css = helpers.setTransitionCss('transform', 'scale(1)', transitionDuration);
			$page.css(page_css);
			// Reset masks
			var mask_css = { opacity: 0 };
			// Set their appropriate zero values
			var horizontal_mask_css = _.extend({height: 0}, mask_css);
			var vertical_mask_css 	= _.extend({width: 0}, mask_css);

			horizontal_mask_css = helpers.addDuration(horizontal_mask_css, transitionDuration);
			vertical_mask_css 	= helpers.addDuration(vertical_mask_css,   transitionDuration);
			// Apply css
			$('.mask[data-orientation="horizontal"]').css(horizontal_mask_css);
			$('.mask[data-orientation="vertical"]').css(vertical_mask_css);

			// Set the page state to changing if there are more than the appropriate number of viewing objects, else set it to page
			var zoom_state, normal_length;
			var formatState = state.get('format'),
					format = formatState.format;

			if ( format != 'double') {
				normal_length = 1;
			} else {
				normal_length = 2;
			}

			var pages_visible = $('.viewing').length;
			// If there are more pages visible than there should be, then we're changing pages.
			if ( pages_visible == normal_length ) {
				zoom_state = 'page';
			} else if ( pages_visible > normal_length  ) {
				zoom_state = 'page-change';
			}

			state.set('zoom', zoom_state);

		},
		toHotspot: function(page, hotspot, transitionDuration){
			// cg means `current page`
			// th means `target hotspot`
			var buffer = .2;
			var $currentPage = $('#page-'+page),
					cg_width = $currentPage.width(),
					cg_height = $currentPage.height(),
					viewport_xMiddle = $(window).width() / 2,
					cg_yMiddle = cg_height / 2;

			// This value is stored on load because it changes on different scales but is really constant
			// It's essentially the height of the toolbar, but by defining it this way, you can protect against other elements that impact the height
			var cg_top = +$('#pages').attr('data-offset-top');

			var $targetHotspot = $('#hotspot-'+page+'-'+hotspot),
					th_top = Number($targetHotspot.attr('data-top')),
					th_left = Number($targetHotspot.attr('data-left')),
					th_width = Number($targetHotspot.attr('data-width')),
					th_height = Number($targetHotspot.attr('data-height')),
					th_xMiddle = th_width / 2,
					th_yMiddle = th_height / 2;

			// This returns an object of structure, which gives you a number that is your scale multiplier and whether you are sizing the panel to meet the width of the page or the height of the page
			/*
				{
					multiplier: 2,
					orientation: 'vertical'
				}
			*/
			var scale_multiplication_info = this.calcScaleMultiplier(th_width, th_height, cg_width, cg_height),
					scale_multiplier = scale_multiplication_info.multiplier,
					scale_multiplier_orientation = scale_multiplication_info.orientation;

			// var scale_multiplier = 1 / (th_width / cg_width); // Scale the width of the page by this to expand the target hotspot to full view
			var x_adjuster = viewport_xMiddle - th_left - th_xMiddle,
					y_adjuster = cg_yMiddle - th_top - th_yMiddle + cg_top;

			var css = helpers.setTransitionCss('transform', 'scale('+ scale_multiplier +') translate('+x_adjuster+'px, '+y_adjuster+'px)', transitionDuration);
			// Scale the page according to the scale and translation to bring this hotspot to the center
			$currentPage.css(css);
			// Roll in the masks to the appropriate edge of the hotspote
			zooming.sizeMasks(th_width, th_height, cg_width, cg_height, scale_multiplier, transitionDuration, scale_multiplier_orientation);
			// Add the page and hotspot into on the mask so it will behave like a hotspot when we click it and then trigger zooming back out to the page
			zooming.applyHotspotIdToMasks(page, hotspot);
			// Save the scale multiplier we were using
			states.scaleMultiplier = scale_multiplier;
			// Set the page state
			state.set('zoom', 'hotspot');
		},
		sizeMasks: function(thWidth, thHeight, cgWidth, cgHeight, scalerMultiplier, transitionDuration, orientation){
			var dimension,
					mask_dimension_value,
					tationorien, // This is the opposite of `orienation`, hence it's its verlan.
					siondimen; // The opposite of dimension
			// If we are scaling to a hotspot that is a horizontal panel
			// Then we'll be affecting the page mask height
			// And we'll be scaling the width on masks around vertical panels
			// Essentially, we cover up the side that doesn't meet the edge
			if (orientation == 'horizontal'){
				dimension = 'height';
				mask_dimension_value = ( cgHeight - (thHeight * scalerMultiplier) ) / 2;
				// Set the opposites
				tationorien = 'vertical';
				siondimen = 'width';
			} else if (orientation == 'vertical') {
				dimension = 'width';
				mask_dimension_value = ( cgWidth - (thWidth * scalerMultiplier) ) / 2;
				// Set the opposites
				tationorien = 'horizontal';
				siondimen = 'height';
			}

			var css = {
				opacity: 1
			};
			// Set this css value dynamically based on what we calculated above
			css[dimension] = mask_dimension_value + 'px';
			// Add the calculated transition duration
			css = helpers.addDuration(css, transitionDuration);
			// And animate
			$('.mask[data-orientation="'+orientation+'"]').css(css);

			// Kill the other masks
			var ssc = {
				opacity: 0
			};
			ssc[siondimen] = 0;
			ssc = helpers.addDuration(ssc, transitionDuration);
			$('.mask[data-orientation="'+tationorien+'"]').css(ssc);
		},
		applyHotspotIdToMasks: function(page, hotspot){
			$('.mask').attr('data-hotspot-id', page + '-' + hotspot);
		},
		calcScaleMultiplier: function(targetHotspotWidth, targetHotspotHeight, currentPageWidth, currentPageHeight){
			// Determine whether this hotspot is vertical or horizontal and report back
			var multiplier,
					orientations = ['horizontal', 'vertical'],
					multipliers = [],
					orientation;

			// Horizontal scaler
			multipliers.push( 1 / (targetHotspotWidth / currentPageWidth) );
			// Vertical scaler
			multipliers.push( 1 / (targetHotspotHeight / currentPageHeight) );

			// Always scale by the smaller value 
			multiplier = _.min(multipliers);

			// Figure out which one that was
			var index = multipliers.indexOf(multiplier);
			orientation = orientations[index];

			return {
				multiplier: multiplier,
				orientation: orientation
			}
		}
	}


	/* Usage: $el.click( sendTweet ) */
	// These functions only need `e` but you can pass in special `text` or a url hash as `route` if you want.
	var social = {
		init: function(){
			this.shareable_url = 'http://'+ window.location.hostname + window.location.pathname;
		},
		share: {

			twitter: function(e, text, route){
				var base_url = 'https://twitter.com/intent/tweet?url=' + social.shareable_url;
						text = text || PULP_SETTINGS.social.twitter_text;

				if (route) {
					base_url += route;
				}

				var tweet_text  = '&text=' + text,
				    via_account = PULP_SETTINGS.social.twitter_account,
				    related     = '&related='+via_account,
				    counter_url = '&counturl=' + social.shareable_url;

				var leftPos = e.pageX - 400,
				    topPos = e.pageY - 350;

				var composed_url = social.percentEncode(base_url + tweet_text + ' via @' + via_account + related + counter_url);
				var settings = 'width=500,height=300,top=' + topPos + ',left=' + leftPos + ',scrollbars=no,location=0,statusbars=0,menubars=0,toolbars=0,resizable=0';
				
				window.open(composed_url, 'Tweet', settings);
			},
			facebook: function(e, text, promoImgUrl){
				var base_url    = 'http://www.facebook.com/dialog/feed',
						app_id      = '?app_id='+PULP_SETTINGS.social.fb_app_id,
						page_url    = '&link=' + social.shareable_url,
						text 			  = text || PULP_SETTINGS.social.fb_text,
						promoImgUrl = promoImgUrl || PULP_SETTINGS.social.promo_img_url;
					
				var description = '&description='+text,
						redirect    = '&redirect_uri='+social.shareable_url,
						image       = '&image='+promoImgUrl;

				var facebook_url = base_url + app_id + page_url + description + redirect + image;
				
				var leftPos = e.pageX - 400,
						topPos = e.pageY - 350;

				var composed_url = social.percentEncode(facebook_url);
				var settings = 'width=900,height=450,top=' + topPos + ',left=' + leftPos + ',scrollbars=no,location=0,statusbars=0,menubars=0,toolbars=0,resizable=0';
				
				window.open(composed_url, 'Share', settings);
			},
			gplus: function(e){
				var base_url = 'https://plus.google.com/share',
						page_url = '?url=' + social.shareable_url,
						gplus_url = base_url + page_url;

				var composed_url = social.percentEncode(gplus_url);
				var settings = 'width=600,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no';
				
				window.open(composed_url, 'Share', settings);
			},
			reddit: function(e){
				var base_url = 'https://www.reddit.com/submit',
						page_url = '?url=' + social.shareable_url;

				var reddit_url = base_url + page_url;

				var composed_url = social.percentEncode(reddit_url);
				var settings = 'width=600,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no';

				window.open(composed_url, 'Share', settings);
			}
			
		},
	  percentEncode: function(string){
			return string.replace(/#/g, '%23').replace(/,/g, '%2c').replace(/ /g, '%20');
		}
	}


	var init = {
		go: function(){
			this.whitelabel(PULP_SETTINGS.whitelabel);
			// Add a throttle because the animation end is called once per child
			// You could use `_.delay` but the timing wont' always be precise and you'll get a flicker.
			transitions.onAnimationEnd_throttled = _.throttle(transitions.onAnimationEnd, 5);
			this.browser = this.browserCheck();
			this.touch = this.touchCheck();
			this.addMobileClass();
			layout.init();
			layout.bakeMasks();
			this.loadPages();
			listeners.resize();
			listeners.header();
			listeners.keyboardAndGestures();
			listeners.drawer();
			listeners.fullscreen();
			social.init();
			FastClick.attach(document.body);
			this.browserHacks();
		},
		loadPages: function(){
			$.getJSON('data/pages.json')
				.done(function(data){
					var pages = data.pages,
							endnotes = data.endnotes;
					states.totalPages = pages.length;
					layout.bakePages(pages);
					layout.bakeEndnotes(endnotes);
				})
				.error(function(error){
					alert('Error loading data. Data file is either missing or the JSON is malformed. Try running it through jsonlint.com');
				});
		},
		browserCheck: function(){
	    var ua= navigator.userAgent, tem, 
	    M= ua.match(/(android|opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
	    if(/trident/i.test(M[1])){
	        tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
	        return 'IE '+(tem[1] || '');
	    }
	    if(M[1]=== 'Chrome'){
	        tem= ua.match(/\bOPR\/(\d+)/)
	        if(tem!= null) return 'Opera '+tem[1];
	    }
	    M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
	    if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
	    return M;
		},
		whitelabel: function(whitelabelObj){
			if (whitelabelObj){
				// JS + CSS
				_.each(whitelabelObj.files, function(files, extension){
					var tag;
					for (var i = 0; i < files.length; i++) {
						if (extension == 'js') tag = '<script src="whitelabel/js/'+files[i]+'"></script>';
						if (extension == 'css') tag  = '<link rel="stylesheet" type="text/css" href="whitelabel/css/'+files[i]+'" />';
						document.write(tag);
					}
				});
				// Logo Markup
				// Note, this is appending because we have elements that are floating right in the header
				// This is to avoid a bug which would cause those elements to be pushed to the next line
				// If this is causing issues or you aren't floating those buttons to the right, then you might want to change this line to `.prepend`
				$('#header').append(whitelabelObj.logo);
			}
		},
		browserHacks: function(){
			// Android browsers aren't showing a "Go" button on page number change, so make that field a text field on android
			if (this.browser[0] == 'Android'){
				$('#page-number-input').attr('type','text');
			}

			// Kill nav helpers on touch devices
			if (this.touch){
				$('.nav-helpers').remove();
			}
		},
		touchCheck: function(){
			return 'ontouchstart' in window // works on most browsers 
				|| 'onmsgesturechange' in window; // works on ie10
		},
		addMobileClass: function(){
			if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
				$('body').addClass('mobile');
			}
		}
}

	init.go();

}).call(this);