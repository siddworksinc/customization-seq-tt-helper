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
      $scope.memory = 0;
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

	var sml = getQueryParam("sml");
	if(sml == "Not found") {
		sml = 0;
	}
	$scope.memory = sml*2;

    $scope.updateLevels();

//    $scope.critss   = $rootScope.state.levelCrit;
//    $scope.zerker   = $rootScope.state.levelTDMG;

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

function updateLevels() {
    $scope.totalCurrent = $scope.heroes.map(function(h) { return h.level[$rootScope.world]; }).reduce(function(a, b) { return a + b; }, 0);
};



//file:///E:/Android/Projects/ASWorkspace/MyProjects/TTHelper/WebApp/Customization%20Sequencer/index.html?
//
//c=0_0.0_14.0_2.0_3.0_6.0_1.0_4.0_5.1_0.1_9.1_1.1_3.1_2.1_11.1_8.1_4.1_5.1_6.1_10.2_0.2_3.2_1.2_2.2_4.2_8.2_16.3_0.3_901.3_902.3_903.3_904.3_905.3_906.3_907.3_19.3_3.3_4.3_30.3_26.3_1.3_13.3_5.3_15.3_20.3_14.4_0.4_1.4_2.4_3.4_4.4_7.4_8.4_9.5_0.5_1.5_2.5_3.5_5.5_4.5_8
//
//&a=8_10.9_10.6_10.7_10.19_328.4_25.5_25.17_295.2_60.3_25.18_250.15_140.16_182.13_170.14_228.11_10.12_182.10_10.28_10.29_309.24_25.25_5.26_101.27_220.20_112.21_85.22_232.23_10.39_0.62_0.63_0.61_6.33_0.34_0.37_0.38_0.35_0.36_5.67_6.66_6.65_0.69_0.50_0.51_0.52_7.42_10.43_0.45_0.46_0.49_6.40_0.1_250.54_0.56_0.55_2.58_0.57_0.59_0
//
//&h=19_0.17_0.18_0.33_0.15_0.16_0.13_0.14_0.11_0.12_0.21_0.20_0.22_0.23_0.24_0.25_0.26_0.27_0.28_0.29_0.3_464.2_528.10_0.1_613.30_0.7_0.6_0.32_0.5_0.31_0.4_0.9_0.8_0
//
//&wu=19_2.17_7.18_3.33_7.15_6.16_4.13_2.14_4.11_7.12_3.21_5.20_3.22_4.23_3.24_7.25_6.26_2.27_2.28_6.29_3.3_3.2_6.10_7.1_3.30_4.7_8.6_6.32_4.5_8.31_4.4_6.9_6.8_6
//
//&sml=852
