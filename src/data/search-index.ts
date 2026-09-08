import {normalize} from './normalize.js';
import type {Idiom, Malaphor} from './shapes.js';

export type IdiomMatch = {
    idiom: Idiom;
    /** Set when the match came from an alias rather than the idiom's own text. */
    matchedAlias?: string | undefined;
};

export type MalaphorMatch = {
    malaphor: Malaphor;
    /** Set when the match came from a component idiom rather than the malaphor's own text. */
    matchedIdiom?: Idiom | undefined;
};

type NormalizedEntry<T> = {
    entry: T;
    /** Normalized own text, plus (for idioms) normalized aliases. */
    normalizedTexts: string[];
    tokens: Set<string>;
};

export type SearchIndex = {
    idioms: NormalizedEntry<Idiom>[];
    malaphors: NormalizedEntry<Malaphor>[];
    idiomsById: Map<string, Idiom>;
};

function tokenize(normalized: string): Set<string> {
    return new Set(normalized.split(' ').filter(Boolean));
}

export function buildSearchIndex(
    idioms: readonly Idiom[],
    malaphors: readonly Malaphor[],
): SearchIndex {
    const idiomsById = new Map(
        idioms.map((idiom) => {
            return [
                idiom.id,
                idiom,
            ] as const;
        }),
    );

    return {
        idiomsById,
        idioms: idioms.map((idiom) => {
            const normalizedTexts = [
                normalize(idiom.text),
                ...idiom.aliases.map(normalize),
            ];
            return {
                entry: idiom,
                normalizedTexts,
                tokens: tokenize(normalizedTexts.join(' ')),
            };
        }),
        malaphors: malaphors.map((malaphor) => {
            const componentTexts = malaphor.componentIdiomIds
                .map((id) => idiomsById.get(id))
                .filter((idiom): idiom is Idiom => idiom !== undefined)
                .map((idiom) => normalize(idiom.text));
            const normalizedTexts = [
                normalize(malaphor.text),
                ...componentTexts,
            ];
            return {
                entry: malaphor,
                normalizedTexts,
                tokens: tokenize(normalizedTexts.join(' ')),
            };
        }),
    };
}

type RankableText = Readonly<{
    normalizedTexts: readonly string[];
    tokens: ReadonlySet<string>;
}>;

type RankQuery = Readonly<{
    normalizedQuery: string;
    queryTokens: ReadonlySet<string>;
}>;

/**
 * Deterministic ranking, in order (no scoring heuristics):
 *
 * 1. Exact normalized match 2. Normalized text starts with the query 3. Normalized text contains the
 *    query as a substring 4. All query tokens present, any order 5. Any query token present
 */
function rank(text: RankableText, query: RankQuery): number {
    const {normalizedTexts, tokens} = text;
    const {normalizedQuery, queryTokens} = query;

    if (normalizedTexts.includes(normalizedQuery)) {
        return 1;
    } else if (normalizedTexts.some((candidate) => candidate.startsWith(normalizedQuery))) {
        return 2;
    } else if (normalizedTexts.some((candidate) => candidate.includes(normalizedQuery))) {
        return 3;
    } else if ([...queryTokens].every((token) => tokens.has(token))) {
        return 4;
    } else if ([...queryTokens].some((token) => tokens.has(token))) {
        return 5;
    } else {
        return 0;
    }
}

function rankSingleText(text: string, query: RankQuery): number {
    const normalizedText = normalize(text);
    return rank(
        {
            normalizedTexts: [normalizedText],
            tokens: tokenize(normalizedText),
        },
        query,
    );
}

/**
 * Idiom search additionally matches `aliases`; a match via alias is reported so it's never unclear
 * why a result appeared.
 */
export function searchIdioms(index: SearchIndex, query: string, limit?: number): IdiomMatch[] {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
        return [];
    }
    const rankQuery: RankQuery = {
        normalizedQuery,
        queryTokens: tokenize(normalizedQuery),
    };

    const ranked = index.idioms
        .map((normalizedEntry) => {
            return {
                normalizedEntry,
                score: rank(normalizedEntry, rankQuery),
            };
        })
        .filter(({score}) => score > 0)
        .sort((a, b) => a.score - b.score);

    const matches = ranked.map(({normalizedEntry}): IdiomMatch => {
        const idiom = normalizedEntry.entry;
        if (rankSingleText(idiom.text, rankQuery) > 0) {
            return {
                idiom,
            };
        }
        const matchedAlias = idiom.aliases.find((alias) => rankSingleText(alias, rankQuery) > 0);
        return {
            idiom,
            matchedAlias,
        };
    });

    return limit === undefined ? matches : matches.slice(0, limit);
}

/** Malaphor search searches both its own text and its component idioms' text. */
export function searchMalaphors(
    index: SearchIndex,
    query: string,
    limit?: number,
): MalaphorMatch[] {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
        return [];
    }
    const rankQuery: RankQuery = {
        normalizedQuery,
        queryTokens: tokenize(normalizedQuery),
    };

    const ranked = index.malaphors
        .map((normalizedEntry) => {
            return {
                normalizedEntry,
                score: rank(normalizedEntry, rankQuery),
            };
        })
        .filter(({score}) => score > 0)
        .sort((a, b) => a.score - b.score);

    const matches = ranked.map(({normalizedEntry}): MalaphorMatch => {
        const malaphor = normalizedEntry.entry;
        if (rankSingleText(malaphor.text, rankQuery) > 0) {
            return {
                malaphor,
            };
        }
        const matchedIdiom = malaphor.componentIdiomIds
            .map((id) => index.idiomsById.get(id))
            .find((idiom): idiom is Idiom => {
                return idiom !== undefined && rankSingleText(idiom.text, rankQuery) > 0;
            });
        return {
            malaphor,
            matchedIdiom,
        };
    });

    return limit === undefined ? matches : matches.slice(0, limit);
}
