Pulp
===

An open-source viewer for displaying comics online, developed for the  story [Terms of Service](http://projects.aljazeera.com/2014/terms-of-service). Layout your pages with [Pulp press](https://github.com/ajam/pulp-press) and place the resulting the `pages.json` file the `data/` folder. For more detailed instructions. Read below.

#### [Live demo](http://ajam.github.io/pulp)

#### Double view
![](https://raw.githubusercontent.com/ajam/pulp/master/demo-assets/double-view.gif)

#### Single view
![](https://raw.githubusercontent.com/ajam/pulp/master/demo-assets/single-view.gif)

#### Mobile view (panel by panel swiping, tap to zoom)
![](https://raw.githubusercontent.com/ajam/pulp/master/demo-assets/mobile-view-simulator.gif)

#### Mobile drawer
![](https://raw.githubusercontent.com/ajam/pulp/master/demo-assets/drawer.gif)

### Requirements / assumptions

* You have one image for every page in your comic and each page is made up of panels.
* You have a cover image that should be displayed on its own page.

### Features

* Mobile responsive.
	* On large screens, you'll see a two-page spread.
	* On medium-width screens, you'll see a single page
	* On mobile screens (or any browser width that's smaller than the normal image width) Pulp will navigate panel by panel
* Swipe-able on mobile.
* Fullscreen mode.
* Endnotes for including hyperlinks.
* Configurable share buttons
* The final page in the comic takes arbitrary text so you can link out or otherwise give instructions for readers to do when they're done.
* Configurable logo for whitelabeling. 
* Tested on
	* Chrome 38
	* Safari 7.1
	* Firefox 32
	* iPhone 4
	* iPhone 5c
	* iPhone 6
	* iPad Retina
	* iPad 2
	* iPad Air
	* Samsung Nexus
	* Android - Samsung HTC One
	* Android - Moto X

### Getting started

Getting up and running takes three steps

1. Download this repository, either click "Download Zip" on the right or `git clone https://github.com/ajam/pulp`.
2. Place your images in the `imgs/pages/` folder — they can be any format, e.g. `.jpg`, `.png`, `.gif` etc.
3. A `pages.json` file that defines the coordinates of your panels on the page — more on this next. Place this file in the `data/` folder.

To define your panel regions, we've made a companion interface called [Pulp Press](https://ajam.github.io/pulp-press). It has its own [instructions page](http://github.com/ajam/pulp-press) but it's fairly simple to use.

1. Upload your images
2. Click and drag to define the order of your panels
3. Save the page
4. When you've saved drawn all your panels on all your pages, click "Download data" and that will give you a nice `pages.json` file which you can place in the Pulp `data/` folder.

Pulp Press has a few other options such as specifying endnotes or alt text for each page image, which can be nice for including the script. "Page text" is abitrary paragraph text you might want to overlay on the page. This text will appear on any page but if you want this text to be clickable, that will only work on the last page. We used this feature to include hyperlinks on the last page of the comic so readers could have a place to go once they've finished.

#### Comments

Beacuse comments aren't built into the interface, we've included an icon in the header that link to a page that hosts your comments. It's a simple anchor tag so you can add an external link to a comments page. Or, if you don't have comments, you can delete that toolbar button.

#### Feeling at ease

The CSS animations and transitions use a custom ease `cubic-bezier(0,0,.2,1)` which is a slightly modified `easeOutQuint`, so it's faster at the beginning than it is toward the end. This movement makes the animations feel snappier and more reactive when the user initiates an action, such as opening the side drawer, for instance.

### Extra configuration

Pulp also has a few options that it lets you change, if you so wish. They are all in the `config.js` file. Here's what a sample configuruation looks like with an explanation of what the values do. For the most part, you won't have to change any of the animation timings


````js
{
	"imgFormat": "jpg", // What format are your images in?
	"whitelabel": {
		"files": {
			"js": ["header.js"] // If you have any additional javascripts, you can load them through here. You can also load them normally through
		},
		"logo": "<img src='imgs/assets/logo.png'></img>" // Do you want to include an image in the top left?
	},
	"lazyLoadExtent": 6, // How many pages behind and ahead do you want to load your images
	"transitionDuration": "400ms", // This value should match what's in your css under `transition_opts`.
	"gutterWidth": 2, // This should also match your css value, in this case `gutter_width`. This is the `padding-left` value for `.viewing.right-page`.
	"drawerTransitionDuration": 500, // In milliseconds. Should match stylesheet value for `drawer_transition_opts`. transitionDuration`.
	"social": {
		"twitter_text": "Read this comic, it's great!", // The text to display when someone clicks on the Tweet button
		"twitter_account": "myhandle", // This will display in a tweet as `via @myhandle`.
		"fb_text": "A new web comic about etc etc topics topics.", // The text to display when someone clicks on the Facebook button
		"promo_img_url": "http://www.website.com/comic-project/imgs/promo.jpg", // The full path of the image to display in the FB share or Tweet button
		"fb_app_id": "892982325351256" // Facebook requires that you tie these buttons to an app. You have to create an app through the FB dev interface and your app will have the id.
	}
}

````

You might also want to include some `<noscript>` for people who have JavaScript disabled, such as:

````
<noscript>
	<p>It appears you have JavaScript disabled.</p>
	<p>View the PDF version: <a href="link/to/comic.pdf">link/to/comic.pdf</a></p>
</div>
</noscript>

````

One improvement that can be made is these transition times also have to be changed in the Stylus CSS, `css/styles.styl`. The CSS is written using a preprocessor called Stylus with an add-on called Nib. Nib greatly simplifies writing animations as it writes all the CSS vendor prefixes for you.

To have your changes reflected, you then recompile the CSS, which isn't as hard as it sounds. To do that, first make sure you have [NodeJS](http://nodejs.org) installed and then run these two commands to install Stylus and Nib. You may have to enter your administrator password.

````bash
sudo npm install -g stylus
sudo npm install -g nib
````

Then, a useful command to have Stylus watch your `.styl` files for changes and automatically recompile the CSS is the following. Execute this command from within the root Pulp folder:

````bash
stylus -u nib -w css
````

This command tells it to use Nib and watch the folder `css`. 

One improvement would be to not have to make these changes twice (once in `config.js` and once in `styles.styl`). The solution is to create a larger build process, which has its own issues. Since these values should work for most people, however, hopefully you wont' have to change it so much.

### LICENSE

MIT
