import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
} from '@angular/core';

import { AndesContextMenu } from './context-menu';

/** How far a held finger may drift before the press stops counting as a long press, in px. */
const LONG_PRESS_TOLERANCE = 10;

/**
 * Marks an element as an area that opens a context menu.
 *
 * It listens for the three ways to ask for one:
 *
 * - the `contextmenu` event (right-click) - the menu opens at the pointer;
 * - a held touch or pen press (the menu's `longPressDelay`, 500ms) - under the finger;
 * - the context-menu key or Shift+F10 - at the top-left of the focused element.
 *
 * Inside the area the native menu is suppressed, and only there: it comes back as soon
 * as the menu or the area is `disabled`. Areas nest - the innermost one wins.
 *
 * Put it inside the menu to bind them implicitly, or bind it to a menu anywhere:
 *
 * ```html
 * <andes-context-menu #menu="andesContextMenu"> … </andes-context-menu>
 * <section [andesContextMenuTrigger]="menu" [andesContextMenuContext]="project">…</section>
 * ```
 *
 * The directive adds no role or tabindex: whether the area is focusable, and what
 * announces it, is up to the element it sits on. Give keyboard users a way in by making
 * it focusable (`tabindex="0"`, or an element that already is).
 */
@Directive({
  selector: '[andesContextMenuTrigger]',
  exportAs: 'andesContextMenuTrigger',
  host: {
    '[attr.data-state]': 'menu()?.isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '(contextmenu)': 'onContextMenu($event)',
    '(keydown)': 'onKeydown($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'cancelLongPress()',
    '(pointercancel)': 'cancelLongPress()',
    '(pointerleave)': 'cancelLongPress()',
  },
})
export class AndesContextMenuTrigger {
  /**
   * The menu to open. Leave it empty (`andesContextMenuTrigger` as a plain attribute) when
   * the area sits inside the `<andes-context-menu>` it opens.
   */
  readonly andesContextMenuTrigger = input<
    AndesContextMenu | '' | null | undefined
  >(undefined);
  /**
   * Anything that tells the menu's handlers which area was used - a table row, a file.
   * Reported as `context` in the menu's `(itemClick)`.
   */
  readonly andesContextMenuContext = input<unknown>(undefined);
  /** Turns this area off: the native menu comes back. */
  readonly andesContextMenuDisabled = input(false, {
    transform: booleanAttribute,
  });

  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly parent = inject(AndesContextMenu, { optional: true });

  protected readonly menu = computed(
    () => this.andesContextMenuTrigger() || this.parent,
  );
  protected readonly isDisabled = computed(
    () => this.andesContextMenuDisabled() || !!this.menu()?.isDisabled(),
  );

  private longPress: {
    readonly timer: ReturnType<typeof setTimeout>;
    readonly pointerId: number;
    readonly x: number;
    readonly y: number;
  } | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelLongPress());
    // Lets the menu find an area to open at when it is opened through `[open]`.
    effect((onCleanup) => {
      const menu = this.menu();
      if (menu) {
        onCleanup(menu.registerArea(this.host, () => !this.isDisabled()));
      }
    });
  }

  protected onContextMenu(event: MouseEvent): void {
    const menu = this.activeMenu();
    // An inner area has already taken this one.
    if (!menu || event.defaultPrevented) {
      return;
    }
    event.preventDefault();
    this.cancelLongPress();
    // Android reports a long press as a `contextmenu` event too, a moment after the
    // timer below has already opened the menu.
    if (menu.openedByLongPressRecently()) {
      return;
    }
    // The context-menu key fires `contextmenu` with no pointer position.
    const fromKeyboard = event.button !== 2 && !event.clientX && !event.clientY;
    if (fromKeyboard) {
      menu.openAtElement(this.focusedElement(event), {
        context: this.andesContextMenuContext(),
      });
      return;
    }
    menu.openAt(event.clientX, event.clientY, {
      source: 'context-menu',
      context: this.andesContextMenuContext(),
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const isMenuKey =
      event.key === 'ContextMenu' ||
      (event.key === 'F10' &&
        event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey);
    const menu = this.activeMenu();
    if (!isMenuKey || !menu || event.defaultPrevented) {
      return;
    }
    // Stops the platform from raising its own menu (and a second `contextmenu` event).
    event.preventDefault();
    menu.openAtElement(this.focusedElement(event), {
      context: this.andesContextMenuContext(),
    });
  }

  protected onPointerDown(event: PointerEvent): void {
    this.cancelLongPress();
    const menu = this.activeMenu();
    const delay = menu?.longPressDelay() ?? 0;
    if (
      !menu ||
      delay <= 0 ||
      !event.isPrimary ||
      (event.pointerType !== 'touch' && event.pointerType !== 'pen')
    ) {
      return;
    }
    const { clientX: x, clientY: y, pointerId } = event;
    const timer = setTimeout(() => {
      this.longPress = null;
      menu.swallowNextClick();
      menu.openAt(x, y, {
        source: 'long-press',
        context: this.andesContextMenuContext(),
      });
    }, delay);
    this.longPress = { timer, pointerId, x, y };
  }

  protected onPointerMove(event: PointerEvent): void {
    const press = this.longPress;
    if (
      press &&
      press.pointerId === event.pointerId &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) >
        LONG_PRESS_TOLERANCE
    ) {
      this.cancelLongPress();
    }
  }

  protected cancelLongPress(): void {
    if (this.longPress) {
      clearTimeout(this.longPress.timer);
      this.longPress = null;
    }
  }

  /** The bound menu, or `null` while this area is off (so the native menu stays). */
  private activeMenu(): AndesContextMenu | null {
    const menu = this.menu();
    return menu && !this.isDisabled() ? menu : null;
  }

  /** The element a keyboard gesture is about: the focused descendant, else the area. */
  private focusedElement(event: Event): Element {
    return event.target instanceof Element && this.host.contains(event.target)
      ? event.target
      : this.host;
  }
}
