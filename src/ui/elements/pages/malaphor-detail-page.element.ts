import {css, defineElement, html} from 'element-vir';

export const MalaphorDetailPage = defineElement<{malaphorId: string}>()({
    tagName: 'malaphor-detail-page',
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
            <h1>Malaphor detail</h1>
            <p>
                Malaphor
                <code>${inputs.malaphorId}</code>
                detail/edit (§6) goes here.
            </p>
        `;
    },
});
