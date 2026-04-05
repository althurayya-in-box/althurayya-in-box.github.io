var PATH_TYPES  = ['Shortest', 'Optimal'];
var PATH_COLORS = {};
PATH_COLORS[PATH_TYPES[0]] = '#f00';
PATH_COLORS[PATH_TYPES[1]] = '#345C1D';

/*
 * Render a checkbox row for each path type into the given container selector.
 * All types are checked by default.
 */
function initPathTypeSelector(containerSelector) {
    var labels = d3.select(containerSelector).selectAll('input')
        .data(PATH_TYPES)
        .enter().append('label');

    labels.append('input')
        .attr('type', 'checkbox')
        .property('checked', true)
        .attr('value', function(d) { return d; });

    labels.append('span')
        .attr('class', 'key')
        .style('background-color', function(d) { return PATH_COLORS[d]; });

    labels.append('span')
        .text(function(d) { return d; })
        .attr('class', 'english');
}
initPathTypeSelector('#itinerary-options');

/*
 * Return the values of all checked path-type checkboxes in the given container.
 */
function getSelectedPathTypes(containerId) {
    return d3.selectAll('#' + containerId + ' input[type=checkbox]')[0]
        .filter(function(el) { return el.checked; })
        .map(function(el) { return el.value; });
}
