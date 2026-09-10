import {css, defineElement, html, listen} from 'element-vir';
import {malaphorDetailRoute, router} from '../../../router.js';
import {IdiomGloss, type GlossLine} from './idiom-gloss.element.js';
import {StarRating} from './star-rating.element.js';

export const MalaphorRow = defineElement<{
    malaphorId: string;
    malaphorText: string;
    glossLines: readonly GlossLine[];
    rating: number;
}>()({
    tagName: 'malaphor-row',
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

        .malaphor-text {
            font-size: var(--font-size-malaphor-row);
            color: var(--iron-gall);
            margin: 0 0 8px;
        }

        star-rating {
            display: block;
            margin-top: 6px;
        }
    `,
    render({inputs}) {
        const url = router.createRouteUrl({
            paths: malaphorDetailRoute(inputs.malaphorId),
        }).url;

        return html`
            <a
                href=${url}
                ${listen('click', (event) => {
                    router.setRouteOnDirectNavigation(
                        {
                            paths: malaphorDetailRoute(inputs.malaphorId),
                        },
                        event as MouseEvent,
                    );
                })}
            >
                <p class="malaphor-text">${inputs.malaphorText}</p>
                <${IdiomGloss.assign({
                    lines: inputs.glossLines,
                })}></${IdiomGloss}>
                ${inputs.rating > 0
                    ? html`
                          <${StarRating.assign({
                              rating: inputs.rating,
                              readonly: true,
                          })}></${StarRating}>
                      `
                    : ''}
            </a>
        `;
    },
});
