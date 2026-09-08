import {css, defineElement, html, listen} from 'element-vir';
import type {CodexDatabase} from '../../../data/shapes.js';
import {databaseShape} from '../../../data/shapes.js';
import {storage} from '../../../data/storage.js';
import {glossaryRoute, router} from '../../../router.js';
import {type GlossLine} from '../malaphor/idiom-gloss.element.js';
import {MalaphorRow} from '../malaphor/malaphor-row.element.js';
import {formControlFontFix} from '../shared-styles.js';

export const IdiomDetailPage = defineElement<{idiomId: string}>()({
    tagName: 'idiom-detail-page',
    styles: css`
        ${formControlFontFix}

        :host {
            display: block;
            padding: 20px;
        }

        .idiom-text {
            font-size: var(--font-size-heading);
            color: var(--terre-verte);
            margin: 0 0 12px;
        }

        .aliases {
            font-size: var(--font-size-gloss);
            color: var(--iron-faded);
            margin: 0 0 12px;
        }

        .notes {
            font-size: var(--font-size-body);
            color: var(--iron-gall);
            margin: 0 0 20px;
        }

        h2.section-heading {
            font-size: var(--font-size-heading);
            font-weight: 500;
            font-feature-settings: 'smcp' 1;
            margin: 24px 0 4px;
        }

        .malaphors-list {
            margin: 12px -20px 0;
        }

        .not-found {
            color: var(--iron-faded);
        }

        .blocked-delete {
            margin-top: 24px;
            color: var(--iron-faded);
            font-size: var(--font-size-gloss);
        }

        .actions {
            margin-top: 24px;
            display: flex;
            gap: 16px;
        }

        .actions button {
            border: none;
            background: none;
            font-family: var(--font-serif);
            font-size: var(--font-size-gloss);
            color: var(--iron-faded);
            cursor: pointer;
            padding: 4px 0;
        }

        .actions button.confirm-delete {
            color: var(--minium);
        }
    `,
    state(): {
        database: CodexDatabase;
        removeStorageListener: (() => void) | undefined;
        confirmingDelete: boolean;
    } {
        return {
            database: storage.get.codex() ?? databaseShape.default,
            removeStorageListener: undefined,
            confirmingDelete: false,
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
    render({inputs, state, updateState}) {
        const {database} = state;
        const idiom = database.idioms.find((entry) => entry.id === inputs.idiomId);

        if (!idiom) {
            return html`
                <p class="not-found">This idiom doesn't exist (anymore).</p>
            `;
        }

        const usedByMalaphors = database.malaphors.filter((malaphor) => {
            return malaphor.componentIdiomIds.includes(idiom.id);
        });

        function deleteIdiom() {
            if (!idiom || usedByMalaphors.length) {
                return;
            }
            storage.set.codex({
                ...database,
                idioms: database.idioms.filter((entry) => entry.id !== idiom.id),
            });
            router.setRoute({
                paths: glossaryRoute(),
            });
        }

        return html`
            <p class="idiom-text">${idiom.text}</p>
            ${idiom.aliases.length
                ? html`
                      <p class="aliases">Also: ${idiom.aliases.join(', ')}</p>
                  `
                : ''}
            ${idiom.notes
                ? html`
                      <p class="notes">${idiom.notes}</p>
                  `
                : ''}
            <h2 class="section-heading">
                ${usedByMalaphors.length ? `Used in ${usedByMalaphors.length}` : 'Not used yet'}
            </h2>
            ${usedByMalaphors.length
                ? html`
                      <div class="malaphors-list">
                          ${usedByMalaphors.map((malaphor) => {
                              const glossLines: GlossLine[] = malaphor.componentIdiomIds
                                  .map((id) => database.idioms.find((entry) => entry.id === id))
                                  .filter((entry) => entry !== undefined)
                                  .map((entry) => {
                                      return {
                                          idiomId: entry.id,
                                          text: entry.text,
                                          highlighted: entry.id === idiom.id,
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
                      </div>
                  `
                : ''}
            <div class="actions">
                ${state.confirmingDelete
                    ? html`
                          <button
                              type="button"
                              class="confirm-delete"
                              ${listen('click', deleteIdiom)}
                          >
                              Yes, delete it
                          </button>
                          <button
                              type="button"
                              ${listen('click', () => {
                                  return updateState({
                                      confirmingDelete: false,
                                  });
                              })}
                          >
                              Cancel
                          </button>
                      `
                    : usedByMalaphors.length
                      ? html`
                            <p class="blocked-delete">
                                Can't delete — used by ${usedByMalaphors.length}
                                ${usedByMalaphors.length === 1 ? 'malaphor' : 'malaphors'} above.
                            </p>
                        `
                      : html`
                            <button
                                type="button"
                                ${listen('click', () => {
                                    return updateState({
                                        confirmingDelete: true,
                                    });
                                })}
                            >
                                Delete
                            </button>
                        `}
            </div>
        `;
    },
});
