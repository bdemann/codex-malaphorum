import {assert} from '@augment-vir/assert';
import {describe, it} from 'node:test';
import {describeSourceUrl, parseSourceUrl} from './source-url.js';

describe(parseSourceUrl.name, () => {
    it('treats blank input as "no link"', () => {
        assert.strictEquals(parseSourceUrl('   '), '');
    });

    it('accepts and trims http and https links', () => {
        assert.strictEquals(
            parseSourceUrl(' https://example.com/a?b=1 '),
            'https://example.com/a?b=1',
        );
        assert.strictEquals(parseSourceUrl('http://example.com'), 'http://example.com');
    });

    it('rejects non-web protocols', () => {
        assert.isUndefined(parseSourceUrl('javascript:alert(1)'));
        assert.isUndefined(parseSourceUrl('ftp://example.com'));
    });

    it('rejects text that is not a URL', () => {
        assert.isUndefined(parseSourceUrl('phrases dot org'));
    });
});

describe(describeSourceUrl.name, () => {
    it('shows the hostname without a leading www', () => {
        assert.strictEquals(
            describeSourceUrl('https://www.phrases.org.uk/meanings/x.html'),
            'phrases.org.uk',
        );
    });

    it('falls back to the raw text for a malformed value', () => {
        assert.strictEquals(describeSourceUrl('not a url'), 'not a url');
    });
});
