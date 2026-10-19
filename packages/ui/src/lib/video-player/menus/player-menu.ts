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

import {
  ANDES_CAPTION_COLORS,
  ANDES_CAPTION_EDGES,
  ANDES_CAPTION_FONTS,
  ANDES_CAPTION_OPACITIES,
  ANDES_CAPTION_SIZES,
  captionColorValue,
  isCustomCaptionStyle,
} from '../core/caption-style';
import { AndesPlayerStore } from '../core/player-store';
import type {
  AndesCaptionStyle,
  AndesPlayerRepeat,
} from '../core/player-types';
import { playlistItemKey } from '../core/playlist';
import { formatClock } from '../core/time-format';
import {
  AndesPlayerIcon,
  type AndesPlayerIconName,
} from '../parts/player-icon';
import { AndesPlayerTooltip } from '../parts/player-tooltip';

/** What a menu offers: everything behind a settings button, or one list. */
export type AndesPlayerMenuType =
  | 'settings'
  | 'playback-rate'
  | 'captions'
  | 'caption-style'
  | 'audio'
  | 'quality'
  | 'repeat'
  | 'shuffle'
  | 'playlist';

/** A caption appearance field with its own page under `caption-style`. */
export type AndesCaptionStyleField = keyof AndesCaptionStyle;

/** A page of choices inside a menu. */
export type AndesPlayerMenuPage =
  | Exclude<AndesPlayerMenuType, 'settings'>
  | `caption-style.${AndesCaptionStyleField}`;

type Page = AndesPlayerMenuPage | 'settings';

/** One row of a page: a link to a sub-page, a radio choice, or a plain action. */
type MenuItem =
  | {
      readonly kind: 'entry';
      readonly key: string;
      readonly page: AndesPlayerMenuPage;
      readonly icon: AndesPlayerIconName | null;
      readonly label: string;
      readonly value: string;
    }
  | {
      readonly kind: 'option';
      readonly key: string;
      readonly label: string;
      readonly value?: string;
      /** A colour sample shown before the label (caption colours). */
      readonly swatch?: string;
      readonly checked: boolean;
      readonly select: () => void;
    }
  | {
      readonly kind: 'action';
      readonly key: string;
      readonly label: string;
      readonly icon: AndesPlayerIconName | null;
      readonly run: () => void;
    };

const PAGE_ICONS: Record<AndesPlayerMenuType, AndesPlayerIconName> = {
  settings: 'settings',
  'playback-rate': 'speed',
  captions: 'captions',
  'caption-style': 'text-size',
  audio: 'audio',
  quality: 'quality',
  repeat: 'repeat',
  shuffle: 'shuffle',
  playlist: 'playlist',
};

const CAPTION_FIELDS: readonly AndesCaptionStyleField[] = [
  'size',
  'color',
  'background',
  'backgroundOpacity',
  'edge',
  'font',
];

/** Room kept free above and below an open menu inside the player, in pixels. */
const MENU_MARGIN_PX = 64;

let nextMenuId = 0;

/**
 * A control-bar menu rendered inside the player (so it stays visible in fullscreen) as a
 * WAI-ARIA menu of `menuitemradio` choices. `type="settings"` gathers quality, audio track,
 * captions, caption style, speed, loop/repeat and shuffle as sub-pages with a back item
 * (caption style nests one more level, one page per field); the other types show one list
 * directly (`playlist` lists the entries).
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
  /** Pages from the menu's own one to the page shown. */
  private readonly stack = signal<readonly Page[]>(['settings']);
  protected readonly page = computed(() => {
    const stack = this.stack();
    return stack[stack.length - 1];
  });
  protected readonly canGoBack = computed(() => this.stack().length > 1);
  private exitToken = 0;

  protected readonly triggerIcon = computed(() => PAGE_ICONS[this.type()]);
  protected readonly triggerLabel = computed(() => this.pageTitle(this.type()));

  /** The settings page: one entry per page that has something to choose. */
  private readonly settingsEntries = computed<MenuItem[]>(() => {
    const store = this.store;
    const labels = store.labels();
    const entries: MenuItem[] = [];
    const entry = (
      page: AndesPlayerMenuPage,
      label: string,
      value: string,
    ): MenuItem => ({
      kind: 'entry',
      key: page,
      page,
      icon: PAGE_ICONS[page as AndesPlayerMenuType],
      label,
      value,
    });
    if (store.qualities().length > 0) {
      entries.push(
        entry(
          'quality',
          labels.quality,
          store.autoQuality()
            ? store.qualityLabel('auto')
            : store.qualityLabel(store.activeQualityId()),
        ),
      );
    }
    if (store.audioTracks().length > 1) {
      const active = store
        .audioTracks()
        .find((track) => track.id === store.activeAudioTrackId());
      entries.push(entry('audio', labels.audioTrack, active?.label ?? ''));
    }
    if (store.textTracks().length > 0) {
      entries.push(
        entry(
          'captions',
          labels.captions,
          store.activeTextTrack()?.label ?? labels.captionsOff,
        ),
      );
      entries.push(
        entry(
          'caption-style',
          labels.captionStyle,
          isCustomCaptionStyle(store.captionStyle())
            ? ''
            : labels.captionDefault,
        ),
      );
    }
    if (store.playbackRates().length > 1 && !store.isLive()) {
      entries.push(
        entry(
          'playback-rate',
          labels.playbackRate,
          store.rateLabel(store.playbackRate()),
        ),
      );
    }
    if (!store.isLive() && store.source()) {
      entries.push(
        entry(
          'repeat',
          store.playlist().length > 1 ? labels.repeat : labels.loop,
          store.repeatLabel(store.repeat()),
        ),
      );
    }
    if (store.playlist().length > 2) {
      entries.push(
        entry(
          'shuffle',
          labels.shuffle,
          store.shuffle() ? labels.on : labels.off,
        ),
      );
    }
    return entries;
  });

  protected readonly available = computed(() => {
    const type = this.type();
    if (type === 'settings') {
      return this.settingsEntries().length > 0;
    }
    if (type === 'playlist') {
      return this.store.playlist().length > 1;
    }
    return this.settingsEntries().some(
      (item) => item.kind === 'entry' && item.page === type,
    );
  });

  /** The rows of the page shown. */
  protected readonly items = computed<MenuItem[]>(() =>
    this.itemsFor(this.page()),
  );
  /** Whether the page is a list of radio choices (they get a labelled group). */
  protected readonly radioPage = computed(() =>
    this.items().some((item) => item.kind === 'option'),
  );

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
    this.stack.set([this.type()]);
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
    if (event.key === forward) {
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
    this.stack.update((stack) => [...stack, page]);
    this.focusChecked();
  }

  protected back(): void {
    const left = this.page();
    this.stack.update((stack) => stack.slice(0, -1));
    this.focusItem((items) =>
      items.findIndex(
        (item) => item.element.getAttribute('data-page') === left,
      ),
    );
  }

  protected choose(item: MenuItem): void {
    if (item.kind === 'entry') {
      this.openPage(item.page);
      return;
    }
    if (item.kind === 'action') {
      item.run();
      // An action keeps the page open (reset shows its effect in the values).
      return;
    }
    item.select();
    if (this.canGoBack()) {
      this.back();
    } else {
      this.close();
    }
  }

  protected pageTitle(page: Page | AndesPlayerMenuType): string {
    const labels = this.store.labels();
    switch (page) {
      case 'playback-rate':
        return labels.playbackRate;
      case 'captions':
        return labels.captions;
      case 'caption-style':
        return labels.captionStyle;
      case 'audio':
        return labels.audioTrack;
      case 'quality':
        return labels.quality;
      case 'repeat':
        return this.store.playlist().length > 1 ? labels.repeat : labels.loop;
      case 'shuffle':
        return labels.shuffle;
      case 'playlist':
        return labels.playlist;
      case 'settings':
        return labels.settings;
      default:
        return this.fieldTitle(
          page.slice('caption-style.'.length) as AndesCaptionStyleField,
        );
    }
  }

  private fieldTitle(field: AndesCaptionStyleField): string {
    const labels = this.store.labels();
    const titles: Record<AndesCaptionStyleField, string> = {
      size: labels.captionSize,
      color: labels.captionColor,
      background: labels.captionBackground,
      backgroundOpacity: labels.captionOpacity,
      edge: labels.captionEdge,
      font: labels.captionFont,
    };
    return titles[field];
  }

  /** The visible value of a caption field (`Default` while the theme decides). */
  private fieldValue(field: AndesCaptionStyleField): string {
    const labels = this.store.labels();
    const style = this.store.captionStyle();
    switch (field) {
      case 'size':
        return style.size === null
          ? labels.captionDefault
          : labels.percent(style.size);
      case 'color':
      case 'background': {
        const color = style[field];
        return color === null ? labels.captionDefault : labels.colors[color];
      }
      case 'backgroundOpacity':
        return style.backgroundOpacity === null
          ? labels.captionDefault
          : labels.percent(style.backgroundOpacity);
      case 'edge':
        return style.edge === null
          ? labels.captionDefault
          : labels.edges[style.edge];
      case 'font':
        return style.font === null
          ? labels.captionDefault
          : labels.fonts[style.font];
    }
  }

  private itemsFor(page: Page): MenuItem[] {
    const store = this.store;
    const labels = store.labels();
    switch (page) {
      case 'settings':
        return this.settingsEntries();
      case 'playback-rate':
        return store.playbackRates().map((rate) => ({
          kind: 'option',
          key: String(rate),
          label: store.rateLabel(rate),
          checked: Math.abs(rate - store.playbackRate()) < 1e-6,
          select: () => store.setPlaybackRate(rate, 'control'),
        }));
      case 'captions':
        return [
          {
            kind: 'option',
            key: 'off',
            label: labels.captionsOff,
            checked: !store.captionsEnabled(),
            select: () => store.selectTextTrack(null, 'control'),
          },
          ...store.textTracks().map((track): MenuItem => ({
            kind: 'option',
            key: track.id,
            label: track.label,
            checked: track.id === store.activeTextTrackId(),
            select: () => store.selectTextTrack(track.id, 'control'),
          })),
        ];
      case 'caption-style':
        return [
          ...CAPTION_FIELDS.map((field): MenuItem => ({
            kind: 'entry',
            key: field,
            page: `caption-style.${field}`,
            icon: null,
            label: this.fieldTitle(field),
            value: this.fieldValue(field),
          })),
          {
            kind: 'action',
            key: 'reset',
            label: labels.resetCaptionStyle,
            icon: 'replay',
            run: () => store.resetCaptionStyle(),
          },
        ];
      case 'audio':
        return store.audioTracks().map((track) => ({
          kind: 'option',
          key: track.id,
          label: track.label,
          checked: track.id === store.activeAudioTrackId(),
          select: () => store.selectAudioTrack(track.id, 'control'),
        }));
      case 'quality':
        return [
          {
            kind: 'option',
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
            .map((rendition): MenuItem => ({
              kind: 'option',
              key: rendition.id,
              label: store.renditionLabel(rendition),
              checked:
                !store.autoQuality() &&
                rendition.id === store.activeQualityId(),
              select: () => store.selectQuality(rendition.id, 'control'),
            })),
        ];
      case 'repeat': {
        const modes: AndesPlayerRepeat[] =
          store.playlist().length > 1 ? ['off', 'all', 'one'] : ['off', 'one'];
        return modes.map((mode) => ({
          kind: 'option',
          key: mode,
          label: store.repeatLabel(mode),
          checked: store.repeat() === mode,
          select: () => store.setRepeat(mode, 'control'),
        }));
      }
      case 'shuffle':
        return [false, true].map((on) => ({
          kind: 'option',
          key: on ? 'on' : 'off',
          label: on ? labels.on : labels.off,
          checked: store.shuffle() === on,
          select: () => store.setShuffle(on, 'control'),
        }));
      case 'playlist':
        return store.playlist().map((item, index) => ({
          kind: 'option',
          key: playlistItemKey(item, index),
          label: item.title ?? item.metadata?.title ?? `${index + 1}`,
          value:
            item.duration !== undefined && Number.isFinite(item.duration)
              ? formatClock(item.duration)
              : undefined,
          checked: index === store.playlistIndex(),
          select: () => store.selectItem(index, 'control'),
        }));
      default:
        return this.fieldOptions(
          page.slice('caption-style.'.length) as AndesCaptionStyleField,
        );
    }
  }

  /** The choices of one caption field: the theme's default first, then the fixed values. */
  private fieldOptions(field: AndesCaptionStyleField): MenuItem[] {
    const store = this.store;
    const labels = store.labels();
    const current = store.captionStyle()[field];
    const option = (
      value: AndesCaptionStyle[typeof field],
      label: string,
      swatch?: string,
    ): MenuItem => ({
      kind: 'option',
      key: String(value),
      label,
      swatch,
      checked: current === value,
      select: () => store.setCaptionStyle({ [field]: value }),
    });
    const values: MenuItem[] = [option(null, labels.captionDefault)];
    switch (field) {
      case 'size':
        ANDES_CAPTION_SIZES.forEach((size) =>
          values.push(option(size, labels.percent(size))),
        );
        break;
      case 'color':
      case 'background':
        ANDES_CAPTION_COLORS.forEach((color) =>
          values.push(
            option(color, labels.colors[color], captionColorValue(color)),
          ),
        );
        break;
      case 'backgroundOpacity':
        ANDES_CAPTION_OPACITIES.forEach((opacity) =>
          values.push(option(opacity, labels.percent(opacity))),
        );
        break;
      case 'edge':
        ANDES_CAPTION_EDGES.forEach((edge) =>
          values.push(option(edge, labels.edges[edge])),
        );
        break;
      case 'font':
        ANDES_CAPTION_FONTS.forEach((font) =>
          values.push(option(font, labels.fonts[font])),
        );
        break;
    }
    return values;
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
