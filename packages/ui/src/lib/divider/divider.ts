import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type AndesDividerOrientation = 'horizontal' | 'vertical';
export type AndesDividerVariant = 'solid' | 'dashed' | 'dotted';
/** Where the projected text sits along a horizontal divider. */
export type AndesDividerAlign = 'start' | 'center' | 'end';
export type AndesDividerSize = 'sm' | 'md' | 'lg';

/**
 * Margin around the line, perpendicular to it (above and below a horizontal divider, beside a
 * vertical one). A preset, or a custom number of pixels / CSS length.
 */
export type AndesDividerSpacing = AndesDividerSize | number | string;

function toCssLength(value: number | string | undefined): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? `${value}px` : null;
  }
  // A numeric attribute (`orientationMargin="40"`) is read as pixels.
  return /^-?\d+(\.\d+)?$/.test(value.trim()) ? `${value.trim()}px` : value;
}

/**
 * A thin line that separates content, horizontally between blocks or vertically between inline
 * items, optionally carrying a short text (horizontal only). `andes-separator` is the same
 * component under its other common name.
 *
 * The separator semantics live on the inner line element (`role="separator"` plus
 * `aria-orientation`): a separator's children are presentational, so putting the role on the
 * host would hide the text it carries. `decorative` swaps the role for `none` when the line
 * only adds visual rhythm.
 *
 * Styling hooks (set on the element): `--andes-divider-color`, `--andes-divider-margin`,
 * `--andes-divider-thickness`, `--andes-divider-text-gap`.
 */
@Component({
  selector: 'andes-divider, andes-separator',
  templateUrl: './divider.html',
  styleUrl: './divider.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-slot]': '"divider"',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-variant]': 'lineVariant()',
    '[attr.data-align]': 'orientation() === "horizontal" ? align() : null',
    '[attr.data-plain]': 'plain() ? "" : null',
    '[attr.data-size]': 'presetSize()',
    '[style.--andes-divider-margin]': 'customSpacing()',
    '[style.--andes-divider-offset]': 'offset()',
    // The role and ARIA live on the inner line; the host stays a neutral layout box.
    '[attr.role]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-orientation]': 'null',
  },
})
export class AndesDivider {
  readonly orientation = input<AndesDividerOrientation>('horizontal');
  /** Line style. The `dashed` / `dotted` shorthands below win over a `solid` variant. */
  readonly variant = input<AndesDividerVariant>('solid');
  readonly dashed = input(false, { transform: booleanAttribute });
  readonly dotted = input(false, { transform: booleanAttribute });
  /** Text placement along a horizontal divider: `start`, `center` (default) or `end`. */
  readonly align = input<AndesDividerAlign>('center');
  /**
   * Distance between the line's short end and the text when `align` is `start` or `end`.
   * Numbers are pixels; a string is any CSS length (`'10%'`, `'2rem'`). Default 5%.
   */
  readonly orientationMargin = input<number | string | undefined>(undefined);
  /** Plain text: regular weight and muted colour instead of the medium-weight title look. */
  readonly plain = input(false, { transform: booleanAttribute });
  /** Spacing around the line: `sm`, `md` (default), `lg`, or a pixel number / CSS length. */
  readonly size = input<AndesDividerSpacing>('md');
  /**
   * Purely visual: the line is hidden from assistive technology (`role="none"`) instead of
   * announced as a separator.
   */
  readonly decorative = input(false, { transform: booleanAttribute });
  /** Accessible name of the separator; leave unset when the surrounding text already says it. */
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  protected readonly lineVariant = computed<AndesDividerVariant>(() => {
    if (this.dotted()) {
      return 'dotted';
    }
    if (this.dashed()) {
      return 'dashed';
    }
    return this.variant();
  });

  protected readonly presetSize = computed(() => {
    const size = this.size();
    return size === 'sm' || size === 'md' || size === 'lg' ? size : null;
  });

  protected readonly customSpacing = computed(() =>
    this.presetSize() ? null : toCssLength(this.size() as number | string),
  );

  protected readonly offset = computed(() =>
    toCssLength(this.orientationMargin()),
  );

  protected readonly role = computed(() =>
    this.decorative() ? 'none' : 'separator',
  );
}

export { AndesDivider as AndesSeparator };
