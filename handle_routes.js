var lastClickedRoute;
var lastRouteMarkers = [];
var lastRouteLabels  = [];

/*
 * Leaflet `onEachFeature` callback for route GeoJSON.
 * Registers the layer in the lookup tables and attaches click behaviour.
 */
function initRouteFeature(feature, layer) {
    var sRegion, eRegion;
    var sFound = false;
    var eFound = false;
    var keys   = Object.keys(markers);
    var i;

    for (i = 0; i < keys.length; i++) {
        if (!sFound && feature.properties.sToponym === placeProperties[keys[i]].cornu_URI) {
            sFound  = true;
            sRegion = placeProperties[keys[i]].region;
            feature.properties.sTitle   = placeProperties[keys[i]].searchTitle;
            feature.properties.sTitleAr = placeProperties[keys[i]].arabicTitle;
            feature.properties.sUri     = placeProperties[keys[i]].cornu_URI;
            if (sRegion === 22) {
                if (!crossRegionPoints[feature.properties.sToponym])
                    crossRegionPoints[feature.properties.sToponym] = [];
                crossRegionPoints[feature.properties.sToponym].push({
                    route: layer,
                    end:   placeProperties[feature.properties.eToponym].region
                });
            }
        }
        if (!eFound && feature.properties.eToponym === placeProperties[keys[i]].cornu_URI) {
            eFound  = true;
            eRegion = placeProperties[keys[i]].region;
            feature.properties.eTitle   = placeProperties[keys[i]].searchTitle;
            feature.properties.eTitleAr = placeProperties[keys[i]].arabicTitle;
            feature.properties.eUri     = placeProperties[keys[i]].cornu_URI;
            if (eRegion === 22) {
                if (!crossRegionPoints[feature.properties.eToponym])
                    crossRegionPoints[feature.properties.eToponym] = [];
                crossRegionPoints[feature.properties.eToponym].push({
                    route: layer,
                    end:   placeProperties[feature.properties.sToponym].region
                });
            }
        }
        if (sFound && eFound) break;
    }

    allRouteLayers.push(layer);
    routeLayerIndex[feature.properties.sToponym + ',' + feature.properties.eToponym] = layer;
    routeFeatures.push(feature);

    if (i < keys.length) {
        regionNameToCode[placeProperties[keys[i]].region_spelled] = placeProperties[keys[i]].region;
    }

    // Same-region routes get the region colour; cross-region routes are light gray
    if (sRegion === eRegion) {
        if (!routeLayersByRegion[sRegion]) routeLayersByRegion[sRegion] = [];
        routeLayersByRegion[sRegion].push(layer);
        setLineStyle(layer, regions[sRegion]['color'], 2, 1);
        layer.options.default_color = regions[sRegion]['color'];
    } else {
        setLineStyle(layer, 'lightgray', 1, 1);
        layer.options.default_color = 'lightgray';
    }

    layer.on('click', function() {
        // Restore previously clicked route
        if (lastClickedRoute) {
            setLineStyle(lastClickedRoute.layer, lastClickedRoute.color,
                lastClickedRoute.weight, lastClickedRoute.opacity);
        }

        // Restore previously highlighted endpoint markers
        if (lastRouteMarkers.length > 0) {
            var wasMetro = lastRouteMarkers[0].top_type === 'metropoles';
            setMarkerStyle(lastRouteMarkers[0], lastRouteMarkers[0].defaultOptions.color, 1);
            setMarkerStyle(lastRouteMarkers[1], lastRouteMarkers[0].defaultOptions.color, 1);
            setLabelStyle(lastRouteMarkers[0], 'black', '20px', wasMetro);
            setLabelStyle(lastRouteMarkers[1], 'black', '20px', wasMetro);
        }

        lastClickedRoute = {
            layer:   layer,
            color:   layer.options.color,
            weight:  layer.options.weight,
            opacity: layer.options.opacity
        };

        setLineStyle(layer, 'red', 3, 1);
        setMarkerStyle(markers[feature.properties.sToponym], 'red', 1);
        setMarkerStyle(markers[feature.properties.eToponym], 'red', 1);
        setLabelStyle(markers[feature.properties.sToponym], 'red', '24px', true);
        setLabelStyle(markers[feature.properties.eToponym], 'red', '24px', true);

        lastRouteMarkers = [
            markers[feature.properties.sToponym],
            markers[feature.properties.eToponym]
        ];
        lastRouteLabels = [markers[feature.properties.sToponym]];

        $('#sidebar').removeClass('collapsed');
        $('.sidebar-pane').removeClass('active');
        $('.sidebar-tabs > li').removeClass('active');
        $('#initRouteDesc').remove();
        $('#routeSectionPane').addClass('active');
        $('#routeSection').addClass('active');
        $('#routeDetails').text('Route Details:');

        Object.keys(layer.feature.properties).forEach(function(prop) {
            $('#routeDetails').append(
                "<p class='details_text'><b>" + prop + ': </b>'
                + layer.feature.properties[prop] + '</p>');
        });
    });
}

// ── Route style helper ────────────────────────────────────────────────────────

function setLineStyle(layer, color, width, opacity) {
    layer.setStyle({ color: color, weight: width, opacity: opacity, smoothFactor: 2 });
}
