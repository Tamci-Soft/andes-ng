import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

import { clamp } from './color-math';

/** The saturation and brightness an {@link AndesColorArea} reports. */
export interface AndesColorAreaChange {
  saturation: number;
  brightness: number;
}

/**
 * The two-dimensional saturation (left to right) and brightness (bottom to top) area of the
 * colour picker, drawn for the current hue.
 *
 * It is exposed as one `role="slider"` whose value text names both axes. Left/Right arrows
 * change saturation and Up/Down change brightness by 1 (10 with Shift); `PageUp`/`PageDown`
 * change brightness by 10; `Home`/`End` jump saturation to 0 / 100. A pointer press or drag
 * (pointer-captured) sets both from the pointer position. The area is always laid out
 * left-to-right, in right-to-left pages too, since it is a picture of the colour space.
 */
@Component({
  selector: 'andes-color-area',
  template: `
    <span class="andes-color-area__surface"></span>
    <span class="andes-color-area__handle"></span>
  `,
  styleUrl: './color-picker-area.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'slider',
    'data-slot': 'color-picker-area',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.tabindex]': 'disabled() ? null : 0',
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': '100',
    '[attr.aria-valuenow]': 'saturationRounded()',
    '[attr.aria-valuetext]': 'valueText()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[style.--andes-color-area-hue]': 'hue()',
    '[style.--andes-color-area-x]': 'saturation() / 100',
    '[style.--andes-color-area-y]': '1 - brightness() / 100',
    '[style.--andes-color-area-color]': 'color()',
    '(keydown)': 'onKeydown($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
  },
})
export class AndesColorArea {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Hue of the area, in degrees. */
  readonly hue = input.required<number>();
  /** Saturation, 0-100. */
  readonly saturation = input.required<number>();
  /** Brightness, 0-100. */
  readonly brightness = input.required<number>();
  /** The colour the handle shows. */
  readonly color = input('transparent');
  /** Accessible name. */
  readonly label = input.required<string>();
  /** Spoken value naming both axes. */
  readonly valueText = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Every change, while dragging or on the keyboard. */
  readonly areaChange = output<AndesColorAreaChange>();
  /** The end of a gesture: pointer released, or a key press. */
  readonly commit = output<AndesColorAreaChange>();

  protected saturationRounded(): number {
    return Math.round(this.saturation());
  }

  private dragging = false;

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled() || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const step = event.shiftKey ? 10 : 1;
    let saturation = this.saturation();
    let brightness = this.brightness();
    switch (event.key) {
      case 'ArrowRight':
        saturation += step;
        break;
      case 'ArrowLeft':
        saturation -= step;
        break;
      case 'ArrowUp':
        brightness += step;
        break;
      case 'ArrowDown':
        brightness -= step;
        break;
      case 'PageUp':
        brightness += 10;
        break;
      case 'PageDown':
        brightness -= 10;
        break;
      case 'Home':
        saturation = 0;
        break;
      case 'End':
        saturation = 100;
        break;
      default:
        return;
    }
    event.preventDefault();
    const change = {
      saturation: clamp(saturation, 0, 100),
      brightness: clamp(brightness, 0, 100),
    };
    this.areaChange.emit(change);
    this.commit.emit(change);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.disabled() || (event.button ?? 0) !== 0) {
      return;
    }
    event.preventDefault();
    const element = this.host.nativeElement;
    element.focus({ preventScroll: true });
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers (and old engines) cannot be captured.
    }
    this.dragging = true;
    this.moveTo(event.clientX, event.clientY);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.dragging) {
      this.moveTo(event.clientX, event.clientY);
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    this.dragging = false;
    try {
      this.host.nativeElement.releasePointerCapture(event.pointerId);
    } catch {
      // Nothing was captured.
    }
    this.commit.emit({
      saturation: this.saturation(),
      brightness: this.brightness(),
    });
  }

  private moveTo(clientX: number, clientY: number): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const x = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const y = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;
    this.areaChange.emit({
      saturation: clamp(x, 0, 1) * 100,
      brightness: (1 - clamp(y, 0, 1)) * 100,
    });
  }
}
