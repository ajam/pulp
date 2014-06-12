(function(){

	var $objects = {
		pagesContainer: $('#pages-container')
	}

	var templates = {
		pageContainerFactory: _.template( $('#page-container-templ').html() )
	}

	var states = {
		createPanelDragging: false
	}

	var hotspots = {
		bake: function(e){
			states.createPanelDragging = true;
			var $new_hotspot = $('<div class="panel create-dragging"></div>').appendTo( $(this).find('.panels') );
			$new_hotspot.css({
				top: e.pageY - $(this).offset().top,
				left: e.pageX - $(this).offset().left
			});
			$new_hotspot.draggable({
				containment: $(this)
			}).resizable();
		},
		sizeByDrag: {
			init: function(e){
				var starting_x,
						starting_y,
						$dragging_box;

				if (states.createPanelDragging){
					$dragging_box = $('.panel.create-dragging');
					starting_x = $dragging_box.offset().left;
					starting_y = $dragging_box.offset().top;

					$dragging_box.css({
						width: e.pageX - starting_x,
						height: e.pageY - starting_y,
					});

				}
			},
			end: function(e){
		  	states.createPanelDragging = false;
		  	$('.panel.create-dragging').removeClass('create-dragging');
			}
		},
		killPropagation: function(e){
	  	e.stopPropagation();
		}
	}

	var stages = {
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
							// stages.addPages.append(theFile.name, e.target.result)
							// Append to the thumbnail drawer
							stages.addPages.append(theFile.name, e.target.result, $objects.pagesContainer)
						};
					})(f);

					// Read in the image file as a data URL.
					reader.readAsDataURL(f);
				}
			},
			append: function(fileName, imageData, target){
				// Bake the markup from the template
				var page_container = templates.pageContainerFactory( { fileName: fileName } );
				// Hide things on load so we don't get a flash as the image is moved towards the center
				var $pageContainer = $( page_container ).css('visibility','hidden');
				// First add the image container to the dom
				target.append($pageContainer);
				// Next load the image data and append it to the image container
				$('<img src="'+imageData+'"/>').load(function(){
					// This measurement will occur after the image has been appended usually
					// But will ensure we're measuring the image after the dom has actually measured it
					var loaded_img_width = $(this).width();
					$pageContainer.width(loaded_img_width).css('visibility','visible');
				}).prependTo( $pageContainer );

				this.positionPageName($pageContainer.find('.page-name'));

			},
			positionPageName: function($pageName){
				// Offset the page name to the left
				var page_name_width = $pageName.outerWidth();
				$pageName.css('left', -page_name_width + 'px');
			}
		}
	}

	var listeners = {
		general: function(){
			// Listen for file uploading
		  document.getElementById('files').addEventListener('change', stages.addPages.load, false);
		  // Listen for click events on each page-container
		  // Add the listener to the parent object, listening to its children
		  $('#pages-container').on('mousedown', '.page-container', hotspots.bake);
		  // Listen to the drag event
		  $('#pages-container').on('mousemove', '.page-container', hotspots.sizeByDrag.init);
		  // Stop create panel drag state
		  $('#pages-container').on('mouseup', '.page-container', hotspots.sizeByDrag.end);
		  // Don't add a new hotspot if we're just dragging a panel
		  $('#pages-container').on('mousedown', '.panel', hotspots.killPropagation);
		}
	}

	var init = {
		go: function(){
			listeners.general();
		}
	}

	init.go();


}).call(this);