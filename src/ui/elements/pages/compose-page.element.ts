import {css, defineElement, html} from 'element-vir';

export const ComposePage = defineElement()({
    tagName: 'compose-page',
    styles: css`
        :host {
            display: block;
            padding: 20px;
        }

        h1 {
            font-size: var(--font-size-heading);
            font-weight: 500;
            font-feature-settings: 'smcp' 1;
            margin: 0 0 12px;
        }
    `,
    render() {
        return html`
            <h1>New malaphor</h1>
            <p>The compose flow (§7) goes here.</p>
        `;
    },
});
