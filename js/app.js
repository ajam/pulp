(function(){
	'use strict';

	var CONFIG = {
		full_width: 570
	}

	var states = {
		zoom: 'page',
		currentPage: '1',
		currentHotspot: 'none',
		lastHotspot: '',
		transition: {
			enabled: true,
			duration: '.3s'
		}
	}

	var helpers = {
		setTransitionCss: function(property, value){
			var css = this.vendorPrefix(property, value);
			// if you don't specify, it will just add the normaly duration, if you set the third param to true, it will cancel the duration
			if (states.transition.enabled){
				css = this.vendorPrefix('transition-duration', states.transition.duration, css)
			} else {
				css = this.vendorPrefix('transition-duration', 0, css)
			}
			return css;
		},
		vendorPrefix: function(property, value, obj){
			var pfxs = ['webkit', 'moz', 'ms', 'o'];
			obj = obj || {};
			for (var i = 0; i < pfxs.length; i++){
				obj['-' + pfxs[i] + '-' + property] = value
			}
			return obj;
		},
		saveCurrentStates: function(page, hotspot){
			states.currentPage = page;
			states.currentHotspot = hotspot;
		},
		hashToPageHotspotDict: function(hash){
			// If for some reason it has a slash as the last character, cut it so as to not mess up the split
			// if (hash.charAt(hash.length - 1) == '/') hash = hash.substring(0, hash.length -1);
			hash = hash.replace('#', '').split('/'); // `#1/3` -> ["1", "3"]
			hash = _.map(hash, function(val) { return Number(val)}); // Convert to number  ["1", "3"] -> [1, 3]
			
			return { page: hash[0], hotspot: hash[1] }
		},
		getNavDirection: function(e, code){
			if (code == 37 || code == 38 || code == 39 || code == 40 || code == 'swipeleft' || code == 'swiperight' || code == 'pinch'){
				// Don't do the default behavior if it's an arrow, swipe or pinch
				e.preventDefault();
				e.stopPropagation();
			}
			// Do this
			// Left arrow
			if (code == 37 || code == 'swiperight') return 'prev-hotspot';
			// Right arrow
			if (code == 39 || code == 'swipeleft') return 'next-hotspot';
			// Esc, up, down arrows
			if (code == 27 || code == 38 || code == 40 || code == 'pinch') return 'page-view';
		}	
	}

	var templates = {
		pageFactory: _.template( $('#page-template').html() ),
		hotspotFactory: _.template( $('#hotspot-template').html() )
	}

	var layout = {
		addMasks: function(){
			$('#pages').append('<div class="mask" id="top-mask"></div>').append('<div class="mask" id="bottom-mask"></div>');
		},
		bakePage: function(data){
			var page_markup = templates.pageFactory(data);
			var $page;
			$('#pages').append(page_markup);
			$page = $('#page-'+data.number);
			// For zooming, we need to know the absolute location of each hotspot so we can know how to get to it
			layout.measureHotspots( $page );
			listeners.hotspotClicks( $page );
			routing.initRoute();
		},
		measureHotspots: function($page){
		 $page.find('.hotspot').each(function(index, hs){
				var $hs = $(hs);
				$hs.attr('data-top', $hs.offset().top );
				$hs.attr('data-left', $hs.offset().left );
				$hs.attr('data-width', $hs.width() );
				$hs.attr('data-height', $hs.height() );
			});
		},
		update: function(){
			// Do this on window resize
			var current_page = 1;
			var $page = $('#page-'+current_page);

			// Disable transitions so it happens quickly
			states.transition.enabled = false;

			// Scale the page back down to 1x1
			zooming.reset(current_page);
			// Measure the page at those dimensions
			layout.measureHotspots( $page );
			// Get what page and hotspot we're on
			var page_hotspot = helpers.hashToPageHotspotDict(window.location.hash);
			// And initiate zooming to that hotspot
			routing.read(page_hotspot.page, page_hotspot.hotspot);
			// Re-enable transitions for next time we click or swipe
			states.transition.enabled = true;
			// Redo masks
		}
	}

	var listeners = {
		global: function(){
			layout.updateDebounce = _.debounce(layout.update, 300);
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
		}
	}

	var routing = {
		initRoute: function(){
			this.Router = Backbone.Router.extend({
				routes: {
					":page(/)": "page", // Take me to a page
					":page/:hotspot": 'hotspot' // Take me to a specific hotspot
				}
			});

			this.router = new this.Router;

			this.router.on('route:page', function(page) {
				routing.read(page);
			});
			this.router.on('route:hotspot', function(page, hotspot) {
				console.log('routing')
				routing.read(page, hotspot);
			});
				
			// For bookmarkable Urls
			Backbone.history.start();
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
					hotspot = 'none'; // Set the current hotspot to none to signify you're on the page view.
					hash = page; // And in the url hash, display only the page number.
				}else{
					hash = page + '/' + hotspot; // Otherwise, send the page and hotspot to the route.
				}

				// Change the hash
				routing.router.navigate(hash, {trigger: true});
			},
			fromKeyboardOrGesture: function(direction){
				// dir can be: prev-hotspot, next-hotspot, page-view
				var pp_info = helpers.hashToPageHotspotDict( window.location.hash );
				var page_max = Number( $('#page-'+pp_info.page).attr('data-length') );
				var newhash;

				// TODO interpage navigation if its last or first

				// If there was no hotspot, see if there was a saved hotspot states, if not start at zero
				pp_info.hotspot = pp_info.hotspot || states.lastHotspot || 0;
				if (direction == 'prev-hotspot'){
					pp_info.hotspot--

					// If it's below one, go to the full view of this page
					if (pp_info.hotspot < 1){
						states.lastHotspot = '';
						pp_info.hotspot = 'none';
					}

				} else if (direction == 'next-hotspot'){
					pp_info.hotspot++;

					// If it's the last hotspot, go to the full view of the next page
					if (pp_info.hotspot > page_max){
						pp_info.page++;
						pp_info.hotspot = 'none';
					}

				}

				// Add our new info to the hash
				// or nof if we're going to a full pulle
				newhash = pp_info.page.toString();
				if (pp_info.hotspot != 'none'){
					newhash += '/' + pp_info.hotspot
				}

				// Go to there
				routing.router.navigate(newhash, {trigger: true});
			}
		},
		// Reads the route
		// Switches pages if necessary
		// Scales to page view if no hotspot is set
		// Delegates zooms to hotspot if it is
		read: function(page, hotspot){
			var css;
			if (states.currentPage != page){
				// Load that page
				// TK page navigation and possible async headache
			}

			if (!hotspot){
				// Reset back to full page view here
				zooming.reset(page);
			}else{
				zooming.hotspot(page, hotspot);
			}

			// Save the current page and hotspot to what the route said. TK placement here. I'll have to see how all the nav mixures play out and how pagination works
			helpers.saveCurrentStates(page, hotspot);
		}
	}

	var zooming = {
		reset: function(page){
			// Reset zoom to full page view
			var css = helpers.setTransitionCss('transform', 'scale(1)');
			$('#page-'+page).css(css);
		},
		hotspot: function(page, hotspot){
			console.log('zooming')
			// cg means `current page`
			// th means `target hotspot`
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

			var css = helpers.setTransitionCss('transform', 'scale('+ scale_multiplier +') translate('+x_adjuster+'px, '+y_adjuster+'px)')
			$currentPage.css(css);

		}
	}

	function startTheShow(){
		layout.addMasks();
		$.getJSON('../data/page1.json', layout.bakePage);
		listeners.global();
		listeners.keyboardAndGestures();
	}

	startTheShow();

}).call(this);