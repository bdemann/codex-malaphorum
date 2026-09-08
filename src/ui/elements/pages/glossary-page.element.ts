import {css, defineElement, html, listen} from 'element-vir';
import {normalize} from '../../../data/normalize.js';
import {buildSearchIndex, searchIdioms} from '../../../data/search-index.js';
import type {CodexDatabase, CodexSettings, Idiom} from '../../../data/shapes.js';
import {databaseShape, settingsShape} from '../../../data/shapes.js';
import {storage} from '../../../data/storage.js';
import {idiomDetailRoute, router} from '../../../router.js';
import {IdiomRow} from '../malaphor/idiom-row.element.js';

function pickRandomPair(idioms: readonly Idiom[]):
    | readonly [
          Idiom,
          Idiom,
      ]
    | undefined {
    if (idioms.length < 2) {
        return undefined;
    }
    // eslint-disable-next-line sonarjs/pseudo-random -- picking a UI prompt, not a security context.
    const firstIndex = Math.floor(Math.random() * idioms.length);
    // eslint-disable-next-line sonarjs/pseudo-random -- picking a UI prompt, not a security context.
    let secondIndex = Math.floor(Math.random() * (idioms.length - 1));
    if (secondIndex >= firstIndex) {
        secondIndex += 1;
    }
    const first = idioms[firstIndex];
    const second = idioms[secondIndex];
    return first && second
        ? [
              first,
              second,
          ]
        : undefined;
}

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

        .random-pair {
            margin: 16px 20px;
            padding: 12px 16px;
            border: 1px solid color-mix(in srgb, var(--terre-verte) 40%, transparent);
            border-radius: var(--border-radius);
        }

        .random-pair a {
            display: block;
            color: var(--terre-verte);
            font-size: var(--font-size-body);
            text-decoration: none;
            padding: 4px 0;
        }

        .random-pair-actions {
            margin-top: 8px;
            display: flex;
            gap: 12px;
        }

        .random-pair-actions button {
            border: none;
            background: none;
            font-family: var(--font-serif);
            font-size: var(--font-size-gloss);
            color: var(--iron-faded);
            cursor: pointer;
            padding: 4px 0;
        }

        .show-random-pair-button {
            margin: 16px 20px;
            border: none;
            background: none;
            font-family: var(--font-serif);
            font-size: var(--font-size-gloss);
            color: var(--terre-verte);
            cursor: pointer;
            padding: 4px 0;
        }
    `,
    state(): {
        database: CodexDatabase;
        settings: CodexSettings;
        removeStorageListener: (() => void) | undefined;
        removeSettingsListener: (() => void) | undefined;
        searchQuery: string;
        sortMode: SortMode;
        randomPair:
            | readonly [
                  Idiom,
                  Idiom,
              ]
            | undefined;
    } {
        return {
            database: storage.get.codex() ?? databaseShape.default,
            settings: storage.get.settings() ?? settingsShape.default,
            removeStorageListener: undefined,
            removeSettingsListener: undefined,
            searchQuery: '',
            sortMode: 'alphabetical',
            randomPair: undefined,
        };
    },
    init({updateState}) {
        const removeStorageListener = storage.listen.codex((value) => {
            updateState({
                database: value ?? databaseShape.default,
            });
        });
        const removeSettingsListener = storage.listen.settings((value) => {
            updateState({
                settings: value ?? settingsShape.default,
            });
        });
        updateState({
            removeStorageListener,
            removeSettingsListener,
        });
    },
    cleanup({state}) {
        state.removeStorageListener?.();
        state.removeSettingsListener?.();
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
            ${state.settings.showRandomPairButton && database.idioms.length >= 2
                ? state.randomPair
                    ? html`
                          <div class="random-pair">
                              ${state.randomPair.map((idiom) => {
                                  return html`
                                      <a
                                          href=${router.createRouteUrl({
                                              paths: idiomDetailRoute(idiom.id),
                                          }).url}
                                          ${listen('click', (event) => {
                                              router.setRouteOnDirectNavigation(
                                                  {
                                                      paths: idiomDetailRoute(idiom.id),
                                                  },
                                                  event as MouseEvent,
                                              );
                                          })}
                                      >
                                          ${idiom.text}
                                      </a>
                                  `;
                              })}
                              <div class="random-pair-actions">
                                  <button
                                      type="button"
                                      ${listen('click', () => {
                                          updateState({
                                              randomPair: pickRandomPair(database.idioms),
                                          });
                                      })}
                                  >
                                      Show different two
                                  </button>
                                  <button
                                      type="button"
                                      ${listen('click', () => {
                                          return updateState({
                                              randomPair: undefined,
                                          });
                                      })}
                                  >
                                      Dismiss
                                  </button>
                              </div>
                          </div>
                      `
                    : html`
                          <button
                              type="button"
                              class="show-random-pair-button"
                              ${listen('click', () => {
                                  updateState({
                                      randomPair: pickRandomPair(database.idioms),
                                  });
                              })}
                          >
                              Show me two at random
                          </button>
                      `
                : ''}
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
