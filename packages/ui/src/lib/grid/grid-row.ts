import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  untracked,
} from '@angular/core';

import {
  andesBreakpointForWidth,
  AndesBreakpoint,
  AndesBreakpointService,
  AndesResponsive,
} from './breakpoints';
import { andesLength, andesResponsiveVars } from './grid-responsive';

export type AndesRowAlign = 'top' | 'middle' | 'bottom' | 'stretch';
export type AndesRowJustify =
  | 'start'
  | 'end'
  | 'center'
  | 'space-around'
  | 'space-between'
  | 'space-evenly';
/** Where responsive props read their breakpoint from: the viewport or the row's own width. */
export type AndesRowBreakpointSource = 'viewport' | 'container';

/** Pixels for a number, any CSS length for a string. */
export type AndesGutterValue = number | string;
/**
 * The space between columns. A single value is the horizontal gutter; a `[horizontal, vertical]`
 * pair sets both. Each part can be a per-breakpoint map: `{ xs: 8, md: 24 }`.
 */
export type AndesGutter =
  | AndesResponsive<AndesGutterValue>
  | readonly [
      AndesResponsive<AndesGutterValue>,
      AndesResponsive<AndesGutterValue>,
    ];

const ALIGN: Record<AndesRowAlign, string> = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end',
  stretch: 'stretch',
};

const JUSTIFY: Record<AndesRowJustify, string> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  'space-around': 'space-around',
  'space-between': 'space-between',
  'space-evenly': 'space-evenly',
};

/**
 * A 24-column row. Its `andes-col` children size themselves as fractions of the row; the gutter
 * is a flex `gap`, so there are no negative margins and no horizontal scrollbar however large the
 * gutter is.
 *
 * Responsive values (`gutter`, `align`, `justify`, and each column's props) are resolved by CSS
 * media queries, so the server-rendered layout is already right and nothing flashes on load.
 * Set `breakpointSource="container"` for rows inside resizable panels: the breakpoints then
 * follow the row's own width, measured with a `ResizeObserver`.
 */
@Component({
  selector: 'andes-row',
  template: '<ng-content />',
  styleUrl: './grid-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'row',
    '[attr.data-nowrap]': 'wrap() ? null : ""',
    '[attr.data-breakpoint-source]': 'breakpointSource()',
    '[attr.data-breakpoint]': 'breakpoint()',
    '[style]': 'styles()',
  },
})
export class AndesRow {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly viewport = inject(AndesBreakpointService).current;

  readonly gutter = input<AndesGutter | undefined>(undefined);
  readonly align = input<AndesResponsive<AndesRowAlign> | undefined>(undefined);
  readonly justify = input<AndesResponsive<AndesRowJustify> | undefined>(
    undefined,
  );
  /** Columns that do not fit move to the next line; off keeps a single line. */
  readonly wrap = input(true, { transform: booleanAttribute });
  readonly breakpointSource = input<AndesRowBreakpointSource>('viewport');

  /** Emits the active breakpoint whenever it changes (viewport or container, per the source). */
  readonly breakpointChange = output<AndesBreakpoint>();

  private readonly measured = signal<AndesBreakpoint>('xs');

  /** The breakpoint the row currently lays out for. */
  readonly breakpoint = computed(() =>
    this.breakpointSource() === 'container' ? this.measured() : this.viewport(),
  );

  /**
   * Set only in container mode: columns then resolve their responsive props in TypeScript
   * against this value, because a media query cannot see the row's width.
   */
  readonly containerBreakpoint = computed(() =>
    this.breakpointSource() === 'container' ? this.measured() : null,
  );

  protected readonly styles = computed(() => {
    const active = this.containerBreakpoint();
    const out: Record<string, string> = {};
    const gutter = this.gutter();
    const [horizontal, vertical] = Array.isArray(gutter)
      ? (gutter as readonly [
          AndesResponsive<AndesGutterValue>,
          AndesResponsive<AndesGutterValue>,
        ])
      : [gutter as AndesResponsive<AndesGutterValue> | undefined, undefined];

    andesResponsiveVars(out, 'andes-row-gx', horizontal, andesLength, active);
    andesResponsiveVars(out, 'andes-row-gy', vertical, andesLength, active);
    andesResponsiveVars(
      out,
      'andes-row-align',
      this.align(),
      (value) => ALIGN[value] ?? null,
      active,
    );
    andesResponsiveVars(
      out,
      'andes-row-justify',
      this.justify(),
      (value) => JUSTIFY[value] ?? null,
      active,
    );
    return out;
  });

  constructor() {
    effect((onCleanup) => {
      if (
        this.breakpointSource() !== 'container' ||
        !this.isBrowser ||
        typeof ResizeObserver === 'undefined'
      ) {
        return;
      }
      const observer = new ResizeObserver((entries) => {
        const width = entries[entries.length - 1]?.contentRect.width;
        if (width !== undefined) {
          this.measured.set(andesBreakpointForWidth(width));
        }
      });
      observer.observe(this.host.nativeElement);
      onCleanup(() => observer.disconnect());
    });

    let previous: AndesBreakpoint | undefined;
    effect(() => {
      const current = this.breakpoint();
      if (previous !== undefined && previous !== current) {
        untracked(() => this.breakpointChange.emit(current));
      }
      previous = current;
    });
  }
}
