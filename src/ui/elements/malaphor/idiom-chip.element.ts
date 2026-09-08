import {css, defineElement, defineElementEvent, html, listen} from 'element-vir';
import {formControlFontFix} from '../shared-styles.js';

export const IdiomChip = defineElement<{text: string}>()({
    tagName: 'idiom-chip',
    events: {
        remove: defineElementEvent<void>(),
    },
    styles: css`
        ${formControlFontFix}

        :host {
            display: inline-flex;
        }

        .chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            min-height: 44px;
            padding: 4px 4px 4px 12px;
            border: 1px solid var(--terre-verte);
            border-radius: var(--border-radius);
            color: var(--terre-verte);
            font-family: var(--font-serif);
            font-size: var(--font-size-gloss);
        }

        button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border: none;
            background: none;
            color: var(--terre-verte);
            font-size: 18px;
            line-height: 1;
            cursor: pointer;
        }
    `,
    render({inputs, dispatch, events}) {
        return html`
            <span class="chip">
                ${inputs.text}
                <button
                    type="button"
                    aria-label="Remove ${inputs.text}"
                    ${listen('click', () => dispatch(new events.remove()))}
                >
                    ×
                </button>
            </span>
        `;
    },
});
