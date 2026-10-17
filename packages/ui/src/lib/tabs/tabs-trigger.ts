import { AndesListNavigationItem } from '@andes-ng/primitives';
import { CdkDrag } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  TemplateRef,
  viewChild,
} from '@angular/core';
import clsx from 'clsx';

import { ANDES_TABS, AndesTabsTriggerRef } from './tabs-types';

/**
 * One `role="tab"` trigger inside an `AndesTabsList`. Renders the real, focusable `<button>`
 * in its own template (the `andesListNavigationItem` primitive needs to sit on a genuinely
 * focusable element) and reacts to the shared `AndesListNavigation`'s active item to
 * implement "automatic activation": in that mode, arrow-key focus lands here and selection
 * follows it, with no click or `Enter`/`Space` required.
 *
 * The button's `id` is left entirely to `andesListNavigationItem` (it assigns one whether or
 * not this component also tried to); `AndesTabsContent` reads it back via {@link elementId}
 * for `aria-labelledby` rather than this component minting a competing one.
 *
 * In an `editable-card` Tabs a closable trigger also renders a remove button *next to* (never
 * inside) its tab button. That button is pointer-only - `tabindex="-1"` and `aria-hidden` -
 * because the WAI-ARIA APG's keyboard equivalent is the `Delete` key on the focused tab
 * (advertised through `aria-keyshortcuts`), and a second focusable control inside the
 * `tablist` would break its single-tab-stop roving model.
 *
 * Each trigger is also a CDK drag item for a `draggable` Tabs (see `AndesTabsList`); the
 * drag stays disabled unless the parent Tabs is `draggable`, and always for a disabled tab.
 * `Alt`+`Shift`+arrow key is the keyboard alternative to dragging: it asks to move the
 * focused tab one step along the bar.
 */
@Component({
  selector: 'andes-tabs-trigger',
  imports: [AndesListNavigationItem, NgTemplateOutlet],
  hostDirectives: [CdkDrag],
  templateUrl: './tabs-trigger.html',
  styleUrl: './tabs-trigger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-variant]': 'tabs.type() === "line" ? "line" : "card"',
    '[attr.data-size]': 'tabs.size()',
    '[attr.data-position]': 'tabs.position()',
    '[attr.data-orientation]': 'tabs.resolvedOrientation()',
    '[attr.data-selected]': 'isSelected() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-closable]': 'showRemove() ? "" : null',
    '[attr.data-draggable]': 'canDrag() ? "" : null',
    '[attr.data-sorting]': 'tabs.sorting() ? "" : null',
  },
})
export class AndesTabsTrigger implements AndesTabsTriggerRef, OnInit {
  protected readonly tabs = inject(ANDES_TABS);
  private readonly destroyRef = inject(DestroyRef);

  /** Identifies which panel this trigger controls; matches an `AndesTabsContent`'s `value`. */
  readonly value = input.required<string>();

  /** Disables the trigger: skipped by keyboard navigation and by the default-tab fallback. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** An icon rendered before the label. Projecting an icon into the label works too. */
  readonly icon = input<TemplateRef<unknown> | undefined>(undefined);

  /** `editable-card` only: whether this tab shows its remove button. Default `true`. */
  readonly closable = input(true, { transform: booleanAttribute });

  /** `editable-card` only: a custom remove icon, overriding the Tabs-level `removeIcon`;
   * `null` hides the remove button, like `[closable]="false"`. */
  readonly closeIcon = input<TemplateRef<unknown> | null | undefined>(
    undefined,
  );

  /** @internal Satisfies `AndesTabsTriggerRef`, used only to keep the tabs registry in DOM order. */
  readonly element: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;

  protected readonly isSelected = computed(
    () => this.tabs.activeValue() === this.value(),
  );
  protected readonly panelId = computed(() => this.tabs.panelId(this.value()));

  protected readonly canDrag = computed(
    () => this.tabs.draggable() && !this.disabled(),
  );

  protected readonly keyShortcuts = computed(() => {
    const shortcuts: string[] = [];
    if (this.showRemove()) {
      shortcuts.push('Delete');
    }
    if (this.canDrag()) {
      shortcuts.push(
        ...(this.tabs.resolvedOrientation() === 'vertical'
          ? ['Alt+Shift+ArrowUp', 'Alt+Shift+ArrowDown']
          : ['Alt+Shift+ArrowLeft', 'Alt+Shift+ArrowRight']),
      );
    }
    return shortcuts.length ? shortcuts.join(' ') : null;
  });

  protected readonly showRemove = computed(
    () =>
      this.tabs.editable() &&
      this.closable() &&
      !this.disabled() &&
      this.closeIcon() !== null,
  );

  /** @internal Satisfies `AndesTabsTriggerRef`; read by the overflow menu. */
  readonly removable = this.showRemove;

  protected readonly resolvedCloseIcon = computed(
    () => this.closeIcon() ?? this.tabs.removeIcon(),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-tabs__trigger',
      this.isSelected() && 'andes-tabs__trigger--selected',
      this.tabs.type() !== 'line' && 'andes-tabs__trigger--card',
    ),
  );

  private readonly navItem = viewChild(AndesListNavigationItem);

  /** @internal See the class doc comment; consumed by `AndesTabsContent`. */
  readonly elementId = computed(() => this.navItem()?.itemId);

  /** @internal The registered `AndesListNavigationItem` behind this trigger's button, once
   * its view has initialized - `undefined` before then. Read by `AndesTabs` to keep the
   * shared `AndesListNavigation`'s roving-tabindex target in sync with whichever tab is
   * currently selected; see the comment on `AndesTabs.syncActiveItem` for why that lives
   * there instead of in a per-trigger effect here. */
  readonly navigationItem = this.navItem;

  constructor() {
    const drag = inject(CdkDrag, { self: true });
    effect(() => {
      drag.data = this.value();
      drag.disabled = !this.canDrag();
    });
    const started = drag.started.subscribe(() => this.tabs.setSorting(true));
    const ended = drag.ended.subscribe(() => this.tabs.setSorting(false));
    this.destroyRef.onDestroy(() => {
      started.unsubscribe();
      ended.unsubscribe();
    });

    // Automatic activation (the default, and the WAI-ARIA APG's recommendation for plain
    // tabs): once this trigger becomes the list's active (focused) item, select it too,
    // exactly as documented on `AndesListNavigation` itself. In "manual" mode this effect
    // does nothing, and selection is left entirely to the (click)/(keydown.enter|space)
    // handlers in the template.
    effect(() => {
      const item = this.navItem();
      if (this.tabs.activationMode() === 'automatic' && item?.active()) {
        this.tabs.select(this.value());
      }
    });
  }

  /**
   * Registers with the parent only once this trigger's inputs are set: the parent reads every
   * registered trigger's required `value` (e.g. to find the first enabled tab), and a trigger
   * registered from its constructor could be read - through a sibling's host bindings, or a
   * parent effect - before Angular had bound its inputs, which throws NG0950. This matters
   * as soon as triggers are rendered by `@for`, as the `items` input does.
   */
  ngOnInit(): void {
    this.tabs.registerTrigger(this);
    this.destroyRef.onDestroy(() => this.tabs.unregisterTrigger(this));
  }

  /** @internal Satisfies `AndesTabsTriggerRef`: the tab button's visible text. */
  labelText(): string {
    const button = this.navItem()?.element;
    return (button?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  protected onClick(event: MouseEvent): void {
    this.tabs.handleTabClick(this.value(), event);
  }

  protected onSelect(): void {
    this.tabs.select(this.value());
  }

  protected onRemove(event: MouseEvent): void {
    event.stopPropagation();
    this.tabs.requestRemove(this.value(), event, false);
  }

  /** `Alt`+`Shift`+arrow key: the keyboard alternative to dragging a `draggable` tab. */
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.canDrag() || !event.altKey || !event.shiftKey) {
      return;
    }
    const vertical = this.tabs.resolvedOrientation() === 'vertical';
    const rtl = !vertical && getComputedStyle(this.element).direction === 'rtl';
    let step: -1 | 1 | 0 = 0;
    if (vertical) {
      step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      step = (event.key === 'ArrowRight') !== rtl ? 1 : -1;
    }
    if (step === 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.tabs.moveByKeyboard(this.value(), step);
  }

  protected onDeleteKey(event: Event): void {
    if (!this.showRemove()) {
      return;
    }
    event.preventDefault();
    this.tabs.requestRemove(this.value(), event, true);
  }
}
