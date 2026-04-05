// The most recently highlighted marker from a search (used to restore its style)
var lastSearchedMarker;

/*
 * Attach a live-search keyup listener to an input.
 * Highlights matching markers in red and dims non-matching ones.
 */
function bindSearchInput(inputSelector) {
    $(inputSelector).on('keyup', function() {
        restoreRoutes();
        var term = $(inputSelector).val().toUpperCase();

        Object.keys(markers).forEach(function(key) {
            var haystack = [
                placeProperties[key].searchTitle.toUpperCase(),
                placeProperties[key].cornu_URI,
                placeProperties[key].arabicTitle
            ].join('');

            if (term.length > 1) {
                if (haystack.indexOf(term) !== -1) {
                    setMarkerStyle(markers[key], 'red', 0.8);
                    if (lastSearchedMarker !== undefined) {
                        setLabelStyle(lastSearchedMarker, 'black', '20px', false);
                        setMarkerStyle(lastSearchedMarker, lastSearchedMarker.defaultOptions.color, 1);
                    }
                    markers[key].setLabelNoHide(true);
                    lastSearchedMarker = markers[key];
                } else {
                    setMarkerStyle(markers[key], markers[key].defaultOptions.color, 0.2);
                }
            } else if (term === '') {
                onZoomChange();
                setMarkerStyle(markers[key], markers[key].defaultOptions.color, 1);
            }
        });
    });
}

/*
 * Attach a jQuery UI autocomplete to an input, backed by the shared
 * autocomplete list. `paneSelector` sets where the dropdown is appended.
 * `onSelect` is called after the map pans to the selected marker.
 */
function bindAutocomplete(inputSelector, list, paneSelector, onSelect) {
    $(inputSelector).autocomplete({
        appendTo:  paneSelector,
        source:    list,
        minLength: 4,
        select: function(e, ui) {
            restoreMarkers();
            var parts = ui.item.value.toUpperCase().split(',');
            var key   = parts[parts.length - 1].trim();
            setMarkerStyle(markers[key], 'red', 0.8);
            if (lastSearchedMarker !== undefined)
                setLabelStyle(lastSearchedMarker, 'black', '20px', false);
            setLabelStyle(markers[key], 'red', '24px', true);
            lastSearchedMarker = markers[key];
            map.panTo(markers[key].getLatLng());
            markers[key].bringToFront();
            onSelect();
        }
    });
}
