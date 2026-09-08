import {LocalStorageClient} from '@electrovir/local-storage-client';
import {utcIsoStringShape} from 'date-vir';
import {databaseShape, settingsShape} from './shapes.js';

export const storage = new LocalStorageClient(
    {
        codex: databaseShape,
        /** Undefined until the first export — never defaulted to a fake timestamp. */
        lastExportedAt: utcIsoStringShape(),
        settings: settingsShape,
    },
    {
        storeName: 'codex-malaphorum',
    },
);
