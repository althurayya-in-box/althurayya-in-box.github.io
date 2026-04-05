/**
 * al-Ṯurayyā In-Box
 * Based on the al-Ṯurayyā Project by Masoumeh Seydi and Maxim Romanov.
 * This version accepts user-uploaded data files instead of loading from fixed paths.
 */

var tiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
    maxZoom: 16
});
var mbAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="http://mapbox.com">Mapbox</a>',
    mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFzb3VtZWgiLCJhIjoiY2oxdnV0bDRiMDAxZTMzanN3eW02MzZhYyJ9.P6yBKy_GA4EmXkCqc7FEwQ';

L.mapbox.accessToken = 'pk.eyJ1IjoibWFzb3VtZWgiLCJhIjoiY2oxdnV0bDRiMDAxZTMzanN3eW02MzZhYyJ9.P6yBKy_GA4EmXkCqc7FEwQ';

var grayscale   = L.tileLayer(mbUrl, {id: 'mapbox.light', attribution: mbAttr}),
    streets  = L.tileLayer(mbUrl, {id: 'mapbox.streets',   attribution: mbAttr}),
    googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }),
    googleTerrain = L.tileLayer('https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }),
    watercolorlayer = new L.StamenTileLayer("watercolor");

var mbAttr2 = 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
    'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    mbUrl2 = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

var grayscalev9 = L.tileLayer(mbUrl2, {id: 'mapbox/light-v9', tileSize: 512, zoomOffset: -1, attribution: mbAttr2}),
    streetsv11  = L.tileLayer(mbUrl2, {id: 'mapbox/streets-v11', tileSize: 512, zoomOffset: -1, attribution: mbAttr2});

var min_zoom = 5,
    max_zoom = 14;
var prevZoom = min_zoom;

var regs = {};
var markers = {};
var route_layers = {};
var all_route_layers = [];
var index_routes_layers = {};
var map_region_to_code = {};
var route_points = {};
var route_features = [];
var geojson;
var auto_list = [];
var latlngs = [];
var graph_dijks;
var prevPath = [];
var init_lat = 30, init_lon = 42;
var clicked_lat, clicked_lng;
var regions;

var map = L.map('map', {maxZoom: max_zoom}).setView([init_lat, init_lon], min_zoom);
googleSat.addTo(map);

$(function() {
    $('#homeTab').tooltip();
    $('#locTab').tooltip();
    $('#sourceTab').tooltip();
    $('#regions').tooltip();
    $('#search').tooltip();
    $('#routeSection').tooltip();
});

var routeLayer = L.featureGroup();
var prev_select_reg = undefined;

map.on('click', OnMapClick);
map.on('zoomend', myzoom);

active_search("#netInput0");
active_search('#searchInput');
active_search("#stopInput0");
active_search("#stopInputDestination");

active_autocomp('#netInput0', auto_list, "#networkPane", function(){});
active_autocomp('#searchInput', auto_list, "#searchPane", function(){});
active_autocomp('#stopInput0', auto_list, "#pathFindingPane", keepLastStops);
active_autocomp('#stopInputDestination', auto_list, "#pathFindingPane", keepLastStops);

/*
 * Read a File object and parse its contents as JSON, then invoke callback(parsedData).
 */
function readJSONFile(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = JSON.parse(e.target.result);
            callback(null, data);
        } catch (err) {
            callback(new Error('Failed to parse ' + file.name + ': ' + err.message), null);
        }
    };
    reader.onerror = function() {
        callback(new Error('Failed to read ' + file.name), null);
    };
    reader.readAsText(file);
}

/*
 * Load the bundled default dataset from the default_data/ folder.
 */
function loadDefaultData() {
    var statusEl = document.getElementById('upload-status');
    statusEl.textContent = 'Loading default data\u2026';
    document.getElementById('loadDataBtn').disabled = true;
    document.getElementById('loadDefaultBtn').disabled = true;

    var files = {
        regions: 'default_data/regions.json',
        places:  'default_data/places_new_structure.geojson',
        routes:  'default_data/routes.json'
    };

    var loaded = {};
    var errors = [];
    var keys = Object.keys(files);
    var remaining = keys.length;

    keys.forEach(function(name) {
        fetch(files[name])
            .then(function(res) {
                if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + files[name]);
                return res.json();
            })
            .then(function(data) {
                loaded[name] = data;
            })
            .catch(function(err) {
                errors.push(err.message);
            })
            .then(function() {
                remaining--;
                if (remaining > 0) return;
                if (errors.length > 0) {
                    statusEl.textContent = 'Error: ' + errors.join('; ');
                    document.getElementById('loadDataBtn').disabled = false;
                    document.getElementById('loadDefaultBtn').disabled = false;
                    return;
                }
                statusEl.textContent = 'Initialising map\u2026';
                resetMapState();
                document.getElementById('upload-overlay').style.display = 'none';
                initMap(loaded.regions, loaded.places, loaded.routes);
            });
    });
}

/*
 * Show the upload overlay (e.g. when user wants to load new data).
 */
function showUploadOverlay() {
    document.getElementById('upload-overlay').style.display = 'flex';
    document.getElementById('upload-status').textContent = '';
}

/*
 * Called when the user clicks "Load Data" on the upload panel.
 * Reads all three uploaded files and initialises the map.
 */
function loadUploadedData() {
    var placesFile  = document.getElementById('placesFile').files[0];
    var routesFile  = document.getElementById('routesFile').files[0];
    var regionsFile = document.getElementById('regionsFile').files[0];

    var missing = [];
    if (!placesFile)  missing.push('Places');
    if (!routesFile)  missing.push('Routes');
    if (!regionsFile) missing.push('Regions');

    if (missing.length > 0) {
        document.getElementById('upload-status').textContent =
            'Please select the following files: ' + missing.join(', ') + '.';
        return;
    }

    var statusEl = document.getElementById('upload-status');
    statusEl.textContent = 'Reading files\u2026';
    document.getElementById('loadDataBtn').disabled = true;
    document.getElementById('loadDefaultBtn').disabled = true;

    var loaded = {};
    var errors = [];

    function onFileRead(name, err, data) {
        if (err) {
            errors.push(err.message);
        } else {
            loaded[name] = data;
        }
        if (Object.keys(loaded).length + errors.length === 3) {
            if (errors.length > 0) {
                statusEl.textContent = 'Error: ' + errors.join('; ');
                document.getElementById('loadDataBtn').disabled = false;
                document.getElementById('loadDefaultBtn').disabled = false;
                return;
            }
            statusEl.textContent = 'Initialising map…';
            // Reset state before (re-)initialising in case data was already loaded.
            resetMapState();
            document.getElementById('upload-overlay').style.display = 'none';
            initMap(loaded.regions, loaded.places, loaded.routes);
        }
    }

    readJSONFile(regionsFile, function(err, data) { onFileRead('regions', err, data); });
    readJSONFile(placesFile,  function(err, data) { onFileRead('places',  err, data); });
    readJSONFile(routesFile,  function(err, data) { onFileRead('routes',  err, data); });
}

/*
 * Clear all previously loaded map data so that initMap() can be called again
 * when the user uploads a new dataset.
 */
function resetMapState() {
    // Remove existing geojson layer
    if (geojson) {
        map.removeLayer(geojson);
        geojson = null;
    }
    // Remove existing route layer
    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = L.featureGroup();
    }
    // Clear all data structures
    regs = {};
    markers = {};
    route_layers = {};
    all_route_layers = [];
    index_routes_layers = {};
    map_region_to_code = {};
    route_points = {};
    route_features = [];
    auto_list = [];
    latlngs = [];
    graph_dijks = null;
    prevPath = [];
    regions = null;

    // Clear the region list in the sidebar (keep the "All" entry)
    $("#regionDiv").html('<li id="All" class="region_ul" onclick="click_region(\'All\')">All</li>');
}

/*
 * Initialise the map with the three data objects.
 * This is the core logic extracted from the original nested $.getJSON callbacks.
 */
function initMap(regionsData, placesData, routesData) {
    regions = regionsData;

    geojson = L.geoJson(placesData, {
        pointToLayer: function (feature, latlng) {
            if (regs[feature.properties.althurayyaData.region_URI] == undefined)
                regs[feature.properties.althurayyaData.region_URI] = [];
            regs[feature.properties.althurayyaData.region_URI]
                .push(feature.properties.althurayyaData.URI);

            var marker = create_marker(feature, latlng);
            latlngs.push([latlng['lat'], latlng['lng']]);
            auto_list.push(
                [feature.properties.althurayyaData.names.eng.search,
                    feature.properties.althurayyaData.names.ara.common,
                    feature.properties.althurayyaData.URI
                ].join(", "));

            marker.on('click', OnMarkerClick(feature));

            if (marker != null) {
                return marker;
            }
        }
    });

    geojson.addTo(map);

    // Rebuild autocomplete lists with the new data
    active_autocomp('#netInput0', auto_list, "#networkPane", function(){});
    active_autocomp('#searchInput', auto_list, "#searchPane", function(){});
    active_autocomp('#stopInput0', auto_list, "#pathFindingPane", keepLastStops);
    active_autocomp('#stopInputDestination', auto_list, "#pathFindingPane", keepLastStops);

    // Sort regions alphabetically and add to the Regions tab
    Object.keys(regs).sort(function (a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    }).forEach(function (key) {
        if (key !== "NoRegion") {
            var func = "click_region(\"" + key + "\");";
            $("#regionDiv").append("<li id=\'" + key + "\' class='region_ul' onclick=\'" + func + "\';>"
                + regions[key]['display'] + "</li>");
        }
    });

    var cities = new L.LayerGroup();
    Object.keys(markers).forEach(function(key) {
        markers[key].addTo(cities);
        if (marker_properties[key].type == "metropoles") {
            markers[key].setLabelNoHide(true);
            markers[key].bringToFront();
        }
    });

    var baseLayers = {
        "Grayscale": grayscalev9,
        "National Geographic": tiles,
        "Google Satellite": googleSat,
        "Google Terrain": googleTerrain,
        "Water Color": watercolorlayer
    };
    var overlays = {
        "Places": cities
    };
    L.control.layers(baseLayers, overlays).addTo(map);
    var sidebar = L.control.sidebar('sidebar').addTo(map);

    index_zoom(markers, type_size);

    var routes = L.geoJson(routesData, {
        onEachFeature: handle_routes
    });
    init_graph(route_features);
    graph_dijks = createMatrix(route_features);
    var rl = routeLayer.addLayer(routes);
    rl.addTo(map);
    rl.bringToBack();

    Object.keys(route_points).forEach(function(rp) {
        for (var i = 0; i < route_points[rp].length - 1; i++) {
            for (var j = 1; j < route_points[rp].length; j++) {
                if (route_points[rp][i]["end"] == route_points[rp][j]["end"]) {
                    customLineStyle(route_points[rp][i]["route"], regions[route_points[rp][i]["end"]]['color'], 2, 1);
                    customLineStyle(route_points[rp][j]["route"], regions[route_points[rp][i]["end"]]['color'], 2, 1);
                }
            }
        }
    });
}

/*
 * Set a color for an object excluded from a list
 */
function setColor(code, toExclude) {
    if (toExclude.indexOf(code) == -1)
        return regions[code]['color'];
    else return "lightgray";
}

/*
 * Click on map
 */
function OnMapClick(e) {
    $("#sidebar-pane").removeClass('active');
    $(".sidebar-tabs > li").removeClass('active');
    $("#sidebar").addClass('collapsed');
    clicked_lat = e.latlng.lat;
    clicked_lng = e.latlng.lng;
}

/*
 * Highlights and changes the color of markers and routes of a region by clicking on a
 * region name.
 */
function click_region(reg) {
    document.getElementById(reg).style.color = 'red';
    if (prev_select_reg != undefined)
        document.getElementById(prev_select_reg).style.color = 'gray';
    prev_select_reg = reg;
    if (reg == "All") {
        map.panTo([30, 42]);
        Object.keys(marker_properties).forEach(function(key) {
            markers[key].setStyle({
                fillColor: regions[marker_properties[key].region]['color'],
                fillOpacity: "1",
            });
        });
        Object.keys(route_layers).forEach(function(key) {
            route_layers[key].forEach(function (lay) {
                customLineStyle(lay, regions[key]['color'], 2, 1);
            });
        });
    } else {
        var tmp = regs[reg];
        Object.keys(markers).forEach(function (key) {
            if (tmp.indexOf(key) == -1) {
                markers[key].setStyle({
                    fillColor: "gray",
                    color: "gray"
                });
                markers[key].options.zIndexOffset = -1000;
            } else {
                markers[key].setStyle({
                    fillColor: "red",
                    color: "red"
                });
                markers[key].options.zIndexOffset = 1000;
            }
        });
        all_route_layers.forEach(function(lay) {
            customLineStyle(lay, "gray", 2, 0.8);
        });
        if (route_layers[reg] != undefined) {
            route_layers[reg].forEach(function (lay) {
                customLineStyle(lay, 'red', 3, 1);
            });
        }
        map.panTo(markers[regions[reg]['visual_center']].getLatLng());
    }
}

function click_on_list(id) {
    $('#' + id + "text").children().toggle();
    $('#' + id + "ref").toggle();
}

function findPathConsideringIntermediates(start, end, stopInputsId) {
    var selections = selectedTypes('itinerary-options');
    $("#dist_div").html("");
    $("#path_dist_header").css("display", "none");
    repaintMarkers();
    repaintPaths();
    var itinerary = makeItinerary(start, end, stopInputsId);
    var distances = findItinerary(itinerary, selections);
    var short_distance = distances[0];
    var day_distance = distances[1];
    var int_direct_dist = calcDirectDistance(itinerary[0], itinerary[itinerary.length - 1]);
    $("#path_dist_header").css("display", "block");
    displayDistance($("#dist_div"), int_direct_dist, int_direct_dist, "Direct");
    if (selections.indexOf(itin_opts[0]) != -1) {
        displayDistance($("#dist_div"), short_distance, int_direct_dist, itin_opts[0]);
    }
    if (selections.indexOf(itin_opts[1]) != -1) {
        displayDistance($("#dist_div"), day_distance, int_direct_dist, itin_opts[1]);
    }
}

function makeItinerary(source, target, stopInputsId) {
    var stops = [];
    stops.push(source);
    $('Input[id^=' + stopInputsId + ']').each(function() {
        var stopInputValue = $(this).val();
        if (stopInputValue.indexOf(",") != -1) {
            stops.push(stopInputValue);
        }
    });
    stops.push(target);
    return stops;
}

function findItinerary(stops, selections) {
    var short_distance = 0, day_distance = 0;
    var s, t;
    for (var i = 0; i < stops.length - 1; i++) {
        s = stops[i];
        t = stops[i + 1];
        if (selections.indexOf(itin_opts[0]) != -1) {
            var short_path = findPath(s, t, itin_opts[0]);
            short_distance += displayPathControl(short_path, "red");
        }
        if (selections.indexOf(itin_opts[1]) != -1) {
            var day_path = findPath(s, t, itin_opts[1]);
            day_distance += displayPathControl(day_path, "green");
        }
    }
    return [short_distance, day_distance];
}

function findPath(start, end, pathType) {
    var shortPath, dayPath;
    if (start == null || end == null) return;
    var startUri = start.substring(start.lastIndexOf(",") + 1).trim();
    var endUri = end.substring(end.lastIndexOf(",") + 1).trim();
    if (pathType == itin_opts[0]) {
        shortPath = graph_dijks.findShortestPath(startUri, endUri);
        if (shortPath != null)
            return shortPath;
    }
    if (pathType == itin_opts[1]) {
        dayPath = shortestPath(graph.getNode(startUri), graph.getNode(endUri), 'd');
        if (dayPath != null)
            return dayPath;
    }
}

function displayDistance(container, dist, direct_dist, textValue) {
    var tmpTextValue = textValue.replace(/ /g, "_").toLowerCase();
    var avg_dist = (dist == 0) ? direct_dist : (dist + direct_dist) / 2;
    var elem_km = "<p id='" + tmpTextValue + "'>" + textValue + " distance: <a style='font-weight:bold;'>"
        + parseInt((dist / DAY).toFixed()).toLocaleString('en') +
        " </a> days of travel, <a style='font-weight:bold;'>" +
        parseInt((dist / 1000).toFixed()).toLocaleString('en') + "</a> km</p>";
    container.append(elem_km);
    if (textValue != "Direct") {
        var avg_elem = "<p style='padding-left:10px;' id='avg_" + tmpTextValue + "'>Average " + textValue.toLowerCase()
            + " distance: <a style='font-weight:bold;'>" + parseInt((dist / DAY).toFixed()).toLocaleString('en') +
            " </a> days of travel, <a style='font-weight:bold;'>"
            + parseInt((avg_dist / 1000).toFixed()).toLocaleString('en') + "</a> km</p>";
        container.append(avg_elem);
    }
}

function findNetwork() {
    repaintMap();
    var map_zone_all_sites = {};
    $('Input[id^="netInput"]').each(function() {
        var start = $(this).val().split(',');
        var sourceID = start[start.length - 1].trim();
        var s = graph.getNode(sourceID);
        var distances = shortestPath(s, s, 'n');
        var multiplier = $("#multiSelect").val();
        var network = getNetwork(distances, multiplier);
        Object.keys(network).forEach(function(zone) {
            var zone_trim = zone.replace(/\D/g, '').trim();
            network[zone].forEach(function(uri) {
                if (map_zone_all_sites[uri] == undefined)
                    map_zone_all_sites[uri] = zone_trim;
                else
                    map_zone_all_sites[uri] = Math.min(map_zone_all_sites[uri], zone_trim);
            });
        });
    });

    var color = d3.scale.linear()
        .domain([1, 2, 3, 4, 5])
        .range(["#E84946", "#FF9500", "#FFD62E", "#6CA376", "gray"]);

    if ($('#unreachable_checkbox').is(':checked')) {
        Object.keys(markers).forEach(function (key) {
            customMarkerStyle(markers[key], "black", 1);
        });
    }
    Object.keys(map_zone_all_sites).forEach(function (uri) {
        customMarkerStyle(markers[uri], color(map_zone_all_sites[uri]), 1);
    });
    Object.keys(index_routes_layers).forEach(function (r) {
        var s = r.split(",")[0];
        var e = r.split(",")[1];
        if (map_zone_all_sites[s] == 1 &&
            map_zone_all_sites[e] == 1)
            customLineStyle(index_routes_layers[r], "red", 3, 1);
    });
}
