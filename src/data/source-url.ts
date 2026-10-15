/**
 * Validates the free-text source-link field. Returns the trimmed URL (empty string for "no link"),
 * or `undefined` if it isn't a web link -- only `http(s)` is accepted so a pasted `javascript:` URL
 * can never become a clickable link.
 */
export function parseSourceUrl(rawUrl: string): string | undefined {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return '';
    }
    try {
        // eslint-disable-next-line @virmator/prefer-parse-url -- url-vir isn't a direct dependency, and its autofix changes how `protocol` is reported.
        const url = new URL(trimmed);
        return url.protocol === 'http:' || url.protocol === 'https:' ? trimmed : undefined;
    } catch {
        return undefined;
    }
}

/** Short label for a source link, e.g. `www.phrases.org.uk` -> `phrases.org.uk`. */
export function describeSourceUrl(sourceUrl: string): string {
    try {
        // eslint-disable-next-line @virmator/prefer-parse-url -- see parseSourceUrl.
        return new URL(sourceUrl).hostname.replace(/^www\./, '');
    } catch {
        return sourceUrl;
    }
}
