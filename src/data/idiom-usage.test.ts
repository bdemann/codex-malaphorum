import {assert} from '@augment-vir/assert';
import {describe, it} from 'node:test';
import {computeRecentIdiomIds} from './idiom-usage.js';
import type {CodexDatabase, Malaphor} from './shapes.js';

const idiomA = '00000000-0000-4000-8000-00000000000a';
const idiomB = '00000000-0000-4000-8000-00000000000b';
const idiomC = '00000000-0000-4000-8000-00000000000c';

function fakeMalaphor(overrides: Partial<Malaphor> & Pick<Malaphor, 'id' | 'text'>): Malaphor {
    return {
        componentIdiomIds: [],
        notes: '',
        rating: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    };
}

function fakeDatabase(malaphors: Malaphor[]): CodexDatabase {
    return {
        version: 1,
        idioms: [],
        malaphors,
    };
}

describe(computeRecentIdiomIds.name, () => {
    it('returns nothing for a database with no malaphors', () => {
        assert.deepEquals(computeRecentIdiomIds(fakeDatabase([])), []);
    });

    it('ranks idioms by the newest malaphor that used them', () => {
        const database = fakeDatabase([
            fakeMalaphor({
                id: '00000000-0000-4000-8000-0000000000b1',
                text: 'oldest',
                componentIdiomIds: [idiomA],
                createdAt: '2026-01-01T00:00:00.000Z',
            }),
            fakeMalaphor({
                id: '00000000-0000-4000-8000-0000000000b2',
                text: 'newest',
                componentIdiomIds: [idiomB],
                createdAt: '2026-01-03T00:00:00.000Z',
            }),
            fakeMalaphor({
                id: '00000000-0000-4000-8000-0000000000b3',
                text: 'middle',
                componentIdiomIds: [idiomC],
                createdAt: '2026-01-02T00:00:00.000Z',
            }),
        ]);
        assert.deepEquals(computeRecentIdiomIds(database), [
            idiomB,
            idiomC,
            idiomA,
        ]);
    });

    it('uses an idiom’s most recent use, not its first', () => {
        const database = fakeDatabase([
            fakeMalaphor({
                id: '00000000-0000-4000-8000-0000000000b1',
                text: 'first use',
                componentIdiomIds: [idiomA],
                createdAt: '2026-01-01T00:00:00.000Z',
            }),
            fakeMalaphor({
                id: '00000000-0000-4000-8000-0000000000b2',
                text: 'other idiom',
                componentIdiomIds: [idiomB],
                createdAt: '2026-01-02T00:00:00.000Z',
            }),
            fakeMalaphor({
                id: '00000000-0000-4000-8000-0000000000b3',
                text: 'second use',
                componentIdiomIds: [idiomA],
                createdAt: '2026-01-03T00:00:00.000Z',
            }),
        ]);
        assert.deepEquals(computeRecentIdiomIds(database), [
            idiomA,
            idiomB,
        ]);
    });

    it('ignores untagged malaphors', () => {
        const database = fakeDatabase([
            fakeMalaphor({
                id: '00000000-0000-4000-8000-0000000000b1',
                text: 'untagged',
                componentIdiomIds: [],
            }),
        ]);
        assert.deepEquals(computeRecentIdiomIds(database), []);
    });
});
