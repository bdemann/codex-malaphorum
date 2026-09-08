import {css, defineElement, html, listen} from 'element-vir';
import {normalize} from '../../../data/normalize.js';
import {buildSearchIndex, searchMalaphors, type MalaphorMatch} from '../../../data/search-index.js';
import type {CodexDatabase, Malaphor} from '../../../data/shapes.js';
import {databaseShape} from '../../../data/shapes.js';
import {storage} from '../../../data/storage.js';
import {router} from '../../../router.js';
import type {GlossLine} from '../malaphor/idiom-gloss.element.js';
import {MalaphorRow} from '../malaphor/malaphor-row.element.js';
import {formControlFontFix} from '../shared-styles.js';

type SortMode = 'newest' | 'alphabetical';

function isUntagged(malaphor: Malaphor): boolean {
    return malaphor.componentIdiomIds.length === 0;
}

function sortMalaphors(malaphors: readonly Malaphor[], sortMode: SortMode): Malaphor[] {
    const sorted = [...malaphors];
    if (sortMode === 'alphabetical') {
        sorted.sort((a, b) => normalize(a.text).localeCompare(normalize(b.text)));
    } else {
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return sorted;
}

export const CodexPage = defineElement()({
    tagName: 'codex-page',
    styles: css`
        ${formControlFontFix}

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

        .controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 12px;
            font-size: var(--font-size-gloss);
        }

        .untagged-chip {
            border: 1px solid var(--iron-faded);
            border-radius: var(--border-radius);
            padding: 4px 10px;
            background: none;
            font-family: var(--font-serif);
            font-size: var(--font-size-gloss);
            color: var(--iron-faded);
            cursor: pointer;
        }

        .untagged-chip.active {
            background-color: var(--iron-faded);
            color: var(--vellum);
        }

        .sort-toggle button {
            border: none;
            background: none;
            font-family: var(--font-serif);
            font-size: var(--font-size-gloss);
            color: var(--iron-faded);
            cursor: pointer;
            padding: 4px 6px;
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
        searchQuery: string;
        sortMode: SortMode;
        untaggedOnly: boolean;
        removeStorageListener: (() => void) | undefined;
    } {
        return {
            database: storage.get.codex() ?? databaseShape.default,
            searchQuery: '',
            sortMode: 'newest',
            /** Lands filtered when arriving from a Keep import via `/?filter=untagged` (§9). */
            untaggedOnly: Boolean(router.readCurrentRoute().search?.filter?.includes('untagged')),
            removeStorageListener: undefined,
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
        const {database, searchQuery, sortMode, untaggedOnly} = state;
        const untaggedCount = database.malaphors.filter(isUntagged).length;
        const trimmedQuery = searchQuery.trim();

        const index = buildSearchIndex(database.idioms, database.malaphors);

        let matches: MalaphorMatch[];
        if (trimmedQuery) {
            matches = searchMalaphors(index, trimmedQuery);
        } else {
            matches = sortMalaphors(database.malaphors, sortMode).map((malaphor) => {
                return {
                    malaphor,
                };
            });
        }
        if (untaggedOnly) {
            matches = matches.filter(({malaphor}) => isUntagged(malaphor));
        }

        return html`
            <div class="search-bar">
                <input
                    type="search"
                    placeholder="Search malaphors…"
                    .value=${searchQuery}
                    ${listen('input', (event) => {
                        updateState({
                            searchQuery: (event.target as HTMLInputElement).value,
                        });
                    })}
                />
                <div class="controls">
                    <button
                        class="untagged-chip ${untaggedOnly ? 'active' : ''}"
                        ${listen('click', () => {
                            return updateState({
                                untaggedOnly: !untaggedOnly,
                            });
                        })}
                    >
                        Untagged${untaggedCount ? ` (${untaggedCount})` : ''}
                    </button>
                    <div class="sort-toggle">
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
                            class=${sortMode === 'alphabetical' ? 'active' : ''}
                            ${listen('click', () => {
                                return updateState({
                                    sortMode: 'alphabetical',
                                });
                            })}
                        >
                            A–Z
                        </button>
                    </div>
                </div>
            </div>
            ${database.malaphors.length === 0
                ? html`
                      <p class="empty-state">
                          No malaphors yet. Start with two idioms you can't keep straight.
                      </p>
                  `
                : matches.length === 0
                  ? html`
                        <p class="empty-state">No matches.</p>
                    `
                  : matches.map(({malaphor, matchedIdiom}) => {
                        const glossLines: GlossLine[] = malaphor.componentIdiomIds
                            .map((id) => index.idiomsById.get(id))
                            .filter((idiom) => idiom !== undefined)
                            .map((idiom): GlossLine => {
                                return {
                                    idiomId: idiom.id,
                                    text: idiom.text,
                                    highlighted: idiom.id === matchedIdiom?.id,
                                };
                            });
                        return html`
                            <${MalaphorRow.assign({
                                malaphorId: malaphor.id,
                                malaphorText: malaphor.text,
                                glossLines,
                            })}></${MalaphorRow}>
                        `;
                    })}
        `;
    },
});
