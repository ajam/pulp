(function(){

	var $objects = {
		pagesContainer: $('#pages-container')
	}

	var templates = {
		pageContainerFactory: _.template( $('#page-container-templ').html() )
	}

	var states = {
		createPanelDragging: false
		// panelDragging: false
	}

	// var dragging = {
	// 	lastPosition: {
	// 		x: null,
	// 		y: null
	// 	}
	// }

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
							// console.log(e)
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
		  $('#pages-container').on('mousedown', '.page-container', function(e){
		  	states.createPanelDragging = true;
		  	var $new_hotspot = $('<div class="panel create-dragging"></div>').appendTo( $(this).find('.panels') );
		  	$new_hotspot.css({
		  		top: e.pageY - $(this).offset().top,
		  		left: e.pageX - $(this).offset().left
		  	})
		  	$new_hotspot.draggable({
		  		containment: $(this)
		  	}).resizable();
		  });
		  // Listen to the drag event
		  // Used for panel creation and modification
		  $('#pages-container').on('mousemove', '.page-container', function(e){
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
		  	// if (states.panelDragging){
		  	// 	$dragging_box = $('.panel.dragging');

		  	// 	starting_x = $dragging_box.position().left;
		  	// 	starting_y = $dragging_box.position().top;

		  	// 	delta_x = e.pageX - dragging.lastPosition.x;
		  	// 	delta_y = e.pageY - dragging.lastPosition.y;
		  	// 	console.log(delta_x, delta_y)
		  	// 	$dragging_box.css({
		  	// 		top: starting_y + delta_y,
		  	// 		left: starting_x + delta_x
		  	// 	});
		  	// 	// dragging.lastPosition.x = delta_x;
		  	// 	// dragging.lastPosition.y = delta_y;

		  	// 	// console.log(delta_x, delta_y)

		  	// }
		  });
		  // Stop create panel drag state
		  $('#pages-container').on('mouseup', '.page-container', function(e){
		  	states.createPanelDragging = false;
		  	$('.panel.create-dragging').removeClass('create-dragging');
		  });

		  // Start panel dragging
		  $('#pages-container').on('mousedown', '.panel', function(e){
		  	e.stopPropagation();
		  	// dragging.lastPosition.x = e.pageX;
		  	// dragging.lastPosition.y = e.pageY;
		  	// states.panelDragging = true;
		  	// $(this).addClass('dragging');
		  });
		  // // End panel dragging
		  // $('#pages-container').on('mouseup', '.panel', function(e){
		  	// e.stopPropagation();
		  	// console.log('here')
		  	// states.panelDragging = false;
		  	// $('.panel.dragging').removeClass('dragging');
		  // });
		}
	}

	var init = {
		go: function(){
			listeners.general();
		}
	}

	init.go();


}).call(this);