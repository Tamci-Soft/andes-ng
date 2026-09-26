import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  AndesSlider,
  AndesSliderMarkInput,
  AndesSliderOrientation,
  AndesSliderMarks,
  AndesSliderRangeConfig,
  AndesSliderTooltip,
  AndesSliderTooltipPlacement,
  AndesSliderValue,
} from './slider';
import {
  AndesSliderMarkTemplate,
  AndesSliderTooltipTemplate,
} from './slider-templates';

@Component({
  imports: [AndesSlider],
  template: `<andes-slider
    [value]="value()"
    [min]="min()"
    [max]="max()"
    [step]="step()"
    [largeStep]="largeStep()"
    [orientation]="orientation()"
    [range]="range()"
    [disabled]="disabled()"
    [keyboard]="keyboard()"
    [dots]="dots()"
    [included]="included()"
    [reverse]="reverse()"
    [marks]="marks()"
    [tooltip]="'never'"
    aria-label="Volume"
    startAriaLabel="Minimum price"
    endAriaLabel="Maximum price"
    (valueChange)="changes.push($event)"
    (valueCommit)="commits.push($event)"
  />`,
})
class HostComponent {
  readonly value = signal<AndesSliderValue | undefined>(undefined);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly step = signal<number | null>(1);
  readonly largeStep = signal(10);
  readonly orientation = signal<AndesSliderOrientation>('horizontal');
  readonly range = signal(false);
  readonly disabled = signal(false);
  readonly keyboard = signal(true);
  readonly dots = signal(false);
  readonly included = signal(true);
  readonly reverse = signal(false);
  readonly marks = signal<readonly AndesSliderMarkInput[]>([]);
  readonly changes: (AndesSliderValue | undefined)[] = [];
  readonly commits: AndesSliderValue[] = [];
}

interface RectInit {
  readonly left?: number;
  readonly top?: number;
  readonly width?: number;
  readonly height?: number;
}

/** Overrides an element's layout box: jsdom reports an all-zero rect for everything. */
function stubRect(element: HTMLElement, init: RectInit): DOMRect {
  const left = init.left ?? 0;
  const top = init.top ?? 0;
  const width = init.width ?? 0;
  const height = init.height ?? 0;
  const rect = {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => undefined,
  } as DOMRect;
  element.getBoundingClientRect = () => rect;
  return rect;
}

/**
 * A MouseEvent dispatched under a pointer event's type. jsdom does not implement
 * PointerEvent, and the component only reads clientX/clientY/button/pointerId - all of
 * which a MouseEvent provides (pointerId simply stays undefined, which is the same shape
 * the component guards for).
 */
function pointer(
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
  clientY: number,
): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX,
    clientY,
  });
}

function key(name: string, modifiers: { shift?: boolean } = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: name,
    shiftKey: modifiers.shift ?? false,
    bubbles: true,
    cancelable: true,
  });
}

describe('AndesSlider', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    const query = <T extends HTMLElement>(selector: string) =>
      root.querySelector(selector) as T;

    return {
      fixture,
      host: fixture.componentInstance,
      root,
      get slider() {
        return query<HTMLElement>('andes-slider');
      },
      get control() {
        return query<HTMLElement>('[data-slot="slider-control"]');
      },
      get track() {
        return query<HTMLElement>('[data-slot="slider-track"]');
      },
      get indicator() {
        return query<HTMLElement>('[data-slot="slider-indicator"]');
      },
      get thumbs() {
        return Array.from(
          root.querySelectorAll<HTMLElement>('[data-slot="slider-thumb"]'),
        );
      },
      get thumb() {
        return query<HTMLElement>('[data-slot="slider-thumb"]');
      },
      valueNow(index = 0) {
        return Number(
          this.thumbs[index].getAttribute('aria-valuenow') ?? Number.NaN,
        );
      },
    };
  }

  // --- ARIA -----------------------------------------------------------------

  it('exposes role="slider" with the full aria-value* set on the focusable thumb', () => {
    const view = createHost();
    view.host.value.set(30);
    view.fixture.detectChanges();
    const thumb = view.thumb;

    expect(thumb.getAttribute('role')).toBe('slider');
    expect(thumb.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb.getAttribute('aria-valuemax')).toBe('100');
    expect(thumb.getAttribute('aria-valuenow')).toBe('30');
    expect(thumb.getAttribute('aria-orientation')).toBe('horizontal');
    expect(thumb.getAttribute('tabindex')).toBe('0');
  });

  it('omits aria-valuetext unless a valueFormatter is supplied', () => {
    const view = createHost();

    expect(view.thumb.hasAttribute('aria-valuetext')).toBe(false);
  });

  it('renders aria-valuetext (and the tooltip text) from valueFormatter', () => {
    @Component({
      imports: [AndesSlider],
      template: `<andes-slider
        [value]="20"
        [valueFormatter]="format"
        tooltip="always"
        aria-label="Price"
      />`,
    })
    class FormatterHost {
      readonly format = (value: number) => `$${value}`;
    }

    const fixture = TestBed.createComponent(FormatterHost);
    fixture.detectChanges();
    const thumb = fixture.nativeElement.querySelector(
      '[data-slot="slider-thumb"]',
    ) as HTMLElement;

    expect(thumb.getAttribute('aria-valuetext')).toBe('$20');
    expect(
      thumb.querySelector('.andes-slider__tooltip-bubble')?.textContent?.trim(),
    ).toBe('$20');
  });

  it('forwards aliased ARIA to the thumb and nulls the host copies in single mode', () => {
    const view = createHost();

    expect(view.thumb.getAttribute('aria-label')).toBe('Volume');
    expect(view.slider.hasAttribute('aria-label')).toBe(false);
    expect(view.slider.hasAttribute('role')).toBe(false);
  });

  it('groups the two thumbs in range mode and names each one separately', () => {
    const view = createHost();
    view.host.range.set(true);
    view.host.value.set([20, 60]);
    view.fixture.detectChanges();

    expect(view.slider.getAttribute('role')).toBe('group');
    expect(view.slider.getAttribute('aria-label')).toBe('Volume');
    expect(view.thumbs[0].getAttribute('aria-label')).toBe('Minimum price');
    expect(view.thumbs[1].getAttribute('aria-label')).toBe('Maximum price');
    expect(view.thumbs[0].getAttribute('data-index')).toBe('0');
    expect(view.thumbs[1].getAttribute('data-index')).toBe('1');
  });

  it('reflects orientation and disabled state as data attributes', () => {
    const view = createHost();
    view.host.orientation.set('vertical');
    view.host.disabled.set(true);
    view.fixture.detectChanges();

    expect(view.slider.getAttribute('data-orientation')).toBe('vertical');
    expect(view.slider.hasAttribute('data-disabled')).toBe(true);
    expect(view.thumb.getAttribute('aria-disabled')).toBe('true');
    expect(view.thumb.getAttribute('tabindex')).toBe('-1');
    expect(view.thumb.getAttribute('aria-orientation')).toBe('vertical');
  });

  // --- Clamping and stepping ------------------------------------------------

  it('clamps an out-of-range value to [min, max]', () => {
    const view = createHost();

    view.host.value.set(999);
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(100);

    view.host.value.set(-999);
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(0);
  });

  it('re-clamps the current value when min/max shrink around it', () => {
    const view = createHost();
    view.host.value.set(90);
    view.fixture.detectChanges();

    view.host.max.set(50);
    view.fixture.detectChanges();

    expect(view.valueNow()).toBe(50);
  });

  it('rounds an incoming value onto the step grid', () => {
    const view = createHost();
    view.host.step.set(25);

    view.host.value.set(37);
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(25);

    view.host.value.set(38);
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(50);
  });

  it('steps from min, not from zero', () => {
    const view = createHost();
    view.host.min.set(5);
    view.host.max.set(45);
    view.host.step.set(10);
    view.host.value.set(22);
    view.fixture.detectChanges();

    expect(view.valueNow()).toBe(25);
  });

  it('keeps fractional steps free of float drift', () => {
    const view = createHost();
    view.host.min.set(0);
    view.host.max.set(1);
    view.host.step.set(0.1);
    view.host.value.set(0.31);
    view.fixture.detectChanges();

    expect(view.valueNow()).toBe(0.3);

    view.thumb.dispatchEvent(key('ArrowRight'));
    view.fixture.detectChanges();

    expect(view.valueNow()).toBe(0.4);
  });

  it('snaps to marks only when step is null', () => {
    const view = createHost();
    view.host.marks.set([0, 20, 70, 100]);
    view.host.step.set(null);
    view.host.value.set(58);
    view.fixture.detectChanges();

    expect(view.valueNow()).toBe(70);
  });

  it('snaps to marks only when dots is set', () => {
    const view = createHost();
    view.host.marks.set([{ value: 0 }, { value: 33 }, { value: 66 }]);
    view.host.dots.set(true);
    view.host.value.set(40);
    view.fixture.detectChanges();

    expect(view.valueNow()).toBe(33);
  });

  it('moves one mark at a time with the arrow keys in marks-only mode', () => {
    const view = createHost();
    view.host.marks.set([0, 33, 66, 100]);
    view.host.dots.set(true);
    view.host.value.set(33);
    view.fixture.detectChanges();

    view.thumb.dispatchEvent(key('ArrowRight'));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(66);

    view.thumb.dispatchEvent(key('ArrowLeft'));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(33);
  });

  it('renders a labelled mark per labelled entry', () => {
    const view = createHost();
    view.host.marks.set([
      { value: 0, label: 'Cold' },
      { value: 50 },
      { value: 100, label: 'Hot' },
    ]);
    view.fixture.detectChanges();

    const labels = Array.from(
      view.root.querySelectorAll('.andes-slider__mark-label'),
    ).map((node) => node.textContent?.trim());
    const dots = view.root.querySelectorAll('[data-slot="slider-dot"]');

    expect(labels).toEqual(['Cold', 'Hot']);
    expect(dots.length).toBe(3);
  });

  // --- Range mode -----------------------------------------------------------

  it('renders two thumbs in range mode and sorts the incoming pair', () => {
    const view = createHost();
    view.host.range.set(true);
    view.host.value.set([70, 20]);
    view.fixture.detectChanges();

    expect(view.thumbs.length).toBe(2);
    expect(view.valueNow(0)).toBe(20);
    expect(view.valueNow(1)).toBe(70);
  });

  it('never lets the low thumb pass the high thumb', () => {
    const view = createHost();
    view.host.range.set(true);
    view.host.value.set([20, 40]);
    view.fixture.detectChanges();

    for (let i = 0; i < 40; i++) {
      view.thumbs[0].dispatchEvent(key('ArrowRight'));
    }
    view.fixture.detectChanges();

    expect(view.valueNow(0)).toBe(40);
    expect(view.valueNow(1)).toBe(40);
  });

  it('never lets the high thumb pass the low thumb', () => {
    const view = createHost();
    view.host.range.set(true);
    view.host.value.set([20, 40]);
    view.fixture.detectChanges();

    for (let i = 0; i < 40; i++) {
      view.thumbs[1].dispatchEvent(key('ArrowLeft'));
    }
    view.fixture.detectChanges();

    expect(view.valueNow(0)).toBe(20);
    expect(view.valueNow(1)).toBe(20);
  });

  it('clamps a dragged low thumb at the high thumb rather than swapping', () => {
    const view = createHost();
    view.host.range.set(true);
    view.host.value.set([20, 40]);
    view.fixture.detectChanges();

    const rect = stubRect(view.track, { left: 0, width: 100 });
    view.control.dispatchEvent(pointer('pointerdown', rect.left + 10, 0));
    view.control.dispatchEvent(pointer('pointermove', rect.left + 90, 0));
    view.fixture.detectChanges();

    expect(view.valueNow(0)).toBe(40);
    expect(view.valueNow(1)).toBe(40);
  });

  it('emits the pair, not a bare number, in range mode', () => {
    const view = createHost();
    view.host.range.set(true);
    view.host.value.set([20, 40]);
    view.fixture.detectChanges();

    view.thumbs[1].dispatchEvent(key('ArrowRight'));
    view.fixture.detectChanges();

    expect(view.host.changes.at(-1)).toEqual([20, 41]);
    expect(view.host.commits.at(-1)).toEqual([20, 41]);
  });

  // --- Keyboard -------------------------------------------------------------

  it('changes the value by step on ArrowRight/ArrowLeft and ArrowUp/ArrowDown', () => {
    const view = createHost();
    view.host.step.set(5);
    view.host.value.set(50);
    view.fixture.detectChanges();
    const thumb = view.thumb;

    thumb.dispatchEvent(key('ArrowRight'));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(55);

    thumb.dispatchEvent(key('ArrowLeft'));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(50);

    thumb.dispatchEvent(key('ArrowUp'));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(55);

    thumb.dispatchEvent(key('ArrowDown'));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(50);
  });

  it('jumps to min on Home and to max on End', () => {
    const view = createHost();
    view.host.value.set(50);
    view.host.min.set(10);
    view.host.max.set(90);
    view.fixture.detectChanges();
    const thumb = view.thumb;

    thumb.dispatchEvent(key('End'));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(90);

    thumb.dispatchEvent(key('Home'));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(10);
  });

  it('uses largeStep for Page Up/Down and Shift + Arrow', () => {
    const view = createHost();
    view.host.largeStep.set(20);
    view.host.value.set(50);
    view.fixture.detectChanges();
    const thumb = view.thumb;

    thumb.dispatchEvent(key('PageUp'));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(70);

    thumb.dispatchEvent(key('PageDown'));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(50);

    thumb.dispatchEvent(key('ArrowRight', { shift: true }));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(70);
  });

  it('clamps keyboard stepping at the bounds', () => {
    const view = createHost();
    view.host.value.set(98);
    view.fixture.detectChanges();
    const thumb = view.thumb;

    thumb.dispatchEvent(key('PageUp'));
    view.fixture.detectChanges();

    expect(view.valueNow()).toBe(100);
  });

  it('ignores unrelated keys and does not preventDefault on them', () => {
    const view = createHost();
    view.host.value.set(50);
    view.fixture.detectChanges();

    const tab = key('Tab');
    view.thumb.dispatchEvent(tab);
    view.fixture.detectChanges();

    expect(tab.defaultPrevented).toBe(false);
    expect(view.valueNow()).toBe(50);
  });

  it('honours keyboard="false"', () => {
    const view = createHost();
    view.host.value.set(50);
    view.host.keyboard.set(false);
    view.fixture.detectChanges();

    view.thumb.dispatchEvent(key('ArrowRight'));
    view.fixture.detectChanges();

    expect(view.valueNow()).toBe(50);
  });

  it('ignores the keyboard while disabled', () => {
    const view = createHost();
    view.host.value.set(50);
    view.host.disabled.set(true);
    view.fixture.detectChanges();

    view.thumb.dispatchEvent(key('ArrowRight'));
    view.fixture.detectChanges();

    expect(view.valueNow()).toBe(50);
    expect(view.host.changes).toEqual([]);
  });

  // --- Pointer drag math ----------------------------------------------------

  it('derives the value from the fraction along the track, not the raw coordinate', () => {
    const view = createHost();
    view.host.value.set(0);
    view.fixture.detectChanges();

    // A track that is neither at the viewport origin nor 100 units wide, so a raw-coordinate
    // implementation cannot accidentally produce the right answer.
    stubRect(view.track, { left: 137, width: 320 });
    const rect = view.track.getBoundingClientRect();

    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      const clientX = rect.left + rect.width * fraction;
      view.control.dispatchEvent(pointer('pointerdown', clientX, 0));
      view.control.dispatchEvent(pointer('pointerup', clientX, 0));
      view.fixture.detectChanges();

      const expected = Math.round(
        view.host.min() + fraction * (view.host.max() - view.host.min()),
      );
      expect(view.valueNow()).toBe(expected);
    }
  });

  it('measures the track box, not the padded control wrapper or the host', () => {
    const view = createHost();
    view.host.value.set(0);
    view.fixture.detectChanges();

    // The control is padded by half a thumb on each side, so its rect is wider and starts
    // earlier than the track's. Using it would skew every value.
    stubRect(view.track, { left: 100, width: 200 });
    stubRect(view.control, { left: 92, width: 216 });
    stubRect(view.slider, { left: 92, width: 216 });

    view.control.dispatchEvent(pointer('pointerdown', 150, 0));
    view.fixture.detectChanges();

    // (150 - 100) / 200 = 0.25 from the track; (150 - 92) / 216 = 0.268 from the control.
    expect(view.valueNow()).toBe(25);
  });

  it('tracks pointermove after a pointerdown and stops after pointerup', () => {
    const view = createHost();
    view.host.value.set(0);
    view.fixture.detectChanges();
    const rect = stubRect(view.track, { left: 0, width: 200 });

    view.control.dispatchEvent(pointer('pointerdown', rect.left + 20, 0));
    view.control.dispatchEvent(pointer('pointermove', rect.left + 120, 0));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(60);

    view.control.dispatchEvent(pointer('pointerup', rect.left + 120, 0));
    view.control.dispatchEvent(pointer('pointermove', rect.left + 180, 0));
    view.fixture.detectChanges();

    expect(view.valueNow()).toBe(60);
  });

  it('clamps a drag that leaves the track at both ends', () => {
    const view = createHost();
    view.host.value.set(50);
    view.fixture.detectChanges();
    const rect = stubRect(view.track, { left: 100, width: 200 });

    view.control.dispatchEvent(pointer('pointerdown', 150, 0));
    view.control.dispatchEvent(pointer('pointermove', rect.left - 500, 0));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(0);

    view.control.dispatchEvent(pointer('pointermove', rect.right + 500, 0));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(100);
  });

  it('snaps a drag onto the step grid', () => {
    const view = createHost();
    view.host.step.set(25);
    view.host.value.set(0);
    view.fixture.detectChanges();
    const rect = stubRect(view.track, { left: 0, width: 200 });

    // 0.31 along the track -> 31 raw -> 25 on a step of 25.
    view.control.dispatchEvent(
      pointer('pointerdown', rect.left + rect.width * 0.31, 0),
    );
    view.fixture.detectChanges();

    expect(view.valueNow()).toBe(25);
  });

  it('runs the block axis bottom-to-top when vertical', () => {
    const view = createHost();
    view.host.orientation.set('vertical');
    view.host.value.set(0);
    view.fixture.detectChanges();
    const rect = stubRect(view.track, { top: 40, height: 200 });

    view.control.dispatchEvent(pointer('pointerdown', 0, rect.bottom));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(0);

    view.control.dispatchEvent(pointer('pointermove', 0, rect.top));
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(100);

    view.control.dispatchEvent(
      pointer('pointermove', 0, rect.top + rect.height * 0.25),
    );
    view.fixture.detectChanges();
    expect(view.valueNow()).toBe(75);
  });

  it('mirrors the pointer axis when reverse is set', () => {
    const view = createHost();
    view.host.reverse.set(true);
    view.host.value.set(0);
    view.fixture.detectChanges();
    const rect = stubRect(view.track, { left: 0, width: 200 });

    view.control.dispatchEvent(
      pointer('pointerdown', rect.left + rect.width * 0.25, 0),
    );
    view.fixture.detectChanges();

    expect(view.valueNow()).toBe(75);
  });

  it('picks the thumb nearest the pointer in range mode', () => {
    const view = createHost();
    view.host.range.set(true);
    view.host.value.set([20, 80]);
    view.fixture.detectChanges();
    const rect = stubRect(view.track, { left: 0, width: 100 });

    view.control.dispatchEvent(pointer('pointerdown', rect.left + 30, 0));
    view.fixture.detectChanges();
    expect([view.valueNow(0), view.valueNow(1)]).toEqual([30, 80]);

    view.control.dispatchEvent(pointer('pointerup', rect.left + 30, 0));
    view.control.dispatchEvent(pointer('pointerdown', rect.left + 70, 0));
    view.fixture.detectChanges();
    expect([view.valueNow(0), view.valueNow(1)]).toEqual([30, 70]);
  });

  it('ignores pointer input while disabled', () => {
    const view = createHost();
    view.host.value.set(50);
    view.host.disabled.set(true);
    view.fixture.detectChanges();
    const rect = stubRect(view.track, { left: 0, width: 200 });

    view.control.dispatchEvent(pointer('pointerdown', rect.left + 10, 0));
    view.control.dispatchEvent(pointer('pointermove', rect.left + 180, 0));
    view.fixture.detectChanges();

    expect(view.valueNow()).toBe(50);
  });

  it('marks the dragged thumb while the pointer is down', () => {
    const view = createHost();
    const rect = stubRect(view.track, { left: 0, width: 200 });

    view.control.dispatchEvent(pointer('pointerdown', rect.left + 100, 0));
    view.fixture.detectChanges();
    expect(view.thumb.hasAttribute('data-dragging')).toBe(true);
    expect(view.slider.hasAttribute('data-dragging')).toBe(true);

    view.control.dispatchEvent(pointer('pointerup', rect.left + 100, 0));
    view.fixture.detectChanges();
    expect(view.thumb.hasAttribute('data-dragging')).toBe(false);
  });

  // --- RTL ------------------------------------------------------------------

  describe('in an RTL context', () => {
    @Component({
      imports: [AndesSlider],
      template: `<div dir="rtl">
        <andes-slider [value]="0" [step]="1" aria-label="Volume" />
      </div>`,
    })
    class RtlHost {}

    function createRtl() {
      const fixture = TestBed.createComponent(RtlHost);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      return {
        fixture,
        control: root.querySelector(
          '[data-slot="slider-control"]',
        ) as HTMLElement,
        track: root.querySelector('[data-slot="slider-track"]') as HTMLElement,
        thumb: root.querySelector('[data-slot="slider-thumb"]') as HTMLElement,
        valueNow() {
          return Number(this.thumb.getAttribute('aria-valuenow'));
        },
      };
    }

    it('measures the pointer from the track inline-start, i.e. its right edge', () => {
      const view = createRtl();
      const rect = stubRect(view.track, { left: 0, width: 200 });

      view.control.dispatchEvent(
        pointer('pointerdown', rect.left + rect.width * 0.25, 0),
      );
      view.fixture.detectChanges();

      expect(view.valueNow()).toBe(75);
    });

    it('reverses the arrow-key direction', () => {
      const view = createRtl();

      view.thumb.dispatchEvent(key('ArrowLeft'));
      view.fixture.detectChanges();
      expect(view.valueNow()).toBe(1);

      view.thumb.dispatchEvent(key('ArrowRight'));
      view.fixture.detectChanges();
      expect(view.valueNow()).toBe(0);
    });

    it('leaves ArrowUp/ArrowDown and Home/End alone', () => {
      const view = createRtl();

      view.thumb.dispatchEvent(key('ArrowUp'));
      view.fixture.detectChanges();
      expect(view.valueNow()).toBe(1);

      view.thumb.dispatchEvent(key('End'));
      view.fixture.detectChanges();
      expect(view.valueNow()).toBe(100);

      view.thumb.dispatchEvent(key('Home'));
      view.fixture.detectChanges();
      expect(view.valueNow()).toBe(0);
    });
  });

  // --- Rendered geometry ----------------------------------------------------

  it('positions the thumb and the fill as percentages of the track', () => {
    const view = createHost();
    view.host.value.set(40);
    view.fixture.detectChanges();

    expect(
      view.thumb.style.getPropertyValue('--andes-slider-thumb-offset'),
    ).toBe('40%');
    expect(
      view.indicator.style.getPropertyValue('--andes-slider-fill-start'),
    ).toBe('0%');
    expect(
      view.indicator.style.getPropertyValue('--andes-slider-fill-size'),
    ).toBe('40%');
  });

  it('fills between the two thumbs in range mode', () => {
    const view = createHost();
    view.host.range.set(true);
    view.host.value.set([20, 60]);
    view.fixture.detectChanges();

    expect(
      view.indicator.style.getPropertyValue('--andes-slider-fill-start'),
    ).toBe('20%');
    expect(
      view.indicator.style.getPropertyValue('--andes-slider-fill-size'),
    ).toBe('40%');
  });

  it('mirrors the rendered offsets when reverse is set', () => {
    const view = createHost();
    view.host.reverse.set(true);
    view.host.value.set(40);
    view.fixture.detectChanges();

    expect(
      view.thumb.style.getPropertyValue('--andes-slider-thumb-offset'),
    ).toBe('60%');
    expect(
      view.indicator.style.getPropertyValue('--andes-slider-fill-start'),
    ).toBe('60%');
    expect(
      view.indicator.style.getPropertyValue('--andes-slider-fill-size'),
    ).toBe('40%');
  });

  it('drops the fill when included is false', () => {
    const view = createHost();
    view.host.included.set(false);
    view.host.value.set(40);
    view.fixture.detectChanges();

    expect(
      view.indicator.style.getPropertyValue('--andes-slider-fill-size'),
    ).toBe('0%');
  });

  // --- Outputs --------------------------------------------------------------

  it('emits valueChange per change and valueCommit once per interaction', () => {
    const view = createHost();
    view.host.value.set(0);
    view.fixture.detectChanges();
    const rect = stubRect(view.track, { left: 0, width: 100 });

    view.control.dispatchEvent(pointer('pointerdown', rect.left + 10, 0));
    view.control.dispatchEvent(pointer('pointermove', rect.left + 20, 0));
    view.control.dispatchEvent(pointer('pointermove', rect.left + 30, 0));
    view.control.dispatchEvent(pointer('pointerup', rect.left + 30, 0));
    view.fixture.detectChanges();

    expect(view.host.changes).toEqual([10, 20, 30]);
    expect(view.host.commits).toEqual([30]);
  });

  it('does not emit when a move resolves to the same stepped value', () => {
    const view = createHost();
    view.host.step.set(50);
    view.host.value.set(0);
    view.fixture.detectChanges();
    const rect = stubRect(view.track, { left: 0, width: 100 });

    view.control.dispatchEvent(pointer('pointerdown', rect.left + 2, 0));
    view.control.dispatchEvent(pointer('pointermove', rect.left + 8, 0));
    view.fixture.detectChanges();

    expect(view.host.changes).toEqual([]);
  });

  it('supports two-way binding through value/valueChange', () => {
    @Component({
      imports: [AndesSlider],
      template: `<andes-slider
        [(value)]="bound"
        [step]="1"
        aria-label="Volume"
      />`,
    })
    class TwoWayHost {
      bound: AndesSliderValue | undefined = 10;
    }

    const fixture = TestBed.createComponent(TwoWayHost);
    fixture.detectChanges();
    const thumb = fixture.nativeElement.querySelector(
      '[data-slot="slider-thumb"]',
    ) as HTMLElement;

    thumb.dispatchEvent(key('ArrowRight'));
    fixture.detectChanges();

    expect(fixture.componentInstance.bound).toBe(11);
    expect(thumb.getAttribute('aria-valuenow')).toBe('11');
  });

  // --- Boolean attribute coercion -------------------------------------------

  it('treats bare boolean attributes (no brackets) as true', () => {
    @Component({
      imports: [AndesSlider],
      template: `<andes-slider
        range
        disabled
        dots
        reverse
        min="0"
        max="10"
        step="2"
        aria-label="Volume"
      />`,
    })
    class BareAttrHost {}

    const fixture = TestBed.createComponent(BareAttrHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const thumbs = root.querySelectorAll('[data-slot="slider-thumb"]');

    expect(thumbs.length).toBe(2);
    expect(
      (root.querySelector('andes-slider') as HTMLElement).hasAttribute(
        'data-disabled',
      ),
    ).toBe(true);
    expect(thumbs[0].getAttribute('aria-valuemax')).toBe('10');
  });

  // --- ControlValueAccessor -------------------------------------------------

  describe('ControlValueAccessor', () => {
    it('works with a reactive FormControl in single mode', () => {
      @Component({
        imports: [AndesSlider, ReactiveFormsModule],
        template: `<andes-slider
          [formControl]="control"
          [step]="1"
          aria-label="Volume"
        />`,
      })
      class ReactiveHost {
        readonly control = new FormControl<number>(35, { nonNullable: true });
      }

      const fixture = TestBed.createComponent(ReactiveHost);
      fixture.detectChanges();
      const thumb = fixture.nativeElement.querySelector(
        '[data-slot="slider-thumb"]',
      ) as HTMLElement;

      expect(thumb.getAttribute('aria-valuenow')).toBe('35');

      thumb.dispatchEvent(key('ArrowRight'));
      fixture.detectChanges();
      expect(fixture.componentInstance.control.value).toBe(36);

      fixture.componentInstance.control.setValue(80);
      fixture.detectChanges();
      expect(thumb.getAttribute('aria-valuenow')).toBe('80');
    });

    it('carries a [number, number] pair through a FormControl in range mode', () => {
      @Component({
        imports: [AndesSlider, ReactiveFormsModule],
        template: `<andes-slider
          range
          [formControl]="control"
          [step]="1"
          startAriaLabel="Low"
          endAriaLabel="High"
        />`,
      })
      class ReactiveRangeHost {
        readonly control = new FormControl<[number, number]>([25, 75], {
          nonNullable: true,
        });
      }

      const fixture = TestBed.createComponent(ReactiveRangeHost);
      fixture.detectChanges();
      const thumbs = fixture.nativeElement.querySelectorAll(
        '[data-slot="slider-thumb"]',
      ) as NodeListOf<HTMLElement>;

      expect(thumbs[0].getAttribute('aria-valuenow')).toBe('25');
      expect(thumbs[1].getAttribute('aria-valuenow')).toBe('75');

      thumbs[0].dispatchEvent(key('ArrowLeft'));
      fixture.detectChanges();
      expect(fixture.componentInstance.control.value).toEqual([24, 75]);

      fixture.componentInstance.control.setValue([10, 20]);
      fixture.detectChanges();
      expect(thumbs[0].getAttribute('aria-valuenow')).toBe('10');
      expect(thumbs[1].getAttribute('aria-valuenow')).toBe('20');
    });

    it('works with ngModel (template-driven forms)', async () => {
      @Component({
        imports: [AndesSlider, FormsModule],
        template: `<andes-slider
          [(ngModel)]="volume"
          [step]="1"
          aria-label="Volume"
        />`,
      })
      class NgModelHost {
        volume = 60;
      }

      const fixture = TestBed.createComponent(NgModelHost);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const thumb = fixture.nativeElement.querySelector(
        '[data-slot="slider-thumb"]',
      ) as HTMLElement;

      expect(thumb.getAttribute('aria-valuenow')).toBe('60');

      thumb.dispatchEvent(key('ArrowRight'));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.volume).toBe(61);
    });

    it('falls back to min when the form writes null', () => {
      @Component({
        imports: [AndesSlider, ReactiveFormsModule],
        template: `<andes-slider
          [formControl]="control"
          [min]="5"
          aria-label="Volume"
        />`,
      })
      class NullHost {
        readonly control = new FormControl<number | null>(null);
      }

      const fixture = TestBed.createComponent(NullHost);
      fixture.detectChanges();
      const thumb = fixture.nativeElement.querySelector(
        '[data-slot="slider-thumb"]',
      ) as HTMLElement;

      expect(thumb.getAttribute('aria-valuenow')).toBe('5');
    });

    it('honours a control disabled through the forms API', () => {
      @Component({
        imports: [AndesSlider, ReactiveFormsModule],
        template: `<andes-slider
          [formControl]="control"
          aria-label="Volume"
        />`,
      })
      class DisabledHost {
        readonly control = new FormControl<number>(40, { nonNullable: true });
      }

      const fixture = TestBed.createComponent(DisabledHost);
      fixture.detectChanges();
      const slider = fixture.nativeElement.querySelector(
        'andes-slider',
      ) as HTMLElement;
      const thumb = fixture.nativeElement.querySelector(
        '[data-slot="slider-thumb"]',
      ) as HTMLElement;

      fixture.componentInstance.control.disable();
      fixture.detectChanges();
      expect(slider.hasAttribute('data-disabled')).toBe(true);
      expect(thumb.getAttribute('tabindex')).toBe('-1');

      thumb.dispatchEvent(key('ArrowRight'));
      fixture.detectChanges();
      expect(thumb.getAttribute('aria-valuenow')).toBe('40');

      fixture.componentInstance.control.enable();
      fixture.detectChanges();
      expect(slider.hasAttribute('data-disabled')).toBe(false);
    });

    it('marks the control touched on blur and after an interaction', () => {
      @Component({
        imports: [AndesSlider, ReactiveFormsModule],
        template: `<andes-slider
          [formControl]="control"
          aria-label="Volume"
        />`,
      })
      class TouchedHost {
        readonly control = new FormControl<number>(40, { nonNullable: true });
      }

      const fixture = TestBed.createComponent(TouchedHost);
      fixture.detectChanges();
      const thumb = fixture.nativeElement.querySelector(
        '[data-slot="slider-thumb"]',
      ) as HTMLElement;

      expect(fixture.componentInstance.control.touched).toBe(false);

      thumb.dispatchEvent(new FocusEvent('blur'));
      fixture.detectChanges();

      expect(fixture.componentInstance.control.touched).toBe(true);
    });
  });

  // --- Ant Design parity ----------------------------------------------------

  describe('Ant Design parity', () => {
    @Component({
      imports: [AndesSlider],
      template: `<andes-slider
        [value]="value()"
        [min]="min()"
        [max]="max()"
        [step]="step()"
        [range]="range()"
        [disabled]="disabled()"
        [dots]="dots()"
        [included]="included()"
        [marks]="marks()"
        [orientation]="orientation()"
        [tooltip]="tooltip()"
        [tooltipPlacement]="placement()"
        [tooltipFormatter]="tooltipFormatter()"
        [valueFormatter]="valueFormatter()"
        [thumbAriaLabel]="thumbAriaLabel()"
        aria-label="Volume"
        (valueChange)="changes.push($event)"
        (valueCommit)="commits.push($event)"
      />`,
    })
    class ParityHost {
      readonly slider = viewChild.required(AndesSlider);
      readonly value = signal<AndesSliderValue | undefined>(undefined);
      readonly min = signal(0);
      readonly max = signal(100);
      readonly step = signal<number | null>(1);
      readonly range = signal<boolean | AndesSliderRangeConfig>(false);
      readonly disabled = signal<boolean | readonly boolean[]>(false);
      readonly dots = signal(false);
      readonly included = signal(true);
      readonly marks = signal<AndesSliderMarks>([]);
      readonly orientation = signal<AndesSliderOrientation>('horizontal');
      readonly tooltip = signal<AndesSliderTooltip>('always');
      readonly placement = signal<AndesSliderTooltipPlacement | undefined>(
        undefined,
      );
      readonly tooltipFormatter = signal<
        ((value: number, index: number) => string | null) | null | undefined
      >(undefined);
      readonly valueFormatter = signal<
        ((value: number, index: number) => string) | undefined
      >(undefined);
      readonly thumbAriaLabel = signal<
        ((index: number, count: number) => string) | undefined
      >(undefined);
      readonly changes: (AndesSliderValue | undefined)[] = [];
      readonly commits: AndesSliderValue[] = [];
    }

    function mount(setup: (host: ParityHost) => void = () => undefined) {
      const fixture = TestBed.createComponent(ParityHost);
      setup(fixture.componentInstance);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const all = (selector: string) =>
        Array.from(root.querySelectorAll<HTMLElement>(selector));

      return {
        fixture,
        host: fixture.componentInstance,
        root,
        get slider() {
          return root.querySelector('andes-slider') as HTMLElement;
        },
        get control() {
          return root.querySelector(
            '[data-slot="slider-control"]',
          ) as HTMLElement;
        },
        get track() {
          return root.querySelector(
            '[data-slot="slider-track"]',
          ) as HTMLElement;
        },
        get indicator() {
          return root.querySelector(
            '[data-slot="slider-indicator"]',
          ) as HTMLElement;
        },
        get thumbs() {
          return all('[data-slot="slider-thumb"]');
        },
        get dots() {
          return all('[data-slot="slider-dot"]');
        },
        get markLabels() {
          return all('[data-slot="slider-mark"]');
        },
        get tooltips() {
          return all('.andes-slider__tooltip');
        },
        values() {
          return all('[data-slot="slider-thumb"]').map((thumb) =>
            Number(thumb.getAttribute('aria-valuenow')),
          );
        },
        fillSize() {
          return this.indicator.style.getPropertyValue(
            '--andes-slider-fill-size',
          );
        },
        detect() {
          fixture.detectChanges();
        },
      };
    }

    // marks ---------------------------------------------------------------

    it('accepts Ant Design keyed marks with per-mark style and class', () => {
      const view = mount((host) =>
        host.marks.set({
          0: '0°C',
          26: { label: '26°C', class: 'warm' },
          100: { label: '100°C', style: { color: 'rgb(255, 0, 0)' } },
        }),
      );

      const labels = view.markLabels;
      expect(labels.map((label) => label.textContent?.trim())).toEqual([
        '0°C',
        '26°C',
        '100°C',
      ]);
      expect(labels[1].classList.contains('warm')).toBe(true);
      expect(labels[1].classList.contains('andes-slider__mark-label')).toBe(
        true,
      );
      expect(labels[2].style.color).toBe('rgb(255, 0, 0)');
      expect(view.dots.length).toBe(3);
    });

    it('flags mark labels and dots inside the included segment as active', () => {
      const view = mount((host) => {
        host.marks.set([
          { value: 0, label: 'A' },
          { value: 50, label: 'B' },
          { value: 100, label: 'C' },
        ]);
        host.value.set(60);
      });

      const activeLabels = view.markLabels.map((label) =>
        label.classList.contains('andes-slider__mark-label--active'),
      );
      const activeDots = view.dots.map((dot) =>
        dot.classList.contains('andes-slider__dot--active'),
      );
      expect(activeLabels).toEqual([true, true, false]);
      expect(activeDots).toEqual([true, true, false]);

      view.host.included.set(false);
      view.detect();
      expect(
        view.markLabels.some((label) =>
          label.classList.contains('andes-slider__mark-label--active'),
        ),
      ).toBe(false);
    });

    it('renders a custom mark template for every mark, labelled or not', () => {
      @Component({
        imports: [AndesSlider, AndesSliderMarkTemplate],
        template: `<andes-slider
          [value]="50"
          [marks]="[0, 50, { value: 100, label: 'Max' }]"
          aria-label="Volume"
        >
          <ng-template
            andesSliderMark
            let-mark
            let-active="active"
            let-label="label"
          >
            <b class="custom"
              >{{ label ?? mark.value + '%' }}{{ active ? '*' : '' }}</b
            >
          </ng-template>
        </andes-slider>`,
      })
      class MarkTemplateHost {}

      const fixture = TestBed.createComponent(MarkTemplateHost);
      fixture.detectChanges();
      const custom = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('b.custom'),
      ).map((node) => node.textContent?.trim());

      expect(custom).toEqual(['0%*', '50%*', 'Max']);
    });

    it('moves the nearest handle to a clicked mark and commits', () => {
      const view = mount((host) => {
        host.range.set(true);
        host.value.set([10, 90]);
        host.marks.set([
          { value: 20, label: 'Low' },
          { value: 70, label: 'High' },
        ]);
      });

      view.markLabels[1].click();
      view.detect();

      expect(view.values()).toEqual([10, 70]);
      expect(view.host.commits).toEqual([[10, 70]]);
    });

    it('ignores mark clicks while disabled', () => {
      const view = mount((host) => {
        host.disabled.set(true);
        host.value.set(10);
        host.marks.set([{ value: 70, label: 'High' }]);
      });

      view.markLabels[0].click();
      view.detect();

      expect(view.values()).toEqual([10]);
      expect(view.host.commits).toEqual([]);
    });

    // dots ----------------------------------------------------------------

    it('draws a dot at every step when dots is set without marks', () => {
      const view = mount((host) => {
        host.dots.set(true);
        host.step.set(25);
        host.value.set(50);
      });

      expect(view.dots.length).toBe(5);
      expect(
        view.dots.map((dot) =>
          dot.classList.contains('andes-slider__dot--active'),
        ),
      ).toEqual([true, true, true, false, false]);
    });

    it('skips step dots that would crowd the rail', () => {
      const view = mount((host) => {
        host.dots.set(true);
        host.max.set(1000);
      });

      expect(view.dots.length).toBe(0);
    });

    it('keeps decimal step dots free of float drift', () => {
      const view = mount((host) => {
        host.dots.set(true);
        host.max.set(1);
        host.step.set(0.1);
      });

      expect(view.dots.length).toBe(11);
      expect(
        view.dots[3].style.getPropertyValue('--andes-slider-dot-offset'),
      ).toBe('30%');
    });

    // included ------------------------------------------------------------

    it('drops the fill in range mode too when included is false', () => {
      const view = mount((host) => {
        host.range.set(true);
        host.included.set(false);
        host.value.set([20, 60]);
      });

      expect(view.fillSize()).toBe('0%');
    });

    // tooltip -------------------------------------------------------------

    it('places the tooltip on top by default and at the inline end when vertical', () => {
      const view = mount((host) => host.value.set(30));
      expect(view.tooltips[0].getAttribute('data-placement')).toBe('top');

      view.host.orientation.set('vertical');
      view.detect();
      expect(view.tooltips[0].getAttribute('data-placement')).toBe('end');

      view.host.placement.set('left');
      view.detect();
      expect(view.tooltips[0].getAttribute('data-placement')).toBe('left');
    });

    it('formats tooltip text separately from aria-valuetext', () => {
      const view = mount((host) => {
        host.value.set(30);
        host.valueFormatter.set((value) => `${value} percent`);
        host.tooltipFormatter.set((value) => `${value}%`);
      });

      expect(view.tooltips[0].textContent?.trim()).toBe('30%');
      expect(view.thumbs[0].getAttribute('aria-valuetext')).toBe('30 percent');
    });

    it('hides a tooltip whose formatter returns null, and all of them for a null formatter', () => {
      const view = mount((host) => {
        host.range.set(true);
        host.value.set([20, 80]);
        host.tooltipFormatter.set((value) => (value > 50 ? `${value}` : null));
      });

      expect(view.thumbs[0].querySelector('.andes-slider__tooltip')).toBeNull();
      expect(
        view.thumbs[1]
          .querySelector('.andes-slider__tooltip')
          ?.textContent?.trim(),
      ).toBe('80');

      view.host.tooltipFormatter.set(null);
      view.detect();
      expect(view.tooltips.length).toBe(0);
    });

    it('renders a custom tooltip template with the value and index', () => {
      @Component({
        imports: [AndesSlider, AndesSliderTooltipTemplate],
        template: `<andes-slider
          range
          [value]="[10, 40]"
          tooltip="always"
          startAriaLabel="Min"
          endAriaLabel="Max"
        >
          <ng-template andesSliderTooltip let-value let-index="index">
            <i class="tip">#{{ index }}={{ value }}</i>
          </ng-template>
        </andes-slider>`,
      })
      class TooltipTemplateHost {}

      const fixture = TestBed.createComponent(TooltipTemplateHost);
      fixture.detectChanges();
      const tips = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('i.tip'),
      ).map((node) => node.textContent?.trim());

      expect(tips).toEqual(['#0=10', '#1=40']);
    });

    // multi-handle range --------------------------------------------------

    it('keeps every handle of a multi-handle range, sorted and uncrossable', () => {
      const view = mount((host) => {
        host.range.set(true);
        host.value.set([70, 10, 40]);
        host.thumbAriaLabel.set(
          (index, count) => `Handle ${index + 1} of ${count}`,
        );
      });

      expect(view.values()).toEqual([10, 40, 70]);
      expect(view.thumbs[1].getAttribute('aria-label')).toBe('Handle 2 of 3');

      view.thumbs[1].dispatchEvent(key('End'));
      view.detect();
      expect(view.values()).toEqual([10, 70, 70]);

      view.thumbs[1].dispatchEvent(key('Home'));
      view.detect();
      expect(view.values()).toEqual([10, 10, 70]);
    });

    it('writes the value back into the model on interaction', () => {
      const view = mount((host) => host.value.set(20));

      view.thumbs[0].dispatchEvent(key('ArrowRight'));
      view.detect();

      expect(view.host.slider().value()).toBe(21);
      expect(view.host.changes).toEqual([21]);
    });

    it('keeps a writeValue when only min/max change afterwards', () => {
      const view = mount((host) => host.value.set(20));
      view.host.slider().writeValue(60);
      view.host.max.set(90);
      view.detect();

      expect(view.values()).toEqual([60]);
    });

    // draggableTrack ------------------------------------------------------

    it('drags the whole range by its track, keeping the spacing', () => {
      const view = mount((host) => {
        host.range.set({ draggableTrack: true });
        host.value.set([20, 40]);
        host.step.set(5);
      });
      const rect = stubRect(view.track, { left: 0, width: 100 });

      view.control.dispatchEvent(pointer('pointerdown', rect.left + 30, 0));
      view.control.dispatchEvent(pointer('pointermove', rect.left + 52, 0));
      view.detect();
      expect(view.values()).toEqual([40, 60]);

      // Stops as a whole at the bound instead of squeezing the range.
      view.control.dispatchEvent(pointer('pointermove', rect.left + 200, 0));
      view.control.dispatchEvent(pointer('pointerup', rect.left + 200, 0));
      view.detect();
      expect(view.values()).toEqual([80, 100]);
      expect(view.host.commits).toEqual([[80, 100]]);
      expect(view.slider.hasAttribute('data-draggable-track')).toBe(true);
    });

    it('moves the nearest handle when pressing outside the range', () => {
      const view = mount((host) => {
        host.range.set({ draggableTrack: true });
        host.value.set([20, 40]);
      });
      const rect = stubRect(view.track, { left: 0, width: 100 });

      view.control.dispatchEvent(pointer('pointerdown', rect.left + 80, 0));
      view.control.dispatchEvent(pointer('pointerup', rect.left + 80, 0));
      view.detect();

      expect(view.values()).toEqual([20, 80]);
    });

    // editable ------------------------------------------------------------

    it('adds a handle where the rail is clicked in an editable range', () => {
      const view = mount((host) => {
        host.range.set({ editable: true, maxCount: 3 });
        host.value.set([20, 80]);
      });
      const rect = stubRect(view.track, { left: 0, width: 100 });

      view.control.dispatchEvent(pointer('pointerdown', rect.left + 50, 0));
      view.control.dispatchEvent(pointer('pointermove', rect.left + 55, 0));
      view.control.dispatchEvent(pointer('pointerup', rect.left + 55, 0));
      view.detect();

      expect(view.values()).toEqual([20, 55, 80]);
      expect(view.host.changes).toEqual([
        [20, 50, 80],
        [20, 55, 80],
      ]);

      // maxCount reached: the next click moves the nearest handle instead.
      view.control.dispatchEvent(pointer('pointerdown', rect.left + 90, 0));
      view.control.dispatchEvent(pointer('pointerup', rect.left + 90, 0));
      view.detect();
      expect(view.values()).toEqual([20, 55, 90]);
    });

    it('does not add a handle when pressing an existing one', () => {
      const view = mount((host) => {
        host.range.set({ editable: true });
        host.value.set([20, 80]);
      });
      stubRect(view.track, { left: 0, width: 100 });

      view.thumbs[0].dispatchEvent(pointer('pointerdown', 20, 0));
      view.control.dispatchEvent(pointer('pointerup', 20, 0));
      view.detect();

      expect(view.values()).toEqual([20, 80]);
    });

    it('removes the focused handle with Delete, down to minCount', async () => {
      const view = mount((host) => {
        host.range.set({ editable: true, minCount: 2 });
        host.value.set([10, 50, 90]);
      });

      view.thumbs[1].dispatchEvent(key('Delete'));
      view.detect();
      await view.fixture.whenStable();
      expect(view.values()).toEqual([10, 90]);
      expect(view.host.commits).toEqual([[10, 90]]);
      expect(document.activeElement).toBe(view.thumbs[1]);

      view.thumbs[0].dispatchEvent(key('Backspace'));
      view.detect();
      expect(view.values()).toEqual([10, 90]);
    });

    it('ignores Delete outside an editable range', () => {
      const view = mount((host) => {
        host.range.set(true);
        host.value.set([10, 90]);
      });

      view.thumbs[0].dispatchEvent(key('Delete'));
      view.detect();

      expect(view.values()).toEqual([10, 90]);
    });

    it('removes a handle dragged far off the track, on release', () => {
      const view = mount((host) => {
        host.range.set({ editable: true });
        host.value.set([10, 50, 90]);
      });
      const rect = stubRect(view.track, {
        left: 0,
        top: 100,
        width: 100,
        height: 4,
      });

      view.thumbs[1].dispatchEvent(pointer('pointerdown', 50, 102));
      view.control.dispatchEvent(pointer('pointermove', 50, 102 + 200));
      view.detect();
      expect(view.thumbs[1].hasAttribute('data-removing')).toBe(true);
      expect(view.values()).toEqual([10, 50, 90]);

      view.control.dispatchEvent(pointer('pointerup', 50, rect.bottom + 200));
      view.detect();
      expect(view.values()).toEqual([10, 90]);
      expect(view.host.commits).toEqual([[10, 90]]);
    });

    it('cancels a pending removal when the handle comes back to the track', () => {
      const view = mount((host) => {
        host.range.set({ editable: true });
        host.value.set([10, 50, 90]);
      });
      stubRect(view.track, { left: 0, top: 100, width: 100, height: 4 });

      view.thumbs[1].dispatchEvent(pointer('pointerdown', 50, 102));
      view.control.dispatchEvent(pointer('pointermove', 50, 400));
      view.control.dispatchEvent(pointer('pointermove', 60, 110));
      view.control.dispatchEvent(pointer('pointerup', 60, 110));
      view.detect();

      expect(view.values()).toEqual([10, 60, 90]);
    });

    it('lets editable win over draggableTrack, as in Ant Design', () => {
      const view = mount((host) => {
        host.range.set({ editable: true, draggableTrack: true });
        host.value.set([20, 80]);
      });

      expect(view.slider.hasAttribute('data-draggable-track')).toBe(false);
      expect(view.slider.hasAttribute('data-editable')).toBe(true);
    });

    it('trims an editable range to maxCount and pads it to minCount', () => {
      const view = mount((host) => {
        host.range.set({ editable: true, minCount: 3, maxCount: 4 });
        host.value.set([10]);
      });
      expect(view.values()).toEqual([10, 10, 10]);

      view.host.value.set([1, 2, 3, 4, 5, 6]);
      view.detect();
      expect(view.values()).toEqual([1, 2, 3, 4]);
    });

    // per-handle disabled -------------------------------------------------

    it('disables individual handles from a boolean array', () => {
      const view = mount((host) => {
        host.range.set(true);
        host.value.set([20, 60]);
        host.disabled.set([true, false]);
      });
      const rect = stubRect(view.track, { left: 0, width: 100 });

      expect(view.slider.hasAttribute('data-disabled')).toBe(false);
      expect(view.thumbs[0].getAttribute('tabindex')).toBe('-1');
      expect(view.thumbs[0].getAttribute('aria-disabled')).toBe('true');
      expect(view.thumbs[1].getAttribute('tabindex')).toBe('0');

      view.thumbs[0].dispatchEvent(key('ArrowRight'));
      // Nearer to the disabled handle, but only the enabled one may move.
      view.control.dispatchEvent(pointer('pointerdown', rect.left + 25, 0));
      view.control.dispatchEvent(pointer('pointerup', rect.left + 25, 0));
      view.detect();

      expect(view.values()).toEqual([20, 25]);
    });

    // stacked handles -----------------------------------------------------

    it('lets the drag direction pick between stacked handles', () => {
      const view = mount((host) => {
        host.range.set(true);
        host.value.set([50, 50]);
      });
      const rect = stubRect(view.track, { left: 0, width: 100 });

      view.control.dispatchEvent(pointer('pointerdown', rect.left + 50, 0));
      view.control.dispatchEvent(pointer('pointermove', rect.left + 30, 0));
      view.control.dispatchEvent(pointer('pointerup', rect.left + 30, 0));
      view.detect();

      expect(view.values()).toEqual([30, 50]);
    });

    // focus -----------------------------------------------------------------

    it('focuses the first handle on autoFocus and exposes focus()/blur()', async () => {
      @Component({
        imports: [AndesSlider],
        template: `<andes-slider
          autoFocus
          range
          [value]="[10, 20]"
          startAriaLabel="Min"
          endAriaLabel="Max"
        />`,
      })
      class AutoFocusHost {
        readonly slider = viewChild.required(AndesSlider);
      }

      const fixture = TestBed.createComponent(AutoFocusHost);
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
      await fixture.whenStable();
      const thumbs = (fixture.nativeElement as HTMLElement).querySelectorAll(
        '[data-slot="slider-thumb"]',
      );

      expect(document.activeElement).toBe(thumbs[0]);

      fixture.componentInstance.slider().focus(1);
      expect(document.activeElement).toBe(thumbs[1]);

      fixture.componentInstance.slider().blur();
      expect(document.activeElement).toBe(document.body);
      fixture.nativeElement.remove();
    });
  });
});
