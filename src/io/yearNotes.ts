import type { TFile } from "obsidian";

/**
 * Mark, in `out`, every month index (0 = Jan … 11 = Dec) of `year` that has at
 * least one note in the given store. The store is keyed by `getDateUID`
 * output: `${unit}-${ISOdate}` (e.g. `day-2026-06-12T00:00:00-07:00`). The
 * unit ("day" / "week" / "month") contains no "-", so the first "-" separates
 * it from the ISO timestamp. We read the year/month digits directly off the
 * ISO string's local-date portion (`YYYY-MM-…`) rather than parsing it with
 * moment: the stored string already encodes the intended local date, so
 * reading the chars can't shift a month across a timezone boundary, and it
 * avoids a `moment.parseZone` call per stored UID (this runs across every
 * tracked note when the year overview is enabled).
 */
function fillMonthsForStore(
  notes: Record<string, TFile> | null,
  year: number,
  out: boolean[]
): void {
  if (!notes) return;
  for (const uid of Object.keys(notes)) {
    const iso = uid.substring(uid.indexOf("-") + 1);
    if (parseInt(iso.slice(0, 4), 10) === year) {
      out[parseInt(iso.slice(5, 7), 10) - 1] = true;
    }
  }
}

/**
 * Returns 12 booleans (Jan..Dec): true when that month has any daily, weekly,
 * or monthly note in `year`. Disabled periodicities pass empty stores, so they
 * contribute nothing. A weekly note is bucketed by its start-of-week date's
 * month (a coarse "this month has activity" signal for the year overview dot).
 */
export function getMonthsWithNotes(
  year: number,
  daily: Record<string, TFile> | null,
  weekly: Record<string, TFile> | null,
  monthly: Record<string, TFile> | null
): boolean[] {
  const out: boolean[] = Array.from({ length: 12 }, () => false);
  fillMonthsForStore(daily, year, out);
  fillMonthsForStore(weekly, year, out);
  fillMonthsForStore(monthly, year, out);
  return out;
}
