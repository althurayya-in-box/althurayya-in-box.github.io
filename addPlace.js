var numStops = 0;
var maxStops = 10;
var idCounter = 0;

function addStop(btnId) {
    if (numStops < maxStops) {
        numStops++;
        idCounter++;
        var newDiv = $(document.createElement('div'));
        newDiv.attr("id", 'stopDiv' + idCounter);
        newDiv.append('<input type="text" id="stopInput' + idCounter +
            '" placeholder="Via..." autocomplete="on" style="margin-left:15px">');
        newDiv.append('<input type="button" title="Add new stop after"' +
            ' id="addStop' + idCounter + '" onclick="addStop(this.id)"' +
            ' value="+" style="margin-left:15px;padding:5px;">');
        newDiv.append('<input type="button" id="delBtn' + idCounter + '"' +
            ' onclick="removeStop(this.id)"' +
            ' title="Remove this stop" value="-"' +
            ' style="margin-left:15px;padding:5px;"/>');
        $("#" + btnId).parent('div').after(newDiv);
        active_search('#stopInput' + idCounter);
        active_autocomp('#stopInput' + idCounter, auto_list, "#pathFindingPane", keepLastStops);
    } else {
        $("#destination").before('<label id="limitLabel" style="display: block;">Reached the limit</label>');
        $("input[id^='addStop']").attr('disabled', true);
    }
}

function removeStop(btnId) {
    $("#" + btnId).parent('div').remove();
    numStops--;
    $("input[id^='addStop']").attr('disabled', false);
    $("#limitLabel").remove();
}

function keepLastStops() {
    $('Input[id^="stopInput"]').each(function() {
        var stopInputValue = $(this).val();
        if (stopInputValue.indexOf(",") !== -1) {
            var sel_splitted = stopInputValue.split(",");
            var key = sel_splitted[sel_splitted.length - 1].trim();
            customMarkerStyle(markers[key], "red", 0.8);
            customLabelStyle(markers[key], "red", "24px", true);
            markers[key].bringToFront();
        }
    });
}
