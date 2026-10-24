import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  Renderer2,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { AndesPlayerStore } from '../core/player-store';
import { formatClock, formatTimeText } from '../core/time-format';
import { AndesPlayerIcon, type AndesPlayerIconName } from './player-icon';

/** Which time a {@link AndesPlayerTimeDisplay} shows. */
export type AndesPlayerTimeDisplayType =
  'current' | 'duration' | 'remaining' | 'current-duration';

/**
 * Elapsed, total or remaining time (`0:05 / 3:20`). On a live stream with a DVR window it shows
 * how far behind live the viewer is; on a pure live stream it shows nothing (the live badge
 * says it all). Each value carries a visually hidden name for screen readers.
 */
@Component({
  selector: 'andes-player-time',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-time',
    '[attr.data-type]': 'type()',
    '[attr.hidden]': 'hidden() ? "" : null',
  },
  template: `
    @if (store.isLive()) {
      <span class="andes-player-sr-only">{{ store.labels().currentTime }}</span>
      <span data-slot="time-behind">{{ behind() }}</span>
    } @else {
      @if (type() === 'current' || type() === 'current-duration') {
        <span class="andes-player-sr-only">{{
          store.labels().currentTime
        }}</span>
        <span data-slot="time-current">{{ current() }}</span>
      }
      @if (type() === 'current-duration') {
        <span class="andes-player-time__divider" aria-hidden="true">/</span>
      }
      @if (type() === 'duration' || type() === 'current-duration') {
        <span class="andes-player-sr-only">{{ store.labels().duration }}</span>
        <span data-slot="time-duration">{{ duration() }}</span>
      }
      @if (type() === 'remaining') {
        <span class="andes-player-sr-only">{{
          store.labels().remainingTime
        }}</span>
        <span data-slot="time-remaining">{{ remaining() }}</span>
      }
    }
  `,
})
export class AndesPlayerTimeDisplay {
  protected readonly store = inject(AndesPlayerStore);

  readonly type = input<AndesPlayerTimeDisplayType>('current-duration');

  private readonly withHours = computed(() => this.store.timelineEnd() >= 3600);
  protected readonly current = computed(() =>
    formatClock(this.store.displayTime(), this.withHours()),
  );
  protected readonly duration = computed(() =>
    formatClock(this.store.timelineEnd(), this.withHours()),
  );
  protected readonly remaining = computed(() =>
    formatClock(
      -Math.max(0, this.store.timelineEnd() - this.store.displayTime()),
      this.withHours(),
    ),
  );
  protected readonly behind = computed(() => {
    const behind = Math.max(
      0,
      this.store.liveEdge() - this.store.displayTime(),
    );
    return this.store
      .labels()
      .behindLive(formatTimeText(behind, this.store.labels()));
  });
  protected readonly hidden = computed(() => {
    if (!this.store.isLive()) {
      return false;
    }
    return (
      this.store.streamType() === 'live' ||
      Math.max(0, this.store.liveEdge() - this.store.displayTime()) <=
        this.store.liveEdgeTolerance()
    );
  });
}

/** The poster (video) or cover art (audio), shown until playback first starts. */
@Component({
  selector: 'andes-player-poster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-poster',
    '[attr.hidden]': 'visible() ? null : ""',
    'aria-hidden': 'true',
  },
  template: `
    @if (src(); as poster) {
      <img data-slot="poster" [src]="poster" alt="" decoding="async" />
    }
  `,
})
export class AndesPlayerPoster {
  protected readonly store = inject(AndesPlayerStore);

  /** Overrides the player's `poster`. */
  readonly image = input<string | null>(null);

  protected readonly src = computed(
    () => this.image() ?? this.store.config().poster,
  );
  protected readonly visible = computed(
    () =>
      Boolean(this.src()) && (this.store.audioOnly() || !this.store.started()),
  );
}

/** How long buffering must last before the spinner appears (no flicker on short waits). */
export const ANDES_PLAYER_BUFFERING_DELAY_MS = 500;

/**
 * Spinner for buffering and initial loading, after a short delay, with a short status line when
 * the wait is the network's (reconnecting after a failure, or data stopped arriving), which is
 * worth knowing apart from a normal brief load. Decorative: the player root reports
 * `aria-busy`, and the live region announces reconnecting once.
 */
@Component({
  selector: 'andes-player-buffering',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-buffering',
    'aria-hidden': 'true',
    '[attr.hidden]': 'visible() ? null : ""',
  },
  template: `
    <span class="andes-player-buffering__spinner" data-slot="buffering"></span>
    @if (status(); as text) {
      <span class="andes-player-buffering__status" data-slot="network-status">{{
        text
      }}</span>
    }
  `,
})
export class AndesPlayerBufferingIndicator {
  protected readonly store = inject(AndesPlayerStore);
  protected readonly visible = signal(false);
  /** Why it waits, when that is the network: reconnecting, or data stopped arriving. */
  protected readonly status = computed(() => {
    const labels = this.store.labels();
    if (this.store.reconnecting()) {
      return labels.reconnecting;
    }
    return this.store.networkSlow() ? labels.slowNetwork : null;
  });

  constructor() {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    effect(() => {
      const busy = this.store.buffering();
      untracked(() => {
        clear();
        if (!busy) {
          this.visible.set(false);
          return;
        }
        timer = setTimeout(() => {
          timer = null;
          this.visible.set(true);
        }, ANDES_PLAYER_BUFFERING_DELAY_MS);
      });
    });
    inject(DestroyRef).onDestroy(clear);
  }
}

const FEEDBACK_ICONS: Record<string, AndesPlayerIconName> = {
  play: 'play',
  pause: 'pause',
  volume: 'volume-high',
  mute: 'volume-muted',
  'seek-forward': 'seek-forward',
  'seek-backward': 'seek-backward',
  rate: 'speed',
  captions: 'captions',
  frame: 'frame',
  chapter: 'chapter',
  repeat: 'repeat',
  link: 'link',
};

/**
 * Transient visual feedback: the play/pause flash after a click or key, the volume level, the
 * speed, and the ripple of a double-tap seek on the side it happened. Visual only; the live
 * region announces the same changes.
 */
@Component({
  selector: 'andes-player-feedback',
  imports: [AndesPlayerIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'andes-player-feedback', 'aria-hidden': 'true' },
  template: `
    @for (item of items(); track item.id) {
      <div
        class="andes-player-feedback__bubble"
        data-slot="feedback"
        [attr.data-kind]="item.kind"
        [attr.data-side]="item.side ?? 'center'"
      >
        @if (item.side) {
          <span class="andes-player-feedback__ripple"></span>
        }
        <andes-player-icon [name]="icon(item.kind)" />
        @if (item.text) {
          <span class="andes-player-feedback__text">{{ item.text }}</span>
        }
      </div>
    }
  `,
})
export class AndesPlayerFeedbackIndicator {
  protected readonly store = inject(AndesPlayerStore);
  protected readonly items = computed(() => {
    const feedback = this.store.feedback();
    return feedback ? [feedback] : [];
  });

  protected icon(kind: string): AndesPlayerIconName {
    return FEEDBACK_ICONS[kind] ?? 'play';
  }
}

let nextId = 0;

/** The error panel: what went wrong in plain words, and a retry action. */
@Component({
  selector: 'andes-player-error',
  imports: [AndesPlayerIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-error',
    '[attr.hidden]': 'store.error() ? null : ""',
  },
  template: `
    @if (store.error(); as error) {
      <div
        class="andes-player-error__panel"
        data-slot="error"
        role="group"
        [attr.aria-labelledby]="titleId"
        [attr.data-code]="error.code"
      >
        <andes-player-icon name="alert" class="andes-player-error__icon" />
        <p class="andes-player-error__title" [id]="titleId">
          {{ store.labels().errorTitle }}
        </p>
        <p class="andes-player-error__message">{{ error.message }}</p>
        <button
          type="button"
          class="andes-player-error__retry"
          data-slot="retry"
          (click)="store.retry()"
        >
          <andes-player-icon name="replay" />
          {{ store.labels().retry }}
        </button>
      </div>
    }
  `,
})
export class AndesPlayerErrorPanel {
  protected readonly store = inject(AndesPlayerStore);
  protected readonly titleId = `andes-player-error-${nextId++}`;
}

/** The media title, shown in the top bar with the controls. */
@Component({
  selector: 'andes-player-title',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-title',
    '[attr.hidden]': 'store.title() ? null : ""',
  },
  template: `<span data-slot="title">{{ store.title() }}</span>`,
})
export class AndesPlayerTitle {
  protected readonly store = inject(AndesPlayerStore);
}

/**
 * The captions overlay: the active cues of the selected track, drawn in the player so they can
 * be styled with `--andes-video-captions-*` variables and move above the visible controls. The
 * cue markup comes from the browser's own WebVTT parser (`getCueAsHTML`), never from raw HTML.
 */
@Component({
  selector: 'andes-player-captions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-captions',
    '[attr.hidden]': 'store.activeCues().length > 0 ? null : ""',
  },
  template: `<div
    #box
    class="andes-player-captions__box"
    data-slot="captions"
  ></div>`,
})
export class AndesPlayerCaptionsDisplay {
  protected readonly store = inject(AndesPlayerStore);
  private readonly renderer = inject(Renderer2);
  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');

  constructor() {
    effect(() => {
      const cues = this.store.activeCues();
      const box = this.box().nativeElement;
      untracked(() => {
        box.replaceChildren();
        for (const cue of cues) {
          const line = this.renderer.createElement('span') as HTMLElement;
          this.renderer.addClass(line, 'andes-player-captions__cue');
          const vtt = cue as TextTrackCue & {
            getCueAsHTML?: () => DocumentFragment;
            text?: string;
          };
          if (typeof vtt.getCueAsHTML === 'function') {
            line.appendChild(vtt.getCueAsHTML());
          } else {
            line.textContent = vtt.text ?? '';
          }
          this.renderer.appendChild(box, line);
        }
      });
    });
  }
}

/** The player's polite live region; announcements replace each other. */
@Component({
  selector: 'andes-player-announcer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'andes-player-sr-only' },
  template: `
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-slot="announcer"
    >
      @for (item of items(); track item.id) {
        <span>{{ item.text }}</span>
      }
    </div>
  `,
})
export class AndesPlayerAnnouncer {
  protected readonly store = inject(AndesPlayerStore);
  protected readonly items = computed(() => {
    const announcement = this.store.announcement();
    return announcement ? [announcement] : [];
  });
}
