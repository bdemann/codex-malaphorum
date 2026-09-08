# Codex Malaphorum

A personal PWA for tracking hand-crafted malaphors and the idiom library they're built from. No
accounts, no sync, no backend — see `codex-malaphorum-design.md` for the full design doc this app
was built from.

## Scripts

```bash
npm run start     # dev server
npm run build     # production build (dist/)
npm run compile   # typecheck
npm run test      # unit tests (src/**/*.test.ts)
npm run lint      # eslint --fix
npm run format    # prettier
```

Node version is pinned via `.nvmrc` (24.20.0) — newer than the design doc's original Node 22
suggestion; see "Netlify Node version" below for why.

## Deferred by design (not gaps — see design doc for reasoning)

-   **Fuzzy/subset dedup matching** (§8): the collision checker only catches exact-text and
    exact-component-set duplicates. Subset/superset component matching, fuzzy text similarity, and
    edit-distance thresholds are explicitly out of scope for MVP.
-   **IndexedDB / `navigator.storage.persist()`**: storage is plain `localStorage`, which browsers
    can evict under pressure. If the collection grows large enough that losing it would actually
    hurt, migrating to IndexedDB with persistent storage is the upgrade path — not built now.
-   **Editing an existing malaphor or idiom**: there's no edit route/UI anywhere — compose only ever
    creates new entries, and detail pages only offer delete. No route or interaction design for
    editing exists in the source design doc, so nothing was built rather than guessing one.

## Open product question

**The Glossary's `+` FAB has nowhere to go.** It dispatches an `activate` event, but nothing
listens for it. The design doc's route table has no "add idiom" route or flow anywhere — Settings
(the last place such a flow could plausibly have been introduced) was built without one. This
needs an actual product decision from Benjamin, not another engineering guess.

## Flagged for design review

**`--terre-verte` (idiom green) on `--vellum` measures ~4.12:1 contrast** — under the WCAG AA
4.5:1 threshold for normal text (for comparison, `--iron-gall` is 10.84:1 and `--iron-faded` is
4.67:1, both of which the design doc explicitly asked to be checked and both pass). Terre-verte is
used extensively — gloss lines, idiom chips, Glossary rows — so this is worth a deliberate call
rather than a silent palette tweak: darken it, reserve it for larger text sizes, or accept it as a
considered exception.

## Needs real-device verification

Per the design doc's own admission that Playwright can't fully cover these:

-   **iOS on-screen-keyboard behavior in the compose typeahead** — the results panel uses the
    `visualViewport` API to stay pinned above the keyboard; this logic is wired and the panel
    visually holds up under a manually-shrunk viewport in Playwright, but a real iOS keyboard's
    effect on `visualViewport` couldn't be simulated in this environment.
-   **Add-to-home-screen appearance** — icons and manifest are in place and validated (correct
    JSON, icons load, service worker registers) but the actual home-screen icon/splash appearance on
    a real device hasn't been seen.
-   **Safe-area insets on a notched device** — `env(safe-area-inset-*)` is used in the bottom nav
    and FAB positioning, but only a real notched device can confirm it lands correctly.

**Offline launch** (the fourth item on the design doc's real-device list) _was_ verified in this
environment: a full production build, served and then taken offline via
`browserContext.setOffline(true)`, reloads and renders correctly end to end, EB Garamond included.
That's real evidence the service worker's precaching works, though it's still worth a true
airplane-mode check on an installed PWA at some point.

## Netlify Node version

`netlify.toml` pins `NODE_VERSION = "24"`, not the design doc's suggested `"22"`. virmator's own
`package.json` requires Node `^22.22.2 || ^24.15.0`, and a bare `"22"` pin risks Netlify resolving
to a default patch version that doesn't satisfy that. Flagging in case there's a reason to prefer
22 specifically (e.g. matching some other part of the deploy pipeline) that wasn't visible here.
