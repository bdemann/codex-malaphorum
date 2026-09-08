import {css, defineElement, defineElementEvent, html, listen} from 'element-vir';
import {normalize} from '../../../data/normalize.js';
import {buildSearchIndex, searchIdioms} from '../../../data/search-index.js';
import type {Idiom} from '../../../data/shapes.js';

type ResultRow = {
    idiom: Idiom;
    /** Gloss line shown beneath the idiom text, if any. */
    subLabel: string | undefined;
};

function getKeyboardInset(): number {
    const viewport = window.visualViewport;
    if (!viewport) {
        return 0;
    }
    return Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
}

/** Prevents the input from blurring when a result is tapped, so focus (and thus the panel) survives. */
function preventBlur(event: Event) {
    event.preventDefault();
}

export const IdiomTypeahead = defineElement<{
    idioms: readonly Idiom[];
    attachedIdiomIds: readonly string[];
    /** Most-recently-used idiom ids first, for the empty-query results. */
    recentIdiomIds: readonly string[];
}>()({
    tagName: 'idiom-typeahead',
    events: {
        attachExisting: defineElementEvent<string>(),
        createAndAttach: defineElementEvent<string>(),
    },
    styles: css`
        :host {
            display: block;
            position: relative;
        }

        input {
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

        .results-panel {
            position: fixed;
            left: 0;
            right: 0;
            bottom: var(--keyboard-inset, 0px);
            max-height: 50vh;
            overflow-y: auto;
            background-color: var(--vellum);
            border-top: 1px solid var(--iron-faded);
            box-shadow: none;
        }

        .result-row {
            display: block;
            width: 100%;
            box-sizing: border-box;
            text-align: left;
            padding: 10px 20px;
            border: none;
            background: none;
            font-family: var(--font-serif);
            cursor: pointer;
        }

        .result-row .idiom-text {
            font-size: var(--font-size-body);
            color: var(--iron-gall);
        }

        .result-row .sub-label {
            font-size: var(--font-size-gloss);
            color: var(--terre-verte);
            margin-top: 2px;
        }

        .add-row {
            border-top: 1px solid var(--iron-faded);
        }

        .add-row .idiom-text {
            color: var(--minium);
        }
    `,
    state() {
        return {
            query: '',
            focused: false,
            keyboardInset: 0,
            removeViewportListeners: undefined as (() => void) | undefined,
        };
    },
    init({updateState}) {
        const viewport = window.visualViewport;
        if (!viewport) {
            return;
        }
        const onViewportChange = () => {
            updateState({
                keyboardInset: getKeyboardInset(),
            });
        };
        viewport.addEventListener('resize', onViewportChange);
        viewport.addEventListener('scroll', onViewportChange);
        updateState({
            removeViewportListeners: () => {
                viewport.removeEventListener('resize', onViewportChange);
                viewport.removeEventListener('scroll', onViewportChange);
            },
        });
    },
    cleanup({state}) {
        state.removeViewportListeners?.();
    },
    render({inputs, state, updateState, dispatch, events}) {
        const attachedIds = new Set(inputs.attachedIdiomIds);
        const availableIdioms = inputs.idioms.filter((idiom) => !attachedIds.has(idiom.id));
        const normalizedQuery = normalize(state.query);

        const hasExactMatch = inputs.idioms.some(
            (idiom) => normalize(idiom.text) === normalizedQuery,
        );

        let results: ResultRow[];
        if (normalizedQuery) {
            const index = buildSearchIndex(availableIdioms, []);
            results = searchIdioms(index, state.query, 8).map((match): ResultRow => {
                return {
                    idiom: match.idiom,
                    subLabel:
                        normalize(match.idiom.text) === normalizedQuery
                            ? 'already in your glossary'
                            : match.matchedAlias,
                };
            });
        } else {
            results = inputs.recentIdiomIds
                .map((id) => availableIdioms.find((idiom) => idiom.id === id))
                .filter((idiom): idiom is Idiom => idiom !== undefined)
                .slice(0, 8)
                .map((idiom) => {
                    return {
                        idiom,
                        subLabel: undefined,
                    };
                });
        }

        const showAddRow = normalizedQuery.length > 0 && !hasExactMatch;
        const showPanel = state.focused && (results.length > 0 || showAddRow);

        return html`
            <input
                type="text"
                placeholder="type an idiom…"
                .value=${state.query}
                ${listen('focus', () => {
                    return updateState({
                        focused: true,
                    });
                })}
                ${listen('blur', () => {
                    return updateState({
                        focused: false,
                    });
                })}
                ${listen('input', (event) => {
                    updateState({
                        query: (event.target as HTMLInputElement).value,
                    });
                })}
            />
            ${showPanel
                ? html`
                      <div class="results-panel" style="--keyboard-inset: ${state.keyboardInset}px">
                          ${results.map((result) => {
                              return html`
                                  <button
                                      type="button"
                                      class="result-row"
                                      ${listen('mousedown', preventBlur)}
                                      ${listen('click', () => {
                                          dispatch(new events.attachExisting(result.idiom.id));
                                          updateState({
                                              query: '',
                                          });
                                      })}
                                  >
                                      <div class="idiom-text">${result.idiom.text}</div>
                                      ${result.subLabel
                                          ? html`
                                                <div class="sub-label">${result.subLabel}</div>
                                            `
                                          : ''}
                                  </button>
                              `;
                          })}
                          ${showAddRow
                              ? html`
                                    <button
                                        type="button"
                                        class="result-row add-row"
                                        ${listen('mousedown', preventBlur)}
                                        ${listen('click', () => {
                                            dispatch(
                                                new events.createAndAttach(state.query.trim()),
                                            );
                                            updateState({
                                                query: '',
                                            });
                                        })}
                                    >
                                        <div class="idiom-text">+ Add "${state.query.trim()}"</div>
                                    </button>
                                `
                              : ''}
                      </div>
                  `
                : ''}
        `;
    },
});
