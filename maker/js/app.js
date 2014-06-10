(function(){

	var $objects = {
		imgsContainer: $('#pages-container')
	}

	var templates = {
		pageNumber: 0,
		pageContainerFactory: _.template( $('#page-container-templ').html() )
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
						console.log(theFile)
						return function(e) {
							// Render thumbnail.
							console.log(e)
							stages.addPages.append(theFile.name, e.target.result)
						};
					})(f);

					// Read in the image file as a data URL.
					reader.readAsDataURL(f);
				}
			},
			append: function(fileName, imageData){
				templates.pageNumber++;
				// Hide things on load so we don't get a flash as the image is moved towards the center
				var img_container = templates.pageContainerFactory( { pageNumber: templates.pageNumber, fileName: fileName } );
				var $imgContainer = $( img_container ).css('visibility','hidden');
				// First add the image container to the dom
				$objects.imgsContainer.append($imgContainer);
				// Next load the image data and append it to the image container
				$('<img src="'+imageData+'"/>').load(function(){
					// This measurement will occur after the image has been appended usually
					// But will ensure we're measuring the image after the dom has actually measured it
					var loaded_img_width = $(this).width();
					$imgContainer.width(loaded_img_width).css('visibility','visible');
				}).appendTo( $imgContainer );

			}
		}
	}

	var listeners = {
		general: function(){
			// Listen for file uploading
		  document.getElementById('files').addEventListener('change', stages.addPages.load, false);
		}
	}

	var init = {
		go: function(){
			listeners.general();
		}
	}

	init.go();


}).call(this);