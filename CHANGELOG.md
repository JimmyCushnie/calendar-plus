# Changelog

## 2.1.6

Fixes the "Hide feature image" toggle from 2.1.5. `minAppVersion` unchanged at 1.8.7.

- **Hide feature image now works, and no longer touches your notes.** In 2.1.5 the toggle wrote a `calendar-hide-image` property to the note's frontmatter — which added a Properties box to the top of notes that didn't otherwise have one, and didn't reliably hide the image. The hidden days are now remembered in the plugin's own data instead, so hiding/showing takes effect immediately and your notes are never modified.
- If you used the toggle in 2.1.5, the leftover `calendar-hide-image:` line in those notes' frontmatter no longer does anything and can be deleted.

## 2.1.5

Adds a per-day way to hide a feature image. `minAppVersion` unchanged at 1.8.7.

- **Hide feature image (per note).** Right-click a day whose note shows a feature image and choose **Hide feature image** — useful when a note has an incidental/functional picture you don't want on the calendar. The cell goes back to plain; right-click again for **Show feature image** to bring it back. It works by setting a `calendar-hide-image` flag in that note's frontmatter (written for you — no manual editing), so only that day is affected.

## 2.1.4

Performance fix for settings editing on large vaults. No change to features or settings; `minAppVersion` unchanged at 1.8.7.

- Editing a periodic note's **folder** or **date format** no longer rescans that folder on every keystroke — the rescan is debounced and runs once you pause typing. On large vaults this removes the typing lag in those fields (including the date-format field, which has no autocomplete). Dots refresh a moment after you stop editing; everything else (dot style, week start, etc.) still updates instantly.

## 2.1.3

Autocomplete modernization and performance polish. No change to features or settings; `minAppVersion` unchanged at 1.8.7.

- **Settings path autocomplete** (folder/template fields) now uses Obsidian's native suggestion popup, so it looks and behaves like Obsidian's other path inputs (and is built on a maintained API instead of ~150 lines of custom positioning/keyboard code).
- **Snappier on large vaults:** feature-image lookups are cached per note (re-resolved only when the note changes), the once-a-minute "today" refresh now does work only when the day actually changes, and a redundant double-refresh on every settings change was removed.

## 2.1.2

Completes the 2.1.0 modernization, plus two fixes for long-standing (pre-existing) issues. `minAppVersion` unchanged at 1.8.7.

**Svelte 5 runes migration** (no behavior change — verified with an Obsidian load-test). The 2.1.0 release moved the toolchain to Svelte 5 but kept the calendar components on Svelte's legacy (non-runes) syntax via a compatibility bridge; this finishes the job:

- Rewrote all calendar components to **Svelte 5 runes** (`$props` / `$state` / `$derived` / `$effect`); slot-based content now uses snippets.
- The view now mounts the calendar with Svelte 5's native `mount()` / `unmount()`, retiring the legacy `createClassComponent` bridge (and the deprecation warning that came with it).

**Fixes:**

- **Hover feedback now shows on day/week cells that have a feature image.** Previously the hover highlight sat behind the image and was invisible; cells with images now brighten on hover like other cells. (This also removes a hover-time repaint of the image, smoothing out hover on image-heavy vaults.)
- **Faster settings editing on large vaults.** Typing in a folder/format field no longer rescans every periodic-note folder on each keystroke — only the note set whose folder/format/enabled actually changed is reindexed.

## 2.1.1

Maintenance release — clears the Obsidian plugin-review warnings introduced by the 2.1.0 toolchain migration. No functional or behavior change.

- Listed `@eslint/js` explicitly in devDependencies.
- Converted the ESLint flat config to ESM (`eslint.config.js` → `eslint.config.mjs`) and switched to `defineConfig()` / `globalIgnores()`, clearing the `require()` and deprecated-`config()` warnings.
- Documented the deliberate use of Svelte 5's legacy `createClassComponent` bridge in `view.ts` (the native `mount()`/`unmount()` migration is planned with an upcoming runes pass).

## 2.1.0

Toolchain modernization — **no user-facing behavior change** (verified with an Obsidian load-test across all features).

Calendar Plus was built on 2021-era foundations; this release brings the build and lint chains up to date for maintainability and to clear the recurring Svelte dependency advisories at the source.

- **Svelte 3 → 5**, TypeScript → 5, Rollup → 4, and matching plugin updates. Components stay on the established Svelte syntax (no runes rewrite); the view now mounts the calendar via `createClassComponent`.
- **ESLint 7 → 9** with the unified `typescript-eslint` package and a flat `eslint.config.js`, preserving the type-aware `no-unsafe-*` linting that mirrors the Obsidian plugin review.
- Build Node version raised to 22 in CI.
- Internal type-safety pass surfaced by the stricter toolchain: dropped the no-longer-needed `keymap` shim (Obsidian now types it publicly), corrected calendar event-handler types, and removed type assertions that TypeScript 5 makes redundant.
- `minAppVersion` unchanged at 1.8.7 — existing users on older Obsidian builds are unaffected.

## 2.0.2

Maintenance release — no functional or behavior changes.

- Removed the last automated-review warnings: replaced the type-only `moment` package import with hand-rolled local type definitions (the plugin still uses Obsidian's bundled moment at runtime — no change in behavior), and updated the bundled Svelte version to clear a dependency advisory.

## 2.0.1

Maintenance release — no functional or behavior changes.

- Switched the `obsidian` dependency from a GitHub source to the standard npm package so the plugin's type-checking resolves cleanly in automated review environments (this clears a large set of "unsafe type" review warnings that were caused by the dependency, not by plugin behavior).
- Tightened type safety in the feature-image, year-overview, and calendar-view code, and enabled type-aware linting in the build so these checks are enforced going forward.

## 2.0.0

Welcome to version 2.0.0! This is a major feature release for Calendar Plus with some big new (optional) additions that can be toggled via settings. You can read more about them below.

New feature: Second Daily Note
- A second, independent daily note per day, with its own folder, date format, and template — completely separate from the primary daily note. Useful for meeting logs, call notes, or keeping work and personal notes apart. Disabled by default; enable under Settings → Calendar Plus → Second daily notes.
- Open or create it from a day cell's right-click menu, or with Option/Alt + click on a day cell. Option/Alt + click opens an existing second daily note (it won't create one — creation stays in the right-click menu); add Cmd/Ctrl to open it in a new tab or split.
- Right-click context menu: when a primary daily note exists, "Open daily note" and "Delete daily note" sit at the top, alongside the second daily note's open/create and delete items. Deletions respect your Obsidian trash preference, and the primary note's standard file actions still appear below.
- A second, half-opacity dot marks day cells that have a second daily note, distinguishing it from the primary-note dot.

New feature: Feature Images
- Show a daily or weekly note's image as the day/week cell background, turning the calendar into a visual overview. Opt-in under Settings → Calendar Plus → Feature images.
- The image is taken from the note's frontmatter — `banner`, then `image`, then `cover` by default (configurable) — falling back to the first embedded image in the note. Vault images only.
- A subtle dark gradient keeps the date number and dots readable over any photo, and the selected day shows a translucent accent overlay so the image stays visible. The date number looks identical with or without an image.
- Optionally extend feature images to weekly-note cells.

New feature: History navigator
- An opt-in button in the calendar header opens a compact 12-month grid for quickly jumping between months and years. Enable under Settings → Calendar Plus → "Show history navigator button."
- Click any month to jump the calendar to it; use the year arrows to move between years. A dot marks each month that contains any daily, weekly, or monthly note.
- The grid opens as a popup over the calendar and closes when you pick a month or click away.

Other changes
- Removed hover tooltips from the calendar's navigation arrows for more consistency. Keyboard navigation and ARIA labels will be revisited in a future pass.

Behavior notes
- Left-click on a day cell still always opens the primary daily note.
- Second daily notes and feature images do not affect the active-note highlight; only primary daily and weekly notes drive cell highlighting.
- All three features are off by default — existing behavior is unchanged until you enable them.

## 1.8.3

Focus: active-note highlighting reliability. No note path/date/template behavior changes.

Calendar UI
- Improved active-note highlighting reliability after opening daily and weekly notes from the calendar.
- Daily and weekly existing-note opens now update the active-file store immediately after the note opens, matching the active-file sync pattern already used by other periodic note types.
- When the Calendar view opens, it now syncs the currently active file so an already-open daily or weekly note can be highlighted immediately.

Behavior notes
- No note-opening behavior changed.
- No modifier-click behavior changed.
- No Today button behavior changed.
- No settings/defaults changed.

## 1.8.2

Focus: Today button behavior and settings polish. No note path/date/template behavior changes.

Calendar UI
- The Today button now still jumps to the current month, and if Daily notes are enabled it also opens or creates today's daily note.
- Added a "Show Today button on mobile" setting. Mobile keeps the Today button hidden by default, while desktop always shows it.
- Reordered Calendar behavior settings for clarity.
- Renamed "Ctrl + Click Behavior" to "Ctrl/Cmd + Click Behavior" to better reflect cross-platform modifier-click behavior.

Behavior notes
- Today uses the existing daily-note open/create flow and respects "Confirm before creating new note."
- If Daily notes are disabled, Today only jumps to the current month.
- Today uses current-pane behavior; modifier-click behavior was not added to the Today button.

## 1.8.1

Focus: mobile polish, modifier-click consistency, and repository hygiene. No note path/date/template behavior changes.

Calendar UI
- Improved mobile alignment so the month/year title and quarter row sit more naturally with the calendar grid.
- Desktop layout is unchanged.

Modifier-click behavior
- Fixed Ctrl-click handling on month, quarter, and year labels for Windows/Linux.
- Month, quarter, and year labels now use the same cross-platform modifier-click behavior as day and week-number cells.
- Month, quarter, and year note openings now respect the existing "Ctrl + Click Behavior" setting.
- Plain-click behavior is unchanged.

Code quality
- Consolidated periodic-note open/create helper logic after unifying modifier-click behavior.

Repository
- Added a security policy.

## 1.8.0

Focus: configurable dot styles. Calendar Plus now supports both simple note-existence dots and optional word-count/open-task dots. No note-opening behavior changes.

Calendar UI / settings
- Added a new **Dot style** setting under Calendar behavior.
- **Note exists** remains the default: day and week cells show a simple dot when the corresponding note exists.
- Added an optional **Word count and open tasks** mode: filled dots represent word count, and one hollow task dot appears when a daily or weekly note has open `- [ ]` or `* [ ]` tasks. Completed `- [x]` boxes are intentionally excluded.
- Added a **Words per dot** setting for the word-count threshold (default 250). Dots are capped at 5 per cell.
- Dot style applies to daily and weekly cells only. Monthly, quarterly, and yearly header labels are unchanged.
- The new setting uses descriptive copy and does not change existing note-opening behavior.
- The `has-note` class on day/week cells is preserved as a stable theme hook in both dot modes.

Code quality / performance
- The word-count and task-dot sources are opt-in and self-gated. In the default **Note exists** mode, they return no dots and do not read note contents.
- The optional mode uses Obsidian's `vault.cachedRead` for visible daily/weekly notes only — no vault enumeration, no scans beyond the existing periodic-note index.

## 1.7.18

Focus: settings polish and configurable weekend-day shading. No note-opening behavior changes.

Calendar UI / settings
- Added configurable weekend days for weekend column shading. Saturday/Sunday remains the default weekend-day selection, but users can now choose Friday/Saturday, Saturday-only, Sunday-only, or any other combination.
- Weekend shading now defaults off for new installs and users without a saved weekend-shading preference. Existing saved preferences are preserved.
- Weekend-day selection is independent of the "Start week on" setting: week start controls column order; weekend days control which columns are shaded.
- The Weekend days picker now appears only when "Shade weekend columns" is enabled.
- Moved "Change week number side" into the Weekly Notes settings section, where it appears only when Weekly notes are enabled.
- Reordered Calendar behavior settings for clarity and standardized user-facing settings text to American English.

Code quality
- Tidied calendar UI internals with no intended behavior change: cleaned up the dot data model, removed unreachable dot styling, removed dead WeekNum styles, and clarified the Day active selector.

## 1.7.17

Focus: checker-recovery styling patch after 1.7.16. No changes to note-opening behavior.

Calendar UI
- Simplified the weekend column shading CSS to remove style overrides the Obsidian community-plugin checker flagged in 1.7.16. The weekend tint now applies as a single straightforward rule on the header (`th.weekend`) and body (`td.weekend`) cells, with no aggressive resets on the inner day card.
- Preserved the **Shade weekend columns** setting (defaults ON) — toggling it off remains the user-facing workaround for themes whose day-cell styling makes weekend tinting look busy or inconsistent.
- Preserved the 1.7.16 active-quarter visual polish: the current quarter label remains accent text only with no background pill, gradient, or shadow.
- Weekend shading is intentionally simple and theme-friendly. Under themes that paint their own opaque background on day cells, the weekend tint may render unevenly — that's accepted; the toggle is the remedy for those users.

## 1.7.16

Focus: visual polish for the calendar header and weekend column shading, plus a new toggle for users who prefer no weekend tint. No changes to note-opening behavior.

Calendar UI
- Polished the calendar header so the month/year title and the quarter row (Q1·Q2·Q3·Q4) read as a single left-aligned cluster with consistent spacing.
- The active quarter label now uses accent text only — no background, pill, gradient, or shadow under themes like Minimal that style generic active-state elements.
- Weekend column shading now renders as a continuous column from the SAT/SUN headers through every body row under both the default Obsidian theme and Minimal. Previously, Saturday/Sunday cells could render as rounded individual cards under some themes; the new shading paints flat at the cell level.

Settings
- Added **Shade weekend columns** under Settings → Calendar Plus → Calendar behavior. Defaults to ON for new and existing users (existing users keep weekend shading unless they turn it off). When off, weekend columns render the same as weekday columns — only the background tint is removed; weekend text color, today styling, selected-day styling, note dots, hover/press behavior, and click behavior are all unaffected.

## 1.7.15

Focus: tiny metadata-only release. No runtime behavior changes.

- Updated the plugin description / tagline in `manifest.json` (and the matching `package.json` field) to clarify that Calendar Plus is an update of the original Calendar plugin. The Obsidian community-plugin listing will pick this up on the next index refresh.

## 1.7.14

Focus: replace the last `localStorage` usage with Obsidian's `getLanguage()` API. No intended user-visible behavior change for users on Obsidian 1.8.7 or newer.

Code quality
- Replaced `localStorage.getItem("language")` in `src/ui/calendar-ui/localization.ts` with Obsidian's documented `getLanguage()` top-level export. The `|| "en"` fallback drops because `getLanguage()` returns `"en"` by default per the Obsidian API documentation.
- Bumped the pinned `obsidian` dev dependency from `obsidianmd/obsidian-api#23947b58…` (v1.7.2) to `obsidianmd/obsidian-api#165ccdd` (v1.8.7), which is the minimum version that introduced `getLanguage()`. No other dependency drift — `@types/codemirror` and the bundled `moment` types stayed at the same versions.

Compatibility
- Raised `minAppVersion` from `0.9.11` to `1.8.7` to match the API floor `getLanguage()` requires. Users on older Obsidian builds remain on 1.7.13 via the `versions.json` mechanism (`versions.json` now maps `"1.7.14": "1.8.7"` while every prior version stays at `"0.9.11"`).

Expected Obsidian checker outcome
- The Local Storage behavior recommendation should clear (the source tree no longer contains `localStorage` or `sessionStorage`).
- The Vault Enumeration behavior recommendation remains an accepted architectural trade-off — Calendar Plus needs `Vault.recurseChildren` for note-existence dots and `vault.getAllLoadedFiles()` for settings autocomplete. Documented in `FUTURE_PLANS.md` → "Accepted Obsidian checker behavior recommendations".
- The single non-blocking `no-restricted-imports` warning on `src/types/moment.ts:2` (the type-only seam) remains intentional, as does the Svelte component instance typing noise on `view.ts`. Both deferred per `FUTURE_PLANS.md`.

## 1.7.13

Focus: clear the remaining Moment / type-resolution checker warnings from the 1.7.12 baseline, plus two small independent type-shape cleanups. No intended user-visible behavior change.

Code quality (no behavior change)
- Routed all runtime `moment` usage through `src/types/moment.ts` instead of importing `moment` directly from `"obsidian"`. Six source files (and the two missed `const { moment } = window;` destructures in `src/settings.ts`) now `import { moment } from "src/types/moment"`. The seam casts Obsidian's bundled moment to a small local `MomentFactory` interface covering the call signatures and static methods Calendar Plus actually uses, so the Obsidian checker no longer treats `moment()` / `moment.locale()` / `moment.localeData()` / `moment.weekdays()` etc. as error-typed. This clears the cluster of `unsafe-assignment` / `unsafe-call` / `unsafe-member-access` warnings that cascaded from every Moment call site in `periodicNoteHelpers.ts`, `main.ts`, `localization.ts`, and `calendar-ui/utils.ts`.
- Runtime moment still comes from Obsidian's bundled `moment` export — the cast is type-only, the underlying value is unchanged, and `window.moment` access remains gone.
- Simplified `ILocaleOverride` to plain `string` (the prior `"system-default" | string` union flattened to `string` anyway) and documented the `"system-default"` sentinel in JSDoc, satisfying the checker's redundant-literal-in-union warning without depending on the `(string & {})` idiom (which the locally-pinned `@typescript-eslint` v4.20.0 `ban-types` rule rejects).
- Typed the `month` accumulator in `getMonth` (`src/ui/calendar-ui/utils.ts`) as `IMonth` instead of letting it infer to `any[]`, clearing the unsafe-return warning. The function's declared return type was already `IMonth`; the local annotation just makes the accumulator's type match.

Known remaining warnings
- The single non-blocking `no-restricted-imports` warning on `src/types/moment.ts:2` (the type-only `import type { ... } from "moment"`) remains intentional — it's the central seam.
- `localStorage.getItem("language")` and the Svelte component instance typing warnings on `this.calendar` are still deferred per `FUTURE_PLANS.md` §2 and §5.

## 1.7.12

Focus: clear the single blocking Error the Obsidian community-plugin checker raised against 1.7.11. No intended user-visible behavior change.

Fix
- Removed the inline `// eslint-disable-next-line no-restricted-imports` directive from `src/types/moment.ts`. The Obsidian checker forbids disabling that rule (similar to how it forbids `no-explicit-any` disables), regardless of whether the disable is rule-specific or carries a description — 1.7.11's targeted, described disable was rejected as an Error. The directive is now gone; the import line below it is unchanged.
- Preserved `src/types/moment.ts` as the single type-only seam for precise `Moment`, `Locale`, `WeekSpec`, and `DurationUnit` types. Consumers continue to `import type { Moment } from "src/types/moment"`; no per-file churn.
- Runtime usage still imports `moment` from `"obsidian"` (no `window.moment` runtime access reintroduced). All other 1.7.10 / 1.7.11 cleanups — the runtime moment migration, `Platform.isMacOS`, type tightening, fire-and-forget `void`s, arrow class properties on `CalendarView` — are preserved.

Expected checker outcome
- The blocking Error should be cleared.
- The type-only import line may remain as a non-blocking `no-restricted-imports` warning. That single warning is acceptable; this file is intentionally the only `"moment"` import in the source tree and the block comment in the file documents the trade-off.
- Several `unsafe-call` / `unsafe-member-access` warnings on consumer-side `moment()` calls are still expected. Those are downstream of the Obsidian checker's TypeScript not following Obsidian's transitive `import * as Moment from 'moment'` re-export — independent of the central seam, and tracked as a follow-up if warning count remains a priority.

## 1.7.11

Focus: regression fix for the 1.7.10 source-code warning cleanup. No intended user-visible behavior change.

What went wrong in 1.7.10
- 1.7.10 introduced `src/types/moment.ts` with `export type Moment = ReturnType<typeof moment>` (where `moment` is imported from `"obsidian"`). The intent was to satisfy the Obsidian community-plugin checker's restricted-imports rule for `"moment"` while preserving precise Moment instance types. In practice the derivation collapsed Moment instances to effectively `any` under the checker's type-aware lint pass, because resolving `typeof moment` through Obsidian's CommonJS re-export of moment's `export = moment; export as namespace moment` namespace did not yield a precise call-signature for `ReturnType` to extract. Calendar Plus's local lint (`@typescript-eslint/recommended`, non-type-aware) did not enable the `no-unsafe-*` rules that detect this, so the regression only surfaced when the Obsidian checker re-ran the plugin. Result: ~56 net new `unsafe-member-access` / `unsafe-call` warnings, one cluster per Moment method site (`.format`, `.clone`, `.add`, `.startOf`, `.weekday`, `.locale`, `.isoWeekday`, etc.).

What 1.7.11 changes
- Restored precise `Moment`, `Locale`, and `DurationUnit` types in `src/types/moment.ts`. The module now type-imports them directly from `"moment"` (with a single targeted `// eslint-disable-next-line no-restricted-imports` directive carrying a description of why it's there) and re-exports them. Consumers still `import type { Moment } from "src/types/moment"` everywhere else — no per-file churn.
- Runtime usage is unchanged: every source file still imports `moment` from `"obsidian"`. This release does **not** reintroduce `window.moment` runtime access. The 1.7.10 wins from the moment-runtime migration, the `Platform.isMacOS` swap, the loose-type tightening, the `void`-prefixed promises, and the arrow class properties on `CalendarView` are all preserved.

Notes for future contributors
- `src/types/moment.ts` is now the **single type-only seam** between Calendar Plus and the `"moment"` package. Any new Moment type the codebase needs should be added there and re-exported — keep the per-file `"moment"` import surface at exactly one.
- The eslint-disable directive uses the base ESLint `no-restricted-imports` rule rather than `@typescript-eslint/no-restricted-imports` because the pinned `@typescript-eslint/eslint-plugin@4.20.0` does not register the TS-specific variant; it was added in plugin v5+. If the typescript-eslint plugin is later upgraded, the disable target should switch to `@typescript-eslint/no-restricted-imports` for tighter scoping.

## 1.7.10

Focus: source-code warning cleanup pass against the Obsidian community-plugin review. No intended user-visible behavior change relative to 1.7.9.

Code quality (no behavior change)
- Migrated all `Moment` usage off the `"moment"` package. Calendar Plus now imports the runtime `moment` value from `"obsidian"` (which bundles moment) and derives the `Moment`, `Locale`, `WeekSpec`, and `DurationUnit` types locally in `src/types/moment.ts`. No source file imports types from `"moment"` directly anymore.
- Replaced the deprecated `navigator.appVersion` macOS sniff with Obsidian's documented `Platform.isMacOS` constant for Cmd/Ctrl-click detection.
- Tightened loose types in several hot paths: explicit `string | undefined` parameter types on the template-token regex callbacks (with a `DurationUnit` cast at the `.add()` call site), a typed `metadataReducer` accumulator with `?? []` / `?? {}` defaults, an explicit `string[]` on the tag-extraction and `partition` accumulators, a corrected `string | null` return on `getDateUIDFromFile`, and a `Partial<ISettings>` cast at the `loadData()` boundary in `loadOptions`. Two unnecessary type assertions removed (`split("/").pop() as string` → `?? format` fallback; the locale-override dropdown cast).
- Marked the remaining intentionally fire-and-forget promise calls with `void` (`workspace.revealLeaf`, `setViewState`, the nested `openOrCreateWeeklyNote` inside the command callback, the file-menu's `openLinkText`, and the confirmation-modal click handler — the latter rewritten as a void async IIFE so the event listener has the expected `void` return type).
- Converted the bound `CalendarView` event-handler and Svelte-prop methods to arrow class properties. The constructor's 20-line `this.X = this.X.bind(this)` block is gone; methods are `this`-bound at instance creation. The seven methods that aren't passed as callbacks (`getViewType`, `getDisplayText`, `getIcon`, `onOpen`, `onClose`, `updateActiveFile`, `revealActiveNote`) remain regular instance methods.

Known deferred warnings
- `localStorage.getItem("language")` in `src/ui/calendar-ui/localization.ts` is still flagged. Obsidian's `App.getLanguage()` is not in Calendar Plus's currently pinned Obsidian API (commit `23947b58…`, version 1.7.2); resolving this warning is paired with a future Obsidian d.ts pin bump.
- Several `unsafe-call` warnings on the Svelte `Calendar` component's `tick`, `$set`, and `$destroy` methods are framework-typing-generation noise rather than Calendar Plus correctness issues. Deferred pending a focused Svelte typing investigation.

## 1.7.9

Focus: clearing the last two Obsidian community-plugin review errors from the 1.7.8 resubmission. Settings-tab section headings renamed; no other behavior change.

User-visible
- Renamed the settings section headings to comply with Obsidian community-plugin review guidance, which discourages the word "Settings" and the generic label "General" inside a settings tab.
- "General Settings" is now "Calendar behavior".
- "Advanced Settings" is now "Locale".
- The "Periodic Notes" section heading and all per-period sub-headings ("Daily notes", "Weekly notes", "Monthly notes", "Quarterly notes", "Yearly notes") are unchanged.

## 1.7.8

Focus: polish pass on top of 1.7.7 — README presentation, a friendlier first-run experience, and a more recognizable sidebar icon. No code-quality or behavior regressions relative to 1.7.7.

User-visible
- Added a README screenshot showing the Calendar Plus sidebar so the GitHub page and Obsidian community-plugin listing have a visual at a glance.
- Rewrote the README intro to describe Calendar Plus as a substantial rewrite of Liam Cain's original Calendar and Periodic Notes plugins that merges the two into a single integrated calendar + periodic-notes workflow. The new intro also highlights the clickable month / quarter / year header labels and the "dots mean a note exists, and nothing else" design.
- Daily notes are now enabled by default. Fresh installs (and users whose saved `data.json` doesn't include a `daily` setting) get a calendar with daily-note clicking active out of the box, instead of having to find and flip the Enable toggle in settings. Existing users who have explicitly toggled Daily off keep their setting — the per-period deep-merge in `loadOptions` already preserves saved values over defaults.
- Switched the sidebar / ribbon icon from the older `calendar-with-checkmark` to Obsidian's built-in Lucide `calendar-plus` icon. The new icon matches the plugin name and is more recognizable at sidebar scale.

## 1.7.7

Focus: clearing Obsidian community-plugin review findings ahead of the directory submission. No user-visible behavior change; the calendar, settings, and periodic-note flows behave exactly as in 1.7.6.

Code quality
- Replaced every `@typescript-eslint/no-explicit-any` eslint-disable in the source tree with typed extension interfaces over Obsidian's internal APIs (`foldManager`, `keymap`, `fileManager.promptForFileDeletion`) and, for the mobile-detection paths in the vendored calendar UI, the documented public `Platform.isMobile`. The internal-API typings live in a new `src/types/obsidian-internal.ts`.
- Tightened the `ConfirmationModal` accept-handler signature: `onAccept` is now typed `() => Promise<void>` instead of `(...args: any[]) => Promise<void>`, removing the unlimited eslint-disable directive in `src/ui/modal.ts`.
- Switched the settings-tab section headings ("General Settings", "Periodic Notes", "Advanced Settings") from raw `<h3>` elements to `new Setting(...).setHeading()`, the documented Obsidian API. Section chrome now matches Obsidian's native settings styling.
- Switched the settings autocomplete dropdown's parent from `document.body` to `activeDocument.body` so the dropdown attaches correctly when settings are opened in a popout window. No behavior change in the main window.
- Marked intentional fire-and-forget promise calls with `void` (five `writeOptions` calls behind general-settings handlers, five `tryToCreate*Note` calls in the calendar view's open-or-create flows). No scheduling change; lint warnings silenced.

Release pipeline
- Removed the unsupported `calendar-plus-<tag>.zip` asset from the GitHub Actions release. Releases now ship only the three Obsidian-required files (`main.js`, `manifest.json`, `styles.css`).
- Added build-provenance attestations via `actions/attest-build-provenance@v2` for `main.js`, `manifest.json`, and `styles.css`. Workflow permissions extended to `id-token: write` and `attestations: write` to support the attestation step.
- Release notes are now extracted from the top section of `CHANGELOG.md` at release time (`awk` over the first `##` heading) and supplied to the release via `body_path: RELEASE_NOTES.md`. Tagged releases now produce populated release bodies automatically.

## 1.7.6

Focus: performance, correctness, and publication-readiness release on top of 1.7.5.

Calendar UI
- Dots for periodic notes now stay correct when files are renamed or moved between folders. Previously, renaming a daily note's basename (or moving a periodic note in or out of its configured folder) could leave a stale dot in the calendar until the plugin was reloaded or settings were changed. Calendar Plus now listens for vault rename events and updates indexes incrementally.
- Settings-tab folder and template autocomplete suggestions are now sorted alphabetically and capped at 200 results. In vaults with many folders or markdown files, the dropdown stays fast and predictable; typing one or two characters narrows results below the cap in practice.
- Calendar view placement is now preserved across plugin disable/re-enable. If you've moved the calendar to the left sidebar, into the main pane, or pinned it elsewhere, that placement now persists through plugin reloads. Previously, Calendar Plus snapped the view back to the right sidebar every time.

Internal / repo
- Periodic-note stores are now updated incrementally on file create/delete/rename events instead of doing a full folder rescan on each event. Negligible for typical vaults, but materially faster in large vaults (50k+ files, or daily folder set to the vault root). Settings changes still do a full reindex, which is the right behavior.
- Refactored the five per-period note stores into a single shared factory in `src/ui/stores.ts`, halving the code and centralizing the new incremental-update logic.
- Pinned the Obsidian API dependency in `package.json` to a specific commit SHA instead of the floating `#master` ref, and switched the GitHub Actions release workflow from `npm install` to `npm ci`. CI builds are now byte-deterministic for anyone cloning the repo.
- Pruned stale extraneous workspace entries from `package-lock.json` left over from before the 1.7.0 vendoring.
- Added a defensive null guard around `initLeaf`'s right-sidebar lookup so the calendar view can fail gracefully if the right sidebar is unavailable.
- `FUTURE_PLANS.md` is now down to two deferred-with-clear-trigger items; the long cleanup sequence that started with 1.7.0 vendoring is fully landed.

## 1.7.5

Focus: cleanup and polish release on top of 1.7.4. One small user-visible fix; the rest is internal hygiene.

Calendar UI
- Day cells without tags no longer receive an empty `data-tags=""` attribute. Themes targeting `[data-tags]` only match cells that actually carry tags now.

Internal / repo
- Removed dead Jest test scaffolding: `src/testUtils/`, `src/ui/__mocks__/`, and the `"jest"` config + `"test"` / `"test:watch"` scripts from `package.json`. None of it was referenced by source.
- Removed four unused Jest-related devDependencies: `@types/jest`, `jest`, `svelte-jester`, `ts-jest`. Slimmer install (Calendar Plus's `node_modules` shrank by ~450 packages) and a smaller `npm audit` surface.
- Removed the unused `patch-package` runtime dependency and the `postinstall` script that only ran it. The `patches/` directory has been gone since 1.7.0; the script has been a no-op since.

## 1.7.4

Focus: small bugfix release on top of 1.7.3.

Calendar UI
- Rapid duplicate clicks on the same empty periodic-note cell (daily, weekly, monthly, quarterly, or yearly) no longer race on note creation. Previously, a fast double-click with confirm-before-create off could dispatch two concurrent `vault.create` calls; the second would lose the race and surface a stray "Unable to create new file" notice. Calendar Plus now tracks in-flight creates per (periodicity, date) and silently short-circuits duplicates while the first is still resolving. Clicks on different days, different periodicities, or after the first create completes continue to work normally.

## 1.7.3

Focus: maintenance and Obsidian-API-compatibility release on top of 1.7.2. No user-visible UI changes.

Internal / repo
- Modernized deprecated Obsidian workspace API usage throughout `src/view.ts` and the monthly/quarterly/yearly note-creation wrappers. The five periodic-note handlers and wrappers now consistently use `workspace.getLeaf("split", "vertical")` and `workspace.getLeaf(false)` instead of `splitActiveLeaf()` and `getUnpinnedLeaf()`, and the post-create focus call uses the modern `workspace.setActiveLeaf(leaf, { focus: true })` options form. Cmd/Meta-click on a month / year / quarter label now opens the new split to the right of the active pane, matching daily/weekly behavior (previously could open below).
- Replaced `app.workspace.activeLeaf` + `FileView` `instanceof` checks in `updateActiveFile` and `revealActiveNote` with `workspace.getActiveFile()`. Eliminates two latent null-deref paths that could throw during transient workspace states with no active leaf.
- Removed the now-unused `FileView` import from `src/view.ts`.
- Updated `FUTURE_PLANS.md` / `CLAUDE.md`: the deprecated-workspace-APIs item is complete and removed; a smaller follow-up to migrate the `"layout-ready"` event in `src/main.ts` to `workspace.onLayoutReady(callback)` has been tracked in its place.

## 1.7.2

Focus: visual polish and CSS cleanup release on top of 1.7.1.

Calendar UI
- Centered the TODAY button vertically between the previous/next navigation arrows.
- Added the purple active-background treatment to active weekly notes — the active week-number cell now matches the active-daily-note styling instead of looking the same as a non-active cell.
- Removed the vertical divider on the left of the week-number column when it's shown on the right side. The left-side placement still shows its right-edge divider.

Internal / repo
- Moved component-owned CSS rules out of `styles.css` and into the vendored calendar components' `<style>` blocks (week-num font size and dot-container reservation into `WeekNum.svelte`; container `user-select: none` and the weekend column shading default into `Calendar.svelte`; TODAY and arrow hover dim into `Nav.svelte` and `Arrow.svelte`). `styles.css` now contains only wrapper-state-dependent rules (gated on `.daily-enabled`/`.monthly-enabled`/etc.) and the settings autocomplete dropdown rule.
- No user-visible change from the CSS migration — visual output is identical to 1.7.1.

## 1.7.1

Focus: bug-fix and polish release on top of 1.7.0.

Calendar UI
- Fixed the current-month rollover check so the calendar advances at midnight on the last day of the month. The heartbeat now compares `displayedMonth` and `today` by month instead of by day.
- Restored the purple press feedback on day cells when Daily notes are enabled. Click-and-hold on a day now shows the same purple background + light text the original Calendar plugin showed; the feedback releases naturally on mouseup.
- Fixed disabled-Daily-note day-cell interactions so hovering or pressing a day no longer removes the purple background of an active or today cell, and pressing a today cell no longer flickers its purple text to the default text color.
- All seven day-of-week columns now render at identical widths, so day-cell hover, press, and active backgrounds are the same size across columns. The week-number column remains slightly narrower.

Internal / repo
- Modernized the GitHub release workflow: bumped checkout/setup-node to v4, switched to Node 20, replaced the archived release-asset actions with `softprops/action-gh-release@v2`, and dropped a redundant `npx patch-package` step.
- Removed stale inherited README screenshots (`images/`) and the unused `TESTING.md` file. Fixed `.gitignore` so `.DS_Store` is now actually ignored.
- Pruned completed cleanup items from `FUTURE_PLANS.md` and the `CLAUDE.md` known-issues list (README refresh, CI consolidation, funding metadata cleanup — all done in earlier work).

## 1.7.0

Focus: internal cleanup and refactor release after the 1.6.0 feature baseline. No user-visible behavior changes — Calendar Plus should look and act exactly as it did in 1.6.0.

- Vendored the calendar UI source into Calendar Plus under `src/ui/calendar-ui/`. Calendar Plus now owns its calendar components, types, and helpers directly.
- Removed the `obsidian-calendar-ui` dependency.
- Removed the `patch-package` patch that was previously maintained against `obsidian-calendar-ui`.
- Replaced the Popper-based folder/template autocomplete in settings with a local no-Popper implementation that positions the dropdown via `getBoundingClientRect()` + inline `position: fixed`.
- Removed the `@popperjs/core` dependency.
- Reduced bundle and dependency complexity overall: fewer transitive dependencies, no patched libraries, smaller install footprint.

## 1.6.0

Focus: major Calendar Plus feature baseline — Periodic Notes-style functionality integrated directly into the calendar.

Periodic notes
- Integrated Periodic Notes-style functionality directly into Calendar Plus. Calendar Plus now owns its own settings for daily, weekly, monthly, quarterly, and yearly notes, independent of Obsidian's core Daily Notes plugin and the Periodic Notes plugin.
- Added support for creating and opening monthly, quarterly, and yearly notes from the calendar UI.
- Added folder and template path autocomplete in the settings tab for each periodic-note section.
- Loading is safer: per-period settings are deep-merged over defaults so a partial `data.json` cannot wipe `format` / `folder` / `template` and produce broken filenames.

Calendar UI
- Added clickable month, year, and quarter labels in the calendar header — each opens or creates the corresponding periodic note.
- Added a quarter row (Q1–Q4) under the month/year header, visible when quarterly notes are enabled.
- Added a Calendar Plus ribbon icon that reveals the existing calendar leaf or creates one.
- Added subtle weekend column shading.
- Improved hover and disabled-state affordances: month / year / quarter / day labels only look interactive when their note type is enabled. Suppressed a transient purple flash on day cells during click-drag.
- Improved weekly note column: dot-container reserved height to prevent week-number jitter, and week-number font size matched to day-number font size.

Dots
- Dots now indicate exactly one thing: a periodic note exists for that day or week.
- Removed word-count-per-dot and task-dot rendering.

Settings
- Toggling Enable on a periodic-note section now re-renders only that section's wrapper instead of rebuilding the whole settings tab — no scroll jump.
- Settings tab can be opened before the calendar view has mounted (locale week-spec is initialized eagerly).

Lifecycle and stability
- Fixed stale `CalendarView` references in commands by looking up the live view fresh per invocation.
- Fixed a `settings.subscribe` leak in the calendar view that caused a `tick is not a function` crash on settings change.
- `open-weekly-note` mounts the view if needed; `reveal-active-note` no-ops cleanly when the view is absent.

Coexistence
- Calendar Plus runs alongside the original Calendar plugin without collision: separate plugin id (`calendar-plus`), separate view type (`calendar-plus-view`), and separate event namespace (`calendar-plus:open`).
