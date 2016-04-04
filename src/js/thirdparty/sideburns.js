function Scale(){

  function Normalizer(min, max){
    return function(val) {
      return (val - min) / (max - min);
    }
  }

  function Interpolater(min, max, clamp){
    return function(val) {
      val = min + (max - min) * val;
      return clamp ? Math.min(Math.max(val, min), max) : val;
    }
  }

  var domain = new Normalizer(0, 1);
  var range = new Interpolater(0, 1);
  var s = function(val){
    return range(domain(val));
  };
  s.domain = function(min, max){
    if (!arguments.length) return domain;
    domain = new Normalizer(min, max)
    return s
  };
  s.range = function(min, max, clamp){
    if (!arguments.length) return range;
    range = new Interpolater(min, max, clamp)
    return s
  };
  return s;

}
