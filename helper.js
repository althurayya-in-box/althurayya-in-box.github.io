/*
 * Build a DijksGraph from an array of GeoJSON route features.
 * Each feature contributes a bidirectional edge weighted by great-circle distance.
 */
function buildDijkstraGraph(routeFeatures) {
    var edgeMap = {};
    for (var i = 0; i < routeFeatures.length; i++) {
        var sName = routeFeatures[i].properties.sToponym;
        var eName = routeFeatures[i].properties.eToponym;
        var cost  = d3.geo.length(routeFeatures[i]) * 6371;

        if (!edgeMap[sName]) edgeMap[sName] = {};
        edgeMap[sName][eName] = cost;

        if (!edgeMap[eName]) edgeMap[eName] = {};
        edgeMap[eName][sName] = cost;
    }
    return new DijksGraph(edgeMap);
}

/*
 * Haversine-based distance between two lat/lon points.
 * Returns kilometres when unit === 'K', nautical miles when unit === 'N'.
 */
function haversineDistance(lat1, lon1, lat2, lon2, unit) {
    var r1    = Math.PI * lat1 / 180;
    var r2    = Math.PI * lat2 / 180;
    var theta = Math.PI * (lon1 - lon2) / 180;
    var dist  = Math.sin(r1) * Math.sin(r2) + Math.cos(r1) * Math.cos(r2) * Math.cos(theta);
    dist = Math.acos(dist) * 180 / Math.PI * 60 * 1.1515;
    if (unit === 'K') dist *= 1.609344;
    if (unit === 'N') dist *= 0.8684;
    return dist;
}

// ── Marker / route visual state helpers ─────────────────────────────────────

function dimAllRoutes() {
    allRouteLayers.forEach(function(layer) {
        setLineStyle(layer, layer.options.default_color, 1, 0.2);
    });
}

function dimAllMarkers() {
    Object.keys(markers).forEach(function(key) {
        setMarkerStyle(markers[key], regions[placeProperties[key].region]['color'], 0.2);
        markers[key].bringToFront();
    });
}

function restoreRoutes() {
    allRouteLayers.forEach(function(layer) {
        setLineStyle(layer, layer.options.default_color, 2, 1);
    });
}

function restoreMarkers() {
    Object.keys(markers).forEach(function(key) {
        setMarkerStyle(markers[key], regions[placeProperties[key].region]['color'], 1);
        var marker = markers[key];
        if (marker.label._container !== undefined) {
            if (placeProperties[key].type === 'metropoles')
                setLabelStyle(marker, 'black', '20px', true);
            else
                setLabelStyle(marker, 'black', '20px', false);
        }
        markers[key].bringToFront();
    });
}

function dimMap() {
    dimAllMarkers();
    dimAllRoutes();
}

function resetMapView() {
    map.setView([DEFAULT_LAT, DEFAULT_LON], MIN_ZOOM);
    restoreMarkers();
    restoreRoutes();
}

// ── Path highlighting ────────────────────────────────────────────────────────

/*
 * Colour the route segments and markers that belong to pathData (array of URIs).
 * Segments on the path are highlighted in `color`; everything else is dimmed.
 */
function highlightPathSegments(pathData, color) {
    var totalMetres = 0;
    for (var i = 0; i < pathData.length - 1; i++) {
        var layer = routeLayerIndex[pathData[i] + ',' + pathData[i + 1]]
                 || routeLayerIndex[pathData[i + 1] + ',' + pathData[i]];
        if (layer) {
            setLineStyle(layer, color, 3, 1);
            totalMetres += layer.feature.properties.Meter;
        }
    }
    Object.keys(markers).forEach(function(key) {
        if (pathData.indexOf(placeProperties[key].cornu_URI) !== -1)
            setMarkerStyle(markers[key], color, 0.8);
    });
    return totalMetres;
}

/*
 * Compute straight-line distance (in metres) between two autocomplete strings
 * of the form "name, arabic, URI".
 */
function computeDirectDistance(start, end) {
    var startUri = start.substring(start.lastIndexOf(',') + 1).trim();
    var endUri   = end.substring(end.lastIndexOf(',') + 1).trim();
    var km = haversineDistance(
        markers[startUri]._latlng.lat, markers[startUri]._latlng.lng,
        markers[endUri]._latlng.lat,   markers[endUri]._latlng.lng,
        'K');
    return parseInt(km * 1000, 10);
}
