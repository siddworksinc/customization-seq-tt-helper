$scope = this;
$rootScope = this;

function init() {
      $scope.artifacts = {1: [], 2: []};
      $rootScope.world = 1;
      $scope.allCustomizations = cBonus.map(function(c) { return []; });
      $scope.customizationTotals = cBonus.map(function(c) { return 0; });
      $scope.ownedCustomizations = [];
      $scope.artifactCaps = {};
      $scope.critss = 0;
      $scope.zerker = 0;
      $scope.memory = 390;
      $scope.mantissa = 5;
      $scope.exponent = 200;

      $scope.totalLevels = 0;
      $scope.targetLevels = 0;
      $scope.targetStage = 0;

      for (var ak in artifactInfo) {
        var a = artifactInfo[ak];
        $scope.artifacts[a.world].push({
          name: a.name,
          id: a.id,
          level: 0
        });
        $scope.artifactCaps[a.id] = a.levelcap;
      }

      $scope.heroes = [];
      heroInfo.forEach(function(h, i) {
        $scope.heroes.push({
          name: h.name,
          id: h.id,
          weapons: 0,
          level: {
            1: 0,
            2: 0,
          },
          best: {
            1: 0,
            2: 0,
          },
        });
      });

      $scope.customizationLabels = [
        "Swords",
        "Scarves",
        "Hats",
        "Auras",
        "Armor",
        "Trails"
      ];

      $scope.customizationClass = [
        "skill-td",
        "skill-dps",
        "skill-gd",
        "skill-ad",
        "skill-cc",
      ];

      $scope.customizations = [];
      cBonus.forEach(function(c, i) {
        $scope.customizations.push({
          name: cNames[i],
          index: i,
          value: 0,
          step: (i == 4 ? 0.5 : 1), // ehhhhhhhhh
          max: customizationMax[i]
        });
      });

      customizationInfo.forEach(function(c, i) {
        var ce = c.value / c.cost;
        $scope.allCustomizations[c.type].push({
          label: c.label,
          name: c.name,
          value: c.value,
          cost: c.cost,
          ctype: c.ctype,
          type: c.type,
          coste: isNaN(ce) ? 0 : ce,
          owned: false,
          class: $scope.customizationClass[c.ctype],
        });
      });

      $scope.diamonds = 0;
      $scope.customizationsToBuy = [];
}

var getArtifacts = function() {
  return $scope.artifacts[$rootScope.world].map(function(a) {
    return [a.id, parseInt(a.level)];
  });
};

var getWeapons = function() {
  var weapons = transformScopeArray($scope.heroes.map(function (h) {
                    return {index: h.id - 1, value: h.weapons}; }));
  return weapons;
};

var transformScopeArray = function(scopeArray) {
  var newArray = newZeroes(scopeArray.length);
  for (var x in scopeArray) {
    var thing = scopeArray[x];
    newArray[thing.index] = parseFloat(thing.value);
  }
  return newArray;
};

var getLevels = function() {
  var levels = transformScopeArray($scope.heroes.map(function (h) {
                   return {index: h.id - 1, value: h.level[$rootScope.world]}; }))
  return levels;
};

var getDmgE = function(c) {
    var g = getGameState(c);
    return { gold: g.getGoldMultiplier(), tdmg: g.getTapDamage()[1] };
};

var getGameState = function(c) {
    var g =  new GameState({
                world: 1,
                artifacts: getArtifacts(),
                levels: getLevels(),
                weapons: getWeapons(),
                customizations: c,
                skillLevelCrit: $scope.critss,
                skillLevelTDMG: $scope.zerker,
                memory: $scope.memory
              });
  return g;
};

function calculateCustomizations() {
	init();

    $scope.diamonds = 0;
    $scope.customizationsToBuy = [];
    $scope.customizationTotals = cBonus.map(function(c) { return 0; });

	var custs = getQueryParam("c");
	if(custs == "Not found") {
		custs = null;
	}
    fillCustomizations(custs)

	var artifs = getQueryParam("a");
	if(artifs == "Not found") {
		artifs = null;
	}
    fillArtifactLevels(artifs)

	var heros = getQueryParam("h");
	if(heros == "Not found") {
		heros = null;
	}
    fillHeroLevels(heros)

	var wu = getQueryParam("wu");
	if(wu == "Not found") {
		wu = null;
	}
    fillHeroWeaponUpgrades(wu);

    var tempC = cBonus.map(function(c) { return []; });
      for (var type in $scope.allCustomizations) {
        $scope.allCustomizations[type].forEach(function(c, i) {
          if (!c.owned && c.ctype == CTYPE_D) {
            tempC[type].push(c);
            $scope.diamonds += c.cost;
          }
          if (c.owned) {
            $scope.customizationTotals[c.type] += c.value;
          }
        });
      }

      tempC = tempC.filter(function(l) { return l.length != 0 });

      // sort each type by raw cost efficiency
      for (var type in tempC) {
        tempC[type] = tempC[type].sort(function(c1, c2) {
          return c2.coste - c1.coste;
        });
      }

      // index-0s are now a "min-heap"
      var tempTotals = $scope.customizationTotals.slice();
      while (tempC.length > 1) {
        var baseValue = getDmgE(tempTotals);
        var max = 0;
        var maxi = -1;
        // compare options
        for (t in tempC) {
          var c = tempC[t][0];
          var newTotals = tempTotals.slice();
          newTotals[c.type] += c.value;

          var newValue = getDmgE(newTotals);

          var goldRatio = newValue.gold / baseValue.gold;
          var tdmgRatio = newValue.tdmg / baseValue.tdmg;

          var goldDmgEquivalent = Math.pow(1.044685, Math.log(goldRatio) / Math.log(1.075));
          var tdmgEquivalentRatio = goldDmgEquivalent * tdmgRatio;
          var tdmgEquivalent = baseValue.tdmg * tdmgEquivalentRatio;

          var efficiency = (tdmgEquivalent - baseValue.tdmg) / c.cost;
          if (efficiency > max) {
            max = efficiency;
            maxi = t;
          }
        }
        if (maxi == -1) {
          console.log("alskjdfljasdljfaskldf");
        }
        var bestC = tempC[maxi].shift();
        // remove type list if empty
        if (tempC[maxi].length == 0) {
          tempC.splice(maxi, 1);
        }
        tempTotals[bestC.type] += bestC.value;
        $scope.customizationsToBuy.push(bestC);
      }

	for (var i in $scope.customizationsToBuy) {
//       console.log($scope.customizationsToBuy[i]);
    }

    createTable();
	  //console.log($scope.weaponSteps);
      // $scope.recolorWeapons();

      // calculateColumns();
    };

calculateCustomizations();
	
function getQueryParam(val) {
    var result = "Not found",
        tmp = [];
    location.search
    //.replace ( "?", "" ) 
    // this is better, there might be a question mark inside
        .substr(1)
        .split("&")
        .forEach(function (item) {
        tmp = item.split("=");
        if (tmp[0] === val) result = decodeURIComponent(tmp[1]);
    });
    return result;
}

function contains(a, obj) {
    var i = a.length;
    while (i--) {
       if (a[i] === obj) {
           return true;
       }
    }
    return false;
}

function fillCustomizations(val) {
    if(val == null) {
        return
    }

    var ownedCusts = val.split(".");
    for (var type in $scope.allCustomizations) {
        $scope.allCustomizations[type].forEach(function(c, i) {
            if(contains(ownedCusts, c.label)) {
                c.owned = true;
            }
        });
    }
}

function fillHeroWeaponUpgrades(val) {
    if(val == null) {
        return
    }

    var heros = val.split(".");

    $scope.heroes.forEach(function(c, i) {
        c.weapons = getLevel(c, heros);
    });
}

function fillHeroLevels(val) {
    if(val == null) {
        return
    }

    var heros = val.split(".");

    $scope.heroes.forEach(function(c, i) {
        c.level[$scope.world] = getLevel(c, heros);
    });
}

function getLevel(artifact, artifactArray) {
        var i = artifactArray.length;
        while (i--) {
           var artifact_level = artifactArray[i];
           var al = artifact_level.split("_");

           if (al[0] == artifact.id) {
               return al[1];
           }
        }
        return 0;
}

function fillArtifactLevels(val) {
    if(val == null) {
        return
    }

    var ownedArtifacts = val.split(".");

    $scope.artifacts[$rootScope.world].forEach(function(c, i) {
        c.level = getLevel(c, ownedArtifacts);
    });
}

function createTable() {
        //body reference
        var body = document.getElementById("diamondCostTable");

        // table row creation
        var row = document.createElement("tr");

        // put <td> at end of the table row
        var cell = document.createElement("td");
        cell.style.padding = "4px 4px 4px 4px";
        var cellText = document.createTextNode("Total Diamond Cost:");
        cell.appendChild(cellText);
        row.appendChild(cell);

        cell = document.createElement("td");
        cell.style.padding = "4px 4px 4px 4px";
        cellText = document.createTextNode($scope.diamonds);
        cell.appendChild(cellText);
        row.appendChild(cell);
        body.appendChild(row);

        //body reference
        body = document.getElementById("customizationTable");

        // cells creation
        for (var j = 0; j <= $scope.customizationsToBuy.length-1; j++) {
            // table row creation
            var row = document.createElement("tr");

            // put <td> at end of the table row
            var cell = document.createElement("td");
            cell.style.padding = "4px 4px 4px 4px";
            var cellText = document.createTextNode( (j+1) + ". " + $scope.customizationLabels[$scope.customizationsToBuy[j].type]);
            cell.appendChild(cellText);
            row.appendChild(cell);

            cell = document.createElement("td");
            cell.style.padding = "4px 4px 4px 4px";
            cellText = document.createTextNode($scope.customizationsToBuy[j].name);
            cell.appendChild(cellText);
            row.appendChild(cell);

            cell = document.createElement("td");
            cell.style.padding = "4px 4px 4px 4px";
            cellText = document.createTextNode($scope.customizationsToBuy[j].cost);
            cell.appendChild(cellText);
            row.appendChild(cell);

            //row added to end of table body
            body.appendChild(row);
        }
    }
