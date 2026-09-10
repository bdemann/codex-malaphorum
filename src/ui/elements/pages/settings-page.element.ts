import {createUuidV4} from '@augment-vir/common';
import {
    createFullDateInUserTimezone,
    getNowInIsoString,
    getNowInUserTimezone,
    toFormattedString,
    toRelativeString,
} from 'date-vir';
import {css, defineElement, html, listen} from 'element-vir';
import {checkValidShape} from 'object-shape-tester';
import {migrateDatabaseIfNeeded} from '../../../data/migrate-storage.js';
import {normalize} from '../../../data/normalize.js';
import type {CodexDatabase, CodexSettings, Idiom} from '../../../data/shapes.js';
import {databaseShape, settingsShape} from '../../../data/shapes.js';
import {storage} from '../../../data/storage.js';
import {codexRoute, glossaryRoute, router} from '../../../router.js';
import {formControlFontFix} from '../shared-styles.js';

type JsonImportSummary = {
    parsed: CodexDatabase;
    malaphorCount: number;
    idiomCount: number;
    collisionCount: number;
};

type PastedLinePreview = {
    text: string;
    checked: boolean;
    alreadyExists: boolean;
};

function formatLastExported(lastExportedAt: string | undefined): string {
    if (!lastExportedAt) {
        return 'never';
    }
    return toRelativeString(
        {
            start: createFullDateInUserTimezone(lastExportedAt),
            end: getNowInUserTimezone(),
        },
        {
            days: true,
        },
        {
            decimalCount: 0,
            useOnlyLargestUnit: true,
        },
    );
}

function downloadJson(database: CodexDatabase) {
    const filename = `codex-malaphorum-${toFormattedString(getNowInUserTimezone(), 'yyyy-MM-dd')}.json`;
    const blob = new Blob([JSON.stringify(database, undefined, 2)], {
        type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export const SettingsPage = defineElement()({
    tagName: 'settings-page',
    styles: css`
        ${formControlFontFix}

        :host {
            display: block;
            padding: 20px;
        }

        h1 {
            font-size: var(--font-size-heading);
            font-weight: 500;
            font-feature-settings: 'smcp' 1;
            margin: 0 0 20px;
        }

        h2.section-heading {
            font-size: var(--font-size-heading);
            font-weight: 500;
            font-feature-settings: 'smcp' 1;
            margin: 32px 0 8px;
        }

        section:first-of-type h2.section-heading {
            margin-top: 0;
        }

        .gloss-note {
            font-size: var(--font-size-gloss);
            color: var(--iron-faded);
            margin: 4px 0 12px;
        }

        button {
            border: none;
            border-radius: var(--border-radius);
            background-color: var(--oak);
            color: var(--vellum);
            font-family: var(--font-serif);
            font-size: var(--font-size-body);
            padding: 10px 16px;
            cursor: pointer;
        }

        button.text-button {
            background: none;
            color: var(--iron-gall);
            padding: 8px 0;
            font-size: var(--font-size-gloss);
        }

        input[type='file'],
        textarea,
        input[type='text'] {
            width: 100%;
            box-sizing: border-box;
            font-family: var(--font-serif);
            font-size: var(--font-size-body);
            color: var(--iron-gall);
        }

        textarea {
            background-color: var(--vellum-deep);
            border: none;
            border-radius: var(--border-radius);
            padding: 10px 12px;
            min-height: 6em;
        }

        input[type='text'] {
            background-color: var(--vellum-deep);
            border: none;
            border-radius: var(--border-radius);
            padding: 8px 10px;
            margin: 8px 0;
        }

        .error {
            color: var(--minium);
            font-size: var(--font-size-gloss);
        }

        .import-summary {
            margin: 12px 0;
            font-size: var(--font-size-body);
        }

        .import-actions {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .replace-confirm {
            margin-top: 16px;
            padding: 12px;
            border: 1px solid var(--minium);
            border-radius: var(--border-radius);
        }

        .keep-preview-row {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 8px 0;
            border-bottom: 1px solid color-mix(in srgb, var(--iron-faded) 15%, transparent);
        }

        .keep-preview-row input[type='checkbox'] {
            margin-top: 4px;
            width: 20px;
            height: 20px;
        }

        .keep-preview-text {
            font-size: var(--font-size-body);
        }

        .keep-preview-note {
            font-size: var(--font-size-gloss);
            color: var(--terre-verte);
        }

        .toggle-row {
            display: flex;
            align-items: center;
            gap: 12px;
        }
    `,
    state(): {
        database: CodexDatabase;
        settings: CodexSettings;
        lastExportedAt: string | undefined;
        removeStorageListener: (() => void) | undefined;
        removeSettingsListener: (() => void) | undefined;
        removeLastExportedAtListener: (() => void) | undefined;
        jsonImportError: string | undefined;
        jsonImportSummary: JsonImportSummary | undefined;
        replaceConfirmText: string;
        showReplaceConfirm: boolean;
        keepImportText: string;
        keepImportPreview: PastedLinePreview[] | undefined;
        idiomImportText: string;
        idiomImportPreview: PastedLinePreview[] | undefined;
    } {
        return {
            database: storage.get.codex() ?? databaseShape.default,
            settings: storage.get.settings() ?? settingsShape.default,
            lastExportedAt: storage.get.lastExportedAt(),
            removeStorageListener: undefined,
            removeSettingsListener: undefined,
            removeLastExportedAtListener: undefined,
            jsonImportError: undefined,
            jsonImportSummary: undefined,
            replaceConfirmText: '',
            showReplaceConfirm: false,
            keepImportText: '',
            keepImportPreview: undefined,
            idiomImportText: '',
            idiomImportPreview: undefined,
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
        const removeLastExportedAtListener = storage.listen.lastExportedAt((value) => {
            updateState({
                lastExportedAt: value,
            });
        });
        updateState({
            removeStorageListener,
            removeSettingsListener,
            removeLastExportedAtListener,
        });
    },
    cleanup({state}) {
        state.removeStorageListener?.();
        state.removeSettingsListener?.();
        state.removeLastExportedAtListener?.();
    },
    render({state, updateState}) {
        const {database, lastExportedAt} = state;

        function handleExport() {
            downloadJson(database);
            storage.set.lastExportedAt(getNowInIsoString());
        }

        async function handleJsonFileChosen(event: Event) {
            const input = event.target as HTMLInputElement;
            const file = input.files?.[0];
            input.value = '';
            if (!file) {
                return;
            }

            let parsedJson: unknown;
            try {
                parsedJson = migrateDatabaseIfNeeded(JSON.parse(await file.text()));
            } catch {
                updateState({
                    jsonImportError: "That file isn't a Codex Malaphorum export.",
                    jsonImportSummary: undefined,
                });
                return;
            }

            if (!checkValidShape(parsedJson, databaseShape)) {
                updateState({
                    jsonImportError: "That file isn't a Codex Malaphorum export.",
                    jsonImportSummary: undefined,
                });
                return;
            }

            const existingIds = new Set([
                ...database.idioms.map((idiom) => idiom.id),
                ...database.malaphors.map((malaphor) => malaphor.id),
            ]);
            const collisionCount =
                parsedJson.idioms.filter((idiom) => existingIds.has(idiom.id)).length +
                parsedJson.malaphors.filter((malaphor) => existingIds.has(malaphor.id)).length;

            updateState({
                jsonImportError: undefined,
                jsonImportSummary: {
                    parsed: parsedJson,
                    malaphorCount: parsedJson.malaphors.length,
                    idiomCount: parsedJson.idioms.length,
                    collisionCount,
                },
                showReplaceConfirm: false,
                replaceConfirmText: '',
            });
        }

        function mergeImport() {
            const summary = state.jsonImportSummary;
            if (!summary) {
                return;
            }
            const existingIds = new Set([
                ...database.idioms.map((idiom) => idiom.id),
                ...database.malaphors.map((malaphor) => malaphor.id),
            ]);
            const newIdioms = summary.parsed.idioms.filter((idiom) => !existingIds.has(idiom.id));
            const newMalaphors = summary.parsed.malaphors.filter(
                (malaphor) => !existingIds.has(malaphor.id),
            );
            storage.set.codex({
                ...database,
                idioms: [
                    ...database.idioms,
                    ...newIdioms,
                ],
                malaphors: [
                    ...database.malaphors,
                    ...newMalaphors,
                ],
            });
            updateState({
                jsonImportSummary: undefined,
            });
        }

        function replaceEverything() {
            const summary = state.jsonImportSummary;
            if (!summary) {
                return;
            }
            storage.set.codex(summary.parsed);
            updateState({
                jsonImportSummary: undefined,
                showReplaceConfirm: false,
                replaceConfirmText: '',
            });
        }

        function previewKeepImport() {
            const lines = state.keepImportText
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length >= 3);
            const existingNormalizedTexts = new Set(
                database.malaphors.map((malaphor) => normalize(malaphor.text)),
            );
            const preview: PastedLinePreview[] = lines.map((text) => {
                const alreadyExists = existingNormalizedTexts.has(normalize(text));
                return {
                    text,
                    checked: !alreadyExists,
                    alreadyExists,
                };
            });
            updateState({
                keepImportPreview: preview,
            });
        }

        function confirmKeepImport() {
            const preview = state.keepImportPreview;
            if (!preview) {
                return;
            }
            const now = getNowInIsoString();
            const newMalaphors = preview
                .filter((line) => line.checked)
                .map((line) => {
                    return {
                        id: createUuidV4(),
                        text: line.text,
                        componentIdiomIds: [],
                        notes: '',
                        rating: 0,
                        createdAt: now,
                        updatedAt: now,
                    };
                });
            storage.set.codex({
                ...database,
                malaphors: [
                    ...database.malaphors,
                    ...newMalaphors,
                ],
            });
            router.setRoute({
                paths: codexRoute(),
                search: {
                    filter: ['untagged'],
                },
            });
        }

        function previewIdiomImport() {
            const lines = state.idiomImportText
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length >= 3);
            const existingNormalizedTexts = new Set(
                database.idioms.map((idiom) => normalize(idiom.text)),
            );
            const preview: PastedLinePreview[] = lines.map((text) => {
                const alreadyExists = existingNormalizedTexts.has(normalize(text));
                return {
                    text,
                    checked: !alreadyExists,
                    alreadyExists,
                };
            });
            updateState({
                idiomImportPreview: preview,
            });
        }

        function confirmIdiomImport() {
            const preview = state.idiomImportPreview;
            if (!preview) {
                return;
            }
            const now = getNowInIsoString();
            const newIdioms: Idiom[] = preview
                .filter((line) => line.checked)
                .map((line) => {
                    return {
                        id: createUuidV4(),
                        text: line.text,
                        aliases: [],
                        notes: '',
                        createdAt: now,
                        updatedAt: now,
                    };
                });
            storage.set.codex({
                ...database,
                idioms: [
                    ...database.idioms,
                    ...newIdioms,
                ],
            });
            updateState({
                idiomImportText: '',
                idiomImportPreview: undefined,
            });
            router.setRoute({
                paths: glossaryRoute(),
            });
        }

        return html`
            <h1>Settings</h1>

            <section>
                <h2 class="section-heading">Export codex</h2>
                <p class="gloss-note">Last exported: ${formatLastExported(lastExportedAt)}</p>
                <button type="button" ${listen('click', handleExport)}>Export codex</button>
            </section>

            <section>
                <h2 class="section-heading">Import codex</h2>
                <p class="gloss-note">
                    Import a JSON file previously exported from Codex Malaphorum.
                </p>
                <input
                    type="file"
                    accept="application/json,.json"
                    ${listen('change', handleJsonFileChosen)}
                />
                ${state.jsonImportError
                    ? html`
                          <p class="error">${state.jsonImportError}</p>
                      `
                    : ''}
                ${state.jsonImportSummary
                    ? html`
                          <p class="import-summary">
                              ${state.jsonImportSummary.malaphorCount} malaphors,
                              ${state.jsonImportSummary.idiomCount} idioms.
                              ${state.jsonImportSummary.collisionCount} already in your codex.
                          </p>
                          <div class="import-actions">
                              <button type="button" ${listen('click', mergeImport)}>Merge</button>
                              <button
                                  type="button"
                                  class="text-button"
                                  ${listen('click', () => {
                                      return updateState({
                                          showReplaceConfirm: true,
                                      });
                                  })}
                              >
                                  Replace everything
                              </button>
                          </div>
                          ${state.showReplaceConfirm
                              ? html`
                                    <div class="replace-confirm">
                                        <p class="gloss-note">
                                            This deletes everything currently in your codex. Type
                                            "replace" to confirm.
                                        </p>
                                        <input
                                            type="text"
                                            .value=${state.replaceConfirmText}
                                            ${listen('input', (event) => {
                                                updateState({
                                                    replaceConfirmText: (
                                                        event.target as HTMLInputElement
                                                    ).value,
                                                });
                                            })}
                                        />
                                        <button
                                            type="button"
                                            ?disabled=${state.replaceConfirmText
                                                .trim()
                                                .toLowerCase() !== 'replace'}
                                            ${listen('click', replaceEverything)}
                                        >
                                            Replace everything
                                        </button>
                                    </div>
                                `
                              : ''}
                      `
                    : ''}
            </section>

            <section>
                <h2 class="section-heading">Import from Google Keep</h2>
                <p class="gloss-note">
                    Paste your Keep export. Each line becomes an untagged malaphor.
                </p>
                <textarea
                    .value=${state.keepImportText}
                    ${listen('input', (event) => {
                        updateState({
                            keepImportText: (event.target as HTMLTextAreaElement).value,
                            keepImportPreview: undefined,
                        });
                    })}
                ></textarea>
                ${state.keepImportPreview
                    ? html`
                          ${state.keepImportPreview.map((line, index) => {
                              return html`
                                  <div class="keep-preview-row">
                                      <input
                                          type="checkbox"
                                          .checked=${line.checked}
                                          ${listen('change', (event) => {
                                              const checked = (event.target as HTMLInputElement)
                                                  .checked;
                                              const preview = [...(state.keepImportPreview ?? [])];
                                              const target = preview[index];
                                              if (target) {
                                                  preview[index] = {
                                                      ...target,
                                                      checked,
                                                  };
                                              }
                                              updateState({
                                                  keepImportPreview: preview,
                                              });
                                          })}
                                      />
                                      <div>
                                          <p class="keep-preview-text">${line.text}</p>
                                          ${line.alreadyExists
                                              ? html`
                                                    <p class="keep-preview-note">
                                                        already have this
                                                    </p>
                                                `
                                              : ''}
                                      </div>
                                  </div>
                              `;
                          })}
                          <div class="import-actions">
                              <button
                                  type="button"
                                  ?disabled=${!state.keepImportPreview.some((line) => line.checked)}
                                  ${listen('click', confirmKeepImport)}
                              >
                                  Import checked
                              </button>
                              <button
                                  type="button"
                                  class="text-button"
                                  ${listen('click', () => {
                                      return updateState({
                                          keepImportPreview: undefined,
                                      });
                                  })}
                              >
                                  Cancel
                              </button>
                          </div>
                      `
                    : html`
                          <button
                              type="button"
                              ?disabled=${!state.keepImportText.trim()}
                              ${listen('click', previewKeepImport)}
                          >
                              Preview
                          </button>
                      `}
            </section>

            <section>
                <h2 class="section-heading">Import idioms</h2>
                <p class="gloss-note">
                    Paste a list of idioms, one per line. Each becomes a new glossary entry.
                </p>
                <textarea
                    .value=${state.idiomImportText}
                    ${listen('input', (event) => {
                        updateState({
                            idiomImportText: (event.target as HTMLTextAreaElement).value,
                            idiomImportPreview: undefined,
                        });
                    })}
                ></textarea>
                ${state.idiomImportPreview
                    ? html`
                          ${state.idiomImportPreview.map((line, index) => {
                              return html`
                                  <div class="keep-preview-row">
                                      <input
                                          type="checkbox"
                                          .checked=${line.checked}
                                          ${listen('change', (event) => {
                                              const checked = (event.target as HTMLInputElement)
                                                  .checked;
                                              const preview = [
                                                  ...(state.idiomImportPreview ?? []),
                                              ];
                                              const target = preview[index];
                                              if (target) {
                                                  preview[index] = {
                                                      ...target,
                                                      checked,
                                                  };
                                              }
                                              updateState({
                                                  idiomImportPreview: preview,
                                              });
                                          })}
                                      />
                                      <div>
                                          <p class="keep-preview-text">${line.text}</p>
                                          ${line.alreadyExists
                                              ? html`
                                                    <p class="keep-preview-note">
                                                        already have this
                                                    </p>
                                                `
                                              : ''}
                                      </div>
                                  </div>
                              `;
                          })}
                          <div class="import-actions">
                              <button
                                  type="button"
                                  ?disabled=${!state.idiomImportPreview.some(
                                      (line) => line.checked,
                                  )}
                                  ${listen('click', confirmIdiomImport)}
                              >
                                  Import checked
                              </button>
                              <button
                                  type="button"
                                  class="text-button"
                                  ${listen('click', () => {
                                      return updateState({
                                          idiomImportPreview: undefined,
                                      });
                                  })}
                              >
                                  Cancel
                              </button>
                          </div>
                      `
                    : html`
                          <button
                              type="button"
                              ?disabled=${!state.idiomImportText.trim()}
                              ${listen('click', previewIdiomImport)}
                          >
                              Preview
                          </button>
                      `}
            </section>

            <section>
                <h2 class="section-heading">Glossary</h2>
                <div class="toggle-row">
                    <input
                        type="checkbox"
                        id="random-pair-toggle"
                        .checked=${state.settings.showRandomPairButton}
                        ${listen('change', (event) => {
                            storage.set.settings({
                                ...state.settings,
                                showRandomPairButton: (event.target as HTMLInputElement).checked,
                            });
                        })}
                    />
                    <label for="random-pair-toggle" class="gloss-note">
                        Show a "two at random" idiom prompt on the Glossary
                    </label>
                </div>
            </section>
        `;
    },
});
