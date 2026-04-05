var marker_properties = {};

function create_marker(feature, latlng) {
    var data = feature.properties.althurayyaData;
    var marker = L.circleMarker(latlng, {
        fillColor: setColor(data.region_URI, [13, 23]),
        color: regions[data.region_URI]['color'],
        opacity: 1,
        fillOpacity: 1,
        weight: 1
    });

    marker_properties[data.URI] = {
        cornu_URI: data.URI,
        type: data.top_type,
        center: data.visual_center,
        region: data.region_URI,
        region_spelled: regions[data.region_URI]['region_code'],
        searchTitle: data.names.eng.search,
        arabicTitle: data.names.ara.common,
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0]
    };

    var rad = type_size[data.top_type] * 2;
    marker.setRadius(isNaN(rad) ? 0 : rad);
    marker = marker.bindLabel(data.names.eng.translit);
    marker.options.className = "leaflet-label";
    marker.options.zoomAnimation = true;
    marker.options.opacity = 0.0;
    marker.options.direction = "auto";
    marker.top_type = data.top_type;
    markers[data.URI] = marker;
    return marker;
}

// Variable holding the previous clicked marker
var prevClickedMarker;

// Show/Hide the technical details by clicking on "Technical Information"
$("#techInfo").click(function() {
    $("#cornuDetails").toggle();
});

function OnMarkerClick(feature) {
    return function(e) {
        var data = feature.properties.althurayyaData;

        $("#cornuDetails").css("display", "none");
        $("#sidebar").removeClass('collapsed');
        $(".sidebar-pane").removeClass('active');
        $(".sidebar-tabs > li").removeClass('active');
        $("#initDesc").remove();
        $("#initSourceDesc").remove();
        $("#location").addClass('active');
        $("#locTab").addClass('active');

        $("#locTitle").text("Location: " + data.names.eng.translit + " (" + data.names.ara.common + ")");
        $("#techInfo").text("Technical Information");
        $("#sourceTitle").text("Sources on: " + data.names.ara.common);

        if (Object.getOwnPropertyNames(feature.properties.references.secondary).length <= 0) {
            $("#otherSources").hide();
            $("#goToPrimSource").hide();
            $('#engSourcesDiv').html("");
        }

        $("#cornuDetails").html("");
        $('#sources').html("");

        if (prevClickedMarker !== undefined) {
            customMarkerStyle(prevClickedMarker, prevClickedMarker.defaultOptions.color, 1);
            if (prevClickedMarker.top_type !== "metropoles")
                customLabelStyle(prevClickedMarker, "black", "20px", false);
            else
                customLabelStyle(prevClickedMarker, "black", "20px", true);
        }

        customLabelStyle(markers[data.URI], "red", "24px", true);
        customMarkerStyle(markers[data.URI], "red", 1);
        prevClickedMarker = markers[data.URI];

        // Load secondary (English) source references
        Object.keys(feature.properties.references.secondary).forEach(function(engSourceUri) {
            $('#engSourcesDiv').html("");
            var refUri = "./ref/" + engSourceUri;
            var id = "E" + engSourceUri.replace(/\./g, "_");
            $.getJSON(refUri, function(data) {
                $("#engSourcesDiv").append(
                    "<span id='" + id + "' class='englishInline'>"
                    + "<div id='" + id + "text'>" + data['features'][0]['text'] + "</div><br>"
                    + "<div id='" + id + "ref' class='reference'>" + data['features'][0]['reference'] + "</div><br></span>"
                    + "<p>More in the <a href='" + data['features'][0]['uri']
                    + "'>Encyclopaedia of Islam, Second Edition (Online)</a></p>");
                $("#otherSources").show();
                $("#goToPrimSource").show();
                $("#encyIran").attr("href", "http://www.iranicaonline.org/articles/search/keywords:" + data['features'][0]['title']);
                $("#wikipedia").attr("href", "https://en.wikipedia.org/wiki/Special:Search/" + data['features'][0]['title']);
                $("#pleides").attr("href", "");
            });
        });

        // Build technical details panel
        Object.keys(data).forEach(function(cData) {
            var tmp = data[cData];
            $("#cornuDetails").append("<p id='detail_" + cData + "' class='details_text'><b>"
                + cData.replace(/_/g, " ") + ": </b></p>");
            if (typeof tmp === 'string')
                $("#detail_" + cData).append(tmp);
            if (cData === "language") {
                $("#detail_" + cData).append(tmp.join(', '));
            }
            if (cData === "names") {
                var langs = d3.keys(tmp);
                var names = d3.select("#detail_names").append("ul");
                names.selectAll("li")
                    .data(langs).enter().append("li")
                    .attr("id", function(d) { return "lang_" + d; })
                    .text(function(d) { return d; });
                langs.forEach(function(l) {
                    d3.select("#lang_" + l).append("ul")
                        .selectAll("li")
                        .data(d3.entries(tmp[l]))
                        .enter().append("li")
                        .attr("class", "li_names")
                        .text(function(d) {
                            return d.key.replace(/_/g, " ") + ": " + (d.value !== "" ? d.value : "NA");
                        });
                });
            }
        });

        // Load primary sources sorted by rate (descending)
        var srt_keys = Object.keys(feature.properties.references.primary).sort(function(a, b) {
            return feature.properties.references.primary[b].rate -
                   feature.properties.references.primary[a].rate;
        });
        srt_keys.forEach(function(sources) {
            var fUri = "./sources/" + sources;
            var id = "A" + sources.replace(/\./g, "_");
            $.getJSON(fUri, function(data) {
                $("#sources").append(
                    "<li id='" + id + "' onclick=click_on_list('" + id + "')>"
                    + data['features'][0]['source'] + ": <span class='arabicInline'>" + data['features'][0]['title']
                    + "&lrm;(" + feature.properties.references.primary[sources].match_rate + "% match)</span></li>"
                    + "<div id='" + id + "text'>" + data['features'][0]['text'] + "</div><br>"
                    + "<div id='" + id + "ref' class='reference'>" + data['features'][0]['reference'] + "</div><br>");
            });
        });
    };
}

function customMarkerStyle(marker, color, opacity) {
    marker.setStyle({
        fillColor: color,
        color: color,
        fillOpacity: opacity
    });
}

function customLabelStyle(marker, color, font, status) {
    if (marker.label._container !== undefined) {
        marker.label._container.style.color = color;
        marker.label._container.style.fontSize = font;
    }
    marker.setLabelNoHide(status);
}
