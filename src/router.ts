import {type FullSpaRoute, PathTree, SpaRouter} from 'spa-router-vir';

/**
 * Route table from the design doc §6. `malaphor/:id` and `idiom/:id` are the only two-segment
 * routes; everything else is a bare top-level path.
 */
const pathTree = new PathTree({
    allowBare: true,
    children: {
        new: {},
        malaphor: {
            anyChildren: true,
        },
        idioms: {},
        idiom: {
            anyChildren: true,
        },
        settings: {},
    },
});

export type CodexPaths = typeof pathTree.PathsType;
/**
 * Only recognized search param is `filter=untagged`, used to land on the Codex's Untagged filter
 * (§9 Keep import).
 */
export type CodexSearch = Readonly<{filter?: readonly string[]}>;
export type CodexRoute = FullSpaRoute<CodexPaths, CodexSearch, undefined>;

export const router = new SpaRouter<CodexPaths, CodexSearch, undefined>({
    sanitizeRoute(rawRoute) {
        return {
            paths: pathTree.sanitizePaths(rawRoute.paths),
            search: rawRoute.search?.filter
                ? {
                      filter: rawRoute.search.filter,
                  }
                : {},
            hash: undefined,
        };
    },
});

export function codexRoute(): CodexPaths {
    return [];
}

export function composeRoute(): CodexPaths {
    return ['new'];
}

export function malaphorDetailRoute(malaphorId: string): CodexPaths {
    return [
        'malaphor',
        malaphorId,
    ];
}

export function glossaryRoute(): CodexPaths {
    return ['idioms'];
}

export function idiomDetailRoute(idiomId: string): CodexPaths {
    return [
        'idiom',
        idiomId,
    ];
}

export function settingsRoute(): CodexPaths {
    return ['settings'];
}
