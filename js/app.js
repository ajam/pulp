(function(){
	'use strict';

	var State = Backbone.Model.extend({
		initialize: function(){
			this.set('single-page-width', parseInt( $('#pages').css('max-width') ));
			this.set('format', null);
			this.set('zoom', null);
		},
		setPageFormat: function(page){
			this.set('format', this.determinePageFormat( page ) );
		},
		determinePageFormat: function(page, windowWidth, bypass){
			windowWidth = windowWidth || $(window).width();
			// If we're on the first page
			// TODO, last page
			if (!bypass){
				var this_page = page || states.currentPage;
				if (this_page == 1) return 'bookend';
			}
			// If the window is wide enough for two pages
			if (windowWidth > this.get('single-page-width')*2 + pulpSettings.gutterWidth) return 'double';
			// If it's less than a single page
			if (windowWidth <= this.get('single-page-width')) return 'mobile';
			// Everything else
			return 'single'
		}
	});

	var state = new State;

	var states = {
		currentPage: '1',
		currentHotspot: '',
		lastPage: '',
		lastHotspot: '',
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
			var duration = transitionDuration ? pulpSettings.transitionDuration : 0
			_.extend(cssObj, {'transition-duration': duration});
			return cssObj;
		},
		saveCurrentStates: function(page, hotspot, lastPage){
			if (state.get('format') == 'double' && page % 2 != 0) page = page - 1;
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
			if (code == 37 || code == 38 || code == 39 || code == 40 || code == 'swipeleft' || code == 'swiperight' || code == 'pinch'){
				// Don't do the default behavior if it's an arrow, swipe or pinch
				e.preventDefault();
				e.stopPropagation();

				// Do this
				// Left arrow
				if (code == 37 || code == 'swiperight') return 'prev';
				// Right arrow
				if (code == 39 || code == 'swipeleft') return 'next';
				// Esc, up, down arrows
				if (code == 27 || code == 38 || code == 40 || code == 'pinch') return false;
				// if (code == 27 || code == 38 || code == 40 || code == 'pinch') return 'pageView';
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
			if (a.number < b.number)
				return -1;
			if (a.number > b.number)
				return 1;
			return 0;
		}
	}

	var templates = {
		pageFactory: _.template( $('#page-template').html() ),
		hotspotFactory: _.template( $('#hotspot-template').html() ),
		endnotesFactory: _.template( $('#endnotes-template').html() )
	}

	var layout = {
		init: function(){
			this.mainContent = '#main-content-wrapper'
			this.drawerContainer = '#side-drawer-container';
			this.drawerContent = '#side-drawer-content';
			this.drawerHandle = '#side-drawer-handle';
			$.detectSwipe.scrollExceptionCondition = function(){
				return ($('body').attr('data-side-drawer-open') == 'true' || $('body').attr('data-side-drawer-state') == 'changing' );
			}
			this.slideContentArea(true);
		},
		bakeMasks: function(){
			$('#pages').append('<div class="mask" id="top-mask"></div>').append('<div class="mask" id="bottom-mask"></div>');
		},
		bakePages: function(pages){
			var page_markup, $page;
			states.pages_max = pages.length;
			for (var i = 0; i < pages.length; i++){
				page_markup = templates.pageFactory(pages[i]);
				$('#pages').append(page_markup);
				$page = $('#page-'+pages[i].number);

				// Add listeners
				listeners.hotspotClicks( $page );
				listeners.pageTransitions();
			}
			// Once images are loaded, measure the hotspot locations
			layout.measurePageElements(function(){
				// Listen for changes in state
				listeners.state();
				// Read the hash and navigate
				routing.init();
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
			_.each([$pages,$pagesWrapper], function($el) { $el.css('max-width', 'auto').css('max-height', 'auto'); });
			$pages.imagesLoaded().done(function(){
				var $img = $pages.find('img'),
						img_width,
						img_height,
						img_width_wrapper;

				img_width = img_width_wrapper = $img.width();
				img_height = $img.height();

				if (state.determinePageFormat(null, null, true) == 'double') {
					img_width = img_width*2;
					img_width_wrapper = img_width+pulpSettings.gutterWidth;
					if (init.browser[0] == 'Firefox') img_width_wrapper = img_width_wrapper - 1; // Minus one for sub-pixel rendering hack
				}
				// Apply the dimensions from the image to the wrapper
				// Apply a bit of a margin on pages_wrapper to accommodate the gutter
				_.each([{el: $pages, width: img_width}, {el:$pagesWrapper, width: img_width_wrapper}], function(el) { el.el.css('max-width', (el.width)+'px').css('max-height', img_height+'px');; });
				if (cb) cb();
			});
		},
		implementPageFormat: {
			bookend: function(){
				// this.single();
				if (states.currentPage == 2) { 
					$('#page-container-3').addClass('exit-to-right').addClass('right-page');
				} else {
					this.single();
				}
			},
			mobile: function(){
				this.single();
			},
			single: function(){
				$('.right-page').removeClass('viewing').removeClass('right-page');
			},
			double: function(){
				// Clear all info
				states.hotspot = '';
				states.lastHotspot = '';
				var current_id;
				// If we're not on the first page...
				if (states.currentPage != 1){
					// Get the id of the current page based on what is visible
					current_id = +$('.page-container.viewing').attr('id').split('-')[2]; // `page-container-1` -> 1
					// If it's an odd page that means we were on a right page, so the current focus should now be on the left page
					if (current_id % 2 != 0) {
						current_id--;
						// This next line might not be necessary, or it might be crucial
						helpers.saveCurrentStates(current_id);
					}
				} else {
					current_id = 2;
				}
				$('#page-container-' + current_id).addClass('viewing');
				$('#page-container-' + (current_id + 1)).addClass('right-page').addClass('viewing');
			}
		},
		update: function(){
			// What's done on window resize:
			// See if we can accommodate single or double
			state.setPageFormat();
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
					// And initiate zooming to that hotspot, (page_number, hotspot_number, transitionDuration)
					routing.read(page_hotspot.page, page_hotspot.hotspot, false);
				}
			});
		},
		displayPageNumber: function(page){
			page = +page;
			// var format = state.determinePageFormat();
			// If we're double and it's an even page and it's not the last page, then put it on the odd page
			// if (format != 'single' && page % 2 == 0 && page != states.pages_max) page = +page + 1;

			// If it's a wide format
			// And we're navigating to an odd page, then subtract it down so the route puts you on the even page with the odd page visible to the right
			if ( state.get('format') == 'double' && page % 2 != 0 && page != 1 ){
				page = page - 1;
			}
			$('.header-item[data-which="page-number"] .header-text').html('Page ' + page + ' / ' + states.pages_max)
		},
		showAppropriateNavBtns: function(page){
			page = +page;
			var direction;
			if (page == 1) { 
				direction = 'prev';
			} else if (page == states.pages_max) {
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
		toggleModal: function(){
			$('#modal-container').toggle();
		},
		bakeEndnotes: function(endnotes){
			endnotes.sort(helpers.sortByNumber)
			var content = templates.endnotesFactory({endnotes: endnotes});
			$('#modal-content').html(content);
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
			var state = $body.attr('data-side-drawer-state');
			if (state) $body.attr('data-side-drawer-state', 'changing');
			open = open || $body.attr('data-side-drawer-open') == 'true';
			$body.attr('data-side-drawer-open', !open);
			_.delay(this.onDrawerTransitionEnd, 500)
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
			console.log(current_translateX, d_x);
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
				'transition-duration': pulpSettings.drawerTransitionDuration,
				'transform': 'auto'
			});
			layout.slideContentArea(true);
		}
	}

	var listeners = {
		header: function(){
			$('.header-item-container[data-btn="fullscreen"]').on('click', function(){
				helpers.toggleFullScreen();
			});

			$('.header-item-container[data-action="modal"]').on('click', function(){
				layout.toggleModal();
			});

			$('.header-item-container[data-action="drawer"]').on('click', function(){
				layout.slideContentArea();
			});

			$('#modal-container').on('click', '.close', function(){
				layout.toggleModal();
			});
		},
		resize: function(){
			layout.updateDebounce = _.debounce(layout.update, 100);
			// TODO, Does this trigger on different mobile device orientation changes?
			window.addEventListener('resize', function(){
				layout.updateDebounce();
			})
		},
		state: function(){
			state.on('change:format', function(model, format) {
				// $('#pages').attr('data-format', format)
				$('body').attr('data-format', format)
				layout.implementPageFormat[format]();
			});
			state.on('change:zoom', function(model, zoom) {
				// $('#pages').attr('data-state', zoom);
				$('body').attr('data-state', zoom);
			});
			// state.on('change:device', function(model, device) {
			// 	console.log(device)
			// });
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

			$('.main-nav-btn-container').on('click', function(){
				var direction = $(this).attr('data-dir');
				routing.set.fromKeyboardOrGesture(direction);
			});
		},
		pageTransitions: function(){
			$('.page-container').on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', transitions.onAnimationEnd);
		},
		drawer: function(){
			// Disable scroll bug on iOS
			new ScrollFix(document.getElementById('side-drawer-container'));
			$('body').on('touchmove', layout.catchDrawerScroll);
			$(layout.drawerHandle).on("touchstart touchmove", layout.dragDrawer);
			$(layout.drawerHandle).on("touchend", layout.snapDrawer);
		}
	}

	// Determine the correct hotspot and page number based on direction
	var leafing = {
		prev: {
			page: function(pp_info){
				var format = state.get('format')
				if (pp_info.page != 1){
					if (format != 'double'){
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
				// Decrease our hotspot cursor by one
				pp_info.hotspot--;
				// If that's less than zero then that means we were on a full view page, so go to the last hotspot of the previous panel
				if (pp_info.hotspot < 0){
					pp_info.hotspot = '' // Go to panel view

					if (pp_info.page != 1) { // TODO handle first page to go back to main window or something
						pp_info.page--;
						// pp_info.hotspot = $('#page-'+pp_info.page).attr('data-length'); // Go back to last hotspot
						states.lastHotspot = Number($('#page-'+pp_info.page).attr('data-length')) + 1; // Start off with the last panel
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
				if (state.get('format') == 'double') increment_by = 2;

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
		},
		pageView: function(pp_info){
			pp_info.hotspot = '';
			return pp_info;
		}
	}

	// Change pages
	var transitions = {
		goIfNecessary: function(currentPage, newPage){
			// If it's a wide format
			// And we're navigating to an odd page, then subtract it down so the route puts you on the even page with the odd page visible to the right
			if ( state.get('format') == 'double' && newPage % 2 != 0 ){
				newPage = newPage - 1;
				routing.router.navigate(newPage.toString(), { replace: true });
			}
			var classes = this.determineTransition(currentPage, newPage);			
			if (classes) transitions.movePages(currentPage, newPage, classes);
		},
		determineTransition: function(currentPage, newPage){
			var classes;
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
			if (state.get('format') != 'double'){
				// Exit the current page
				$('#page-container-'+currentPage).addClass(classes.exiting);
				// Enter the next page, the one that is shown in the hash
				$('#page-container-'+newPage).addClass('viewing').addClass(classes.entering);
			} else {
				// Exit both the current and one shown in the url since they are already viewable
				// If it's the current page it will look nicer if it exits starting from the center.
				var first_page_exit_classes = '';
				if (currentPage == 1) first_page_exit_classes = ' center-page';

				$('#page-container-'+currentPage).addClass(classes.exiting + first_page_exit_classes);
				$('#page-container-'+(currentPage + 1) ).addClass(classes.exiting);
				// Enter the next two
				$('#page-container-'+newPage).addClass('viewing').addClass(classes.entering);
				$('#page-container-'+(newPage + 1) ).addClass(classes.entering).addClass('right-page').addClass('viewing');
			}
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
			if (state.get('format') == 'double' && states.lastPage != 1) {
				$('#page-container-'+ (+states.lastPage + 1) ).removeClass('viewing').removeClass('right-page').find('.page').css(helpers.setTransitionCss('transform', 'scale(1)', false));
			} else if (state.get('format') == 'bookend' && states.currentPage == 1 ) {
				$('#page-container-'+ (+states.lastPage + 1) ).removeClass('viewing').removeClass('right-page');
			}
			state.set('zoom','page');
		}
	}

	var routing = {
		setInitRouteChecks: function(page, triggerLazyLoad, cb){
			var transition_duration = true;
			// If our URL we came from is a hotspot then lazyLoad won't be triggered
			// Because it's categorically false when navigating to a hotspot
			// The only time that changes would be when we're on a first run
			// So it has a fall back to `true` in that scenario
			// TODO, now that `setInitRouteChecks` is a callback, if we're on first run, you can cancel route navigation and kick people to the first page if that's the desired behavior
			triggerLazyLoad = triggerLazyLoad || states.firstRun;
			if (states.firstRun) { 
				helpers.saveCurrentStates(page); 
				transition_duration = false;
				if (page == '1'){
					layout.toggleNavHelpers(true);
				}
			} else {
				layout.toggleNavHelpers(false);
			}
			// Load the image for the next ten pages if they still have placeholder images
			if (triggerLazyLoad) this.lazyLoadImages(page);
			layout.displayPageNumber(page);
			layout.showAppropriateNavBtns(page);
			cb(transition_duration);
		},
		lazyLoadImages: function(page){
			page = +page;
			var extent = pulpSettings.lazyLoadExtent,
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
				if (src.indexOf('data:image\/gif') > -1) $img.attr('src', 'imgs/pages/page-'+page_number+'.'+pulpSettings.imgFormat );
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
				routing.setInitRouteChecks(page, true, function(transitionDuration){
					routing.read(page, null, transitionDuration);
				});
			});

			routing.router.on('route:hotspot', function(page, hotspot) {
				routing.setInitRouteChecks(page, null, function(transitionDuration){;
					// If we're on desktop, kill the hotspot
					if (state.get('format') != 'mobile' ) {
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
			// If it doesn't have a hash then go to the first page
			// TODO question, should this always start you from the beginning on load?
			if (!locationHash){
				routing.router.navigate(states.currentPage, { trigger: true, replace: true });
			}
		},
		set: {
			fromHotspotClick: function($hotspot){
				// Only do this on mobile
				if (state.get('format') == 'mobile'){
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
				}
			},
			fromKeyboardOrGesture: function(direction){
				// direction can be: next, prev, pageView or false if it wasn't a key code we captured
				// If the body is changing then don't do anything
				if (direction && $('body').attr('data-state') != 'page-change'){
					var pp_info = helpers.hashToPageHotspotDict( window.location.hash ),
							hotspot_max = Number( $('#page-'+pp_info.page).attr('data-length') ),
							format = state.get('format'),
							leaf_to;

					pp_info.page = pp_info.page || 1; // If there's no page, go to the first page
					pp_info.hotspot = pp_info.hotspot || states.lastHotspot || 0; // If there was no hotspot in the hash, see if there was a saved hotspot states, if not start at zero
					states.lastHotspot = pp_info.hotspot;
					
					// Send it to the appropriate function to transform the new page and hotspot locations
					(format == 'mobile') ? leaf_to = 'hotspot' : leaf_to = 'page';

					// TODO, current errors on arrow up keys and other things that have a direction variable but not a function under leafing
					pp_info = leafing[direction][leaf_to](pp_info, hotspot_max, states.pages_max);
					// Add our new info to the hash
					// or nof if we're going to a full pulle
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
				if (state.get('format') != 'mobile' && pp_info.hotspot){
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
			if (state.get('format') == 'mobile' && hotspot){
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
			// // Bring back footnotes
			// $('#page-container-'+page_number+' .footnote-container').css('opacity', 1);

			// Set the page state to changing if there are more than the appropriate number of viewing objects, else set it to page
			var zoom_state, normal_length;
			if ( state.get('format') != 'double') {
				normal_length = 1;
			} else {
				normal_length = 2;
			}
			// If there are more pages visible than there should be, then we're changing pages.
			if ( $('.viewing').length == normal_length ) {
				zoom_state = 'page';
			} else if ( $('.viewing').length > normal_length  ) {
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
					viewport_xMiddle = $(window).width() / 2,
					cg_yMiddle = $currentPage.height() / 2;

			// This value is stored on load because it changes on different scales but is really constant
			// It's essentially the height of the toolbar, but by defining it this way, you can protect against other elements that impact the height
			var cg_top = +$('#pages').attr('data-offset-top');

			var $targetHotspot = $('#hotspot-'+page+'-'+hotspot),
					th_top = Number($targetHotspot.attr('data-top')),
					th_left = Number($targetHotspot.attr('data-left')),
					th_width = Number($targetHotspot.attr('data-width')),
					th_xMiddle = th_width / 2,
					th_yMiddle = Number($targetHotspot.attr('data-height')) / 2;

			var scale_multiplier = 1 / (th_width / cg_width); // Scale the width of the page by this to expand the target hotspot to full view
			var x_adjuster = viewport_xMiddle - th_left - th_xMiddle,
					y_adjuster = cg_yMiddle - th_top - th_yMiddle + cg_top;

			var css = helpers.setTransitionCss('transform', 'scale('+ scale_multiplier +') translate('+x_adjuster+'px, '+y_adjuster+'px)', transitionDuration);
			$currentPage.css(css);
			zooming.sizeMasks(th_yMiddle*2, cg_yMiddle*2, scale_multiplier, transitionDuration);
			// // Hide the footnotes
			// $('#page-container-'+page+' .footnote-container').css('opacity', 0);
			states.scaleMultiplier = scale_multiplier;
			// Set the page state
			state.set('zoom', 'hotspot');
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
			this.whitelabel(pulpSettings.whitelabel);
			this.browser = this.browserCheck();
			layout.init();
			layout.bakeMasks();
			this.loadPages();
			listeners.resize();
			listeners.header();
			listeners.keyboardAndGestures();
			listeners.drawer();
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
					// TK, remove console.log for production
					console.log('Error: Data file not found!');
				});
		},
		browserCheck: function(){
	    var ua= navigator.userAgent, tem, 
	    M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
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
				$('#header').prepend(whitelabelObj.logo);
			}
		}
	}

	init.go();

}).call(this);