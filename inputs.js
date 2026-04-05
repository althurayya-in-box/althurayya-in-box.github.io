/*
 * Dynamic waypoint / network-origin inputs
 *
 * Both the Pathfinding and Network panels let users add extra stops/origins.
 * This file provides a single generic implementation used by both.
 *
 * type === 'pathfinding'  →  adds "Via…" waypoint inputs
 * type === 'network'      →  adds "And…" origin inputs
 */

var dynamicInputCount = 0; // monotonically increasing id counter (prevents duplicate ids)
var waypointCount     = 0; // number of active pathfinding waypoints
var networkCount      = 0; // number of active network origins

var MAX_WAYPOINTS = 10;
var MAX_ORIGINS   = 2;

function addDynamicInput(type, btnId, max) {
    var count = type === 'pathfinding' ? waypointCount : networkCount;
    if (count >= max) {
        $("input[id^='add']").attr('disabled', true);
        $("input[id^='del']").last().after(
            '<label id="limitLabel" style="display:block;">Reached the limit</label>');
        return;
    }

    dynamicInputCount++;
    if (type === 'pathfinding') waypointCount++;
    else                        networkCount++;

    var id      = dynamicInputCount;
    var prefix  = type === 'pathfinding' ? 'stopInput' : 'netInput';
    var label   = type === 'pathfinding' ? 'Via…'       : 'And…';
    var pane    = type === 'pathfinding' ? '#pathFindingPane' : '#networkPane';
    var onSelect = type === 'pathfinding' ? highlightSelectedWaypoints : highlightSelectedNetworkOrigins;

    var newDiv = $(document.createElement('div')).attr('id', 'dynDiv' + id);

    newDiv.append(
        '<input type="text" id="' + prefix + id + '" placeholder="' + label + '"'
        + ' autocomplete="on" style="margin-left:15px">');
    newDiv.append(
        '<input type="button" id="addDyn' + id + '"'
        + ' onclick="addDynamicInput(\'' + type + '\', this.id, ' + max + ')"'
        + ' value="+" style="margin-left:15px;padding:5px;" title="Add another">');
    newDiv.append(
        '<input type="button" id="delDyn' + id + '"'
        + ' onclick="removeDynamicInput(\'' + type + '\', this.id)"'
        + ' value="-" style="margin-left:15px;padding:5px;" title="Remove this">');

    $('#' + btnId).parent('div').after(newDiv);

    bindSearchInput('#' + prefix + id);
    bindAutocomplete('#' + prefix + id, autocompleteList, pane, onSelect);
}

function removeDynamicInput(type, btnId) {
    $('#' + btnId).parent('div').remove();
    if (type === 'pathfinding') waypointCount--;
    else                        networkCount--;
    $("input[id^='add']").attr('disabled', false);
    $('#limitLabel').remove();
}

/*
 * After an autocomplete selection in the Pathfinding panel, highlight every
 * currently entered waypoint on the map.
 */
function highlightSelectedWaypoints() {
    $('input[id^="stopInput"]').each(function() {
        var val = $(this).val();
        if (val.indexOf(',') !== -1) {
            var key = val.split(',').pop().trim();
            setMarkerStyle(markers[key], 'red', 0.8);
            setLabelStyle(markers[key], 'red', '24px', true);
            markers[key].bringToFront();
        }
    });
}

/*
 * After an autocomplete selection in the Network panel, highlight every
 * currently entered origin on the map.
 */
function highlightSelectedNetworkOrigins() {
    $('input[id^="netInput"]').each(function() {
        var val = $(this).val();
        if (val.indexOf(',') !== -1) {
            var key = val.split(',').pop().trim();
            setMarkerStyle(markers[key], 'red', 0.8);
            setLabelStyle(markers[key], 'red', '24px', true);
            markers[key].bringToFront();
        }
    });
}
