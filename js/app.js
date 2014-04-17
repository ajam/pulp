(function(){
  'use strict';

  var CONFIG = {
    full_width: 570
  }

  $.getJSON('../data/page1.json', handlePage);

  var panelTemplateFactory = _.template($('#panel-template').html());

  var formatHelpers = {
    calcImgPercentage: function(img_src){
      var w = Number(img_src.split('-')[1]);
      var perc = Math.floor(w / CONFIG.full_width * 100);
      return perc
    }
  }

  function handlePanel(page_number, panel_data){
    _.extend(panel_data, formatHelpers)
    var $panel = $(panelTemplateFactory(panel_data));
    // Plot panel
    $panel.appendTo($('#page-'+page_number));
    // Position panel texts
    // $panel.

  }

  function handlePage(data){
    // Create a new page
    $('#pages').append('<div class="page" id="page-'+data.n+'"></div>');
    // Plot that pane
    for (var i = 0; i < data.p.length; i++){
      handlePanel(data.n, data.p[i])
    }
  }

}).call(this);
