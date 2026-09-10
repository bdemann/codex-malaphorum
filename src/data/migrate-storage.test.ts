import {assert} from '@augment-vir/assert';
import {describe, it} from 'node:test';
import {migrateStorage} from './migrate-storage.js';

const storeName = 'codex-malaphorum';

function fakeStorage(initial: Record<string, string> = {}) {
    const data = {
        ...initial,
    };
    return {
        getItem: (key: string) => (key in data ? (data[key] ?? null) : null),
        // eslint-disable-next-line @virmator/prefer-params-object -- must match Storage.setItem's native signature.
        setItem: (key: string, value: string) => {
            data[key] = value;
        },
        read: () => data[storeName],
    };
}

describe(migrateStorage.name, () => {
    it('does nothing when nothing is stored', () => {
        const storage = fakeStorage();
        migrateStorage(storage, storeName);
        assert.strictEquals(storage.read(), undefined);
    });

    it('does nothing when the stored value is not valid JSON', () => {
        const storage = fakeStorage({
            [storeName]: 'not json',
        });
        migrateStorage(storage, storeName);
        assert.strictEquals(storage.read(), 'not json');
    });

    it('does nothing when the stored value parses to a non-object', () => {
        const storage = fakeStorage({
            [storeName]: '5',
        });
        migrateStorage(storage, storeName);
        assert.strictEquals(storage.read(), '5');
    });

    it('does nothing when already at the current version', () => {
        const stored = JSON.stringify({
            codex: {
                version: 2,
                idioms: [],
                malaphors: [
                    {
                        id: 'a',
                        rating: 3,
                    },
                ],
            },
        });
        const storage = fakeStorage({
            [storeName]: stored,
        });
        migrateStorage(storage, storeName);
        assert.strictEquals(storage.read(), stored);
    });

    it('backfills rating: 0 onto every malaphor and bumps the version', () => {
        const storage = fakeStorage({
            [storeName]: JSON.stringify({
                codex: {
                    version: 1,
                    idioms: [],
                    malaphors: [
                        {
                            id: 'a',
                            text: 'one',
                        },
                        {
                            id: 'b',
                            text: 'two',
                        },
                    ],
                },
            }),
        });

        migrateStorage(storage, storeName);

        const migrated = JSON.parse(storage.read() ?? '');
        assert.strictEquals(migrated.codex.version, 2);
        assert.deepEquals(
            migrated.codex.malaphors.map((malaphor: {rating: number}) => malaphor.rating),
            [
                0,
                0,
            ],
        );
    });

    it('leaves an already-present rating untouched', () => {
        const storage = fakeStorage({
            [storeName]: JSON.stringify({
                codex: {
                    version: 1,
                    idioms: [],
                    malaphors: [
                        {
                            id: 'a',
                            rating: 4,
                        },
                    ],
                },
            }),
        });

        migrateStorage(storage, storeName);

        const migrated = JSON.parse(storage.read() ?? '');
        assert.strictEquals(migrated.codex.malaphors[0].rating, 4);
    });

    it('does nothing when the stored value has no codex key', () => {
        const stored = JSON.stringify({
            settings: {},
        });
        const storage = fakeStorage({
            [storeName]: stored,
        });
        migrateStorage(storage, storeName);
        assert.strictEquals(storage.read(), stored);
    });

    it('does nothing when malaphors is missing or malformed', () => {
        const stored = JSON.stringify({
            codex: {
                version: 1,
                idioms: [],
            },
        });
        const storage = fakeStorage({
            [storeName]: stored,
        });
        migrateStorage(storage, storeName);
        assert.strictEquals(storage.read(), stored);
    });
});
