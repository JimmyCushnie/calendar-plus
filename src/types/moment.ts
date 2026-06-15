import { moment as obsidianMoment } from "obsidian";

// ---------------------------------------------------------------------------
// Central moment seam (hand-rolled types).
//
// Obsidian bundles moment.js and re-exports the `moment` VALUE — but not its
// types in a way you can name. Its plugin review restricts importing the
// `moment` package directly (`no-restricted-imports`), and deriving the types
// from the exported value (`ReturnType<typeof moment>`) collapses `Moment` to
// `any` and reintroduces ~60 `no-unsafe-*` warnings. So this module hand-rolls
// the slice of moment's API Calendar Plus actually uses, giving the source
// tree zero `"moment"` imports while keeping precise types.
//
// MAINTENANCE: this is a hand-written mirror of part of moment's surface.
// When a new moment method/overload is called anywhere in `src/` (including
// `.svelte` files), it must be added here or TypeScript / svelte-check will
// error. Performance impact is zero (types are erased at build time; the
// runtime value is still Obsidian's bundled moment). Keep an eye on whether
// this workaround is still necessary — see CLAUDE.md → "Dependency +
// type-aware lint" and FUTURE_PLANS § "Hand-rolled moment types".
// ---------------------------------------------------------------------------

/**
 * Duration-unit strings accepted by `add` / `subtract` / `startOf` / `isSame`.
 * A stable subset of moment's unit union covering the units Calendar Plus
 * uses (long names, plurals, and single-letter shortcuts).
 */
export type DurationUnit =
  | "year" | "years" | "y"
  | "quarter" | "quarters" | "Q"
  | "month" | "months" | "M"
  | "week" | "weeks" | "w"
  | "day" | "days" | "d";

/**
 * Opaque locale object (the result of `moment.localeData()` / a Moment's
 * `.localeData()`). Calendar Plus never calls methods on it directly — it is
 * spread into a plain object and passed through, or cast to
 * `LocaleDataWithWeek` (src/types/obsidian-internal.ts) for the private
 * `_week` access — so a structural record is sufficient.
 */
export type Locale = Record<string, unknown>;

/**
 * The Moment instance surface Calendar Plus calls. Getter/setter accessors
 * use overloads: no argument reads (returns a number), a number argument sets
 * (returns a new Moment for chaining).
 */
export interface Moment {
  clone(): Moment;
  format(format?: string): string;
  isValid(): boolean;
  isSame(other: Moment, granularity?: DurationUnit): boolean;
  calendar(): string;
  localeData(): Locale;

  add(amount: number, unit: DurationUnit): Moment;
  subtract(amount: number, unit: DurationUnit): Moment;
  startOf(unit: DurationUnit): Moment;
  get(unit: string): number;
  set(values: Record<string, number>): Moment;

  year(): number;
  year(value: number): Moment;
  month(): number;
  month(value: number): Moment;
  date(): number;
  date(value: number): Moment;
  day(): number;
  day(value: number): Moment;
  weekday(): number;
  weekday(value: number): Moment;
  week(): number;

  locale(): string;
  locale(locale: string): Moment;
}

/**
 * Locale week specification — the shape `moment.updateLocale` accepts under
 * its `week` key. Stable across moment 2.x.
 */
export interface WeekSpec {
  dow: number;
  doy?: number;
}

/**
 * Call signature + static-method shape of moment's factory, narrowed to what
 * Calendar Plus actually uses.
 */
export interface MomentFactory {
  // Call signatures (factory invocations).
  (): Moment;
  (input: string, format: string, strict?: boolean): Moment;

  // Parse an ISO string preserving its UTC offset (reconstructs a stored
  // date UID without timezone shifting).
  parseZone(input: string): Moment;

  // Static members Calendar Plus calls.
  locale(): string;
  locale(loc: string): string;
  locales(): string[];
  weekdays(): string[];
  weekdaysShort(start?: boolean): string[];
  monthsShort(): string[];
  updateLocale(name: string, config: { week: WeekSpec }): void;
  localeData(): Locale;
}

/**
 * Runtime moment value — the bundled instance Obsidian provides, retyped via
 * `MomentFactory`. The cast is type-only; the underlying value is unchanged.
 */
export const moment: MomentFactory =
  obsidianMoment as unknown as MomentFactory;
