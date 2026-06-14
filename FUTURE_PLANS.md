# Future Plans

Non-blocking polish and cleanup deferred past the 1.6.0 / 1.7.0 baseline on `main`. None are required for the current stable baseline.

## Idea: consider a second weekly note (undecided)

The Second Daily Note feature (2.0.0) gives a second, independent daily note per day. A parallel "second weekly note" could extend the same pattern to weekly notes. **Undecided — not committed.** For now a second daily note is enough; revisit only if a concrete need for a second weekly note comes up. If pursued, it would mirror the second-daily design: a `secondWeekly: PeriodicNoteSettings` key, a dedicated store factory keyed on `"weekly"`, a self-gated dot source, and access via the week-number cell's right-click menu (and possibly Option/Alt + click), reusing the same open/create + trash patterns.

## Optional: richer context menu for existing Second Daily Notes (partially done, deferred)

The day context menu for an existing second daily note currently has **Open second daily note** and **Delete second daily note** (added in 2.0.0). The primary daily note gets the full Obsidian file menu (rename, open in new tab, reveal in navigation, plus any items other plugins inject via `file-menu`). The second daily note still lacks:

- **Reveal in file explorer / navigation** — no way to jump to the second daily note's location from the calendar.
- **Open in new tab / split** — the "Open Second Daily Note" item always uses the current pane (modifier-click is not wired into the context menu path).
- **Third-party plugin items** — plugins that add items to the `file-menu` event (e.g. templating plugins, sync plugins) only see the primary note, not the second.

Fix: when a second daily note exists, trigger `app.workspace.trigger("file-menu", menu, secondNote, "calendar-context-menu", null)` on the same menu after the second-daily items, then add a separator before the primary note's file-menu items (if the primary note also exists). This mirrors how the primary note's file ops are currently appended and gives the second note the same Obsidian-standard treatment.

The section/separator ordering would become: second-daily actions → second-daily file-menu items → [separator] → primary daily file-menu items.

## Optional: revisit Second Daily Note dot visual (deferred)

The second daily note dot is currently a half-opacity filled dot (`.dot.filled.second-daily { opacity: 0.5 }` in `styles.css`). It's visually distinct from the full-opacity primary dot without introducing a new color. This works well for `dotMode: "exists"`.

In `dotMode: "word-count-tasks"`, a day cell can show multiple filled word-count dots plus a hollow task dot, and the half-opacity second-daily dot may blend in or cause confusion. If this becomes a real issue, the accent-color approach (using `--text-accent` or `--interactive-accent`) would be orthogonal to fill/hollow and would differentiate clearly in both modes. The `className: "second-daily"` hook is already on the dot, so the change would be a one-line CSS swap.

## Optional: settings UI modernization (deferred)

Migrating the settings tab to Svelte would potentially give cleaner conditional UI (`{#if}` blocks instead of imperative `.empty()` + rebuild), easier slide / fade animations on enable-toggle expansion, and less imperative DOM rebuilding overall.

**Not planned.** The current per-section re-render in `src/settings.ts` works well, doesn't scroll-jump, and is straightforward to maintain. Only worth revisiting if the settings UI grows substantially harder to extend — until then this is a "nice to have" with no concrete trigger, kept here only as a parking lot for the idea.

## Optional: active-file correctness for monthly / quarterly / yearly (deferred)

`getDateUIDFromFile` (`src/ui/utils.ts`) currently only checks daily and weekly periodicities. Opening a monthly / quarterly / yearly note today produces a `null` active UID instead of e.g. `"month-2024-05-01T..."`.

**Not planned.** The active-file UID is only consumed by `Day.svelte` (compares against daily UIDs) and `WeekNum.svelte` (compares against weekly UIDs). `Nav.svelte` — which renders the month / year / quarter labels — does not receive `selectedId` as a prop and has no `class:active` binding driven by the active file. The existing `.active` class on quarter spans represents "this quarter contains the currently-displayed month" (a navigation-state concept), not "this is the active file's quarter." Extending the helper alone would compute UIDs that nothing currently compares against — dead code with no observable effect.

If a future change adds active-file styling to month / quarter / year labels, the work is two parts:
1. Extend `getDateUIDFromFile` to also check monthly, quarterly, yearly (~12 lines in `src/ui/utils.ts`).
2. Pass `selectedId` from vendored `Calendar.svelte` through to `Nav.svelte`, add `class:active-file` bindings on `.month` / `.year` / `.quarter` (or rename the existing quarter `.active` to disambiguate the two concepts), and decide a visual treatment that doesn't conflate "displayed quarter" with "active-file quarter."

Revisit only if visible active styling for header labels is wanted. Until then, the current behavior is internally consistent: cells (Day, WeekNum) highlight, header labels don't.

## Resolve remaining Obsidian plugin warnings (deferred)

After 1.8.3, the Obsidian community-plugin checker reports **zero blocking Errors** and a substantially narrower set of non-blocking Source Code warnings than the 1.7.12 baseline. 1.7.18 added configurable weekend days and a settings-page polish; 1.8.0 added configurable dot styles via two new source files (`src/ui/sources/wordCount.ts` and `src/ui/sources/tasks.ts`) using Obsidian's approved `vault.cachedRead` API; 1.8.1 added mobile header alignment polish, modifier-click consistency for month/quarter/year labels, periodic-note open/create helper consolidation in `src/io/periodicNotes.ts`, and a SECURITY.md addition for repository hygiene; 1.8.2 added Today-button open/create behavior (routes through the existing `openOrCreateDailyNote(today, false)` path) and an opt-in `showTodayButtonOnMobile` setting (default `false`) with a Calendar behavior reorder + "Ctrl/Cmd + Click Behavior" label rename; 1.8.3 added the synchronous `activeFile.setFile(existingFile)` calls to the daily/weekly existing-file open paths in `view.ts` (restoring symmetry with M/Q/Y and the original Calendar plugin) plus an initial `updateActiveFile()` sync in `onOpen()`. None of these releases touched the source files the checker flags, so the checker state is unchanged from 1.7.17. The most recent checker excursion was the 1.7.16 → 1.7.17 cycle: 1.7.16's visual polish pass added ~24 `!important` declarations in `styles.css` to force uniform weekend rendering under Minimal, which the checker flagged ("Avoid !important — override styles by increasing selector specificity or using CSS variables instead") and briefly dropped the score from ~99% to 74%; 1.7.17 removed all of them and simplified the weekend shading to a single straightforward rule on `th.weekend` / `td.weekend`, restoring the score. The product position going forward is documented in `CLAUDE.md` § Important product decisions: prefer modest scoped specificity, CSS variables, or settings toggles over `!important` or hyper-specific ancestor chains; the **Shade weekend columns** toggle is the user-side remedy under themes whose day-cell styling conflicts with weekend tinting. 1.7.13 cleared the Moment-resolution cascade across `periodicNoteHelpers.ts` / `main.ts` / `localization.ts` / `utils.ts`, the `ILocaleOverride` literal-union flatten, the `getMonth` `any[]` return, and the two `const { moment } = window;` destructures in `src/settings.ts`. 1.7.14 replaced the single `localStorage.getItem("language")` call with Obsidian's `getLanguage()` API (paired with a pinned d.ts bump to v1.8.7 and a `minAppVersion` bump to 1.8.7), clearing the Local Storage behavior recommendation. The remaining Source Code warnings cluster into two root causes — none block submission, none are user-visible, and each has a known follow-up path that is intentionally deferred.

### 1. Type-only `"moment"` import in `src/types/moment.ts`

The checker continues to report one non-blocking `no-restricted-imports` warning on `src/types/moment.ts:2`:
- `import type { Locale, Moment, unitOfTime } from "moment";`

Reasoning:
- This is the single type-only seam that lets the Obsidian checker resolve `Moment` and `Locale` precisely. Without it, the checker's TypeScript can't follow Obsidian's `import * as Moment from 'moment'` re-export — every Moment instance access cascades into `unsafe-*` warnings (as 1.7.10 demonstrated when we tried `ReturnType<typeof moment>` and the warning count jumped by ~56).
- 1.7.13 paired this type seam with a typed runtime seam: `src/types/moment.ts` also exports a `moment` value cast to a local `MomentFactory` interface. All six runtime moment consumers (plus the two former `const { moment } = window;` destructures in `src/settings.ts`) now import the runtime `moment` from `src/types/moment` instead of from `"obsidian"`. Runtime moment still comes from Obsidian's bundled `moment` export — the cast is type-only.
- The deeper alternative — hand-rolling local interfaces for `Moment` and `Locale` so the source tree has zero `"moment"` imports at all — remains an option but is no longer urgent. Cost: ~50 lines of hand-rolled interface definitions covering the 16 Moment instance methods Calendar Plus uses. Risk: missing an overload or a method a future caller needs (manageable — extend the interface as needed).
- **As of 2.0.1 this is the single remaining review warning** (the dependency cascade and Svelte-typing warnings below were both resolved). It is the lone `no-restricted-imports` flag; everything else in `npx eslint . --ext .ts` is at zero.
- Revisit only if the Obsidian checker escalates the type-only import warning to a blocking Error, or as part of a future "zero `moment` imports" cleanup.

### 2. Svelte component instance typing warnings — RESOLVED (2.0.1)

Previously the type-aware checker flagged `this.calendar` calls in `src/view.ts` (`tick` / `$set` / `$destroy`) as `no-unsafe-*` because type-aware tooling resolves `.svelte` default imports as `any`. Resolved in 2.0.1 by introducing a local `CalendarComponent` interface (the instance surface the view calls) plus a `CalendarConstructor` cast of the `.svelte` import, and typing `private calendar: CalendarComponent`. Keep this — don't revert to `private calendar: Calendar`.

### 3. The dependency-driven warning cascade — RESOLVED (2.0.1)

The 2.0.0 review showed *hundreds* of `no-unsafe-*` warnings because the `obsidian` dependency was a GitHub tarball that the review's registry-only `npm ci` couldn't fetch, leaving all types unresolved. Resolved in 2.0.1 by switching to the npm `obsidian@1.8.7` devDependency. See CLAUDE.md → "Dependency + type-aware lint" — do not reintroduce a GitHub-sourced dependency.

## Review npm audit findings for dev dependencies (deferred)

`npm audit` currently reports ~20 vulnerabilities in build/dev dependency chains — primarily transitive packages such as `ajv`, `ansi-regex`, `brace-expansion`, `braces`, `cross-spawn`, `flatted`, `glob-parent`, `js-yaml`, `lodash`, `micromatch`, `minimatch`, `moment`, `path-parse`, `picomatch`, `rollup`, `svelte`, `word-wrap`. None are direct Calendar Plus runtime risks; most live inside the build toolchain (`svelte-check`, `rollup`, `eslint`) or are transitive dependencies of those.

**Do not run `npm audit fix --force` casually.** That path would upgrade Svelte to a breaking major version (Svelte 5) and may bump Rollup, Moment, and other foundational packages outside the currently-pinned ranges, requiring a significant migration. The standing CLAUDE.md rule against `npm audit fix` exists for the same reason — the lockfile is intentionally pinned for stable plugin builds.

Suggested future approach when this work is taken on:
1. Create a dedicated `chore/dependency-maintenance` branch.
2. Run `npm audit fix` (no `--force`) to apply only non-breaking patches.
3. Inspect the `package-lock.json` diff carefully — confirm no unintended major-version jumps.
4. Run `npm run build` (or `npx rollup -c` directly if the known `svelte-check` `mappings.wasm` flake appears) and verify `created main.js`.
5. Run `npx tsc --noEmit` if useful, separating the documented `node_modules/obsidian/obsidian.d.ts` and `@codemirror/view` baseline noise from genuine project-source errors.
6. Load the resulting `main.js` in Obsidian and walk the standard QA flows (note creation, active-highlight, settings).
7. Avoid major upgrades unless explicitly planned (e.g. a future Svelte 4/5 migration would be its own milestone with its own release notes).
8. If non-breaking patches are clean and verified, consider a `chore: dependency maintenance` patch release. If only breaking upgrades remain, leave them for a planned tooling-modernization release rather than slipping them in.

Revisit when there's bandwidth for dependency-only work, or sooner if a specific advisory escalates to a real runtime risk in the bundled plugin.

## Optional: evaluate `calendar.tick()` in `updateActiveFile()` (deferred)

`updateActiveFile()` in `src/view.ts` calls `this.calendar.tick()` after setting the `activeFile` store. `tick()` in `src/ui/Calendar.svelte` reassigns `today = moment()`, which Svelte propagates as a new prop reference into every Day cell — effectively a full reactive recomputation (the `<svelte:options immutable />` on Day/WeekNum absorbs the cost into no-op DOM mutations when nothing visible changed). This pattern was inherited from the original Calendar plugin (`reference/obsidian-calendar-plugin-1.5.10/src/view.ts:222-234`) when Calendar Plus first forked.

For active-file updates specifically, `tick()` is probably redundant: the `activeFile` store's Svelte reactivity already drives the `selectedId={$activeFile}` chain into Day.svelte's `class:active` binding, and immutable absorbs same-value updates as no-ops. `tick()` exists primarily for the midnight day-rollover case, which has its own independent 1-minute heartbeat in `src/ui/Calendar.svelte:47-57`.

**Not planned.** Removing `tick()` from `updateActiveFile()` is a small change with non-obvious risk — `today` is also consumed by `getDailyMetadata(sources, day, today)` / `getWeeklyMetadata(sources, week.days[0], today)` in the vendored `Calendar.svelte`, so reassigning it does drive source-driven metadata recomputation. The 1.8.3 active-highlight fix should remain the stable behavior unless a dedicated cleanup pass walks every consumer of `today` and confirms the active-file path doesn't depend on `tick()` for some reactive side effect. A separate consideration: removing `tick()` would also let us drop the `if (leaf?.view === this) return;` guard that an earlier 1.8.3 development attempt needed in `onActiveLeafChange`, simplifying the listener model further — but that listener was reverted in 1.8.3, so this benefit only matters if a future change re-introduces a similar listener.

Revisit only as part of an intentional `view.ts` simplification pass, not opportunistically.

## Code-review audit follow-ups (2.0.0 work)

Catalogued from a full audit of the 2.0.0 features (Second Daily Note, Feature Images, year navigator). The first four items (settings heading casing → "Feature images" / "Periodic notes"; removing the dead `is-mobile` plumbing from `YearGrid.svelte`; array-valued frontmatter handling in `getFeatureImageUrl`; widening the day-click types to include the optional `isAltPressed` arg) were **applied during the audit** and are no longer pending. The two remaining items are below.

### Keyboard accessibility for the vendored calendar (deferred — slightly higher priority)

Every interactive element in `src/ui/calendar-ui/` (day cells, week-number cells, nav arrows, Today button, the history button, the year popup, month cells) is a `<div on:click>` — not keyboard-focusable or operable, with no ARIA roles. The year-navigator and history button follow the same established pattern (internally consistent), and the history button intentionally has no `aria-label` (removed to suppress the hover tooltip; the nav/year arrows lost their tooltips too). A real fix is a library-wide pass converting these to real `<button>`s or adding `role`/`tabindex`/`keydown` handlers, and re-deciding tooltips vs. accessible names. Substantial and behavior-touching across the vendored components, so still out of scope for 2.0.0 — but flagged as a **slightly higher-priority** deferred item to schedule as its own accessibility milestone rather than leaving indefinitely.

### Year-overview popup anchoring (low priority — review only)

The `.year-popup` in the vendored `Calendar.svelte` is anchored at a fixed `top: 42px; right: 8px`. Two consequences: (a) when quarterly notes are enabled the header (`Nav`) is taller, so the popup can overlap the weekday header row; (b) the history button sits at the **left** of the `.right-nav` cluster, but the popup opens at the container's right edge, so it isn't directly under the button. **The current behavior is accepted** — it overlays cleanly and is usable as-is. Keep as a low-priority "review only" note; revisit only if the overlap or off-button placement becomes bothersome in practice. Fix options if taken on: measure the header/button position, or anchor the popup relative to the button element.

## Accepted Obsidian checker behavior recommendations

After 1.7.14 the checker has no source-code Errors and reports a small residual set of warnings (see the section above). The two **Behavior** recommendations it reports separately are deliberate architectural choices documented below so future sessions don't try to "fix" them without understanding the trade-off.

### Vault enumeration — required for note-existence dots and settings autocomplete

The checker flags Calendar Plus as a plugin that enumerates the vault. The flagged call sites are:
- `Vault.recurseChildren(folderObj, ...)` in `getAllPeriodicNotes` (`src/io/periodicNoteHelpers.ts:363`) — `folderObj` is `vault.getRoot()` when the user has left the per-period folder field empty.
- `this.app.vault.getAllLoadedFiles()` in `FolderSuggest` and `FileSuggest` (`src/ui/file-suggest.ts:13` and `:45`).

Why this is intentional:
- **Note-existence dots are the plugin's main feature.** `getAllPeriodicNotes` walks the configured periodic-note folder (or the vault root if the user left the folder field empty) to find files whose basenames match the user's Moment date-format string. Without this enumeration, dots disappear and the calendar loses its primary signal.
- **Already scoped when possible**: if the user configures a folder (e.g. `Notes/Daily`), `recurseChildren` is called on that folder only — not the vault root. Heavy users with organized vaults already get scoped behavior; the only full-vault case is when the user leaves the folder field blank.
- **Already bounded in frequency**: enumeration runs once per periodicity at view-mount, and once per affected periodicity when settings change. It does **not** run per frame or per file event. Per-event updates use incremental `addFile` / `removeFile` / `removeByOldPath` store mutations.
- **Folder and template autocomplete in settings** uses `vault.getAllLoadedFiles()` per keystroke — required to make the autocomplete dropdown responsive. Caching per-modal-session would save a few calls but doesn't change the checker classification.

Alternatives considered and rejected:
- Requiring users to set a folder (never scan root) — UX regression for existing users.
- Removing folder/template autocomplete — major UX regression in settings.
- Using `MetadataCache` instead of the vault scan — `metadataCache.getFileCache(file)` still requires a `TFile`, so it doesn't avoid enumeration.

**Accepted as an architectural trade-off.** Revisit only if Obsidian introduces a scoped-discovery API that meets the same requirements, if large-vault performance becomes a real issue in practice, or if the checker escalates this from a recommendation to a blocking error.
