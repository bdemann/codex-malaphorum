import {css, defineElement, defineElementEvent, html, listen} from 'element-vir';

const STAR_VALUES = [
    1,
    2,
    3,
    4,
    5,
] as const;

export const StarRating = defineElement<{
    rating: number;
    /** Read-only, compact display -- used in list rows rather than the editable detail control. */
    readonly?: boolean;
}>()({
    tagName: 'star-rating',
    events: {
        rate: defineElementEvent<number>(),
    },
    styles: css`
        :host {
            display: inline-flex;
        }

        .stars {
            display: inline-flex;
            gap: 2px;
        }

        button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border: none;
            background: none;
            padding: 0;
            font-size: 22px;
            line-height: 1;
            cursor: pointer;
            color: var(--iron-faded);
        }

        button.filled {
            color: var(--minium);
        }

        .readonly-star {
            font-size: 13px;
            line-height: 1;
            color: var(--iron-faded);
        }

        .readonly-star.filled {
            color: var(--minium);
        }
    `,
    render({inputs, dispatch, events}) {
        if (inputs.readonly) {
            return html`
                <span class="stars">
                    ${STAR_VALUES.map((value) => {
                        const filled = value <= inputs.rating;
                        const starClass = `readonly-star ${filled ? 'filled' : ''}`;
                        return html`
                            <span class=${starClass}>${filled ? '★' : '☆'}</span>
                        `;
                    })}
                </span>
            `;
        }

        return html`
            <span class="stars">
                ${STAR_VALUES.map((value) => {
                    return html`
                        <button
                            type="button"
                            class="${value <= inputs.rating ? 'filled' : ''}"
                            aria-label="Rate ${value} star${value === 1 ? '' : 's'}"
                            aria-pressed=${value <= inputs.rating}
                            ${listen('click', () => {
                                dispatch(new events.rate(value === inputs.rating ? 0 : value));
                            })}
                        >
                            ${value <= inputs.rating ? '★' : '☆'}
                        </button>
                    `;
                })}
            </span>
        `;
    },
});
