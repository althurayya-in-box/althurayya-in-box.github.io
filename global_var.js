// Relative display size for each place type (used to set circle marker radii)
var TYPE_SIZE = {
    "metropoles" : 5,
    "capitals"   : 4,
    "towns"      : 3,
    "villages"   : 2,
    "waystations": 1,
    "sites"      : 1,
    "xroads"     : 1,
    "waters"     : 0.5,
    "mont"       : 0.5
};

var travelGraph;          // weighted graph used by the day-travel pathfinding algorithm
var DAY          = 39702; // one day of travel in metres (~30 km)
var WITHIN_A_DAY = DAY * 3;
var NUM_ZONES    = 5;
