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
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  AndesListNavigation,
  AndesListNavigationItem,
  AndesListNavigationKeys,
} from '@andes-ng/primitives';

import {
  type AndesPlayerHotkeyAction,
  displayKey,
} from '../core/player-hotkeys';
import { AndesPlayerStore } from '../core/player-store';
import { formatTimeText } from '../core/time-format';
import { AndesPlayerIcon, type AndesPlayerIconName } from './player-icon';

let nextOverlayId = 0;

/**
 * "Continue watching?" after a source loads with a saved position (`persistKey` with
 * `resume="prompt"`): resume from the saved time, or start over. Playing any other way
 * dismisses it, and it never takes focus.
 */
@Component({
  selector: 'andes-player-resume',
  imports: [AndesPlayerIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-resume',
    '[attr.hidden]': 'store.resumeOffer() === null ? "" : null',
  },
  template: `
    @if (store.resumeOffer(); as offer) {
      <div
        class="andes-player-resume__card"
        data-slot="resume"
        role="group"
        [attr.aria-labelledby]="titleId"
      >
        <p class="andes-player-resume__title" [id]="titleId">
          {{ store.labels().resumeTitle }}
        </p>
        <div class="andes-player-resume__actions">
          <button
            type="button"
            class="andes-player-pill andes-player-pill--primary"
            data-slot="resume-accept"
            (click)="store.acceptResume()"
          >
            <andes-player-icon name="play" />
            {{ resumeLabel(offer) }}
          </button>
          <button
            type="button"
            class="andes-player-pill"
            data-slot="resume-decline"
            (click)="store.declineResume()"
          >
            <andes-player-icon name="replay" />
            {{ store.labels().startOver }}
          </button>
        </div>
      </div>
    }
  `,
})
export class AndesPlayerResumePrompt {
  protected readonly store = inject(AndesPlayerStore);
  protected readonly titleId = `andes-player-resume-${nextOverlayId++}`;

  protected resumeLabel(offer: number): string {
    const labels = this.store.labels();
    return labels.resumeFrom(formatTimeText(offer, labels));
  }
}

/** Groups of the keyboard help, in reading order. */
const SHORTCUT_ROWS: readonly AndesPlayerHotkeyAction[][] = [
  ['togglePlay', 'toggleMute', 'toggleFullscreen', 'togglePictureInPicture'],
  [
    'seekBackward',
    'seekForward',
    'seekBackwardLarge',
    'seekForwardLarge',
    'seekToStart',
    'seekToEnd',
    'seekToPercent',
    'previousFrame',
    'nextFrame',
    'previousChapter',
    'nextChapter',
  ],
  [
    'volumeUp',
    'volumeDown',
    'slower',
    'faster',
    'toggleCaptions',
    'previousItem',
    'nextItem',
    'showShortcuts',
  ],
];

/**
 * The keyboard help (`?`): every shortcut of the live key map that applies to this media,
 * drawn inside the player so it also works in fullscreen. A non-modal dialog: focus moves to
 * its close button, Escape or the close button dismiss it and return focus where it was, and
 * tabbing out of it simply closes it (it never traps focus).
 */
@Component({
  selector: 'andes-player-shortcuts',
  imports: [AndesPlayerIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-shortcuts',
    '[attr.hidden]': 'store.shortcutsOpen() ? null : ""',
  },
  template: `
    @if (store.shortcutsOpen()) {
      <div
        #dialog
        class="andes-player-shortcuts__dialog"
        data-slot="shortcuts"
        role="dialog"
        [attr.aria-labelledby]="titleId"
        (keydown.escape)="onEscape($event)"
        (focusout)="onFocusOut($event)"
      >
        <div class="andes-player-shortcuts__header">
          <h2 class="andes-player-shortcuts__title" [id]="titleId">
            <andes-player-icon name="keyboard" />
            {{ store.labels().keyboardShortcuts }}
          </h2>
          <button
            #close
            type="button"
            class="andes-player-button"
            data-slot="shortcuts-close"
            [attr.aria-label]="store.labels().close"
            (click)="dismiss()"
          >
            <andes-player-icon name="close" />
          </button>
        </div>
        <div class="andes-player-shortcuts__body">
          @for (group of groups(); track $index) {
            <dl class="andes-player-shortcuts__group">
              @for (row of group; track row.action) {
                <div class="andes-player-shortcuts__row">
                  <dt class="andes-player-shortcuts__keys">
                    @for (key of row.keys; track key) {
                      <kbd>{{ key }}</kbd>
                    }
                  </dt>
                  <dd class="andes-player-shortcuts__action">
                    {{ row.label }}
                  </dd>
                </div>
              }
            </dl>
          }
        </div>
      </div>
    }
  `,
})
export class AndesPlayerShortcuts {
  protected readonly store = inject(AndesPlayerStore);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly closeRef = viewChild<ElementRef<HTMLButtonElement>>('close');
  private readonly dialogRef = viewChild<ElementRef<HTMLElement>>('dialog');
  protected readonly titleId = `andes-player-shortcuts-${nextOverlayId++}`;
  private returnFocus: HTMLElement | null = null;

  /** The rows that apply now: actions with keys, minus playlist/chapter/PiP rows without them. */
  protected readonly groups = computed(() => {
    const store = this.store;
    const keyMap = store.keyMap();
    const labels = store.labels();
    const applies = (action: AndesPlayerHotkeyAction) => {
      switch (action) {
        case 'previousItem':
        case 'nextItem':
          return store.playlist().length > 1;
        case 'previousChapter':
        case 'nextChapter':
          return store.chapters().length > 0;
        case 'togglePictureInPicture':
          return store.pictureInPictureSupported();
        case 'toggleFullscreen':
          return store.fullscreenSupported();
        case 'toggleCaptions':
          return store.textTracks().length > 0;
        default:
          return true;
      }
    };
    return SHORTCUT_ROWS.map((group) =>
      group
        .filter(
          (action) => (keyMap[action] ?? []).length > 0 && applies(action),
        )
        .map((action) => ({
          action,
          label: labels.hotkeyActions[action],
          keys:
            action === 'seekToPercent'
              ? ['0–9']
              : keyMap[action].map((key) => displayKey(key)),
        })),
    ).filter((group) => group.length > 0);
  });

  constructor() {
    effect(() => {
      if (!this.store.shortcutsOpen()) {
        return;
      }
      untracked(() => {
        const active = this.document.activeElement as HTMLElement | null;
        this.returnFocus =
          active && active !== this.document.body ? active : null;
        afterNextRender(() => this.closeRef()?.nativeElement.focus(), {
          injector: this.injector,
        });
      });
    });
    inject(DestroyRef).onDestroy(() => this.store.closeShortcuts());
  }

  protected onEscape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.dismiss();
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && !this.dialogRef()?.nativeElement.contains(next)) {
      // Tabbing away closes it; focus goes where the viewer sent it.
      this.returnFocus = null;
      this.store.closeShortcuts();
    }
  }

  /** Closes the dialog and returns focus to where it was before it opened. */
  dismiss(): void {
    const target = this.returnFocus ?? this.store.container();
    this.returnFocus = null;
    this.store.closeShortcuts();
    target?.focus?.({ preventScroll: true });
  }
}

interface ContextItem {
  readonly key: string;
  readonly label: string;
  readonly icon: AndesPlayerIconName;
  /** `true`/`false` for a checkbox item (loop), `null` for a plain one. */
  readonly checked: boolean | null;
  readonly run: () => void;
}

/** Room kept between the context menu and the player's edges, pixels. */
const CONTEXT_MARGIN_PX = 8;

/**
 * The player's own context menu (right click, or Shift+F10 / the menu key while the player is
 * focused): loop, copy the address (also at the current time), picture-in-picture and the
 * keyboard help. A WAI-ARIA menu drawn inside the player. A second right click while it is
 * open lets the browser's own menu through, so nothing the browser offers is lost.
 */
@Component({
  selector: 'andes-player-context-menu',
  imports: [AndesPlayerIcon, AndesListNavigationKeys, AndesListNavigationItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AndesListNavigation],
  host: { class: 'andes-player-context-menu' },
  template: `
    @if (position(); as at) {
      <div
        #panel
        class="andes-player-menu__panel andes-player-context-menu__panel"
        data-slot="context-menu"
        role="menu"
        tabindex="-1"
        andesListNavigationKeys
        [attr.aria-label]="store.labels().playerOptions"
        [style.left.px]="at.x"
        [style.top.px]="at.y"
        (keydown)="onKeydown($event)"
      >
        @for (item of items(); track item.key) {
          <button
            type="button"
            class="andes-player-menu__item"
            data-slot="context-menu-item"
            andesListNavigationItem
            [attr.role]="
              item.checked === null ? 'menuitem' : 'menuitemcheckbox'
            "
            [attr.aria-checked]="item.checked"
            [attr.data-key]="item.key"
            [typeaheadLabel]="item.label"
            (click)="choose(item)"
          >
            <andes-player-icon [name]="item.icon" />
            <span class="andes-player-menu__label">{{ item.label }}</span>
            @if (item.checked) {
              <andes-player-icon
                name="check"
                class="andes-player-menu__check"
              />
            }
          </button>
        }
      </div>
    }
  `,
})
export class AndesPlayerContextMenu {
  protected readonly store = inject(AndesPlayerStore);
  private readonly navigation = inject(AndesListNavigation);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');

  /** Where the menu is open, in pixels from the player's top-left corner. */
  protected readonly position = signal<{ x: number; y: number } | null>(null);
  private returnFocus: HTMLElement | null = null;

  protected readonly items = computed<ContextItem[]>(() => {
    const store = this.store;
    const labels = store.labels();
    const items: ContextItem[] = [];
    if (!store.isLive() && store.source()) {
      items.push({
        key: 'loop',
        label: labels.loop,
        icon: 'repeat',
        checked: store.repeat() === 'one',
        run: () =>
          store.setRepeat(store.repeat() === 'one' ? 'off' : 'one', 'control'),
      });
    }
    if (store.source()) {
      items.push({
        key: 'copy-link',
        label: labels.copyLink,
        icon: 'link',
        checked: null,
        run: () => void store.copyLink(false),
      });
      if (store.canSeek() && !store.isLive()) {
        items.push({
          key: 'copy-link-time',
          label: labels.copyLinkAtTime,
          icon: 'link',
          checked: null,
          run: () => void store.copyLink(true),
        });
      }
    }
    if (store.pictureInPictureSupported()) {
      items.push({
        key: 'pip',
        label: store.pictureInPicture()
          ? labels.exitPictureInPicture
          : labels.enterPictureInPicture,
        icon: store.pictureInPicture() ? 'pip-exit' : 'pip',
        checked: null,
        run: () => void store.togglePictureInPicture('control'),
      });
    }
    items.push({
      key: 'shortcuts',
      label: labels.keyboardShortcuts,
      icon: 'keyboard',
      checked: null,
      run: () => store.openShortcuts(),
    });
    return items;
  });

  constructor() {
    this.navigation.configure({ orientation: 'vertical', wrap: true });
    this.navigation.tabOut.subscribe(() => this.close(false));

    effect((onCleanup) => {
      if (!this.position()) {
        return;
      }
      const onPointerDown = (event: Event) => {
        const panel = this.panelRef()?.nativeElement;
        if (panel && !(event.composedPath?.() ?? []).includes(panel)) {
          untracked(() => this.close(false));
        }
      };
      const onScroll = () => untracked(() => this.close(false));
      this.document.addEventListener('pointerdown', onPointerDown, true);
      this.document.addEventListener('scroll', onScroll, true);
      onCleanup(() => {
        this.document.removeEventListener('pointerdown', onPointerDown, true);
        this.document.removeEventListener('scroll', onScroll, true);
      });
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.position()) {
        this.store.setMenuOpen(false);
      }
    });
  }

  /** Whether the menu is open. */
  isOpen(): boolean {
    return this.position() !== null;
  }

  /**
   * Opens the menu at a point in the player (pixels from its top-left corner), kept inside the
   * player's box, with focus on the first item.
   */
  openAt(x: number, y: number): void {
    const width = this.store.containerWidth();
    const height = this.store.containerHeight();
    // A typical panel size keeps it inside before it renders; the real size corrects it below.
    const fit = (value: number, size: number, room: number) =>
      Math.max(
        CONTEXT_MARGIN_PX,
        Math.min(value, room - size - CONTEXT_MARGIN_PX),
      );
    const active = this.document.activeElement as HTMLElement | null;
    this.returnFocus = active && active !== this.document.body ? active : null;
    const wasOpen = this.isOpen();
    this.position.set({
      x: width > 0 ? fit(x, 216, width) : x,
      y: height > 0 ? fit(y, 160, height) : y,
    });
    if (!wasOpen) {
      this.store.setMenuOpen(true);
    }
    afterNextRender(
      () => {
        const panel = this.panelRef()?.nativeElement;
        const rect = panel?.getBoundingClientRect?.();
        if (panel && rect && rect.width > 0 && width > 0 && height > 0) {
          this.position.set({
            x: fit(x, rect.width, width),
            y: fit(y, rect.height, height),
          });
        }
        this.navigation.focusItem(0);
      },
      { injector: this.injector },
    );
  }

  /** Closes the menu; `restoreFocus` returns focus to where it was. */
  close(restoreFocus = true): void {
    if (!this.isOpen()) {
      return;
    }
    this.position.set(null);
    this.navigation.clearActive();
    this.store.setMenuOpen(false);
    const target = this.returnFocus ?? this.store.container();
    this.returnFocus = null;
    if (restoreFocus) {
      target?.focus?.({ preventScroll: true });
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }

  protected choose(item: ContextItem): void {
    this.close(item.key !== 'shortcuts');
    item.run();
  }
}

/**
 * The buttons of the floating mini player: back to the player (scrolls its box into view) and
 * close (pauses and docks the picture). Only rendered while the mini player is active.
 */
@Component({
  selector: 'andes-player-mini-controls',
  imports: [AndesPlayerIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-mini-controls',
    '[attr.hidden]': 'store.miniPlayerActive() ? null : ""',
  },
  template: `
    <button
      type="button"
      class="andes-player-button"
      data-slot="mini-return"
      [attr.aria-label]="store.labels().returnToPlayer"
      (click)="returnToPlayer()"
    >
      <andes-player-icon name="restore" />
    </button>
    <button
      type="button"
      class="andes-player-button"
      data-slot="mini-close"
      [attr.aria-label]="store.labels().closeMiniPlayer"
      (click)="store.closeMiniPlayer()"
    >
      <andes-player-icon name="close" />
    </button>
  `,
})
export class AndesPlayerMiniControls {
  protected readonly store = inject(AndesPlayerStore);

  protected returnToPlayer(): void {
    const container = this.store.container();
    try {
      container?.scrollIntoView?.({
        block: 'center',
        behavior: this.store.reducedMotion() ? 'auto' : 'smooth',
      });
    } catch {
      container?.scrollIntoView?.();
    }
    container?.focus?.({ preventScroll: true });
  }
}
