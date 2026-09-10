const {baseConfig} = require('@virmator/spellcheck/configs/cspell.config.base.cjs');

module.exports = {
    ...baseConfig,
    ignorePaths: [
        ...baseConfig.ignorePaths,
        // Personal export data, not source -- may contain deliberate malaphor/idiom misspellings.
        '.not-committed/**',
    ],
    words: [
        ...baseConfig.words,
        // The app's own invented/borrowed vocabulary (see codex-malaphorum-design.md).
        'malaphor',
        'malaphors',
        'Malaphorum',
        'malaphorium',
        'wordmark',
        'verte',
        'rubricators',
        'dedup',
        'blendable',
        'tappable',
        'autogrow',
        // OpenType feature tags used in font-feature-settings.
        'onum',
        'liga',
        'smcp',
        'oldstyle',
        // General technical/English terms missing from the base dictionary.
        'stopword',
        'stopwords',
        'stylesheet',
        'precaching',
        'WCAG',
        // Our own identifier.
        'Rankable',
        // Deliberately-nonsense test fixtures for no-match cases.
        'nonexistentword',
        'zzznomatch',
    ],
};
