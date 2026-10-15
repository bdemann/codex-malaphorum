import {removeDuplicates} from '@augment-vir/common';
import type {Idiom} from './shapes.js';

/**
 * Splits a comma-separated tags field into lowercase, trimmed, de-duplicated entries (order of
 * first appearance kept), so "Sports, sports" and "sports" are the same tag.
 */
export function parseTags(rawTags: string): string[] {
    const tags = rawTags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);
    return removeDuplicates(tags);
}

export type TagCount = {tag: string; count: number};

/** Every tag in use across `idioms` with how many idioms carry it, alphabetical by tag. */
export function collectTags(idioms: readonly Pick<Idiom, 'tags'>[]): TagCount[] {
    const counts = new Map<string, number>();
    for (const idiom of idioms) {
        for (const tag of idiom.tags) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
    }
    return [...counts.entries()]
        .map(
            ([
                tag,
                count,
            ]) => {
                return {
                    tag,
                    count,
                };
            },
        )
        .toSorted((a, b) => a.tag.localeCompare(b.tag));
}

/** Keeps idioms carrying at least one of `selectedTags`; an empty selection keeps everything. */
export function filterIdiomsByTags<T extends Pick<Idiom, 'tags'>>(
    idioms: readonly T[],
    selectedTags: ReadonlySet<string>,
): T[] {
    if (!selectedTags.size) {
        return [...idioms];
    }
    return idioms.filter((idiom) => idiom.tags.some((tag) => selectedTags.has(tag)));
}
