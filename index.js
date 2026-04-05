/**
 * al-Ṯurayyā In-Box
 * Based on the al-Ṯurayyā Project by Masoumeh Seydi and Maxim Romanov.
 * This version accepts user-uploaded data files instead of loading from fixed paths.
 */

// ── Tile layer definitions ───────────────────────────────────────────────────

var natGeoTiles = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC', maxZoom: 16 }
);

var mbAttr = 'Map data &copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors, '
           + '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, '
           + 'Imagery &copy; <a href="https://mapbox.com">Mapbox</a>';
var mbUrlV4 = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFzb3VtZWgiLCJhIjoiY2oxdnV0bDRiMDAxZTMzanN3eW02MzZhYyJ9.P6yBKy_GA4EmXkCqc7FEwQ';

L.mapbox.accessToken = 'pk.eyJ1IjoibWFzb3VtZWgiLCJhIjoiY2oxdnV0bDRiMDAxZTMzanN3eW02MzZhYyJ9.P6yBKy_GA4EmXkCqc7FEwQ';

var googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});
var googleTerrain = L.tileLayer('https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
    maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});
var waterColorLayer = new L.StamenTileLayer('watercolor');

var mbAttr2 = 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, '
            + 'Imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>';
var mbUrlV9 = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

var grayscaleLayer = L.tileLayer(mbUrlV9, { id: 'mapbox/light-v9',   tileSize: 512, zoomOffset: -1, attribution: mbAttr2 });
var streetsLayer   = L.tileLayer(mbUrlV9, { id: 'mapbox/streets-v11', tileSize: 512, zoomOffset: -1, attribution: mbAttr2 });

// ── Map initialisation ───────────────────────────────────────────────────────

var MIN_ZOOM     = 5;
var MAX_ZOOM     = 14;
var DEFAULT_LAT  = 30;
var DEFAULT_LON  = 42;
var previousZoom = MIN_ZOOM;

var map = L.map('map', { maxZoom: MAX_ZOOM }).setView([DEFAULT_LAT, DEFAULT_LON], MIN_ZOOM);
googleSat.addTo(map);

// ── Application state ────────────────────────────────────────────────────────

var regionPlaces      = {}; // region URI → [place URIs]
var markers           = {}; // place URI  → Leaflet CircleMarker
var routeLayersByRegion = {}; // region URI → [route layers]
var allRouteLayers    = [];
var routeLayerIndex   = {}; // "start,end" → route layer
var regionNameToCode  = {};
var crossRegionPoints = {}; // route-point URI → [{route, end}]
var routeFeatures     = [];
var autocompleteList  = [];
var dijkstraGraph;
var regions;
var geojson;
var routeLayer     = L.featureGroup();
var activeRegion;
var clicked_lat, clicked_lng; // last map-click coordinates (used by coordAssign)

// ── Sidebar tooltips ─────────────────────────────────────────────────────────

$(function() {
    $('#homeTab, #locTab, #sourceTab, #regions, #search, #routeSection').tooltip();
});

// ── Map event bindings ───────────────────────────────────────────────────────

map.on('click',   onMapClick);
map.on('zoomend', onZoomChange);

// ── Initial search / autocomplete bindings (before data loads) ───────────────

bindSearchInput('#netInput0');
bindSearchInput('#searchInput');
bindSearchInput('#stopInput0');
bindSearchInput('#stopInputDestination');

bindAutocomplete('#netInput0',           autocompleteList, '#networkPane',     function() {});
bindAutocomplete('#searchInput',         autocompleteList, '#searchPane',      function() {});
bindAutocomplete('#stopInput0',          autocompleteList, '#pathFindingPane', highlightSelectedWaypoints);
bindAutocomplete('#stopInputDestination',autocompleteList, '#pathFindingPane', highlightSelectedWaypoints);

// ── File loading ─────────────────────────────────────────────────────────────

/*
 * Read a File object, parse it as JSON, and call callback(err, data).
 */
function parseJSONFile(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            callback(null, JSON.parse(e.target.result));
        } catch (err) {
            callback(new Error('Failed to parse ' + file.name + ': ' + err.message), null);
        }
    };
    reader.onerror = function() {
        callback(new Error('Failed to read ' + file.name), null);
    };
    reader.readAsText(file);
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

/*
 * Fetch a URL and parse it as JSON. Rejects on non-2xx status.
 */
function fetchRequired(url) {
    return fetch(url).then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' loading ' + url);
        return res.json();
    });
}

/*
 * Fetch a URL and parse it as JSON. Returns null instead of rejecting on
 * network errors or non-2xx responses — used for optional files.
 */
function fetchOptional(url) {
    return fetch(url)
        .then(function(res) { return res.ok ? res.json() : null; })
        .catch(function()   { return null; });
}

// ── File loading ──────────────────────────────────────────────────────────────

/*
 * Fetch and apply the bundled default dataset from default_data/.
 * Places is required; routes and regions are loaded if present.
 */
function loadDefaultFiles() {
    var statusEl = document.getElementById('upload-status');
    statusEl.textContent = 'Loading default data\u2026';
    setUploadButtonsDisabled(true);

    Promise.all([
        fetchRequired('default_data/places_new_structure.geojson'),
        fetchOptional('default_data/routes.json'),
        fetchOptional('default_data/regions.json')
    ]).then(function(results) {
        statusEl.textContent = 'Initialising map\u2026';
        clearMapData();
        document.getElementById('upload-overlay').style.display = 'none';
        loadMapData(results[2], results[0], results[1]);
    }).catch(function(err) {
        statusEl.textContent = 'Error: ' + err.message;
        setUploadButtonsDisabled(false);
    });
}

/*
 * Read user-selected files from the upload panel and apply them.
 * Only the Places file is required; Routes and Regions are optional.
 */
function loadUserFiles() {
    var placesFile  = document.getElementById('placesFile').files[0];
    var routesFile  = document.getElementById('routesFile').files[0];
    var regionsFile = document.getElementById('regionsFile').files[0];

    if (!placesFile) {
        document.getElementById('upload-status').textContent =
            'Please select a Places file to continue.';
        return;
    }

    var statusEl = document.getElementById('upload-status');
    statusEl.textContent = 'Reading files\u2026';
    setUploadButtonsDisabled(true);

    // Only count the files we actually intend to read
    var toRead    = 1 + (routesFile ? 1 : 0) + (regionsFile ? 1 : 0);
    var completed = 0;
    var loaded    = {};
    var errors    = [];

    function onFileRead(name, err, data) {
        if (err) errors.push(err.message);
        else     loaded[name] = data;
        completed++;
        if (completed < toRead) return;

        if (errors.length > 0) {
            statusEl.textContent = 'Error: ' + errors.join('; ');
            setUploadButtonsDisabled(false);
            return;
        }
        statusEl.textContent = 'Initialising map\u2026';
        clearMapData();
        document.getElementById('upload-overlay').style.display = 'none';
        loadMapData(loaded.regions || null, loaded.places, loaded.routes || null);
    }

    parseJSONFile(placesFile, function(err, data) { onFileRead('places',  err, data); });
    if (regionsFile)
        parseJSONFile(regionsFile, function(err, data) { onFileRead('regions', err, data); });
    if (routesFile)
        parseJSONFile(routesFile,  function(err, data) { onFileRead('routes',  err, data); });
}

function openUploadPanel() {
    document.getElementById('upload-overlay').style.display = 'flex';
    document.getElementById('upload-status').textContent = '';
}

function setUploadButtonsDisabled(disabled) {
    document.getElementById('loadDataBtn').disabled    = disabled;
    document.getElementById('loadDefaultBtn').disabled = disabled;
}

// ── Map data lifecycle ────────────────────────────────────────────────────────

/*
 * Tear down all previously loaded map data so loadMapData() can be called again.
 */
function clearMapData() {
    if (geojson)     { map.removeLayer(geojson); geojson = null; }
    if (routeLayer)  { map.removeLayer(routeLayer); routeLayer = L.featureGroup(); }

    regionPlaces      = {};
    markers           = {};
    routeLayersByRegion = {};
    allRouteLayers    = [];
    routeLayerIndex   = {};
    regionNameToCode  = {};
    crossRegionPoints = {};
    routeFeatures     = [];
    autocompleteList  = [];
    dijkstraGraph     = null;
    regions           = null;

    $('#regionDiv').html('<li id="All" class="region_ul" onclick="selectRegion(\'All\')">All</li>');
}

// Qualitative colour palette used when no regions file is provided
var REGION_COLOR_PALETTE = [
    '#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00',
    '#a65628','#f781bf','#999999','#66c2a5','#fc8d62',
    '#8da0cb','#e78ac3','#a6d854','#ffd92f','#e5c494',
    '#b3b3b3','#1b9e77','#d95f02','#7570b3','#e7298a',
    '#66a61e','#e6ab02','#a6761d','#666666'
];

/*
 * Build a synthetic regions object from the place features.
 * Each unique region_URI gets an auto-assigned colour; the first place
 * encountered in that region becomes its visual centre for map panning.
 */
function buildRegionsFromPlaces(placesData) {
    var result   = {};
    var colorIdx = 0;
    placesData.features.forEach(function(f) {
        var uri = f.properties.althurayyaData.region_URI;
        if (!result[uri]) {
            result[uri] = {
                color:         REGION_COLOR_PALETTE[colorIdx++ % REGION_COLOR_PALETTE.length],
                region_code:   uri,
                display:       uri,
                visual_center: f.properties.althurayyaData.URI
            };
        }
    });
    return result;
}

/*
 * Initialise the map from the parsed data objects.
 * regionsData and routesData may be null; placesData is required.
 */
function loadMapData(regionsData, placesData, routesData) {
    regions = regionsData || buildRegionsFromPlaces(placesData);

    geojson = L.geoJson(placesData, {
        pointToLayer: function(feature, latlng) {
            var uri = feature.properties.althurayyaData.region_URI;
            if (!regionPlaces[uri]) regionPlaces[uri] = [];
            regionPlaces[uri].push(feature.properties.althurayyaData.URI);

            var marker = createMarker(feature, latlng);
            autocompleteList.push([
                feature.properties.althurayyaData.names.eng.search,
                feature.properties.althurayyaData.names.ara.common,
                feature.properties.althurayyaData.URI
            ].join(', '));

            marker.on('click', createMarkerClickHandler(feature));
            return marker;
        }
    });
    geojson.addTo(map);

    // Rebuild autocomplete lists now that data is loaded
    bindAutocomplete('#netInput0',            autocompleteList, '#networkPane',     function() {});
    bindAutocomplete('#searchInput',          autocompleteList, '#searchPane',      function() {});
    bindAutocomplete('#stopInput0',           autocompleteList, '#pathFindingPane', highlightSelectedWaypoints);
    bindAutocomplete('#stopInputDestination', autocompleteList, '#pathFindingPane', highlightSelectedWaypoints);

    // Populate Regions sidebar tab (alphabetically, excluding NoRegion)
    Object.keys(regionPlaces).sort(function(a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    }).forEach(function(key) {
        if (key !== 'NoRegion') {
            $('#regionDiv').append(
                "<li id='" + key + "' class='region_ul'"
                + " onclick='selectRegion(\"" + key + "\")'>"
                + regions[key]['display'] + '</li>');
        }
    });

    // Add all markers to an overlay layer group
    var placesGroup = new L.LayerGroup();
    Object.keys(markers).forEach(function(key) {
        markers[key].addTo(placesGroup);
        if (placeProperties[key].type === 'metropoles') {
            markers[key].setLabelNoHide(true);
            markers[key].bringToFront();
        }
    });

    var baseLayers = {
        'Grayscale':          grayscaleLayer,
        'National Geographic': natGeoTiles,
        'Google Satellite':   googleSat,
        'Google Terrain':     googleTerrain,
        'Water Color':        waterColorLayer
    };
    L.control.layers(baseLayers, { 'Places': placesGroup }).addTo(map);
    L.control.sidebar('sidebar').addTo(map);

    buildZoomIndex(markers, TYPE_SIZE);

    if (routesData) {
        var routesGeoJson = L.geoJson(routesData, { onEachFeature: initRouteFeature });
        init_graph(routeFeatures);
        dijkstraGraph = buildDijkstraGraph(routeFeatures);
        routeLayer.addLayer(routesGeoJson).addTo(map);
        routeLayer.bringToBack();

        // Apply region colour to routes passing through cross-region boundary points
        Object.keys(crossRegionPoints).forEach(function(rp) {
            var pts = crossRegionPoints[rp];
            for (var i = 0; i < pts.length - 1; i++) {
                for (var j = 1; j < pts.length; j++) {
                    if (pts[i].end === pts[j].end) {
                        setLineStyle(pts[i].route, regions[pts[i].end]['color'], 2, 1);
                        setLineStyle(pts[j].route, regions[pts[i].end]['color'], 2, 1);
                    }
                }
            }
        });
    }
}

// ── Map interaction ───────────────────────────────────────────────────────────

/*
 * Return the colour for a region, falling back to lightgray for excluded codes.
 */
function getRegionColor(regionCode, excludedCodes) {
    if (excludedCodes.indexOf(regionCode) !== -1) return 'lightgray';
    return (regions[regionCode] && regions[regionCode]['color']) || 'lightgray';
}

function onMapClick(e) {
    $('#sidebar-pane').removeClass('active');
    $('.sidebar-tabs > li').removeClass('active');
    $('#sidebar').addClass('collapsed');
    clicked_lat = e.latlng.lat;
    clicked_lng = e.latlng.lng;
}

/*
 * Highlight markers and routes belonging to `regionKey`, or restore all if "All".
 */
function selectRegion(regionKey) {
    document.getElementById(regionKey).style.color = 'red';
    if (activeRegion !== undefined)
        document.getElementById(activeRegion).style.color = 'gray';
    activeRegion = regionKey;

    if (regionKey === 'All') {
        map.panTo([DEFAULT_LAT, DEFAULT_LON]);
        Object.keys(placeProperties).forEach(function(key) {
            markers[key].setStyle({
                fillColor:   regions[placeProperties[key].region]['color'],
                fillOpacity: 1
            });
        });
        Object.keys(routeLayersByRegion).forEach(function(key) {
            routeLayersByRegion[key].forEach(function(layer) {
                setLineStyle(layer, regions[key]['color'], 2, 1);
            });
        });
    } else {
        var placesInRegion = regionPlaces[regionKey];
        Object.keys(markers).forEach(function(key) {
            var inRegion = placesInRegion.indexOf(key) !== -1;
            markers[key].setStyle({
                fillColor: inRegion ? 'red'  : 'gray',
                color:     inRegion ? 'red'  : 'gray'
            });
            markers[key].options.zIndexOffset = inRegion ? 1000 : -1000;
        });
        allRouteLayers.forEach(function(layer) { setLineStyle(layer, 'gray', 2, 0.8); });
        if (routeLayersByRegion[regionKey]) {
            routeLayersByRegion[regionKey].forEach(function(layer) {
                setLineStyle(layer, 'red', 3, 1);
            });
        }
        map.panTo(markers[regions[regionKey]['visual_center']].getLatLng());
    }
}

/*
 * Toggle the text and reference sections of a primary/secondary source entry.
 */
function toggleSourceDetails(id) {
    $('#' + id + 'text').children().toggle();
    $('#' + id + 'ref').toggle();
}

// ── Pathfinding ───────────────────────────────────────────────────────────────

function findAndDisplayPath(start, end, stopInputsId) {
    var selections = getSelectedPathTypes('itinerary-options');
    $('#dist_div').html('');
    $('#path_dist_header').css('display', 'none');
    dimAllMarkers();
    dimAllRoutes();

    var itinerary   = buildItinerary(start, end, stopInputsId);
    var distances   = computeItineraryDistances(itinerary, selections);
    var directDist  = computeDirectDistance(itinerary[0], itinerary[itinerary.length - 1]);

    $('#path_dist_header').css('display', 'block');
    appendDistanceRow($('#dist_div'), directDist, directDist, 'Direct');
    if (selections.indexOf(PATH_TYPES[0]) !== -1)
        appendDistanceRow($('#dist_div'), distances[0], directDist, PATH_TYPES[0]);
    if (selections.indexOf(PATH_TYPES[1]) !== -1)
        appendDistanceRow($('#dist_div'), distances[1], directDist, PATH_TYPES[1]);
}

/*
 * Collect all stop inputs into an ordered array: [source, via..., destination].
 */
function buildItinerary(source, target, stopInputsId) {
    var stops = [source];
    $('input[id^=' + stopInputsId + ']').each(function() {
        var val = $(this).val();
        if (val.indexOf(',') !== -1) stops.push(val);
    });
    stops.push(target);
    return stops;
}

/*
 * Walk each consecutive pair of stops, compute paths, and return
 * [totalShortestMetres, totalOptimalMetres].
 */
function computeItineraryDistances(stops, selections) {
    var shortDist = 0;
    var optDist   = 0;
    for (var i = 0; i < stops.length - 1; i++) {
        if (selections.indexOf(PATH_TYPES[0]) !== -1) {
            shortDist += highlightPathSegments(computePath(stops[i], stops[i + 1], PATH_TYPES[0]), 'red');
        }
        if (selections.indexOf(PATH_TYPES[1]) !== -1) {
            optDist   += highlightPathSegments(computePath(stops[i], stops[i + 1], PATH_TYPES[1]), 'green');
        }
    }
    return [shortDist, optDist];
}

/*
 * Find the path between two autocomplete strings using the given algorithm.
 * PATH_TYPES[0] ('Shortest') uses the Dijkstra distance graph.
 * PATH_TYPES[1] ('Optimal')  uses the day-travel weighted graph.
 */
function computePath(start, end, pathType) {
    if (!start || !end) return [];
    var startUri = start.substring(start.lastIndexOf(',') + 1).trim();
    var endUri   = end.substring(end.lastIndexOf(',') + 1).trim();

    if (pathType === PATH_TYPES[0]) {
        return dijkstraGraph.findShortestPath(startUri, endUri) || [];
    }
    if (pathType === PATH_TYPES[1]) {
        return shortestPath(travelGraph.getNode(startUri), travelGraph.getNode(endUri), 'd') || [];
    }
    return [];
}

/*
 * Append a distance summary row (days of travel + km) to `container`.
 */
function appendDistanceRow(container, dist, directDist, label) {
    var id     = label.replace(/ /g, '_').toLowerCase();
    var days   = parseInt((dist / DAY).toFixed(), 10).toLocaleString('en');
    var km     = parseInt((dist / 1000).toFixed(), 10).toLocaleString('en');
    container.append(
        "<p id='" + id + "'>" + label
        + " distance: <b>" + days + "</b> days of travel, <b>" + km + "</b> km</p>");

    if (label !== 'Direct') {
        var avgDist = dist === 0 ? directDist : (dist + directDist) / 2;
        var avgKm   = parseInt((avgDist / 1000).toFixed(), 10).toLocaleString('en');
        container.append(
            "<p style='padding-left:10px;' id='avg_" + id + "'>Average " + label.toLowerCase()
            + " distance: <b>" + days + "</b> days of travel, <b>" + avgKm + "</b> km</p>");
    }
}

// ── Network analysis ──────────────────────────────────────────────────────────

function computeAndDisplayNetwork() {
    dimMap();
    var siteZones = {}; // place URI → nearest zone number

    $('input[id^="netInput"]').each(function() {
        var parts    = $(this).val().split(',');
        var sourceId = parts[parts.length - 1].trim();
        var node     = travelGraph.getNode(sourceId);
        var distances = shortestPath(node, node, 'n');
        var days      = parseInt($('#multiSelect').val(), 10);
        var network   = getNetwork(distances, days);

        network.keys().forEach(function(zone) {
            var zoneNum = parseInt(zone.replace(/\D/g, ''), 10);
            network.get(zone).forEach(function(uri) {
                if (siteZones[uri] === undefined)
                    siteZones[uri] = zoneNum;
                else
                    siteZones[uri] = Math.min(siteZones[uri], zoneNum);
            });
        });
    });

    var zoneColor = d3.scale.linear()
        .domain([1, 2, 3, 4, 5])
        .range(['#E84946', '#FF9500', '#FFD62E', '#6CA376', 'gray']);

    if ($('#unreachable_checkbox').is(':checked')) {
        Object.keys(markers).forEach(function(key) {
            setMarkerStyle(markers[key], 'black', 1);
        });
    }
    Object.keys(siteZones).forEach(function(uri) {
        setMarkerStyle(markers[uri], zoneColor(siteZones[uri]), 1);
    });
    Object.keys(routeLayerIndex).forEach(function(edge) {
        var parts = edge.split(',');
        if (siteZones[parts[0]] === 1 && siteZones[parts[1]] === 1)
            setLineStyle(routeLayerIndex[edge], 'red', 3, 1);
    });
}
