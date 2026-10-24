import { DOCUMENT, isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  numberAttribute,
  output,
  PLATFORM_ID,
  signal,
  TemplateRef,
  untracked,
} from '@angular/core';

import {
  AndesCountdownTarget,
  finestUnitMs,
  formatDuration,
  hasMillisecondToken,
  toIsoDuration,
  toTimestamp,
} from './countdown-format';
import { AndesStatisticContent, AndesStatisticSize } from './statistic';

export type AndesCountdownMode = 'down' | 'up';

export interface AndesCountdownLabels {
  /** Announced once when a countdown reaches zero. */
  finished?: string;
}

export const ANDES_COUNTDOWN_DEFAULT_LABELS: Required<AndesCountdownLabels> = {
  finished: 'Time is up',
};

/** Tick period for formats with a millisecond token. */
const FAST_INTERVAL = 16;
/** Tick period for formats with a millisecond token when the user prefers reduced motion. */
const REDUCED_MOTION_INTERVAL = 1000;

/**
 * A live countdown to a moment, or a count-up since one.
 *
 * `value` is the target (`Date`, epoch milliseconds or a date string). `format` is rendered with
 * a small token language, see `formatDuration`: `HH:mm:ss`, `D [days] HH:mm`, `mm:ss.SSS`.
 * The component keeps one timer that always recomputes from the clock, so it never drifts, and
 * stops it while the tab is hidden, catching up the moment it is visible again. The figure is
 * not a live region; reaching zero is announced politely once through a hidden status.
 *
 * Styling uses the same custom properties as `andes-statistic`.
 *
 * @example
 * <andes-countdown title="Offer ends in" [value]="deadline" format="D [d] HH:mm:ss"
 *   (finish)="expire()" />
 */
@Component({
  selector: 'andes-countdown',
  imports: [NgTemplateOutlet],
  templateUrl: './countdown.html',
  styleUrls: ['./statistic.css', './countdown.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'countdown',
    '[attr.data-size]': 'size()',
    '[attr.data-mode]': 'mode()',
    '[attr.data-finished]': 'finished() ? "" : null',
    '[attr.data-running]': 'running() ? "" : null',
    '[attr.aria-label]': 'null',
    '[attr.title]': 'null',
  },
})
export class AndesCountdown {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly title = input<AndesStatisticContent | undefined>(undefined);
  /** The moment to count down to, or from in `up` mode. */
  readonly value = input<AndesCountdownTarget>(undefined);
  /** Duration tokens; see `formatDuration`. */
  readonly format = input('HH:mm:ss');
  /** `down` counts the time left, `up` the time elapsed since `value`. */
  readonly mode = input<AndesCountdownMode>('down');
  readonly prefix = input<AndesStatisticContent | undefined>(undefined);
  readonly suffix = input<AndesStatisticContent | undefined>(undefined);
  readonly size = input<AndesStatisticSize>('default');
  /** Begin ticking when created. With `false`, call `start()`. */
  readonly autoStart = input(true, { transform: booleanAttribute });
  /** Minimum milliseconds between updates (the display only changes when its smallest unit does). Formats with an `S` token tick every frame instead. */
  readonly interval = input(1000, { transform: numberAttribute });
  readonly labels = input<AndesCountdownLabels | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  /** Fires once when a countdown reaches zero (also if `value` is already in the past). */
  readonly finish = output<void>();
  /** Fires on every update with the displayed duration in milliseconds. */
  readonly changed = output<number>();

  private readonly now = signal(Date.now());
  private timer: ReturnType<typeof setTimeout> | undefined;
  private finishedFor: number | null = null;
  private stopped = false;
  private initialised = false;
  private lastKey = '';

  /** Whether the timer is armed. `stop()` clears it, `start()` sets it. */
  readonly running = signal(false);
  protected readonly finished = signal(false);
  protected readonly announcement = signal('');

  protected readonly resolvedLabels = computed(() => ({
    ...ANDES_COUNTDOWN_DEFAULT_LABELS,
    ...this.labels(),
  }));

  private readonly target = computed(() => toTimestamp(this.value()));

  /** The duration on display, in milliseconds. */
  readonly duration = computed(() => {
    const target = this.target();
    if (Number.isNaN(target)) {
      return 0;
    }
    const now = this.now();
    return Math.max(0, this.mode() === 'up' ? now - target : target - now);
  });

  /**
   * The duration as shown. A countdown rounds up to the smallest unit in the format, so it reads
   * `00:00:01` until the very moment it ends; a count-up simply truncates.
   */
  protected readonly shown = computed(() => {
    const duration = this.duration();
    if (this.mode() === 'up') {
      return duration;
    }
    const grain = finestUnitMs(this.format());
    return Math.ceil(duration / grain) * grain;
  });
  protected readonly text = computed(() =>
    formatDuration(this.shown(), this.format()),
  );
  protected readonly iso = computed(() => toIsoDuration(this.shown()));
  protected readonly titleTemplate = computed(() => asTemplate(this.title()));
  protected readonly titleText = computed(() => asText(this.title()));
  protected readonly hasTitle = computed(() => !!this.title());
  protected readonly hasName = computed(
    () => !!this.title() || !!this.ariaLabel(),
  );
  protected readonly prefixTemplate = computed(() => asTemplate(this.prefix()));
  protected readonly prefixText = computed(() => asText(this.prefix()));
  protected readonly suffixTemplate = computed(() => asTemplate(this.suffix()));
  protected readonly suffixText = computed(() => asText(this.suffix()));

  constructor() {
    const onVisibility = () => {
      if (this.document.visibilityState === 'hidden') {
        this.clearTimer();
      } else if (this.running()) {
        this.tick();
      }
    };
    this.document.addEventListener('visibilitychange', onVisibility);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('visibilitychange', onVisibility);
      this.clearTimer();
    });

    effect(() => {
      // Any change to what is counted re-arms the loop; a new target or mode also re-opens `finish`.
      const key = `${this.target()}|${this.mode()}`;
      this.interval();
      this.format();
      untracked(() => {
        if (key !== this.lastKey) {
          this.lastKey = key;
          this.finishedFor = null;
          this.finished.set(false);
          this.announcement.set('');
        }
        if (!this.initialised) {
          this.initialised = true;
          this.stopped = !this.autoStart();
        }
        if (!this.stopped) {
          this.start();
        } else {
          this.now.set(Date.now());
        }
      });
    });
  }

  /** Starts, or resumes, updating. The display jumps to the real clock. */
  start(): void {
    this.stopped = false;
    this.running.set(true);
    this.tick();
  }

  /** Stops updating and keeps the last displayed value on screen. */
  stop(): void {
    this.stopped = true;
    this.running.set(false);
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private tick(): void {
    this.clearTimer();
    const now = Date.now();
    this.now.set(now);
    const target = this.target();
    if (Number.isNaN(target)) {
      return;
    }
    const duration = this.duration();
    this.changed.emit(this.shown());

    if (this.mode() === 'down' && duration <= 0) {
      this.running.set(false);
      this.finished.set(true);
      if (this.finishedFor !== target) {
        this.finishedFor = target;
        this.announcement.set(this.resolvedLabels().finished);
        this.finish.emit();
      }
      return;
    }

    if (
      !this.browser ||
      !this.running() ||
      this.document.visibilityState === 'hidden'
    ) {
      return;
    }
    const milliseconds = hasMillisecondToken(this.format());
    const grain = milliseconds
      ? this.fastPeriod()
      : finestUnitMs(this.format());
    // Aim at the next moment the display changes: counting down, when the remaining time falls
    // to the previous multiple of the grain; counting up, when elapsed time reaches the next.
    let delay =
      this.mode() === 'down'
        ? duration - (Math.ceil(duration / grain) - 1) * grain
        : grain - (duration % grain);
    if (!milliseconds) {
      // `interval` stretches the wait in whole display steps.
      delay += (Math.max(1, Math.round(this.interval() / grain)) - 1) * grain;
    }
    this.timer = setTimeout(() => this.tick(), Math.max(1, delay));
  }

  private fastPeriod(): number {
    const reduce =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    return reduce ? REDUCED_MOTION_INTERVAL : FAST_INTERVAL;
  }
}

function asTemplate(
  content: AndesStatisticContent | undefined,
): TemplateRef<unknown> | null {
  return content instanceof TemplateRef ? content : null;
}

function asText(content: AndesStatisticContent | undefined): string {
  return typeof content === 'string' ? content : '';
}
