# Codex Malaphorum — Design & Build Document

**Handoff target:** a Claude Code session on Ubuntu with Playwright available.
**Author of this doc:** planning session (mobile). Nothing has been built yet.
**Owner:** Benjamin (`electrovir` packages are a deliberate, load-bearing choice — see §3).

---

## 0. What this is

A personal PWA for tracking **hand-crafted malaphors** (deliberate idiom blends — "we'll burn that bridge when we come to it") and the **idiom library** they're built from.

Currently lives in Google Keep, which fails at exactly one thing: answering _"have I already made this one?"_ That question is the product.

**Non-goals for MVP.** No accounts, no sync, no backend, no auto-generation of malaphors, no fuzzy dedup engine, no idiom seed corpus. Entry is manual on purpose — recalling and recognizing idioms is the hobby, not a chore to automate away.

### The two questions the app must answer fast

1. _"Do I already have this malaphor?"_ — searchable by the malaphor's own phrasing **and** by its component idioms.
2. _"Have I already used these two idioms together?"_ — checked automatically at submit time, because the same pair often produces near-identical blends with different wording, which plain text search will miss.

---

## 1. Naming

Proposed app name: **Codex Malaphorum**. Repo: `codex-malaphorum`.

Alternatives if that's too much: `the-scriptorium`, `malaphorium`, `glossa`. Pick before scaffolding — it lands in the manifest, the Netlify site name, and the wordmark.

---

## 2. Data model

Three shapes. Define each once with `object-shape-tester`; the TypeScript type, the runtime validator, and the default value all come from that single definition. This matters most at the JSON import boundary, where the input is untrusted.

```ts
// src/data/shapes.ts
import {defineShape, or, exact} from 'object-shape-tester';

export const idiomShape = defineShape({
    id: '', // uuid v4
    text: '', // canonical form, as you'd say it
    aliases: [''], // variant phrasings, manually added
    notes: '', // meaning, origin, whatever
    createdAt: '', // ISO 8601 w/ offset, via date-vir
    updatedAt: '',
});

export const malaphorShape = defineShape({
    id: '',
    text: '',
    componentIdiomIds: [''], // usually 2, sometimes more, MAY BE EMPTY (see §7)
    notes: '',
    createdAt: '',
    updatedAt: '',
});

export const databaseShape = defineShape({
    version: 1, // bump on breaking schema change
    idioms: [idiomShape],
    malaphors: [malaphorShape],
});
```

### Notes on specific fields

-   **`componentIdiomIds` can be empty.** The Google Keep backlog arrives untagged. The model has to tolerate that, and the UI needs a way to work through the untagged pile (§7). Do not make this field required.
-   **`aliases`** exists so "don't count your chickens" and "don't count your chickens before they hatch" are one idiom, not two. Manual, optional, cheap. If it complicates the typeahead too much, cutting it is acceptable — say so rather than half-building it.
-   **No stored `normalized` field.** Normalization is derived at load time into an in-memory index (§5). Storing it invites drift between the stored value and the current normalizer.
-   **`id`** is `crypto.randomUUID()`. Available in every browser this targets.
-   Timestamps are full ISO strings with offset, produced via `date-vir`, so export files and any future sync aren't ambiguous.

### Referential integrity

Deleting an idiom that malaphors reference is the one destructive edge case. MVP behavior: **block the delete**, and show which malaphors use it with links. Cascading or orphaning both lose information silently. A blocked delete with a list is one extra tap and zero surprises.

---

## 3. Package stack

These are `electrovir`'s packages, and using them here is intentional — fluency with them transfers directly to work. They're grouped by how well they actually fit, because the implementing session should know which dependencies are structural and which are elective. If one of the elective ones fights the design, say so instead of contorting the app around it.

### Structural — the app is built on these

| Package                            | Role                                                                                                                                                                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `element-vir`                      | All UI. Type-safe declarative web components over lit. Reactive state, typed inputs/outputs, typed custom events. Fits a small PWA well: no framework runtime beyond lit, native custom elements, no build-step magic.     |
| `@electrovir/local-storage-client` | The persistence layer. Typed localStorage keyed by `object-shape-tester` shapes; invalid stored values return `undefined` rather than throwing or handing back garbage. This is close to a purpose-built fit for this app. |
| `object-shape-tester`              | Shape definitions for all three types above. Single source of truth for type + default + runtime validation. Carries the JSON import validation.                                                                           |
| `@augment-vir/common`              | General helpers throughout — array/object/string utilities, `wrapInTry`, typed `getObjectTypedKeys`, etc.                                                                                                                  |
| `virmator`                         | All tooling: `virmator init`, `format`, `lint`, `compile`, `test`, and `virmator frontend build` for the production build (Vite under the hood). Avoids hand-rolling configs. Targets Node 22 — pin that in Netlify.       |

### Good fit — use them

| Package                            | Role                                                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spa-router-vir`                   | Routing (§6). Type-safe routes with runtime sanitization. Real value here: mobile back-button behavior across list → detail → compose has to be correct, and hand-rolled `history` handling is where that breaks. |
| `date-vir`                         | Timestamp creation, timezone-safe formatting for "added 3 days ago" / absolute dates, and dated export filenames.                                                                                                 |
| `@augment-vir/test`                | Tests. `itCases` is a good match for the normalizer and the combination-check logic, which are the two pieces worth testing (§5, §8). `testWeb` for component tests if you go that far.                           |
| `prettier-plugin-multiline-arrays` | Formatting. Comes along with `virmator format` config anyway.                                                                                                                                                     |

### Elective — include only if it earns its place

| Package              | Assessment                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typed-event-target` | `element-vir` already gives typed component events. Only reach for this if a non-component event bus appears, which it probably shouldn't in an app this size. Skip by default. |
| `pull-request-vir`   | Solo repo, no reviewers. Skip unless you want the CI checks for their own sake.                                                                                                 |

### Non-vir dependencies

-   `lit` — transitive via `element-vir`, don't install directly.
-   `vite-plugin-pwa` — manifest + service worker generation. Compatible with the Vite build `virmator frontend` runs. Check that `virmator frontend build` allows extending the Vite config before committing to this; if it doesn't, hand-write the manifest and a minimal service worker instead and note the decision in the README.
-   **Nothing else.** No search library, no fuzzy-match library, no date library, no UI kit. If you find yourself wanting one, that's a signal the feature is over-scoped for MVP.

---

## 4. Visual design

The brief: **a scriptorium desk** — parchment, iron-gall ink, worn wood. Not a museum-piece illuminated manuscript, not bare Cistercian stone. A working surface where someone writes things down by hand, all day, in a consistent script.

That framing does real work, because this app _is_ a scriptorium: manual entry, careful cross-referencing, a growing codex. Lean on it literally rather than decoratively.

### 4.1 Palette

Six values. Named for their materials, because that's what keeps later additions coherent.

```css
--vellum: #e3d9c2; /* page. Warmer and greyer than the usual cream. */
--vellum-deep: #d6c9ac; /* recessed areas, input wells, pressed states */
--oak: #4a3b2a; /* desk. Nav bar, sheet backgrounds, footer */
--iron-gall: #2e2417; /* body text. Brown-black, as aged iron-gall ink is */
--iron-faded: #6b5b45; /* secondary text, glosses, metadata */
--minium: #a8321e; /* rubrication ONLY — see below */
--terre-verte: #5a6b4a; /* idiom chips / the idiom half of the app */
```

Two deliberate avoidances, stated so they don't creep back in:

-   **Not `#F4F1EA` cream.** Parchment is animal skin: greyer, warmer, unevenly toned. `#E3D9C2` reads as material rather than as "paper-colored background."
-   **Not a terracotta accent (`#D97757` and neighbors).** That's the current default AI-design accent and would undercut the whole thing. `--minium` is red lead — darker, browner, historically what rubricators actually used.

**The rubrication rule.** In a manuscript, red isn't decoration — it marks structure: section openings, initials, the scribe's own annotations. So in this app, `--minium` is reserved for exactly three things: (1) the app wordmark, (2) the drop-cap initial on a malaphor detail view, (3) collision warnings from the duplicate check. Nothing else. If red starts appearing on buttons and borders, it stops meaning anything.

Chips for idioms use `--terre-verte`; malaphor text uses `--iron-gall`. That's the app's core distinction — source material vs. crafted output — carried in the ink color, consistently, everywhere.

### 4.2 Typography

**One family: EB Garamond** (Google Fonts). Self-host the woff2 rather than linking Google's CDN — offline PWA.

One face, not two, is the on-concept choice: a scriptorium produces a manuscript in a single hand, and hierarchy comes from scale, small caps, rubrication, and the drop cap. Mixing in a sans for "UI text" would break the illusion at exactly the moments the user is looking hardest.

Enable the OpenType features EB Garamond actually ships — they're the point of choosing it:

```css
font-feature-settings:
    'onum' 1,
    'kern' 1,
    'liga' 1; /* oldstyle figures */
/* real small caps where used: 'smcp' 1 — not text-transform: uppercase */
```

Scale (1.25 ratio, base 17px for phone reading):

| Role                     | Size / weight              | Notes                               |
| ------------------------ | -------------------------- | ----------------------------------- |
| Malaphor text (detail)   | 33px / 400                 | The hero. Generous leading, 1.4.    |
| Malaphor text (list row) | 21px / 400                 |                                     |
| Section heading          | 21px / 500, small caps     | Real `smcp`, never `text-transform` |
| Body / input             | 17px / 400                 |                                     |
| Gloss / metadata         | 15px / 400, `--iron-faded` |                                     |

Serif body text at 17px wants line-height ~1.55 and a measure under 70 characters. On a 393px viewport with 20px gutters that lands naturally.

**Do not:** use all-caps tracked-out labels, accent a single word in a heading in a different color, or add eyebrow labels above headings. Those are the generic tells and they'd fight the material concept anyway.

### 4.3 The one bold move: marginal glosses

Spend the design budget here and keep everything else quiet.

Medieval manuscripts carry **glosses** — smaller annotations in the margin, in the same hand, keyed to the main text. That is structurally identical to what a malaphor's component idioms are: annotations explaining the primary text.

So: a malaphor's component idioms render as a gloss, in `--terre-verte`, at gloss size, set off with a **hairline rule and a hanging indent** — not as pills in a row under a card, which is the SaaS-kit default.

On a phone there's no true margin, so the gloss sits directly beneath the malaphor, indented, at 15px, with the rule running down its left edge:

```
┌──────────────────────────────────────┐
│                                      │
│  We'll burn that bridge when         │  ← 21px, --iron-gall
│  we come to it                       │
│                                      │
│   │ burn a bridge                    │  ← 15px, --terre-verte
│   │ cross that bridge when we        │     hairline rule at left
│   │   come to it                     │
│                                      │
└──────────────────────────────────────┘
```

This one treatment does a lot of work: it appears in list rows, in detail views, and in the compose preview, so the malaphor↔idiom relationship is visible everywhere without ever being explained.

### 4.4 Surface and texture

-   Page background `--vellum`, with a **very** subtle generated grain — SVG `feTurbulence` (`baseFrequency` around 0.8, `numOctaves` 3) at roughly 4% opacity, fixed to the viewport, no image assets. It should be almost subliminal. If it reads as "texture" on a phone screen at arm's length, it's too strong.
-   **No card shadows.** Nothing floats on a desk. Separation comes from hairline rules in `--iron-faded` at 20% and from whitespace.
-   **Border radius: 2px or 0.** Cut vellum has corners.
-   The nav bar / bottom bar is `--oak` — the desk the page rests on.

### 4.5 Motion

One orchestrated moment, not scattered effects: **the ink settle.** When a malaphor is saved, its text fades in over ~450ms with a slight darkening (as ink absorbs into the page), once, on the detail view it lands on.

Everything else: instant, or a functional 150ms for sheets opening and chips being added. No entrance animations on list items. No hover transitions (this is a touch device). Respect `prefers-reduced-motion` — the ink settle becomes an instant render.

### 4.6 Copy voice

The theme lives in **headings, empty states, and section names**. Functional copy stays plain.

-   Section names may be thematic: "The Codex" (malaphors), "The Glossary" (idioms).
-   Buttons say what happens: **Save malaphor**, **Add idiom**, **Export codex**. Not "Inscribe" or "Commit to vellum." You'll tap these a hundred times; cleverness curdles.
-   Errors are specific and don't apologize: _"That file isn't a Codex Malaphorum export."_
-   Empty states invite action: _"No malaphors yet. Start with two idioms you can't keep straight."_

---

## 5. Search and normalization

One normalizer, used for everything, unit-tested with `itCases`:

```ts
export function normalize(input: string): string {
    return input
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip diacritics
        .replace(/[''`]/g, "'") // unify apostrophes
        .replace(/[^a-z0-9' ]/g, ' ') // punctuation → space
        .replace(/\s+/g, ' ')
        .trim();
}
```

Deliberately **not** doing: stemming, stopword removal, article stripping. Idioms live or die on their exact small words ("_a_ bridge" vs "_that_ bridge"), and stripping them would break the very distinctions the search needs to preserve.

**In-memory index**, rebuilt on load and on every mutation. The dataset is a few hundred entries; there is no performance problem to solve here, so don't build for one.

```ts
type SearchIndex = {
    byId: Record<string, Idiom | Malaphor>;
    normalized: Record<string, string>; // id → normalized text
    tokens: Record<string, Set<string>>; // token → ids containing it
};
```

**Ranking**, in order — deterministic, no scoring heuristics:

1. Exact normalized match
2. Normalized text starts with the query
3. Normalized text contains the query as a substring
4. All query tokens present, any order
5. Any query token present

**Idiom search additionally matches `aliases`.** A match on an alias displays the canonical form with the matched alias shown beneath it in gloss style, so it's never unclear why a result appeared.

**Malaphor search searches both its own text and its component idioms' text.** This is the "search by component parts" requirement. A result matched via a component rather than its own text should say so — the gloss line highlights the matched idiom. Otherwise results look arbitrary.

No fuzzy matching in MVP. It introduces tuning work and false positives, and the combination check (§8) already catches the class of near-duplicate that plain search misses.

---

## 6. Routes and screens

`spa-router-vir` with a `PathTree`. Netlify needs the SPA redirect (§10).

| Route            | Screen                                                               |
| ---------------- | -------------------------------------------------------------------- |
| `/`              | The Codex — malaphor list + search                                   |
| `/new`           | Compose a malaphor                                                   |
| `/malaphor/<id>` | Malaphor detail / edit                                               |
| `/idioms`        | The Glossary — idiom list + search                                   |
| `/idiom/<id>`    | Idiom detail: text, aliases, notes, and every malaphor built from it |
| `/settings`      | Export, import, Keep import, stats                                   |

Compose is a **route, not a modal**, so the Android/iOS back gesture closes it correctly and a half-written entry survives an accidental swipe.

Bottom nav (`--oak`): Codex · Glossary · Settings. A `+` FAB on Codex and Glossary opens the relevant compose flow.

### `/` — The Codex

-   Sticky search field at top.
-   Results as rows using the gloss treatment (§4.3).
-   Sort: newest first by default. Toggle for alphabetical.
-   Filter chip: **Untagged** — malaphors with no component idioms (§7). Shows a count when non-zero. This is the working queue for the Keep backlog.
-   Empty state as specified in §4.6.

### `/idioms` — The Glossary

-   Same search field pattern.
-   Each row: idiom text, plus a gloss line showing how many malaphors use it (`used in 3`) or `unused` in `--iron-faded`.
-   Sort toggle: alphabetical (default — this is a reference list) / newest / most used.
-   This is also the brainstorming surface. Browsing a long alphabetical list of idioms is the intended way to spot a blendable pair.

**Optional, and only if it doesn't feel wrong:** a "show me two at random" button on the Glossary. It's one cheap function and could be a useful prompt. It also cuts against the stated pleasure of _remembering_ idioms and recognizing collisions yourself. Build it behind a settings toggle, default off, or skip it. Don't put it in the primary UI.

### `/malaphor/<id>`

-   Malaphor text at 33px with a `--minium` drop-cap initial (two lines deep, `float: left`).
-   Gloss listing components, each tappable through to `/idiom/<id>`.
-   Notes.
-   Created / updated dates in gloss style.
-   Edit and delete, kept quiet — text buttons at the bottom, not chrome at the top.

---

## 7. Compose flow

The core screen. Phone-first; assume one-handed use with the keyboard up.

### Layout

```
┌──────────────────────────────────────┐
│  ← New malaphor                      │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ We'll burn that bridge when    │  │  multiline, autogrow
│  │ we come to it_                 │  │  17px, --iron-gall
│  └────────────────────────────────┘  │
│                                      │
│  Built from                          │  small caps heading
│                                      │
│  ⌐ burn a bridge          ×¬         │  chips, --terre-verte
│  ⌐ cross that bridge...   ×¬         │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ type an idiom…                 │  │  ← the typeahead
│  └────────────────────────────────┘  │
│                                      │
│  Notes (optional)                    │
│  ┌────────────────────────────────┐  │
│  └────────────────────────────────┘  │
│                                      │
│         [  Save malaphor  ]          │
└──────────────────────────────────────┘
```

### 7.1 The idiom typeahead

This is the piece to get right. Behavior, precisely:

1. Single-line text input beneath the existing chips. Placeholder: `type an idiom…`
2. On focus, a results panel opens **anchored directly above the keyboard**, below the input. It must not be pushed off-screen — see the viewport note below.
3. Each keystroke re-filters the idiom library using the §5 ranking. Show up to 8 results. Empty query shows the 8 most recently used idioms.
4. Tapping a result adds it as a chip, clears the input, and **keeps focus** so the next component can be typed immediately without a second tap.
5. The **last row** of the results panel is always the add affordance, whenever the input is non-empty and doesn't exactly match an existing idiom:

    ```
    ┌────────────────────────────────┐
    │  cross that bridge when we…    │
    │  cross a bridge                │
    ├────────────────────────────────┤
    │  + Add "burn a bridge"         │   ← --minium text, hairline above
    └────────────────────────────────┘
    ```

    Tapping it creates the idiom, saves it to the library, adds it as a chip, clears the input, keeps focus. One tap, no dialog, no navigation away.

6. If the typed text **exactly** normalizes to an existing idiom, the add row is replaced by that idiom promoted to the top of the results with a gloss reading `already in your glossary`. Never let the same idiom be created twice by typing it out fully.
7. Already-attached idioms are filtered out of results.
8. Chips have a tap target of at least 44×44px including the ×. Removing a chip does not reopen the keyboard.

**Viewport handling.** Use `env(safe-area-inset-*)` and the `visualViewport` API to keep the results panel above the keyboard on iOS. `100vh` is wrong on mobile Safari; use `100dvh`. Playwright can't fully verify keyboard behavior — flag this explicitly in the README as needing a real-device check.

### 7.2 Save

Zero or more chips are permitted (imported entries have none). Saving with fewer than two chips shows an inline gloss — _"No components tagged. You can add them later."_ — but does not block. It gets filed under **Untagged**.

Then run the checks in §8.

---

## 8. Duplicate and collision checks

Runs on **Save**, not while typing. Never hard-blocks. Every outcome offers **Save anyway**, because deliberate variants are legitimate output.

Three checks, in order. Show at most one warning — the first that fires.

**1. Exact text duplicate.** Normalized malaphor text exactly matches an existing entry.

> **You already have this one.** > _"We'll burn that bridge when we come to it"_ — added 12 March 2026
> [ View it ] [ Save anyway ]

**2. Same component set.** The sorted set of `componentIdiomIds` exactly matches an existing malaphor's set. This is the failsafe you asked for, and it catches what text search can't — same two idioms, different phrasing, which is exactly how you'd unknowingly re-make a malaphor months apart.

> **You've blended these two before.** > _"We'll cross that bridge when we burn it"_ — added 4 January 2026
> [ View it ] [ Save anyway ]

Warning rendered in `--minium` — one of its three permitted uses (§4.1).

**3. Shared components (informational, not a warning).** If any component idiom appears in other malaphors, list them quietly in gloss style beneath the save button before saving. No modal, no color, no interruption. Just context, in case one of them is close enough to matter.

**Explicitly out of scope for MVP:** subset/superset matching, fuzzy text similarity, edit-distance thresholds. Those are the "deduping craziness" you ruled out. Note them in the README as deferred so a future session doesn't re-derive them from scratch.

---

## 9. Storage, export, import

### Persistence

One `LocalStorageClient` instance, one key holding the whole database, validated against `databaseShape`.

```ts
export const storage = new LocalStorageClient({
    codex: databaseShape,
});
```

Read once on boot into the in-memory store; write the full object on every mutation. At this data volume that's a sub-millisecond operation and it removes an entire class of partial-write bugs.

If `storage.get.codex()` returns `undefined` (missing, corrupt, or schema-invalid), boot with the default empty database — **and surface it**. A banner: _"Stored data couldn't be read. Starting empty — import a backup from Settings if you have one."_ Silently starting empty on a corrupt read is the worst possible behavior here; it looks like the data is gone when the export file might still be sitting in Downloads.

**Durability caveat, stated plainly:** localStorage is not durable storage. Browsers evict it under storage pressure, and iOS Safari's storage policies have changed across versions in ways that have caught PWAs out. Treat it as a cache. Mitigation for MVP is minimal and non-nagging: Settings shows `Last exported: 12 days ago` in gloss style. No prompts, no auto-downloads. If the collection grows past the point where losing it would sting, IndexedDB via `navigator.storage.persist()` is the upgrade path — note it in the README, don't build it now.

### JSON export

`Export codex` downloads the full database object as JSON. Filename via `date-vir`: `codex-malaphorum-2026-09-07.json`. Include `version` so a future importer can migrate.

### JSON import

1. File picker.
2. Parse, then validate with `assertValidShape(parsed, databaseShape)`. This is the whole reason `object-shape-tester` is in the structural tier — a malformed import is the one place untrusted data enters the app.
3. Present a summary before committing: _"142 malaphors, 87 idioms. 3 already in your codex."_
4. Two options: **Merge** (add entries whose ids aren't present; skip collisions, don't attempt to reconcile them) or **Replace everything** (requires a typed confirmation).

### Google Keep bulk import

Separate flow in Settings — different input shape, different expectations.

1. Large textarea. Paste the Keep export.
2. Split on newlines; discard empty lines and lines shorter than 3 characters.
3. Show a preview list with per-line checkboxes, all checked. Lines whose normalized text already exists in the codex are unchecked by default and marked `already have this` in gloss style.
4. Confirm → each checked line becomes a malaphor with empty `componentIdiomIds` and a timestamp of now.
5. Land the user on `/?filter=untagged` with a count. The backlog is now a visible, workable queue rather than an invisible pile.

No parsing of component idioms from the pasted text. Tagging is the manual pass, and doing it by hand is how the idiom library gets built in the first place.

---

## 10. Repo, build, deploy

### Scaffold

```bash
mkdir codex-malaphorum && cd codex-malaphorum
git init
npm init -y
npx virmator init web-client   # verify the correct env/type args for the installed virmator version
npm i element-vir @electrovir/local-storage-client object-shape-tester \
      @augment-vir/common spa-router-vir date-vir
npm i -D virmator @augment-vir/test vite-plugin-pwa
gh repo create codex-malaphorum --private --source=. --remote=origin
```

Confirm `virmator init` argument names against the installed version before running — the CLI was rewritten in v13 and the signature changed.

### package.json scripts

```json
{
    "scripts": {
        "build": "virmator frontend build",
        "format": "virmator format",
        "lint": "virmator lint fix",
        "start": "virmator frontend",
        "test": "virmator test node"
    }
}
```

### Netlify

`netlify.toml` at the repo root:

```toml
[build]
command = "npm run build"
publish = "dist"

[build.environment]
NODE_VERSION = "22"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

The redirect is required — without it `spa-router-vir` routes 404 on direct load and refresh. Pin Node 22; virmator targets it and Netlify's default drifts.

Connect the repo through the Netlify UI, deploy from `main`.

### PWA

-   `manifest.webmanifest`: `display: "standalone"`, `theme_color: "#4A3B2A"` (oak), `background_color: "#E3D9C2"` (vellum), icons at 192/512 plus a maskable 512.
-   `apple-touch-icon` link tag, and `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
-   Service worker: precache the app shell and the self-hosted EB Garamond woff2. There's no network content, so the caching strategy is trivially "cache everything, update on new deploy."
-   Icon: the wordmark initial in `--minium` on `--vellum`. Design it in SVG and export the raster sizes.

---

## 11. Build order

1. Shapes, storage client, normalizer, search index. Tests for the normalizer and the §8 collision logic with `itCases`. **No UI yet** — this is the part that's cheap to get right now and expensive to fix later.
2. Design tokens as CSS custom properties in one file. Self-hosted font. Grain overlay.
3. Router + shell + bottom nav. All routes rendering placeholder content.
4. Codex list + search + the gloss row treatment.
5. Compose screen with the typeahead (§7.1) — the highest-risk UI, build it while there's still room to iterate.
6. Collision checks on save (§8).
7. Glossary list, idiom detail.
8. Settings: export, JSON import, Keep import.
9. PWA manifest + service worker.
10. Playwright visual pass (§12).

---

## 12. Playwright visual verification

Screenshot at **393×852, `deviceScaleFactor: 3`** (iPhone 14 Pro class). Seed the store with ~20 realistic malaphors and ~30 idioms first — empty screens hide every real layout problem, particularly text wrapping on long idioms.

Capture: `/` populated, `/` empty, `/` filtered to untagged, `/new` with two chips and the typeahead panel open, `/new` showing a same-components warning, `/malaphor/<id>`, `/idioms`, `/idiom/<id>`, `/settings`.

Grade each against these, and iterate until they pass:

-   [ ] Background reads as material, not as a beige rectangle. Grain is present but not noticeable as texture.
-   [ ] `--minium` red appears **only** in the wordmark, drop caps, and collision warnings. Count its occurrences per screen — more than one is a failure.
-   [ ] Idiom green and malaphor ink are used consistently; no green on a malaphor, no ink-black chip.
-   [ ] Gloss treatment (hairline + hanging indent) is recognizably the same device in list rows, detail, and compose.
-   [ ] Oldstyle figures are actually rendering in dates — check the numerals descend below the baseline. If they're lining, `font-feature-settings` isn't applied.
-   [ ] Small caps are real (`smcp`), not `text-transform: uppercase`. Compare stroke weight against lowercase; faked small caps look too heavy.
-   [ ] No card shadows anywhere. No border-radius above 2px.
-   [ ] A 90-character malaphor and a 60-character idiom both wrap without clipping or overflow.
-   [ ] Body text measure stays under ~70 characters.
-   [ ] Contrast: `--iron-gall` on `--vellum` and `--iron-faded` on `--vellum` both clear 4.5:1.
-   [ ] Visible keyboard focus on every interactive element.
-   [ ] Typeahead results panel is fully visible with a simulated keyboard height of 300px.

**Flag as needing real-device verification** (Playwright can't cover it): iOS keyboard behavior in the typeahead, add-to-home-screen appearance, safe-area insets on a notched device, and offline launch after install.

---

## 13. Open decisions

Resolve these with Benjamin rather than guessing:

1. **App and repo name** — proposed `Codex Malaphorum` / `codex-malaphorum`.
2. **Random-pair brainstorm button** (§6) — build behind an off-by-default toggle, or skip.
3. **`aliases` on idioms** — keep if it stays simple in the typeahead, cut cleanly if not.
4. **Whether `virmator frontend build` accepts an extended Vite config** — determines whether `vite-plugin-pwa` is usable or the manifest and service worker get hand-written. Find out early; it affects step 9.
