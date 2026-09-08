import {createFullDateInUserTimezone, toFormattedString} from 'date-vir';
import {css, defineElement, html, listen} from 'element-vir';
import type {CodexDatabase, Idiom} from '../../../data/shapes.js';
import {databaseShape} from '../../../data/shapes.js';
import {storage} from '../../../data/storage.js';
import {codexRoute, router} from '../../../router.js';
import {IdiomGloss, type GlossLine} from '../malaphor/idiom-gloss.element.js';
import {formControlFontFix} from '../shared-styles.js';

function formatDate(isoString: string): string {
    return toFormattedString(createFullDateInUserTimezone(isoString), 'd MMMM yyyy');
}

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

        .actions {
            margin-top: 32px;
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

        return html`
            <p class="malaphor-text">${malaphor.text}</p>
            ${glossLines.length
                ? html`
                      <${IdiomGloss.assign({
                          lines: glossLines,
                          linkToIdioms: true,
                      })}></${IdiomGloss}>
                  `
                : ''}
            ${malaphor.notes
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
