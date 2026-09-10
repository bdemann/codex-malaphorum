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
    init({updateState}) {
        const removeRouteListener = router.listen(true, (route) => {
            updateState({
                route,
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
        /**
         * Only the three tab screens show the persistent bottom nav — none of the design doc's
         * mockups for compose or detail views include it, and a fixed nav bar would compete for
         * space with the on-screen keyboard during compose anyway.
         */
        const showBottomNav =
            (topLevelSegment === '' ||
                topLevelSegment === 'idioms' ||
                topLevelSegment === 'settings') &&
            !onNewIdiomScreen;

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
            ${showBottomNav
                ? html`
                      <${BottomNav.assign({
                          activeTopLevelSegment: topLevelSegment,
                      })}></${BottomNav}>
                  `
                : ''}
        `;
    },
});
