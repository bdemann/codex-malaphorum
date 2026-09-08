import {css, defineElement, html} from 'element-vir';

export type GlossLine = {
    idiomId: string;
    text: string;
    /** Set when this line is why a search result matched, so it's never unclear why. */
    highlighted?: boolean;
};

/**
 * The one bold visual move from the design doc (§4.3): a malaphor's component idioms render as a
 * manuscript gloss — smaller annotation, hairline rule, hanging indent — not as pills in a row.
 * Reused in list rows, detail views, and the compose preview.
 */
export const IdiomGloss = defineElement<{lines: readonly GlossLine[]}>()({
    tagName: 'idiom-gloss',
    styles: css`
        :host {
            display: block;
        }

        .gloss-line {
            display: flex;
            gap: 8px;
            padding-left: 12px;
            border-left: 1px solid var(--terre-verte);
            color: var(--terre-verte);
            font-size: var(--font-size-gloss);
            line-height: 1.4;
        }

        .gloss-line + .gloss-line {
            margin-top: 4px;
        }

        .gloss-line.highlighted {
            font-weight: 500;
        }
    `,
    render({inputs}) {
        return html`
            ${inputs.lines.map((line) => {
                return html`
                    <div class="gloss-line ${line.highlighted ? 'highlighted' : ''}">
                        ${line.text}
                    </div>
                `;
            })}
        `;
    },
});
