import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';

/** How a projected image, video or canvas fills the box (the CSS `object-fit` values). */
export type AndesAspectRatioFit =
  'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

const FRACTION = /^(\d*\.?\d+)\s*[/:]\s*(\d*\.?\d+)$/;

/**
 * Turns a ratio into the value of the CSS `aspect-ratio` property.
 *
 * Accepts a positive number (`1.5`), a numeric string (`'1.5'`), or a fraction written with `/`
 * or `:` (`'16/9'`, `'16 / 9'`, `'4:3'`). Anything else - zero, negative, `NaN`, garbage - falls
 * back to a square (`'1'`) so the box never collapses.
 */
export function andesAspectRatioToCss(
  value: number | string | null | undefined,
): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? String(value) : '1';
  }
  if (typeof value !== 'string') {
    return '1';
  }

  const text = value.trim();
  const fraction = FRACTION.exec(text);
  if (fraction) {
    const [width, height] = [Number(fraction[1]), Number(fraction[2])];
    return width > 0 && height > 0 ? `${width} / ${height}` : '1';
  }

  const plain = Number(text);
  return text !== '' && Number.isFinite(plain) && plain > 0
    ? String(plain)
    : '1';
}

/**
 * A box that keeps a fixed width-to-height ratio however wide it gets. By default the projected
 * child fills it (media is cropped or letterboxed with `fit`); set `fill` to false to let the
 * content flow and use the ratio only as the box's preferred shape.
 *
 * The ratio is exposed as `--andes-aspect-ratio` and the media fit as `--andes-aspect-ratio-fit`
 * / `--andes-aspect-ratio-position`, so a stylesheet can override either per breakpoint.
 *
 * Unstyled by design: no colour, border or radius - those belong to the content or a wrapper.
 */
@Component({
  selector: 'andes-aspect-ratio',
  template: '<ng-content />',
  styleUrl: './aspect-ratio.css',
  // The stylesheet targets projected children (`> *`), which emulated encapsulation can't reach.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-aspect-ratio',
    'data-slot': 'aspect-ratio',
    '[attr.data-fill]': 'fill() ? "" : null',
    '[attr.data-fit]': 'fit()',
    '[style.--andes-aspect-ratio]': 'cssRatio()',
    '[style.--andes-aspect-ratio-fit]': 'fit()',
    '[style.--andes-aspect-ratio-position]': 'position()',
  },
})
export class AndesAspectRatio {
  /** A number (`1.5`), a fraction string (`'16/9'`, `'4:3'`). Invalid values fall back to 1. */
  readonly ratio = input<number | string>(1);
  /** `object-fit` applied to a projected `img`, `video`, `canvas` or `picture > img`. */
  readonly fit = input<AndesAspectRatioFit>('cover');
  /** `object-position` for the same media, e.g. `'top'` or `'50% 20%'`. */
  readonly position = input<string>('center');
  /** The projected children stretch to the box; false lets content flow inside it. */
  readonly fill = input(true, { transform: booleanAttribute });

  protected readonly cssRatio = computed(() =>
    andesAspectRatioToCss(this.ratio()),
  );
}
