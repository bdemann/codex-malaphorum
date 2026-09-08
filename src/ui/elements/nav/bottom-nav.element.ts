import {css, defineElement, html, listen} from 'element-vir';
import {
    type CodexPaths,
    codexRoute,
    glossaryRoute,
    router,
    settingsRoute,
} from '../../../router.js';

type NavItem = {
    label: string;
    paths: CodexPaths;
    /** Matches this item as active for any route sharing this top-level path segment. */
    topLevelSegment: string;
};

const navItems: readonly NavItem[] = [
    {
        label: 'Codex',
        paths: codexRoute(),
        topLevelSegment: '',
    },
    {
        label: 'Glossary',
        paths: glossaryRoute(),
        topLevelSegment: 'idioms',
    },
    {
        label: 'Settings',
        paths: settingsRoute(),
        topLevelSegment: 'settings',
    },
];

export const BottomNav = defineElement<{activeTopLevelSegment: string}>()({
    tagName: 'bottom-nav',
    styles: css`
        :host {
            display: flex;
            background-color: var(--oak);
            /* env() keeps nav taps clear of a notched-device home indicator. */
            padding-bottom: env(safe-area-inset-bottom, 0);
        }

        a {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 56px;
            color: var(--vellum-deep);
            text-decoration: none;
            font-family: var(--font-serif);
            font-size: var(--font-size-gloss);
            font-feature-settings: 'smcp' 1;
        }

        a.active {
            color: var(--vellum);
        }
    `,
    render({inputs}) {
        return html`
            ${navItems.map((item) => {
                const url = router.createRouteUrl({
                    paths: item.paths,
                }).url;
                const isActive = item.topLevelSegment === inputs.activeTopLevelSegment;
                return html`
                    <a
                        href=${url}
                        class=${isActive ? 'active' : ''}
                        ${listen('click', (event) => {
                            router.setRouteOnDirectNavigation(
                                {
                                    paths: item.paths,
                                },
                                event as MouseEvent,
                            );
                        })}
                    >
                        ${item.label}
                    </a>
                `;
            })}
        `;
    },
});
