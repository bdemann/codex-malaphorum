import {LocalStorageClient} from '@electrovir/local-storage-client';
import {databaseShape} from './shapes.js';

export const storage = new LocalStorageClient(
    {
        codex: databaseShape,
    },
    {
        storeName: 'codex-malaphorum',
    },
);
