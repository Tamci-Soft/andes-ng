import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { ANDES_BREAKPOINT_NAMES, AndesBreakpoint } from './breakpoints';
import { andesResolveResponsive, andesResponsiveVars } from './grid-responsive';
import { AndesRow } from './grid-row';

/** What a column can set, as a whole or at one breakpoint. */
export interface AndesColSize {
  /** Columns out of 24. `0` hides the column at that breakpoint. */
  span?: number;
  /** Empty columns before this one. */
  offset?: number;
  order?: number;
  /** Shifts the column toward the end by this many columns without moving its siblings. */
  push?: number;
  /** Shifts the column toward the start by this many columns. */
  pull?: number;
  flex?: AndesColFlex;
}
export type AndesColFlex = number | string;
export type AndesColBreakpointSize = number | AndesColSize;

const PROPS = ['span', 'offset', 'order', 'push', 'pull', 'flex'] as const;

function toCount(
  value: number | string | null | undefined,
): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const count = Number(value);
  return Number.isFinite(count) ? count : undefined;
}

const LENGTH = /^\d+(\.\d+)?(px|em|rem|%|vw|vh|ch)$/;

/**
 * The CSS `flex` value for the `flex` input: a number grows proportionally (`flex: 1 1 auto`
 * semantics with an `auto` basis), a bare length is a fixed basis (`0 0 200px`), and anything
 * else (`'1 1 200px'`, `'none'`, `'auto'`) is used as written.
 */
export function andesColFlex(value: AndesColFlex): string | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? `${value} ${value} auto` : null;
  }
  const text = value.trim();
  if (text === '') {
    return null;
  }
  return LENGTH.test(text) ? `0 0 ${text}` : text;
}

function normalize(
  value: AndesColBreakpointSize | null | undefined,
): AndesColSize {
  if (value === null || value === undefined) {
    return {};
  }
  return typeof value === 'number' ? { span: value } : value;
}

/**
 * A column of an `andes-row`: `span` of 24 columns wide, with `offset`, `order`, `push`/`pull` and
 * a `flex` override. Every one of them can be set per breakpoint with `xs | sm | md | lg | xl |
 * xxl`, either as a plain span (`[md]="8"`) or as an object (`[md]="{ span: 8, offset: 2 }"`).
 * Breakpoints are cumulative: `[md]` keeps applying on `lg` and up unless those override it.
 *
 * A column with no span is as wide as its content. `flex` wins over `span`.
 */
@Component({
  selector: 'andes-col',
  template: '<ng-content />',
  styleUrl: './grid-col.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'col',
    '[style]': 'styles()',
  },
})
export class AndesCol {
  private readonly row = inject(AndesRow, { optional: true });

  readonly span = input<number | undefined, number | string | null | undefined>(
    undefined,
    { transform: toCount },
  );
  readonly offset = input<
    number | undefined,
    number | string | null | undefined
  >(undefined, { transform: toCount });
  readonly order = input<
    number | undefined,
    number | string | null | undefined
  >(undefined, { transform: toCount });
  readonly push = input<number | undefined, number | string | null | undefined>(
    undefined,
    { transform: toCount },
  );
  readonly pull = input<number | undefined, number | string | null | undefined>(
    undefined,
    { transform: toCount },
  );
  /** A number grows proportionally, a length is a fixed basis, other strings are used as is. */
  readonly flex = input<AndesColFlex | undefined>(undefined);

  readonly xs = input<AndesColBreakpointSize | undefined>(undefined);
  readonly sm = input<AndesColBreakpointSize | undefined>(undefined);
  readonly md = input<AndesColBreakpointSize | undefined>(undefined);
  readonly lg = input<AndesColBreakpointSize | undefined>(undefined);
  readonly xl = input<AndesColBreakpointSize | undefined>(undefined);
  readonly xxl = input<AndesColBreakpointSize | undefined>(undefined);

  private readonly base = computed<AndesColSize>(() => ({
    span: this.span(),
    offset: this.offset(),
    order: this.order(),
    push: this.push(),
    pull: this.pull(),
    flex: this.flex(),
  }));

  private readonly perBreakpoint = computed(
    (): Record<AndesBreakpoint, AndesColSize> => ({
      xs: normalize(this.xs()),
      sm: normalize(this.sm()),
      md: normalize(this.md()),
      lg: normalize(this.lg()),
      xl: normalize(this.xl()),
      xxl: normalize(this.xxl()),
    }),
  );

  protected readonly styles = computed(() => {
    const active = this.row?.containerBreakpoint() ?? null;
    const base = this.base();
    const per = this.perBreakpoint();
    const out: Record<string, string> = {};

    for (const prop of PROPS) {
      // One responsive map per prop: the base value is the fallback under every breakpoint.
      const map: Partial<Record<AndesBreakpoint, number | AndesColFlex>> = {};
      for (const name of ANDES_BREAKPOINT_NAMES) {
        const entry = per[name][prop];
        if (entry !== undefined) {
          map[name] = entry;
        }
      }
      const convert = (value: number | AndesColFlex): string | null =>
        prop === 'flex'
          ? andesColFlex(value)
          : Number.isFinite(value as number)
            ? String(value)
            : null;

      if (active === null) {
        andesResponsiveVars(
          out,
          `andes-col-${prop}`,
          base[prop],
          convert,
          null,
        );
        andesResponsiveVars(out, `andes-col-${prop}`, map, convert, null);
      } else {
        const resolved = andesResolveResponsive(map, active) ?? base[prop];
        andesResponsiveVars(out, `andes-col-${prop}`, resolved, convert, null);
      }
    }

    // `span: 0` hides the column; expressed as its own variable so it can change per breakpoint.
    this.hidingVars(out, base, per, active);
    return out;
  });

  private hidingVars(
    out: Record<string, string>,
    base: AndesColSize,
    per: Record<AndesBreakpoint, AndesColSize>,
    active: AndesBreakpoint | null,
  ): void {
    const spans: Partial<Record<AndesBreakpoint, number>> = {};
    for (const name of ANDES_BREAKPOINT_NAMES) {
      const span = per[name].span;
      if (span !== undefined) {
        spans[name] = span;
      }
    }
    const display = (span: number | undefined): string | null =>
      span === 0 ? 'none' : span === undefined ? null : 'block';

    if (active === null) {
      andesResponsiveVars(out, 'andes-col-display', base.span, display, null);
      andesResponsiveVars(out, 'andes-col-display', spans, display, null);
    } else {
      const resolved = andesResolveResponsive(spans, active) ?? base.span;
      andesResponsiveVars(out, 'andes-col-display', resolved, display, null);
    }
  }
}
