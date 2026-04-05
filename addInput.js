var numAdded = 0;
var counter = 0;

function addInput(type, btnId, max) {
    if (numAdded <= max) {
        numAdded++;
        counter++;
        var newDivId, inputId, addBtnId, delBtnId, placeHolder, typeId;
        if (type === "pathfinding") {
            newDivId = "stopDiv" + counter;
            inputId = "stopInput" + counter;
            addBtnId = "addStop" + counter;
            delBtnId = "delStop" + counter;
            placeHolder = "Via...";
            typeId = 'pathfinding';
        } else if (type === "network") {
            newDivId = "netDiv" + counter;
            inputId = "netInput" + counter;
            addBtnId = "addNet" + counter;
            delBtnId = "delNet" + counter;
            placeHolder = "And...";
            typeId = 'network';
        }
        var newDiv = $(document.createElement('div'));
        newDiv.attr("id", newDivId);
        newDiv.append('<input type="text" id="' + inputId +
            '" placeholder="' + placeHolder + '" autocomplete="on" style="margin-left:15px">');
        newDiv.append('<input type="button" title="Add new place"' +
            ' id="' + addBtnId + '" onclick="addInput(\'' + typeId + '\',this.id,' + max + ')"' +
            ' value="+" style="margin-left:15px;padding:5px;">');
        newDiv.append('<input type="button" id="' + delBtnId + '"' +
            ' onclick="removeInput(this.id)"' +
            ' title="Remove this place" value="-"' +
            ' style="margin-left:15px;padding:5px;"/>');
        $("#" + btnId).parent('div').after(newDiv);
        active_search('#' + inputId);
        if (type === "pathfinding")
            active_autocomp('#' + inputId, auto_list, "#pathFindingPane", keepLastStops);
        else if (type === "network")
            active_autocomp('#' + inputId, auto_list, "#networkPane", keepLastNetSite);
    } else {
        $("input[id^='del']").last().after('<label id="limitLabel" style="display: block;">Reached the limit</label>');
        $("input[id^='add']").attr('disabled', true);
    }
}

function removeInput(btnId) {
    $("#" + btnId).parent('div').remove();
    numAdded--;
    $("input[id^='add']").attr('disabled', false);
    if ($("#limitLabel").length)
        $("#limitLabel").remove();
}
