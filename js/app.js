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

	var formatHelpers = {
		calcImgPercentage: function(img_src){
			var width = Number(img_src.split('-')[1]);
			var perc = Math.floor(width / CONFIG.full_width * 100);
			return perc
		},
		formatIdFromImgName: function(img_name){
			return img_name.split('-')[0];
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
		$pnl.hammer({})
				.on("tap", function(ev) {
					navigatePanelLoc($(this));
				})
	}



	function handlePanel(page_number, panel_data){
		_.extend(panel_data, formatHelpers)
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
		$('#pages').append('<div class="page" id="page-'+data.n+'"></div>');
		// Plot that pane
		for (var i = 0; i < data.p.length; i++){
			handlePanel(data.n, data.p[i])
		}
		handleRoute(); // TODO this will eventually live somewhere else once the multi-page load architecture works
	}

	function zoomToPanel(page, panel){
		// tn = target panel
		// cg = current page
		var scrolltop = $(window).scrollTop(),
				$currentPage = $('#page-'+page),
				cg_top = $currentPage.position().top,
				viewport_middle = $(window).height() / 2,
				$targetPanel = $('#panel-'+page+'_'+panel),
				tn_left = $targetPanel.position().left,
				tn_width = $targetPanel.width(),
				tn_middle = $targetPanel.height() / 2,
				tn_top = $targetPanel.offset().top;

		var scale_multiplier = 1 / (tn_width / CONFIG.full_width), // Scale the width of the page by this to expand the target panel to full view
				y_adjuster = viewport_middle - tn_top - tn_middle;
				console.log(tn_top, tn_width, )

		// TODO this should be done with request animation frame since the importance is that it's smooth, not fast
		// TODO tn_top is currently taking into account the previous translatey position. It should not do that.
		$currentPage.css('transform', 'scale('+ viewport_middle - tn_top - tn_middle + ', '+viewport_middle - tn_top - tn_middle+') translate(0, '+y_adjuster+'px)');

	}

	function writeStates(page, panel){
		states.currentPage = page;
		states.currentPanel = panel
	}

	function navTo(page, panel){
		if (states.currentPage != page){
			// Load that page
			// TK page navigation and possible async headache
		}

		if (!panel){
			// Reset back to full page view here
			$('#page-'+page).css('transform', 'scale(1,1)')
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
		})
		router.on('route:panel', function(page, panel) {
			console.log('panel');
			navTo(page, panel);
		})
			
		// Start Backbone history a necessary step for bookmarkable URL's
		Backbone.history.start();

	}

	function startTheShow(){
		$.getJSON('../data/page1.json', handlePage);
	}

	startTheShow();
}).call(this);
