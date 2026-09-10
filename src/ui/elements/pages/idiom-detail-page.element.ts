import {getNowInIsoString} from 'date-vir';
import {css, defineElement, html, listen} from 'element-vir';
import {normalize} from '../../../data/normalize.js';
import {parseAliases} from '../../../data/parse-aliases.js';
import type {CodexDatabase, Idiom} from '../../../data/shapes.js';
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

        .edit-field {
            margin-bottom: 20px;
        }

        .edit-field label {
            display: block;
            font-size: var(--font-size-gloss);
            color: var(--iron-faded);
            margin: 0 0 6px;
        }

        .edit-field input[type='text'] {
            width: 100%;
            box-sizing: border-box;
            border: none;
            background-color: var(--vellum-deep);
            border-radius: var(--border-radius);
            font-family: var(--font-serif);
            font-size: var(--font-size-body);
            color: var(--iron-gall);
            padding: 10px 12px;
        }

        .edit-field textarea {
            width: 100%;
            box-sizing: border-box;
            border: none;
            background-color: var(--vellum-deep);
            border-radius: var(--border-radius);
            font-family: var(--font-serif);
            font-size: var(--font-size-body);
            color: var(--iron-gall);
            padding: 10px 12px;
            min-height: 4em;
            resize: none;
        }

        .edit-actions {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
        }

        .edit-actions button {
            border: none;
            border-radius: var(--border-radius);
            background-color: var(--oak);
            color: var(--vellum);
            font-family: var(--font-serif);
            font-size: var(--font-size-body);
            padding: 10px 16px;
            cursor: pointer;
        }

        .edit-actions button:disabled {
            opacity: 0.5;
            cursor: default;
        }

        .edit-actions button.text-button {
            background: none;
            color: var(--iron-gall);
            padding: 10px 0;
        }

        .duplicate-warning {
            border: 1px solid var(--minium);
            border-radius: var(--border-radius);
            padding: 16px;
            margin-bottom: 24px;
        }

        .duplicate-warning .warning-heading {
            color: var(--minium);
            font-weight: 500;
            margin: 0 0 16px;
        }

        .duplicate-warning .warning-actions {
            display: flex;
            gap: 12px;
        }

        .duplicate-warning button {
            border: none;
            background: none;
            font-family: var(--font-serif);
            font-size: var(--font-size-body);
            color: var(--iron-gall);
            cursor: pointer;
            padding: 8px 0;
        }
    `,
    state(): {
        database: CodexDatabase;
        removeStorageListener: (() => void) | undefined;
        confirmingDelete: boolean;
        editingIdiom: boolean;
        editText: string;
        editAliases: string;
        editNotes: string;
        editDuplicateWarning: Idiom | undefined;
    } {
        return {
            database: storage.get.codex() ?? databaseShape.default,
            removeStorageListener: undefined,
            confirmingDelete: false,
            editingIdiom: false,
            editText: '',
            editAliases: '',
            editNotes: '',
            editDuplicateWarning: undefined,
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

        function startEditing() {
            if (!idiom) {
                return;
            }
            updateState({
                editingIdiom: true,
                editText: idiom.text,
                editAliases: idiom.aliases.join(', '),
                editNotes: idiom.notes,
                editDuplicateWarning: undefined,
            });
        }

        function performSaveEdit() {
            if (!idiom) {
                return;
            }
            const text = state.editText.trim();
            if (!text) {
                return;
            }
            const updated: Idiom = {
                ...idiom,
                text,
                aliases: parseAliases(state.editAliases),
                notes: state.editNotes.trim(),
                updatedAt: getNowInIsoString(),
            };
            storage.set.codex({
                ...database,
                idioms: database.idioms.map((entry) => (entry.id === updated.id ? updated : entry)),
            });
            updateState({
                editingIdiom: false,
            });
        }

        function attemptSaveEdit() {
            if (!idiom) {
                return;
            }
            const text = state.editText.trim();
            if (!text) {
                return;
            }
            const normalizedText = normalize(text);
            const duplicate = database.idioms.find(
                (entry) => entry.id !== idiom.id && normalize(entry.text) === normalizedText,
            );
            if (duplicate) {
                updateState({
                    editDuplicateWarning: duplicate,
                });
                return;
            }
            performSaveEdit();
        }

        return html`
            ${state.editingIdiom
                ? html`
                      <div class="edit-field">
                          <label for="edit-idiom-text">Idiom</label>
                          <input
                              id="edit-idiom-text"
                              type="text"
                              .value=${state.editText}
                              ${listen('input', (event) => {
                                  updateState({
                                      editText: (event.target as HTMLInputElement).value,
                                      editDuplicateWarning: undefined,
                                  });
                              })}
                          />
                      </div>
                      <div class="edit-field">
                          <label for="edit-idiom-aliases">Aliases (comma-separated)</label>
                          <input
                              id="edit-idiom-aliases"
                              type="text"
                              .value=${state.editAliases}
                              ${listen('input', (event) => {
                                  updateState({
                                      editAliases: (event.target as HTMLInputElement).value,
                                  });
                              })}
                          />
                      </div>
                      <div class="edit-field">
                          <label for="edit-idiom-notes">Notes</label>
                          <textarea
                              id="edit-idiom-notes"
                              .value=${state.editNotes}
                              ${listen('input', (event) => {
                                  updateState({
                                      editNotes: (event.target as HTMLTextAreaElement).value,
                                  });
                              })}
                          ></textarea>
                      </div>
                      ${state.editDuplicateWarning
                          ? html`
                                <div class="duplicate-warning">
                                    <p class="warning-heading">
                                        You already have "${state.editDuplicateWarning.text}" in
                                        your glossary.
                                    </p>
                                    <div class="warning-actions">
                                        <button type="button" ${listen('click', performSaveEdit)}>
                                            Save anyway
                                        </button>
                                    </div>
                                </div>
                            `
                          : html`
                                <div class="edit-actions">
                                    <button
                                        type="button"
                                        ?disabled=${!state.editText.trim()}
                                        ${listen('click', attemptSaveEdit)}
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        class="text-button"
                                        ${listen('click', () => {
                                            return updateState({
                                                editingIdiom: false,
                                            });
                                        })}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            `}
                  `
                : html`
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
                  `}
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
            ${state.editingIdiom
                ? ''
                : html`
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
                              : html`
                                    <button type="button" ${listen('click', startEditing)}>
                                        Edit
                                    </button>
                                    ${usedByMalaphors.length
                                        ? html`
                                              <p class="blocked-delete">
                                                  Can't delete — used by ${usedByMalaphors.length}
                                                  ${usedByMalaphors.length === 1
                                                      ? 'malaphor'
                                                      : 'malaphors'}
                                                  above.
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
                                `}
                      </div>
                  `}
        `;
    },
});
