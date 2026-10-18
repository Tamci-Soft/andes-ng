import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

import { clamp } from './color-math';

/** Handle diameter in px; the rail is inset by half of it on each side. */
const HANDLE_SIZE = 16;

/**
 * Hue stops of the rail. Seven stops are enough for the browser to interpolate the whole
 * circle exactly, since hue is piecewise linear in RGB between the primaries.
 */
const HUE_RAIL =
  'linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), ' +
  'hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))';

/**
 * A horizontal slider for one colour channel (hue or alpha) of the colour picker.
 *
 * It is a real `role="slider"`: focusable, arrow keys step by `step` (`bigStep` with Shift),
 * `PageUp`/`PageDown` step by `bigStep`, `Home`/`End` jump to the ends, and a pointer drag
 * (with pointer capture, so it keeps tracking outside the rail) sets the value from the
 * pointer position. The value is driven by the parent: `valueChange` reports every change,
 * `commit` reports the end of a gesture (pointer release, or each key press).
 *
 * The rail is always laid out left-to-right, in right-to-left pages too: it is a picture of
 * the channel (red to red, transparent to opaque), not text.
 */
@Component({
  selector: 'andes-color-slider',
  template: `
    <span
      class="andes-color-slider__rail"
      [style.background-image]="rail()"
    ></span>
    <span class="andes-color-slider__handle"></span>
  `,
  styleUrl: './color-picker-slider.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'slider',
    'data-slot': 'color-picker-slider',
    '[attr.data-type]': 'type()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.tabindex]': 'disabled() ? null : 0',
    '[attr.aria-label]': 'label()',
    '[attr.aria-orientation]': '"horizontal"',
    '[attr.aria-valuemin]': 'min()',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'roundedValue()',
    '[attr.aria-valuetext]': 'valueText() ?? null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[style.--andes-color-slider-position]': 'position()',
    '[style.--andes-color-slider-color]': 'color()',
    '[style.--andes-color-slider-rail-color]': 'railColor() ?? color()',
    '(keydown)': 'onKeydown($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
  },
})
export class AndesColorSlider {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** `hue` paints the colour wheel strip; `alpha` paints transparent to `color`. */
  readonly type = input<'hue' | 'alpha'>('hue');
  readonly value = input.required<number>();
  readonly min = input(0);
  readonly max = input(100);
  readonly step = input(1);
  /** Step of `PageUp`/`PageDown` and of the arrow keys with Shift held. */
  readonly bigStep = input(10);
  /** Accessible name. */
  readonly label = input.required<string>();
  /** Spoken value (`aria-valuetext`), when the bare number is not enough. */
  readonly valueText = input<string | undefined>(undefined);
  /** The colour the handle shows (any CSS colour, alpha included). */
  readonly color = input('transparent');
  /** The opaque colour the alpha rail fades to; defaults to `color`. */
  readonly railColor = input<string | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Every change, while dragging or typing on the keyboard. */
  readonly valueChange = output<number>();
  /** The end of a gesture: pointer released, or a key press (each is complete). */
  readonly commit = output<number>();

  protected readonly roundedValue = computed(() => Math.round(this.value()));

  protected readonly position = computed(() => {
    const span = this.max() - this.min();
    return span === 0 ? 0 : clamp((this.value() - this.min()) / span, 0, 1);
  });

  protected readonly rail = computed(() =>
    this.type() === 'hue'
      ? HUE_RAIL
      : 'linear-gradient(to right, transparent, var(--andes-color-slider-rail-color)), var(--_checker)',
  );

  private dragging = false;

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled() || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const step = event.shiftKey ? this.bigStep() : this.step();
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = this.value() + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = this.value() - step;
        break;
      case 'PageUp':
        next = this.value() + this.bigStep();
        break;
      case 'PageDown':
        next = this.value() - this.bigStep();
        break;
      case 'Home':
        next = this.min();
        break;
      case 'End':
        next = this.max();
        break;
      default:
        return;
    }
    event.preventDefault();
    next = clamp(next, this.min(), this.max());
    this.valueChange.emit(next);
    this.commit.emit(next);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.disabled() || (event.button ?? 0) !== 0) {
      return;
    }
    // Keeps the press from starting a text selection or stealing focus to <body>.
    event.preventDefault();
    const element = this.host.nativeElement;
    element.focus({ preventScroll: true });
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers (and old engines) cannot be captured; dragging still works
      // while the pointer stays over the rail.
    }
    this.dragging = true;
    this.moveTo(event.clientX);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.dragging) {
      this.moveTo(event.clientX);
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
    this.commit.emit(this.value());
  }

  private moveTo(clientX: number): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const span = rect.width - HANDLE_SIZE;
    const ratio =
      span > 0
        ? clamp((clientX - rect.left - HANDLE_SIZE / 2) / span, 0, 1)
        : 0;
    const next = this.min() + ratio * (this.max() - this.min());
    this.valueChange.emit(next);
  }
}
