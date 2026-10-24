import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { AndesPlayerStore } from '../core/player-store';
import { formatClock, formatTimeText } from '../core/time-format';
import { findTimed } from '../core/vtt';
import { pointerFraction, SliderDrag, sliderKeyAction } from './slider-pointer';

/** Seek at most this often while dragging; the thumb itself follows every move. */
const SCRUB_SEEK_INTERVAL_MS = 80;

/**
 * The seek bar: a WAI-ARIA slider over the timeline (the file, or the DVR window of a live
 * stream). Shows buffered ranges and chapter markers; hovering or dragging previews the time,
 * the chapter title and a storyboard thumbnail. Dragging pauses playback and resumes it on
 * release. The time axis stays left-to-right in right-to-left layouts.
 *
 * Keys: arrows 5s (Shift 10s), PageUp/PageDown 10% of the timeline, Home/End.
 */
@Component({
  selector: 'andes-player-time-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-time-slider',
    '[attr.hidden]': 'store.streamType() === "live" ? "" : null',
  },
  template: `
    <div
      #slider
      class="andes-player-slider andes-player-slider--time"
      data-slot="time-slider"
      role="slider"
      dir="ltr"
      aria-orientation="horizontal"
      [attr.tabindex]="store.canSeek() ? 0 : -1"
      [attr.aria-disabled]="store.canSeek() ? null : 'true'"
      [attr.aria-label]="store.labels().seek"
      [attr.aria-valuemin]="min()"
      [attr.aria-valuemax]="max()"
      [attr.aria-valuenow]="valueNow()"
      [attr.aria-valuetext]="valueText()"
      [attr.data-dragging]="store.scrubbing() ? '' : null"
      [style.--andes-player-slider-fill]="fillPercent() + '%'"
      [style.--andes-player-slider-buffered]="bufferedPercent() + '%'"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
      (lostpointercapture)="onPointerUp($event)"
      (pointerleave)="onPointerLeave()"
      (keydown)="onKeydown($event)"
    >
      <div #track class="andes-player-slider__track">
        <div class="andes-player-slider__buffered"></div>
        <div class="andes-player-slider__fill"></div>
        @for (marker of markers(); track marker.start) {
          <span
            class="andes-player-slider__marker"
            aria-hidden="true"
            [style.left.%]="marker.percent"
          ></span>
        }
      </div>
      <div class="andes-player-slider__thumb" aria-hidden="true"></div>
      @if (preview(); as p) {
        <div
          class="andes-player-preview"
          data-slot="time-preview"
          aria-hidden="true"
          [style.--andes-player-preview-x]="p.x + 'px'"
          [style.--andes-player-preview-half]="p.half + 'px'"
        >
          @if (p.thumbnail; as t) {
            <div
              class="andes-player-preview__thumbnail"
              [style.width.px]="t.width"
              [style.height.px]="t.height"
              [style.background-image]="'url(' + t.src + ')'"
              [style.background-position]="-t.x + 'px ' + -t.y + 'px'"
            ></div>
          }
          @if (p.chapter) {
            <span class="andes-player-preview__chapter">{{ p.chapter }}</span>
          }
          <span class="andes-player-preview__time">{{ p.time }}</span>
        </div>
      }
    </div>
  `,
})
export class AndesPlayerTimeSlider {
  protected readonly store = inject(AndesPlayerStore);
  private readonly sliderRef =
    viewChild.required<ElementRef<HTMLElement>>('slider');
  private readonly trackRef =
    viewChild.required<ElementRef<HTMLElement>>('track');

  /** Time under a hovering pointer (not dragging), with its x offset in the track. */
  private readonly hover = signal<{ time: number; x: number } | null>(null);
  private readonly dragX = signal<number | null>(null);
  private resumeAfterDrag = false;
  private lastScrubSeek = 0;

  private readonly drag = new SliderDrag(() => this.trackRef().nativeElement, {
    start: (fraction) => {
      this.resumeAfterDrag = !this.store.paused();
      if (this.resumeAfterDrag) {
        this.store.pause('slider');
      }
      this.scrubTo(fraction, true);
    },
    move: (fraction) => this.scrubTo(fraction, false),
    end: (fraction, cancelled) => {
      if (!cancelled) {
        this.store.seek(this.timeAt(fraction), 'slider');
      }
      this.store.setScrubTime(null);
      this.dragX.set(null);
      if (this.resumeAfterDrag) {
        void this.store.play('slider');
      }
      this.resumeAfterDrag = false;
    },
  });

  protected readonly min = computed(() =>
    Math.floor(this.store.timelineStart()),
  );
  protected readonly max = computed(() => Math.ceil(this.store.timelineEnd()));
  protected readonly valueNow = computed(() =>
    Math.round(
      Math.min(Math.max(this.store.displayTime(), this.min()), this.max()),
    ),
  );

  protected readonly valueText = computed(() => {
    const labels = this.store.labels();
    const time = this.store.displayTime();
    if (this.store.streamType() === 'live-dvr') {
      const behind = Math.max(0, this.store.liveEdge() - time);
      return labels.liveSeekValueText(
        formatTimeText(behind, labels),
        behind <= this.store.liveEdgeTolerance(),
      );
    }
    return labels.seekValueText(
      formatTimeText(time, labels),
      formatTimeText(this.store.timelineEnd(), labels),
    );
  });

  private readonly span = computed(
    () => this.store.timelineEnd() - this.store.timelineStart(),
  );

  protected readonly fillPercent = computed(() =>
    this.percentOf(this.store.displayTime()),
  );
  protected readonly bufferedPercent = computed(() =>
    this.percentOf(this.store.bufferedEnd()),
  );

  protected readonly markers = computed(() =>
    this.store
      .chapters()
      .filter((chapter) => chapter.start > this.store.timelineStart() + 0.5)
      .map((chapter) => ({
        start: chapter.start,
        percent: this.percentOf(chapter.start),
      })),
  );

  protected readonly preview = computed(() => {
    const dragX = this.dragX();
    const hover = this.hover();
    const scrub = this.store.scrubTime();
    const time = scrub ?? hover?.time;
    const x = dragX ?? hover?.x;
    if (time === undefined || x === undefined || !this.store.canSeek()) {
      return null;
    }
    const thumbnail = findTimed(this.store.thumbnails(), time);
    const chapter = findTimed(this.store.chapters(), time);
    const live = this.store.streamType() === 'live-dvr';
    const label = live
      ? formatClock(-Math.max(0, this.store.liveEdge() - time))
      : formatClock(time, this.store.timelineEnd() >= 3600);
    return {
      x,
      half: Math.max((thumbnail?.width ?? 56) / 2, 28),
      time: label,
      chapter: chapter?.title ?? null,
      thumbnail,
    };
  });

  protected onPointerDown(event: PointerEvent): void {
    if (!this.store.canSeek() || !this.drag.down(event)) {
      return;
    }
    this.sliderRef().nativeElement.focus({ preventScroll: true });
    event.preventDefault();
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.drag.move(event)) {
      return;
    }
    if (event.pointerType === 'touch' || !this.store.canSeek()) {
      return;
    }
    const track = this.trackRef().nativeElement;
    const fraction = pointerFraction(event, track);
    this.hover.set({
      time: this.timeAt(fraction),
      x: fraction * track.getBoundingClientRect().width,
    });
  }

  protected onPointerUp(event: PointerEvent): void {
    this.drag.up(event);
  }

  protected onPointerLeave(): void {
    this.hover.set(null);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const action = sliderKeyAction(event);
    if (!action || !this.store.canSeek()) {
      return;
    }
    event.preventDefault();
    const config = this.store.config();
    const time = this.store.currentTime();
    switch (action.kind) {
      case 'step':
        this.store.seek(
          time +
            action.direction *
              (action.large ? config.seekStepLarge : config.seekStep),
          'slider',
        );
        break;
      case 'page':
        this.store.seek(time + action.direction * this.span() * 0.1, 'slider');
        break;
      case 'min':
        this.store.seek(this.store.timelineStart(), 'slider');
        break;
      case 'max':
        if (this.store.isLive()) {
          this.store.seekToLive('slider');
        } else {
          this.store.seek(this.store.timelineEnd(), 'slider');
        }
        break;
    }
    this.store.notifyActivity();
  }

  private scrubTo(fraction: number, force: boolean): void {
    const time = this.timeAt(fraction);
    this.store.setScrubTime(time);
    const track = this.trackRef().nativeElement;
    this.dragX.set(fraction * track.getBoundingClientRect().width);
    const now = Date.now();
    if (force || now - this.lastScrubSeek >= SCRUB_SEEK_INTERVAL_MS) {
      this.lastScrubSeek = now;
      this.store.seek(time, 'slider');
    }
    this.store.notifyActivity();
  }

  private timeAt(fraction: number): number {
    return this.store.timelineStart() + fraction * this.span();
  }

  private percentOf(time: number): number {
    const span = this.span();
    if (span <= 0) {
      return 0;
    }
    const value = ((time - this.store.timelineStart()) / span) * 100;
    return Math.min(Math.max(value, 0), 100);
  }
}
