import {css} from 'element-vir';

/**
 * Form controls don't inherit typographic properties from their shadow-root ancestors by default (a
 * long-standing UA-stylesheet quirk) — without this, oldstyle figures and kerning silently stop at
 * every button/input, even though font-family is set explicitly on each one. This also themes the
 * browser's default focus ring (a stark blue everywhere, unstyled) to something ink-toned, and
 * removes the native search-input "clear" icon (rendered unstyled too, and in the same jarring
 * blue) rather than leave it half-themed. Interpolate this into any component's `styles` that
 * renders a button/input/select/textarea.
 */
export const formControlFontFix = css`
    button,
    input,
    select,
    textarea {
        font-feature-settings: inherit;
    }

    button:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible {
        outline: 2px solid var(--oak);
        outline-offset: 2px;
    }

    input[type='search']::-webkit-search-cancel-button {
        -webkit-appearance: none;
        appearance: none;
    }
`;
