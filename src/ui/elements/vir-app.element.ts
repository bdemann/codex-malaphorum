import {css, defineElement, html, listen} from 'element-vir';
import {type CodexPaths, type CodexRoute, composeRoute, router} from '../../router.js';
import {BottomNav} from './nav/bottom-nav.element.js';
import {FabButton} from './nav/fab-button.element.js';
import {CodexPage} from './pages/codex-page.element.js';
import {ComposePage} from './pages/compose-page.element.js';
import {GlossaryPage} from './pages/glossary-page.element.js';
import {IdiomDetailPage} from './pages/idiom-detail-page.element.js';
import {MalaphorDetailPage} from './pages/malaphor-detail-page.element.js';
import {SettingsPage} from './pages/settings-page.element.js';

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
    `,
    state(): {
        route: CodexRoute | undefined;
        removeRouteListener: (() => void) | undefined;
    } {
        return {
            route: undefined,
            removeRouteListener: undefined,
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
        const topLevelSegment = paths[0] ?? '';
        const showFab = topLevelSegment === '' || topLevelSegment === 'idioms';
        /**
         * Only the three tab screens show the persistent bottom nav — none of the design doc's
         * mockups for compose or detail views include it, and a fixed nav bar would compete for
         * space with the on-screen keyboard during compose anyway.
         */
        const showBottomNav =
            topLevelSegment === '' ||
            topLevelSegment === 'idioms' ||
            topLevelSegment === 'settings';

        return html`
            <main>${renderPage(paths)}</main>
            ${showFab
                ? html`
                      <${FabButton.assign({
                          label: 'Add',
                      })}
                          ${listen(FabButton.events.activate, () => {
                              router.setRoute({
                                  paths: composeRoute(),
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
