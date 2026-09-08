import {css, defineElement, html} from 'element-vir';

export const IdiomDetailPage = defineElement<{idiomId: string}>()({
    tagName: 'idiom-detail-page',
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
    render({inputs}) {
        return html`
            <h1>Idiom detail</h1>
            <p>
                Idiom
                <code>${inputs.idiomId}</code>
                : text, aliases, notes, and malaphors built from it (§6) go here.
            </p>
        `;
    },
});
