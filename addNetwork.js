var numNets = 0;
var maxNets = 2;
var netCounter = 0;

function addNet(btnId) {
    if (numNets <= maxNets) {
        numNets++;
        netCounter++;
        var newDiv = $(document.createElement('div'));
        newDiv.attr("id", 'startNet' + netCounter);
        newDiv.append('<label id="netLabel' + netCounter + '" style="display:block;">And:</label>');
        newDiv.append('<input type="text" id="netInput' + netCounter +
            '" placeholder="Start Network..." autocomplete="on" style="margin-left:5px">');
        newDiv.append('<input type="button" title="Add new site for network flood"' +
            ' id="addNet' + netCounter + '" onclick="addNet(this.id)"' +
            ' value="+" style="margin-left:15px;padding:5px;">');
        newDiv.append('<input type="button" id="delNet' + netCounter + '"' +
            ' onclick="removeNet(this.id)"' +
            ' title="Remove this site" value="-"' +
            ' style="margin-left:15px;padding:5px;"/>');
        $("#" + btnId).parent('div').after(newDiv);
        active_search('#netInput' + netCounter);
        active_autocomp('#netInput' + netCounter, auto_list, "#networkPane", keepLastNetSite);
    } else {
        $("input[id^='addNet']").attr('disabled', true);
    }
}

function removeNet(btnId) {
    $("#" + btnId).parent('div').remove();
    numNets--;
    $("input[id^='addNet']").attr('disabled', false);
}

function keepLastNetSite() {
    $('Input[id^="netInput"]').each(function() {
        var netInputValue = $(this).val();
        if (netInputValue.indexOf(",") !== -1) {
            var sel_splitted = netInputValue.split(",");
            var key = sel_splitted[sel_splitted.length - 1].trim();
            customMarkerStyle(markers[key], "red", 0.8);
            customLabelStyle(markers[key], "red", "24px", true);
            markers[key].bringToFront();
        }
    });
}
