/**
 * Tests for haversineDistance (helper.js).
 *
 * helper.js contains only function definitions (no top-level side effects),
 * so it can be loaded into a vm context after stubbing its only external
 * dependency: d3 (used only by buildDijkstraGraph, not by haversineDistance).
 */
const { loadSource } = require('./helpers/loadSource');
const { createD3Mock } = require('./helpers/mocks');

const ctx = loadSource('helper.js', {
    d3:              createD3Mock(),
    DijksGraph:      function() {},   // stub — not needed for haversineDistance
    allRouteLayers:  [],
    markers:         {},
    regions:         {},
    placeProperties: {}
});

const { haversineDistance } = ctx;

// ─── tests ──────────────────────────────────────────────────────────────────

describe('haversineDistance', () => {
    test('returns 0 for identical coordinates', () => {
        expect(haversineDistance(30, 42, 30, 42, 'K')).toBe(0);
    });

    test('is symmetric: distance(A→B) equals distance(B→A)', () => {
        const d1 = haversineDistance(21.39, 39.86, 24.47, 39.60, 'K');
        const d2 = haversineDistance(24.47, 39.60, 21.39, 39.86, 'K');
        expect(d1).toBeCloseTo(d2, 5);
    });

    test('approximates Mecca→Medina distance (~340 km)', () => {
        // Mecca: 21.3891°N 39.8579°E  |  Medina: 24.4672°N 39.6024°E
        const km = haversineDistance(21.3891, 39.8579, 24.4672, 39.6024, 'K');
        expect(km).toBeGreaterThan(320);
        expect(km).toBeLessThan(360);
    });

    test('1 degree of longitude at the equator is ~111 km', () => {
        const km = haversineDistance(0, 0, 0, 1, 'K');
        expect(km).toBeCloseTo(111.2, 0);
    });

    test('unit K (kilometres) returns a larger value than unit N (nautical miles)', () => {
        const km = haversineDistance(0, 0, 0, 1, 'K');
        const nm = haversineDistance(0, 0, 0, 1, 'N');
        expect(km).toBeGreaterThan(nm);
    });

    test('unit N result is consistent with the nautical-mile conversion factor', () => {
        const km = haversineDistance(0, 0, 0, 1, 'K');
        const nm = haversineDistance(0, 0, 0, 1, 'N');
        // 1 nautical mile ≈ 1.852 km  →  nm ≈ km / 1.852
        expect(nm).toBeCloseTo(km / 1.852, 0);
    });

    test('larger coordinate separation produces larger distance', () => {
        const short = haversineDistance(30, 42, 30, 43, 'K');
        const long  = haversineDistance(30, 42, 30, 52, 'K');
        expect(long).toBeGreaterThan(short);
    });

    test('distance increases toward poles (same delta, different latitude)', () => {
        // Longitude degrees are shorter near the poles
        const atEquator = haversineDistance(0, 0, 0, 1, 'K');
        const atPole    = haversineDistance(80, 0, 80, 1, 'K');
        expect(atEquator).toBeGreaterThan(atPole);
    });
});
