(function(){

	var $objects = {
		pagesContainer: $('#pages-container')
	}

	var templates = {
		pageContainerFactory: _.template( $('#page-container-templ').html() ),
		hotspotFactory: _.template( $('#hotspot-templ').html() ),
		footnote: $('#footnote-templ').html()
	}

	var states = {
		createHotspotDragging: false
	}

	var data = {
		pages: []
	}

	var helpers = {
		countHotspots: function($container, $hotspot, dir){
			var hotspot_count = +$container.attr('data-hotspots');
			if (dir == 'add') {
				hotspot_count++ ;
			} else {
				hotspot_count--;
				helpers.renumberHotspots($container, $hotspot.attr('data-number'))
			}
			$container.attr('data-hotspots', hotspot_count);
		},
		renumberHotspots: function($container, destroyed_number){
			var $hotspots_higher_than_destroyed = $container.find('.hotspot').filter(function(){
				return +$(this).attr('data-number') > destroyed_number;
			});
			$hotspots_higher_than_destroyed.each(function(){
				var $hotspot = $(this);
				var hotspot_number = +$(this).attr('data-number')
				hotspot_number--;
				$hotspot.attr('data-number', hotspot_number).find('.hotspot-number').html(hotspot_number);
			})
		},
		templateFormatters: {
			extractPageNumber: function(fileName){
				return fileName.split('-')[1].split('\.')[0] // `page-1.png` => `1`
			}
		},
		cssifyValues: function(val){
			return (val*100).toFixed(2);
		}
	}

	var hotspots = {
		bake: function(e){
			var $pageContainer = $(this);
			states.createHotspotDragging = true;
			// Increment this page's hotspot number by one
			helpers.countHotspots($pageContainer, $new_hotspot, 'add');
			var hotspot_markup = templates.hotspotFactory({hotspot_number: $pageContainer.attr('data-hotspots')});
			var $new_hotspot = $(hotspot_markup).appendTo( $pageContainer.find('.hotspots') );
			$new_hotspot.css({
				top: e.pageY - $(this).offset().top,
				left: e.pageX - $(this).offset().left
			});
			$new_hotspot.draggable({
				containment: $pageContainer
			}).resizable();

		},
		sizeByDrag: {
			init: function(e){
				var starting_x,
						starting_y,
						$hotspot;

				if (states.createHotspotDragging){
					$hotspot = $('.hotspot.create-dragging');
					starting_x = $hotspot.offset().left;
					starting_y = $hotspot.offset().top;

					$hotspot.css({
						width: e.pageX - starting_x,
						height: e.pageY - starting_y,
					});

				}
			},
			end: function(e){
		  	states.createHotspotDragging = false;
		  	$('.hotspot.create-dragging').removeClass('create-dragging');
			}
		},
		destroy: function(e){
			// Kill this panel
			var $hotspot = $(this).parents('.hotspot')
			helpers.countHotspots($(this).parents('.page-container'), $hotspot, 'remove');
			$hotspot.remove();
		}
	}

	var pageInfo = {
		footnotes: {
			add: function(){
				var $footnotes_container = $(this).siblings('.footnotes-container');
				var footnote_markup = templates.footnote;
				$footnotes_container.append(footnote_markup);
			},
			destroy: function(){
				$(this).parents('.footnote-group').remove();
			}
		}
	}

	var pageActions = {
		save: function(){
			$(this).prop('disabled', true);
			var page_number = +$(this).parents('.page-container').attr('data-page-number');
			var page = pageActions.record.all(page_number);
			data.pages.push(page);
			// Call the destroy within the context of the jQuery object
			pageActions.destroy.call(this, true);
		},
		record: {
			all: function(pageNumber){
				var pageData = {};
				pageData.number = pageNumber;
				var $pageContainer = $('.page-container[data-page-number="' + pageNumber + '"]')
				pageData.hotspots = this.hotspots($pageContainer);
				pageData.text = this.text($pageContainer);
				pageData.footnotes = this.footnotes($pageContainer);
				console.log(pageData)
			},
			hotspots: function($cntnr){
				var $panelImg = $cntnr.find('.panel-img'),
						panel_width = $panelImg.width(),
						panel_height = $panelImg.height();
				var hotspots = [];
				$cntnr.find('.hotspot').each(function(){
					var $hotspot = $(this);
					var top    = helpers.cssifyValues($hotspot.position().top / panel_height),
							left   = helpers.cssifyValues($hotspot.position().left / panel_width),
							height = helpers.cssifyValues($hotspot.height() / panel_height),
							width  = helpers.cssifyValues($hotspot.width() / panel_width);

					var hotspot = 'top:'+top+'%;left:'+left+'%;width:'+width+'%;height:'+height+'%;'
					hotspots.push(hotspot);
				});
				return hotspots;
			},
			footnotes: function($cntnr){
				var footnotes = [];
				$cntnr.find('.footnote-group').each(function(){
					var $this = $(this);
					var text = $this.find('input[name="text"]').val(),
							url  = $this.find('input[name="url"]').val();
					// Don't add if text is empty
					if (text) footnotes.push([text,url]);
				});
				return footnotes;
			},
			text: function($cntnr){
				return $cntnr.find('.alt-text textarea').val();
			}
		},
		destroy: function(saved){
			$(this).parents('.page-container').remove();
			var banner_msg = 'Page deleted.'
			if (saved) banner_msg = 'Page saved!';
			// helpers.showBanner(banner_msg);
		},
		addPages: {
			load: function(evt){
				var files = evt.target.files; // FileList object
				// Loop through the FileList and render image files as thumbnails.
				for (var i = 0, f; f = files[i]; i++) {
					// Only process image files.
					if (!f.type.match('image.*')) {
						continue;
					}
					var reader = new FileReader();
					// Closure to capture the file information.
					reader.onload = (function(theFile) {
						// console.log(theFile)
						return function(e) {
							// Render thumbnail.
							// Append to the thumbnail
							// pageActions.addPages.append(theFile.name, e.target.result)
							// Append to the thumbnail drawer
							pageActions.addPages.append(theFile.name, e.target.result, $objects.pagesContainer)
						};
					})(f);
					// Read in the image file as a data URL.
					reader.readAsDataURL(f);
				}
			},
			append: function(fileName, imageData, target){
				// Bake the markup from the template
				var page_data = { fileName: fileName };
				// Add our helpers
				_.extend(page_data, helpers.templateFormatters);
				var page_container = templates.pageContainerFactory( page_data );
				// Hide things on load so we don't get a flash as the image is moved towards the center
				var $pageContainer = $( page_container ).css('visibility','hidden');
				// First add the image container to the dom
				target.append($pageContainer);
				// Next load the image data and append it to the image container
				$('<img class="panel-img" src="'+imageData+'"/>').load(function(){
					// This measurement will occur after the image has been appended usually
					// But will ensure we're measuring the image after the dom has actually measured it
					var loaded_img_width = $(this).width();
					$pageContainer.width(loaded_img_width).css('visibility','visible');
				}).prependTo( $pageContainer );

				var left_offset = this.positionElement($pageContainer.find('.page-info'), 'left');
				this.positionElement($pageContainer.find('.page-actions'), 'right');
				$pageContainer.find('.page-info textarea').css('max-width',(left_offset - 20) + 'px')

			},
			positionElement: function($el, side){
				// Offset the page name to the left
				var el_width = $el.outerWidth();
				$el.css(side, -el_width + 'px');
				return el_width;
			}
		}
	}

	var listeners = {
		general: function(){
			// Listen for file uploading
		  document.getElementById('files').addEventListener('change', pageActions.addPages.load, false);
		  $('#pages-container').on('mousedown', '.page-furniture', listeners.killPropagation);
		},
		hotspotAdding: function(){
		  // Listen for click events on each page-container
		  // Add the listener to the parent object, listening to its children
		  $('#pages-container').on('mousedown', '.page-container', hotspots.bake);
		  // Listen to the drag event
		  $('#pages-container').on('mousemove', '.page-container', hotspots.sizeByDrag.init);
		  // Stop create hotspot drag state
		  $('#pages-container').on('mouseup', '.page-container', hotspots.sizeByDrag.end);
		  // Don't add a new hotspot if we're just dragging a hotspot
		  $('#pages-container').on('mousedown', '.hotspot', listeners.killPropagation);
		  $('#pages-container').on('mousedown', '.hotspot .destroy', hotspots.destroy);
		},
		pageInfo: function(){
			$('#pages-container').on('click', '.footnotes button', pageInfo.footnotes.add);
			$('#pages-container').on('click', '.footnote-group .destroy', pageInfo.footnotes.destroy);
		},
		pageActions: function(){
			$('#pages-container').on('click', '.page-actions .save-page button', pageActions.save);
			$('#pages-container').on('click', '.page-actions .destroy button', pageActions.destroy);
		},
		killPropagation: function(e){
	  	e.stopPropagation();
		}

	}

	var init = {
		go: function(){
			listeners.general();
			listeners.hotspotAdding();
			listeners.pageInfo();
			listeners.pageActions();
		}
	}

	init.go();


}).call(this);