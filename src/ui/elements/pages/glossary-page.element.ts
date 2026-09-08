import {css, defineElement, html, listen} from 'element-vir';
import {normalize} from '../../../data/normalize.js';
import {buildSearchIndex, searchIdioms} from '../../../data/search-index.js';
import type {CodexDatabase, Idiom} from '../../../data/shapes.js';
import {databaseShape} from '../../../data/shapes.js';
import {storage} from '../../../data/storage.js';
import {IdiomRow} from '../malaphor/idiom-row.element.js';

type SortMode = 'alphabetical' | 'newest' | 'most-used';

function sortIdioms(
    idioms: readonly Idiom[],
    usageCounts: Map<string, number>,
    sortMode: SortMode,
): Idiom[] {
    const sorted = [...idioms];
    if (sortMode === 'newest') {
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sortMode === 'most-used') {
        sorted.sort((a, b) => (usageCounts.get(b.id) ?? 0) - (usageCounts.get(a.id) ?? 0));
    } else {
        sorted.sort((a, b) => normalize(a.text).localeCompare(normalize(b.text)));
    }
    return sorted;
}

export const GlossaryPage = defineElement()({
    tagName: 'glossary-page',
    styles: css`
        :host {
            display: block;
        }

        .search-bar {
            position: sticky;
            top: 0;
            background-color: var(--vellum);
            padding: 16px 20px;
            border-bottom: 1px solid color-mix(in srgb, var(--iron-faded) 20%, transparent);
        }

        input[type='search'] {
            width: 100%;
            box-sizing: border-box;
            padding: 10px 12px;
            background-color: var(--vellum-deep);
            border: none;
            border-radius: var(--border-radius);
            font-family: var(--font-serif);
            font-size: var(--font-size-body);
            color: var(--iron-gall);
        }

        .sort-toggle {
            display: flex;
            gap: 12px;
            margin-top: 12px;
            font-size: var(--font-size-gloss);
        }

        .sort-toggle button {
            border: none;
            background: none;
            font-family: var(--font-serif);
            font-size: var(--font-size-gloss);
            color: var(--iron-faded);
            cursor: pointer;
            padding: 4px 0;
        }

        .sort-toggle button.active {
            color: var(--iron-gall);
            text-decoration: underline;
        }

        .empty-state {
            padding: 40px 20px;
            color: var(--iron-faded);
            font-size: var(--font-size-body);
        }
    `,
    state(): {
        database: CodexDatabase;
        removeStorageListener: (() => void) | undefined;
        searchQuery: string;
        sortMode: SortMode;
    } {
        return {
            database: storage.get.codex() ?? databaseShape.default,
            removeStorageListener: undefined,
            searchQuery: '',
            sortMode: 'alphabetical',
        };
    },
    init({updateState}) {
        const removeStorageListener = storage.listen.codex((value) => {
            updateState({
                database: value ?? databaseShape.default,
            });
        });
        updateState({
            removeStorageListener,
        });
    },
    cleanup({state}) {
        state.removeStorageListener?.();
    },
    render({state, updateState}) {
        const {database, searchQuery, sortMode} = state;
        const trimmedQuery = searchQuery.trim();

        const usageCounts = new Map<string, number>();
        for (const malaphor of database.malaphors) {
            for (const idiomId of malaphor.componentIdiomIds) {
                usageCounts.set(idiomId, (usageCounts.get(idiomId) ?? 0) + 1);
            }
        }

        let idioms: Idiom[];
        if (trimmedQuery) {
            const index = buildSearchIndex(database.idioms, []);
            idioms = searchIdioms(index, trimmedQuery).map((match) => match.idiom);
        } else {
            idioms = sortIdioms(database.idioms, usageCounts, sortMode);
        }

        return html`
            <div class="search-bar">
                <input
                    type="search"
                    placeholder="Search idioms…"
                    .value=${searchQuery}
                    ${listen('input', (event) => {
                        updateState({
                            searchQuery: (event.target as HTMLInputElement).value,
                        });
                    })}
                />
                <div class="sort-toggle">
                    <button
                        class=${sortMode === 'alphabetical' ? 'active' : ''}
                        ${listen('click', () => {
                            return updateState({
                                sortMode: 'alphabetical',
                            });
                        })}
                    >
                        A–Z
                    </button>
                    <button
                        class=${sortMode === 'newest' ? 'active' : ''}
                        ${listen('click', () => {
                            return updateState({
                                sortMode: 'newest',
                            });
                        })}
                    >
                        Newest
                    </button>
                    <button
                        class=${sortMode === 'most-used' ? 'active' : ''}
                        ${listen('click', () => {
                            return updateState({
                                sortMode: 'most-used',
                            });
                        })}
                    >
                        Most used
                    </button>
                </div>
            </div>
            ${database.idioms.length === 0
                ? html`
                      <p class="empty-state">
                          No idioms yet. Add one from the typeahead while composing a malaphor.
                      </p>
                  `
                : idioms.length === 0
                  ? html`
                        <p class="empty-state">No matches.</p>
                    `
                  : idioms.map((idiom) => {
                        return html`
                            <${IdiomRow.assign({
                                idiomId: idiom.id,
                                idiomText: idiom.text,
                                usageCount: usageCounts.get(idiom.id) ?? 0,
                            })}></${IdiomRow}>
                        `;
                    })}
        `;
    },
});
