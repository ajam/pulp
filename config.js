var pulpSettings = {
	whitelabel: {
		files: {
			js: ['header.js'],
			css: ['header.css', 'footer.css']
		},
		logo: '<div id="ajmint-logo"><a href="http://america.aljazeera.com"><img src="whitelabel/css/logo.png"/></a><div id="ajmint-mainmenu-trigger"><span class="ajmint-icon-down-dir"></span><div id="ajmint-logo-dropdown"><ul><a href="http://america.aljazeera.com/" target="_blank"><li>News</li></a><a href="http://america.aljazeera.com/opinions.html" target="_blank"><li>Opinion</li></a><a href="http://america.aljazeera.com/watch.html" target="_blank"><li>Video</li></a><a href="http://america.aljazeera.com/watch/shows.html" target="_blank"><li>Shows</li></a><a href="http://america.aljazeera.com/watch/schedule.html" target="_blank"><li>Schedule</li></a><a href="http://www.aljazeera.com" class="intEditions-link" target="_blank"><li>Al Jazeera English</li></a><a href="http://www.aljazeera.net/" class="intEditions-link" target="_blank"><li>Al Jazeera Arabic</li></a><a href="http://balkans.aljazeera.com" class="intEditions-link" target="_blank"><li>Al Jazeera Balkans</li></a><a href="http://mubasher.aljazeera.net/" class="intEditions-link" target="_blank"><li>Al Jazeera Mubasher</li></a><a href="http://aljazeera.com.tr" class="intEditions-link" target="_blank"><li>Al Jazeera Turk</li></a></ul></div></div></div>'
	},
	lazyLoadExtent: 6, // How many pages behind and ahead do you want to load your images
	transitionDuration: '350ms', // This value should match what's in your css, the reason it's not pulling the value from the css and you have to save it here is that on load there is no item that has this animation value. Possible TODO for the future is to add and then remove that item but for now, no need to clutter up the DOM.
	gutterWidth: 40, // Same as above, this is the `padding-left` value for `.viewing.right-page`.
	imgFormat: 'jpg', // What format are your images in
	drawerWidth: 266,
	drawerTransitionDuration: 500 // Should match stylesheet value. Possibly simplify this to take the same duration as `transitionDuration`.
}
