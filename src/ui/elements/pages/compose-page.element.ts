import {createUuidV4, type Uuid} from '@augment-vir/common';
import {createFullDateInUserTimezone, getNowInIsoString, toFormattedString} from 'date-vir';
import {css, defineElement, html, listen} from 'element-vir';
import {
    checkForCollision,
    findMalaphorsSharingComponents,
    type CollisionCheck,
} from '../../../data/collisions.js';
import {computeRecentIdiomIds} from '../../../data/idiom-usage.js';
import type {CodexDatabase, Idiom, Malaphor} from '../../../data/shapes.js';
import {databaseShape} from '../../../data/shapes.js';
import {storage} from '../../../data/storage.js';
import {codexRoute, malaphorDetailRoute, router} from '../../../router.js';
import {IdiomChip} from '../malaphor/idiom-chip.element.js';
import {IdiomTypeahead} from '../malaphor/idiom-typeahead.element.js';
import {formControlFontFix} from '../shared-styles.js';

function formatAddedDate(isoString: string): string {
    return toFormattedString(createFullDateInUserTimezone(isoString), 'd MMMM yyyy');
}

export const ComposePage = defineElement()({
    tagName: 'compose-page',
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

        textarea,
        .malaphor-text-input {
            width: 100%;
            box-sizing: border-box;
            border: none;
            background: none;
            font-family: var(--font-serif);
            font-size: var(--font-size-body);
            color: var(--iron-gall);
            padding: 0;
            resize: none;
            overflow: hidden;
        }

        .field-block {
            margin-bottom: 24px;
        }

        h2.section-heading {
            font-size: var(--font-size-heading);
            font-weight: 500;
            font-feature-settings: 'smcp' 1;
            margin: 0 0 12px;
        }

        .chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 12px;
        }

        .untagged-hint {
            margin-top: 8px;
            color: var(--iron-faded);
            font-size: var(--font-size-gloss);
        }

        .notes-input {
            background-color: var(--vellum-deep);
            border: none;
            border-radius: var(--border-radius);
            padding: 10px 12px;
            min-height: 4em;
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

        .collision-warning {
            border: 1px solid var(--minium);
            border-radius: var(--border-radius);
            padding: 16px;
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

        .shared-components {
            margin-top: 16px;
            color: var(--iron-faded);
            font-size: var(--font-size-gloss);
        }

        .shared-components a {
            color: var(--terre-verte);
        }
    `,
    state(): {
        database: CodexDatabase;
        removeStorageListener: (() => void) | undefined;
        malaphorText: string;
        notes: string;
        attachedIdiomIds: Uuid[];
        collisionWarning: CollisionCheck | undefined;
    } {
        return {
            database: storage.get.codex() ?? databaseShape.default,
            removeStorageListener: undefined,
            malaphorText: '',
            notes: '',
            attachedIdiomIds: [],
            collisionWarning: undefined,
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
        const {database, malaphorText, notes, attachedIdiomIds} = state;
        const idiomsById = new Map(
            database.idioms.map((idiom) => {
                return [
                    idiom.id,
                    idiom,
                ] as const;
            }),
        );
        const attachedIdioms = attachedIdiomIds
            .map((id) => idiomsById.get(id))
            .filter((idiom): idiom is Idiom => idiom !== undefined);
        const recentIdiomIds = computeRecentIdiomIds(database);
        const sharedComponentMalaphors = findMalaphorsSharingComponents(
            {
                componentIdiomIds: attachedIdiomIds,
            },
            database.malaphors,
        );

        function performSave() {
            const text = malaphorText.trim();
            if (!text) {
                return;
            }
            const now = getNowInIsoString();
            const newMalaphor: Malaphor = {
                id: createUuidV4(),
                text,
                componentIdiomIds: attachedIdiomIds,
                notes: notes.trim(),
                rating: 0,
                createdAt: now,
                updatedAt: now,
            };
            storage.set.codex({
                ...database,
                malaphors: [
                    ...database.malaphors,
                    newMalaphor,
                ],
            });
            router.setRoute({
                paths: malaphorDetailRoute(newMalaphor.id),
            });
        }

        function attemptSave() {
            const text = malaphorText.trim();
            if (!text) {
                return;
            }
            const collision = checkForCollision(
                {
                    text,
                    componentIdiomIds: attachedIdiomIds,
                },
                database.malaphors,
            );
            if (collision) {
                updateState({
                    collisionWarning: collision,
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
                    aria-label="Back to the Codex"
                    ${listen('click', () => {
                        return router.setRoute({
                            paths: codexRoute(),
                        });
                    })}
                >
                    ←
                </button>
                <h1>New malaphor</h1>
            </header>
            <div class="fields">
                <div class="field-block">
                    <textarea
                        class="malaphor-text-input"
                        placeholder="We'll burn that bridge when we come to it"
                        rows="2"
                        .value=${malaphorText}
                        ${listen('input', (event) => {
                            const textarea = event.target as HTMLTextAreaElement;
                            textarea.style.height = 'auto';
                            textarea.style.height = `${textarea.scrollHeight}px`;
                            updateState({
                                malaphorText: textarea.value,
                                collisionWarning: undefined,
                            });
                        })}
                    ></textarea>
                </div>

                <div class="field-block">
                    <h2 class="section-heading">Built from</h2>
                    <div class="chips">
                        ${attachedIdioms.map((idiom) => {
                            return html`
                                <${IdiomChip.assign({
                                    text: idiom.text,
                                })}
                                    ${listen(IdiomChip.events.remove, () => {
                                        updateState({
                                            attachedIdiomIds: attachedIdiomIds.filter(
                                                (id) => id !== idiom.id,
                                            ),
                                            collisionWarning: undefined,
                                        });
                                    })}
                                ></${IdiomChip}>
                            `;
                        })}
                    </div>
                    <${IdiomTypeahead.assign({
                        idioms: database.idioms,
                        attachedIdiomIds,
                        recentIdiomIds,
                    })}
                        ${listen(IdiomTypeahead.events.attachExisting, (event) => {
                            updateState({
                                attachedIdiomIds: [
                                    ...attachedIdiomIds,
                                    event.detail as Uuid,
                                ],
                                collisionWarning: undefined,
                            });
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
                            storage.set.codex({
                                ...database,
                                idioms: [
                                    ...database.idioms,
                                    newIdiom,
                                ],
                            });
                            updateState({
                                attachedIdiomIds: [
                                    ...attachedIdiomIds,
                                    newIdiom.id,
                                ],
                                collisionWarning: undefined,
                            });
                        })}
                    ></${IdiomTypeahead}>
                    ${attachedIdiomIds.length < 2
                        ? html`
                              <p class="untagged-hint">
                                  No components tagged. You can add them later.
                              </p>
                          `
                        : ''}
                </div>

                <div class="field-block">
                    <h2 class="section-heading">Notes (optional)</h2>
                    <textarea
                        class="notes-input"
                        .value=${notes}
                        ${listen('input', (event) => {
                            updateState({
                                notes: (event.target as HTMLTextAreaElement).value,
                            });
                        })}
                    ></textarea>
                </div>

                ${state.collisionWarning
                    ? html`
                          <div class="collision-warning">
                              <p class="warning-heading">
                                  ${state.collisionWarning.type === 'exact-duplicate'
                                      ? 'You already have this one.'
                                      : "You've blended these two before."}
                              </p>
                              <p class="warning-detail">
                                  "${state.collisionWarning.matchedMalaphor.text}" — added
                                  ${formatAddedDate(
                                      state.collisionWarning.matchedMalaphor.createdAt,
                                  )}
                              </p>
                              <div class="warning-actions">
                                  <button
                                      type="button"
                                      ${listen('click', () => {
                                          if (!state.collisionWarning) {
                                              return;
                                          }
                                          router.setRoute({
                                              paths: malaphorDetailRoute(
                                                  state.collisionWarning.matchedMalaphor.id,
                                              ),
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
                              ?disabled=${!malaphorText.trim()}
                              ${listen('click', attemptSave)}
                          >
                              Save malaphor
                          </button>
                      `}
                ${sharedComponentMalaphors.length
                    ? html`
                          <p class="shared-components">
                              Also used in:
                              ${sharedComponentMalaphors.map((malaphor, index) => {
                                  const url = router.createRouteUrl({
                                      paths: malaphorDetailRoute(malaphor.id),
                                  }).url;
                                  return html`
                                      ${index > 0 ? ', ' : ''}
                                      <a href=${url}>${malaphor.text}</a>
                                  `;
                              })}
                          </p>
                      `
                    : ''}
            </div>
        `;
    },
});
