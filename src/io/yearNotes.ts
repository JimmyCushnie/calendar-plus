import type { TFile } from "obsidian";
import { moment } from "src/types/moment";

/**
 * Mark, in `out`, every month index (0 = Jan … 11 = Dec) of `year` that has at
 * least one note in the given store. The store is keyed by `getDateUID`
 * output: `${unit}-${ISOdate}` (e.g. `day-2026-06-12T00:00:00-07:00`). The
 * unit ("day" / "week" / "month") contains no "-", so the first "-" separates
 * it from the ISO timestamp, which we reconstruct with `moment.parseZone` to
 * preserve the stored local offset (avoids a midnight date shifting months).
 */
function fillMonthsForStore(
  notes: Record<string, TFile> | null,
  year: number,
  out: boolean[]
): void {
  if (!notes) return;
  for (const uid of Object.keys(notes)) {
    const iso = uid.substring(uid.indexOf("-") + 1);
    const d = moment.parseZone(iso);
    if (d.year() === year) {
      out[d.month()] = true;
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
  const out: boolean[] = new Array(12).fill(false);
  fillMonthsForStore(daily, year, out);
  fillMonthsForStore(weekly, year, out);
  fillMonthsForStore(monthly, year, out);
  return out;
}
