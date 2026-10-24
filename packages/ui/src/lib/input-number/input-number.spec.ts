import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  AndesInputNumber,
  type AndesInputNumberFormat,
  type AndesInputNumberFormatter,
  type AndesInputNumberMode,
  type AndesInputNumberParser,
  type AndesInputNumberSize,
  type AndesInputNumberStatus,
  type AndesInputNumberStep,
  type AndesInputNumberValue,
  type AndesInputNumberVariant,
} from './input-number';

@Component({
  imports: [AndesInputNumber],
  template: `<andes-input-number
    aria-label="Quantity"
    [(value)]="value"
    [size]="size()"
    [variant]="variant()"
    [status]="status()"
    [mode]="mode()"
    [disabled]="disabled()"
    [readOnly]="readOnly()"
    [required]="required()"
    [min]="min()"
    [max]="max()"
    [step]="step()"
    [precision]="precision()"
    [stringMode]="stringMode()"
    [controls]="controls()"
    [keyboard]="keyboard()"
    [changeOnWheel]="changeOnWheel()"
    [changeOnBlur]="changeOnBlur()"
    [format]="format()"
    [locale]="locale()"
    [currency]="currency()"
    [decimalSeparator]="decimalSeparator()"
    [formatter]="formatter()"
    [parser]="parser()"
    [addonBefore]="addonBefore()"
    [addonAfter]="addonAfter()"
    [placeholder]="placeholder()"
    [id]="id()"
    [name]="name()"
    (stepped)="steps.push($event)"
    (pressEnter)="enters = enters + 1"
    (focused)="focusEvents = focusEvents + 1"
    (blurred)="blurEvents = blurEvents + 1"
  />`,
})
class HostComponent {
  readonly value = signal<AndesInputNumberValue>(null);
  readonly size = signal<AndesInputNumberSize>('md');
  readonly variant = signal<AndesInputNumberVariant>('outlined');
  readonly status = signal<AndesInputNumberStatus | undefined>(undefined);
  readonly mode = signal<AndesInputNumberMode>('input');
  readonly disabled = signal(false);
  readonly readOnly = signal(false);
  readonly required = signal(false);
  readonly min = signal<number | string | undefined>(undefined);
  readonly max = signal<number | string | undefined>(undefined);
  readonly step = signal<number | string>(1);
  readonly precision = signal<number | undefined>(undefined);
  readonly stringMode = signal(false);
  readonly controls = signal(true);
  readonly keyboard = signal(true);
  readonly changeOnWheel = signal(false);
  readonly changeOnBlur = signal(false);
  readonly format = signal<AndesInputNumberFormat>('none');
  readonly locale = signal<string | undefined>('en-US');
  readonly currency = signal('USD');
  readonly decimalSeparator = signal('.');
  readonly formatter = signal<AndesInputNumberFormatter | undefined>(undefined);
  readonly parser = signal<AndesInputNumberParser | undefined>(undefined);
  readonly addonBefore = signal<string | undefined>(undefined);
  readonly addonAfter = signal<string | undefined>(undefined);
  readonly placeholder = signal<string | undefined>(undefined);
  readonly id = signal<string | undefined>(undefined);
  readonly name = signal<string | undefined>(undefined);
  steps: AndesInputNumberStep[] = [];
  enters = 0;
  focusEvents = 0;
  blurEvents = 0;
  readonly field = viewChild.required(AndesInputNumber);
}

function createHost(initial: AndesInputNumberValue = null) {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.value.set(initial);
  fixture.detectChanges();
  const host = fixture.componentInstance;
  const query = <T extends Element>(selector: string) =>
    fixture.nativeElement.querySelector(selector) as T;
  const input = query<HTMLInputElement>('input');
  const wrapper = query<HTMLElement>('.andes-input-number');

  const settle = () => fixture.detectChanges();
  const type = (text: string) => {
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    settle();
  };
  const key = (name: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', {
      key: name,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    input.dispatchEvent(event);
    settle();
    return event;
  };
  const blur = () => {
    input.dispatchEvent(new FocusEvent('blur'));
    settle();
  };
  const focus = () => {
    input.dispatchEvent(new FocusEvent('focus'));
    settle();
  };
  const stepButton = (direction: 'up' | 'down') =>
    query<HTMLButtonElement>(
      `.andes-input-number__step--${direction}, .andes-input-number__spin--${direction === 'up' ? 'up' : 'down'}`,
    );
  const press = (direction: 'up' | 'down', element = stepButton(direction)) => {
    element.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 0,
      }),
    );
    settle();
  };
  const release = (element: HTMLElement) => {
    element.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    settle();
  };
  return {
    fixture,
    host,
    input,
    wrapper,
    query,
    type,
    key,
    blur,
    focus,
    stepButton,
    press,
    release,
    settle,
  };
}

describe('AndesInputNumber', () => {
  describe('structure and semantics', () => {
    it('renders a text input with the spinbutton role', () => {
      const { input } = createHost();

      expect(input.getAttribute('type')).toBe('text');
      expect(input.getAttribute('role')).toBe('spinbutton');
      expect(input.getAttribute('autocomplete')).toBe('off');
    });

    it('exposes aria-valuemin, aria-valuemax and aria-valuenow', () => {
      const { host, input, settle } = createHost(5);
      host.min.set(0);
      host.max.set(10);
      settle();

      expect(input.getAttribute('aria-valuemin')).toBe('0');
      expect(input.getAttribute('aria-valuemax')).toBe('10');
      expect(input.getAttribute('aria-valuenow')).toBe('5');
    });

    it('leaves out the bounds and the value that are not there', () => {
      const { input } = createHost();

      expect(input.hasAttribute('aria-valuemin')).toBe(false);
      expect(input.hasAttribute('aria-valuemax')).toBe(false);
      expect(input.hasAttribute('aria-valuenow')).toBe(false);
      expect(input.hasAttribute('aria-valuetext')).toBe(false);
    });

    it('describes a formatted value with aria-valuetext', () => {
      const { host, input, settle } = createHost(1234.5);
      host.format.set('currency');
      settle();

      expect(input.getAttribute('aria-valuenow')).toBe('1234.5');
      expect(input.getAttribute('aria-valuetext')).toBe('$1,234.50');
    });

    it('hints the keyboard: decimal by default, numeric for whole numbers', () => {
      const { host, input, settle } = createHost();

      expect(input.getAttribute('inputmode')).toBe('decimal');
      host.precision.set(0);
      settle();
      expect(input.getAttribute('inputmode')).toBe('numeric');
    });

    it('forwards id, name and the labelling attributes to the input, nulling the host', () => {
      const { fixture, host, input, settle } = createHost();
      host.id.set('qty');
      host.name.set('quantity');
      settle();

      expect(input.id).toBe('qty');
      expect(input.getAttribute('name')).toBe('quantity');
      expect(input.getAttribute('aria-label')).toBe('Quantity');
      const hostElement = fixture.nativeElement.querySelector(
        'andes-input-number',
      ) as HTMLElement;
      expect(hostElement.hasAttribute('id')).toBe(false);
      expect(hostElement.hasAttribute('aria-label')).toBe(false);
    });

    it('marks the native input required, disabled and read-only', () => {
      const { host, input, settle } = createHost();
      host.required.set(true);
      host.readOnly.set(true);
      settle();

      expect(input.required).toBe(true);
      expect(input.readOnly).toBe(true);
      expect(input.getAttribute('aria-readonly')).toBe('true');
      host.readOnly.set(false);
      host.disabled.set(true);
      settle();
      expect(input.disabled).toBe(true);
    });

    it('flags an out-of-range value as invalid', () => {
      const { host, input, wrapper, settle } = createHost(50);
      host.max.set(10);
      settle();

      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(wrapper.classList).toContain('andes-input-number--invalid');
    });

    it('applies the error and warning statuses', () => {
      const { host, input, wrapper, settle } = createHost();
      host.status.set('error');
      settle();
      expect(wrapper.classList).toContain('andes-input-number--invalid');
      expect(input.getAttribute('aria-invalid')).toBe('true');

      host.status.set('warning');
      settle();
      expect(wrapper.classList).toContain('andes-input-number--warning');
      expect(input.hasAttribute('aria-invalid')).toBe(false);
    });

    it.each(['sm', 'md', 'lg'] as const)('supports the %s size', (size) => {
      const { host, wrapper, settle } = createHost();
      host.size.set(size);
      settle();

      expect(wrapper.classList).toContain(`andes-input-number--${size}`);
    });

    it.each(['outlined', 'filled', 'borderless', 'underlined'] as const)(
      'supports the %s variant',
      (variant) => {
        const { host, wrapper, settle } = createHost();
        host.variant.set(variant);
        settle();

        expect(wrapper.classList).toContain(`andes-input-number--${variant}`);
      },
    );

    it('renders text addons around the field', () => {
      const { host, fixture, settle } = createHost();
      host.addonBefore.set('USD');
      host.addonAfter.set('kg');
      settle();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('USD');
      expect(text).toContain('kg');
    });
  });

  describe('typing', () => {
    it('updates the value for every keystroke that reads as a number', () => {
      const { host, type } = createHost();

      type('1');
      expect(host.value()).toBe(1);
      type('12.5');
      expect(host.value()).toBe(12.5);
      type('-3');
      expect(host.value()).toBe(-3);
    });

    it('keeps what is typed until blur, without reformatting under the caret', () => {
      const { host, input, type, blur, settle } = createHost();
      host.precision.set(2);
      settle();

      type('1.');
      expect(input.value).toBe('1.');
      type('1.5');
      expect(input.value).toBe('1.5');
      blur();
      expect(input.value).toBe('1.50');
    });

    it('does not emit text that is not a number yet', () => {
      const { host, type } = createHost(7);

      type('-');
      expect(host.value()).toBe(7);
      type('1.2.3');
      expect(host.value()).toBe(7);
    });

    it('emits null when the box is emptied', () => {
      const { host, type } = createHost(7);

      type('');
      expect(host.value()).toBeNull();
    });

    it('does not emit out-of-range typing, then clamps it on blur', () => {
      const { host, input, type, blur, settle } = createHost(5);
      host.min.set(0);
      host.max.set(10);
      settle();

      type('150');
      expect(host.value()).toBe(5);
      blur();
      expect(host.value()).toBe(10);
      expect(input.value).toBe('10');

      type('-4');
      blur();
      expect(host.value()).toBe(0);
      expect(input.value).toBe('0');
    });

    it('restores the held value when blurring text that is not a number', () => {
      const { input, type, blur } = createHost(7);

      type('-');
      blur();
      expect(input.value).toBe('7');
    });

    it('rounds to the precision', () => {
      const { host, input, type, blur, settle } = createHost();
      host.precision.set(2);
      settle();

      type('1.005');
      expect(host.value()).toBe(1.01);
      blur();
      expect(input.value).toBe('1.01');
    });

    it('holds typed text back until blur with changeOnBlur', () => {
      const { host, type, blur, settle } = createHost(1);
      host.changeOnBlur.set(true);
      settle();

      type('42');
      expect(host.value()).toBe(1);
      blur();
      expect(host.value()).toBe(42);
    });

    it('commits typed text on Enter and reports it', () => {
      const { host, input, type, key, settle } = createHost(1);
      host.changeOnBlur.set(true);
      host.precision.set(1);
      settle();

      type('3');
      key('Enter');

      expect(host.value()).toBe(3);
      expect(input.value).toBe('3.0');
      expect(host.enters).toBe(1);
    });

    it('ignores Enter that commits an IME composition', () => {
      const { host, key } = createHost();

      key('Enter', { isComposing: true });

      expect(host.enters).toBe(0);
    });

    it('waits for the end of an IME composition', () => {
      const { host, input, settle } = createHost();

      input.value = '12';
      input.dispatchEvent(new InputEvent('input', { isComposing: true }));
      settle();
      expect(host.value()).toBeNull();
      input.dispatchEvent(new CompositionEvent('compositionend'));
      settle();
      expect(host.value()).toBe(12);
    });

    it('puts the held value back on Escape', () => {
      const { host, input, type, key, settle } = createHost(1);
      host.changeOnBlur.set(true);
      settle();

      type('99');
      const event = key('Escape');

      expect(input.value).toBe('1');
      expect(event.defaultPrevented).toBe(false);
      expect(host.value()).toBe(1);
    });

    it('refuses characters a number cannot contain', () => {
      const { input } = createHost();
      const letter = new InputEvent('beforeinput', {
        data: 'a',
        inputType: 'insertText',
        cancelable: true,
      });
      const digit = new InputEvent('beforeinput', {
        data: '5',
        inputType: 'insertText',
        cancelable: true,
      });
      const paste = new InputEvent('beforeinput', {
        data: '1,5x',
        inputType: 'insertFromPaste',
        cancelable: true,
      });

      input.dispatchEvent(letter);
      input.dispatchEvent(digit);
      input.dispatchEvent(paste);

      expect(letter.defaultPrevented).toBe(true);
      expect(digit.defaultPrevented).toBe(false);
      expect(paste.defaultPrevented).toBe(true);
    });

    it('refuses a minus sign when the minimum is not negative', () => {
      const { host, input, settle } = createHost();
      host.min.set(0);
      settle();
      const minus = new InputEvent('beforeinput', {
        data: '-',
        inputType: 'insertText',
        cancelable: true,
      });

      input.dispatchEvent(minus);

      expect(minus.defaultPrevented).toBe(true);
    });

    it('does not filter when a custom formatter is in charge', () => {
      const { host, input, settle } = createHost();
      host.formatter.set((value) => `${value} kg`);
      host.parser.set((text) => Number.parseFloat(text));
      settle();
      const letter = new InputEvent('beforeinput', {
        data: 'k',
        inputType: 'insertText',
        cancelable: true,
      });

      input.dispatchEvent(letter);

      expect(letter.defaultPrevented).toBe(false);
    });
  });

  describe('keyboard', () => {
    it('steps with ArrowUp and ArrowDown and keeps the key from moving the caret', () => {
      const { host, key } = createHost(5);

      const up = key('ArrowUp');
      expect(host.value()).toBe(6);
      expect(up.defaultPrevented).toBe(true);
      key('ArrowDown');
      key('ArrowDown');
      expect(host.value()).toBe(4);
    });

    it('starts from zero on an empty field', () => {
      const { host, key } = createHost();

      key('ArrowUp');

      expect(host.value()).toBe(1);
    });

    it('multiplies the step by ten with Shift and by a tenth with Alt', () => {
      const { host, key } = createHost(0);

      key('ArrowUp', { shiftKey: true });
      expect(host.value()).toBe(10);
      key('ArrowUp', { altKey: true });
      expect(host.value()).toBe(10.1);
      key('ArrowDown', { altKey: true });
      key('ArrowDown', { shiftKey: true });
      expect(host.value()).toBe(0);
    });

    it('steps by ten with PageUp and PageDown', () => {
      const { host, key, settle } = createHost(0);
      host.step.set(2);
      settle();

      key('PageUp');
      expect(host.value()).toBe(20);
      key('PageDown');
      key('PageDown');
      expect(host.value()).toBe(-20);
    });

    it('adds fractional steps exactly', () => {
      const { host, key, settle } = createHost(0.1);
      host.step.set(0.1);
      settle();

      key('ArrowUp');

      expect(host.value()).toBe(0.2);
      key('ArrowUp');
      expect(host.value()).toBe(0.3);
    });

    it('jumps to the bounds with Home and End', () => {
      const { host, key, settle } = createHost(5);
      host.min.set(1);
      host.max.set(9);
      settle();

      const end = key('End');
      expect(host.value()).toBe(9);
      expect(end.defaultPrevented).toBe(true);
      key('Home');
      expect(host.value()).toBe(1);
    });

    it('leaves Home and End to the caret when there is no bound', () => {
      const { host, key } = createHost(5);

      const home = key('Home');

      expect(home.defaultPrevented).toBe(false);
      expect(host.value()).toBe(5);
    });

    it('stops at the bounds without reporting a step', () => {
      const { host, key, settle } = createHost(9);
      host.max.set(10);
      settle();

      key('ArrowUp');
      key('ArrowUp');

      expect(host.value()).toBe(10);
      expect(host.steps).toHaveLength(1);
    });

    it('does nothing with keyboard turned off, but typing still works', () => {
      const { host, key, type, settle } = createHost(5);
      host.keyboard.set(false);
      settle();

      const up = key('ArrowUp');
      expect(host.value()).toBe(5);
      expect(up.defaultPrevented).toBe(false);
      type('8');
      expect(host.value()).toBe(8);
    });

    it('does not step while disabled or read-only', () => {
      const { host, key, settle } = createHost(5);
      host.readOnly.set(true);
      settle();

      key('ArrowUp');

      expect(host.value()).toBe(5);
    });

    it('steps from the typed text, not the stale value', () => {
      const { host, type, key, settle } = createHost(1);
      host.changeOnBlur.set(true);
      settle();

      type('20');
      key('ArrowUp');

      expect(host.value()).toBe(21);
    });

    it('reports the step with its direction, offset and source', () => {
      const { host, key, settle } = createHost(1);
      host.step.set(0.5);
      settle();

      key('ArrowUp', { shiftKey: true });
      key('ArrowDown');

      expect(host.steps).toEqual([
        { value: 6, offset: '5', direction: 'up', source: 'keyboard' },
        { value: 5.5, offset: '-0.5', direction: 'down', source: 'keyboard' },
      ]);
    });
  });

  describe('stepper controls', () => {
    it('draws up and down buttons that are not tab stops and have names', () => {
      const { query } = createHost();
      const up = query<HTMLButtonElement>('.andes-input-number__step--up');
      const down = query<HTMLButtonElement>('.andes-input-number__step--down');

      expect(up.getAttribute('tabindex')).toBe('-1');
      expect(down.getAttribute('tabindex')).toBe('-1');
      expect(up.getAttribute('aria-label')).toBe('Increase');
      expect(down.getAttribute('aria-label')).toBe('Decrease');
    });

    it('is hidden with controls off, when disabled and when read-only', () => {
      const { host, query, settle } = createHost();

      host.controls.set(false);
      settle();
      expect(query('.andes-input-number__stepper')).toBeNull();

      host.controls.set(true);
      host.disabled.set(true);
      settle();
      expect(query('.andes-input-number__stepper')).toBeNull();

      host.disabled.set(false);
      host.readOnly.set(true);
      settle();
      expect(query('.andes-input-number__stepper')).toBeNull();
    });

    it('steps once when pressed and reports the handler as the source', () => {
      const { host, press, release, stepButton } = createHost(1);

      press('up');
      release(stepButton('up'));

      expect(host.value()).toBe(2);
      expect(host.steps[0]).toMatchObject({
        direction: 'up',
        source: 'handler',
      });
    });

    it('moves focus into the field when pressed', () => {
      const { input, press, release, stepButton } = createHost(1);

      press('up');
      release(stepButton('up'));

      expect(document.activeElement).toBe(input);
    });

    it('steps for a click with no pointer behind it', () => {
      const { host, stepButton, settle } = createHost(1);

      stepButton('down').click();
      settle();

      expect(host.value()).toBe(0);
    });

    it('does not step twice for a pointer press followed by its click', () => {
      const { host, press, release, stepButton, settle } = createHost(1);

      press('up');
      release(stepButton('up'));
      stepButton('up').dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1 }),
      );
      settle();

      expect(host.value()).toBe(2);
    });

    it('disables the buttons at the bounds', () => {
      const { host, stepButton, settle } = createHost(10);
      host.max.set(10);
      host.min.set(0);
      settle();

      expect(stepButton('up').disabled).toBe(true);
      expect(stepButton('down').disabled).toBe(false);
    });

    it('ignores non-primary buttons', () => {
      const { host, stepButton, settle } = createHost(1);

      stepButton('up').dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, button: 2 }),
      );
      settle();

      expect(host.value()).toBe(1);
    });

    it('keeps the focus in the field on mousedown', () => {
      const { stepButton } = createHost();
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });

      stepButton('up').dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    describe('press and hold', () => {
      beforeEach(() => vi.useFakeTimers());
      afterEach(() => vi.useRealTimers());

      it('repeats after a delay and speeds up', () => {
        const { host, press, release, stepButton } = createHost(0);

        press('up');
        expect(host.value()).toBe(1);
        vi.advanceTimersByTime(399);
        expect(host.value()).toBe(1);
        vi.advanceTimersByTime(1);
        expect(host.value()).toBe(2);

        // The gap between repeats shrinks, so the same wait buys more steps later on.
        vi.advanceTimersByTime(1000);
        const early = host.value() as number;
        vi.advanceTimersByTime(1000);
        const late = (host.value() as number) - early;
        expect(early).toBeGreaterThan(4);
        expect(late).toBeGreaterThan(early - 2 + 5);
        release(stepButton('up'));
      });

      it('stops on release', () => {
        const { host, press, release, stepButton } = createHost(0);

        press('up');
        vi.advanceTimersByTime(1000);
        release(stepButton('up'));
        const at = host.value();
        vi.advanceTimersByTime(2000);

        expect(host.value()).toBe(at);
      });

      it('stops when the pointer leaves the button', () => {
        const { host, press, stepButton, settle } = createHost(0);

        press('up');
        stepButton('up').dispatchEvent(new MouseEvent('pointerleave'));
        settle();
        const at = host.value();
        vi.advanceTimersByTime(2000);

        expect(host.value()).toBe(at);
      });

      it('stops at the bound', () => {
        const { host, press, settle } = createHost(0);
        host.max.set(3);
        settle();

        press('up');
        vi.advanceTimersByTime(5000);

        expect(host.value()).toBe(3);
        expect(host.steps).toHaveLength(3);
      });

      it('stops when the field blurs or is destroyed', () => {
        const { host, fixture, press, blur } = createHost(0);

        press('up');
        blur();
        const at = host.value();
        vi.advanceTimersByTime(2000);
        expect(host.value()).toBe(at);

        press('up');
        fixture.destroy();
        vi.advanceTimersByTime(2000);
        expect(host.value()).toBe((at as number) + 1);
      });
    });
  });

  describe('spinner mode', () => {
    it('draws minus and plus buttons beside the value', () => {
      const { host, query, press, release, stepButton, settle } = createHost(3);
      host.mode.set('spinner');
      settle();

      expect(query('.andes-input-number__stepper')).toBeNull();
      expect(query('.andes-input-number__spin--down')).not.toBeNull();
      press('up');
      release(stepButton('up'));
      expect(host.value()).toBe(4);
      press('down');
      release(stepButton('down'));
      press('down');
      release(stepButton('down'));
      expect(host.value()).toBe(2);
    });

    it('disables the minus at the minimum', () => {
      const { host, stepButton, settle } = createHost(0);
      host.mode.set('spinner');
      host.min.set(0);
      settle();

      expect(stepButton('down').disabled).toBe(true);
    });
  });

  describe('mouse wheel', () => {
    function wheel(input: HTMLInputElement, deltaY: number) {
      const event = new WheelEvent('wheel', {
        deltaY,
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);
      return event;
    }

    it('does nothing by default', () => {
      const { host, input, focus } = createHost(5);
      focus();

      wheel(input, -100);

      expect(host.value()).toBe(5);
    });

    it('steps a focused field when turned on', () => {
      const { host, input, focus, settle } = createHost(5);
      host.changeOnWheel.set(true);
      settle();
      focus();

      const up = wheel(input, -100);
      wheel(input, 100);
      wheel(input, 100);

      expect(up.defaultPrevented).toBe(true);
      expect(host.value()).toBe(4);
      expect(host.steps[0]?.source).toBe('wheel');
    });

    it('leaves the page scrolling when the field is not focused', () => {
      const { host, input, settle } = createHost(5);
      host.changeOnWheel.set(true);
      settle();

      const event = wheel(input, -100);

      expect(event.defaultPrevented).toBe(false);
      expect(host.value()).toBe(5);
    });
  });

  describe('precision and string mode', () => {
    it('always shows the fixed number of fraction digits', () => {
      const { host, input, settle } = createHost(3);
      host.precision.set(2);
      settle();

      expect(input.value).toBe('3.00');
    });

    it('rounds stepped values to the precision', () => {
      const { host, key, settle } = createHost(1);
      host.precision.set(1);
      host.step.set(0.25);
      settle();

      key('ArrowUp');

      expect(host.value()).toBe(1.3);
    });

    it('emits decimal strings in string mode', () => {
      const { host, type, settle } = createHost('1.10');
      host.stringMode.set(true);
      settle();

      type('2.50');

      expect(host.value()).toBe('2.50');
    });

    it('keeps digits a double would lose', () => {
      const { host, input, key, settle } = createHost('9007199254740993.01');
      host.stringMode.set(true);
      host.step.set('0.01');
      settle();

      expect(input.value).toBe('9007199254740993.01');
      key('ArrowUp');

      expect(host.value()).toBe('9007199254740993.02');
      expect(input.value).toBe('9007199254740993.02');
    });

    it('steps decimal strings with the precision applied', () => {
      const { host, key, settle } = createHost('0.1');
      host.stringMode.set(true);
      host.precision.set(3);
      host.step.set('0.2');
      settle();

      key('ArrowUp');

      expect(host.value()).toBe('0.300');
    });

    it('reads bounds given as strings', () => {
      const { host, key, settle } = createHost('0');
      host.stringMode.set(true);
      host.max.set('0.000000000000000001');
      host.step.set('1');
      settle();

      key('ArrowUp');

      expect(host.value()).toBe('0.000000000000000001');
    });
  });

  describe('formatting', () => {
    it('shows grouped thousands and reads them back', () => {
      const { host, input, type, blur, settle } = createHost(1234567.5);
      host.format.set('decimal');
      settle();

      expect(input.value).toBe('1,234,567.5');
      type('9,876.25');
      expect(host.value()).toBe(9876.25);
      blur();
      expect(input.value).toBe('9,876.25');
    });

    it('formats currency and percent', () => {
      const { host, input, settle } = createHost(1234.5);
      host.format.set('currency');
      settle();
      expect(input.value).toBe('$1,234.50');

      host.format.set('percent');
      host.value.set(0.25);
      settle();
      expect(input.value).toBe('25%');
    });

    it('stores a typed percentage as a fraction', () => {
      const { host, type, settle } = createHost();
      host.format.set('percent');
      host.step.set(0.01);
      settle();

      type('12.5%');

      expect(host.value()).toBe(0.125);
    });

    it('follows the locale', () => {
      const { host, input, settle } = createHost(1234.5);
      host.format.set('decimal');
      host.locale.set('de-DE');
      settle();

      expect(input.value).toBe('1.234,5');
    });

    it('uses the decimal separator of the plain format', () => {
      const { host, input, type, settle } = createHost(1.5);
      host.decimalSeparator.set(',');
      settle();

      expect(input.value).toBe('1,5');
      type('2,25');
      expect(host.value()).toBe(2.25);
    });

    it('uses a custom formatter and parser', () => {
      const { host, input, type, blur, settle } = createHost(12);
      host.formatter.set((value) => `${value} kg`);
      host.parser.set((text) => {
        const parsed = Number.parseFloat(text.replace(/[^\d.-]/g, ''));
        return Number.isNaN(parsed) ? undefined : parsed;
      });
      settle();

      expect(input.value).toBe('12 kg');
      type('15 kg');
      expect(host.value()).toBe(15);
      type('');
      expect(host.value()).toBeNull();
      type('20');
      blur();
      expect(input.value).toBe('20 kg');
    });

    it('hands the formatter the value after precision rounding', () => {
      const formatter = vi.fn((value: number | string) => `<${value}>`);
      const { host, input, settle } = createHost(1.5);
      host.precision.set(2);
      host.formatter.set(formatter);
      settle();

      expect(formatter).toHaveBeenCalledWith(1.5);
      expect(input.value).toBe('<1.5>');
    });
  });

  describe('forms', () => {
    @Component({
      imports: [AndesInputNumber, ReactiveFormsModule],
      template: `<andes-input-number
        aria-label="Amount"
        [formControl]="control"
        [precision]="2"
        [max]="100"
      />`,
    })
    class ReactiveHost {
      readonly control = new FormControl<number | null>(null);
    }

    @Component({
      imports: [AndesInputNumber, FormsModule],
      template: `<andes-input-number
        aria-label="Amount"
        [(ngModel)]="model"
      />`,
    })
    class TemplateHost {
      model: AndesInputNumberValue = 4;
    }

    function setupReactive() {
      const fixture = TestBed.createComponent(ReactiveHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;
      return { fixture, input, control: fixture.componentInstance.control };
    }

    it('writes control values into the box', () => {
      const { fixture, input, control } = setupReactive();

      control.setValue(3);
      fixture.detectChanges();
      expect(input.value).toBe('3.00');

      control.setValue(null);
      fixture.detectChanges();
      expect(input.value).toBe('');
    });

    it('reads a numeric string from the control as a number', () => {
      const { fixture, input, control } = setupReactive();

      control.setValue('7.5' as unknown as number);
      fixture.detectChanges();

      expect(input.value).toBe('7.50');
    });

    it('treats garbage written by the control as empty', () => {
      const { fixture, input, control } = setupReactive();

      control.setValue(NaN);
      fixture.detectChanges();

      expect(input.value).toBe('');
    });

    it('sends typed numbers to the control as numbers', () => {
      const { fixture, input, control } = setupReactive();

      input.value = '12.3';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(control.value).toBe(12.3);
      expect(control.dirty).toBe(true);
    });

    it('sends the clamped value to the control on blur', () => {
      const { fixture, input, control } = setupReactive();

      input.value = '500';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new FocusEvent('blur'));
      fixture.detectChanges();

      expect(control.value).toBe(100);
      expect(input.value).toBe('100.00');
    });

    it('marks the control touched on blur', () => {
      const { fixture, input, control } = setupReactive();
      expect(control.touched).toBe(false);

      input.dispatchEvent(new FocusEvent('blur'));
      fixture.detectChanges();

      expect(control.touched).toBe(true);
    });

    it('does not echo a value written by the form back to it', () => {
      const { fixture, control } = setupReactive();
      const changes = vi.fn();
      control.valueChanges.subscribe(changes);

      control.setValue(5);
      fixture.detectChanges();

      expect(changes).toHaveBeenCalledTimes(1);
    });

    it('follows the control being disabled and enabled', () => {
      const { fixture, input, control } = setupReactive();

      control.disable();
      fixture.detectChanges();
      expect(input.disabled).toBe(true);
      expect(
        fixture.nativeElement.querySelector('.andes-input-number__stepper'),
      ).toBeNull();

      control.enable();
      fixture.detectChanges();
      expect(input.disabled).toBe(false);
    });

    it('works with ngModel', async () => {
      const fixture = TestBed.createComponent(TemplateHost);
      fixture.detectChanges();
      await fixture.whenStable();
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;
      expect(input.value).toBe('4');

      input.value = '9';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(fixture.componentInstance.model).toBe(9);
    });
  });

  describe('outputs and methods', () => {
    it('emits focus and blur events', () => {
      const { host, focus, blur } = createHost();

      focus();
      blur();

      expect(host.focusEvents).toBe(1);
      expect(host.blurEvents).toBe(1);
    });

    it('focuses, selects and blurs the native input', () => {
      const { host, input } = createHost(1234);

      host.field().focus({ cursor: 'all' });
      expect(document.activeElement).toBe(input);
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(4);

      host.field().focus({ cursor: 'start' });
      expect(input.selectionEnd).toBe(0);
      host.field().focus({ cursor: 'end' });
      expect(input.selectionStart).toBe(4);

      host.field().blur();
      expect(document.activeElement).not.toBe(input);

      host.field().select();
      expect(input.selectionEnd).toBe(4);
    });

    it('steps programmatically', () => {
      const { host, settle } = createHost(1);

      host.field().stepUp();
      host.field().stepUp();
      host.field().stepDown();
      settle();

      expect(host.value()).toBe(2);
    });
  });

  describe('stylesheet contract', () => {
    const rawCss = () =>
      readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), 'input-number.css'),
        'utf-8',
      );
    const css = () => rawCss().replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = (selector: string) => {
      const match = new RegExp(
        `${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*{([^}]*)}`,
      ).exec(css());
      return match?.[1] ?? '';
    };

    it('draws the focus indicator once: border plus a 2px ring, no outline', () => {
      const focus = rule('.andes-input-number:focus-within');

      expect(focus).toContain('box-shadow: 0 0 0 2px var(--_andes-ring)');
      expect(focus).toContain('outline: none');
      expect(focus).toContain('border-color: var(--_andes-border-focus)');
      expect(rule('.andes-input-number__control')).toContain('outline: 0');
      expect(css()).not.toMatch(/outline-offset/);
    });

    it('sizes the field 24/32/40px with 14px text (16px for lg)', () => {
      expect(rule('.andes-input-number--sm')).toContain('height: 1.5rem');
      expect(rule('.andes-input-number--md')).toContain('height: 2rem');
      expect(rule('.andes-input-number--lg')).toContain('height: 2.5rem');
      expect(rule('.andes-input-number--md')).toContain('font-size: 0.875rem');
      expect(rule('.andes-input-number--md')).toContain(
        'line-height: 1.375rem',
      );
      expect(rule('.andes-input-number--lg')).toContain('font-size: 1rem');
    });

    it('places the stepper on the inline-end edge with 12px chevrons', () => {
      const stepper = rule('.andes-input-number__stepper');

      expect(stepper).toContain('inset-inline-end: 0');
      expect(stepper).toContain('opacity: 0');
      expect(rule('.andes-input-number__step svg')).toContain('width: 0.75rem');
      expect(css()).toMatch(
        /\.andes-input-number:hover \.andes-input-number__stepper,\s*\.andes-input-number:focus-within \.andes-input-number__stepper\s*{\s*opacity: 1/,
      );
    });

    it('never breaks a selector onto a line that starts with a combinator', () => {
      // Emulated encapsulation mis-scopes a selector continued after a newline combinator.
      expect(css()).not.toMatch(/^\s*[>+~]/m);
      expect(css()).not.toMatch(/[>+~]\s*\n\s*[.:\w]/);
    });

    it('uses logical properties only', () => {
      expect(css()).not.toMatch(/\b(?:left|right)\s*:/);
      expect(css()).not.toMatch(/(?:margin|padding|border)-(?:left|right)/);
    });

    it('turns motion off for reduced-motion users', () => {
      expect(css()).toMatch(
        /@media \(prefers-reduced-motion: reduce\)\s*{\s*\.andes-input-number\s*{\s*transition: none/,
      );
      expect(css()).toMatch(
        /@media \(prefers-reduced-motion: reduce\)\s*{\s*\.andes-input-number__stepper\s*{\s*transition: none/,
      );
    });

    it('carries the font family on the surface root', () => {
      expect(rule('.andes-input-number-group')).toContain(
        'font-family: var(--andes-font-family), sans-serif',
      );
      expect(rule('.andes-input-number__control')).toContain('font: inherit');
    });

    it('paints the disabled, error and warning states from tokens', () => {
      expect(rule('.andes-input-number--disabled')).toContain(
        '--_andes-bg: var(--andes-color-muted)',
      );
      expect(rule('.andes-input-number--invalid')).toContain(
        'var(--andes-color-danger)',
      );
      expect(rule('.andes-input-number--warning')).toContain(
        'var(--andes-color-warning-hover)',
      );
    });
  });
});
