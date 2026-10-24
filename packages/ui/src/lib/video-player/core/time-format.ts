/** The hour/minute/second words the spoken time formatter needs (see `AndesPlayerLabels`). */
export interface AndesSpokenTimeUnits {
  hours(count: number): string;
  minutes(count: number): string;
  seconds(count: number): string;
}

/** A time in both of its forms: `clock` for display, `spoken` for assistive tech. */
export interface AndesTimeText {
  readonly clock: string;
  readonly spoken: string;
}

function splitTime(totalSeconds: number): [number, number, number] {
  const whole = Math.floor(Math.abs(totalSeconds));
  return [
    Math.floor(whole / 3600),
    Math.floor((whole % 3600) / 60),
    whole % 60,
  ];
}

/**
 * Display form of a time: `0:05`, `3:20`, `1:02:03`. Pass `withHours` to keep the hour field
 * when the value itself is under an hour (so `0:59:58` and `1:00:02` line up in one column).
 * Negative values get a leading minus (`-0:32`, time behind live); non-finite values read `0:00`.
 */
export function formatClock(seconds: number, withHours = false): string {
  if (!Number.isFinite(seconds)) {
    return withHours ? '0:00:00' : '0:00';
  }
  const [h, m, s] = splitTime(seconds);
  const sign = seconds < 0 && (h > 0 || m > 0 || s > 0) ? '-' : '';
  const ss = String(s).padStart(2, '0');
  if (h > 0 || withHours) {
    return `${sign}${h}:${String(m).padStart(2, '0')}:${ss}`;
  }
  return `${sign}${m}:${ss}`;
}

/**
 * Spoken form of a time for `aria-valuetext` and announcements: `1 hour 2 minutes 3 seconds`.
 * Zero fields are left out, except a plain zero which reads as `0 seconds`.
 */
export function formatSpokenTime(
  seconds: number,
  units: AndesSpokenTimeUnits,
): string {
  const [h, m, s] = splitTime(Number.isFinite(seconds) ? seconds : 0);
  const parts: string[] = [];
  if (h > 0) {
    parts.push(units.hours(h));
  }
  if (m > 0) {
    parts.push(units.minutes(m));
  }
  if (s > 0 || parts.length === 0) {
    parts.push(units.seconds(s));
  }
  return parts.join(' ');
}

/** Both forms at once. */
export function formatTimeText(
  seconds: number,
  units: AndesSpokenTimeUnits,
  withHours = false,
): AndesTimeText {
  return {
    clock: formatClock(seconds, withHours),
    spoken: formatSpokenTime(seconds, units),
  };
}

/** Rounds a rate for display: `1`, `1.25`, `0.5`. */
export function formatRate(rate: number): string {
  return String(Math.round(rate * 100) / 100);
}
