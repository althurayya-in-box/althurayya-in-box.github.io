d3.text("Muqaddasi_all_shortest_paths_noDuplicates.txt", function(error, data) {
    if (error || !data || typeof data !== 'string') return;
    var newURIs = {};
    var pathsLen = d3.csv.parseRows(data).length;
    var i, path;

    d3.select("#listPath_btn").on("click", function() {
        i = d3.select('#path_index').property("value");
        path = d3.csv.parseRows(data)[i];
        d3.select("#pathsDiv").style("display", "block");
        listPathFromText(path);
    });

    d3.select("#pathsDiv")
        .append("input")
        .attr("type", "button")
        .attr("id", "findPath_btn")
        .attr("value", "Show path!")
        .style("display", "inline")
        .on('click', function() {
            var s = d3.select('#source_select').property('value').split(",")[0];
            var e = d3.select('#dest_select').property('value').split(",")[0];
            findPathConsideringIntermediates(s, e, "");
        });

    d3.select("#pathsDiv")
        .append("input")
        .attr("type", "button")
        .attr("id", "submitURIs_btn")
        .attr("value", "Assign URIs!")
        .style("display", "inline-block")
        .on('click', function() {
            d3.selectAll('Input[id^="text_"]').each(function() {
                var arabicName = d3.select(this.parentNode).text();
                var cornuTopUri = d3.select(this).property("value");
                if (!(arabicName in newURIs) && cornuTopUri !== "") {
                    newURIs[arabicName] = cornuTopUri;
                    localStorage.setItem(arabicName, cornuTopUri);
                }
            });
            d3.select("#saveToFile_btn").style("display", "block");
        });

    d3.select("#pathsDiv")
        .append("input")
        .attr("type", "button")
        .attr("id", "nxtPath_btn")
        .attr("value", "Next Path!")
        .style("display", "inline-block")
        .on('click', function() {
            i++;
            d3.select("#path_index").property("value", i);
            if (i < pathsLen) {
                path = d3.csv.parseRows(data)[i];
                listPathFromText(path);
            } else {
                d3.select("#pathsDiv").html("");
                d3.select("#pathsDiv").append("p").text("No more paths to show!");
                d3.select("#saveToFile_btn").style("display", "none");
            }
        });

    d3.select("#saveToFile_btn").on("click", function() {
        saveNewUrisToFile(newURIs);
    });
});

function change(type) {
    var selectValue = d3.select('#' + type + '_select').property('value');
}

d3.json('testURIs.json', function(error, data) {
    if (error || !data) return;
    if (localStorage.length === 0) {
        Object.keys(data).forEach(function(key) {
            localStorage.setItem(key, data[key]);
        });
    }
});

function listPathFromText(stops) {
    var coordPattern = /_\d{3}\w\d{3}\w_/;
    d3.select("#listDiv").html("");
    d3.select("#pathsDiv")
        .insert("div", ":first-child")
        .attr('id', "listDiv")
        .append("ul").attr("id", "ul_source");

    for (var i = 0; i < stops.length; i++) {
        var str = stops[i];
        d3.select("#ul_source")
            .append("li").attr("id", "stop_" + i)
            .text(str);
        if (str.search(coordPattern) === -1) {
            d3.select("#stop_" + i)
                .append("input")
                .attr("type", "text")
                .attr("id", "text_" + i)
                .on("focus", function() {
                    d3.select(this).property("value", clicked_lat + "," + clicked_lng);
                });
            if (localStorage.getItem(str) !== null) {
                d3.select("#text_" + i).attr("value", localStorage.getItem(str));
            }
        }
    }

    var selectSource = selectStop("source_select", "source");
    selectSource.selectAll('option').data(stops).enter().append("option").text(function(d) { return d; });

    var selectDest = selectStop("dest_select", "dest");
    selectDest.selectAll('option').data(stops).enter().append("option").text(function(d) { return d; });
}

var selectStop = function(id, type) {
    return d3.select("#ul_source")
        .append("select").attr("id", id)
        .style("display", "block")
        .on("change", function() { change(type); });
};

d3.select("#saveToFile_btn").on("click", function() {
    saveNewUrisToFile(this);
});

function saveNewUrisToFile(newUris) {
    var blob = new Blob([JSON.stringify(JSON.stringify(localStorage))],
        {type: "text/plain;charset=utf-8"});
    saveAs(blob, "testURIs.json");
}
