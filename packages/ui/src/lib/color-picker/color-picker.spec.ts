import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AndesColor, type AndesColorInput } from './color';
import type { AndesColorFormat } from './color-math';
import { AndesColorPicker } from './color-picker';
import { AndesColorPickerTrigger } from './color-picker-trigger';
import type {
  AndesColorChangeEvent,
  AndesColorPickerShowText,
  AndesColorPreset,
} from './color-picker-types';

const read = (file: string) =>
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), file), 'utf-8');
const css = (file: string) =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ');

const KEY_CODES: Record<string, number> = { Escape: 27, Tab: 9, Enter: 13 };

/** The fixture of the current test: input changes made by an event need a render to land. */
let current: ComponentFixture<unknown> | null = null;

function press(
  target: Element,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  Object.defineProperty(event, 'keyCode', { get: () => KEY_CODES[key] ?? 0 });
  target.dispatchEvent(event);
  current?.detectChanges();
  return event;
}

function pointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  x: number,
  y: number,
): void {
  target.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  );
  current?.detectChanges();
}

function sizeBox(element: Element, width: number, height: number): void {
  element.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON: () => ({}),
    }) as DOMRect;
}

const PRESETS: readonly AndesColorPreset[] = [
  { label: 'Warm', colors: ['#ff0000', '#ff8800', '#ffee00'] },
  { label: 'Cool', colors: ['#0000ff', 'teal'], defaultOpen: false },
];

@Component({
  imports: [AndesColorPicker, AndesColorPickerTrigger],
  template: `<andes-color-picker
    aria-label="Brand"
    [(value)]="value"
    [(open)]="open"
    [size]="size()"
    [status]="status()"
    [disabled]="disabled()"
    [allowClear]="allowClear()"
    [showText]="showText()"
    [showAlpha]="showAlpha()"
    [disabledAlpha]="disabledAlpha()"
    [disabledFormat]="disabledFormat()"
    [eyeDropper]="false"
    [format]="format()"
    [defaultFormat]="defaultFormat()"
    [presets]="presets()"
    [placement]="placement()"
    [labels]="labels()"
    (colorChange)="changes.push($event)"
    (colorChangeComplete)="completes.push($event)"
    (clear)="clears = clears + 1"
    (formatChange)="formatChanges.push($event)"
  >
    @if (custom()) {
      <span andesColorPickerTrigger class="mine">Pick</span>
    }
  </andes-color-picker>`,
})
class PickerHost {
  readonly value = signal<AndesColorInput | null>('#1677ff');
  readonly open = signal(false);
  readonly size = signal<'sm' | 'md' | 'lg'>('md');
  readonly status = signal<'error' | 'warning' | undefined>(undefined);
  readonly disabled = signal(false);
  readonly allowClear = signal(false);
  readonly showText = signal<AndesColorPickerShowText>(false);
  readonly showAlpha = signal(true);
  readonly disabledAlpha = signal(false);
  readonly disabledFormat = signal(false);
  readonly format = signal<AndesColorFormat | undefined>(undefined);
  readonly defaultFormat = signal<AndesColorFormat>('hex');
  readonly presets = signal<readonly AndesColorPreset[]>([]);
  readonly placement = signal<
    'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'
  >('bottomLeft');
  readonly labels = signal<Record<string, string>>({});
  readonly custom = signal(false);
  readonly changes: AndesColorChangeEvent[] = [];
  readonly completes: AndesColorChangeEvent[] = [];
  readonly formatChanges: AndesColorFormat[] = [];
  clears = 0;
}

@Component({
  imports: [AndesColorPicker, ReactiveFormsModule],
  template: `<andes-color-picker
    aria-label="Accent"
    [formControl]="control"
  />`,
})
class FormHost {
  readonly control = new FormControl<AndesColorInput | null>('#ff0000');
}

describe('AndesColorPicker', () => {
  afterEach(() => {
    current = null;
  });

  function setup(configure?: (host: PickerHost) => void) {
    const fixture = TestBed.createComponent(PickerHost);
    configure?.(fixture.componentInstance);
    fixture.detectChanges();
    return withHelpers(fixture);
  }

  function withHelpers(fixture: ComponentFixture<PickerHost>) {
    current = fixture;
    const root = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;
    const trigger = () =>
      root.querySelector<HTMLButtonElement>(
        '[data-slot="color-picker-trigger"]',
      ) as HTMLButtonElement;
    const panel = () =>
      document.querySelector<HTMLElement>('[data-slot="color-picker-panel"]');
    const q = <T extends HTMLElement = HTMLElement>(selector: string) =>
      panel()?.querySelector<T>(selector) ?? null;
    const detect = () => fixture.detectChanges();
    const open = () => {
      trigger().click();
      fixture.detectChanges();
    };
    const area = () => q('andes-color-area') as HTMLElement;
    const hue = () => q('andes-color-slider[data-type="hue"]') as HTMLElement;
    const alpha = () =>
      q('andes-color-slider[data-type="alpha"]') as HTMLElement | null;
    const field = (label: string) =>
      q<HTMLInputElement>(`input[aria-label="${label}"]`) as HTMLInputElement;
    const type = (input: HTMLInputElement, text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
    };
    const commit = (input: HTMLInputElement) => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
    };
    const presetButtons = () =>
      Array.from(
        panel()?.querySelectorAll<HTMLButtonElement>(
          '[data-slot="color-picker-preset"]',
        ) ?? [],
      );
    return {
      fixture,
      host,
      root,
      trigger,
      panel,
      q,
      detect,
      open,
      area,
      hue,
      alpha,
      field,
      type,
      commit,
      presetButtons,
    };
  }

  describe('trigger', () => {
    it('is a real button that advertises the dialog it opens', () => {
      const { trigger, root } = setup();

      expect(trigger().tagName).toBe('BUTTON');
      expect(trigger().getAttribute('type')).toBe('button');
      expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
      // The wrapper keeps no ARIA of its own: only the button is reachable.
      expect(
        root.querySelector('andes-color-picker')?.hasAttribute('aria-label'),
      ).toBe(false);
    });

    it('names itself from the label and the current value', () => {
      const { trigger, host, fixture } = setup();

      expect(trigger().getAttribute('aria-label')).toBe('Brand, #1677ff');

      host.value.set('rgb(255, 0, 0)');
      fixture.detectChanges();
      expect(trigger().getAttribute('aria-label')).toBe('Brand, #ff0000');

      host.value.set(null);
      fixture.detectChanges();
      expect(trigger().getAttribute('aria-label')).toBe('Brand, No color');
    });

    it('lets aria-labelledby name it, followed by the value', () => {
      const fixture = TestBed.createComponent(AndesColorPicker);
      fixture.componentRef.setInput('aria-labelledby', 'heading');
      fixture.componentRef.setInput('value', '#00ff00');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button');

      expect(button.hasAttribute('aria-label')).toBe(false);
      expect(button.getAttribute('aria-labelledby')).toMatch(
        /^heading andes-color-picker-value-\d+$/,
      );
      const valueId = button.getAttribute('aria-labelledby').split(' ')[1];
      expect(
        fixture.nativeElement.querySelector(`#${valueId}`).textContent,
      ).toBe('#00ff00');
    });

    it('forwards id so a label can target the button', () => {
      const fixture = TestBed.createComponent(AndesColorPicker);
      fixture.componentRef.setInput('id', 'accent');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('button').id).toBe('accent');
      expect(fixture.nativeElement.hasAttribute('id')).toBe(false);
    });

    it('shows the colour in the swatch and an empty state without one', () => {
      const { root, host, fixture } = setup();
      const swatch = () =>
        root.querySelector<HTMLElement>('.andes-color-picker__swatch');
      const fill = () =>
        root.querySelector<HTMLElement>('.andes-color-picker__swatch-fill');

      expect(fill()?.style.backgroundColor).toBe('rgb(22, 119, 255)');
      expect(swatch()?.hasAttribute('data-empty')).toBe(false);

      host.value.set(null);
      fixture.detectChanges();
      expect(swatch()?.hasAttribute('data-empty')).toBe(true);
    });

    it.each(['sm', 'md', 'lg'] as const)('reflects the %s size', (size) => {
      const { trigger, host, fixture } = setup();
      host.size.set(size);
      fixture.detectChanges();

      expect(trigger().getAttribute('data-size')).toBe(size);
    });

    it('shows the value as text in the current format', () => {
      const { root, host, fixture } = setup();
      host.showText.set(true);
      fixture.detectChanges();
      const text = () =>
        root.querySelector('.andes-color-picker__text')?.textContent?.trim();

      expect(text()).toBe('#1677FF');

      host.defaultFormat.set('rgb');
      fixture.detectChanges();
      expect(text()).toBe('rgb(22, 119, 255)');

      host.defaultFormat.set('hsb');
      fixture.detectChanges();
      expect(text()).toBe('hsb(215, 91%, 100%)');
    });

    it('renders a custom text template with the colour and its text', () => {
      @Component({
        imports: [AndesColorPicker],
        template: `
          <ng-template #tpl let-color let-text="value">
            <b class="custom">{{ color.toHex() }}|{{ text }}</b>
          </ng-template>
          <andes-color-picker aria-label="X" value="#ff0000" [showText]="tpl" />
        `,
      })
      class TemplateHost {}
      const fixture = TestBed.createComponent(TemplateHost);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.custom').textContent).toBe(
        '#ff0000|#ff0000',
      );
    });

    it('shows the placeholder as text while empty', () => {
      const fixture = TestBed.createComponent(AndesColorPicker);
      fixture.componentRef.setInput('showText', true);
      fixture.componentRef.setInput('placeholder', 'Pick one');
      fixture.detectChanges();

      expect(
        fixture.nativeElement
          .querySelector('.andes-color-picker__text')
          .textContent.trim(),
      ).toBe('Pick one');
    });

    it('projects custom trigger content in place of the swatch', () => {
      const { root, trigger, host, fixture } = setup();
      expect(root.querySelector('.mine')).toBeNull();

      host.custom.set(true);
      fixture.detectChanges();

      expect(trigger().querySelector('.mine')?.textContent).toBe('Pick');
      expect(trigger().hasAttribute('data-custom')).toBe(true);
      expect(root.querySelector('.andes-color-picker__swatch')).toBeNull();
      // Still the same accessible, ARIA-wired button.
      expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
    });

    it('marks error and warning statuses, and aria-invalid for error', () => {
      const { trigger, host, fixture } = setup();

      host.status.set('error');
      fixture.detectChanges();
      expect(trigger().getAttribute('data-status')).toBe('error');
      expect(trigger().getAttribute('aria-invalid')).toBe('true');

      host.status.set('warning');
      fixture.detectChanges();
      expect(trigger().getAttribute('data-status')).toBe('warning');
      expect(trigger().hasAttribute('aria-invalid')).toBe(false);
    });

    it('does not open while disabled and closes if it becomes disabled', () => {
      const { trigger, panel, host, fixture, open } = setup((h) =>
        h.disabled.set(true),
      );
      expect(trigger().disabled).toBe(true);
      open();
      expect(panel()).toBeNull();

      host.disabled.set(false);
      fixture.detectChanges();
      open();
      expect(panel()).not.toBeNull();

      host.disabled.set(true);
      fixture.detectChanges();
      expect(host.open()).toBe(false);
    });
  });

  describe('opening and closing', () => {
    it('opens a named dialog and moves focus to the area', async () => {
      const { trigger, panel, open, area, fixture } = setup();
      open();
      await fixture.whenStable();

      expect(trigger().getAttribute('aria-expanded')).toBe('true');
      expect(trigger().getAttribute('aria-controls')).toBe(panel()?.id);
      expect(panel()?.getAttribute('role')).toBe('dialog');
      expect(panel()?.getAttribute('aria-label')).toBe('Color picker');
      expect(document.activeElement).toBe(area());
    });

    it('closes on Escape and returns focus to the trigger', async () => {
      const { trigger, panel, open, fixture, host } = setup();
      open();
      await fixture.whenStable();
      expect(host.open()).toBe(true);

      press(document.activeElement as Element, 'Escape');
      fixture.detectChanges();

      expect(panel()).toBeNull();
      expect(host.open()).toBe(false);
      expect(document.activeElement).toBe(trigger());
    });

    it('closes on a second click of the trigger and on a click outside', async () => {
      const { trigger, panel, open, fixture } = setup();
      open();
      await fixture.whenStable();
      trigger().click();
      fixture.detectChanges();
      expect(panel()).toBeNull();

      open();
      await fixture.whenStable();
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });

    it('honours [(open)] and public methods', async () => {
      const { panel, host, fixture } = setup();
      const picker = fixture.debugElement.children[0]
        .componentInstance as AndesColorPicker;

      host.open.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(panel()).not.toBeNull();

      host.open.set(false);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(panel()).toBeNull();

      picker.open();
      fixture.detectChanges();
      expect(host.open()).toBe(true);
      picker.toggle();
      fixture.detectChanges();
      expect(host.open()).toBe(false);
      picker.toggle();
      picker.close();
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });

    it('sets the closing attribute hook for the exit animation (reduced motion closes at once)', () => {
      const style = css('color-picker.css');
      expect(style).toContain('.andes-color-picker__panel[data-andes-closing]');
      expect(style).toMatch(/prefers-reduced-motion: no-preference/);
      expect(style).toMatch(
        /\.andes-color-picker__panel\[data-andes-closing\] \{[^}]*animation: andes-color-picker-panel-exit[^}]*forwards/,
      );
    });
  });

  describe('area', () => {
    async function openedSetup(configure?: (host: PickerHost) => void) {
      const helpers = setup(configure);
      helpers.open();
      await helpers.fixture.whenStable();
      helpers.detect();
      return helpers;
    }

    it('is a slider with a value text naming both axes', async () => {
      const { area } = await openedSetup((host) => host.value.set('#1677ff'));

      expect(area().getAttribute('role')).toBe('slider');
      expect(area().getAttribute('aria-label')).toBe(
        'Saturation and brightness',
      );
      expect(area().getAttribute('aria-valuetext')).toBe(
        'Saturation 91%, brightness 100%',
      );
      expect(area().getAttribute('aria-valuenow')).toBe('91');
      expect(area().getAttribute('tabindex')).toBe('0');
    });

    it('moves saturation with Left/Right and brightness with Up/Down', async () => {
      const { area, detect, host } = await openedSetup((h) =>
        h.value.set('hsb(200, 50%, 50%)'),
      );
      const text = () => area().getAttribute('aria-valuetext');

      press(area(), 'ArrowRight');
      detect();
      expect(text()).toBe('Saturation 51%, brightness 50%');
      press(area(), 'ArrowLeft');
      press(area(), 'ArrowLeft');
      detect();
      expect(text()).toBe('Saturation 49%, brightness 50%');
      press(area(), 'ArrowUp');
      detect();
      expect(text()).toBe('Saturation 49%, brightness 51%');
      press(area(), 'ArrowDown');
      press(area(), 'ArrowDown');
      detect();
      expect(text()).toBe('Saturation 49%, brightness 49%');
      expect(host.value()).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('steps by 10 with Shift, and brightness by 10 with PageUp/PageDown', async () => {
      const { area, detect } = await openedSetup((h) =>
        h.value.set('hsb(200, 50%, 50%)'),
      );
      const text = () => area().getAttribute('aria-valuetext');

      press(area(), 'ArrowRight', { shiftKey: true });
      detect();
      expect(text()).toBe('Saturation 60%, brightness 50%');
      press(area(), 'ArrowDown', { shiftKey: true });
      detect();
      expect(text()).toBe('Saturation 60%, brightness 40%');
      press(area(), 'PageUp');
      press(area(), 'PageUp');
      detect();
      expect(text()).toBe('Saturation 60%, brightness 60%');
      press(area(), 'PageDown');
      detect();
      expect(text()).toBe('Saturation 60%, brightness 50%');
    });

    it('jumps saturation to the ends with Home and End and stops at the limits', async () => {
      const { area, detect } = await openedSetup((h) =>
        h.value.set('hsb(200, 50%, 99%)'),
      );
      const text = () => area().getAttribute('aria-valuetext');

      press(area(), 'End');
      detect();
      expect(text()).toBe('Saturation 100%, brightness 99%');
      press(area(), 'ArrowRight');
      press(area(), 'ArrowUp', { shiftKey: true });
      detect();
      expect(text()).toBe('Saturation 100%, brightness 100%');
      press(area(), 'Home');
      detect();
      expect(text()).toBe('Saturation 0%, brightness 100%');
    });

    it('ignores other keys and modified arrows', async () => {
      const { area, host } = await openedSetup();
      const before = host.changes.length;

      expect(press(area(), 'a').defaultPrevented).toBe(false);
      expect(
        press(area(), 'ArrowRight', { ctrlKey: true }).defaultPrevented,
      ).toBe(false);
      expect(host.changes.length).toBe(before);
      expect(press(area(), 'ArrowRight').defaultPrevented).toBe(true);
    });

    it('sets saturation and brightness from a pointer drag and completes on release', async () => {
      const { area, detect, host } = await openedSetup((h) =>
        h.value.set('hsb(120, 100%, 100%)'),
      );
      sizeBox(area(), 200, 100);

      pointer(area(), 'pointerdown', 100, 50);
      detect();
      expect(area().getAttribute('aria-valuetext')).toBe(
        'Saturation 50%, brightness 50%',
      );
      expect(document.activeElement).toBe(area());
      expect(host.completes.length).toBe(0);

      pointer(area(), 'pointermove', 50, 25);
      detect();
      expect(area().getAttribute('aria-valuetext')).toBe(
        'Saturation 25%, brightness 75%',
      );
      expect(host.completes.length).toBe(0);

      // Beyond the edges the values clamp.
      pointer(area(), 'pointermove', 999, -999);
      detect();
      expect(area().getAttribute('aria-valuetext')).toBe(
        'Saturation 100%, brightness 100%',
      );

      pointer(area(), 'pointerup', 999, -999);
      detect();
      expect(host.completes.length).toBe(1);
      expect(host.changes.length).toBeGreaterThanOrEqual(3);

      // No longer dragging.
      pointer(area(), 'pointermove', 0, 0);
      detect();
      expect(area().getAttribute('aria-valuetext')).toBe(
        'Saturation 100%, brightness 100%',
      );
    });
  });

  describe('sliders', () => {
    async function openedSetup(
      value: AndesColorInput = 'hsba(100, 50%, 50%, 0.5)',
    ) {
      const helpers = setup((host) => host.value.set(value));
      helpers.open();
      await helpers.fixture.whenStable();
      helpers.detect();
      return helpers;
    }

    it('exposes the hue and alpha sliders with their ranges and spoken values', async () => {
      const { hue, alpha } = await openedSetup();

      expect(hue().getAttribute('role')).toBe('slider');
      expect(hue().getAttribute('aria-label')).toBe('Hue');
      expect(hue().getAttribute('aria-valuemin')).toBe('0');
      expect(hue().getAttribute('aria-valuemax')).toBe('360');
      expect(hue().getAttribute('aria-valuenow')).toBe('100');
      expect(hue().getAttribute('aria-valuetext')).toBe('100°');
      expect(hue().getAttribute('aria-orientation')).toBe('horizontal');

      expect(alpha()?.getAttribute('aria-label')).toBe('Opacity');
      expect(alpha()?.getAttribute('aria-valuemax')).toBe('100');
      expect(alpha()?.getAttribute('aria-valuenow')).toBe('50');
      expect(alpha()?.getAttribute('aria-valuetext')).toBe('50%');
    });

    it('steps the hue by 1, by 10 with Shift and with PageUp/PageDown', async () => {
      const { hue, detect } = await openedSetup();
      const now = () => hue().getAttribute('aria-valuenow');

      press(hue(), 'ArrowRight');
      detect();
      expect(now()).toBe('101');
      press(hue(), 'ArrowUp');
      detect();
      expect(now()).toBe('102');
      press(hue(), 'ArrowLeft');
      press(hue(), 'ArrowDown');
      press(hue(), 'ArrowDown');
      detect();
      expect(now()).toBe('99');
      press(hue(), 'ArrowRight', { shiftKey: true });
      detect();
      expect(now()).toBe('109');
      press(hue(), 'ArrowLeft', { shiftKey: true });
      detect();
      expect(now()).toBe('99');
      press(hue(), 'PageUp');
      detect();
      expect(now()).toBe('109');
      press(hue(), 'PageDown');
      press(hue(), 'PageDown');
      detect();
      expect(now()).toBe('89');
    });

    it('jumps to the ends with Home and End', async () => {
      const { hue, alpha, detect } = await openedSetup();

      press(hue(), 'End');
      detect();
      expect(hue().getAttribute('aria-valuenow')).toBe('360');
      press(hue(), 'Home');
      detect();
      expect(hue().getAttribute('aria-valuenow')).toBe('0');

      press(alpha() as HTMLElement, 'End');
      detect();
      expect(alpha()?.getAttribute('aria-valuenow')).toBe('100');
      press(alpha() as HTMLElement, 'Home');
      detect();
      expect(alpha()?.getAttribute('aria-valuenow')).toBe('0');
    });

    it('steps the opacity in whole percents and clamps', async () => {
      const { alpha, detect, host } = await openedSetup();

      press(alpha() as HTMLElement, 'ArrowRight');
      detect();
      expect(alpha()?.getAttribute('aria-valuenow')).toBe('51');
      press(alpha() as HTMLElement, 'ArrowRight', { shiftKey: true });
      detect();
      expect(alpha()?.getAttribute('aria-valuenow')).toBe('61');
      press(alpha() as HTMLElement, 'End');
      press(alpha() as HTMLElement, 'ArrowUp');
      detect();
      expect(alpha()?.getAttribute('aria-valuenow')).toBe('100');
      expect(host.value()).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('completes each key press and each pointer release', async () => {
      const { hue, detect, host } = await openedSetup();

      press(hue(), 'ArrowRight');
      press(hue(), 'ArrowRight');
      detect();
      expect(host.completes.length).toBe(2);

      sizeBox(hue(), 216, 16);
      pointer(hue(), 'pointerdown', 8 + 100, 8);
      pointer(hue(), 'pointermove', 8 + 50, 8);
      expect(host.completes.length).toBe(2);
      pointer(hue(), 'pointerup', 8 + 50, 8);
      detect();
      expect(host.completes.length).toBe(3);
    });

    it('maps the pointer onto the rail, inset by half the handle', async () => {
      const { hue, alpha, detect } = await openedSetup();
      sizeBox(hue(), 216, 16);
      sizeBox(alpha() as HTMLElement, 216, 16);

      pointer(hue(), 'pointerdown', 8, 8);
      detect();
      expect(hue().getAttribute('aria-valuenow')).toBe('0');
      pointer(hue(), 'pointermove', 8 + 100, 8);
      detect();
      expect(hue().getAttribute('aria-valuenow')).toBe('180');
      pointer(hue(), 'pointermove', 5000, 8);
      detect();
      // The far end is held just short of 360, which is the same hue as 0.
      expect(Number(hue().getAttribute('aria-valuenow'))).toBe(360);
      pointer(hue(), 'pointerup', 5000, 8);

      pointer(alpha() as HTMLElement, 'pointerdown', 8 + 50, 8);
      detect();
      expect(alpha()?.getAttribute('aria-valuenow')).toBe('25');
      pointer(alpha() as HTMLElement, 'pointerup', 8 + 50, 8);
    });

    it('hides the opacity slider and field when disabledAlpha or showAlpha is off', async () => {
      const { alpha, host, fixture, detect, q } = await openedSetup();
      expect(alpha()).not.toBeNull();

      host.showAlpha.set(false);
      detect();
      expect(alpha()).toBeNull();
      expect(q('input[aria-label="Opacity"]')).toBeNull();

      host.showAlpha.set(true);
      host.disabledAlpha.set(true);
      fixture.detectChanges();
      expect(alpha()).toBeNull();
      expect(q('input[aria-label="Opacity"]')).toBeNull();
    });
  });

  describe('value output', () => {
    async function openedSetup(configure?: (host: PickerHost) => void) {
      const helpers = setup(configure);
      helpers.open();
      await helpers.fixture.whenStable();
      helpers.detect();
      return helpers;
    }

    it('emits text in the current format and the colour with every change', async () => {
      const { area, host } = await openedSetup((h) => h.value.set('#ff0000'));

      press(area(), 'ArrowLeft', { shiftKey: true });

      expect(host.value()).toBe('#ff1a1a');
      expect(host.changes.length).toBe(1);
      const change = host.changes[0];
      expect(change.value).toBe('#ff1a1a');
      expect(change.color).toBeInstanceOf(AndesColor);
      expect(change.color.toHex()).toBe('#ff1a1a');
      expect(host.completes[0].value).toBe('#ff1a1a');
    });

    it('emits rgb and hsb text when the format says so', async () => {
      const { area, host, fixture } = await openedSetup((h) => {
        h.value.set('#ff0000');
        h.defaultFormat.set('rgb');
      });
      press(area(), 'ArrowLeft', { shiftKey: true });
      expect(host.value()).toBe('rgb(255, 26, 26)');

      host.defaultFormat.set('hsb');
      fixture.detectChanges();
      press(area(), 'ArrowLeft', { shiftKey: true });
      expect(String(host.value())).toMatch(/^hsb\(0, \d+%, 100%\)$/);
    });

    it('carries opacity into the text', async () => {
      const { alpha, host, detect } = await openedSetup((h) =>
        h.value.set('#ff0000'),
      );

      press(alpha() as HTMLElement, 'PageDown');
      detect();
      expect(host.value()).toBe('#ff0000e6');

      host.value.set('#ff0000');
      detect();
      expect(host.value()).toBe('#ff0000');
    });

    it('emits AndesColor objects when the value is one', async () => {
      const { area, host } = await openedSetup((h) =>
        h.value.set(AndesColor.parse('#00ff00')),
      );

      press(area(), 'ArrowLeft', { shiftKey: true });

      expect(host.value()).toBeInstanceOf(AndesColor);
      expect((host.value() as AndesColor).toHex()).toBe('#1aff1a');
      expect(host.changes[0].value).toBeInstanceOf(AndesColor);
    });

    it('emits text from an empty picker, starting from a default colour', async () => {
      const { area, host } = await openedSetup((h) => h.value.set(null));

      press(area(), 'ArrowRight');

      expect(typeof host.value()).toBe('string');
      expect(host.value()).toMatch(/^#[0-9a-f]{6}$/);
      expect(host.changes.length).toBe(1);
    });

    it('reports nothing for a key that changes nothing', async () => {
      const { area, host } = await openedSetup((h) =>
        h.value.set('hsb(10, 100, 100)'),
      );

      press(area(), 'ArrowUp');
      press(area(), 'ArrowRight');

      expect(host.changes.length).toBe(0);
      expect(host.completes.length).toBe(0);
    });

    it('follows a value set from outside, keeping the hue it was editing', async () => {
      const { area, hue, host, detect } = await openedSetup((h) =>
        h.value.set('hsb(200, 50%, 50%)'),
      );
      press(area(), 'Home');
      press(area(), 'PageDown', { shiftKey: false });
      detect();
      // Saturation 0: a grey, whose hue RGB cannot carry - the slider still shows 200.
      expect(host.value()).toMatch(/^#[0-9a-f]{6}$/);
      expect(hue().getAttribute('aria-valuenow')).toBe('200');

      host.value.set('#ff0000');
      detect();
      expect(hue().getAttribute('aria-valuenow')).toBe('0');
    });
  });

  describe('fields', () => {
    async function openedSetup(configure?: (host: PickerHost) => void) {
      const helpers = setup(configure);
      helpers.open();
      await helpers.fixture.whenStable();
      helpers.detect();
      return helpers;
    }

    it('edits hex live, keeping the opacity, and normalises on commit', async () => {
      const { field, type, commit, host } = await openedSetup((h) =>
        h.value.set('#1677ff80'),
      );
      const hex = field('Hex color');
      expect(hex.value).toBe('1677FF');

      type(hex, 'f80');
      expect(host.value()).toBe('#ff880080');
      expect(hex.value).toBe('f80');

      commit(hex);
      hex.dispatchEvent(new Event('blur'));
      expect(hex.value).toBe('FF8800');
      expect(host.completes.length).toBe(1);
    });

    it('takes opacity from 4 and 8 digit hex', async () => {
      const { field, type, host } = await openedSetup((h) =>
        h.value.set('#1677ff'),
      );

      type(field('Hex color'), '00ff0080');
      expect(host.value()).toBe('#00ff0080');
      type(field('Hex color'), '#0f08');
      expect(host.value()).toBe('#00ff0088');
    });

    it('flags invalid hex without changing the colour and reverts on blur', async () => {
      const { field, type, host, detect } = await openedSetup((h) =>
        h.value.set('#1677ff'),
      );
      const hex = field('Hex color');

      type(hex, 'zzz');
      expect(hex.getAttribute('aria-invalid')).toBe('true');
      expect(host.value()).toBe('#1677ff');
      expect(host.changes.length).toBe(0);

      hex.dispatchEvent(new Event('blur'));
      detect();
      expect(hex.value).toBe('1677FF');
      expect(hex.hasAttribute('aria-invalid')).toBe(false);
    });

    it('commits the hex field with Enter', async () => {
      const { field, type, host } = await openedSetup((h) =>
        h.value.set('#1677ff'),
      );
      const hex = field('Hex color');
      type(hex, 'abc');

      const event = press(hex, 'Enter');

      expect(event.defaultPrevented).toBe(true);
      expect(hex.value).toBe('AABBCC');
      expect(host.value()).toBe('#aabbcc');
    });

    it('switches to RGB fields and edits channels', async () => {
      const { q, field, type, commit, host, fixture } = await openedSetup(
        (h) => {
          h.value.set('#102030');
          h.defaultFormat.set('rgb');
        },
      );
      expect(q('input[aria-label="Hex color"]')).toBeNull();
      expect(field('Red').value).toBe('16');
      expect(field('Green').value).toBe('32');
      expect(field('Blue').value).toBe('48');

      type(field('Green'), '200');
      expect(host.value()).toBe('rgb(16, 200, 48)');
      commit(field('Green'));
      expect(host.completes.length).toBe(1);

      // Beyond the range: clamped, and the field shows the real value afterwards.
      type(field('Blue'), '999');
      expect(host.value()).toBe('rgb(16, 200, 255)');
      commit(field('Blue'));
      expect(field('Blue').value).toBe('255');

      // Emptying a field changes nothing and the field recovers on commit.
      type(field('Red'), '');
      expect(host.value()).toBe('rgb(16, 200, 255)');
      commit(field('Red'));
      expect(field('Red').value).toBe('16');
      fixture.detectChanges();
    });

    it('switches to HSB fields and edits them', async () => {
      const { field, type, host } = await openedSetup((h) => {
        h.value.set('hsb(200, 50%, 60%)');
        h.defaultFormat.set('hsb');
      });
      expect(field('Hue').value).toBe('200');
      expect(field('Saturation').value).toBe('50');
      expect(field('Brightness').value).toBe('60');

      type(field('Hue'), '10');
      type(field('Saturation'), '80');
      type(field('Brightness'), '90');

      expect(host.value()).toBe('hsb(10, 80%, 90%)');
    });

    it('edits opacity as a percentage', async () => {
      const { field, type, host } = await openedSetup((h) =>
        h.value.set('#ff0000'),
      );

      type(field('Opacity'), '25');

      expect(host.value()).toBe('#ff000040');
    });

    it('lets the user pick a format, reporting it, and uses it for later values', async () => {
      const { q, field, area, host, fixture } = await openedSetup((h) =>
        h.value.set('#ff0000'),
      );
      const select = q<HTMLSelectElement>('select') as HTMLSelectElement;
      expect(select.getAttribute('aria-label')).toBe('Color format');
      expect(Array.from(select.options).map((o) => o.value)).toEqual([
        'hex',
        'rgb',
        'hsb',
      ]);

      select.value = 'rgb';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();

      expect(host.formatChanges).toEqual(['rgb']);
      expect(field('Red').value).toBe('255');
      // The value itself is not rewritten by merely switching the view...
      expect(host.value()).toBe('#ff0000');
      // ...the next edit uses the new format.
      press(area(), 'ArrowLeft', { shiftKey: true });
      expect(host.value()).toBe('rgb(255, 26, 26)');
    });

    it('treats a bound format as controlled: it reports the choice but shows what it is given', async () => {
      const { q, field, host, fixture } = await openedSetup((h) =>
        h.format.set('hex'),
      );
      const select = q<HTMLSelectElement>('select') as HTMLSelectElement;

      select.value = 'hsb';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();

      expect(host.formatChanges).toEqual(['hsb']);
      expect(field('Hex color')).not.toBeNull();

      host.format.set('hsb');
      fixture.detectChanges();
      expect(field('Hue')).not.toBeNull();
    });

    it('can hide the format switch', async () => {
      const { q } = await openedSetup((h) => h.disabledFormat.set(true));

      expect(q('select')).toBeNull();
      expect(q('input[aria-label="Hex color"]')).not.toBeNull();
    });
  });

  describe('presets', () => {
    async function openedSetup() {
      const helpers = setup((host) => {
        host.presets.set(PRESETS);
        host.value.set('#ff8800');
      });
      helpers.open();
      await helpers.fixture.whenStable();
      helpers.detect();
      return helpers;
    }

    it('renders labelled groups of colours as listboxes', async () => {
      const { q, presetButtons, panel } = await openedSetup();
      const lists = panel()?.querySelectorAll('[role="listbox"]');

      expect(lists?.length).toBe(1);
      expect(lists?.[0].getAttribute('aria-label')).toBe('Warm');
      expect(presetButtons().map((b) => b.getAttribute('aria-label'))).toEqual([
        '#ff0000',
        '#ff8800',
        '#ffee00',
      ]);
      expect(presetButtons()[0].getAttribute('role')).toBe('option');
      expect(
        presetButtons()[0].style.getPropertyValue(
          '--andes-color-picker-preset',
        ),
      ).toBe('rgb(255, 0, 0)');
      // The second group starts collapsed.
      const toggles = panel()?.querySelectorAll<HTMLElement>(
        '.andes-color-picker__group-toggle',
      );
      expect(toggles?.length).toBe(2);
      expect(toggles?.[0].getAttribute('aria-expanded')).toBe('true');
      expect(toggles?.[1].getAttribute('aria-expanded')).toBe('false');
      expect(q('#' + toggles?.[1].getAttribute('aria-controls'))).toBeNull();
    });

    it('marks the matching colour selected and gives it the group tab stop', async () => {
      const { presetButtons } = await openedSetup();

      expect(
        presetButtons().map((b) => b.getAttribute('aria-selected')),
      ).toEqual(['false', 'true', 'false']);
      expect(presetButtons().map((b) => b.getAttribute('tabindex'))).toEqual([
        '-1',
        '0',
        '-1',
      ]);
    });

    it('picks a colour on click, emits and completes', async () => {
      const { presetButtons, host, detect } = await openedSetup();

      presetButtons()[0].click();
      detect();

      expect(host.value()).toBe('#ff0000');
      expect(host.changes.length).toBe(1);
      expect(host.completes.length).toBe(1);
      expect(presetButtons()[0].getAttribute('aria-selected')).toBe('true');
    });

    it('moves with the arrow keys, Home and End', async () => {
      const { presetButtons, detect } = await openedSetup();
      presetButtons()[1].focus();

      press(presetButtons()[1], 'ArrowRight');
      detect();
      expect(document.activeElement).toBe(presetButtons()[2]);
      press(presetButtons()[2], 'ArrowRight');
      expect(document.activeElement).toBe(presetButtons()[2]);
      press(presetButtons()[2], 'Home');
      expect(document.activeElement).toBe(presetButtons()[0]);
      press(presetButtons()[0], 'End');
      expect(document.activeElement).toBe(presetButtons()[2]);
      press(presetButtons()[2], 'ArrowLeft');
      expect(document.activeElement).toBe(presetButtons()[1]);
      detect();
      expect(presetButtons().map((b) => b.getAttribute('tabindex'))).toEqual([
        '-1',
        '0',
        '-1',
      ]);
    });

    it('moves between rows with Up and Down by position', async () => {
      const { presetButtons } = await openedSetup();
      const [a, b, c] = presetButtons();
      // Lay the three swatches out as two rows: [a, b] over [c].
      const place = (el: HTMLElement, left: number, top: number) => {
        Object.defineProperty(el, 'offsetLeft', { value: left });
        Object.defineProperty(el, 'offsetTop', { value: top });
        Object.defineProperty(el, 'offsetWidth', { value: 24 });
      };
      place(a, 0, 0);
      place(b, 32, 0);
      place(c, 40, 32);

      b.focus();
      press(b, 'ArrowDown');
      expect(document.activeElement).toBe(c);
      press(c, 'ArrowUp');
      // Back to the swatch nearest to its column.
      expect(document.activeElement).toBe(b);
      press(b, 'ArrowUp');
      expect(document.activeElement).toBe(b);
    });

    it('activates with Space and Enter', async () => {
      const { presetButtons, host } = await openedSetup();

      presetButtons()[2].focus();
      const event = press(presetButtons()[2], ' ');

      expect(event.defaultPrevented).toBe(true);
      expect(host.value()).toBe('#ffee00');
    });

    it('expands and collapses a group', async () => {
      const { panel, presetButtons, detect } = await openedSetup();
      const toggles = () =>
        panel()?.querySelectorAll<HTMLElement>(
          '.andes-color-picker__group-toggle',
        ) as NodeListOf<HTMLElement>;

      toggles()[0].click();
      detect();
      expect(presetButtons().length).toBe(0);
      expect(toggles()[0].getAttribute('aria-expanded')).toBe('false');

      toggles()[1].click();
      detect();
      expect(presetButtons().map((b) => b.getAttribute('aria-label'))).toEqual([
        '#0000ff',
        'teal',
      ]);
    });

    it('accepts AndesColor presets and skips unreadable ones', async () => {
      const { host, open, fixture, detect, presetButtons } = setup();
      host.presets.set([
        {
          label: 'Mixed',
          colors: [
            AndesColor.parse('#112233') as AndesColor,
            'not a color',
            '#445566',
          ],
        },
      ]);
      detect();
      open();
      await fixture.whenStable();
      detect();

      expect(presetButtons().map((b) => b.getAttribute('aria-label'))).toEqual([
        '#112233',
        '#445566',
      ]);
    });
  });

  describe('clearing', () => {
    async function openedSetup() {
      const helpers = setup((host) => host.allowClear.set(true));
      helpers.open();
      await helpers.fixture.whenStable();
      helpers.detect();
      return helpers;
    }

    it('offers a clear button only with allowClear', async () => {
      const { q, host, detect } = await openedSetup();
      expect(q('[data-slot="color-picker-clear"]')).not.toBeNull();
      expect(
        q('[data-slot="color-picker-clear"]')?.getAttribute('aria-label'),
      ).toBe('Clear color');

      host.allowClear.set(false);
      detect();
      expect(q('[data-slot="color-picker-clear"]')).toBeNull();
    });

    it('removes the colour, emits clear and leaves the panel working', async () => {
      const { q, host, root, detect, area } = await openedSetup();

      (q('[data-slot="color-picker-clear"]') as HTMLButtonElement).click();
      detect();

      expect(host.value()).toBeNull();
      expect(host.clears).toBe(1);
      expect(
        root
          .querySelector('.andes-color-picker__swatch')
          ?.hasAttribute('data-empty'),
      ).toBe(true);
      expect(
        (q('[data-slot="color-picker-clear"]') as HTMLButtonElement).disabled,
      ).toBe(true);

      // Editing again picks a colour up from where the panel was.
      press(area(), 'ArrowRight');
      detect();
      expect(host.value()).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('opacity-free values', () => {
    it('emits opaque colours with disabledAlpha, whatever the value had', async () => {
      const { open, fixture, area, host, trigger } = setup((h) => {
        h.value.set('#1677ff80');
        h.disabledAlpha.set(true);
      });
      open();
      await fixture.whenStable();
      fixture.detectChanges();

      press(area(), 'ArrowLeft', { shiftKey: true });

      expect(host.value()).toBe('#3086ff');
      expect(trigger().getAttribute('aria-label')).toBe('Brand, #3086ff');
    });
  });

  describe('forms', () => {
    function setupForm() {
      const fixture = TestBed.createComponent(FormHost);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector(
        'button',
      ) as HTMLButtonElement;
      return { fixture, control: fixture.componentInstance.control, button };
    }

    it('writes the control value to the trigger', () => {
      const { fixture, control, button } = setupForm();
      expect(button.getAttribute('aria-label')).toBe('Accent, #ff0000');

      control.setValue('rgb(0, 0, 255)');
      fixture.detectChanges();
      expect(button.getAttribute('aria-label')).toBe('Accent, #0000ff');

      control.setValue(null);
      fixture.detectChanges();
      expect(button.getAttribute('aria-label')).toBe('Accent, No color');
    });

    it('updates the control from the panel and marks it dirty', async () => {
      const { fixture, control, button } = setupForm();
      button.click();
      fixture.detectChanges();
      await fixture.whenStable();
      const area = document.querySelector<HTMLElement>(
        'andes-color-area',
      ) as HTMLElement;

      press(area, 'ArrowLeft', { shiftKey: true });

      expect(control.value).toBe('#ff1a1a');
      expect(control.dirty).toBe(true);
    });

    it('marks the control touched when the panel closes', async () => {
      const { fixture, control, button } = setupForm();
      button.click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(control.touched).toBe(false);

      press(document.activeElement as Element, 'Escape');
      fixture.detectChanges();

      expect(control.touched).toBe(true);
    });

    it('marks the control touched when the closed trigger loses focus', () => {
      const { fixture, control, button } = setupForm();

      button.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(control.touched).toBe(true);
    });

    it('disables from the control', () => {
      const { fixture, control, button } = setupForm();

      control.disable();
      fixture.detectChanges();
      expect(button.disabled).toBe(true);

      control.enable();
      fixture.detectChanges();
      expect(button.disabled).toBe(false);
    });

    it('lets the control hold AndesColor objects', () => {
      const { fixture, control, button } = setupForm();

      control.setValue(AndesColor.parse('#00ff00'));
      fixture.detectChanges();

      expect(button.getAttribute('aria-label')).toBe('Accent, #00ff00');
    });
  });

  describe('labels', () => {
    it('lets every string be translated', async () => {
      const { host, open, fixture, panel, trigger } = setup((h) => {
        h.labels.set({
          panel: 'Selector de color',
          hue: 'Tono',
          alpha: 'Opacidad',
          noColor: 'Sin color',
          area: 'Saturacion y brillo',
          areaValue: 'Saturacion {s}%, brillo {b}%',
        });
      });
      open();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(panel()?.getAttribute('aria-label')).toBe('Selector de color');
      expect(
        panel()
          ?.querySelector('andes-color-slider[data-type="hue"]')
          ?.getAttribute('aria-label'),
      ).toBe('Tono');
      expect(
        panel()
          ?.querySelector('andes-color-area')
          ?.getAttribute('aria-valuetext'),
      ).toBe('Saturacion 91%, brillo 100%');

      host.value.set(null);
      fixture.detectChanges();
      expect(trigger().getAttribute('aria-label')).toBe('Brand, Sin color');
    });
  });

  describe('styles', () => {
    const style = css('color-picker.css');

    it('draws the trigger as a bordered field with a single focus ring', () => {
      expect(style).toMatch(
        /\.andes-color-picker__trigger \{[^}]*border: 1px solid var\(--_status-border, var\(--andes-color-input/,
      );
      expect(style).toMatch(
        /\.andes-color-picker__trigger:focus-visible, \.andes-color-picker__trigger\[data-state='open'\] \{[^}]*box-shadow: 0 0 0 2px var\(--_ring\)/,
      );
      expect(style).toMatch(
        /\.andes-color-picker__trigger \{[^}]*outline: none/,
      );
    });

    it('sizes the trigger 24 / 32 / 40 from the control height tokens', () => {
      expect(style).toContain(
        '--_height: var(--andes-control-height-sm, 1.5rem)',
      );
      expect(style).toContain(
        '--_height: var(--andes-control-height-md, 2rem)',
      );
      expect(style).toContain(
        '--_height: var(--andes-control-height-lg, 2.5rem)',
      );
    });

    it('gives the panel the font family and a reduced-motion-safe enter', () => {
      expect(style).toMatch(
        /\.andes-color-picker__panel \{[^}]*font-family: var\(--andes-font-family\), sans-serif/,
      );
      expect(style).toMatch(
        /@media \(prefers-reduced-motion: no-preference\) \{ \.andes-color-picker__panel\[data-state='open'\]/,
      );
      // Nothing animates the panel outside that media query.
      const outside = style.replace(
        /@media \(prefers-reduced-motion: no-preference\) \{.*?\} \} /,
        '',
      );
      expect(outside).not.toMatch(
        /\.andes-color-picker__panel\[data-state='open'\] \{[^}]*animation/,
      );
    });

    it('draws the fields with the field spec (hover, one focus ring, danger)', () => {
      expect(style).toMatch(
        /\.andes-color-picker__field:focus-within \{[^}]*border-color: var\(--andes-color-primary/,
      );
      expect(style).toMatch(
        /\.andes-color-picker__field:focus-within \{[^}]*box-shadow: 0 0 0 2px/,
      );
      expect(style).toMatch(/\.andes-color-picker__input \{[^}]*outline: 0/);
      expect(style).toMatch(
        /\.andes-color-picker__field\[data-invalid\] \{[^}]*--andes-color-danger/,
      );
    });

    it('keeps the slider and area rails left-to-right in any page direction', () => {
      expect(css('color-picker-slider.css')).toMatch(
        /:host \{[^}]*direction: ltr/,
      );
      expect(css('color-picker-area.css')).toMatch(
        /:host \{[^}]*direction: ltr/,
      );
    });

    it('turns the slider handle motion off for reduced motion', () => {
      expect(css('color-picker-slider.css')).toMatch(
        /@media \(prefers-reduced-motion: reduce\) \{ \.andes-color-slider__handle \{ transition: none/,
      );
    });
  });

  describe('eyedropper', () => {
    afterEach(() => {
      delete (window as unknown as { EyeDropper?: unknown }).EyeDropper;
    });

    function withEyeDropper(result: Promise<{ sRGBHex: string }>) {
      (window as unknown as { EyeDropper: unknown }).EyeDropper = class {
        open() {
          return result;
        }
      };
    }

    async function openedPicker() {
      const fixture = TestBed.createComponent(AndesColorPicker);
      fixture.componentRef.setInput('value', '#000000');
      fixture.detectChanges();
      (
        fixture.nativeElement.querySelector('button') as HTMLButtonElement
      ).click();
      fixture.detectChanges();
      await fixture.whenStable();
      return fixture;
    }

    it('is absent where the browser has none', async () => {
      await openedPicker();

      expect(
        document.querySelector('[data-slot="color-picker-eyedropper"]'),
      ).toBeNull();
    });

    it('offers it where it exists and takes the picked colour, keeping opacity', async () => {
      withEyeDropper(Promise.resolve({ sRGBHex: '#00ff00' }));
      const fixture = await openedPicker();
      const button = document.querySelector<HTMLButtonElement>(
        '[data-slot="color-picker-eyedropper"]',
      ) as HTMLButtonElement;
      expect(button.getAttribute('aria-label')).toBe(
        'Pick a color from the screen',
      );

      button.click();
      await fixture.whenStable();
      await Promise.resolve();
      fixture.detectChanges();

      expect(fixture.componentInstance.value()).toBe('#00ff00');
    });

    it('ignores a cancelled pick', async () => {
      withEyeDropper(
        Promise.reject(new DOMException('cancelled', 'AbortError')),
      );
      const fixture = await openedPicker();

      (
        document.querySelector(
          '[data-slot="color-picker-eyedropper"]',
        ) as HTMLButtonElement
      ).click();
      await fixture.whenStable();
      await Promise.resolve();

      expect(fixture.componentInstance.value()).toBe('#000000');
    });
  });
});
