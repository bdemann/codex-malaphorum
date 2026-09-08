import {css, defineElement, defineElementEvent, html, listen} from 'element-vir';
import {formControlFontFix} from '../shared-styles.js';

export const FabButton = defineElement<{label: string}>()({
    tagName: 'fab-button',
    events: {
        activate: defineElementEvent<void>(),
    },
    styles: css`
        ${formControlFontFix}

        :host {
            position: fixed;
            /* Sits just above the bottom nav, clear of a notched-device home indicator. */
            right: 20px;
            bottom: calc(20px + 56px + env(safe-area-inset-bottom, 0px));
        }

        button {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: none;
            background-color: var(--oak);
            color: var(--vellum);
            font-family: var(--font-serif);
            font-size: 28px;
            line-height: 1;
            cursor: pointer;
        }
    `,
    render({inputs, dispatch, events}) {
        return html`
            <button
                aria-label=${inputs.label}
                ${listen('click', () => dispatch(new events.activate()))}
            >
                +
            </button>
        `;
    },
});
