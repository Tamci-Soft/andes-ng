import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  input,
} from '@angular/core';

export type AndesFlexGapSize = 'sm' | 'md' | 'lg';
export type AndesFlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type AndesFlexJustify =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'
  | 'start'
  | 'end'
  | 'left'
  | 'right'
  | 'stretch'
  | 'normal';
export type AndesFlexAlign =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'stretch'
  | 'baseline'
  | 'start'
  | 'end'
  | 'normal';

/** Named gaps resolve to spacing tokens, with the literal as the fallback when a token is absent. */
const GAP_PRESETS: Record<AndesFlexGapSize, string> = {
  sm: 'var(--andes-space-2, 0.5rem)',
  md: 'var(--andes-space-4, 1rem)',
  lg: 'var(--andes-space-6, 1.5rem)',
};

const PLAIN_NUMBER = /^\d+(\.\d+)?$/;

/**
 * Turns the `gap` input into a CSS length: `'sm' | 'md' | 'lg'` become spacing tokens, a number
 * (or a numeric string such as the attribute `gap="12"`) is pixels, and any other string is passed
 * through untouched - `'1.5rem'`, `'var(--andes-space-3)'`, or a row/column pair `'8px 16px'`.
 */
export function andesFlexGap(
  value: AndesFlexGapSize | number | string | null | undefined,
): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? `${value}px` : null;
  }
  if (value in GAP_PRESETS) {
    return GAP_PRESETS[value as AndesFlexGapSize];
  }
  return PLAIN_NUMBER.test(value.trim()) ? `${value.trim()}px` : value;
}

function toWrap(
  value: AndesFlexWrap | boolean | '' | null | undefined,
): AndesFlexWrap | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (value === '' || value === true) {
    return 'wrap';
  }
  return value === false ? 'nowrap' : value;
}

function toBoolean(value: unknown): boolean {
  return value !== undefined && value !== null && `${value}` !== 'false';
}

/**
 * Flexbox layout on any element. Apply it as an attribute to render the container as the element
 * you need - `<section andesFlex vertical gap="md">`, `<ul andesFlex>` - or use `<andes-flex>`
 * when the tag does not matter. Only the inputs you set are written to the element, so the rest
 * stays overridable from a stylesheet, and each value is an inline style (no stylesheet to load).
 */
@Directive({
  selector: '[andesFlex]',
  host: {
    'data-slot': 'flex',
    '[attr.data-orientation]': 'vertical() ? "vertical" : "horizontal"',
    '[style.display]': 'inline() ? "inline-flex" : "flex"',
    '[style.flex-direction]': 'direction()',
    '[style.flex-wrap]': 'wrap()',
    '[style.justify-content]': 'justify() || null',
    '[style.align-items]': 'align() || null',
    '[style.gap]': 'gapValue()',
    '[style.flex]': 'flexValue()',
  },
})
export class AndesFlexLayout {
  /** Stacks children in a column instead of a row. */
  readonly vertical = input(false, { transform: toBoolean });
  /** Reverses the main axis (`row-reverse` / `column-reverse`). */
  readonly reverse = input(false, { transform: toBoolean });
  /** `true` is `wrap`, `false` is `nowrap`; a bare `wrap` attribute means `wrap`. */
  readonly wrap = input<
    AndesFlexWrap | null,
    AndesFlexWrap | boolean | '' | null | undefined
  >(null, { transform: toWrap });
  /** Distribution along the main axis (`justify-content`). */
  readonly justify = input<AndesFlexJustify | undefined>(undefined);
  /** Alignment on the cross axis (`align-items`). */
  readonly align = input<AndesFlexAlign | undefined>(undefined);
  /** `sm | md | lg` (spacing tokens), a number of pixels, or any CSS length. */
  readonly gap = input<AndesFlexGapSize | number | string | undefined>(
    undefined,
  );
  /** The container's own `flex` shorthand, for when it sits inside another flex container. */
  readonly flex = input<string | number | undefined>(undefined);
  /** Renders `inline-flex` so the container sizes to its content. */
  readonly inline = input(false, { transform: toBoolean });

  protected readonly direction = computed(
    () =>
      (this.vertical() ? 'column' : 'row') + (this.reverse() ? '-reverse' : ''),
  );
  protected readonly gapValue = computed(() => andesFlexGap(this.gap()));
  protected readonly flexValue = computed(() => {
    const flex = this.flex();
    return flex === undefined || flex === '' ? null : String(flex);
  });
}

/**
 * `<andes-flex>`: the flex container as a component. Same inputs as the `andesFlex` attribute
 * (which it applies to itself), for the common case where the element name does not matter.
 */
@Component({
  selector: 'andes-flex',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: AndesFlexLayout,
      inputs: [
        'vertical',
        'reverse',
        'wrap',
        'justify',
        'align',
        'gap',
        'flex',
        'inline',
      ],
    },
  ],
})
export class AndesFlex {}
