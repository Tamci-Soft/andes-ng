import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  OnInit,
  PLATFORM_ID,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';

import { toCssLength } from './layout-sizes';

/** Whether the sidebar is open (`expanded`) or closed (`collapsed`). */
export type AndesSidebarState = 'expanded' | 'collapsed';
/** How a sidebar behaves when collapsed: shrink to an icon rail, slide out of view, or never collapse. */
export type AndesSidebarCollapsible = 'icon' | 'offcanvas' | 'none';
export type AndesSidebarSide = 'start' | 'end';
export type AndesSidebarVariant = 'sidebar' | 'floating' | 'inset';
/** What the sidebar currently looks like on a desktop viewport. */
export type AndesSidebarMode = 'expanded' | 'icon' | 'offcanvas';

let nextProviderId = 0;

/**
 * The state holder and layout root of an app shell: put an `andes-sidebar` and an
 * `andes-sidebar-inset` (the page) side by side inside it.
 *
 * - `open` is the two-way desktop state; `storageKey` persists it in `localStorage`.
 * - `Mod+B` (Ctrl or Cmd) toggles the sidebar; change the key with `shortcut`, or set it to an
 *   empty string to turn it off.
 * - Below `mobileBreakpoint` the sidebar becomes an overlay controlled by `openMobile`.
 * - `contained` keeps everything inside the provider's own box instead of the viewport - for a
 *   demo or an embedded preview. Give it a height.
 *
 * It also carries the stylesheet of the whole sidebar family (`andes-sidebar-*`), which are
 * only meant to be used inside it.
 */
@Component({
  selector: 'andes-sidebar-provider',
  template: '<ng-content />',
  styleUrl: './sidebar.css',
  // The family's rules target elements across component boundaries, which emulated
  // encapsulation cannot reach; every selector is prefixed with `andes-sidebar`.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-sidebar-provider',
    'data-slot': 'sidebar-provider',
    '[attr.data-state]': 'state()',
    '[attr.data-mode]': 'mode()',
    '[attr.data-mobile]': 'isMobile() ? "" : null',
    '[attr.data-contained]': 'contained() ? "" : null',
    '[attr.data-side]': 'side()',
    '[attr.data-variant]': 'variant()',
    '[style.--andes-sidebar-width]': 'widthVar()',
    '[style.--andes-sidebar-width-icon]': 'widthIconVar()',
    '[style.--andes-sidebar-width-mobile]': 'widthMobileVar()',
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class AndesSidebarProvider implements OnInit {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Desktop open state; false collapses the sidebar the way its `collapsible` says. */
  readonly open = model(true);
  /** Open state of the mobile overlay. */
  readonly openMobile = model(false);
  /** `localStorage` key that remembers `open` across visits; leave unset to not persist. */
  readonly storageKey = input<string | undefined>(undefined);
  /** Key that toggles the sidebar together with Ctrl/Cmd. Empty or null disables it. */
  readonly shortcut = input<string | null>('b');
  /** Below this viewport width (pixels) the sidebar is an overlay. */
  readonly mobileBreakpoint = input(768);
  readonly contained = input(false, { transform: booleanAttribute });
  readonly width = input<number | string | undefined>(undefined);
  readonly widthIcon = input<number | string | undefined>(undefined);
  readonly widthMobile = input<number | string | undefined>(undefined);

  /** True while the viewport is narrower than `mobileBreakpoint`. */
  readonly isMobile = signal(false);

  // Filled in by the registered sidebar.
  readonly collapsible = signal<AndesSidebarCollapsible>('offcanvas');
  readonly side = signal<AndesSidebarSide>('start');
  readonly variant = signal<AndesSidebarVariant>('sidebar');
  readonly sidebarId = signal<string | null>(null);

  readonly id = `andes-sidebar-provider-${nextProviderId++}`;

  readonly state = computed<AndesSidebarState>(() =>
    this.open() ? 'expanded' : 'collapsed',
  );

  /**
   * `expanded`, `icon` (collapsed to the icon rail) or `offcanvas` (collapsed out of view).
   * A sidebar that is not `collapsible`, and the mobile overlay, are always `expanded`.
   */
  readonly mode = computed<AndesSidebarMode>(() => {
    const collapsible = this.collapsible();
    if (
      collapsible === 'none' ||
      this.state() === 'expanded' ||
      this.isMobile()
    ) {
      return 'expanded';
    }
    return collapsible;
  });

  /** The open state that applies to the current viewport (overlay on mobile, desktop otherwise). */
  readonly expanded = computed(() =>
    this.isMobile() ? this.openMobile() : this.open(),
  );

  protected readonly widthVar = computed(() => this.cssVar(this.width()));
  protected readonly widthIconVar = computed(() =>
    this.cssVar(this.widthIcon()),
  );
  protected readonly widthMobileVar = computed(() =>
    this.cssVar(this.widthMobile()),
  );

  constructor() {
    effect((onCleanup) => {
      if (!this.isBrowser || typeof window.matchMedia !== 'function') {
        return;
      }
      const list = window.matchMedia(
        `(max-width: ${this.mobileBreakpoint() - 0.02}px)`,
      );
      const apply = (matches: boolean) =>
        untracked(() => {
          this.isMobile.set(matches);
          if (!matches) {
            this.openMobile.set(false);
          }
        });
      apply(list.matches);
      const listener = (event: MediaQueryListEvent) => apply(event.matches);
      list.addEventListener('change', listener);
      onCleanup(() => list.removeEventListener('change', listener));
    });

    effect(() => {
      const open = this.open();
      const key = untracked(() => this.storageKey());
      if (key && this.isBrowser) {
        this.write(key, open);
      }
    });
  }

  ngOnInit(): void {
    const key = this.storageKey();
    if (!key || !this.isBrowser) {
      return;
    }
    const stored = this.read(key);
    if (stored !== null) {
      this.open.set(stored);
    }
  }

  /** Opens or closes the sidebar for the current viewport: the overlay on mobile, `open` otherwise. */
  toggle(): void {
    if (this.isMobile()) {
      this.openMobile.update((value) => !value);
    } else {
      this.open.update((value) => !value);
    }
  }

  setOpen(open: boolean): void {
    this.open.set(open);
  }

  setOpenMobile(open: boolean): void {
    this.openMobile.set(open);
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    const key = this.shortcut();
    if (
      !key ||
      event.defaultPrevented ||
      event.altKey ||
      event.shiftKey ||
      !(event.metaKey || event.ctrlKey) ||
      event.key.toLowerCase() !== key.toLowerCase()
    ) {
      return;
    }
    event.preventDefault();
    this.toggle();
  }

  private cssVar(value: number | string | undefined): string | null {
    return value === undefined ? null : toCssLength(value);
  }

  private read(key: string): boolean | null {
    try {
      const value = localStorage.getItem(key);
      return value === 'true' ? true : value === 'false' ? false : null;
    } catch {
      return null;
    }
  }

  private write(key: string, open: boolean): void {
    try {
      localStorage.setItem(key, String(open));
    } catch {
      // Storage can be blocked or full; the sidebar still works for this visit.
    }
  }
}
