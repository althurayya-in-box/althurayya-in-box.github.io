function createMatrix(postdata) {
    var edgeMap = {};
    var nodeHash = {};
    for (var i = 0; i < postdata.length; i++) {
        var line = postdata[i].geometry.coordinates;
        var sName = postdata[i].properties.sToponym;
        var eName = postdata[i].properties.eToponym;
        var cost = d3.geo.length(postdata[i]) * 6371;
        if (edgeMap[sName]) {
            edgeMap[sName][eName] = cost;
        } else {
            edgeMap[sName] = {};
            edgeMap[sName][eName] = cost;
        }
        if (edgeMap[eName]) {
            edgeMap[eName][sName] = cost;
        } else {
            edgeMap[eName] = {};
            edgeMap[eName][sName] = cost;
        }
    }
    return new DijksGraph(edgeMap);
}

function displayPath(pathData) {
    all_route_layers.forEach(function(lay) {
        if (pathData.indexOf(lay.feature.properties.sToponym) !== -1
                && pathData.indexOf(lay.feature.properties.eToponym) !== -1) {
            customLineStyle(lay, "red", 3, 1);
        } else {
            customLineStyle(lay, lay.options.default_color, 1, 0.2);
        }
    });
    Object.keys(markers).forEach(function(keys) {
        if (pathData.indexOf(marker_properties[keys].cornu_URI) !== -1)
            customMarkerStyle(markers[keys], "red", 0.8);
        else
            customMarkerStyle(markers[keys], regions[marker_properties[keys].region]['color'], 0.2);
    });
}

// Calculate distance. For results in metres, use unit 'K'.
function distance(lat1, lon1, lat2, lon2, unit) {
    var radlat1 = Math.PI * lat1 / 180;
    var radlat2 = Math.PI * lat2 / 180;
    var theta = lon1 - lon2;
    var radtheta = Math.PI * theta / 180;
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit === "K") {
        dist = dist * 1.609344;
    }
    if (unit === "N") {
        dist = dist * 0.8684;
    }
    return dist;
}

function repaintPaths() {
    all_route_layers.forEach(function(lay) {
        customLineStyle(lay, lay.options.default_color, 1, 0.2);
    });
}

function repaintMarkers() {
    Object.keys(markers).forEach(function(keys) {
        customMarkerStyle(markers[keys], regions[marker_properties[keys].region]['color'], 0.2);
        markers[keys].bringToFront();
    });
}

function resetPaths() {
    all_route_layers.forEach(function(lay) {
        customLineStyle(lay, lay.options.default_color, 2, 1);
    });
}

function resetMarkers() {
    Object.keys(markers).forEach(function(keys) {
        customMarkerStyle(markers[keys], regions[marker_properties[keys].region]['color'], 1);
        var marker = markers[keys];
        if (marker.label._container !== undefined) {
            if (marker_properties[keys].type === "metropoles")
                customLabelStyle(markers[keys], "black", "20px", true);
            else
                customLabelStyle(markers[keys], "black", "20px", false);
        }
        markers[keys].bringToFront();
    });
}

function displayPathControl(pathData, color) {
    var path_distances = 0;
    for (var i = 0; i < pathData.length - 1; i++) {
        var lay = index_routes_layers[pathData[i] + "," + pathData[i + 1]];
        if (lay === undefined) {
            lay = index_routes_layers[pathData[i + 1] + "," + pathData[i]];
        }
        if (lay !== undefined) {
            customLineStyle(lay, color, 3, 1);
            path_distances += lay.feature.properties.Meter;
        }
    }
    Object.keys(markers).forEach(function(keys) {
        if (pathData.indexOf(marker_properties[keys].cornu_URI) !== -1)
            customMarkerStyle(markers[keys], color, 0.8);
    });
    return path_distances;
}

// Calculate the direct distance from start to end
function calcDirectDistance(start, end) {
    var startUri = start.substring(start.lastIndexOf(",") + 1).trim();
    var endUri = end.substring(end.lastIndexOf(",") + 1).trim();
    var direct_distance = distance(
        markers[startUri]['_latlng']['lat'], markers[startUri]['_latlng']['lng'],
        markers[endUri]['_latlng']['lat'], markers[endUri]['_latlng']['lng'], 'K');
    return parseInt(direct_distance * 1000, 10);
}

function resetMap() {
    map.setView([init_lat, init_lon], min_zoom);
    resetMarkers();
    resetPaths();
}

function repaintMap() {
    repaintMarkers();
    repaintPaths();
}
