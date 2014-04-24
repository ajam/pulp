(function(){
	'use strict';

	var CONFIG = {
		full_width: 570
	}

	var states = {
		zoom: 'page',
		currentPage: '1',
		currentPanel: 'none',
		lastPanel: '',
	}

	var router;
	var panelTemplateFactory = _.template($('#panel-template').html());

	var helpers = {
		calcImgPercentage: function(img_src){
			var width = Number(img_src.split('-')[1]);
			var perc = Math.floor(width / CONFIG.full_width * 100);
			return perc
		},
		formatIdFromImgName: function(img_name){
			return img_name.split('-')[0];
		},
		vendorPrefix: function(property, value){
			var pfxs = ['webkit', 'moz', 'ms', 'o'];
			var obj = {};
			for (var i = 0; i < pfxs.length; i++){
				obj['-' + pfxs[i] + '-' + property] = value
			}
			return obj
		}
	}

	function navigatePanelLoc($panel){
		var page_panel = $panel.attr('id').split('-')[1].split('_'),
				page = page_panel[0],
				panel = page_panel[1],
				hash = '';

		// If you've tapped on the active panel...
		if (states.currentPage == page && states.currentPanel == panel) {
			states.lastPanel = panel; // Record the last panel you were on. You can then pick up from here on swipe perhaps.
			panel = 'none'; // Set the current panel to none to signify you're on the panel view.
			hash = page; // And in the url hash, display only the page number.
		}else{
			hash = page + '/' + panel; // Otherwise, send the page and panel to the route.
		}
		// Change the hash
		router.navigate(hash, {trigger: true});
	}

	function bindPanelHandlers($pnl){
		$pnl.on("click", function(ev) {
			navigatePanelLoc($(this));
		});
	}

	function measurePanel($pnl){
		// TODO also do this on debounced resize
		// Save initial measurements to 
		$pnl.attr('data-top', $pnl.position().top );
		$pnl.attr('data-left', $pnl.position().left );
		$pnl.attr('data-width', $pnl.width() );
		$pnl.attr('data-height', $pnl.height() );
	}

	function handlePanel(page_number, panel_data){
		_.extend(panel_data, helpers)
		var $panel = $(panelTemplateFactory(panel_data));
		// Plot panel
		$panel.appendTo($('#page-'+page_number));
		// Add panel dimensions as data attributes
		measurePanel($panel);
		// Add panel handlers
		bindPanelHandlers($panel);

	}

	function handlePage(data){
		// Create a new page
		var panelsN = data.p.length;
		$('#pages').append('<div class="page" id="page-'+data.n+'" data-panels="'+panelsN+'"></div>');
		// Plot that pane
		for (var i = 0; i < data.p.length; i++){
			handlePanel(data.n, data.p[i])
		}
		handleRoute(); // TODO this will eventually live somewhere else once the multi-page load architecture works
	}

	function zoomToPanel(page, panel){
		// tn = target panel
		// cg = current page
		var $currentPage = $('#page-'+page),
				cg_width = $currentPage.width(),
				cg_top = $currentPage.position().top,
				viewport_xMiddle = $(window).width() / 2,
				viewport_yMiddle = $(window).height() / 2;

		var $targetPanel = $('#panel-'+page+'_'+panel),
				tn_top = Number($targetPanel.attr('data-top')),
				tn_left = Number($targetPanel.attr('data-left')),
				tn_width = Number($targetPanel.attr('data-width')),
				tn_xMiddle = tn_width / 2,
				tn_yMiddle = Number($targetPanel.attr('data-height')) / 2;

		var scale_multiplier = 1 / (tn_width / cg_width), // Scale the width of the page by this to expand the target panel to full view
				x_adjuster = viewport_xMiddle - tn_left - tn_xMiddle,
				y_adjuster = viewport_yMiddle - tn_top - tn_yMiddle;

		var css = helpers.vendorPrefix('transform', 'scale('+ scale_multiplier +') translate('+x_adjuster+'px, '+y_adjuster+'px)')
		$currentPage.css(css);

	}

	function writeStates(page, panel){
		states.currentPage = page;
		states.currentPanel = panel
	}

	function navTo(page, panel){
		var css;
		if (states.currentPage != page){
			// Load that page
			// TK page navigation and possible async headache
		}

		if (!panel){
			// Reset back to full page view here
			css = helpers.vendorPrefix('transform', 'scale(1)');
			$('#page-'+page).css(css);
		}else{
			zoomToPanel(page, panel);
		}

		writeStates(page, panel);
	}

	function handleRoute(){
		var Router = Backbone.Router.extend({
			routes: {
				":page(/)": "page", // Take me to a page
				":page/:panel": 'panel' // Take me to a specific panel
			}
		});
		router = new Router;
		router.on('route:page', function(page) {
			console.log('page');
			navTo(page);
		});
		router.on('route:panel', function(page, panel) {
			console.log('panel');
			navTo(page, panel);
		});
			
		// For bookmarkable Urls
		Backbone.history.start();

	}

	function decipherHash(hash){
		// If for some reason it has a hash as the last character, cut it
		if (hash.charAt(hash.length - 1) == '/') hash = hash.substring(0, hash.length -1);
		hash = hash.replace('#', '').split('/');
		hash = _.map(hash, function(val) { return Number(val)});
		return {page: hash[0], panel: hash[1]}
	}
	function nav(direction){
		// dir can be: prev-panel, next-panel, panel-view
		// console.log(dir)
		var pp_info = decipherHash(window.location.hash);
		var page_max = Number( $('#page-'+pp_info.page).attr('data-panels') );
		var newhash;

		// TODO interpage navigation

		// If there was no panel, see if there was a saved panel states, if not start at zero
		pp_info.panel = pp_info.panel || states.lastPanel || 0;
		if (direction == 'prev-panel'){
			pp_info.panel--

			// If it's below one, go to the full view of this page
			if (pp_info.panel < 1){
				states.lastPanel = '';
				pp_info.panel = 'none';
			}

		} else if (direction == 'next-panel'){
			pp_info.panel++;

			// If it's the last panel, go to the full view of the next page
			if (pp_info.panel > page_max){
				pp_info.page++;
				pp_info.panel = 'none';
			}

		}

		// Add our new info to the hash
		// or nof if we're going to a full pulle
		newhash = pp_info.page.toString();
		if (pp_info.panel != 'none'){
			newhash += '/' + pp_info.panel
		}

		// Go to there
		router.navigate(newhash, {trigger: true})

	}

	// TODO organize functions under scopes like navigation, layout etc.
	function handleNavInput(e, code){
		if (code == 37 || code == 38 || code == 39 || code == 40 || code == 'swipeleft' || code == 'swiperight' || code == 'pinch'){
			// Don't do that
			console.log('kill', code)
			e.preventDefault();
			e.stopPropagation();
		}

		// Do this
		// Left arrow
		if (code == 37 || code == 'swiperight') nav('prev-panel');
		// Right arrow
		if (code == 39 || code == 'swipeleft') nav('next-panel');
		// Esc, up, down arrows
		if (code == 27 || code == 38 || code == 40 || code == 'pinch') nav('panel-view');

	}

	function bindMainHandlers(){
		$('body').keydown(function(e){
			console.log(e,'keypress')
			var kc = e.keyCode;
			handleNavInput(e, kc);
		});

		$(document).on('swipeleft', function(e){
			console.log('swipeleft', e)
			handleNavInput(e, 'swipeleft');
		});

		$(document).on('swiperight', function(e){
			console.log('swiperight', e)
			handleNavInput(e, 'swiperight');
		});

	}

	function startTheShow(){
		$.getJSON('../data/page1.json', handlePage);
		bindMainHandlers();
	}

	startTheShow();
}).call(this);
