import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';

import { AndesPlayerStore } from '../core/player-store';
import { SliderDrag, sliderKeyAction } from './slider-pointer';

/**
 * The volume slider (WAI-ARIA slider, 0-100%). Arrows move 5% (Shift 10%), PageUp/PageDown 10%,
 * Home/End mute/full; the mouse wheel over it changes the volume too. Hidden where the page
 * cannot change the volume (some phones), where the mute button still works.
 */
@Component({
  selector: 'andes-player-volume-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-volume-slider',
    '[attr.hidden]': 'store.volumeSupported() ? null : ""',
  },
  template: `
    <div
      class="andes-player-slider andes-player-slider--volume"
      data-slot="volume-slider"
      role="slider"
      tabindex="0"
      dir="ltr"
      aria-orientation="horizontal"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-label]="store.labels().volume"
      [attr.aria-valuenow]="percent()"
      [attr.aria-valuetext]="store.labels().volumeValueText(percent())"
      [style.--andes-player-slider-fill]="percent() + '%'"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="drag.move($event)"
      (pointerup)="drag.up($event)"
      (pointercancel)="drag.up($event)"
      (lostpointercapture)="drag.up($event)"
      (keydown)="onKeydown($event)"
      (wheel)="onWheel($event)"
    >
      <div #track class="andes-player-slider__track">
        <div class="andes-player-slider__fill"></div>
      </div>
      <div class="andes-player-slider__thumb" aria-hidden="true"></div>
    </div>
  `,
})
export class AndesPlayerVolumeSlider {
  protected readonly store = inject(AndesPlayerStore);
  private readonly trackRef =
    viewChild.required<ElementRef<HTMLElement>>('track');

  protected readonly percent = computed(() =>
    Math.round((this.store.muted() ? 0 : this.store.volume()) * 100),
  );

  protected readonly drag = new SliderDrag(
    () => this.trackRef().nativeElement,
    {
      start: (fraction) => this.store.setVolume(fraction, 'slider'),
      move: (fraction) => this.store.setVolume(fraction, 'slider'),
      end: (fraction, cancelled) => {
        if (!cancelled) {
          this.store.setVolume(fraction, 'slider');
        }
      },
    },
  );

  protected onPointerDown(event: PointerEvent): void {
    if (this.drag.down(event)) {
      (event.currentTarget as HTMLElement | null)?.focus?.({
        preventScroll: true,
      });
      event.preventDefault();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const action = sliderKeyAction(event);
    if (!action) {
      return;
    }
    event.preventDefault();
    const current = this.percent() / 100;
    switch (action.kind) {
      case 'step':
        this.store.setVolume(
          current + action.direction * (action.large ? 0.1 : 0.05),
          'slider',
        );
        break;
      case 'page':
        this.store.setVolume(current + action.direction * 0.1, 'slider');
        break;
      case 'min':
        this.store.setVolume(0, 'slider');
        break;
      case 'max':
        this.store.setVolume(1, 'slider');
        break;
    }
    this.store.notifyActivity();
  }

  protected onWheel(event: WheelEvent): void {
    if (event.deltaY === 0) {
      return;
    }
    event.preventDefault();
    this.store.setVolume(
      this.percent() / 100 + (event.deltaY < 0 ? 0.05 : -0.05),
      'slider',
    );
    this.store.notifyActivity();
  }
}
