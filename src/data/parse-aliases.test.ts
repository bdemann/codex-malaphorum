import {assert} from '@augment-vir/assert';
import {describe, it} from 'node:test';
import {parseAliases} from './parse-aliases.js';

describe(parseAliases.name, () => {
    it('splits on commas and trims whitespace', () => {
        assert.deepEquals(parseAliases('burn your bridges,  burning bridges '), [
            'burn your bridges',
            'burning bridges',
        ]);
    });

    it('drops empty entries from doubled or trailing commas', () => {
        assert.deepEquals(parseAliases('one,,two,'), [
            'one',
            'two',
        ]);
    });

    it('returns an empty array for an empty string', () => {
        assert.deepEquals(parseAliases(''), []);
    });

    it('returns an empty array for whitespace-only input', () => {
        assert.deepEquals(parseAliases('   '), []);
    });

    it('returns a single entry for input with no commas', () => {
        assert.deepEquals(parseAliases('burn your bridges'), ['burn your bridges']);
    });
});
