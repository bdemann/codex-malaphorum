import {css, defineElement, html, listen} from 'element-vir';
import {migrateStorage} from '../../data/migrate-storage.js';
import {storage} from '../../data/storage.js';
import {
    type CodexPaths,
    type CodexRoute,
    composeRoute,
    newIdiomRoute,
    router,
} from '../../router.js';
import {BottomNav} from './nav/bottom-nav.element.js';
import {FabButton} from './nav/fab-button.element.js';
import {CodexPage} from './pages/codex-page.element.js';
import {ComposePage} from './pages/compose-page.element.js';
import {GlossaryPage} from './pages/glossary-page.element.js';
import {IdiomDetailPage} from './pages/idiom-detail-page.element.js';
import {MalaphorDetailPage} from './pages/malaphor-detail-page.element.js';
import {NewIdiomPage} from './pages/new-idiom-page.element.js';
import {SettingsPage} from './pages/settings-page.element.js';

/** Must run before any component's `state()` reads storage -- see migrateStorage's own comment. */
migrateStorage(globalThis.localStorage, storage.storeName);

/**
 * The browser's own back/forward scroll restoration only knows about the document's scroll
 * position, but this app scrolls inside `<main>` instead -- left on `'auto'`, it still fires and
 * fights with the manual restore below, clamping `<main>`'s scrollTop to whatever the document (not
 * `<main>`) had at some earlier point. Opting out leaves scroll restoration entirely to the
 * `scrollPositionsBySegment` logic in `VirApp.init`.
 */
if ('scrollRestoration' in globalThis.history) {
    globalThis.history.scrollRestoration = 'manual';
}

/**
 * `<main>` is a single persistent element that `renderPage` swaps the _contents_ of on every
 * navigation, so its `scrollTop` doesn't reset on its own -- but it doesn't correctly track "where
 * you were on the Codex" either, since scrolling into a malaphor's detail view (which is short) and
 * back leaves `<main>` whatever short-page scrollTop it last had. Remembered per top-level segment
 * so leaving and returning to a list restores its scroll position.
 */
const scrollPositionsBySegment = new Map<string, number>();

function scrollKeyForPaths(paths: CodexPaths): string {
    return paths[0] ?? '';
}

function renderPage(paths: CodexPaths) {
    const [
        topLevelSegment,
        secondSegment,
    ] = paths;

    if (topLevelSegment === 'new') {
        return html`
            <${ComposePage}></${ComposePage}>
        `;
    } else if (topLevelSegment === 'malaphor') {
        return html`
            <${MalaphorDetailPage.assign({
                malaphorId: secondSegment ?? '',
            })}></${MalaphorDetailPage}>
        `;
    } else if (topLevelSegment === 'idioms' && secondSegment === 'new') {
        return html`
            <${NewIdiomPage}></${NewIdiomPage}>
        `;
    } else if (topLevelSegment === 'idioms') {
        return html`
            <${GlossaryPage}></${GlossaryPage}>
        `;
    } else if (topLevelSegment === 'idiom') {
        return html`
            <${IdiomDetailPage.assign({
                idiomId: secondSegment ?? '',
            })}></${IdiomDetailPage}>
        `;
    } else if (topLevelSegment === 'settings') {
        return html`
            <${SettingsPage}></${SettingsPage}>
        `;
    } else {
        return html`
            <${CodexPage}></${CodexPage}>
        `;
    }
}

export const VirApp = defineElement()({
    tagName: 'vir-app',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            /* 100vh is wrong on mobile Safari; 100dvh tracks the real visual viewport. */
            height: 100dvh;
        }

        main {
            flex: 1;
            overflow-y: auto;
        }

        .corrupt-data-banner {
            padding: 12px 20px;
            background-color: var(--vellum-deep);
            border-bottom: 1px solid var(--iron-faded);
            color: var(--iron-gall);
            font-size: var(--font-size-gloss);
        }
    `,
    state(): {
        route: CodexRoute | undefined;
        removeRouteListener: (() => void) | undefined;
        /**
         * True only when a `codex` value exists in storage but failed to parse or validate — never
         * true for a plain first-time install with nothing stored yet (§9 Persistence).
         */
        storedDataIsCorrupt: boolean;
    } {
        const rawValue = globalThis.localStorage.getItem(storage.storeName);
        const storedDataIsCorrupt = rawValue !== null && storage.get.codex() === undefined;
        return {
            route: undefined,
            removeRouteListener: undefined,
            storedDataIsCorrupt,
        };
    },
    init({updateState, host}) {
        /**
         * `scroll` doesn't bubble, but a capture-phase listener on an ancestor still sees it on the
         * way down to `<main>`, so this works without needing to re-query `<main>` (which doesn't
         * exist in the DOM yet at `init()` time -- it's part of the first render).
         */
        host.shadowRoot.addEventListener(
            'scroll',
            (event) => {
                if (event.target instanceof HTMLElement && event.target.tagName === 'MAIN') {
                    scrollPositionsBySegment.set(
                        scrollKeyForPaths(router.readCurrentRoute().paths),
                        event.target.scrollTop,
                    );
                }
            },
            {
                capture: true,
            },
        );

        const removeRouteListener = router.listen(true, (route) => {
            updateState({
                route,
            });
            /**
             * `host.updateComplete` only covers vir-app's own render pass -- it patches in a new
             * page _tag_ (e.g. `<codex-page>`), but that child custom element upgrades and runs its
             * own first Lit render asynchronously after that, so `<main>` has no scrollable content
             * yet at this point and would clamp `scrollTop` straight back to 0. A
             * `requestAnimationFrame` after `updateComplete` waits for that: microtasks (including
             * the child's own update cycle) always flush before the next frame.
             */
            void host.updateComplete.then(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const mainElement = host.shadowRoot.querySelector('main');
                        if (mainElement) {
                            mainElement.scrollTop =
                                scrollPositionsBySegment.get(scrollKeyForPaths(route.paths)) ?? 0;
                        }
                    });
                });
            });
        });
        updateState({
            removeRouteListener,
        });
    },
    cleanup({state}) {
        state.removeRouteListener?.();
    },
    render({state}) {
        const paths = state.route?.paths ?? [];
        const [
            topLevelSegment = '',
            secondSegment,
        ] = paths;
        const onNewIdiomScreen = topLevelSegment === 'idioms' && secondSegment === 'new';
        const showFab =
            (topLevelSegment === '' || topLevelSegment === 'idioms') && !onNewIdiomScreen;

        return html`
            ${state.storedDataIsCorrupt
                ? html`
                      <p class="corrupt-data-banner">
                          Stored data couldn't be read. Starting empty — import a backup from
                          Settings if you have one.
                      </p>
                  `
                : ''}
            <main>${renderPage(paths)}</main>
            ${showFab
                ? html`
                      <${FabButton.assign({
                          label: 'Add',
                      })}
                          ${listen(FabButton.events.activate, () => {
                              router.setRoute({
                                  paths:
                                      topLevelSegment === 'idioms'
                                          ? newIdiomRoute()
                                          : composeRoute(),
                              });
                          })}
                      ></${FabButton}>
                  `
                : ''}
            <${BottomNav.assign({
                activeTopLevelSegment: topLevelSegment,
            })}></${BottomNav}>
        `;
    },
});
