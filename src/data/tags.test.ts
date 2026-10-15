import {assert} from '@augment-vir/assert';
import {describe, it} from 'node:test';
import {collectTags, filterIdiomsByTags, parseTags} from './tags.js';

describe(parseTags.name, () => {
    it('splits on commas, trims, and lowercases', () => {
        assert.deepEquals(parseTags(' Sports,  Nautical '), [
            'sports',
            'nautical',
        ]);
    });

    it('drops empty entries and duplicates', () => {
        assert.deepEquals(parseTags('sports,,Sports, sports,'), ['sports']);
    });

    it('returns an empty array for blank input', () => {
        assert.deepEquals(parseTags('  '), []);
    });
});

describe(collectTags.name, () => {
    it('counts tags across idioms, alphabetically', () => {
        assert.deepEquals(
            collectTags([
                {
                    tags: [
                        'sports',
                        'nautical',
                    ],
                },
                {
                    tags: ['sports'],
                },
                {
                    tags: [],
                },
            ]),
            [
                {
                    tag: 'nautical',
                    count: 1,
                },
                {
                    tag: 'sports',
                    count: 2,
                },
            ],
        );
    });

    it('returns an empty array when nothing is tagged', () => {
        assert.deepEquals(
            collectTags([
                {
                    tags: [],
                },
            ]),
            [],
        );
    });
});

describe(filterIdiomsByTags.name, () => {
    const idioms = [
        {
            id: 'a',
            tags: ['sports'],
        },
        {
            id: 'b',
            tags: [
                'nautical',
                'military',
            ],
        },
        {
            id: 'c',
            tags: [],
        },
    ];

    it('keeps everything for an empty selection', () => {
        assert.deepEquals(filterIdiomsByTags(idioms, new Set()), idioms);
    });

    it('keeps idioms matching any selected tag', () => {
        assert.deepEquals(
            filterIdiomsByTags(
                idioms,
                new Set([
                    'sports',
                    'military',
                ]),
            ).map((idiom) => idiom.id),
            [
                'a',
                'b',
            ],
        );
    });

    it('returns nothing when no idiom has the selected tag', () => {
        assert.deepEquals(filterIdiomsByTags(idioms, new Set(['biblical'])), []);
    });
});
