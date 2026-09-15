import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { toDateKey } from '../calendar/date-utils';
import { AndesDatePicker, type AndesDatePickerValue } from './date-picker';

function d(year: number, month1: number, day: number): Date {
  return new Date(year, month1 - 1, day);
}

/**
 * jsdom reports zero geometry, so CDK's `InteractivityChecker` treats every
 * element as invisible and untabbable. The overlay primitive's own spec does the
 * same thing for the same reason.
 */
function withElementGeometry() {
  const properties = ['offsetWidth', 'offsetHeight'] as const;
  const originals = properties.map(
    (property) =>
      [
        property,
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, property),
      ] as const,
  );

  beforeAll(() => {
    for (const [property] of originals) {
      Object.defineProperty(HTMLElement.prototype, property, {
        configurable: true,
        get: () => 1,
      });
    }
  });

  afterAll(() => {
    for (const [property, descriptor] of originals) {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, property, descriptor);
      } else {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>)[
          property
        ];
      }
    }
  });
}

@Component({
  imports: [AndesDatePicker],
  template: `
    <button type="button" id="outside">Outside</button>
    <andes-date-picker
      [mode]="mode()"
      [min]="min()"
      [max]="max()"
      [locale]="locale()"
      [defaultMonth]="defaultMonth()"
      [disabled]="disabled()"
      [placeholder]="placeholder()"
      (valueChange)="lastValue.set($event)"
      (openChange)="lastOpen.set($event)"
    />
  `,
})
class PlainHost {
  readonly picker = viewChild.required(AndesDatePicker);
  readonly mode = signal<'single' | 'range'>('single');
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly locale = signal<string | undefined>('en-US');
  /** Pinned so the grid is deterministic regardless of when the suite runs. */
  readonly defaultMonth = signal<Date | null>(d(2024, 2, 1));
  readonly disabled = signal(false);
  readonly placeholder = signal('Select a date');
  readonly lastValue = signal<AndesDatePickerValue | undefined>(undefined);
  readonly lastOpen = signal<boolean | undefined>(undefined);
}

@Component({
  imports: [AndesDatePicker, ReactiveFormsModule],
  template: `<andes-date-picker
    [formControl]="control"
    locale="en-US"
    [defaultMonth]="defaultMonth"
  />`,
})
class ReactiveHost {
  readonly control = new FormControl<AndesDatePickerValue>(null);
  readonly defaultMonth = d(2024, 2, 1);
}

/** No `defaultMonth`, so the panel has to anchor itself on the control's value. */
@Component({
  imports: [AndesDatePicker, ReactiveFormsModule],
  template: `<andes-date-picker [formControl]="control" locale="en-US" />`,
})
class ReactiveAnchorHost {
  readonly control = new FormControl<AndesDatePickerValue>(null);
}

@Component({
  imports: [AndesDatePicker, ReactiveFormsModule],
  template: `<andes-date-picker
    mode="range"
    [formControl]="control"
    locale="en-US"
    [defaultMonth]="defaultMonth"
  />`,
})
class ReactiveRangeHost {
  readonly control = new FormControl<AndesDatePickerValue>(null, [
    Validators.required,
  ]);
  readonly defaultMonth = d(2024, 2, 1);
}

@Component({
  imports: [AndesDatePicker, FormsModule],
  template: `<andes-date-picker
    [(ngModel)]="value"
    locale="en-US"
    [defaultMonth]="defaultMonth"
  />`,
})
class NgModelHost {
  value: AndesDatePickerValue = null;
  readonly defaultMonth = d(2024, 2, 1);
}

describe('AndesDatePicker', () => {
  withElementGeometry();

  /** Shared DOM helpers over whichever host component a test mounts. */
  function harness<T>(fixture: ReturnType<typeof TestBed.createComponent<T>>) {
    const root = fixture.nativeElement as HTMLElement;

    const trigger = () =>
      root.querySelector<HTMLButtonElement>(
        '[data-slot="date-picker-trigger"]',
      ) as HTMLButtonElement;
    const panel = () =>
      document.querySelector<HTMLElement>('[data-slot="date-picker-panel"]');
    /** The trigger's displayed text: the formatted value, or the placeholder. */
    const triggerText = () =>
      trigger()
        .querySelector('.andes-date-picker__value')
        ?.textContent?.trim() ?? '';

    return {
      fixture,
      root,
      trigger,
      triggerText,
      panel,
      openPanel: () => {
        trigger().click();
        fixture.detectChanges();
      },
      caption: () =>
        panel()?.querySelector<HTMLElement>('[data-slot="calendar-caption"]'),
      next: () =>
        panel()?.querySelector<HTMLButtonElement>(
          '[data-slot="calendar-next"]',
        ),
      day: (date: Date) =>
        panel()?.querySelector<HTMLButtonElement>(
          `[data-date="${toDateKey(date)}"]`,
        ) as HTMLButtonElement,
      clickDay: (date: Date) => {
        const cell = panel()?.querySelector<HTMLButtonElement>(
          `[data-date="${toDateKey(date)}"]`,
        );
        // Fail loudly rather than silently no-op: a missing cell means the panel
        // is on the wrong month, which would otherwise surface as a confusing
        // assertion failure several lines later.
        if (!cell) {
          throw new Error(
            `No day cell for ${toDateKey(date)} in the open panel (visible month: ${
              panel()
                ?.querySelector('[data-slot="calendar-caption"]')
                ?.textContent?.trim() ?? 'panel closed'
            })`,
          );
        }
        cell.click();
        fixture.detectChanges();
      },
      pressEscape: () => {
        (panel() ?? document.body).dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            keyCode: 27,
            bubbles: true,
          }),
        );
        fixture.detectChanges();
      },
      clickOutside: () => {
        const outside =
          root.querySelector<HTMLElement>('#outside') ?? document.body;
        outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();
      },
    };
  }

  function createPlain() {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.detectChanges();
    return { ...harness(fixture), host: fixture.componentInstance };
  }

  describe('trigger', () => {
    it('renders a button showing the placeholder while nothing is selected', () => {
      const { trigger, triggerText } = createPlain();

      // A button, not a text input: this version cannot parse typed dates, so a
      // focusable text field would promise an affordance that does nothing.
      expect(trigger().tagName).toBe('BUTTON');
      expect(trigger().getAttribute('type')).toBe('button');
      expect(trigger().getAttribute('role')).toBeNull();
      expect(triggerText()).toBe('Select a date');
      expect(
        trigger().querySelector('.andes-date-picker__value--placeholder'),
      ).toBeTruthy();
    });

    it('advertises the popup through ARIA and tracks the open state', () => {
      const { trigger, openPanel } = createPlain();

      expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
      expect(trigger().getAttribute('aria-controls')).toBeNull();

      openPanel();

      expect(trigger().getAttribute('aria-expanded')).toBe('true');
      expect(trigger().getAttribute('aria-controls')).toBeTruthy();
    });

    it('is disabled when the component is disabled', () => {
      const { fixture, host, trigger } = createPlain();
      host.disabled.set(true);
      fixture.detectChanges();

      expect(trigger().disabled).toBe(true);
    });
  });

  describe('panel open and close', () => {
    it('opens on trigger click and closes on a second click', () => {
      const { trigger, panel, fixture } = createPlain();

      trigger().click();
      fixture.detectChanges();
      expect(panel()).toBeTruthy();

      trigger().click();
      fixture.detectChanges();
      expect(panel()).toBeFalsy();
    });

    it('gives the panel a dialog role and an accessible name', () => {
      const { openPanel, panel } = createPlain();
      openPanel();

      expect(panel()?.getAttribute('role')).toBe('dialog');
      expect(panel()?.getAttribute('aria-label')).toBe('Choose a date');
      // A popover is non-modal: the page behind stays reachable.
      expect(panel()?.getAttribute('aria-modal')).toBeNull();
    });

    it('closes on Escape and returns focus to the trigger', () => {
      const { openPanel, pressEscape, panel, trigger } = createPlain();
      openPanel();
      expect(panel()).toBeTruthy();

      pressEscape();

      expect(panel()).toBeFalsy();
      expect(document.activeElement).toBe(trigger());
    });

    it('closes on an outside click', () => {
      const { openPanel, clickOutside, panel } = createPlain();
      openPanel();

      clickOutside();

      expect(panel()).toBeFalsy();
    });

    it('opens with ArrowDown, Enter and Space from the trigger', () => {
      const { trigger, panel, fixture, pressEscape } = createPlain();

      for (const key of ['ArrowDown', 'Enter', ' ']) {
        trigger().dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true }),
        );
        fixture.detectChanges();
        expect(panel()).toBeTruthy();
        pressEscape();
      }
    });

    it('does not open while disabled', () => {
      const { fixture, host, trigger, panel } = createPlain();
      host.disabled.set(true);
      fixture.detectChanges();

      trigger().click();
      fixture.detectChanges();

      expect(panel()).toBeFalsy();
    });

    it('closes an open panel when the picker becomes disabled', () => {
      const { fixture, host, openPanel, panel } = createPlain();
      openPanel();
      expect(panel()).toBeTruthy();

      host.disabled.set(true);
      fixture.detectChanges();

      expect(panel()).toBeFalsy();
    });

    it('emits openChange on open and on close', () => {
      const { host, openPanel, pressEscape } = createPlain();

      openPanel();
      expect(host.lastOpen()).toBe(true);

      pressEscape();
      expect(host.lastOpen()).toBe(false);
    });

    it('allows month navigation inside the panel', () => {
      const { openPanel, next, caption, fixture } = createPlain();
      openPanel();

      const before = caption()?.textContent?.trim();
      next()?.click();
      fixture.detectChanges();

      expect(caption()?.textContent?.trim()).not.toBe(before);
    });
  });

  describe('single selection', () => {
    it('shows the formatted date in the trigger and closes the panel', () => {
      const { openPanel, clickDay, triggerText, panel, host } = createPlain();
      openPanel();

      clickDay(d(2024, 2, 15));

      expect(panel()).toBeFalsy();
      expect(toDateKey(host.lastValue() as Date)).toBe('2024-02-15');
      expect(triggerText()).toBe('Feb 15, 2024');
    });

    it('reopens on the previously selected month with the day still selected', () => {
      const { openPanel, clickDay, caption, day } = createPlain();
      openPanel();
      clickDay(d(2024, 2, 15));

      openPanel();

      expect(caption()?.textContent?.trim()).toBe('February 2024');
      expect(day(d(2024, 2, 15)).getAttribute('aria-selected')).toBe('true');
    });

    it('honours min and max inside the panel', () => {
      const { fixture, host, openPanel, day, clickDay } = createPlain();
      host.min.set(d(2024, 2, 10));
      host.max.set(d(2024, 2, 20));
      fixture.detectChanges();
      openPanel();

      expect(day(d(2024, 2, 9)).getAttribute('aria-disabled')).toBe('true');

      clickDay(d(2024, 2, 9));
      expect(host.lastValue()).toBeUndefined();
    });

    it('formats the display value in the requested locale', () => {
      const { fixture, host, openPanel, clickDay, triggerText } = createPlain();
      host.locale.set('es-ES');
      fixture.detectChanges();
      openPanel();

      clickDay(d(2024, 2, 15));

      expect(triggerText()).not.toBe('Feb 15, 2024');
      expect(triggerText()).toContain('2024');
    });
  });

  describe('range selection', () => {
    function createRange() {
      const harnessed = createPlain();
      harnessed.host.mode.set('range');
      harnessed.fixture.detectChanges();
      return harnessed;
    }

    it('keeps the panel open until the range is complete', () => {
      const { openPanel, clickDay, panel, triggerText } = createRange();
      openPanel();

      clickDay(d(2024, 2, 10));
      expect(panel()).toBeTruthy();
      // The half-drawn range still shows its start in the trigger.
      expect(triggerText()).toBe('Feb 10, 2024');

      clickDay(d(2024, 2, 20));
      expect(panel()).toBeFalsy();
    });

    it('emits a [start, end] tuple once the range closes', () => {
      const { openPanel, clickDay, host, triggerText } = createRange();
      openPanel();

      clickDay(d(2024, 2, 10));
      clickDay(d(2024, 2, 20));

      const value = host.lastValue() as readonly [Date, Date];
      expect(toDateKey(value[0])).toBe('2024-02-10');
      expect(toDateKey(value[1])).toBe('2024-02-20');
      expect(triggerText()).toBe('Feb 10, 2024 – Feb 20, 2024');
    });

    it('publishes null while only half the range is chosen', () => {
      const { openPanel, clickDay, host } = createRange();
      openPanel();

      clickDay(d(2024, 2, 10));

      expect(host.lastValue()).toBeNull();
    });

    it('restarts the range when a day is picked after it is complete', () => {
      const { openPanel, clickDay, host, panel, triggerText } = createRange();
      openPanel();
      clickDay(d(2024, 2, 10));
      clickDay(d(2024, 2, 20));

      openPanel();
      clickDay(d(2024, 2, 5));

      // Back to a half-open range: the form value drops to null and the panel
      // stays open waiting for the closing day.
      expect(host.lastValue()).toBeNull();
      expect(panel()).toBeTruthy();
      expect(triggerText()).toBe('Feb 5, 2024');

      clickDay(d(2024, 2, 8));
      const value = host.lastValue() as readonly [Date, Date];
      expect(toDateKey(value[0])).toBe('2024-02-05');
      expect(toDateKey(value[1])).toBe('2024-02-08');
    });
  });

  describe('ControlValueAccessor with reactive forms', () => {
    function createReactive() {
      const fixture = TestBed.createComponent(ReactiveHost);
      fixture.detectChanges();
      return {
        ...harness(fixture),
        control: fixture.componentInstance.control,
      };
    }

    it('renders a value written by the control', () => {
      const { fixture, control, triggerText } = createReactive();

      control.setValue(d(2024, 2, 15));
      fixture.detectChanges();

      expect(triggerText()).toBe('Feb 15, 2024');
    });

    it('opens on the written value month with it selected', () => {
      // Uses the host without an explicit `defaultMonth`, which would (correctly)
      // take precedence over the value's own month.
      const fixture = TestBed.createComponent(ReactiveAnchorHost);
      fixture.detectChanges();
      const view = harness(fixture);
      fixture.componentInstance.control.setValue(d(2022, 7, 4));
      fixture.detectChanges();

      view.openPanel();

      expect(view.caption()?.textContent?.trim()).toBe('July 2022');
      expect(view.day(d(2022, 7, 4)).getAttribute('aria-selected')).toBe(
        'true',
      );
    });

    it('lets an explicit defaultMonth win over the value month', () => {
      const { fixture, control, openPanel, caption } = createReactive();
      control.setValue(d(2022, 7, 4));
      fixture.detectChanges();

      openPanel();

      expect(caption()?.textContent?.trim()).toBe('February 2024');
    });

    it('pushes a selection back into the control', () => {
      const { control, openPanel, clickDay } = createReactive();
      openPanel();

      clickDay(d(2024, 2, 15));

      expect(toDateKey(control.value as Date)).toBe('2024-02-15');
    });

    it('starts pristine and untouched, then marks dirty on selection', () => {
      const { control, openPanel, clickDay } = createReactive();
      expect(control.dirty).toBe(false);
      expect(control.touched).toBe(false);

      openPanel();
      clickDay(d(2024, 2, 15));

      expect(control.dirty).toBe(true);
    });

    it('marks the control touched when the panel closes', () => {
      const { control, openPanel, pressEscape } = createReactive();
      openPanel();
      expect(control.touched).toBe(false);

      pressEscape();

      expect(control.touched).toBe(true);
    });

    it('disables the trigger when the control is disabled', () => {
      const { fixture, control, trigger } = createReactive();

      control.disable();
      fixture.detectChanges();
      expect(trigger().disabled).toBe(true);

      control.enable();
      fixture.detectChanges();
      expect(trigger().disabled).toBe(false);
    });

    it('accepts an ISO date-only string without shifting the day', () => {
      const { fixture, control, triggerText } = createReactive();

      control.setValue('2024-03-01' as unknown as Date);
      fixture.detectChanges();

      // Parsed as a local date; `new Date('2024-03-01')` would be UTC midnight
      // and render as Feb 29 for any negative-offset timezone.
      expect(triggerText()).toBe('Mar 1, 2024');
    });

    it('falls back to the placeholder when the control is reset', () => {
      const { fixture, control, trigger, triggerText } = createReactive();
      control.setValue(d(2024, 2, 15));
      fixture.detectChanges();

      control.reset();
      fixture.detectChanges();

      expect(triggerText()).toBe('Select a date');
      expect(
        trigger().querySelector('.andes-date-picker__value--placeholder'),
      ).toBeTruthy();
    });

    it('keeps a required range control invalid until the range completes', () => {
      const fixture = TestBed.createComponent(ReactiveRangeHost);
      fixture.detectChanges();
      const { control } = fixture.componentInstance;
      const view = harness(fixture);

      expect(control.valid).toBe(false);

      view.openPanel();
      view.clickDay(d(2024, 2, 10));
      expect(control.valid).toBe(false);

      view.clickDay(d(2024, 2, 20));
      expect(control.valid).toBe(true);
      expect((control.value as readonly [Date, Date]).length).toBe(2);
    });

    it('renders a range written to the control as a tuple', () => {
      const fixture = TestBed.createComponent(ReactiveRangeHost);
      fixture.detectChanges();
      const view = harness(fixture);
      fixture.componentInstance.control.setValue([
        d(2024, 2, 10),
        d(2024, 2, 20),
      ]);
      fixture.detectChanges();

      expect(view.triggerText()).toBe('Feb 10, 2024 – Feb 20, 2024');

      view.openPanel();
      expect(view.day(d(2024, 2, 10)).getAttribute('aria-selected')).toBe(
        'true',
      );
      expect(view.day(d(2024, 2, 15)).getAttribute('data-in-range')).toBe(
        'true',
      );
    });
  });

  describe('ControlValueAccessor with ngModel', () => {
    it('writes the selection back through ngModel', async () => {
      const fixture = TestBed.createComponent(NgModelHost);
      fixture.detectChanges();
      await fixture.whenStable();
      const view = harness(fixture);

      view.openPanel();
      view.clickDay(d(2024, 2, 15));
      await fixture.whenStable();

      expect(toDateKey(fixture.componentInstance.value as Date)).toBe(
        '2024-02-15',
      );
    });

    it('renders a value set on the model', async () => {
      const fixture = TestBed.createComponent(NgModelHost);
      fixture.componentInstance.value = d(2024, 2, 15);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(harness(fixture).triggerText()).toBe('Feb 15, 2024');
    });
  });
});
