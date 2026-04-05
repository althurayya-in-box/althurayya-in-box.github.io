/**
 * Tests for the DijksGraph shortest-path implementation (dijkstra.js).
 *
 * dijkstra.js is a self-contained IIFE with no external dependencies, so it
 * can be loaded directly into a vm context.
 */
const { loadSource } = require('./helpers/loadSource');

const { DijksGraph } = loadSource('dijkstra.js');

// ─── helpers ────────────────────────────────────────────────────────────────

/** Build a DijksGraph from a plain adjacency-weight map. */
function makeGraph(edges) {
    return new DijksGraph(edges);
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('DijksGraph.findShortestPath', () => {
    test('finds the only path in a simple linear graph A→B→C', () => {
        const g = makeGraph({ A: { B: 1 }, B: { A: 1, C: 2 }, C: { B: 2 } });
        expect(g.findShortestPath('A', 'C')).toEqual(['A', 'B', 'C']);
    });

    test('chooses the shorter of two competing routes', () => {
        // A→B→C costs 2; A→C directly costs 10
        const g = makeGraph({
            A: { B: 1, C: 10 },
            B: { A: 1, C: 1 },
            C: { A: 10, B: 1 }
        });
        expect(g.findShortestPath('A', 'C')).toEqual(['A', 'B', 'C']);
    });

    test('returns null when the destination is unreachable', () => {
        const g = makeGraph({ A: { B: 1 }, C: { D: 1 } });
        expect(g.findShortestPath('A', 'C')).toBeNull();
    });

    test('returns a single-element path when start equals end', () => {
        const g = makeGraph({ A: { B: 1 }, B: { A: 1 } });
        expect(g.findShortestPath('A', 'A')).toEqual(['A']);
    });

    test('handles asymmetric edge weights correctly', () => {
        // Reverse direction is much cheaper: C→B→A costs 2, A→B→C costs 200
        const g = makeGraph({
            A: { B: 100 },
            B: { A: 100, C: 100 },
            C: { B: 1 },
            D: { A: 1, C: 200 }
        });
        // D→A→B→C costs 201; D→C→B→A would not reach A cheaper than 201 via D→A=1
        const path = g.findShortestPath('D', 'C');
        expect(path).not.toBeNull();
        expect(path[0]).toBe('D');
        expect(path[path.length - 1]).toBe('C');
    });

    test('accepts an array of waypoints and chains sub-paths', () => {
        const g = makeGraph({
            A: { B: 1 },
            B: { A: 1, C: 1 },
            C: { B: 1, D: 1 },
            D: { C: 1 }
        });
        // Should produce A→B and then B→C→D joined together
        expect(g.findShortestPath(['A', 'B', 'D'])).toEqual(['A', 'B', 'C', 'D']);
    });

    test('works on a larger graph with multiple possible paths', () => {
        const g = makeGraph({
            S: { A: 1, B: 4 },
            A: { S: 1, B: 2, C: 5 },
            B: { S: 4, A: 2, C: 1 },
            C: { A: 5, B: 1 }
        });
        // S→A=1, A→B=2, B→C=1 total=4; S→B=4, B→C=1 total=5 → shortest is S→A→B→C
        expect(g.findShortestPath('S', 'C')).toEqual(['S', 'A', 'B', 'C']);
    });

    test('returns null for an empty graph', () => {
        const g = makeGraph({});
        expect(g.findShortestPath('A', 'B')).toBeNull();
    });
});
