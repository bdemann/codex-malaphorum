import {css, defineElement, html} from 'element-vir';

export const GlossaryPage = defineElement()({
    tagName: 'glossary-page',
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
            <h1>The Glossary</h1>
            <p>Idiom list and search go here.</p>
        `;
    },
});
