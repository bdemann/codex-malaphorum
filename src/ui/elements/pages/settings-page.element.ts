import {css, defineElement, html} from 'element-vir';

export const SettingsPage = defineElement()({
    tagName: 'settings-page',
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
            <h1>Settings</h1>
            <p>Export, import, Keep import, and stats (§9) go here.</p>
        `;
    },
});
