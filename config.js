var PULP_SETTINGS = {
	"imgFormat": "jpg",
	"whitelabel": {
		"files": {
			"js": [] // A list of paths for any other javascript files to include. Example configuation `["header.js"]`. Path starts at the `whitelist` folder. You could also add these js files directly to your `index.html` file but this keeps all your configuration here.
		},
		"logo": "" // HTML for a logo. Example configuration `"<img src='imgs/assets/logo.png'/>"`. Path starts at the project root folder.
	},
	"panelZoomMode": "desktop-hover", // Default is `mobile-only`. 
																	  // Can also be: 
																	  // `desktop-hover` which will zoom to a portion of that image on hover on desktop and maintain clicking to panels on mobile. 
																	  // Set `desktopHoverZoomOptions to custom values or leave blank to go with sensible defaults;
	"desktopHoverZoomOptions": {
		"scale": 1.75, // How much you want it to zoom
		"fit": .98, // A value between 0 and 1. Defaults to 1. Set this to something around .96 if you want to cut off the edges a little bit, like in this demo. This setting is useful if you have white space around your panels
		"padding": .25 // A value between 0 and .5. Sometimes you don't want the mouse to have to reach the edge of the page to fully zoom. Setting this to something like .25 will mean you've reached the edge of the zoomed in image when you're within 25% of the page edge.
	},
	"lazyLoadExtent": 6,
	"transitionDuration": 400, // In milliseconds, how fast the panels zooms and page turns animate. This value should match what's in your css under `transition_opts` minus the `'ms'`.
	"gutterWidth": 2, // This should also match your css value, in this case `gutter_width`. This is the `padding-left` value for `.viewing.right-page`.
	"drawerTransitionDuration": 500, // In milliseconds, how fast the mobile drawer comes in and out. Should match stylesheet value for `drawer_transition_opts`. transitionDuration`.
	"social": {
		"twitter_text": "THE TEXT TO DISPLAY WHEN SOMEONE CLICKS ON THE TWEET BUTTON",
		"twitter_account": "THE RELATED TWITTER ACCOUNT.", // Example configuration `"ajam"`. Displays in tweet as `via @ajam`.
		"fb_text": "THE TEXT TO DISPLAY WHEN SOMEONE CLICKS ON THE FACEBOOK SHARE BUTTON",
		"promo_img_url": "PUBLISHED URL FOR IMAGE TO USE AS SOCIAL PROMO", // Example configuration: `"http://projects.aljazeera.com/2014/terms-of-service/imgs/promos/promo.jpg"`. TODO, this could be removed and tweet buttson grab path in og tag
		"fb_app_id": "YOUR FB APP ID" // Facebook requires that you tie these buttons to an app. Example configuration: `"892982325351256"`
	},
	"requireStartOnFirstPage": false
}
