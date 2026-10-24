import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';

import { AndesSidebarProvider } from './sidebar-provider';

export type AndesSidebarMenuButtonSize = 'sm' | 'md' | 'lg';
export type AndesSidebarMenuButtonVariant = 'default' | 'outline';

let nextTooltipId = 0;

/**
 * An entry of a sidebar menu: a `<button>`, or an `<a>` when `href` is set. Project an icon and a
 * label; the label is clipped while the sidebar is collapsed to icons, where `tooltip` shows it on
 * hover and keyboard focus (its text should match the label).
 *
 * `active` highlights the current page and sets `aria-current="page"` on links.
 */
@Component({
  selector: 'andes-sidebar-menu-button',
  imports: [NgTemplateOutlet],
  templateUrl: './sidebar-menu-button.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-sidebar-menu-button',
    'data-slot': 'sidebar-menu-button',
    // Forwarded to the real control; the host is not interactive.
    '[attr.aria-label]': 'null',
  },
})
export class AndesSidebarMenuButton {
  private readonly provider = inject(AndesSidebarProvider);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly href = input<string | undefined>(undefined);
  readonly target = input<string | undefined>(undefined);
  readonly active = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly size = input<AndesSidebarMenuButtonSize>('md');
  readonly variant = input<AndesSidebarMenuButtonVariant>('default');
  /** Text shown beside the icon rail while collapsed. */
  readonly tooltip = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  protected readonly tipId = `andes-sidebar-tooltip-${nextTooltipId++}`;
  protected readonly tipOpen = signal(false);
  protected readonly tipTop = signal(0);
  protected readonly tipLeft = signal(0);
  protected readonly tipEnd = signal(false);

  /** The tooltip only exists while the label is clipped: on desktop, collapsed to icons. */
  protected readonly tipVisible = computed(
    () =>
      this.tipOpen() &&
      !!this.tooltip() &&
      this.provider.mode() === 'icon' &&
      !this.provider.isMobile(),
  );

  protected showTip(event: Event): void {
    if (this.provider.mode() !== 'icon' || !this.tooltip()) {
      return;
    }
    // Pointer hover always shows; focus only when it came from the keyboard.
    const target = event.target as HTMLElement;
    if (event.type === 'focusin' && !target.matches(':focus-visible')) {
      return;
    }
    const rect = this.host.nativeElement.getBoundingClientRect();
    const rtl = getComputedStyle(this.host.nativeElement).direction === 'rtl';
    // The tooltip opens away from the screen edge the sidebar is attached to.
    const toRight = (this.provider.side() === 'start') !== rtl;
    this.tipEnd.set(!toRight);
    this.tipLeft.set(toRight ? rect.right + 8 : rect.left - 8);
    this.tipTop.set(rect.top + rect.height / 2);
    this.tipOpen.set(true);
  }

  protected hideTip(): void {
    this.tipOpen.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.tipOpen()) {
      this.hideTip();
    }
  }
}
