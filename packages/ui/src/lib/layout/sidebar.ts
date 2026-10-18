import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import {
  AndesSidebarCollapsible,
  AndesSidebarProvider,
  AndesSidebarSide,
  AndesSidebarVariant,
} from './sidebar-provider';

let nextSidebarId = 0;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The sidebar of an app shell, inside an `andes-sidebar-provider`.
 *
 * - `side`: `start` or `end`. `variant`: a flush `sidebar`, a `floating` card, or `inset` (the
 *   page content becomes a rounded card beside it).
 * - `collapsible`: `icon` shrinks to an icon rail, `offcanvas` slides out of view, `none` never
 *   collapses. Both desktop transitions are 200ms, and a placeholder in the flow animates in step
 *   with the panel so the page never jumps.
 * - Below the provider's `mobileBreakpoint` it becomes a modal overlay with a scrim: focus moves
 *   in, Tab stays inside, Escape or a click on the scrim closes it and focus goes back.
 *
 * Put `andes-sidebar-header`, `-content` and `-footer` inside; build the navigation from
 * `andes-sidebar-group`, `andes-sidebar-menu` and `andes-sidebar-menu-button`.
 */
@Component({
  selector: 'andes-sidebar',
  imports: [NgTemplateOutlet],
  templateUrl: './sidebar.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-sidebar',
    'data-slot': 'sidebar',
    '[attr.data-state]': 'provider.state()',
    '[attr.data-mode]': 'provider.mode()',
    '[attr.data-collapsible]': 'collapsible()',
    '[attr.data-variant]': 'variant()',
    '[attr.data-side]': 'side()',
    '[attr.data-mobile]': 'provider.isMobile() ? "" : null',
    '(document:focusin)': 'onDocumentFocusin($event)',
  },
})
export class AndesSidebar {
  protected readonly provider = inject(AndesSidebarProvider);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  readonly side = input<AndesSidebarSide>('start');
  readonly variant = input<AndesSidebarVariant>('sidebar');
  readonly collapsible = input<AndesSidebarCollapsible>('offcanvas');
  /** Accessible name of the sidebar region (and of the dialog on mobile). */
  readonly label = input('Sidebar');

  readonly id = `andes-sidebar-${nextSidebarId++}`;

  private readonly overlay = viewChild<ElementRef<HTMLElement>>('overlay');
  private restoreFocusTo: HTMLElement | null = null;

  protected readonly overlayOpen = computed(
    () => this.provider.isMobile() && this.provider.openMobile(),
  );

  constructor() {
    effect(() => {
      this.provider.collapsible.set(this.collapsible());
      this.provider.side.set(this.side());
      this.provider.variant.set(this.variant());
      this.provider.sidebarId.set(this.id);
    });

    let wasOpen = false;
    effect(() => {
      const open = this.overlayOpen();
      if (open === wasOpen) {
        return;
      }
      wasOpen = open;
      untracked(() => (open ? this.enterOverlay() : this.leaveOverlay()));
    });
  }

  protected close(): void {
    this.provider.setOpenMobile(false);
  }

  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const items = this.focusables();
    if (items.length === 0) {
      event.preventDefault();
      this.overlay()?.nativeElement.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = this.document.activeElement;
    if (
      event.shiftKey &&
      (active === first || active === this.overlay()?.nativeElement)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /** Focus that lands outside the open overlay (a script, a screen reader) is pulled back in. */
  protected onDocumentFocusin(event: FocusEvent): void {
    const panel = this.overlay()?.nativeElement;
    if (!this.overlayOpen() || !panel) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !panel.contains(target)) {
      (this.focusables()[0] ?? panel).focus();
    }
  }

  private focusables(): HTMLElement[] {
    const panel = this.overlay()?.nativeElement;
    return panel
      ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => !el.hasAttribute('hidden'),
        )
      : [];
  }

  private enterOverlay(): void {
    const active = this.document.activeElement;
    this.restoreFocusTo = active instanceof HTMLElement ? active : null;
    // Wait for the panel to lose `inert` before moving focus into it.
    afterNextRender(
      () => {
        if (this.overlayOpen()) {
          (this.focusables()[0] ?? this.overlay()?.nativeElement)?.focus();
        }
      },
      { injector: this.injector },
    );
  }

  private leaveOverlay(): void {
    const target = this.restoreFocusTo;
    this.restoreFocusTo = null;
    const panel = this.overlay()?.nativeElement;
    const active = this.document.activeElement;
    // Only take focus back if the user has not already moved it somewhere else on the page.
    const focusLost =
      !active ||
      active === this.document.body ||
      (panel !== undefined && panel.contains(active));
    if (target && target.isConnected && focusLost) {
      target.focus();
    }
  }
}
