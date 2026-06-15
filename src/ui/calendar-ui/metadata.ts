import type { Moment } from "src/types/moment";

import type { ICalendarSource, IDayMetadata } from "./types";

async function metadataReducer(
  promisedMetadata: Promise<IDayMetadata>[]
): Promise<IDayMetadata> {
  const initial: IDayMetadata = {
    dots: [],
    classes: [],
    dataAttributes: {},
  };
  const metas = await Promise.all(promisedMetadata);
  return metas.reduce<IDayMetadata>(
    (acc, meta) => ({
      classes: [...(acc.classes ?? []), ...(meta.classes ?? [])],
      dataAttributes: {
        ...(acc.dataAttributes ?? {}),
        ...(meta.dataAttributes ?? {}),
      },
      dots: [...(acc.dots ?? []), ...(meta.dots ?? [])],
      // First source that provides a backgroundImage wins; later sources don't override.
      backgroundImage: acc.backgroundImage ?? meta.backgroundImage,
    }),
    initial
  );
}

export function getDailyMetadata(
  sources: ICalendarSource[],
  date: Moment,
  ..._args: unknown[]
): Promise<IDayMetadata> {
  return metadataReducer(
    sources.map(
      (source) => source.getDailyMetadata?.(date) ?? Promise.resolve<IDayMetadata>({})
    )
  );
}

export function getWeeklyMetadata(
  sources: ICalendarSource[],
  date: Moment,
  ..._args: unknown[]
): Promise<IDayMetadata> {
  return metadataReducer(
    sources.map(
      (source) => source.getWeeklyMetadata?.(date) ?? Promise.resolve<IDayMetadata>({})
    )
  );
}
