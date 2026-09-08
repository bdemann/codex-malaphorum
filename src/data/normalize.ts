const combiningDiacriticalMarks = /[̀-ͯ]/g;
const curlyQuotesAndBacktick = /[‘’`]/g;

/**
 * Deliberately does NOT stem, strip stopwords, or drop articles: idioms live or die on their exact
 * small words ("a bridge" vs "that bridge"), and stripping them would break the very distinctions
 * search needs to preserve.
 */
export function normalize(input: string): string {
    return input
        .toLowerCase()
        .normalize('NFD')
        .replace(combiningDiacriticalMarks, '')
        .replace(curlyQuotesAndBacktick, "'")
        .replace(/[^a-z0-9' ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
