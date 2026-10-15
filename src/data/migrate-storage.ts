import {CURRENT_DATABASE_VERSION} from './shapes.js';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null;
}

/** Applies `backfill` to every record in `entries` that doesn't already have `key`. */
function backfillField(entries: unknown[], key: string, backfill: unknown): unknown[] {
    return entries.map((entry) => {
        if (isRecord(entry) && !(key in entry)) {
            return {
                ...entry,
                [key]: backfill,
            };
        }
        return entry;
    });
}

/**
 * Upgrades a raw, not-yet-validated database to `CURRENT_DATABASE_VERSION`, one version at a time:
 *
 * - V1 -> v2: backfills `rating: 0` onto every malaphor.
 * - V2 -> v3: backfills `tags: []` onto every idiom.
 *
 * Operates on the raw value because a failed shape validation on old data would otherwise look like
 * data loss rather than a schema upgrade, whether that data came from localStorage or an imported
 * export file.
 */
export function migrateDatabaseIfNeeded(database: unknown): unknown {
    if (!isRecord(database)) {
        return database;
    }

    const version = database.version;
    const {idioms, malaphors} = database;
    if (
        typeof version !== 'number' ||
        version >= CURRENT_DATABASE_VERSION ||
        !Array.isArray(idioms) ||
        !Array.isArray(malaphors)
    ) {
        return database;
    }

    return {
        ...database,
        version: CURRENT_DATABASE_VERSION,
        idioms: backfillField(backfillField(idioms, 'tags', []), 'sourceUrl', ''),
        malaphors: version < 2 ? backfillField(malaphors, 'rating', 0) : malaphors,
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
