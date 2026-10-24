import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  DOCUMENT,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';

import type {
  AndesMenubarClickEvent,
  AndesMenubarMenuRef,
  AndesMenubarOpenChangeSource,
  AndesMenubarSize,
  AndesMenubarTriggerRef,
  AndesMenubarVariant,
} from './menubar-types';

/**
 * A horizontal bar of menus, like the File / Edit / View strip of a desktop app.
 *
 * Each `andes-menubar-menu` inside it pairs an `andes-menubar-trigger` with the items of
 * its dropdown panel (the dropdown menu's own item, submenu, checkbox and radio parts).
 *
 * ```html
 * <andes-menubar aria-label="Application" (itemClick)="run($event.menu, $event.key)">
 *   <andes-menubar-menu value="file">
 *     <andes-menubar-trigger>File</andes-menubar-trigger>
 *     <andes-dropdown-menu-item key="new">New</andes-dropdown-menu-item>
 *   </andes-menubar-menu>
 *   <andes-menubar-menu value="edit">…</andes-menubar-menu>
 * </andes-menubar>
 * ```
 *
 * Behavior of a menubar, as opposed to a row of independent dropdowns:
 *
 * - the triggers form one tab stop; Left/Right (mirrored in RTL), Home and End move
 *   between them, wrapping unless `loop` is off;
 * - once a menu is open, pointing at another trigger switches to its menu with no extra
 *   click, and Left/Right inside an open menu opens the neighbouring one;
 * - ArrowDown, Enter and Space on a trigger open its menu on the first item, ArrowUp on
 *   the last; Escape closes it and returns focus to the trigger.
 *
 * `role="menubar"` is on the host; the triggers are `menuitem`s with `aria-haspopup` and
 * `aria-expanded`.
 *
 * Opts out of view encapsulation (like the dropdown menu parts) so its BEM classes,
 * which live in `host: { class }`, match its own stylesheet.
 */
@Component({
  selector: 'andes-menubar',
  exportAs: 'andesMenubar',
  template: '<ng-content />',
  styleUrl: './menubar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'andes-menubar',
    role: 'menubar',
    'aria-orientation': 'horizontal',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-labelledby]': 'ariaLabelledby()',
    '[attr.data-size]': 'size()',
    '[attr.data-variant]': 'variant()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(keydown)': 'onKeydown($event)',
  },
})
export class AndesMenubar {
  /** Accessible name of the bar. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  /** Id of the element that names the bar. */
  readonly ariaLabelledby = input<string | null>(null, {
    alias: 'aria-labelledby',
  });
  /** Trigger height: 24 (`sm`), 32 (`md`, default) or 40px (`lg`). */
  readonly size = input<AndesMenubarSize>('md');
  /** `default` draws the bar as a bordered surface; `plain` drops the frame. */
  readonly variant = input<AndesMenubarVariant>('default');
  /** Whether arrow keys wrap from the last trigger to the first and back. Default `true`. */
  readonly loop = input(true, { transform: booleanAttribute });
  /** Disables every menu of the bar: nothing opens, and an open menu closes. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * The `value` of the open menu, or `null` when none is. Two-way bindable
   * (`[(value)]`): setting it opens that menu, `null` closes the open one.
   */
  readonly value = model<string | null>(null);

  /** Emits when an item of any of the bar's menus with a `key` is activated. */
  readonly itemClick = output<AndesMenubarClickEvent>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  private readonly triggerList = signal<readonly AndesMenubarTriggerRef[]>([]);
  private readonly focusedTrigger = signal<AndesMenubarTriggerRef | null>(null);
  private readonly openMenuSignal = signal<AndesMenubarMenuRef | null>(null);

  /** The menu that is open, if any. */
  readonly openMenu = this.openMenuSignal.asReadonly();

  /** The one trigger in the tab order: the one last focused, else the first enabled. */
  readonly rovingTarget = computed(() => {
    const focused = this.focusedTrigger();
    if (
      focused &&
      !focused.isDisabled() &&
      this.triggerList().includes(focused)
    ) {
      return focused;
    }
    return this.triggerList().find((trigger) => !trigger.isDisabled()) ?? null;
  });

  constructor() {
    // `[value]` -> menus. The reverse direction is `menuOpened`/`menuClosed`.
    effect(() => {
      const wanted = this.value();
      untracked(() => {
        const open = this.openMenuSignal();
        if ((open?.value() ?? null) === wanted) {
          return;
        }
        if (wanted === null) {
          open?.hide('programmatic');
          return;
        }
        this.triggerList()
          .find((trigger) => trigger.menu.value() === wanted)
          ?.menu.show({ focus: 'none', source: 'programmatic' });
      });
    });

    effect(() => {
      if (this.disabled()) {
        untracked(() => this.openMenuSignal()?.hide('programmatic'));
      }
    });
  }

  /** Whether the whole bar is disabled. */
  isDisabled(): boolean {
    return this.disabled();
  }

  /** Closes the open menu, if any. */
  closeAll(): void {
    this.openMenuSignal()?.hide('programmatic');
  }

  /** @internal */
  registerTrigger(trigger: AndesMenubarTriggerRef): void {
    this.triggerList.update((list) => sortByDocumentOrder([...list, trigger]));
  }

  /** @internal */
  unregisterTrigger(trigger: AndesMenubarTriggerRef): void {
    this.triggerList.update((list) =>
      list.filter((entry) => entry !== trigger),
    );
    if (this.focusedTrigger() === trigger) {
      this.focusedTrigger.set(null);
    }
  }

  /** @internal Keeps the roving tab stop on the trigger the user reached. */
  setFocused(trigger: AndesMenubarTriggerRef): void {
    this.focusedTrigger.set(trigger);
  }

  /**
   * @internal Called by a menu about to open: only one menu is ever open, and the one
   * it replaces must not pull focus back to its trigger on the way out.
   */
  prepareOpen(menu: AndesMenubarMenuRef, source: AndesMenubarOpenChangeSource) {
    const open = this.openMenuSignal();
    if (open && open !== menu) {
      open.hide(source, { restoreFocus: false });
    }
  }

  /** @internal */
  menuOpened(menu: AndesMenubarMenuRef): void {
    this.openMenuSignal.set(menu);
    this.syncValue(menu.value());
    const trigger = this.triggerOf(menu);
    if (trigger) {
      this.focusedTrigger.set(trigger);
    }
  }

  /** @internal */
  menuClosed(menu: AndesMenubarMenuRef): void {
    if (this.openMenuSignal() === menu) {
      this.openMenuSignal.set(null);
      this.syncValue(null);
    }
  }

  /** @internal */
  itemActivated(click: AndesMenubarClickEvent): void {
    this.itemClick.emit(click);
  }

  /**
   * @internal The pointer reached a trigger. With a menu already open, that is the
   * cue to switch to this trigger's menu - no extra click.
   */
  triggerPointerEntered(trigger: AndesMenubarTriggerRef): void {
    const open = this.openMenuSignal();
    if (
      !open ||
      open === trigger.menu ||
      trigger.isDisabled() ||
      this.disabled()
    ) {
      return;
    }
    trigger.focus();
    trigger.menu.show({ focus: 'none', source: 'hover' });
  }

  /**
   * @internal Moves from `from` to the neighbouring enabled trigger, opening its menu
   * when `open` is set (otherwise only focusing the trigger).
   */
  moveFrom(
    from: AndesMenubarTriggerRef,
    delta: 1 | -1,
    options: { readonly open: boolean; readonly focus: 'first' | 'none' },
  ): void {
    const next = this.neighbour(from, delta);
    if (!next || next === from) {
      return;
    }
    if (options.open) {
      next.focus();
      next.menu.show({ focus: options.focus, source: 'keyboard' });
    } else {
      next.focus();
    }
  }

  /** @internal The same move as `moveFrom`, starting from the open menu's trigger. */
  openAdjacent(from: AndesMenubarMenuRef, delta: 1 | -1): void {
    const trigger = this.triggerOf(from);
    if (trigger) {
      this.moveFrom(trigger, delta, { open: true, focus: 'first' });
    }
  }

  /** @internal Whether `target` is one of the bar's triggers (or inside one). */
  isTriggerTarget(target: EventTarget | null): boolean {
    return (
      target instanceof Node &&
      this.triggerList().some((trigger) => trigger.element.contains(target))
    );
  }

  /** @internal Whether the bar lays out right-to-left, for mirroring the arrow keys. */
  isRtl(): boolean {
    const view = this.document.defaultView;
    return (
      !!view &&
      view.getComputedStyle(this.host.nativeElement).direction === 'rtl'
    );
  }

  protected onKeydown(event: KeyboardEvent): void {
    const trigger = this.triggerList().find(
      (entry) => entry.element === event.target,
    );
    if (!trigger || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const forward = this.isRtl() ? 'ArrowLeft' : 'ArrowRight';
    const backward = this.isRtl() ? 'ArrowRight' : 'ArrowLeft';
    // With a menu open the arrows carry it along; without one they only move focus.
    const open = !!this.openMenuSignal();

    switch (event.key) {
      case forward:
        event.preventDefault();
        this.moveFrom(trigger, 1, { open, focus: 'none' });
        break;
      case backward:
        event.preventDefault();
        this.moveFrom(trigger, -1, { open, focus: 'none' });
        break;
      case 'Home':
        event.preventDefault();
        this.jumpTo(trigger, 'first', open);
        break;
      case 'End':
        event.preventDefault();
        this.jumpTo(trigger, 'last', open);
        break;
      default:
        break;
    }
  }

  private jumpTo(
    from: AndesMenubarTriggerRef,
    end: 'first' | 'last',
    open: boolean,
  ): void {
    const enabled = this.triggerList().filter((entry) => !entry.isDisabled());
    const target = end === 'first' ? enabled[0] : enabled[enabled.length - 1];
    if (!target || target === from) {
      return;
    }
    target.focus();
    if (open) {
      target.menu.show({ focus: 'none', source: 'keyboard' });
    }
  }

  /** The enabled trigger `delta` places away, wrapping when `loop` is on. */
  private neighbour(
    from: AndesMenubarTriggerRef,
    delta: 1 | -1,
  ): AndesMenubarTriggerRef | null {
    const list = this.triggerList();
    const start = list.indexOf(from);
    if (start === -1) {
      return null;
    }
    for (let step = 1; step < list.length; step++) {
      const raw = start + delta * step;
      if (!this.loop() && (raw < 0 || raw >= list.length)) {
        return null;
      }
      const candidate = list[(raw + list.length * step) % list.length];
      if (!candidate.isDisabled()) {
        return candidate;
      }
    }
    return null;
  }

  private triggerOf(
    menu: AndesMenubarMenuRef,
  ): AndesMenubarTriggerRef | undefined {
    return this.triggerList().find((trigger) => trigger.menu === menu);
  }

  private syncValue(value: string | null): void {
    if (untracked(this.value) !== value) {
      this.value.set(value);
    }
  }
}

/** Sorts registered triggers into DOM order, leaving detached ones in registration order. */
function sortByDocumentOrder(
  triggers: readonly AndesMenubarTriggerRef[],
): AndesMenubarTriggerRef[] {
  return [...triggers].sort((a, b) => {
    const position = a.element.compareDocumentPosition(b.element);
    if (position & 1) {
      return 0;
    }
    if (position & 4) {
      return -1;
    }
    if (position & 2) {
      return 1;
    }
    return 0;
  });
}
