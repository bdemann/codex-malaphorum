import {css} from 'element-vir';

/**
 * Form controls don't inherit typographic properties from their shadow-root ancestors by default (a
 * long-standing UA-stylesheet quirk) — without this, oldstyle figures and kerning silently stop at
 * every button/input, even though font-family is set explicitly on each one. Interpolate this into
 * any component's `styles` that renders a button/input/select/textarea.
 */
export const formControlFontFix = css`
    button,
    input,
    select,
    textarea {
        font-feature-settings: inherit;
    }
`;
