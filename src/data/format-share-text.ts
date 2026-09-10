import type {Idiom, Malaphor} from './shapes.js';

/** As brief as it can be: the malaphor's own text, plus its components on a second line, if any. */
export function formatMalaphorForShare(
    malaphor: Pick<Malaphor, 'text'>,
    componentIdioms: readonly Pick<Idiom, 'text'>[],
): string {
    if (!componentIdioms.length) {
        return malaphor.text;
    }
    const components = componentIdioms.map((idiom) => idiom.text).join(' + ');
    return `${malaphor.text}\n— ${components}`;
}
