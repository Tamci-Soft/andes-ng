import { Injectable } from '@angular/core';

/**
 * Root-scoped so the "instant reopen" grouping window is shared across every
 * independent `<andes-tooltip>` on the page, not only siblings under one
 * parent - e.g. tabbing across a toolbar of icon buttons, each wrapped in its
 * own `<andes-tooltip>`, should feel like one continuous interaction once the
 * first tooltip has opened rather than re-paying the open delay for each one.
 *
 * Mirrors Base UI's `Tooltip.Provider` `timeout` option, but without
 * requiring every app to wrap itself in a provider component: a single
 * `providedIn: 'root'` service gives every tooltip the same shared clock for
 * free.
 */
@Injectable({ providedIn: 'root' })
export class AndesTooltipGroup {
  private lastClosedAt = -Infinity;

  /** Whether some tooltip in the group closed within the last `withinMs`. */
  wasRecentlyClosed(withinMs: number): boolean {
    return Date.now() - this.lastClosedAt <= withinMs;
  }

  /** Records that a tooltip in the group just closed, starting the window. */
  notifyClosed(): void {
    this.lastClosedAt = Date.now();
  }
}
