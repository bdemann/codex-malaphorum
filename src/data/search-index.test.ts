import {assert} from '@augment-vir/assert';
import {describe, it} from 'node:test';
import {buildSearchIndex, searchIdioms, searchMalaphors} from './search-index.js';
import type {Idiom, Malaphor} from './shapes.js';

function fakeIdiom(overrides: Partial<Idiom> & Pick<Idiom, 'id' | 'text'>): Idiom {
    return {
        aliases: [],
        notes: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    };
}

function fakeMalaphor(overrides: Partial<Malaphor> & Pick<Malaphor, 'id' | 'text'>): Malaphor {
    return {
        componentIdiomIds: [],
        notes: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    };
}

const idiomA = '00000000-0000-4000-8000-00000000000a';
const idiomB = '00000000-0000-4000-8000-00000000000b';
const idiomC = '00000000-0000-4000-8000-00000000000c';
const danglingId = '00000000-0000-4000-8000-0000000000dd';

const burnBridge = fakeIdiom({
    id: idiomA,
    text: 'burn a bridge',
});
const crossBridge = fakeIdiom({
    id: idiomB,
    text: 'cross that bridge when we come to it',
    // Deliberately shares no tokens with the canonical text, so a query matching only the alias
    // can't accidentally tier-5-match the canonical text too.
    aliases: ['jump the gun'],
});
const ballCourt = fakeIdiom({
    id: idiomC,
    text: 'the ball is in your court',
});

const idioms = [
    burnBridge,
    crossBridge,
    ballCourt,
];

describe(searchIdioms.name, () => {
    it('returns nothing for an empty query', () => {
        const index = buildSearchIndex(idioms, []);
        assert.deepEquals(searchIdioms(index, '   '), []);
    });

    it('ranks an exact normalized match first (tier 1)', () => {
        const index = buildSearchIndex(idioms, []);
        const results = searchIdioms(index, 'burn a bridge');
        assert.strictEquals(results[0]?.idiom.id, idiomA);
    });

    it('matches a text that starts with the query (tier 2)', () => {
        const index = buildSearchIndex(idioms, []);
        const results = searchIdioms(index, 'cross that');
        assert.strictEquals(results.length, 1);
        assert.strictEquals(results[0]?.idiom.id, idiomB);
    });

    it('matches a substring (tier 3)', () => {
        const index = buildSearchIndex(idioms, []);
        const results = searchIdioms(index, 'that bridge');
        assert.strictEquals(results[0]?.idiom.id, idiomB);
    });

    it('matches when all query tokens are present, any order (tier 4)', () => {
        const index = buildSearchIndex(idioms, []);
        const results = searchIdioms(index, 'court ball');
        assert.strictEquals(results.length, 1);
        assert.strictEquals(results[0]?.idiom.id, idiomC);
    });

    it('matches when only some query tokens are present (tier 5)', () => {
        const index = buildSearchIndex(idioms, []);
        const results = searchIdioms(index, 'ball nonexistentword');
        assert.strictEquals(results.length, 1);
        assert.strictEquals(results[0]?.idiom.id, idiomC);
    });

    it('excludes idioms matching no tier at all', () => {
        const index = buildSearchIndex(idioms, []);
        assert.deepEquals(searchIdioms(index, 'zzznomatch'), []);
    });

    it('reports a match via alias, distinct from an own-text match', () => {
        const index = buildSearchIndex(idioms, []);
        const [result] = searchIdioms(index, 'jump the gun');
        assert.strictEquals(result?.idiom.id, idiomB);
        assert.strictEquals(result.matchedAlias, 'jump the gun');
    });

    it('does not set matchedAlias when the own text already matched', () => {
        const index = buildSearchIndex(idioms, []);
        const [result] = searchIdioms(index, 'burn a bridge');
        assert.strictEquals(result?.matchedAlias, undefined);
    });

    it('respects a result limit', () => {
        const index = buildSearchIndex(idioms, []);
        const results = searchIdioms(index, 'bridge', 1);
        assert.strictEquals(results.length, 1);
    });
});

describe(searchMalaphors.name, () => {
    it('returns nothing for an empty query', () => {
        const index = buildSearchIndex(idioms, []);
        assert.deepEquals(searchMalaphors(index, ''), []);
    });

    it('matches a malaphor by its own text', () => {
        const malaphor = fakeMalaphor({
            id: '00000000-0000-4000-8000-000000000101',
            text: "We'll burn that bridge when we come to it",
            componentIdiomIds: [
                idiomA,
                idiomB,
            ],
        });
        const index = buildSearchIndex(idioms, [malaphor]);
        const [result] = searchMalaphors(index, 'burn that bridge');
        assert.strictEquals(result?.malaphor.id, malaphor.id);
        assert.strictEquals(result.matchedIdiom, undefined);
    });

    it('matches a malaphor via a component idiom, reporting which one', () => {
        const malaphor = fakeMalaphor({
            id: '00000000-0000-4000-8000-000000000102',
            text: 'A totally unrelated blend',
            componentIdiomIds: [
                idiomA,
                idiomC,
            ],
        });
        const index = buildSearchIndex(idioms, [malaphor]);
        const [result] = searchMalaphors(index, 'ball court');
        assert.strictEquals(result?.malaphor.id, malaphor.id);
        assert.strictEquals(result.matchedIdiom?.id, idiomC);
    });

    it('ignores component ids that no longer resolve to an idiom', () => {
        const malaphor = fakeMalaphor({
            // No shared tokens with "burn a bridge" -- even the article "a" would otherwise
            // tier-5-match and mask what this test is actually checking.
            id: '00000000-0000-4000-8000-000000000103',
            text: 'Completely unconnected phrase here',
            componentIdiomIds: [
                danglingId,
                idiomA,
            ],
        });
        const index = buildSearchIndex(idioms, [malaphor]);
        const [result] = searchMalaphors(index, 'burn a bridge');
        assert.strictEquals(result?.matchedIdiom?.id, idiomA);
    });

    it('excludes malaphors matching no tier at all', () => {
        const malaphor = fakeMalaphor({
            id: '00000000-0000-4000-8000-000000000104',
            text: 'Nothing in here matches',
            componentIdiomIds: [idiomA],
        });
        const index = buildSearchIndex(idioms, [malaphor]);
        assert.deepEquals(searchMalaphors(index, 'zzznomatch'), []);
    });

    it('respects a result limit', () => {
        const first = fakeMalaphor({
            id: '00000000-0000-4000-8000-000000000105',
            text: 'burn a bridge one',
            componentIdiomIds: [idiomA],
        });
        const second = fakeMalaphor({
            id: '00000000-0000-4000-8000-000000000106',
            text: 'burn a bridge two',
            componentIdiomIds: [idiomA],
        });
        const index = buildSearchIndex(idioms, [
            first,
            second,
        ]);
        const results = searchMalaphors(index, 'burn a bridge', 1);
        assert.strictEquals(results.length, 1);
    });
});
