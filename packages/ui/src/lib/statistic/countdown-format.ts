/** Anything a countdown can aim at: a `Date`, epoch milliseconds, or a date string. */
export type AndesCountdownTarget = Date | number | string | null | undefined;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
// Calendar-free approximations: a month is 30 days and a year 365 days, so a format that has
// no `D` token still shows a stable total.
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

type Unit = 'Y' | 'M' | 'D' | 'H' | 'm' | 's' | 'S';

const UNIT_MS: Record<Unit, number> = {
  Y: YEAR,
  M: MONTH,
  D: DAY,
  H: HOUR,
  m: MINUTE,
  s: SECOND,
  S: 1,
};

const UNIT_ORDER: readonly Unit[] = ['Y', 'M', 'D', 'H', 'm', 's', 'S'];

const TOKEN = /\[([^\]]*)]|Y+|M+|D+|H+|m+|s+|S+/g;

/** Converts a countdown target to epoch milliseconds, or `NaN` when it isn't a valid moment. */
export function toTimestamp(target: AndesCountdownTarget): number {
  if (target === null || target === undefined || target === '') {
    return Number.NaN;
  }
  if (target instanceof Date) {
    return target.getTime();
  }
  if (typeof target === 'number') {
    return target;
  }
  const numeric = Number(target);
  return Number.isNaN(numeric) ? Date.parse(target) : numeric;
}

/** Milliseconds in the smallest unit the format shows; 1000 when it shows none. */
export function finestUnitMs(format: string): number {
  let finest = Infinity;
  for (const match of format.matchAll(TOKEN)) {
    if (match[1] === undefined) {
      finest = Math.min(finest, UNIT_MS[match[0][0] as Unit]);
    }
  }
  return Number.isFinite(finest) ? finest : SECOND;
}

/** True when the format has a millisecond token, which makes the countdown tick faster. */
export function hasMillisecondToken(format: string): boolean {
  return stripEscaped(format).includes('S');
}

function stripEscaped(format: string): string {
  return format.replace(/\[[^\]]*]/g, '');
}

/**
 * Formats a duration with a small token language:
 * `Y` years, `M` months, `D` days, `H` hours, `m` minutes, `s` seconds, `S` milliseconds
 * (`SSS` = 3 digits, `SS` = 2, `S` = 1). Repeating a token pads it with zeros (`HH` -> `05`).
 * Text in square brackets is kept as is, and any other character passes through, so
 * `'D [days] HH:mm:ss'` works. The largest unit present absorbs everything above it: with
 * `HH:mm:ss`, two days is `48:00:00`.
 */
export function formatDuration(milliseconds: number, format: string): string {
  let rest = Math.max(0, Math.floor(milliseconds));
  const present = new Set<Unit>();
  for (const match of format.matchAll(TOKEN)) {
    if (match[1] === undefined) {
      present.add(match[0][0] as Unit);
    }
  }

  const values = {} as Record<Unit, number>;
  for (const unit of UNIT_ORDER) {
    if (present.has(unit)) {
      values[unit] = Math.floor(rest / UNIT_MS[unit]);
      rest -= values[unit] * UNIT_MS[unit];
    }
  }

  return format.replace(TOKEN, (token, escaped: string | undefined) => {
    if (escaped !== undefined) {
      return escaped;
    }
    const unit = token[0] as Unit;
    const value = values[unit];
    if (unit === 'S') {
      // Milliseconds read as a fraction of a second: keep the leading digits.
      return String(value).padStart(3, '0').slice(0, token.length);
    }
    return String(value).padStart(token.length, '0');
  });
}

/** ISO 8601 duration for `<time datetime>`, e.g. `PT1H2M3.5S`. */
export function toIsoDuration(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds));
  const days = Math.floor(total / DAY);
  const hours = Math.floor((total % DAY) / HOUR);
  const minutes = Math.floor((total % HOUR) / MINUTE);
  const seconds = (total % MINUTE) / SECOND;
  const date = days > 0 ? `${days}D` : '';
  const time =
    `${hours > 0 ? `${hours}H` : ''}` +
    `${minutes > 0 ? `${minutes}M` : ''}` +
    `${seconds > 0 || (!date && hours === 0 && minutes === 0) ? `${seconds}S` : ''}`;
  return `P${date}${time ? `T${time}` : ''}`;
}
