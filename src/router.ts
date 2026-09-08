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
        idioms: {
            allowBare: true,
            children: {
                new: {},
            },
        },
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
export type CodexRoute = FullSpaRoute<CodexPaths, CodexSearch | undefined, undefined>;

export const router = new SpaRouter<CodexPaths, CodexSearch | undefined, undefined>({
    sanitizeRoute(rawRoute) {
        return {
            paths: pathTree.sanitizePaths(rawRoute.paths),
            /**
             * Must be `undefined`, not `{}`, when there's no filter: `sanitizeRoute`'s output is
             * deep-equal-compared against the raw parsed route (which has `search: undefined` for a
             * plain URL with no query string) to decide whether the route actually changed. A stray
             * `{}` here makes every navigation look "sanitized," which forces a second, no-op
             * `setRoute` call that never dispatches a route-change event -- so the URL updates but
             * the app never re-renders. Also matches `CodexSearch`'s `filter` being optional rather
             * than required with a default `[]`.
             */
            search: rawRoute.search?.filter
                ? {
                      filter: rawRoute.search.filter,
                  }
                : undefined,
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

export function newIdiomRoute(): CodexPaths {
    return [
        'idioms',
        'new',
    ];
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
