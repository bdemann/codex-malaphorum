import {CURRENT_DATABASE_VERSION} from './shapes.js';

type JsonRecord = Record<string, unknown>;

/**
 * One-off migration for pre-rating data (`databaseShape.version` 1): backfills `rating: 0` onto
 * every malaphor so the now-required field validates. Takes and returns a raw, not-yet-validated
 * value -- a failed shape validation on old data would otherwise look like data loss rather than a
 * schema upgrade, whether that data came from localStorage or an imported export file.
 */
export function migrateDatabaseIfNeeded(database: unknown): unknown {
    if (typeof database !== 'object' || database === null) {
        return database;
    }

    const databaseRecord = database as JsonRecord;
    const version = databaseRecord.version;
    const malaphors = databaseRecord.malaphors;
    if (
        typeof version !== 'number' ||
        version >= CURRENT_DATABASE_VERSION ||
        !Array.isArray(malaphors)
    ) {
        return database;
    }

    const migratedMalaphors = malaphors.map((malaphor) => {
        if (typeof malaphor === 'object' && malaphor !== null && !('rating' in malaphor)) {
            return {
                ...malaphor,
                rating: 0,
            };
        }
        return malaphor;
    });

    return {
        ...databaseRecord,
        version: CURRENT_DATABASE_VERSION,
        malaphors: migratedMalaphors,
    };
}

/**
 * Runs `migrateDatabaseIfNeeded` against the `codex` entry of a `LocalStorageClient`'s raw JSON
 * blob, writing the result back if anything changed. Must run before anything calls
 * `storage.get.codex()` (see the top of vir-app.element.ts) -- `LocalStorageClient` validates
 * against the shape on read and silently drops the whole database on a mismatch.
 */
export function migrateStorage(
    storageLike: Pick<Storage, 'getItem' | 'setItem'>,
    storeName: string,
): void {
    const raw = storageLike.getItem(storeName);
    if (!raw) {
        return;
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return;
    }
    if (typeof parsed !== 'object' || parsed === null) {
        return;
    }

    const container = parsed as JsonRecord;
    const migrated = migrateDatabaseIfNeeded(container.codex);
    if (migrated === container.codex) {
        return;
    }

    container.codex = migrated;
    storageLike.setItem(storeName, JSON.stringify(container));
}
