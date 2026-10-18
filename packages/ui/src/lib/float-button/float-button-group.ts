import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  TemplateRef,
  viewChild,
} from '@angular/core';

import { AndesFloatButton } from './float-button';
import {
  ANDES_FLOAT_BUTTON_GROUP,
  andesFloatInsets,
  AndesFloatButtonGroupApi,
  AndesFloatButtonPlacement,
  AndesFloatButtonShape,
  AndesFloatButtonSize,
  AndesFloatButtonTrigger,
  AndesFloatButtonType,
  AndesFloatLength,
} from './float-button-types';

let nextGroupId = 0;

/** Pointer-leave grace period in hover mode, so crossing the gap to the menu does not close it. */
const HOVER_CLOSE_DELAY_MS = 120;

/**
 * Several float buttons stacked together.
 *
 * Without `trigger` the buttons are always visible: circles are spaced apart, squares are
 * joined into one panel. With `trigger="click"` or `"hover"` the group shows one trigger button
 * and the projected buttons form a menu that opens in the `placement` direction, each button
 * fading and sliding in 30ms after the previous one (over 120ms). The first projected button is
 * the one nearest the trigger.
 *
 * `open` is a model (`[(open)]`). Escape closes the menu and returns focus to the trigger; in
 * click mode a press outside closes it too; in hover mode keyboard focus inside keeps it open.
 * The trigger carries `aria-expanded` and `aria-controls`.
 *
 * The group is the fixed element; its buttons are laid out inside it and inherit its `type`,
 * `shape` and `size`.
 */
@Component({
  selector: 'andes-float-button-group',
  imports: [NgTemplateOutlet, AndesFloatButton],
  templateUrl: './float-button-group.html',
  styleUrl: './float-button-group.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ANDES_FLOAT_BUTTON_GROUP,
      useExisting: forwardRef(() => AndesFloatButtonGroup),
    },
  ],
  host: {
    role: 'group',
    'data-slot': 'float-button-group',
    '[attr.data-type]': 'type()',
    '[attr.data-shape]': 'shape()',
    '[attr.data-size]': 'size()',
    '[attr.data-placement]': 'placement()',
    '[attr.data-trigger]': 'trigger() ?? "none"',
    '[attr.data-state]': "open() ? 'open' : 'closed'",
    '[attr.data-fixed]': "fixed() ? '' : null",
    '[style.inset-inline-end]': 'insets().insetInlineEnd',
    '[style.inset-inline-start]': 'insets().insetInlineStart',
    '[style.top]': 'insets().top',
    '[style.bottom]': 'insets().bottom',
    '[attr.aria-label]': 'groupLabel()',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
    '(keydown.escape)': 'onEscape()',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
})
export class AndesFloatButtonGroup implements AndesFloatButtonGroupApi {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** `click` or `hover` shows a trigger button that opens the menu; omit for an always-visible
   *  stack. */
  readonly trigger = input<AndesFloatButtonTrigger | undefined>(undefined);
  /** Whether the menu is open (only meaningful with a `trigger`). */
  readonly open = model(false);
  /** Direction the menu opens in, or the axis of the stack. */
  readonly placement = input<AndesFloatButtonPlacement>('up');
  readonly type = input<AndesFloatButtonType>('default');
  readonly shape = input<AndesFloatButtonShape>('circle');
  readonly size = input<AndesFloatButtonSize>('md');
  /** Icon of the trigger while closed (a plus sign by default). */
  readonly triggerIcon = input<TemplateRef<unknown> | undefined>(undefined);
  /** Icon of the trigger while open (a cross by default). */
  readonly closeIcon = input<TemplateRef<unknown> | undefined>(undefined);
  /** Accessible name of the trigger button, and of the group when there is no trigger. */
  readonly ariaLabel = input('Actions', { alias: 'aria-label' });
  readonly fixed = input(true, { transform: booleanAttribute });
  readonly right = input<AndesFloatLength | undefined>(undefined);
  readonly bottom = input<AndesFloatLength | undefined>(undefined);
  readonly left = input<AndesFloatLength | undefined>(undefined);
  readonly top = input<AndesFloatLength | undefined>(undefined);

  private readonly buttons = contentChildren(AndesFloatButton);
  private readonly triggerButton = viewChild(AndesFloatButton);

  protected readonly menuId = `andes-float-button-menu-${++nextGroupId}`;
  protected readonly insets = computed(() =>
    this.fixed()
      ? andesFloatInsets({
          right: this.right(),
          bottom: this.bottom(),
          left: this.left(),
          top: this.top(),
        })
      : {
          insetInlineEnd: null,
          insetInlineStart: null,
          top: null,
          bottom: null,
        },
  );
  protected readonly groupLabel = computed(() =>
    this.trigger() ? null : this.ariaLabel(),
  );

  private lastPointerType = 'mouse';
  private hoverTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Each button's distance from the trigger drives its stagger delay (see the stylesheet).
    effect(() => {
      this.buttons().forEach((button, index) =>
        button.element.style.setProperty(
          '--andes-float-button-index',
          String(index),
        ),
      );
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.hoverTimer));
  }

  /** Opens the menu. */
  show(): void {
    clearTimeout(this.hoverTimer);
    if (this.trigger()) {
      this.open.set(true);
    }
  }

  /** Closes the menu. */
  hide(): void {
    clearTimeout(this.hoverTimer);
    this.open.set(false);
  }

  protected onTriggerClick(): void {
    // A mouse already opened the menu on hover; the click that follows must not close it again.
    if (this.trigger() === 'hover' && this.lastPointerType === 'mouse') {
      this.show();
      return;
    }
    this.open.update((open) => !open);
  }

  protected onTriggerKeydown(): void {
    this.lastPointerType = 'keyboard';
  }

  protected onPointerEnter(event: PointerEvent): void {
    this.lastPointerType = event.pointerType || 'mouse';
    if (this.trigger() === 'hover' && event.pointerType !== 'touch') {
      this.show();
    }
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (this.trigger() === 'hover' && event.pointerType !== 'touch') {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = setTimeout(() => {
        if (!this.host.nativeElement.contains(document.activeElement)) {
          this.open.set(false);
        }
      }, HOVER_CLOSE_DELAY_MS);
    }
  }

  protected onFocusIn(event: FocusEvent): void {
    if (this.trigger() === 'hover' && this.focusCameFromKeyboard(event)) {
      this.show();
    }
  }

  /** Keyboard focus (Tab, arrows) opens a hover menu; a mouse press that focuses does not. */
  private focusCameFromKeyboard(event: FocusEvent): boolean {
    try {
      return (event.target as HTMLElement).matches(':focus-visible');
    } catch {
      return this.lastPointerType === 'keyboard';
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (
      this.trigger() === 'hover' &&
      next &&
      !this.host.nativeElement.contains(next)
    ) {
      this.hide();
    }
  }

  protected onEscape(): void {
    if (!this.open()) {
      return;
    }
    const hadFocus = this.host.nativeElement.contains(document.activeElement);
    this.hide();
    if (hadFocus) {
      this.triggerButton()?.focus();
    }
  }

  protected onDocumentPointerDown(event: PointerEvent): void {
    if (
      this.trigger() &&
      this.open() &&
      !this.host.nativeElement.contains(event.target as Node)
    ) {
      this.hide();
    }
  }
}
