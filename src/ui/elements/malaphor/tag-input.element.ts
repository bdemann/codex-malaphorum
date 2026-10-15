import {css, defineElement, defineElementEvent, html, listen} from 'element-vir';
import {parseTags} from '../../../data/tags.js';
import {formControlFontFix} from '../shared-styles.js';

/**
 * Comma-separated origin-tags field plus one-tap suggestions drawn from tags already in use. The
 * parent owns the raw string (so it can seed it when editing) and parses it with `parseTags` on
 * save.
 */
export const TagInput = defineElement<{
    value: string;
    /** Tags already in use elsewhere in the glossary. */
    suggestions: readonly string[];
    inputId: string;
}>()({
    tagName: 'tag-input',
    events: {
        valueChange: defineElementEvent<string>(),
    },
    styles: css`
        ${formControlFontFix}

        :host {
            display: block;
        }

        input[type='text'] {
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

        .suggestions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
        }

        .suggestions button {
            min-height: 36px;
            padding: 4px 12px;
            border: 1px solid color-mix(in srgb, var(--terre-verte) 50%, transparent);
            border-radius: var(--border-radius);
            background: none;
            color: var(--terre-verte);
            font-family: var(--font-serif);
            font-size: var(--font-size-gloss);
            cursor: pointer;
        }
    `,
    render({inputs, dispatch, events}) {
        const currentTags = new Set(parseTags(inputs.value));
        const unusedSuggestions = inputs.suggestions.filter((tag) => !currentTags.has(tag));

        function addTag(tag: string) {
            const trimmed = inputs.value.trim().replace(/,$/, '').trim();
            dispatch(new events.valueChange(trimmed ? `${trimmed}, ${tag}` : tag));
        }

        return html`
            <input
                id=${inputs.inputId}
                type="text"
                placeholder="sports, nautical, biblical"
                .value=${inputs.value}
                ${listen('input', (event) => {
                    dispatch(new events.valueChange((event.target as HTMLInputElement).value));
                })}
            />
            ${unusedSuggestions.length
                ? html`
                      <div class="suggestions">
                          ${unusedSuggestions.map((tag) => {
                              return html`
                                  <button
                                      type="button"
                                      ${listen('click', () => {
                                          addTag(tag);
                                      })}
                                  >
                                      + ${tag}
                                  </button>
                              `;
                          })}
                      </div>
                  `
                : ''}
        `;
    },
});
