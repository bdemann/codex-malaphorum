import {itCases} from '@augment-vir/test';
import {describe} from 'node:test';
import {normalize} from './normalize.js';

describe(normalize.name, () => {
    itCases(normalize, [
        {
            it: 'lowercases',
            input: 'Burn A Bridge',
            expect: 'burn a bridge',
        },
        {
            it: 'strips diacritics',
            input: 'café',
            expect: 'cafe',
        },
        {
            it: 'unifies a curly apostrophe to a straight apostrophe',
            input: 'we’ll not',
            expect: "we'll not",
        },
        {
            it: 'unifies a backtick to a straight apostrophe',
            input: 'it`s fine',
            expect: "it's fine",
        },
        {
            it: 'turns punctuation into spaces',
            input: 'burn a bridge, and cross it!',
            expect: 'burn a bridge and cross it',
        },
        {
            it: 'collapses repeated whitespace',
            input: '  burn   a    bridge  ',
            expect: 'burn a bridge',
        },
        {
            it: 'keeps small words that plain search would want to drop',
            input: 'cross a bridge',
            expect: 'cross a bridge',
        },
        {
            it: 'keeps small words distinct from their variants',
            input: 'cross that bridge',
            expect: 'cross that bridge',
        },
        {
            it: 'preserves a straight apostrophe',
            input: "don't count your chickens",
            expect: "don't count your chickens",
        },
        {
            it: 'handles an empty string',
            input: '',
            expect: '',
        },
        {
            it: 'handles a string that is only punctuation',
            input: '...!!!???',
            expect: '',
        },
    ]);
});
