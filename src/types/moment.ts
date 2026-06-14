import { moment as obsidianMoment } from "obsidian";
import type { Locale, Moment, unitOfTime } from "moment";

// ---------------------------------------------------------------------------
// Central moment seam.
//
// Two responsibilities:
//   1. Re-export precise `Moment` / `Locale` / `WeekSpec` / `DurationUnit`
//      types, so consumer files can `import type { Moment } from
//      "src/types/moment"` and get full method-surface typing.
//   2. Re-export the runtime `moment` value with a typed `MomentFactory`
//      shape, so consumer files can `import { moment } from
//      "src/types/moment"` and get precise return types on `moment()` and
//      `moment.X()` calls.
//
// Background:
//   - The type-only `import type { ... } from "moment"` below is the only
//     `"moment"` import in `src/`. The Obsidian community-plugin checker
//     flags it as a single non-blocking `no-restricted-imports` warning,
//     which we intentionally accept in exchange for keeping consumer files
//     clean of `"moment"` imports.
//   - The runtime `moment` value lives in `"obsidian"` (Obsidian bundles
//     moment.js and re-exports it). Importing the value directly into
//     consumer files leaves it error-typed under the checker because the
//     checker can't resolve through Obsidian's `import * as Moment from
//     'moment'` re-export chain — every `moment(...)` call site cascades
//     into `unsafe-call` / `unsafe-member-access` warnings.
//   - This module casts the obsidian-exported moment to a locally-defined
//     `MomentFactory` interface. The cast is type-only (zero runtime
//     change — the underlying value is still Obsidian's bundled moment),
//     and the local interface gives the checker a resolvable shape so
//     consumer-side `moment()` and `moment.X()` calls type precisely.
// ---------------------------------------------------------------------------

export type { Locale, Moment };

/**
 * Locale week specification — the shape `moment.updateLocale` accepts under
 * its `week` key. Stable across moment 2.x; defined locally to keep this
 * module's surface deliberate.
 */
export interface WeekSpec {
  dow: number;
  doy?: number;
}

/**
 * Moment's unit-of-time strings accepted by `.add`, `.startOf`, `.endOf`,
 * and similar duration-flavored methods. Re-exported from moment's
 * `unitOfTime.DurationConstructor` so the checker has the full union (long
 * names, plurals, and single-letter shortcuts) to validate against.
 */
export type DurationUnit = unitOfTime.DurationConstructor;

/**
 * Call signature + static-method shape of moment's factory namespace,
 * narrowed to what Calendar Plus actually uses. Extend as new call sites
 * are added rather than hand-rolling moment's entire API.
 */
export interface MomentFactory {
  // Call signatures (factory invocations).
  (): Moment;
  (input: string, format: string, strict?: boolean): Moment;

  // Parse an ISO string preserving its UTC offset (used to reconstruct a
  // stored date UID without timezone shifting). Returns a precise Moment so
  // consumer-side `.year()` / `.month()` calls type cleanly.
  parseZone(input: string): Moment;

  // Static methods (factory members) Calendar Plus calls.
  locale(): string;
  locale(loc: string): string;
  locales(): string[];
  weekdays(): string[];
  weekdaysShort(start?: boolean): string[];
  updateLocale(name: string, config: { week: WeekSpec }): void;
  localeData(): Locale;
}

/**
 * Runtime moment value — the bundled instance Obsidian provides, retyped via
 * `MomentFactory` so consumer-side `moment()` and `moment.X()` calls have
 * precise return types under the Obsidian checker. The cast is type-only;
 * the underlying value is still `import { moment } from "obsidian"`.
 */
export const moment: MomentFactory =
  obsidianMoment as unknown as MomentFactory;
