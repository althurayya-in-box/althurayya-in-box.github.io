// Maps place URI → properties object for every loaded place feature
var placeProperties = {};

// The most recently clicked marker (used to restore its style on next click)
var lastClickedMarker;

/*
 * Build a Leaflet CircleMarker for a GeoJSON place feature and register it
 * in the global `markers` and `placeProperties` maps.
 */
function createMarker(feature, latlng) {
    var data   = feature.properties.althurayyaData;
    var marker = L.circleMarker(latlng, {
        fillColor:   getRegionColor(data.region_URI, [13, 23]),
        color:       regions[data.region_URI]['color'],
        opacity:     1,
        fillOpacity: 1,
        weight:      1
    });

    placeProperties[data.URI] = {
        cornu_URI:     data.URI,
        type:          data.top_type,
        center:        data.visual_center,
        region:        data.region_URI,
        region_spelled: regions[data.region_URI]['region_code'],
        searchTitle:   data.names.eng.search,
        arabicTitle:   data.names.ara.common,
        lat:           feature.geometry.coordinates[1],
        lng:           feature.geometry.coordinates[0]
    };

    var radius = TYPE_SIZE[data.top_type] * 2;
    marker.setRadius(isNaN(radius) ? 0 : radius);
    marker = marker.bindLabel(data.names.eng.translit);
    marker.options.className    = 'leaflet-label';
    marker.options.zoomAnimation = true;
    marker.options.opacity      = 0.0;
    marker.options.direction    = 'auto';
    marker.top_type             = data.top_type;
    markers[data.URI]           = marker;
    return marker;
}

// Expand/collapse technical details when the heading is clicked
$('#techInfo').click(function() {
    $('#cornuDetails').toggle();
});

/*
 * Returns a click-handler closure for a place feature.
 * Opens the Location sidebar tab and populates it with the feature's data.
 */
function createMarkerClickHandler(feature) {
    return function() {
        var data = feature.properties.althurayyaData;

        $('#cornuDetails').css('display', 'none');
        $('#sidebar').removeClass('collapsed');
        $('.sidebar-pane').removeClass('active');
        $('.sidebar-tabs > li').removeClass('active');
        $('#initDesc').remove();
        $('#initSourceDesc').remove();
        $('#location').addClass('active');
        $('#locTab').addClass('active');

        $('#locTitle').text('Location: ' + data.names.eng.translit + ' (' + data.names.ara.common + ')');
        $('#techInfo').text('Technical Information');
        $('#sourceTitle').text('Sources on: ' + data.names.ara.common);

        if (Object.getOwnPropertyNames(feature.properties.references.secondary).length === 0) {
            $('#otherSources').hide();
            $('#goToPrimSource').hide();
            $('#engSourcesDiv').html('');
        }

        $('#cornuDetails').html('');
        $('#sources').html('');

        // Restore style of previously clicked marker
        if (lastClickedMarker !== undefined) {
            setMarkerStyle(lastClickedMarker, lastClickedMarker.defaultOptions.color, 1);
            setLabelStyle(lastClickedMarker, 'black', '20px',
                lastClickedMarker.top_type === 'metropoles');
        }

        setLabelStyle(markers[data.URI], 'red', '24px', true);
        setMarkerStyle(markers[data.URI], 'red', 1);
        lastClickedMarker = markers[data.URI];

        // Load secondary (English) references
        Object.keys(feature.properties.references.secondary).forEach(function(refKey) {
            $('#engSourcesDiv').html('');
            var id = 'E' + refKey.replace(/\./g, '_');
            $.getJSON('./ref/' + refKey, function(refData) {
                var entry = refData['features'][0];
                $('#engSourcesDiv').append(
                    "<span id='" + id + "' class='englishInline'>"
                    + "<div id='" + id + "text'>" + entry['text'] + "</div><br>"
                    + "<div id='" + id + "ref' class='reference'>" + entry['reference'] + "</div><br></span>"
                    + "<p>More in the <a href='" + entry['uri']
                    + "'>Encyclopaedia of Islam, Second Edition (Online)</a></p>");
                $('#otherSources').show();
                $('#goToPrimSource').show();
                $('#encyIran').attr('href',
                    'http://www.iranicaonline.org/articles/search/keywords:' + entry['title']);
                $('#wikipedia').attr('href',
                    'https://en.wikipedia.org/wiki/Special:Search/' + entry['title']);
                $('#pleides').attr('href', '');
            });
        });

        // Build technical details panel
        Object.keys(data).forEach(function(key) {
            var value = data[key];
            $('#cornuDetails').append(
                "<p id='detail_" + key + "' class='details_text'><b>"
                + key.replace(/_/g, ' ') + ': </b></p>');

            if (typeof value === 'string') {
                $('#detail_' + key).append(value);
            } else if (key === 'language') {
                $('#detail_' + key).append(value.join(', '));
            } else if (key === 'names') {
                var langs = d3.keys(value);
                var nameList = d3.select('#detail_names').append('ul');
                nameList.selectAll('li').data(langs).enter().append('li')
                    .attr('id', function(d) { return 'lang_' + d; })
                    .text(function(d) { return d; });
                langs.forEach(function(lang) {
                    d3.select('#lang_' + lang).append('ul')
                        .selectAll('li')
                        .data(d3.entries(value[lang]))
                        .enter().append('li')
                        .attr('class', 'li_names')
                        .text(function(d) {
                            return d.key.replace(/_/g, ' ') + ': ' + (d.value !== '' ? d.value : 'NA');
                        });
                });
            }
        });

        // Load primary sources, sorted by relevance rate descending
        var sortedSources = Object.keys(feature.properties.references.primary).sort(function(a, b) {
            return feature.properties.references.primary[b].rate
                 - feature.properties.references.primary[a].rate;
        });
        sortedSources.forEach(function(sourceKey) {
            var id = 'A' + sourceKey.replace(/\./g, '_');
            $.getJSON('./sources/' + sourceKey, function(srcData) {
                var entry = srcData['features'][0];
                $('#sources').append(
                    "<li id='" + id + "' onclick=toggleSourceDetails('" + id + "')>"
                    + entry['source'] + ": <span class='arabicInline'>" + entry['title']
                    + "&lrm;(" + feature.properties.references.primary[sourceKey].match_rate + "% match)</span></li>"
                    + "<div id='" + id + "text'>" + entry['text'] + "</div><br>"
                    + "<div id='" + id + "ref' class='reference'>" + entry['reference'] + "</div><br>");
            });
        });
    };
}

// ── Marker / label style helpers ─────────────────────────────────────────────

function setMarkerStyle(marker, color, opacity) {
    marker.setStyle({ fillColor: color, color: color, fillOpacity: opacity });
}

function setLabelStyle(marker, color, fontSize, pinned) {
    if (marker.label._container !== undefined) {
        marker.label._container.style.color    = color;
        marker.label._container.style.fontSize = fontSize;
    }
    marker.setLabelNoHide(pinned);
}
