import {assert} from '@augment-vir/assert';
import {itCases} from '@augment-vir/test';
import {describe, it} from 'node:test';
import {checkForCollision, findMalaphorsSharingComponents} from './collisions.js';
import type {Malaphor} from './shapes.js';

const idiomA = '00000000-0000-4000-8000-00000000000a';
const idiomB = '00000000-0000-4000-8000-00000000000b';
const idiomC = '00000000-0000-4000-8000-00000000000c';

function fakeMalaphor(overrides: Partial<Malaphor> & Pick<Malaphor, 'id' | 'text'>): Malaphor {
    return {
        componentIdiomIds: [],
        notes: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    };
}

const burnBridge = fakeMalaphor({
    id: '00000000-0000-4000-8000-0000000000b1',
    text: "We'll burn that bridge when we come to it",
    componentIdiomIds: [
        idiomA,
        idiomB,
    ],
});

const crossFinger = fakeMalaphor({
    id: '00000000-0000-4000-8000-0000000000c1',
    text: "I'll cross my fingers and hope for the best",
    componentIdiomIds: [idiomC],
});

const existingMalaphors: Malaphor[] = [
    burnBridge,
    crossFinger,
];

describe(checkForCollision.name, () => {
    itCases(checkForCollision, [
        {
            it: 'finds an exact normalized text duplicate',
            inputs: [
                {
                    text: 'we’ll burn that bridge when we come to it!',
                    componentIdiomIds: [],
                },
                existingMalaphors,
                undefined,
            ],
            expect: {
                type: 'exact-duplicate',
                matchedMalaphor: burnBridge,
            },
        },
        {
            it: 'finds a same-component-set match with different wording and order',
            inputs: [
                {
                    text: "We'll cross that bridge when we burn it",
                    componentIdiomIds: [
                        idiomB,
                        idiomA,
                    ],
                },
                existingMalaphors,
                undefined,
            ],
            expect: {
                type: 'same-components',
                matchedMalaphor: burnBridge,
            },
        },
        {
            it: 'prefers exact-duplicate over same-components when both would fire',
            inputs: [
                {
                    text: burnBridge.text,
                    componentIdiomIds: [
                        idiomB,
                        idiomA,
                    ],
                },
                existingMalaphors,
                undefined,
            ],
            expect: {
                type: 'exact-duplicate',
                matchedMalaphor: burnBridge,
            },
        },
        {
            it: 'excludes the malaphor being edited from matching itself',
            inputs: [
                {
                    text: burnBridge.text,
                    componentIdiomIds: burnBridge.componentIdiomIds,
                },
                existingMalaphors,
                burnBridge.id,
            ],
            expect: undefined,
        },
        {
            it: 'does not flag an untagged (empty component) malaphor as a same-component match',
            inputs: [
                {
                    text: 'a brand new malaphor',
                    componentIdiomIds: [],
                },
                existingMalaphors,
                undefined,
            ],
            expect: undefined,
        },
        {
            it: 'returns undefined when nothing matches',
            inputs: [
                {
                    text: 'a brand new malaphor',
                    componentIdiomIds: [
                        idiomA,
                        idiomC,
                    ],
                },
                existingMalaphors,
                undefined,
            ],
            expect: undefined,
        },
    ]);
});

describe(findMalaphorsSharingComponents.name, () => {
    itCases(findMalaphorsSharingComponents, [
        {
            it: 'finds malaphors sharing at least one component idiom',
            inputs: [
                {
                    componentIdiomIds: [idiomA],
                },
                existingMalaphors,
                undefined,
            ],
            expect: [burnBridge],
        },
        {
            it: 'excludes the malaphor being edited from its own shared-component list',
            inputs: [
                {
                    componentIdiomIds: burnBridge.componentIdiomIds,
                },
                existingMalaphors,
                burnBridge.id,
            ],
            expect: [],
        },
        {
            it: 'returns an empty array for an untagged candidate',
            inputs: [
                {
                    componentIdiomIds: [],
                },
                existingMalaphors,
                undefined,
            ],
            expect: [],
        },
        {
            it: 'returns an empty array when no idiom overlaps',
            inputs: [
                {
                    componentIdiomIds: ['00000000-0000-4000-8000-00000000000d'],
                },
                existingMalaphors,
                undefined,
            ],
            expect: [],
        },
    ]);
});

describe('collision checks integration', () => {
    it('flags shared components as informational without blocking save', () => {
        const sharing = findMalaphorsSharingComponents(
            {
                componentIdiomIds: [idiomA],
            },
            existingMalaphors,
        );
        const blocking = checkForCollision(
            {
                text: 'totally different phrasing',
                componentIdiomIds: [idiomA],
            },
            existingMalaphors,
        );

        assert.deepEquals(sharing, [burnBridge]);
        assert.strictEquals(blocking, undefined);
    });
});
