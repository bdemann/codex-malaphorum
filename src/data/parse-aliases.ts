/** Splits a comma-separated aliases field into trimmed, non-empty entries. */
export function parseAliases(rawAliases: string): string[] {
    return rawAliases
        .split(',')
        .map((alias) => alias.trim())
        .filter((alias) => alias.length > 0);
}
