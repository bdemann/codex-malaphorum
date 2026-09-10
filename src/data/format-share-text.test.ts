import {assert} from '@augment-vir/assert';
import {describe, it} from 'node:test';
import {formatMalaphorForShare} from './format-share-text.js';

describe(formatMalaphorForShare.name, () => {
    it('returns just the text for an untagged malaphor', () => {
        assert.strictEquals(
            formatMalaphorForShare(
                {
                    text: "We'll burn that bridge when we come to it",
                },
                [],
            ),
            "We'll burn that bridge when we come to it",
        );
    });

    it('appends a single component on its own line', () => {
        assert.strictEquals(
            formatMalaphorForShare(
                {
                    text: "We'll burn that bridge when we come to it",
                },
                [
                    {
                        text: 'burn a bridge',
                    },
                ],
            ),
            "We'll burn that bridge when we come to it\n— burn a bridge",
        );
    });

    it('joins multiple components with a plus sign', () => {
        assert.strictEquals(
            formatMalaphorForShare(
                {
                    text: "We'll burn that bridge when we come to it",
                },
                [
                    {
                        text: 'burn a bridge',
                    },
                    {
                        text: 'cross that bridge when we come to it',
                    },
                ],
            ),
            "We'll burn that bridge when we come to it\n— burn a bridge + cross that bridge when we come to it",
        );
    });
});
