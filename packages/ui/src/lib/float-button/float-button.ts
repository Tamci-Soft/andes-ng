import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from '@angular/core';

import {
  ANDES_FLOAT_BUTTON_GROUP,
  andesFloatInsets,
  AndesFloatLength,
  AndesFloatButtonShape,
  AndesFloatButtonSize,
  AndesFloatButtonType,
} from './float-button-types';

export type {
  AndesFloatButtonPlacement,
  AndesFloatButtonShape,
  AndesFloatButtonSize,
  AndesFloatButtonTrigger,
  AndesFloatButtonType,
  AndesFloatLength,
  AndesFloatOffsets,
} from './float-button-types';

/**
 * A button that floats above the page, anchored to a corner of the viewport.
 *
 * Content is the icon (projected); `description` adds a short caption under it. With `href` it
 * renders an anchor instead of a button. A `badgeCount` or `badgeDot` marks it (or project your
 * own marker into `[slot=badge]`).
 *
 * Standalone it is `position: fixed` at `right`/`bottom` (default 1.5rem / 3rem, plus the
 * device's safe-area insets); `right`/`left` mean the inline end/start edge so they mirror in
 * right-to-left layouts. Set `fixed` to false to lay it out in the flow instead. Inside an
 * `<andes-float-button-group>` it is never fixed and takes the group's type, shape and size.
 *
 * An icon-only button needs an `aria-label`.
 */
@Component({
  selector: 'andes-float-button',
  imports: [NgTemplateOutlet],
  templateUrl: './float-button.html',
  styleUrl: './float-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'float-button',
    '[attr.data-type]': 'resolvedType()',
    '[attr.data-shape]': 'resolvedShape()',
    '[attr.data-size]': 'resolvedSize()',
    '[attr.data-fixed]': "isFixed() ? '' : null",
    '[attr.data-disabled]': "disabled() ? '' : null",
    '[attr.data-description]': "description() ? '' : null",
    '[style.inset-inline-end]': 'insets()?.insetInlineEnd ?? null',
    '[style.inset-inline-start]': 'insets()?.insetInlineStart ?? null',
    '[style.top]': 'insets()?.top ?? null',
    '[style.bottom]': 'insets()?.bottom ?? null',
    // Forwarded to the real button/anchor; the host element itself stays out of the a11y tree.
    '[attr.aria-label]': 'null',
    '[attr.aria-expanded]': 'null',
    '[attr.aria-controls]': 'null',
  },
})
export class AndesFloatButton {
  protected readonly group = inject(ANDES_FLOAT_BUTTON_GROUP, {
    optional: true,
  });
  /** The host element. */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Falls back to the group's type, then `default`. */
  readonly type = input<AndesFloatButtonType | undefined>(undefined);
  /** Falls back to the group's shape, then `circle`. */
  readonly shape = input<AndesFloatButtonShape | undefined>(undefined);
  /** 32 / 40 / 48px; falls back to the group's size, then `md`. */
  readonly size = input<AndesFloatButtonSize | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** A short caption under the icon. Turns the button into a rounded rectangle that grows to
   *  fit it. */
  readonly description = input<string | undefined>(undefined);
  /** Native tooltip (`title`). */
  readonly tooltip = input<string | undefined>(undefined);
  /** Renders an anchor instead of a button. */
  readonly href = input<string | undefined>(undefined);
  readonly target = input<string | undefined>(undefined);
  /** Count shown on the badge; hidden when 0 or empty. */
  readonly badgeCount = input<number | string | undefined>(undefined);
  /** A count above this is shown as `max+`. */
  readonly badgeOverflowCount = input(99);
  /** A small dot with no number; wins over `badgeCount`. */
  readonly badgeDot = input(false, { transform: booleanAttribute });
  /** Anchor the button to the viewport; false lays it out in the flow. */
  readonly fixed = input(true, { transform: booleanAttribute });
  readonly right = input<AndesFloatLength | undefined>(undefined);
  readonly bottom = input<AndesFloatLength | undefined>(undefined);
  readonly left = input<AndesFloatLength | undefined>(undefined);
  readonly top = input<AndesFloatLength | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaExpanded = input<boolean | undefined>(undefined, {
    alias: 'aria-expanded',
  });
  readonly ariaControls = input<string | undefined>(undefined, {
    alias: 'aria-controls',
  });

  protected readonly resolvedType = computed(
    () => this.type() ?? this.group?.type() ?? 'default',
  );
  protected readonly resolvedShape = computed(
    () => this.shape() ?? this.group?.shape() ?? 'circle',
  );
  protected readonly resolvedSize = computed(
    () => this.size() ?? this.group?.size() ?? 'md',
  );
  protected readonly isFixed = computed(() => this.fixed() && !this.group);
  protected readonly insets = computed(() =>
    this.isFixed()
      ? andesFloatInsets({
          right: this.right(),
          bottom: this.bottom(),
          left: this.left(),
          top: this.top(),
        })
      : null,
  );

  protected readonly badgeText = computed(() => {
    const count = this.badgeCount();
    if (count === undefined || count === '' || Number(count) === 0) {
      return null;
    }
    const max = this.badgeOverflowCount();
    return typeof count === 'number' && count > max ? `${max}+` : `${count}`;
  });

  /** Focuses the button or anchor. */
  focus(options?: FocusOptions): void {
    this.element.querySelector<HTMLElement>('button, a')?.focus(options);
  }
}
