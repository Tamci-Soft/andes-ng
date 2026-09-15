import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';
import clsx from 'clsx';

export type AndesCardVariant = 'outlined' | 'borderless';
export type AndesCardSize = 'default' | 'sm';
export type AndesCardTitleLevel = 2 | 3 | 4 | 5 | 6;

/**
 * Root container of a compound Card. Purely presentational - no interactive/behavioral
 * primitive is involved (mirrors shadcn/ui's plain-`<div>` Card and Ant Design's static
 * container), so there is nothing to coordinate via `@andes-ng/primitives`.
 *
 * Compose it with `AndesCardHeader`, `AndesCardContent` and `AndesCardFooter` as direct
 * children, in any combination - none are required. A cover image is not a dedicated
 * sub-component (neither reference library has one): place an `<img>` as the first child,
 * before `<andes-card-header>`, and the card's own `overflow: hidden` + border radius will
 * clip it to match the card's corners.
 */
@Component({
  selector: 'andes-card',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: {
    'data-slot': 'card',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[class]': 'classes()',
  },
})
export class AndesCard {
  readonly variant = input<AndesCardVariant>('outlined');
  readonly size = input<AndesCardSize>('default');
  readonly hoverable = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    clsx(
      'andes-card',
      `andes-card--${this.variant()}`,
      this.size() === 'sm' && 'andes-card--sm',
      this.hoverable() && 'andes-card--hoverable',
    ),
  );
}

/**
 * Groups the title, description and an optional header-corner action. Internally a two-column
 * grid so `AndesCardAction` can sit in the top-right regardless of where it appears in the
 * projected content, without extra markup juggling (mirrors shadcn's `CardHeader`).
 */
@Component({
  selector: 'andes-card-header',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: { class: 'andes-card__header', 'data-slot': 'card-header' },
})
export class AndesCardHeader {}

/**
 * The card's primary heading. Renders a real `h2`-`h6` element (default `h3`) rather than a
 * styled `div`, so cards compose correctly into a page's heading outline - neither shadcn nor
 * Ant Design document this, leaving it to the consumer, which is an easy accessibility gap to
 * inherit by accident.
 */
@Component({
  selector: 'andes-card-title',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: { 'data-slot': 'card-title' },
  template: `
    <!-- A single <ng-content> is reused via NgTemplateOutlet across every heading level below,
         since projected content can only ever be captured by one <ng-content> outlet - putting
         separate copies inside each @switch case would leave every branch but the first empty
         once the level changes at runtime (the same reason button.html outlets one #content
         template into both its @if/@else branches instead of duplicating <ng-content>). -->
    <ng-template #content><ng-content /></ng-template>
    @switch (level()) {
      @case (2) {
        <h2 class="andes-card__title">
          <ng-container *ngTemplateOutlet="content" />
        </h2>
      }
      @case (4) {
        <h4 class="andes-card__title">
          <ng-container *ngTemplateOutlet="content" />
        </h4>
      }
      @case (5) {
        <h5 class="andes-card__title">
          <ng-container *ngTemplateOutlet="content" />
        </h5>
      }
      @case (6) {
        <h6 class="andes-card__title">
          <ng-container *ngTemplateOutlet="content" />
        </h6>
      }
      @default {
        <h3 class="andes-card__title">
          <ng-container *ngTemplateOutlet="content" />
        </h3>
      }
    }
  `,
})
export class AndesCardTitle {
  /**
   * `numberAttribute` guards against the bare-attribute case: `<andes-card-title level="2">`
   * (no square brackets) passes Angular the literal string `"2"`, and without this transform
   * the strict `===` comparisons in the `@switch` above never match, silently falling through
   * to `@default`. `numberAttribute` coerces to a real number and falls back to `3` (the
   * default level) for anything that isn't a valid number (`NaN`, empty, non-numeric garbage).
   *
   * Out-of-range *numeric* input (e.g. `level="9"` or `level="0"`) is then clamped to the
   * nearest valid bound (`2` or `6`) rather than left to fall through to `@default`'s `h3` -
   * a value outside the documented `2`-`6` range is a request for "as high/low as this card
   * goes", not a request for the arbitrary default.
   */
  readonly level = input<AndesCardTitleLevel>(3, {
    transform: (value: unknown) =>
      clampCardTitleLevel(numberAttribute(value, 3)),
  });
}

/** Clamps a coerced `level` value into the valid `AndesCardTitleLevel` range (`2`-`6`). */
function clampCardTitleLevel(level: number): AndesCardTitleLevel {
  if (!Number.isInteger(level)) {
    return 3;
  }
  if (level < 2) {
    return 2;
  }
  if (level > 6) {
    return 6;
  }
  return level as AndesCardTitleLevel;
}

/** Supporting/secondary text beneath the title. */
@Component({
  selector: 'andes-card-description',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: { class: 'andes-card__description', 'data-slot': 'card-description' },
})
export class AndesCardDescription {}

/**
 * Places content (e.g. a button, badge or menu trigger) in the header's top-right corner.
 * Must be used as a child of `AndesCardHeader` - its own styling assumes that grid context.
 */
@Component({
  selector: 'andes-card-action',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: { class: 'andes-card__action', 'data-slot': 'card-action' },
})
export class AndesCardAction {}

/** Main body area for the card's primary content. */
@Component({
  selector: 'andes-card-content',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: { class: 'andes-card__content', 'data-slot': 'card-content' },
})
export class AndesCardContent {}

/** Bottom section, typically for actions or secondary content. */
@Component({
  selector: 'andes-card-footer',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: { class: 'andes-card__footer', 'data-slot': 'card-footer' },
})
export class AndesCardFooter {}
