var prevSearchLabel;

function active_search(input) {
    $(input).on('keyup', function() {
        resetPaths();
        var searchTerm = $(input).val().toUpperCase();
        Object.keys(markers).forEach(function(key) {
            var searchTitle = marker_properties[key].searchTitle.toUpperCase();
            var cornuURI = marker_properties[key].cornu_URI;
            var arabicTitle = marker_properties[key].arabicTitle;
            var markerSearchTitle = [searchTitle, cornuURI, arabicTitle].join('');

            if (searchTerm !== "" && searchTerm.length > 1) {
                if (markerSearchTitle.indexOf(searchTerm) !== -1) {
                    customMarkerStyle(markers[key], "red", 0.8);
                    if (prevSearchLabel !== undefined) {
                        customLabelStyle(prevSearchLabel, "black", "20px", false);
                        customMarkerStyle(prevSearchLabel, prevSearchLabel.defaultOptions.color, 1);
                    }
                    markers[key].setLabelNoHide(true);
                    prevSearchLabel = markers[key];
                } else {
                    customMarkerStyle(markers[key], markers[key].defaultOptions.color, 0.2);
                }
            } else if (searchTerm === "") {
                myzoom();
                customMarkerStyle(markers[key], markers[key].defaultOptions.color, 1);
            }
        });
    });
}

function active_autocomp(input, auto_list, which_input, postprocess) {
    $(input).autocomplete({
        appendTo: which_input,
        source: auto_list,
        minLength: 4,
        select: function(e, ui) {
            resetMarkers();
            var selected = ui.item.value.toUpperCase();
            var sel_splitted = selected.split(",");
            var key = sel_splitted[sel_splitted.length - 1].trim();
            customMarkerStyle(markers[key], "red", 0.8);
            if (prevSearchLabel !== undefined)
                customLabelStyle(prevSearchLabel, "black", "20px", false);
            customLabelStyle(markers[key], "red", "24px", true);
            prevSearchLabel = markers[key];
            map.panTo(markers[key].getLatLng());
            markers[key].bringToFront();
            postprocess();
        }
    });
}
