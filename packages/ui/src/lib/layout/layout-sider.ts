import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  PLATFORM_ID,
  signal,
  TemplateRef,
  untracked,
} from '@angular/core';

import {
  AndesLayoutBreakpoint,
  AndesLayoutPosition,
  belowBreakpointQuery,
  toCssLength,
} from './layout-sizes';

export type AndesLayoutSiderTheme = 'light' | 'dark';
export type AndesLayoutSiderSide = 'start' | 'end';

let nextSiderId = 0;

/**
 * A side column of an `andes-layout`, collapsible to a narrow rail (`collapsedWidth`) or to
 * nothing (`collapsedWidth="0"`, which adds a tab at the edge to bring it back).
 *
 * - `collapsed` is a two-way model; `collapsible` shows the built-in toggle at the bottom, and a
 *   custom one can be passed as `trigger` (a template; `null` hides the built-in one).
 * - `breakpoint` collapses it automatically below that width and reports it through
 *   `breakpointChange`. A manual toggle still works afterwards.
 * - `side="end"` moves its border and edge tab to the other edge; `reverseArrow` flips the
 *   toggle's arrow to match.
 * - `position`: `sticky` keeps it in view while the page scrolls, `fixed` pins it to the viewport
 *   while a placeholder keeps its width in the flow.
 *
 * What the sider shows while collapsed is up to its content: the host carries `data-collapsed`.
 * The width animates for 200ms and is instant under `prefers-reduced-motion`.
 */
@Component({
  selector: 'andes-layout-sider',
  imports: [NgTemplateOutlet],
  templateUrl: './layout-sider.html',
  styleUrl: './layout-sider.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'layout-sider',
    '[attr.data-collapsed]': 'collapsed() ? "" : null',
    '[attr.data-broken]': 'broken() ? "" : null',
    '[attr.data-zero]': 'collapsed() && zeroCollapsed() ? "" : null',
    '[attr.data-side]': 'side()',
    '[attr.data-theme]': 'theme()',
    '[attr.data-position]': 'position()',
    '[style.--andes-layout-sider-current-width]': 'currentWidth()',
  },
})
export class AndesLayoutSider {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly collapsed = model(false);
  /** Shows the built-in toggle at the bottom of the sider. */
  readonly collapsible = input(false, { transform: booleanAttribute });
  /** Pixels for a number, any CSS length for a string. */
  readonly width = input<number | string>(240);
  readonly collapsedWidth = input<number | string>(64);
  /** Collapses automatically while the viewport is narrower than this breakpoint. */
  readonly breakpoint = input<AndesLayoutBreakpoint | undefined>(undefined);
  readonly reverseArrow = input(false, { transform: booleanAttribute });
  readonly theme = input<AndesLayoutSiderTheme>('light');
  /** Which edge of the layout the sider sits on: decides its border and where the edge tab goes. */
  readonly side = input<AndesLayoutSiderSide>('start');
  readonly position = input<AndesLayoutPosition>('static');
  /** Replaces the built-in toggle's arrow; `null` removes the built-in toggle entirely. */
  readonly trigger = input<TemplateRef<unknown> | null | undefined>(undefined);
  /** Accessible name of the sider's region. */
  readonly label = input('Sidebar');
  /** Accessible name of the toggle while the sider is expanded and collapsed. */
  readonly collapseLabel = input('Collapse sidebar');
  readonly expandLabel = input('Expand sidebar');

  /** Emits `true` when the viewport drops below `breakpoint`, `false` when it climbs back. */
  readonly breakpointChange = output<boolean>();

  /** True while the viewport is below `breakpoint`. */
  readonly broken = signal(false);

  readonly id = `andes-layout-sider-${nextSiderId++}`;

  protected readonly currentWidth = computed(() =>
    toCssLength(this.collapsed() ? this.collapsedWidth() : this.width()),
  );

  protected readonly zeroCollapsed = computed(() => {
    const width = this.collapsedWidth();
    return width === 0 || width === '0' || width === '0px';
  });

  protected readonly showTrigger = computed(
    () =>
      this.collapsible() &&
      this.trigger() !== null &&
      !(this.zeroCollapsed() && this.collapsed()),
  );

  /** With a collapsed width of 0 the bottom toggle is out of sight once collapsed, so a tab at the edge replaces it. */
  protected readonly showZeroTrigger = computed(
    () =>
      this.collapsible() &&
      this.zeroCollapsed() &&
      (this.collapsed() || this.broken()),
  );

  protected readonly pointing = computed(() => {
    // Expanded, the arrow points toward the side the sider collapses to (its own edge).
    const towardEdge = !this.collapsed();
    return towardEdge !== this.reverseArrow() ? 'start' : 'end';
  });

  protected readonly toggleLabel = computed(() =>
    this.collapsed() ? this.expandLabel() : this.collapseLabel(),
  );

  constructor() {
    effect((onCleanup) => {
      const breakpoint = this.breakpoint();
      if (
        !breakpoint ||
        !this.isBrowser ||
        typeof window.matchMedia !== 'function'
      ) {
        return;
      }
      const list = window.matchMedia(belowBreakpointQuery(breakpoint));
      const apply = (matches: boolean) =>
        untracked(() => {
          const changed = this.broken() !== matches;
          this.broken.set(matches);
          this.collapsed.set(matches);
          if (changed) {
            this.breakpointChange.emit(matches);
          }
        });
      apply(list.matches);
      const listener = (event: MediaQueryListEvent) => apply(event.matches);
      list.addEventListener('change', listener);
      onCleanup(() => list.removeEventListener('change', listener));
    });
  }

  toggle(): void {
    this.collapsed.update((value) => !value);
  }
}
