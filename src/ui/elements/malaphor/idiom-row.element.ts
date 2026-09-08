import {css, defineElement, html, listen} from 'element-vir';
import {idiomDetailRoute, router} from '../../../router.js';

export const IdiomRow = defineElement<{
    idiomId: string;
    idiomText: string;
    usageCount: number;
}>()({
    tagName: 'idiom-row',
    styles: css`
        :host {
            display: block;
            border-bottom: 1px solid color-mix(in srgb, var(--iron-faded) 20%, transparent);
        }

        a {
            display: block;
            padding: 16px 20px;
            color: inherit;
            text-decoration: none;
        }

        .idiom-text {
            font-size: var(--font-size-malaphor-row);
            color: var(--terre-verte);
            margin: 0 0 4px;
        }

        .usage {
            font-size: var(--font-size-gloss);
            color: var(--iron-faded);
        }
    `,
    render({inputs}) {
        const url = router.createRouteUrl({
            paths: idiomDetailRoute(inputs.idiomId),
        }).url;

        return html`
            <a
                href=${url}
                ${listen('click', (event) => {
                    router.setRouteOnDirectNavigation(
                        {
                            paths: idiomDetailRoute(inputs.idiomId),
                        },
                        event as MouseEvent,
                    );
                })}
            >
                <p class="idiom-text">${inputs.idiomText}</p>
                <p class="usage">
                    ${inputs.usageCount ? `used in ${inputs.usageCount}` : 'unused'}
                </p>
            </a>
        `;
    },
});
