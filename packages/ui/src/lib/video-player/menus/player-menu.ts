import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  ANDES_OVERLAY_CLOSING_ATTRIBUTE,
  ANDES_OVERLAY_EXIT_TIMEOUT_MS,
  AndesListNavigation,
  AndesListNavigationItem,
  AndesListNavigationKeys,
} from '@andes-ng/primitives';

import { AndesPlayerStore } from '../core/player-store';
import {
  AndesPlayerIcon,
  type AndesPlayerIconName,
} from '../parts/player-icon';
import { AndesPlayerTooltip } from '../parts/player-tooltip';

/** What a menu offers: everything behind a settings button, or one list. */
export type AndesPlayerMenuType =
  'settings' | 'playback-rate' | 'captions' | 'audio' | 'quality';

/** A page of choices inside a menu. */
export type AndesPlayerMenuPage = Exclude<AndesPlayerMenuType, 'settings'>;

interface MenuOption {
  readonly key: string;
  readonly label: string;
  readonly checked: boolean;
  readonly select: () => void;
}

interface MenuEntry {
  readonly page: AndesPlayerMenuPage;
  readonly icon: AndesPlayerIconName;
  readonly label: string;
  readonly value: string;
}

const PAGE_ICONS: Record<
  AndesPlayerMenuPage | 'settings',
  AndesPlayerIconName
> = {
  settings: 'settings',
  'playback-rate': 'speed',
  captions: 'captions',
  audio: 'audio',
  quality: 'quality',
};

/** Room kept free above and below an open menu inside the player, in pixels. */
const MENU_MARGIN_PX = 64;

let nextMenuId = 0;

/**
 * A control-bar menu rendered inside the player (so it stays visible in fullscreen) as a
 * WAI-ARIA menu of `menuitemradio` choices. `type="settings"` gathers speed, captions, audio
 * track and quality as sub-pages with a back item; the other types show one list directly.
 *
 * Keyboard: Enter/Space/ArrowDown on the button open it with focus on the checked item;
 * arrows, Home/End and typeahead move; the inline-end arrow opens a sub-page and the
 * inline-start arrow goes back; Escape steps back, then closes and returns focus to the button;
 * Tab closes it. A menu with nothing to choose from hides itself.
 */
@Component({
  selector: 'andes-player-menu',
  imports: [
    AndesPlayerIcon,
    AndesPlayerTooltip,
    AndesListNavigationKeys,
    AndesListNavigationItem,
  ],
  templateUrl: './player-menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AndesListNavigation],
  host: {
    class: 'andes-player-control andes-player-menu',
    '[attr.data-type]': 'type()',
    '[attr.hidden]': 'available() ? null : ""',
  },
})
export class AndesPlayerMenu {
  protected readonly store = inject(AndesPlayerStore);
  private readonly navigation = inject(AndesListNavigation);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  readonly type = input<AndesPlayerMenuType>('settings');

  private readonly triggerRef =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly menuId = `andes-player-menu-${nextMenuId++}`;
  protected readonly isOpen = signal(false);
  /** Stays true through the exit animation. */
  protected readonly rendered = signal(false);
  protected readonly page = signal<AndesPlayerMenuPage | 'settings'>(
    'settings',
  );
  private exitToken = 0;
  private returnToPage: AndesPlayerMenuPage | null = null;

  protected readonly triggerIcon = computed(() => PAGE_ICONS[this.type()]);

  protected readonly triggerLabel = computed(() => this.pageTitle(this.type()));

  protected readonly entries = computed<MenuEntry[]>(() => {
    const store = this.store;
    const labels = store.labels();
    const entries: MenuEntry[] = [];
    if (store.qualities().length > 0) {
      entries.push({
        page: 'quality',
        icon: 'quality',
        label: labels.quality,
        value: store.autoQuality()
          ? store.qualityLabel('auto')
          : store.qualityLabel(store.activeQualityId()),
      });
    }
    if (store.audioTracks().length > 1) {
      const active = store
        .audioTracks()
        .find((track) => track.id === store.activeAudioTrackId());
      entries.push({
        page: 'audio',
        icon: 'audio',
        label: labels.audioTrack,
        value: active?.label ?? '',
      });
    }
    if (store.textTracks().length > 0) {
      entries.push({
        page: 'captions',
        icon: 'captions',
        label: labels.captions,
        value: store.activeTextTrack()?.label ?? labels.captionsOff,
      });
    }
    if (store.playbackRates().length > 1 && !store.isLive()) {
      entries.push({
        page: 'playback-rate',
        icon: 'speed',
        label: labels.playbackRate,
        value: store.rateLabel(store.playbackRate()),
      });
    }
    return entries;
  });

  protected readonly available = computed(() => {
    const type = this.type();
    if (type === 'settings') {
      return this.entries().length > 0;
    }
    return this.entries().some((entry) => entry.page === type);
  });

  protected readonly options = computed<MenuOption[]>(() => {
    const store = this.store;
    const labels = store.labels();
    switch (this.page()) {
      case 'playback-rate':
        return store.playbackRates().map((rate) => ({
          key: String(rate),
          label: store.rateLabel(rate),
          checked: Math.abs(rate - store.playbackRate()) < 1e-6,
          select: () => store.setPlaybackRate(rate, 'control'),
        }));
      case 'captions':
        return [
          {
            key: 'off',
            label: labels.captionsOff,
            checked: !store.captionsEnabled(),
            select: () => store.selectTextTrack(null, 'control'),
          },
          ...store.textTracks().map((track) => ({
            key: track.id,
            label: track.label,
            checked: track.id === store.activeTextTrackId(),
            select: () => store.selectTextTrack(track.id, 'control'),
          })),
        ];
      case 'audio':
        return store.audioTracks().map((track) => ({
          key: track.id,
          label: track.label,
          checked: track.id === store.activeAudioTrackId(),
          select: () => store.selectAudioTrack(track.id, 'control'),
        }));
      case 'quality':
        return [
          {
            key: 'auto',
            label: store.qualityLabel('auto'),
            checked: store.autoQuality(),
            select: () => store.selectQuality('auto', 'control'),
          },
          ...[...store.qualities()]
            .sort(
              (a, b) =>
                (b.height ?? b.bitrate ?? 0) - (a.height ?? a.bitrate ?? 0),
            )
            .map((rendition) => ({
              key: rendition.id,
              label: store.renditionLabel(rendition),
              checked:
                !store.autoQuality() &&
                rendition.id === store.activeQualityId(),
              select: () => store.selectQuality(rendition.id, 'control'),
            })),
        ];
      default:
        return [];
    }
  });

  protected readonly maxHeight = computed(() => {
    const height = this.store.containerHeight();
    return height > 0 ? Math.max(120, height - MENU_MARGIN_PX * 1.5) : null;
  });

  constructor() {
    this.navigation.configure({ orientation: 'vertical', wrap: true });
    this.navigation.tabOut.subscribe(() => this.close(false));

    // Clicks outside the menu close it.
    effect((onCleanup) => {
      if (!this.isOpen()) {
        return;
      }
      const onPointerDown = (event: Event) => {
        const path = event.composedPath?.() ?? [];
        if (!path.includes(this.host.nativeElement)) {
          untracked(() => this.close(false));
        }
      };
      this.document.addEventListener('pointerdown', onPointerDown, true);
      onCleanup(() =>
        this.document.removeEventListener('pointerdown', onPointerDown, true),
      );
    });

    // A menu whose choices disappear (source changed) closes.
    effect(() => {
      if (!this.available() && untracked(() => this.isOpen())) {
        untracked(() => this.close(false));
      }
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.isOpen()) {
        this.store.setMenuOpen(false);
      }
    });
  }

  /** Opens the menu with focus on the checked item. */
  open(): void {
    if (this.isOpen() || !this.available()) {
      return;
    }
    this.exitToken++;
    this.panelRef()?.nativeElement.removeAttribute(
      ANDES_OVERLAY_CLOSING_ATTRIBUTE,
    );
    this.page.set(this.type());
    this.isOpen.set(true);
    this.rendered.set(true);
    this.store.setMenuOpen(true);
    this.focusChecked();
  }

  /** Closes the menu; `restoreFocus` returns focus to the button. */
  close(restoreFocus = true): void {
    if (!this.isOpen()) {
      return;
    }
    this.isOpen.set(false);
    this.store.setMenuOpen(false);
    this.navigation.clearActive();
    if (restoreFocus) {
      this.triggerRef().nativeElement.focus();
    }
    this.runExit();
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.open();
    }
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    const rtl = this.isRtl();
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (this.canGoBack()) {
        this.back();
      } else {
        this.close();
      }
      return;
    }
    if (event.key === backward && this.canGoBack()) {
      event.preventDefault();
      this.back();
      return;
    }
    if (event.key === forward && this.page() === 'settings') {
      const active = this.navigation.activeItem()?.element;
      const page = active?.getAttribute(
        'data-page',
      ) as AndesPlayerMenuPage | null;
      if (page) {
        event.preventDefault();
        this.openPage(page);
      }
    }
  }

  protected openPage(page: AndesPlayerMenuPage): void {
    this.returnToPage = page;
    this.page.set(page);
    this.focusChecked();
  }

  protected canGoBack(): boolean {
    return this.type() === 'settings' && this.page() !== 'settings';
  }

  protected back(): void {
    this.page.set('settings');
    this.focusItem((items) =>
      items.findIndex(
        (item) => item.element.getAttribute('data-page') === this.returnToPage,
      ),
    );
  }

  protected choose(option: MenuOption): void {
    option.select();
    if (this.canGoBack()) {
      this.back();
    } else {
      this.close();
    }
  }

  protected pageTitle(page: AndesPlayerMenuType): string {
    const labels = this.store.labels();
    switch (page) {
      case 'playback-rate':
        return labels.playbackRate;
      case 'captions':
        return labels.captions;
      case 'audio':
        return labels.audioTrack;
      case 'quality':
        return labels.quality;
      default:
        return labels.settings;
    }
  }

  private focusChecked(): void {
    this.focusItem((items) =>
      items.findIndex(
        (item) => item.element.getAttribute('aria-checked') === 'true',
      ),
    );
  }

  /** After the page renders, focuses the item the picker returns (or the first one). */
  private focusItem(
    pick: (items: readonly { element: HTMLElement }[]) => number,
  ): void {
    afterNextRender(
      () => {
        if (!this.isOpen()) {
          return;
        }
        const items = this.navigation.items();
        const index = pick(items);
        this.navigation.focusItem(index >= 0 ? index : 0);
      },
      { injector: this.injector },
    );
  }

  /**
   * The overlay exit contract: mark the panel closing, let its exit animation run (capped), then
   * remove it. Instant under reduced motion or where animations cannot be observed.
   */
  private runExit(): void {
    const panel = this.panelRef()?.nativeElement;
    const token = ++this.exitToken;
    const finish = () => {
      if (token === this.exitToken) {
        this.rendered.set(false);
      }
    };
    if (
      !panel ||
      this.store.reducedMotion() ||
      typeof panel.getAnimations !== 'function' ||
      typeof requestAnimationFrame !== 'function'
    ) {
      finish();
      return;
    }
    panel.setAttribute(ANDES_OVERLAY_CLOSING_ATTRIBUTE, '');
    requestAnimationFrame(() => {
      if (token !== this.exitToken) {
        return;
      }
      const running = panel
        .getAnimations({ subtree: true })
        .filter((animation) => animation.playState === 'running');
      if (running.length === 0) {
        finish();
        return;
      }
      const timeout = new Promise<void>((resolve) =>
        setTimeout(resolve, ANDES_OVERLAY_EXIT_TIMEOUT_MS),
      );
      void Promise.race([
        Promise.all(running.map((animation) => animation.finished)),
        timeout,
      ])
        .catch(() => undefined)
        .then(finish);
    });
  }

  private isRtl(): boolean {
    try {
      return (
        this.document.defaultView?.getComputedStyle(this.host.nativeElement)
          .direction === 'rtl'
      );
    } catch {
      return false;
    }
  }
}
