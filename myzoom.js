var indZoom = {};

function index_zoom(markers, type_size) {
    Object.keys(markers).forEach(function(key) {
        var size = type_size[marker_properties[key].type];
        if (indZoom[size] === undefined) indZoom[size] = [];
        indZoom[size].push(key);
    });
}

/*
 * Show/Hide labels based on the zoom level.
 */
function myzoom() {
    var currentZoom = map.getZoom();
    var comp_size = Math.floor((max_zoom - currentZoom) / 2) + 1;
    if (currentZoom - prevZoom < 0) {
        comp_size -= 1;
        if (indZoom[comp_size] !== undefined) {
            indZoom[comp_size].forEach(function(iz) {
                markers[iz].setLabelNoHide(false);
            });
        }
    } else {
        if (indZoom[comp_size] !== undefined) {
            indZoom[comp_size].forEach(function(iz) {
                markers[iz].setLabelNoHide(true);
            });
        }
    }
    prevZoom = currentZoom;
}
