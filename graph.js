function init_graph(routes) {
    var Graph = require('data-structures').Graph;
    travelGraph = new Graph();

    for (var i = 0; i < routes.length; i++) {
        var e = routes[i].properties.eToponym;
        var s = routes[i].properties.sToponym;

        travelGraph.addNode(e);
        travelGraph.getNode(e)._id = e;

        travelGraph.addNode(s);
        travelGraph.getNode(s)._id = s;

        travelGraph.addEdge(e, s);
        var edge = travelGraph.getEdge(e, s);
        edge._eid    = e;
        edge._sid    = s;
        edge._id     = routes[i].properties.id;
        edge.weight  = routes[i].properties.Meter;
    }
    resetNodes(travelGraph);
}

function resetNodes(G) {
    travelGraph.forEachNode(function(node) {
        node.visited = false;
    });
}

function PriorityQueue() {
    this._nodes = [];

    this.enqueue = function(priority, key) {
        this._nodes.push({ key: key, priority: priority });
        this.sort();
    };
    this.dequeue = function() {
        return this._nodes.shift().key;
    };
    this.sort = function() {
        this._nodes.sort(function(a, b) { return a.priority - b.priority; });
    };
    this.isEmpty = function() {
        return !this._nodes.length;
    };
}

function shortestPath(s, t, searchType) {
    var INFINITY = 1 / 0;
    var nodes     = new PriorityQueue();
    var distances = {};
    var previous  = {};
    var path      = [];
    var smallest, neighbor, alt;

    travelGraph.forEachNode(function(node) {
        if (node._id === s._id) {
            distances[node._id] = 0;
            nodes.enqueue(0, node._id);
        } else {
            distances[node._id] = INFINITY;
        }
        previous[node._id] = null;
    });

    while (!nodes.isEmpty()) {
        smallest = nodes.dequeue();

        if (searchType !== 'n') {
            if (smallest === t._id) {
                while (previous[smallest]) {
                    path.push(smallest);
                    smallest = previous[smallest];
                }
                break;
            }
        }

        var edges = travelGraph.getAllEdgesOf(smallest);
        for (var i = 0; i < edges.length; i++) {
            neighbor = edges[i];
            if (searchType === 'd' && neighbor.weight > WITHIN_A_DAY) continue;

            alt = distances[smallest] + neighbor.weight;
            if (neighbor._sid === smallest) {
                if (alt < distances[neighbor._eid]) {
                    distances[neighbor._eid] = alt;
                    previous[neighbor._eid]  = smallest;
                    nodes.enqueue(alt, neighbor._eid);
                }
            } else {
                if (alt < distances[neighbor._sid]) {
                    distances[neighbor._sid] = alt;
                    previous[neighbor._sid]  = smallest;
                    nodes.enqueue(alt, neighbor._sid);
                }
            }
        }
    }
    return searchType === 'n' ? distances : path.concat(s._id).reverse();
}

function getNetwork(distances, multiplier) {
    var network = d3.map();
    var zones   = d3.map();

    for (var i = 1; i < NUM_ZONES; i++) {
        zones.set(DAY * multiplier * i, 'Zone ' + i);
    }
    zones.set(Infinity, 'Zone ' + NUM_ZONES);

    zones.values().forEach(function(z) {
        network.set(z, []);
    });

    jQuery.each(distances, function(id, metres) {
        var zone = placeDistanceInZone(metres, zones);
        network.get(zone).push(id);
    });

    return network;
}

function placeDistanceInZone(metres, zones) {
    if (metres === Infinity) return 'Zone ' + NUM_ZONES;

    var values = zones.keys().map(function(z) { return parseInt(z); });
    values.pop(); // Infinity doesn't parse; it was the last entry
    values.push(metres);
    values.sort(function(a, b) { return a - b; });

    var idx = values.indexOf(metres);
    idx = (idx === values.length - 1) ? idx - 1 : idx + 1;
    return zones.get(values[idx]);
}
