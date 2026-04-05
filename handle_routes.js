var prev_route_clicked;
var prev_route_markers = [];
var prev_route_labels = [];

function handle_routes(feature, layer) {
    var sRegion, eRegion;
    var sFound = false;
    var eFound = false;
    var keys = Object.keys(markers);
    var i;
    for (i = 0; i < keys.length; i++) {
        if (!sFound && feature.properties.sToponym === marker_properties[keys[i]].cornu_URI) {
            sFound = true;
            sRegion = marker_properties[keys[i]].region;
            feature.properties.sTitle = marker_properties[keys[i]].searchTitle;
            feature.properties.sTitleAr = marker_properties[keys[i]].arabicTitle;
            feature.properties.sUri = marker_properties[keys[i]].cornu_URI;
            if (sRegion === 22) {
                if (route_points[feature.properties.sToponym] === undefined)
                    route_points[feature.properties.sToponym] = [];
                route_points[feature.properties.sToponym].push({
                    route: layer,
                    end: marker_properties[feature.properties.eToponym].region
                });
            }
        }
        if (!eFound && feature.properties.eToponym === marker_properties[keys[i]].cornu_URI) {
            eFound = true;
            eRegion = marker_properties[keys[i]].region;
            feature.properties.eTitle = marker_properties[keys[i]].searchTitle;
            feature.properties.eTitleAr = marker_properties[keys[i]].arabicTitle;
            feature.properties.eUri = marker_properties[keys[i]].cornu_URI;
            if (eRegion === 22) {
                if (route_points[feature.properties.eToponym] === undefined)
                    route_points[feature.properties.eToponym] = [];
                route_points[feature.properties.eToponym].push({
                    route: layer,
                    end: marker_properties[feature.properties.sToponym].region
                });
            }
        }
        if (sFound && eFound) break;
    }

    all_route_layers.push(layer);
    index_routes_layers[layer.feature.properties.sToponym + "," + layer.feature.properties.eToponym] = layer;
    route_features.push(feature);

    if (i < keys.length) {
        map_region_to_code[marker_properties[keys[i]].region_spelled] = marker_properties[keys[i]].region;
    }

    /*
     * Regions 13, 22, and 23 are light gray. Routes between different regions
     * default to lightgray; same-region routes get their region colour.
     */
    if (sRegion === eRegion) {
        if (route_layers[sRegion] === undefined)
            route_layers[sRegion] = [];
        route_layers[sRegion].push(layer);
        customLineStyle(layer, regions[sRegion]['color'], 2, 1);
        layer.options.default_color = regions[sRegion]['color'];
    } else {
        customLineStyle(layer, "lightgray", 1, 1);
        layer.options.default_color = "lightgray";
    }

    layer.on('click', OnRouteClick);

    function OnRouteClick(e) {
        if (prev_route_clicked !== undefined)
            customLineStyle(prev_route_clicked.layer, prev_route_clicked.color,
                prev_route_clicked.weight, prev_route_clicked.opacity);

        if (prev_route_markers.length > 0) {
            customMarkerStyle(prev_route_markers[0], prev_route_markers[0].defaultOptions.color, 1);
            customMarkerStyle(prev_route_markers[1], prev_route_markers[0].defaultOptions.color, 1);
            var isMetro0 = prev_route_markers[0].top_type === "metropoles";
            customLabelStyle(prev_route_markers[0], "black", "20px", isMetro0);
            customLabelStyle(prev_route_markers[1], "black", "20px", isMetro0);
        }

        prev_route_clicked = {
            layer: layer,
            color: layer.options.color,
            weight: layer.options.weight,
            opacity: layer.options.opacity
        };

        customLineStyle(layer, "red", 3, 1);
        customMarkerStyle(markers[feature.properties.sToponym], "red", 1);
        customMarkerStyle(markers[feature.properties.eToponym], "red", 1);
        prev_route_markers = [
            markers[feature.properties.sToponym],
            markers[feature.properties.eToponym]
        ];
        customLabelStyle(markers[feature.properties.sToponym], "red", "24px", true);
        customLabelStyle(markers[feature.properties.eToponym], "red", "24px", true);
        prev_route_labels = [markers[feature.properties.sToponym]];

        $("#sidebar").removeClass('collapsed');
        $(".sidebar-pane").removeClass('active');
        $(".sidebar-tabs > li").removeClass('active');
        $("#initRouteDesc").remove();
        $("#routeSectionPane").addClass('active');
        $("#routeSection").addClass('active');
        $("#routeDetails").text("MoreDetails:");

        Object.keys(layer.feature.properties).forEach(function(rData) {
            $("#routeDetails").append("<p class='details_text'><b>" + rData + ": </b>"
                + layer.feature.properties[rData] + "</p>");
        });
    }
}

function customLineStyle(layer, color, width, opacity) {
    layer.setStyle({
        color: color,
        weight: width,
        opacity: opacity,
        smoothFactor: 2
    });
}

function getRouteStyle(layer) {
    return layer.options;
}
