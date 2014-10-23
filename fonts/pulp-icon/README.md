Pulp icon
===

Pulp icon was created with <fontello.com>'s icon font tool. It includes the following fonts at the default size of 16px (use the slider at the top of the page to set the base size).

##### Font Awesome

* download-cloud
* menu
* resize-full
* twitter
* facebook
* reddit
* gplus
* angle-left
* angle-right
* chat

##### Entypo 

* dot-3
* share

## Changing icons

To change the icons, replace the existing pulp-icon set (unless you want to load a second font icon package) to the package. Go to <fontello.com> and set the size to 16px if it isn't already, set the icon name to `pulp-icon`. Click on the wrench and set the icon prefix to `pulp-icon-`.

To do that, replace the files in this folder from your fontello zip file and place `pulp-icon.css` in the `css/thirdparty` directory. Make sure the change the `@font-face` `src` path in that css file to point to your font files. Namely, you'll need to `../`, change `font` to `fonts` and `pulp-icon` to the path. 

This should do the trick:

````css
@font-face {
  font-family: 'pulp-icon';
  src: url('../../fonts/pulp-icon/pulp-icon.eot?50995852');
  src: url('../../fonts/pulp-icon/pulp-icon.eot?50995852#iefix') format('embedded-opentype'),
       url('../../fonts/pulp-icon/pulp-icon.woff?50995852') format('woff'),
       url('../../fonts/pulp-icon/pulp-icon.ttf?50995852') format('truetype'),
       url('../../fonts/pulp-icon/pulp-icon.svg?50995852#pulp-icon') format('svg');
  font-weight: normal;
  font-style: normal;

````