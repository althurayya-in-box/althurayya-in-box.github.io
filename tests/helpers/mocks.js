/**
 * Minimal mocks for the browser/library APIs used by the project source files.
 * Only the subset actually called by the functions under test is implemented.
 */

/**
 * Minimal d3 v3 mock.
 * - d3.map()           used by getNetwork / placeDistanceInZone
 * - d3.geo.length()    used by buildDijkstraGraph
 * - d3.keys()          used by createMarkerClickHandler (names panel)
 * - d3.entries()       used by createMarkerClickHandler (names panel)
 */
function createD3Mock() {
    return {
        map: function() {
            const store = new Map();
            return {
                set:     function(k, v) { store.set(String(k), v); return this; },
                get:     function(k)    { return store.get(String(k)); },
                keys:    function()    { return Array.from(store.keys()); },
                values:  function()    { return Array.from(store.values()); },
                forEach: function(fn)  { store.forEach(function(v, k) { fn(k, v); }); }
            };
        },
        geo: {
            // Returns a fixed small length in radians so buildDijkstraGraph
            // produces non-zero edge weights without real geometry.
            length: function() { return 0.01; }
        },
        keys:    function(obj) { return Object.keys(obj); },
        entries: function(obj) { return Object.keys(obj).map(k => ({ key: k, value: obj[k] })); }
    };
}

/**
 * Minimal jQuery.each mock used by getNetwork.
 * Iterates a plain object the same way jQuery does.
 */
function createJQueryEach() {
    return function each(obj, fn) {
        Object.keys(obj).forEach(function(k) { fn(k, obj[k]); });
    };
}

module.exports = { createD3Mock, createJQueryEach };
