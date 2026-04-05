// Maps marker radius size → array of place URIs at that size, for zoom-driven label toggling
var zoomIndex = {};

/*
 * Build the zoomIndex from the currently loaded markers.
 * Must be called after all markers have been created.
 */
function buildZoomIndex(markers, typeSizes) {
    zoomIndex = {};
    Object.keys(markers).forEach(function(key) {
        var size = typeSizes[placeProperties[key].type];
        if (!zoomIndex[size]) zoomIndex[size] = [];
        zoomIndex[size].push(key);
    });
}

/*
 * Show or hide labels based on the current zoom level.
 * Called on every `zoomend` map event.
 */
function onZoomChange() {
    var currentZoom = map.getZoom();
    var threshold   = Math.floor((MAX_ZOOM - currentZoom) / 2) + 1;

    if (currentZoom < previousZoom) {
        // Zooming out: hide the labels that were just revealed
        var hideSize = threshold - 1;
        if (zoomIndex[hideSize]) {
            zoomIndex[hideSize].forEach(function(key) {
                markers[key].setLabelNoHide(false);
            });
        }
    } else {
        // Zooming in: reveal labels for places at this threshold
        if (zoomIndex[threshold]) {
            zoomIndex[threshold].forEach(function(key) {
                markers[key].setLabelNoHide(true);
            });
        }
    }

    previousZoom = currentZoom;
}
