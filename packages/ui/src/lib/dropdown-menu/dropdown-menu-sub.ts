import {
  andesOverlayPreset,
  AndesOverlayPrimitive,
  provideAndesOverlay,
} from '@andes-ng/primitives';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  inject,
  Injector,
  input,
  Signal,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';

import { AndesDropdownMenuRoot } from './dropdown-menu-root';
import {
  AndesDropdownMenuLevel,
  type AndesDropdownMenuSubmenuRef,
} from './dropdown-menu-types';

/** What `AndesDropdownMenuSubTrigger` registers with its submenu. */
export interface AndesDropdownMenuSubTriggerRef {
  readonly element: HTMLElement;
  readonly itemId: string;
  readonly isDisabled: Signal<boolean>;
}

/** What `AndesDropdownMenuSubContent` registers with its submenu. */
export interface AndesDropdownMenuSubContentRef {
  focusFirst(): void;
}

/**
 * A nested submenu: an `AndesDropdownMenuSubTrigger` item that opens an
 * `AndesDropdownMenuSubContent` panel beside it. Submenus nest to any depth.
 *
 * ```html
 * <andes-dropdown-menu-sub key="share">
 *   <andes-dropdown-menu-sub-trigger>Share</andes-dropdown-menu-sub-trigger>
 *   <andes-dropdown-menu-sub-content>
 *     <andes-dropdown-menu-item key="email">Email</andes-dropdown-menu-item>
 *   </andes-dropdown-menu-sub-content>
 * </andes-dropdown-menu-sub>
 * ```
 *
 * Each submenu owns its own overlay (provided here, so its trigger anchors to it and
 * its content registers with it). Its panel owns its own list navigation (provided by
 * `AndesDropdownMenuSubContent`, *not* here - the sub-trigger is an item of the
 * *parent* panel and must keep resolving the parent's navigation).
 *
 * Opening: hover (after `subMenuOpenDelay`, unless the root's `triggerSubMenuAction`
 * is `'click'`), click, or ArrowRight/Enter/Space on the trigger - the keyboard ways
 * also focus the first item. Closing: ArrowLeft or Escape inside it (focus returns to
 * the trigger), pointing at a sibling item for `subMenuCloseDelay`, opening a sibling
 * submenu, or the whole menu closing. Leaving the panel for empty space does not close
 * it, so a slightly overshooting pointer is forgiven.
 */
@Component({
  selector: 'andes-dropdown-menu-sub',
  template: `
    <ng-content select="andes-dropdown-menu-sub-trigger" />
    <ng-template #contentTemplate>
      <ng-content select="andes-dropdown-menu-sub-content" />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideAndesOverlay()],
  host: {
    // The trigger has to lay out as a row of the parent panel's flex column.
    style: 'display: contents',
  },
})
export class AndesDropdownMenuSub
  implements AndesDropdownMenuSubmenuRef, AndesDropdownMenuLevel
{
  /** Identifies the submenu in its descendants' `keyPath`. */
  readonly key = input<string | undefined>(undefined);

  private readonly overlay = inject(AndesOverlayPrimitive);
  private readonly root = inject(AndesDropdownMenuRoot);
  private readonly parent = inject(AndesDropdownMenuLevel);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  private readonly contentTemplate =
    viewChild.required<TemplateRef<unknown>>('contentTemplate');

  /** Whether the submenu's panel is open. */
  readonly isOpen: Signal<boolean> = this.overlay.isOpen;

  private readonly openChildSignal = signal<AndesDropdownMenuSubmenuRef | null>(
    null,
  );
  readonly openChild = this.openChildSignal.asReadonly();

  private readonly triggerRef = signal<AndesDropdownMenuSubTriggerRef | null>(
    null,
  );
  /** @internal The trigger's id, for the panel's `aria-labelledby`. */
  readonly triggerId = () => this.triggerRef()?.itemId ?? null;

  private contentRef: AndesDropdownMenuSubContentRef | null = null;
  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.overlay.configure({
      ...andesOverlayPreset('menu'),
      positioning: {
        kind: 'anchored',
        side: 'right',
        align: 'start',
        // Overlap the parent panel's padding so the submenu reads as attached to its
        // row, and pull it up by the panel's padding + border so the first item lines
        // up with the trigger item.
        sideOffset: 2,
        alignOffset: -5,
      },
      autoFocus: 'none',
      closeOnEscape: false,
      closeOnOutsideClick: false,
    });

    this.overlay.outsidePointerEvents
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        const target = event.target as Node | null;
        const trigger = this.triggerRef()?.element;
        if (target && trigger?.contains(target)) {
          return;
        }
        this.close(false);
      });

    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe(() => {
      this.parent.childClosed(this);
    });

    inject(DestroyRef).onDestroy(() => this.clearTimers());
  }

  /** @internal */
  registerTrigger(trigger: AndesDropdownMenuSubTriggerRef): void {
    this.triggerRef.set(trigger);
  }

  /** @internal */
  registerContent(content: AndesDropdownMenuSubContentRef | null): void {
    this.contentRef = content;
  }

  /** Opens the submenu, optionally focusing its first item. */
  open(focusFirst = false): void {
    this.clearTimers();
    if (this.root.isDisabled() || this.triggerRef()?.isDisabled()) {
      return;
    }
    if (this.overlay.isOpen()) {
      if (focusFirst) {
        this.contentRef?.focusFirst();
      }
      return;
    }
    this.parent.childOpened(this);
    this.overlay.configure({ restoreFocus: true });
    this.overlay.open(this.contentTemplate());
    if (focusFirst) {
      // The panel's items are only laid out (and so focusable) after it renders.
      afterNextRender(() => this.contentRef?.focusFirst(), {
        injector: this.injector,
      });
    }
  }

  /**
   * Closes the submenu and any submenu open inside it. `restoreFocus` moves focus back
   * to the trigger item - right for ArrowLeft/Escape, wrong when the pointer moved on.
   */
  close(restoreFocus = true): void {
    this.clearTimers();
    if (!this.overlay.isOpen()) {
      return;
    }
    this.openChildSignal()?.close(false);
    this.overlay.configure({ restoreFocus });
    this.overlay.close('trigger');
  }

  /** Opens after the hover-intent delay, unless the pointer moves on first. */
  scheduleOpen(): void {
    clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
    if (this.overlay.isOpen() || this.openTimer !== undefined) {
      return;
    }
    this.openTimer = setTimeout(() => {
      this.openTimer = undefined;
      this.open(false);
    }, this.root.subMenuOpenDelay());
  }

  cancelOpen(): void {
    clearTimeout(this.openTimer);
    this.openTimer = undefined;
  }

  scheduleClose(): void {
    this.cancelOpen();
    if (!this.overlay.isOpen() || this.closeTimer !== undefined) {
      return;
    }
    this.closeTimer = setTimeout(() => {
      this.closeTimer = undefined;
      // Keyboard focus inside a submenu the pointer abandoned must not be lost with it.
      this.close(this.focusIsInside());
    }, this.root.subMenuCloseDelay());
  }

  cancelClose(): void {
    clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
  }

  // AndesDropdownMenuLevel - for the items inside this submenu's panel.

  childOpened(child: AndesDropdownMenuSubmenuRef): void {
    const current = this.openChildSignal();
    if (current && current !== child) {
      current.close(false);
    }
    this.openChildSignal.set(child);
  }

  childClosed(child: AndesDropdownMenuSubmenuRef): void {
    if (this.openChildSignal() === child) {
      this.openChildSignal.set(null);
    }
  }

  keyPath(): readonly string[] {
    const key = this.key();
    const parentPath = this.parent.keyPath();
    return key === undefined ? parentPath : [key, ...parentPath];
  }

  private focusIsInside(): boolean {
    const active = this.document.activeElement;
    const pane = this.overlay.panelElement();
    return (
      !!active &&
      (!!pane?.contains(active) ||
        // Or deeper, in a descendant submenu's panel.
        (!!this.openChildSignal() &&
          !!active.closest('.andes-dropdown-menu__sub-content')))
    );
  }

  private clearTimers(): void {
    this.cancelOpen();
    this.cancelClose();
  }
}
