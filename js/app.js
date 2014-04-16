(function(){
  'use strict';

  $.getJSON('../data/page1.json', handlePage);

  var panelTemplateFactory = _.template($('#panel-template').html());

  var formatHelpers = {
    calcImgPercentage: function(img_src){
      
    }
  }

  function handlePanel(page_number, panel_data){
    var panel = panelTemplateFactory(panel_data);
    $('#page-'+page_number).append(panel);
  }

  function handlePage(data){
    // Create a new page
    $('#pages').append('<div class="page" id="page-'+data.n+'"></div>');
    // Plot that pane
    for (var i = 0; i < data.p.length; i++){
      handlePanel(data.n, data.p[i])
    }
  }

  // var CONFIG = {
  //   dir: './imgs/bahrain/panels/',
  //   img_ext: '.png',
  //   panel_class: 'panel-img',
  //   sizes: {
  //     full: 720
  //   }
  // }
  // CONFIG.sizes.two_third = CONFIG.sizes.full*2/3;
  // CONFIG.sizes.half = CONFIG.sizes.full/2;
  // CONFIG.sizes.one_third = CONFIG.sizes.full*1/3;
  // CONFIG.sizes.quart = CONFIG.sizes.full/4;
  // console.log(CONFIG.sizes);
  // function getDirPngs(dir){
  //   return $.ajax({
  //     url: dir
  //   })
  // }
  //
  // function appendImgs(data){
  //   $(data).find("a:contains(" + CONFIG.img_ext + ")").each(function () {
  //     var filename = this.href.replace(window.location.host, "").replace("http:///", "");
  //     $("#panels").append($('<div class="'+CONFIG.panel_class+'"><img src=' + CONFIG.dir + filename + '></img></div>'));
  //   });
  // }
  //
  // function discernImgClassByWidth(w, widths, dims){
  //   var closest = null, ii;
  //   for (var i = 0; i < widths.length; i++){
  //     if (Math.abs(widths[i] - w) < Math.abs(closest - w)) {
  //       closest = widths[i];
  //       ii = i
  //     }
  //   }
  //   return dims[ii];
  // }
  //
  // function getFullImgDimensions($img){
  //   var $hidden_img = $img.clone().css('display', 'none').appendTo('body'),
  //       w =  $hidden_img.width(),
  //       h =  $hidden_img.height();
  //   $hidden_img.remove();
  //
  //   return {width: w, height: h}
  // }
  //
  // function classifyImgs(){
  //   var widths = _.values(CONFIG.sizes),
  //       dims   = _.keys(CONFIG.sizes);
  //
  //   $('.'+CONFIG.panel_class).each(function(i, el){
  //     var $el = $(el);
  //
  //     // If you were to get the dimensions on the existing image you would get its computed value, which is influenced by css etc
  //     // What we want is the raw image dimensions, which means we have to copy it to the DOM, measure it, and then remove it.
  //     var imgDimensions = getFullImgDimensions($el.find('img')),
  //         img_w = imgDimensions.width,
  //         img_h = imgDimensions.height;
  //
  //     var width_class_name = discernImgClassByWidth(img_w, widths, dims);
  //     $el.addClass(width_class_name + '-panel');
  //     // If it spans multiple rows, float it left. TODO, make this more dynamic
  //     if (img_h > 600) $el.addClass('left')
  //   })
  // }
  //
  // function handleImgs(data){
  //   appendImgs(data, CONFIG.img_ext);
  //   classifyImgs();
  // }
  //
  // /* Start */
  // getDirPngs(CONFIG.dir)
  //   .done(handleImgs);

}).call(this);
