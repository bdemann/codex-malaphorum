import {utcIsoStringShape} from 'date-vir';
import {defineShape, uuidShape} from 'object-shape-tester';

export const idiomShape = defineShape({
    id: uuidShape(),
    /** Canonical form, as you'd say it. */
    text: '',
    /** Variant phrasings, manually added. */
    aliases: [''],
    /** Meaning, origin, whatever. */
    notes: '',
    createdAt: utcIsoStringShape(),
    updatedAt: utcIsoStringShape(),
});

export const malaphorShape = defineShape({
    id: uuidShape(),
    text: '',
    /** Usually 2, sometimes more, may be empty for untagged imports. */
    componentIdiomIds: [uuidShape()],
    notes: '',
    createdAt: utcIsoStringShape(),
    updatedAt: utcIsoStringShape(),
});

export const databaseShape = defineShape({
    /** Bump on breaking schema change. */
    version: 1,
    idioms: [idiomShape],
    malaphors: [malaphorShape],
});

export type Idiom = typeof idiomShape.runtimeType;
export type Malaphor = typeof malaphorShape.runtimeType;
export type CodexDatabase = typeof databaseShape.runtimeType;
