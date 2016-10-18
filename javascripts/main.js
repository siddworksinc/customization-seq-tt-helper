var mapMap = function(map, f) {
  var newMap = {};
  for (var k in map) {
    newMap[k] = f(map[k]);
  }
  return newMap;
};
