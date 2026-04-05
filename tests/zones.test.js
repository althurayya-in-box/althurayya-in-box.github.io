/**
 * Tests for placeDistanceInZone and getNetwork (graph.js).
 *
 * graph.js has no top-level side effects (only function definitions), so it
 * can be loaded into a vm context after providing the globals it references:
 * NUM_ZONES and DAY (from global_var.js), d3 (mocked), and jQuery.each.
 */
const { loadSource }           = require('./helpers/loadSource');
const { createD3Mock, createJQueryEach } = require('./helpers/mocks');

// Load the project constants first so we use the real values in assertions
const globals = loadSource('global_var.js');
const { DAY, NUM_ZONES, WITHIN_A_DAY } = globals;

// Load graph.js with the required globals
const ctx = loadSource('graph.js', {
    DAY,
    NUM_ZONES,
    WITHIN_A_DAY,
    d3:          createD3Mock(),
    jQuery:      { each: createJQueryEach() },
    travelGraph: null  // not called by the functions under test
});

const { placeDistanceInZone, getNetwork } = ctx;

// ─── placeDistanceInZone ─────────────────────────────────────────────────────

describe('placeDistanceInZone', () => {
    // Build a zones d3.map identical to the one getNetwork creates for multiplier=1
    function makeZones(multiplier) {
        const d3   = createD3Mock();
        const zones = d3.map();
        for (let i = 1; i < NUM_ZONES; i++) {
            zones.set(DAY * multiplier * i, 'Zone ' + i);
        }
        zones.set(Infinity, 'Zone ' + NUM_ZONES);
        return zones;
    }

    test('Infinity distance maps to the last zone', () => {
        const zones = makeZones(1);
        expect(placeDistanceInZone(Infinity, zones)).toBe('Zone ' + NUM_ZONES);
    });

    test('0 metres maps to Zone 1 (closest zone)', () => {
        const zones = makeZones(1);
        expect(placeDistanceInZone(0, zones)).toBe('Zone 1');
    });

    test('distance just below one day maps to Zone 1', () => {
        const zones = makeZones(1);
        expect(placeDistanceInZone(DAY - 1, zones)).toBe('Zone 1');
    });

    test('distance slightly beyond one day maps to Zone 2', () => {
        const zones = makeZones(1);
        expect(placeDistanceInZone(DAY + 1, zones)).toBe('Zone 2');
    });

    test('distance just below two days maps to Zone 2', () => {
        const zones = makeZones(1);
        expect(placeDistanceInZone(DAY * 2 - 1, zones)).toBe('Zone 2');
    });

    test('distance just beyond two days maps to Zone 3', () => {
        const zones = makeZones(1);
        expect(placeDistanceInZone(DAY * 2 + 1, zones)).toBe('Zone 3');
    });

    test('multiplier=2 doubles the zone thresholds', () => {
        const zonesX1 = makeZones(1);
        const zonesX2 = makeZones(2);
        // A distance of DAY+1 is Zone 2 at multiplier 1 but Zone 1 at multiplier 2
        expect(placeDistanceInZone(DAY + 1, zonesX1)).toBe('Zone 2');
        expect(placeDistanceInZone(DAY + 1, zonesX2)).toBe('Zone 1');
    });
});

// ─── getNetwork ──────────────────────────────────────────────────────────────

describe('getNetwork', () => {
    test('places at distance 0 land in Zone 1', () => {
        const distances = { placeA: 0 };
        const network   = getNetwork(distances, 1);
        expect(network.get('Zone 1')).toContain('placeA');
    });

    test('unreachable places (Infinity) land in the last zone', () => {
        const distances = { placeB: Infinity };
        const network   = getNetwork(distances, 1);
        expect(network.get('Zone ' + NUM_ZONES)).toContain('placeB');
    });

    test('produces NUM_ZONES zone buckets', () => {
        const network = getNetwork({}, 1);
        expect(network.keys()).toHaveLength(NUM_ZONES);
    });

    test('groups multiple places into the correct zones', () => {
        const distances = {
            near:        0,
            mid:         DAY * 2 + 1,   // just into Zone 3
            unreachable: Infinity
        };
        const network = getNetwork(distances, 1);
        expect(network.get('Zone 1')).toContain('near');
        expect(network.get('Zone 3')).toContain('mid');
        expect(network.get('Zone ' + NUM_ZONES)).toContain('unreachable');
    });

    test('all places at distance 0 are in Zone 1 (empty other zones)', () => {
        const distances = { p1: 0, p2: 0, p3: 0 };
        const network   = getNetwork(distances, 1);
        expect(network.get('Zone 1')).toHaveLength(3);
        for (let z = 2; z <= NUM_ZONES; z++) {
            expect(network.get('Zone ' + z)).toHaveLength(0);
        }
    });
});
