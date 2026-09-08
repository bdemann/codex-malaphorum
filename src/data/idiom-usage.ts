import type {CodexDatabase} from './shapes.js';

/** Most-recently-used idiom ids first, ranked by the newest malaphor that used each one. */
export function computeRecentIdiomIds(database: CodexDatabase): string[] {
    const lastUsedAt = new Map<string, string>();
    for (const malaphor of database.malaphors) {
        for (const idiomId of malaphor.componentIdiomIds) {
            const existing = lastUsedAt.get(idiomId);
            if (!existing || malaphor.createdAt > existing) {
                lastUsedAt.set(idiomId, malaphor.createdAt);
            }
        }
    }
    return [...lastUsedAt.entries()].toSorted((a, b) => b[1].localeCompare(a[1])).map(([id]) => id);
}
