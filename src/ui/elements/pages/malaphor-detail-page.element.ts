import {createUuidV4, type Uuid} from '@augment-vir/common';
import {createFullDateInUserTimezone, getNowInIsoString, toFormattedString} from 'date-vir';
import {css, defineElement, html, listen} from 'element-vir';
import {checkForCollision, type CollisionCheck} from '../../../data/collisions.js';
import {formatMalaphorForShare} from '../../../data/format-share-text.js';
import {computeRecentIdiomIds} from '../../../data/idiom-usage.js';
import type {CodexDatabase, Idiom, Malaphor} from '../../../data/shapes.js';
import {databaseShape} from '../../../data/shapes.js';
import {storage} from '../../../data/storage.js';
import {codexRoute, malaphorDetailRoute, router} from '../../../router.js';
import {IdiomChip} from '../malaphor/idiom-chip.element.js';
import {IdiomGloss, type GlossLine} from '../malaphor/idiom-gloss.element.js';
import {IdiomTypeahead} from '../malaphor/idiom-typeahead.element.js';
import {StarRating} from '../malaphor/star-rating.element.js';
import {formControlFontFix} from '../shared-styles.js';

function formatDate(isoString: string): string {
    return toFormattedString(createFullDateInUserTimezone(isoString), 'd MMMM yyyy');
}

/** 0 (unrated) deliberately has no caption -- no stars means no judgment passed yet. */
const RATING_CAPTIONS: Readonly<Record<number, string>> = {
    1: 'Maybe cut this one',
    2: 'Passable',
    3: 'Good',
    4: 'Clever',
    5: 'Tickles the fancy bone',
};

export const MalaphorDetailPage = defineElement<{malaphorId: string}>()({
    tagName: 'malaphor-detail-page',
    styles: css`
        ${formControlFontFix}

        :host {
            display: block;
            padding: 20px;
        }

        .malaphor-text {
            font-size: var(--font-size-malaphor-detail);
            line-height: 1.4;
            color: var(--iron-gall);
            margin: 0 0 20px;
        }

        .malaphor-text::first-letter {
            float: left;
            font-size: 2.6em;
            line-height: 0.9;
            padding-right: 8px;
            color: var(--minium);
        }

        .rating-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0 0 20px;
        }

        .rating-caption {
            font-size: var(--font-size-gloss);
            color: var(--iron-faded);
            font-style: italic;
        }

        .notes {
            margin-top: 20px;
            font-size: var(--font-size-body);
            color: var(--iron-gall);
        }

        .dates {
            margin-top: 20px;
            font-size: var(--font-size-gloss);
            color: var(--iron-faded);
        }

        .not-found {
            color: var(--iron-faded);
        }

        .untagged-hint {
            margin: 12px 0 0;
            color: var(--iron-faded);
            font-size: var(--font-size-gloss);
        }

        h2.section-heading {
            font-size: var(--font-size-heading);
            font-weight: 500;
            font-feature-settings: 'smcp' 1;
            margin: 24px 0 12px;
        }

        .chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 12px;
        }

        .tag-toggle {
            display: block;
            margin-top: 12px;
            border: none;
            background: none;
            font-family: var(--font-serif);
            font-size: var(--font-size-gloss);
            color: var(--iron-faded);
            cursor: pointer;
            padding: 4px 0;
        }

        .actions {
            margin-top: 32px;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .share-feedback {
            font-size: var(--font-size-gloss);
            color: var(--terre-verte);
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

        textarea.malaphor-text-input {
            width: 100%;
            box-sizing: border-box;
            border: none;
            background: none;
            font-family: var(--font-serif);
            font-size: var(--font-size-malaphor-detail);
            line-height: 1.4;
            color: var(--iron-gall);
            padding: 0;
            resize: none;
            overflow: hidden;
        }

        textarea.notes-input {
            width: 100%;
            box-sizing: border-box;
            border: none;
            background-color: var(--vellum-deep);
            border-radius: var(--border-radius);
            padding: 10px 12px;
            min-height: 4em;
            font-family: var(--font-serif);
            font-size: var(--font-size-body);
            color: var(--iron-gall);
            resize: none;
        }

        .edit-actions {
            display: flex;
            gap: 16px;
            margin-top: 12px;
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

        .collision-warning {
            border: 1px solid var(--minium);
            border-radius: var(--border-radius);
            padding: 16px;
            margin-top: 12px;
        }

        .collision-warning .warning-heading {
            color: var(--minium);
            font-weight: 500;
            margin: 0 0 8px;
        }

        .collision-warning .warning-detail {
            font-size: var(--font-size-gloss);
            color: var(--iron-faded);
            margin: 0 0 16px;
        }

        .collision-warning .warning-actions {
            display: flex;
            gap: 12px;
        }

        .collision-warning button {
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
        editingComponents: boolean;
        editingMalaphor: boolean;
        editText: string;
        editNotes: string;
        editCollisionWarning: CollisionCheck | undefined;
        shareFeedback: string | undefined;
    } {
        return {
            database: storage.get.codex() ?? databaseShape.default,
            removeStorageListener: undefined,
            confirmingDelete: false,
            editingComponents: false,
            editingMalaphor: false,
            editText: '',
            editNotes: '',
            shareFeedback: undefined,
            editCollisionWarning: undefined,
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
        const malaphor = database.malaphors.find((entry) => entry.id === inputs.malaphorId);

        if (!malaphor) {
            return html`
                <p class="not-found">This malaphor doesn't exist (anymore).</p>
            `;
        }

        const idiomsById = new Map(
            database.idioms.map((idiom) => {
                return [
                    idiom.id,
                    idiom,
                ] as const;
            }),
        );
        const glossLines: GlossLine[] = malaphor.componentIdiomIds
            .map((id) => idiomsById.get(id))
            .filter((idiom): idiom is Idiom => idiom !== undefined)
            .map((idiom) => {
                return {
                    idiomId: idiom.id,
                    text: idiom.text,
                };
            });
        const attachedIdioms = malaphor.componentIdiomIds
            .map((id) => idiomsById.get(id))
            .filter((idiom): idiom is Idiom => idiom !== undefined);
        const recentIdiomIds = computeRecentIdiomIds(database);

        function deleteMalaphor() {
            if (!malaphor) {
                return;
            }
            storage.set.codex({
                ...database,
                malaphors: database.malaphors.filter((entry) => entry.id !== malaphor.id),
            });
            router.setRoute({
                paths: codexRoute(),
            });
        }

        async function copyShareTextToClipboard(text: string) {
            try {
                await navigator.clipboard.writeText(text);
                updateState({
                    shareFeedback: 'Copied to clipboard',
                });
                setTimeout(() => {
                    updateState({
                        shareFeedback: undefined,
                    });
                }, 2000);
            } catch {
                // Nothing more to do if the clipboard write itself fails (e.g. permissions).
            }
        }

        async function shareMalaphor() {
            if (!malaphor) {
                return;
            }
            const text = formatMalaphorForShare(malaphor, attachedIdioms);
            if ('share' in navigator) {
                try {
                    await navigator.share({
                        text,
                    });
                } catch (error) {
                    if (error instanceof Error && error.name === 'AbortError') {
                        return;
                    }
                    await copyShareTextToClipboard(text);
                }
                return;
            }
            await copyShareTextToClipboard(text);
        }

        function setRating(rating: number) {
            if (!malaphor) {
                return;
            }
            const updated: Malaphor = {
                ...malaphor,
                rating,
                updatedAt: getNowInIsoString(),
            };
            storage.set.codex({
                ...database,
                malaphors: database.malaphors.map((entry) => {
                    return entry.id === updated.id ? updated : entry;
                }),
            });
        }

        function startEditingMalaphor() {
            if (!malaphor) {
                return;
            }
            updateState({
                editingMalaphor: true,
                editingComponents: false,
                editText: malaphor.text,
                editNotes: malaphor.notes,
                editCollisionWarning: undefined,
            });
        }

        function performSaveMalaphorEdit() {
            if (!malaphor) {
                return;
            }
            const text = state.editText.trim();
            if (!text) {
                return;
            }
            const updated: Malaphor = {
                ...malaphor,
                text,
                notes: state.editNotes.trim(),
                updatedAt: getNowInIsoString(),
            };
            storage.set.codex({
                ...database,
                malaphors: database.malaphors.map((entry) => {
                    return entry.id === updated.id ? updated : entry;
                }),
            });
            updateState({
                editingMalaphor: false,
            });
        }

        function attemptSaveMalaphorEdit() {
            if (!malaphor) {
                return;
            }
            const text = state.editText.trim();
            if (!text) {
                return;
            }
            const collision = checkForCollision(
                {
                    text,
                    componentIdiomIds: malaphor.componentIdiomIds,
                },
                database.malaphors,
                malaphor.id,
            );
            if (collision) {
                updateState({
                    editCollisionWarning: collision,
                });
                return;
            }
            performSaveMalaphorEdit();
        }

        function setComponentIds(componentIdiomIds: Uuid[]) {
            if (!malaphor) {
                return;
            }
            const updated: Malaphor = {
                ...malaphor,
                componentIdiomIds,
                updatedAt: getNowInIsoString(),
            };
            storage.set.codex({
                ...database,
                malaphors: database.malaphors.map((entry) => {
                    return entry.id === updated.id ? updated : entry;
                }),
            });
        }

        return html`
            ${state.editingMalaphor
                ? html`
                      <div class="edit-field">
                          <textarea
                              class="malaphor-text-input"
                              rows="2"
                              .value=${state.editText}
                              ${listen('input', (event) => {
                                  const textarea = event.target as HTMLTextAreaElement;
                                  textarea.style.height = 'auto';
                                  textarea.style.height = `${textarea.scrollHeight}px`;
                                  updateState({
                                      editText: textarea.value,
                                      editCollisionWarning: undefined,
                                  });
                              })}
                          ></textarea>
                      </div>
                  `
                : html`
                      <p class="malaphor-text">${malaphor.text}</p>
                  `}
            <div class="rating-row">
                <${StarRating.assign({
                    rating: malaphor.rating,
                })}
                    ${listen(StarRating.events.rate, (event) => setRating(event.detail))}
                ></${StarRating}>
                ${RATING_CAPTIONS[malaphor.rating]
                    ? html`
                          <span class="rating-caption">${RATING_CAPTIONS[malaphor.rating]}</span>
                      `
                    : ''}
            </div>
            ${state.editingComponents
                ? html`
                      <h2 class="section-heading">Built from</h2>
                      <div class="chips">
                          ${attachedIdioms.map((idiom) => {
                              return html`
                                  <${IdiomChip.assign({
                                      text: idiom.text,
                                  })}
                                      ${listen(IdiomChip.events.remove, () => {
                                          setComponentIds(
                                              malaphor.componentIdiomIds.filter(
                                                  (id) => id !== idiom.id,
                                              ),
                                          );
                                      })}
                                  ></${IdiomChip}>
                              `;
                          })}
                      </div>
                      <${IdiomTypeahead.assign({
                          idioms: database.idioms,
                          attachedIdiomIds: malaphor.componentIdiomIds,
                          recentIdiomIds,
                      })}
                          ${listen(IdiomTypeahead.events.attachExisting, (event) => {
                              setComponentIds([
                                  ...malaphor.componentIdiomIds,
                                  event.detail as Uuid,
                              ]);
                          })}
                          ${listen(IdiomTypeahead.events.createAndAttach, (event) => {
                              const now = getNowInIsoString();
                              const newIdiom: Idiom = {
                                  id: createUuidV4(),
                                  text: event.detail,
                                  aliases: [],
                                  notes: '',
                                  createdAt: now,
                                  updatedAt: now,
                              };
                              const updated: Malaphor = {
                                  ...malaphor,
                                  componentIdiomIds: [
                                      ...malaphor.componentIdiomIds,
                                      newIdiom.id,
                                  ],
                                  updatedAt: now,
                              };
                              storage.set.codex({
                                  ...database,
                                  idioms: [
                                      ...database.idioms,
                                      newIdiom,
                                  ],
                                  malaphors: database.malaphors.map((entry) => {
                                      return entry.id === updated.id ? updated : entry;
                                  }),
                              });
                          })}
                      ></${IdiomTypeahead}>
                      <button
                          type="button"
                          class="tag-toggle"
                          ${listen('click', () => {
                              return updateState({
                                  editingComponents: false,
                              });
                          })}
                      >
                          Done
                      </button>
                  `
                : html`
                      ${glossLines.length
                          ? html`
                                <${IdiomGloss.assign({
                                    lines: glossLines,
                                    linkToIdioms: true,
                                })}></${IdiomGloss}>
                                <button
                                    type="button"
                                    class="tag-toggle"
                                    ${listen('click', () => {
                                        return updateState({
                                            editingComponents: true,
                                        });
                                    })}
                                >
                                    Edit idioms
                                </button>
                            `
                          : html`
                                <p class="untagged-hint">Untagged.</p>
                                <button
                                    type="button"
                                    class="tag-toggle"
                                    ${listen('click', () => {
                                        return updateState({
                                            editingComponents: true,
                                        });
                                    })}
                                >
                                    Add idioms
                                </button>
                            `}
                  `}
            ${state.editingMalaphor
                ? html`
                      <div class="edit-field">
                          <textarea
                              class="notes-input"
                              placeholder="Notes (optional)"
                              .value=${state.editNotes}
                              ${listen('input', (event) => {
                                  updateState({
                                      editNotes: (event.target as HTMLTextAreaElement).value,
                                  });
                              })}
                          ></textarea>
                      </div>
                      ${state.editCollisionWarning
                          ? html`
                                <div class="collision-warning">
                                    <p class="warning-heading">
                                        ${state.editCollisionWarning.type === 'exact-duplicate'
                                            ? 'You already have this one.'
                                            : "You've blended these two before."}
                                    </p>
                                    <p class="warning-detail">
                                        "${state.editCollisionWarning.matchedMalaphor.text}" — added
                                        ${formatDate(
                                            state.editCollisionWarning.matchedMalaphor.createdAt,
                                        )}
                                    </p>
                                    <div class="warning-actions">
                                        <button
                                            type="button"
                                            ${listen('click', () => {
                                                if (!state.editCollisionWarning) {
                                                    return;
                                                }
                                                router.setRoute({
                                                    paths: malaphorDetailRoute(
                                                        state.editCollisionWarning.matchedMalaphor
                                                            .id,
                                                    ),
                                                });
                                            })}
                                        >
                                            View it
                                        </button>
                                        <button
                                            type="button"
                                            ${listen('click', performSaveMalaphorEdit)}
                                        >
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
                                        ${listen('click', attemptSaveMalaphorEdit)}
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        class="text-button"
                                        ${listen('click', () => {
                                            return updateState({
                                                editingMalaphor: false,
                                            });
                                        })}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            `}
                  `
                : malaphor.notes
                  ? html`
                        <p class="notes">${malaphor.notes}</p>
                    `
                  : ''}
            <p class="dates">
                Created ${formatDate(malaphor.createdAt)}
                ${malaphor.updatedAt === malaphor.createdAt
                    ? ''
                    : html`
                          · Updated ${formatDate(malaphor.updatedAt)}
                      `}
            </p>
            ${state.editingMalaphor
                ? ''
                : html`
                      <div class="actions">
                          ${state.confirmingDelete
                              ? html`
                                    <button
                                        type="button"
                                        class="confirm-delete"
                                        ${listen('click', deleteMalaphor)}
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
                                    <button type="button" ${listen('click', startEditingMalaphor)}>
                                        Edit
                                    </button>
                                    <button type="button" ${listen('click', shareMalaphor)}>
                                        Share
                                    </button>
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
                                    ${state.shareFeedback
                                        ? html`
                                              <span class="share-feedback">
                                                  ${state.shareFeedback}
                                              </span>
                                          `
                                        : ''}
                                `}
                      </div>
                  `}
        `;
    },
});
