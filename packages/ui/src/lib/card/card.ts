import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  numberAttribute,
  TemplateRef,
} from '@angular/core';
import clsx from 'clsx';

export type AndesCardVariant = 'outlined' | 'borderless';
export type AndesCardSize = 'default' | 'sm';
export type AndesCardTitleLevel = 2 | 3 | 4 | 5 | 6;
/** `'inner'` is the nested-card style: a tinted, divided header for cards inside cards. */
export type AndesCardType = 'default' | 'inner';

/** One entry of `AndesCard`'s header tab strip. */
export interface AndesCardTab {
  /** Identifies the tab in `activeTabKey`; must be unique within the list. */
  readonly key: string;
  readonly label: string;
  readonly disabled?: boolean;
}

let nextCardId = 0;

/**
 * DI handle `AndesCardContent` provides itself under, declared here - ahead of `AndesCard` -
 * because the card's `contentChild` query token is evaluated when the card class is defined.
 * Naming `AndesCardContent` directly works under AOT but throws "Cannot access before
 * initialization" under JIT (Storybook's dev server), where the query metadata is read in a
 * static initializer before the later class exists.
 */
export abstract class AndesCardPanel {
  abstract readonly domId: string;
}

/**
 * Root container of a compound Card. Purely presentational - no interactive/behavioral
 * primitive is involved (mirrors shadcn/ui's plain-`<div>` Card), so there is nothing to
 * coordinate via `@andes-ng/primitives`.
 *
 * Compose it with `AndesCardHeader`, `AndesCardContent`, `AndesCardActions` and
 * `AndesCardFooter` as direct children, in any combination - none are required. A cover image
 * is not a dedicated sub-component (it has no behavior of its own): place an `<img>` as
 * the first child, before `<andes-card-header>`, and the card's own `overflow: hidden` + border
 * radius will clip it to match the card's corners.
 *
 * The card-level state that sub-parts react to (`type`, `loading`, the header tab strip) lives
 * here and is read by the parts through DI rather than re-declared on each part, so a consumer
 * sets it once, on the card itself.
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
    '[attr.data-type]': 'type()',
    '[class]': 'classes()',
  },
})
export class AndesCard {
  readonly variant = input<AndesCardVariant>('outlined');
  readonly size = input<AndesCardSize>('default');
  readonly hoverable = input(false, { transform: booleanAttribute });
  readonly type = input<AndesCardType>('default');
  /**
   * Swaps `AndesCardContent`'s projected body for a skeleton placeholder while data loads. The
   * header, cover and actions stay visible - only the body is unknown yet.
   */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Tabs rendered at the bottom of `AndesCardHeader`. Empty (the default) renders no strip. */
  readonly tabList = input<readonly AndesCardTab[]>([]);
  /**
   * Two-way active tab key. Left unbound, the card manages it itself starting from the first
   * enabled tab, so a static `activeTabKey="..."` doubles as an initial default; and
   * `(activeTabKeyChange)` fires only on user selection, so it works as a tab-change handler.
   */
  readonly activeTabKey = model<string | undefined>(undefined);
  /** Content rendered at the trailing end of the tab strip. */
  readonly tabBarExtraContent = input<TemplateRef<unknown> | undefined>(
    undefined,
  );

  /** Prefix for the tab ids the header renders and the content panel references. */
  readonly idPrefix = `andes-card-${nextCardId++}`;

  /**
   * The body part the tabs control - only a direct child, so a nested card's content (which is
   * in this card's content DOM too) is never mistaken for this card's tab panel.
   */
  private readonly panel = contentChild(AndesCardPanel, {
    descendants: false,
  });

  readonly hasTabs = computed(() => this.tabList().length > 0);

  /** The key actually shown as selected: the bound key when it names a real, enabled tab. */
  readonly resolvedActiveTabKey = computed(() => {
    const tabs = this.tabList();
    const requested = this.activeTabKey();
    const match = tabs.find((tab) => tab.key === requested && !tab.disabled);
    return (match ?? tabs.find((tab) => !tab.disabled))?.key;
  });

  readonly activeTabId = computed(() => {
    const index = this.tabList().findIndex(
      (tab) => tab.key === this.resolvedActiveTabKey(),
    );
    return index === -1 ? null : this.tabId(index);
  });

  /** `null` when the card has no body part, so tabs never point `aria-controls` at nothing. */
  readonly panelId = computed(() => this.panel()?.domId ?? null);

  protected readonly classes = computed(() =>
    clsx(
      'andes-card',
      `andes-card--${this.variant()}`,
      this.size() === 'sm' && 'andes-card--sm',
      this.hoverable() && 'andes-card--hoverable',
      this.type() === 'inner' && 'andes-card--inner',
    ),
  );

  tabId(index: number): string {
    return `${this.idPrefix}-tab-${index}`;
  }

  selectTab(key: string): void {
    const tab = this.tabList().find((candidate) => candidate.key === key);
    if (!tab || tab.disabled || key === this.resolvedActiveTabKey()) {
      return;
    }
    this.activeTabKey.set(key);
  }
}

/**
 * Supporting/secondary text beneath the title. Declared ahead of `AndesCardHeader`, whose
 * `contentChild` query names it (see `AndesCardPanel` for why the order matters under JIT).
 */
@Component({
  selector: 'andes-card-description',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: { class: 'andes-card__description', 'data-slot': 'card-description' },
})
export class AndesCardDescription {}

/**
 * Groups the title, description and an optional header-corner action. Internally a two-column
 * grid so `AndesCardAction` can sit in the top-right regardless of where it appears in the
 * projected content, without extra markup juggling (mirrors shadcn's `CardHeader`).
 *
 * When the parent card has a `tabList`, the tab strip renders here, spanning both columns beneath
 * the title, inside the card head. AndesTabs isn't available to this package yet, so this is a
 * minimal internal strip implementing the WAI-ARIA tabs pattern (roving tabindex, arrow/Home/End
 * keys, automatic activation).
 */
@Component({
  selector: 'andes-card-header',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: {
    class: 'andes-card__header',
    'data-slot': 'card-header',
    '[class.andes-card__header--inner]': "card?.type() === 'inner'",
    '[class.andes-card__header--described]': '!!description()',
  },
  template: `
    <ng-content />
    @if (card?.hasTabs()) {
      <div class="andes-card__tabs">
        <div
          class="andes-card__tablist"
          role="tablist"
          aria-orientation="horizontal"
        >
          @for (tab of card!.tabList(); track tab.key; let index = $index) {
            @let selected = tab.key === card!.resolvedActiveTabKey();
            <button
              type="button"
              role="tab"
              class="andes-card__tab"
              [id]="card!.tabId(index)"
              [attr.aria-selected]="selected"
              [attr.aria-controls]="card!.panelId()"
              [attr.tabindex]="selected ? 0 : -1"
              [disabled]="!!tab.disabled"
              (click)="card!.selectTab(tab.key)"
              (keydown)="onTabKeydown($event)"
            >
              {{ tab.label }}
            </button>
          }
        </div>
        @if (card!.tabBarExtraContent(); as extra) {
          <div class="andes-card__tabs-extra">
            <ng-container *ngTemplateOutlet="extra" />
          </div>
        }
      </div>
    }
  `,
})
export class AndesCardHeader {
  protected readonly card = inject(AndesCard, { optional: true });
  /**
   * With a description the header gets two explicit rows, so `AndesCardAction`'s
   * `grid-row: 1 / -1` really spans title + description instead of only the title row (which
   * pushed the description down by however much taller the action was than the title).
   */
  protected readonly description = contentChild(AndesCardDescription, {
    descendants: false,
  });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onTabKeydown(event: KeyboardEvent): void {
    const card = this.card;
    if (!card) {
      return;
    }
    const tabs = card.tabList();
    const enabled = tabs
      .map((tab, index) => ({ tab, index }))
      .filter(({ tab }) => !tab.disabled);
    if (enabled.length === 0) {
      return;
    }
    const current = enabled.findIndex(
      ({ tab }) => tab.key === card.resolvedActiveTabKey(),
    );

    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = (current + 1) % enabled.length;
        break;
      case 'ArrowLeft':
        next = (current - 1 + enabled.length) % enabled.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = enabled.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const target = enabled[next];
    card.selectTab(target.tab.key);
    this.host.nativeElement
      .querySelector<HTMLElement>(`#${card.tabId(target.index)}`)
      ?.focus();
  }
}

/**
 * The card's primary heading. Renders a real `h2`-`h6` element (default `h3`) rather than a
 * styled `div`, so cards compose correctly into a page's heading outline - shadcn leaves this
 * to the consumer, which is an easy accessibility gap to inherit by accident.
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

/**
 * Places content (e.g. a button, badge or menu trigger) in the header's top-right corner. Must
 * be used as a child of `AndesCardHeader` - its own styling assumes that grid context.
 */
@Component({
  selector: 'andes-card-action',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: { class: 'andes-card__action', 'data-slot': 'card-action' },
})
export class AndesCardAction {}

/**
 * An avatar beside a title + description block, typically placed in `AndesCardContent` under a
 * cover image. Title and description reuse `AndesCardTitle` / `AndesCardDescription` (so the title
 * keeps its real heading element) and the avatar is any element marked `slot="avatar"` - the same
 * `slot` attribute convention AndesButton uses for its icons. There is no Avatar component in this
 * package yet, so any image/icon/initials works.
 */
@Component({
  selector: 'andes-card-meta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: { class: 'andes-card__meta', 'data-slot': 'card-meta' },
  template: `
    <div class="andes-card__meta-avatar">
      <ng-content select="[slot=avatar]" />
    </div>
    <div class="andes-card__meta-detail"><ng-content /></div>
  `,
})
export class AndesCardMeta {}

/**
 * One cell of a divided grid laid out edge to edge inside `AndesCardContent`. Cells default to
 * three per row; set `--andes-card-grid-columns` on the card or content (or a `width` on an
 * individual cell) to change that.
 */
@Component({
  selector: 'andes-card-grid',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: {
    class: 'andes-card__grid',
    'data-slot': 'card-grid',
    '[class.andes-card__grid--hoverable]': 'hoverable()',
  },
})
export class AndesCardGrid {
  /** Defaults to `true` - grid cells lift on hover unless opted out. */
  readonly hoverable = input(true, { transform: booleanAttribute });
}

/**
 * Main body area for the card's primary content. It also plays three card-driven roles: it is
 * the region the parent card's `loading` skeleton replaces, the tab panel its header tabs
 * control, and the edge-to-edge container for `AndesCardGrid` cells.
 */
@Component({
  selector: 'andes-card-content',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  providers: [
    {
      provide: AndesCardPanel,
      useExisting: forwardRef(() => AndesCardContent),
    },
  ],
  host: {
    class: 'andes-card__content',
    'data-slot': 'card-content',
    '[class.andes-card__content--grid]': 'isGrid()',
    '[attr.aria-busy]': 'loading() || null',
    '[attr.id]': 'isTabPanel() ? domId : ownId',
    '[attr.role]': "isTabPanel() ? 'tabpanel' : null",
    '[attr.aria-labelledby]': 'isTabPanel() ? card?.activeTabId() : null',
  },
  template: `
    <!-- One <ng-content>, outlet into whichever branch renders (see AndesCardTitle for why). -->
    <ng-template #body><ng-content /></ng-template>
    @if (loading()) {
      <div class="andes-card__skeleton" aria-hidden="true">
        <span class="andes-card__skeleton-line"></span>
        <span class="andes-card__skeleton-line"></span>
        <span class="andes-card__skeleton-line"></span>
        <span class="andes-card__skeleton-line"></span>
      </div>
    } @else {
      <ng-container *ngTemplateOutlet="body" />
    }
  `,
})
export class AndesCardContent implements AndesCardPanel {
  protected readonly card = inject(AndesCard, { optional: true });

  /**
   * A consumer-supplied `id` is kept as-is (and reused as the tab panel id), so turning tabs on
   * or off never strips an id the consumer's own CSS/links depend on.
   */
  protected readonly ownId =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.getAttribute(
      'id',
    );
  readonly domId = this.ownId ?? `${this.card?.idPrefix ?? 'andes-card'}-panel`;

  private readonly gridCells = contentChildren(AndesCardGrid);

  protected readonly loading = computed(() => !!this.card?.loading());
  protected readonly isGrid = computed(
    () => this.gridCells().length > 0 && !this.loading(),
  );
  protected readonly isTabPanel = computed(
    () => !!this.card?.hasTabs() && this.card.panelId() === this.domId,
  );
}

/**
 * A row of equal-width cells along the card's bottom edge, separated by vertical dividers. Each
 * direct child becomes one cell, so place one control (typically a ghost `AndesButton`) per action.
 * Separate from `AndesCardFooter`, which is a free-form padded row rather than a divided action
 * bar.
 */
@Component({
  selector: 'andes-card-actions',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: { class: 'andes-card__actions', 'data-slot': 'card-actions' },
})
export class AndesCardActions {}

/** Bottom section, typically for actions or secondary content. */
@Component({
  selector: 'andes-card-footer',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './card.css',
  host: { class: 'andes-card__footer', 'data-slot': 'card-footer' },
})
export class AndesCardFooter {}
