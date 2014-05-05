(function(){
	'use strict';

	var states = {
		zoom: 'page',
		currentPage: '1',
		currentHotspot: '',
		lastPage: '',
		lastHotspot: '',
		transitionDuration: '350ms',
		scaleMultiplier: 1,
		firstRun: true
	}

	var helpers = {
		setTransitionCss: function(property, value, transitionDuration){
			var css = {}, duration = 0;
			css[property] = value;
			css = helpers.addDuration(css, transitionDuration);
			return css;
		},
		addDuration: function(cssObj, transitionDuration){
			var duration = transitionDuration ? states.transitionDuration : 0
			_.extend(cssObj, {'transition-duration': duration});
			return cssObj;
		},
		saveCurrentStates: function(page, hotspot, lastPage){
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
			// Only allow this only one panel is visible, i.e. not during a transition
			if ($('.viewing').length == 1){
				if (code == 37 || code == 38 || code == 39 || code == 40 || code == 'swipeleft' || code == 'swiperight' || code == 'pinch'){
					// Don't do the default behavior if it's an arrow, swipe or pinch
					e.preventDefault();
					e.stopPropagation();

					// Do this
					// Left arrow
					if (code == 37 || code == 'swiperight') return 'prev-hotspot';
					// Right arrow
					if (code == 39 || code == 'swipeleft') return 'next-hotspot';
					// Esc, up, down arrows
					if (code == 27 || code == 38 || code == 40 || code == 'pinch') return 'page-view';
				}

				return false;
			}
			return false;
		}	
	}

	var templates = {
		pageFactory: _.template( $('#page-template').html() ),
		hotspotFactory: _.template( $('#hotspot-template').html() )
	}

	var layout = {
		bakeMasks: function(){
			$('#pages').append('<div class="mask" id="top-mask"></div>').append('<div class="mask" id="bottom-mask"></div>');
		},
		bakePages: function(pages){
			var page_markup, $page;
			for (var i = 0; i < pages.length; i++){
				page_markup = templates.pageFactory(pages[i]);
				$('#pages').append(page_markup);
				$page = $('#page-'+pages[i].number);

				// Add listeners
				listeners.hotspotClicks( $page );
				listeners.pageTransitions();
			}
			// Once images are loaded, measure the hotspot locations
			layout.measurePageElements( $('#pages') );
			routing.init();
		},
		measureHotspots: function(){
		 $('.hotspot').each(function(index, hs){
				var $hs = $(hs);
				$hs.attr('data-top', $hs.offset().top );
				$hs.attr('data-left', $hs.offset().left );
				$hs.attr('data-width', $hs.width() );
				$hs.attr('data-height', $hs.height() );
			});
		},
		measurePageElements: function($page, cb){
			layout.measureImgSetPageHeight($page, function(){
				layout.measureHotspots();
				if (cb) cb();
			});
		},
		measureImgSetPageHeight: function($page, cb){
			$page.imagesLoaded().done(function(){
				var img_height = $page.find('img').height();
				$('#pages').css('height', img_height+'px');
				$('.footnote-container').css('top', (img_height + 5)+'px')
				if (cb) cb();
			});
		},
		update: function(){
			// Do this on window resize
			var $page = $('#page-'+states.currentPage);
			// Scale the page back down to 1x1, ($page, transitionDuration)
			zooming.toPage($page, false);
			// Set a new page height
			layout.measurePageElements( $('#pages') , function(){
				// Get what page and hotspot we're on
				var location_hash = window.location.hash;
				if (location_hash) {
					var page_hotspot = helpers.hashToPageHotspotDict(location_hash);
					// And initiate zooming to that hotspot, (page_number, hotspot_number, transitionDuration)
					routing.read(page_hotspot.page, page_hotspot.hotspot, false);
				}
			});
		}
	}

	var listeners = {
		resize: function(){
			layout.updateDebounce = _.debounce(layout.update, 200);
			// TODO Does this trigger on different mobile device orientation changes?
			window.addEventListener('resize', function(){
				layout.updateDebounce();
			})
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
		},
		pageTransitions: function(){
			$(".page-container").on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', function(){

				// Remove all navigation classes, which will have finished their animation since we're inside that callback
				$('.page-container').removeClass('enter-from-left')
							 .removeClass('enter-from-right')
							 .removeClass('exit-to-left')
							 .removeClass('exit-to-right');
				
				// Set the scale to 1 with no transitionDuration
				$('#page-container-'+states.lastPage).removeClass('viewing').find('.page').css(helpers.setTransitionCss('transform', 'scale(1)', false));
				$('#pages').attr('data-state','page');
			});
		}
	}

	// TODO, separate out the `.read` function into these paging functions.
	var paging = {
		nextPage: function(){

		},
		prevPage: function(){

		},
		goToPage: function(){

		}
	}

	var routing = {
		init: function(){
			routing.Router = Backbone.Router.extend({
				routes: {
					":page(/)": "page", // Take me to a page
					":page/:hotspot": 'hotspot' // Take me to a specific hotspot
				}
			});

			routing.router = new routing.Router;

			routing.router.on('route:page', function(page) {
				if (states.firstRun) { states.currentPage = page; states.firstRun = false; }
				routing.read(page, null, true);
			});
			routing.router.on('route:hotspot', function(page, hotspot) {
				if (states.firstRun) { states.currentPage = page; states.firstRun = false;}
				routing.read(page, hotspot, true);
			});

			// For bookmarkable Urls
			Backbone.history.start();

			routing.onPageLoad(window.location.hash)
		},
		onPageLoad: function(location_hash){
			var pp_info;
			if (!location_hash){
				routing.router.navigate('1', { trigger: true, replace: true });
			}
		},
		set: {
			fromHotspotClick: function($hotspot){
				var page_hotspot = $hotspot.attr('id').split('-').slice(1,3), // `hotspot-1-1` -> ["1", "1"];
						page = page_hotspot[0],
						hotspot = page_hotspot[1],
						hash = '';

				// If you've tapped on the active hotspot...
				if (states.currentPage == page && states.currentHotspot == hotspot) {
					states.lastHotspot = hotspot; // Record the last hotspot you were on. You can then pick up from here on swipe.
					states.currentHotspot  = hotspot = '' // Set the current hotspot and hotspot variable to nothing to signify that you're on a page view
					hash = page; // And in the url hash, display only the page number.
				}else{
					hash = page + '/' + hotspot; // Otherwise, send the page and hotspot to the route.
				}

				// Change the hash
				routing.router.navigate(hash, {trigger: true});
			},
			fromKeyboardOrGesture: function(direction){
				if (direction){
					// dir can be: prev-hotspot, next-hotspot, page-view, or null
					var pp_info = helpers.hashToPageHotspotDict( window.location.hash ),
							page_max = Number( $('#page-'+pp_info.page).attr('data-length') ),
							prev_page_max,
							newhash;

					pp_info.page = pp_info.page || 1; // If there's no page, go to the first page
					pp_info.hotspot = pp_info.hotspot || states.lastHotspot || 0; // If there was no hotspot in the hash, see if there was a saved hotspot states, if not start at zero
					states.lastHotspot = pp_info.hotspot;
					// Go to previous hotspot
					if (direction == 'prev-hotspot'){
						// Decrease our hotspot cursor by one
						pp_info.hotspot--
						// If that's less than zero then that means we were on a full view page, so go to the last hotspot of the previous panel
						if (pp_info.hotspot < 0){

							if (pp_info.page != 1) { // TODO handle first page to go back to main window or something
								pp_info.page--;
								// pp_info.hotspot = $('#page-'+pp_info.page).attr('data-length'); // Go back to last hotspot
								pp_info.hotspot = '' // Go to last panel
								states.lastHotspot = Number($('#page-'+pp_info.page).attr('data-length')) + 1; // Start off with the last panel
							} else {
								pp_info.hotspot = '';
							}
						} else if(pp_info.hotspot < 1){ // If that takes us below the first hotspot, go to the full view of this page
							states.lastHotspot = '';
							pp_info.hotspot = '';
						}

					// Go to next hotspot
					} else if (direction == 'next-hotspot'){
						// Increase our hotspot cursor by one
						pp_info.hotspot++;

						// If that exceeds the number of hotspots on this page, go to the full view of the next page
						if (pp_info.hotspot > page_max){
							pp_info.page++;
							pp_info.hotspot = '';
							states.lastHotspot = ''
						}

					// Go to the page view
					} else if (direction == 'page-view'){
						pp_info.hotspot = '';
					}

					// Add our new info to the hash
					// or nof if we're going to a full pulle
					newhash = pp_info.page.toString();
					if (pp_info.hotspot){
						newhash += '/' + pp_info.hotspot
					}
					// Go to there
					routing.router.navigate(newhash, {trigger: true});
				}
			}
		},
		// Reads the route
		// Switches pages if necessary
		// Scales to page view if no hotspot is set
		// Delegates zooms to hotspot if it is
		read: function(page, hotspot, transitionDuration){
			var css;
			var page_change_direction, exiting_class, entering_class;
			var $page_container = $('#page-container-'+page);

			// Make the current page visible if it isn't
			if (!$page_container.hasClass('viewing')) $page_container.addClass('viewing');
			if (states.firstRun) saveCurrentStates(page, hotspot);

			// If we're changing pages
			if (states.currentPage != page){
				// Next page
				if ( Number(states.currentPage) < Number(page) ) {
					page_change_direction = 'next-page';
					exiting_class = 'exit-to-left';
					entering_class = 'enter-from-right';
				// Previous page
				} else {
					page_change_direction = 'prev-page';
					exiting_class = 'exit-to-right';
					entering_class = 'enter-from-left';
				}
				$('#pages').attr('data-state','changing');
				$('#page-container-'+states.currentPage).addClass(exiting_class);
				$('#page-container-'+page).addClass(entering_class);
			}

			// Now zoom
			if (hotspot){
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
			var mask_css = helpers.addDuration({ 'height': 0, opacity: 0 }, transitionDuration);
			$('.mask').css(mask_css);
			// Bring back footnotes
			$('#page-container-'+page_number+' .footnote-container').css('opacity', 1);
			// Set the page state to changing if there are two viewing objects, else set it to page
			if ($('.viewing').length == 1) {
				$('#pages').attr('data-state','page');
			} else if ($('.viewing').length == 2){
				$('#pages').attr('data-state','changing');
			}

		},
		toHotspot: function(page, hotspot, transitionDuration){
			// cg means `current page`
			// th means `target hotspot`
			var buffer = .2;
			var $currentPage = $('#page-'+page),
					cg_width = $currentPage.width(),
					cg_top = $currentPage.position().top,
					viewport_xMiddle = $(window).width() / 2,
					cg_yMiddle = $currentPage.height() / 2;

			var $targetHotspot = $('#hotspot-'+page+'-'+hotspot),
					th_top = Number($targetHotspot.attr('data-top')),
					th_left = Number($targetHotspot.attr('data-left')),
					th_width = Number($targetHotspot.attr('data-width')),
					th_xMiddle = th_width / 2,
					th_yMiddle = Number($targetHotspot.attr('data-height')) / 2;

			var scale_multiplier = 1 / (th_width / cg_width); // Scale the width of the page by this to expand the target hotspot to full view
			var x_adjuster = viewport_xMiddle - th_left - th_xMiddle,
					y_adjuster = cg_yMiddle - th_top - th_yMiddle;

			var css = helpers.setTransitionCss('transform', 'scale('+ scale_multiplier +') translate('+x_adjuster+'px, '+y_adjuster+'px)', transitionDuration);
			$currentPage.css(css);
			zooming.sizeMasks(th_yMiddle*2, cg_yMiddle*2, scale_multiplier, transitionDuration);
			// Hide the footnotes
			$('#page-container-'+page+' .footnote-container').css('opacity', 0);
			states.scaleMultiplier = scale_multiplier;
			// Set the page state
			$('#pages').attr('data-state','hotspot');
		},
		sizeMasks: function(th_height, cg_height, scaler, transitionDuration){
			var mask_height = ( cg_height - (th_height * scaler) ) / 2;
			var css = { 'height': mask_height+'px', opacity: 1 };
			css = helpers.addDuration(css, transitionDuration)
			$('.mask').css(css);
		}
	}

	var init = {
		go: function(){
			layout.bakeMasks();
			init.loadPages();
			listeners.resize();
			listeners.keyboardAndGestures();
		},
		loadPages: function(){
			$.getJSON('../data/pages.json', layout.bakePages);
		}
	}

	init.go();

}).call(this);