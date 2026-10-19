import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

import { ariaKeyShortcuts, hotkeyHint } from '../core/player-hotkeys';
import { AndesPlayerStore } from '../core/player-store';
import { AndesPlayerIcon, type AndesPlayerIconName } from './player-icon';
import { AndesPlayerTooltip } from './player-tooltip';

/**
 * Play / pause (and replay once ended). Its name follows the state, so it is a plain button,
 * not a toggle with `aria-pressed`.
 */
@Component({
  selector: 'andes-player-play-button',
  imports: [AndesPlayerIcon, AndesPlayerTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'andes-player-control' },
  template: `
    <button
      type="button"
      class="andes-player-button"
      data-slot="play-button"
      [attr.data-state]="state()"
      [attr.aria-label]="label()"
      [attr.aria-keyshortcuts]="shortcuts()"
      [andesPlayerTooltip]="label()"
      [andesPlayerTooltipHint]="hint()"
      (click)="store.togglePaused('control')"
    >
      <andes-player-icon [name]="icon()" />
    </button>
  `,
})
export class AndesPlayerPlayButton {
  protected readonly store = inject(AndesPlayerStore);

  protected readonly state = computed(() =>
    this.store.ended() ? 'ended' : this.store.paused() ? 'paused' : 'playing',
  );
  protected readonly label = computed(() => {
    const labels = this.store.labels();
    const state = this.state();
    return state === 'ended'
      ? labels.replay
      : state === 'paused'
        ? labels.play
        : labels.pause;
  });
  protected readonly icon = computed<AndesPlayerIconName>(() => {
    const state = this.state();
    return state === 'ended' ? 'replay' : state === 'paused' ? 'play' : 'pause';
  });
  protected readonly shortcuts = computed(() =>
    ariaKeyShortcuts(this.store.keyMap(), 'togglePlay'),
  );
  protected readonly hint = computed(() =>
    hotkeyHint(this.store.keyMap(), 'togglePlay'),
  );
}

/** Mute / unmute; the icon also shows the volume level. */
@Component({
  selector: 'andes-player-mute-button',
  imports: [AndesPlayerIcon, AndesPlayerTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'andes-player-control' },
  template: `
    <button
      type="button"
      class="andes-player-button"
      data-slot="mute-button"
      [attr.data-state]="store.effectivelyMuted() ? 'muted' : 'unmuted'"
      [attr.aria-label]="label()"
      [attr.aria-keyshortcuts]="shortcuts()"
      [andesPlayerTooltip]="label()"
      [andesPlayerTooltipHint]="hint()"
      (click)="store.toggleMuted('control')"
    >
      <andes-player-icon [name]="icon()" />
    </button>
  `,
})
export class AndesPlayerMuteButton {
  protected readonly store = inject(AndesPlayerStore);

  protected readonly label = computed(() =>
    this.store.effectivelyMuted()
      ? this.store.labels().unmute
      : this.store.labels().mute,
  );
  protected readonly icon = computed<AndesPlayerIconName>(() => {
    if (this.store.effectivelyMuted()) {
      return 'volume-muted';
    }
    return this.store.volume() < 0.5 ? 'volume-low' : 'volume-high';
  });
  protected readonly shortcuts = computed(() =>
    ariaKeyShortcuts(this.store.keyMap(), 'toggleMute'),
  );
  protected readonly hint = computed(() =>
    hotkeyHint(this.store.keyMap(), 'toggleMute'),
  );
}

/** Seeks by a fixed number of seconds: negative goes back. Hidden where seeking is impossible. */
@Component({
  selector: 'andes-player-seek-button',
  imports: [AndesPlayerIcon, AndesPlayerTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-control',
    '[attr.hidden]': 'store.canSeek() ? null : ""',
  },
  template: `
    <button
      type="button"
      class="andes-player-button"
      data-slot="seek-button"
      [attr.data-direction]="seconds() < 0 ? 'backward' : 'forward'"
      [attr.aria-label]="label()"
      [andesPlayerTooltip]="label()"
      (click)="seek()"
    >
      <andes-player-icon
        [name]="seconds() < 0 ? 'seek-backward' : 'seek-forward'"
        [label]="magnitude()"
      />
    </button>
  `,
})
export class AndesPlayerSeekButton {
  protected readonly store = inject(AndesPlayerStore);

  /** Seconds to move; negative seeks backward. */
  readonly seconds = input(10, { transform: numberAttribute });

  protected readonly magnitude = computed(() => Math.abs(this.seconds()));
  protected readonly label = computed(() =>
    this.seconds() < 0
      ? this.store.labels().seekBackward(this.magnitude())
      : this.store.labels().seekForward(this.magnitude()),
  );

  protected seek(): void {
    this.store.seekBy(this.seconds(), 'control');
  }
}

/** Enters / leaves fullscreen (the player itself goes fullscreen, so the controls come along). */
@Component({
  selector: 'andes-player-fullscreen-button',
  imports: [AndesPlayerIcon, AndesPlayerTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-control',
    '[attr.hidden]': 'store.fullscreenSupported() ? null : ""',
  },
  template: `
    <button
      type="button"
      class="andes-player-button"
      data-slot="fullscreen-button"
      [attr.data-state]="store.fullscreen() ? 'on' : 'off'"
      [attr.aria-label]="label()"
      [attr.aria-keyshortcuts]="shortcuts()"
      [andesPlayerTooltip]="label()"
      [andesPlayerTooltipHint]="hint()"
      (click)="store.toggleFullscreen('control')"
    >
      <andes-player-icon
        [name]="store.fullscreen() ? 'fullscreen-exit' : 'fullscreen'"
      />
    </button>
  `,
})
export class AndesPlayerFullscreenButton {
  protected readonly store = inject(AndesPlayerStore);

  protected readonly label = computed(() =>
    this.store.fullscreen()
      ? this.store.labels().exitFullscreen
      : this.store.labels().enterFullscreen,
  );
  protected readonly shortcuts = computed(() =>
    ariaKeyShortcuts(this.store.keyMap(), 'toggleFullscreen'),
  );
  protected readonly hint = computed(() =>
    hotkeyHint(this.store.keyMap(), 'toggleFullscreen'),
  );
}

/** Enters / leaves picture-in-picture. Hidden where the browser lacks it. */
@Component({
  selector: 'andes-player-pip-button',
  imports: [AndesPlayerIcon, AndesPlayerTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-control',
    '[attr.hidden]': 'store.pictureInPictureSupported() ? null : ""',
  },
  template: `
    <button
      type="button"
      class="andes-player-button"
      data-slot="pip-button"
      [attr.data-state]="store.pictureInPicture() ? 'on' : 'off'"
      [attr.aria-label]="label()"
      [attr.aria-keyshortcuts]="shortcuts()"
      [andesPlayerTooltip]="label()"
      [andesPlayerTooltipHint]="hint()"
      (click)="store.togglePictureInPicture('control')"
    >
      <andes-player-icon
        [name]="store.pictureInPicture() ? 'pip-exit' : 'pip'"
      />
    </button>
  `,
})
export class AndesPlayerPipButton {
  protected readonly store = inject(AndesPlayerStore);

  protected readonly label = computed(() =>
    this.store.pictureInPicture()
      ? this.store.labels().exitPictureInPicture
      : this.store.labels().enterPictureInPicture,
  );
  protected readonly shortcuts = computed(() =>
    ariaKeyShortcuts(this.store.keyMap(), 'togglePictureInPicture'),
  );
  protected readonly hint = computed(() =>
    hotkeyHint(this.store.keyMap(), 'togglePictureInPicture'),
  );
}

/** Captions on/off toggle (`aria-pressed`). Hidden when the media has no caption tracks. */
@Component({
  selector: 'andes-player-captions-button',
  imports: [AndesPlayerIcon, AndesPlayerTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-control',
    '[attr.hidden]': 'store.textTracks().length > 0 ? null : ""',
  },
  template: `
    <button
      type="button"
      class="andes-player-button"
      data-slot="captions-button"
      [attr.aria-pressed]="store.captionsEnabled()"
      [attr.aria-label]="store.labels().captions"
      [attr.aria-keyshortcuts]="shortcuts()"
      [andesPlayerTooltip]="tooltip()"
      [andesPlayerTooltipHint]="hint()"
      (click)="store.toggleCaptions('control')"
    >
      <andes-player-icon name="captions" />
    </button>
  `,
})
export class AndesPlayerCaptionsButton {
  protected readonly store = inject(AndesPlayerStore);

  protected readonly tooltip = computed(() =>
    this.store.captionsEnabled()
      ? this.store.labels().disableCaptions
      : this.store.labels().enableCaptions,
  );
  protected readonly shortcuts = computed(() =>
    ariaKeyShortcuts(this.store.keyMap(), 'toggleCaptions'),
  );
  protected readonly hint = computed(() =>
    hotkeyHint(this.store.keyMap(), 'toggleCaptions'),
  );
}

/**
 * The live badge. At the live edge it is an indicator (`aria-disabled`); behind it, it jumps
 * back to live. Only present on live streams.
 */
@Component({
  selector: 'andes-player-live-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-control',
    '[attr.hidden]': 'store.isLive() ? null : ""',
  },
  template: `
    <button
      type="button"
      class="andes-player-live"
      data-slot="live-button"
      [attr.data-state]="store.atLiveEdge() ? 'live' : 'behind'"
      [attr.aria-disabled]="store.atLiveEdge() ? 'true' : null"
      [attr.aria-label]="label()"
      (click)="goLive()"
    >
      <span class="andes-player-live__dot" aria-hidden="true"></span>
      <span class="andes-player-live__text" aria-hidden="true">{{
        store.labels().live
      }}</span>
    </button>
  `,
})
export class AndesPlayerLiveButton {
  protected readonly store = inject(AndesPlayerStore);

  protected readonly label = computed(() =>
    this.store.atLiveEdge()
      ? this.store.labels().atLiveEdge
      : this.store.labels().goToLive,
  );

  protected goLive(): void {
    if (!this.store.atLiveEdge()) {
      this.store.seekToLive('control');
    }
  }
}

/**
 * Opens the remote playback (casting) device picker. Shown only while a device is available;
 * see `provideAndesRemotePlayback()` to plug in a casting SDK.
 */
@Component({
  selector: 'andes-player-remote-button',
  imports: [AndesPlayerIcon, AndesPlayerTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-control',
    '[attr.hidden]': 'store.remotePlaybackAvailable() ? null : ""',
  },
  template: `
    <button
      type="button"
      class="andes-player-button"
      data-slot="remote-button"
      [attr.data-state]="store.remotePlaybackState()"
      [attr.aria-label]="label()"
      [andesPlayerTooltip]="label()"
      (click)="store.requestRemotePlayback()"
    >
      <andes-player-icon name="remote" />
    </button>
  `,
})
export class AndesPlayerRemoteButton {
  protected readonly store = inject(AndesPlayerStore);

  protected readonly label = computed(() =>
    this.store.remotePlaybackState() === 'connected'
      ? this.store.labels().remotePlaybackConnected
      : this.store.labels().remotePlayback,
  );
}

/** The large centred play button over the picture, shown while paused. */
@Component({
  selector: 'andes-player-big-play-button',
  imports: [AndesPlayerIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-big-play',
    '[attr.hidden]': 'visible() ? null : ""',
  },
  template: `
    <button
      type="button"
      class="andes-player-big-play__button"
      data-slot="big-play-button"
      [attr.aria-label]="
        store.ended() ? store.labels().replay : store.labels().play
      "
      (click)="store.play('control')"
    >
      <andes-player-icon [name]="store.ended() ? 'replay' : 'play'" />
    </button>
  `,
})
export class AndesPlayerBigPlayButton {
  protected readonly store = inject(AndesPlayerStore);

  protected readonly visible = computed(
    () =>
      this.store.paused() &&
      !this.store.scrubbing() &&
      !this.store.seeking() &&
      this.store.error() === null,
  );
}

/** "Tap to unmute", offered after autoplay only worked muted. */
@Component({
  selector: 'andes-player-unmute-button',
  imports: [AndesPlayerIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-unmute',
    '[attr.hidden]': 'store.autoplayMuted() && store.muted() ? null : ""',
  },
  template: `
    <button
      type="button"
      class="andes-player-unmute__button"
      data-slot="unmute-button"
      (click)="store.setMuted(false, 'control')"
    >
      <andes-player-icon name="volume-muted" />
      <span>{{ store.labels().tapToUnmute }}</span>
    </button>
  `,
})
export class AndesPlayerUnmuteButton {
  protected readonly store = inject(AndesPlayerStore);
}
