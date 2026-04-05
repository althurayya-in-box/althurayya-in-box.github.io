/**
 * Tests for buildRegionsFromPlaces (index.js).
 *
 * index.js has many browser-dependent top-level side effects (creates a
 * Leaflet map, binds jQuery events, etc.), so we cannot load it wholesale.
 * Instead we slice out the self-contained block that defines
 * REGION_COLOR_PALETTE and buildRegionsFromPlaces and run only that snippet.
 */
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const { ROOT } = require('./helpers/loadSource');

// Extract only the two definitions we need from index.js.
// They live between the "Qualitative colour palette" comment and loadMapData.
const source  = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');
const start   = source.indexOf('// Qualitative colour palette');
const end     = source.indexOf('\nfunction loadMapData');
if (start === -1 || end === -1) {
    throw new Error('Could not locate buildRegionsFromPlaces in index.js — update the slice markers in regions.test.js');
}
const snippet = source.slice(start, end);
const ctx     = { Infinity, Math, parseInt, Object, Array };
vm.runInNewContext(snippet, ctx);

const { buildRegionsFromPlaces, REGION_COLOR_PALETTE } = ctx;

// ─── fixtures ────────────────────────────────────────────────────────────────

function makeFeature(uri, regionUri) {
    return {
        properties: {
            althurayyaData: { URI: uri, region_URI: regionUri }
        }
    };
}

function makePlacesData(features) {
    return { features };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('buildRegionsFromPlaces', () => {
    test('returns an empty object for an empty feature collection', () => {
        expect(buildRegionsFromPlaces(makePlacesData([]))).toEqual({});
    });

    test('creates one entry per unique region_URI', () => {
        const data   = makePlacesData([
            makeFeature('place1', 'Iraq'),
            makeFeature('place2', 'Iraq'),
            makeFeature('place3', 'Sham')
        ]);
        const result = buildRegionsFromPlaces(data);
        expect(Object.keys(result)).toHaveLength(2);
        expect(result).toHaveProperty('Iraq');
        expect(result).toHaveProperty('Sham');
    });

    test('each region entry has color, region_code, display, and visual_center', () => {
        const data   = makePlacesData([makeFeature('place1', 'Iraq')]);
        const result = buildRegionsFromPlaces(data);
        expect(result['Iraq']).toMatchObject({
            color:         expect.any(String),
            region_code:   'Iraq',
            display:       'Iraq',
            visual_center: 'place1'
        });
    });

    test('visual_center is the URI of the first place encountered in that region', () => {
        const data   = makePlacesData([
            makeFeature('firstInRegion', 'Egypt'),
            makeFeature('secondInRegion', 'Egypt')
        ]);
        const result = buildRegionsFromPlaces(data);
        expect(result['Egypt'].visual_center).toBe('firstInRegion');
    });

    test('region_code and display equal the region_URI (no external name source)', () => {
        const data   = makePlacesData([makeFeature('p1', 'Khurasan')]);
        const result = buildRegionsFromPlaces(data);
        expect(result['Khurasan'].region_code).toBe('Khurasan');
        expect(result['Khurasan'].display).toBe('Khurasan');
    });

    test('assigns distinct colours to different regions', () => {
        const data   = makePlacesData([
            makeFeature('p1', 'RegionA'),
            makeFeature('p2', 'RegionB'),
            makeFeature('p3', 'RegionC')
        ]);
        const result = buildRegionsFromPlaces(data);
        const colors = Object.values(result).map(r => r.color);
        const unique  = new Set(colors);
        expect(unique.size).toBe(3);
    });

    test('colours cycle through REGION_COLOR_PALETTE and do not throw when more regions than palette entries exist', () => {
        const manyRegions = Array.from({ length: REGION_COLOR_PALETTE.length + 5 }, function(_, i) {
            return makeFeature('place' + i, 'Region' + i);
        });
        const data   = makePlacesData(manyRegions);
        expect(() => buildRegionsFromPlaces(data)).not.toThrow();
        const result = buildRegionsFromPlaces(data);
        expect(Object.keys(result)).toHaveLength(REGION_COLOR_PALETTE.length + 5);
    });

    test('colours assigned are valid hex strings from the palette', () => {
        const data   = makePlacesData([makeFeature('p1', 'Faris')]);
        const result = buildRegionsFromPlaces(data);
        expect(result['Faris'].color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(REGION_COLOR_PALETTE).toContain(result['Faris'].color);
    });

    test('handles NoRegion URI without crashing', () => {
        const data   = makePlacesData([makeFeature('p1', 'NoRegion')]);
        const result = buildRegionsFromPlaces(data);
        expect(result).toHaveProperty('NoRegion');
    });
});
