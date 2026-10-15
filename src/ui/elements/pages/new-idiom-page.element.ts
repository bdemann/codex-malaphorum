import {createUuidV4} from '@augment-vir/common';
import {getNowInIsoString} from 'date-vir';
import {css, defineElement, html, listen} from 'element-vir';
import {normalize} from '../../../data/normalize.js';
import {parseAliases} from '../../../data/parse-aliases.js';
import type {CodexDatabase, Idiom} from '../../../data/shapes.js';
import {databaseShape} from '../../../data/shapes.js';
import {parseSourceUrl} from '../../../data/source-url.js';
import {storage} from '../../../data/storage.js';
import {collectTags, parseTags} from '../../../data/tags.js';
import {glossaryRoute, idiomDetailRoute, router} from '../../../router.js';
import {TagInput} from '../malaphor/tag-input.element.js';
import {formControlFontFix} from '../shared-styles.js';

export const NewIdiomPage = defineElement()({
    tagName: 'new-idiom-page',
    styles: css`
        ${formControlFontFix}

        :host {
            display: block;
        }

        header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            border-bottom: 1px solid color-mix(in srgb, var(--iron-faded) 20%, transparent);
        }

        header h1 {
            font-size: var(--font-size-heading);
            font-weight: 500;
            margin: 0;
        }

        .back-button {
            border: none;
            background: none;
            font-family: var(--font-serif);
            font-size: var(--font-size-heading);
            color: var(--iron-gall);
            cursor: pointer;
            padding: 4px;
        }

        .fields {
            padding: 20px;
        }

        .field-block {
            margin-bottom: 24px;
        }

        label {
            display: block;
            font-size: var(--font-size-heading);
            font-weight: 500;
            font-feature-settings: 'smcp' 1;
            margin: 0 0 12px;
        }

        input[type='text'] {
            width: 100%;
            box-sizing: border-box;
            border: none;
            background: none;
            font-family: var(--font-serif);
            font-size: var(--font-size-body);
            color: var(--iron-gall);
            padding: 0;
        }

        textarea {
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

        .hint {
            margin-top: 8px;
            color: var(--iron-faded);
            font-size: var(--font-size-gloss);
        }

        .save-button {
            display: block;
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: var(--border-radius);
            background-color: var(--oak);
            color: var(--vellum);
            font-family: var(--font-serif);
            font-size: var(--font-size-body);
            cursor: pointer;
        }

        .save-button:disabled {
            opacity: 0.5;
            cursor: default;
        }

        .duplicate-warning {
            border: 1px solid var(--minium);
            border-radius: var(--border-radius);
            padding: 16px;
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
        idiomText: string;
        aliases: string;
        tags: string;
        sourceUrl: string;
        notes: string;
        duplicateWarning: Idiom | undefined;
    } {
        return {
            database: storage.get.codex() ?? databaseShape.default,
            removeStorageListener: undefined,
            idiomText: '',
            aliases: '',
            tags: '',
            sourceUrl: '',
            notes: '',
            duplicateWarning: undefined,
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
        const {database, idiomText, aliases, tags, notes} = state;
        const parsedSourceUrl = parseSourceUrl(state.sourceUrl);

        function performSave() {
            const text = idiomText.trim();
            if (!text || parsedSourceUrl === undefined) {
                return;
            }
            const now = getNowInIsoString();
            const newIdiom: Idiom = {
                id: createUuidV4(),
                text,
                aliases: parseAliases(aliases),
                tags: parseTags(tags),
                sourceUrl: parsedSourceUrl,
                notes: notes.trim(),
                createdAt: now,
                updatedAt: now,
            };
            storage.set.codex({
                ...database,
                idioms: [
                    ...database.idioms,
                    newIdiom,
                ],
            });
            router.setRoute({
                paths: idiomDetailRoute(newIdiom.id),
            });
        }

        function attemptSave() {
            const text = idiomText.trim();
            if (!text || parsedSourceUrl === undefined) {
                return;
            }
            const normalizedText = normalize(text);
            const duplicate = database.idioms.find(
                (idiom) => normalize(idiom.text) === normalizedText,
            );
            if (duplicate) {
                updateState({
                    duplicateWarning: duplicate,
                });
                return;
            }
            performSave();
        }

        return html`
            <header>
                <button
                    type="button"
                    class="back-button"
                    aria-label="Back to the Glossary"
                    ${listen('click', () => {
                        return router.setRoute({
                            paths: glossaryRoute(),
                        });
                    })}
                >
                    ←
                </button>
                <h1>New idiom</h1>
            </header>
            <div class="fields">
                <div class="field-block">
                    <label for="idiom-text">Idiom</label>
                    <input
                        id="idiom-text"
                        type="text"
                        placeholder="burn a bridge"
                        .value=${idiomText}
                        ${listen('input', (event) => {
                            updateState({
                                idiomText: (event.target as HTMLInputElement).value,
                                duplicateWarning: undefined,
                            });
                        })}
                    />
                </div>

                <div class="field-block">
                    <label for="idiom-aliases">Aliases (optional)</label>
                    <input
                        id="idiom-aliases"
                        type="text"
                        placeholder="burn your bridges, burning bridges"
                        .value=${aliases}
                        ${listen('input', (event) => {
                            updateState({
                                aliases: (event.target as HTMLInputElement).value,
                            });
                        })}
                    />
                    <p class="hint">Comma-separated.</p>
                </div>

                <div class="field-block">
                    <label for="idiom-tags">Origin tags (optional)</label>
                    <${TagInput.assign({
                        inputId: 'idiom-tags',
                        value: tags,
                        suggestions: collectTags(database.idioms).map((entry) => entry.tag),
                    })}
                        ${listen(TagInput.events.valueChange, (event) => {
                            updateState({
                                tags: event.detail,
                            });
                        })}
                    ></${TagInput}>
                    <p class="hint">Where it comes from. Comma-separated.</p>
                </div>

                <div class="field-block">
                    <label for="idiom-source">Source link (optional)</label>
                    <input
                        id="idiom-source"
                        type="text"
                        inputmode="url"
                        placeholder="https://…"
                        .value=${state.sourceUrl}
                        ${listen('input', (event) => {
                            updateState({
                                sourceUrl: (event.target as HTMLInputElement).value,
                            });
                        })}
                    />
                    <p class="hint">
                        ${parsedSourceUrl === undefined
                            ? "That doesn't look like a web link."
                            : 'A dictionary entry or other reference for its meaning or origin.'}
                    </p>
                </div>

                <div class="field-block">
                    <label for="idiom-notes">Notes (optional)</label>
                    <textarea
                        id="idiom-notes"
                        .value=${notes}
                        ${listen('input', (event) => {
                            updateState({
                                notes: (event.target as HTMLTextAreaElement).value,
                            });
                        })}
                    ></textarea>
                </div>

                ${state.duplicateWarning
                    ? html`
                          <div class="duplicate-warning">
                              <p class="warning-heading">
                                  You already have "${state.duplicateWarning.text}" in your
                                  glossary.
                              </p>
                              <div class="warning-actions">
                                  <button
                                      type="button"
                                      ${listen('click', () => {
                                          if (!state.duplicateWarning) {
                                              return;
                                          }
                                          router.setRoute({
                                              paths: idiomDetailRoute(state.duplicateWarning.id),
                                          });
                                      })}
                                  >
                                      View it
                                  </button>
                                  <button type="button" ${listen('click', performSave)}>
                                      Save anyway
                                  </button>
                              </div>
                          </div>
                      `
                    : html`
                          <button
                              type="button"
                              class="save-button"
                              ?disabled=${!idiomText.trim() || parsedSourceUrl === undefined}
                              ${listen('click', attemptSave)}
                          >
                              Add idiom
                          </button>
                      `}
            </div>
        `;
    },
});
