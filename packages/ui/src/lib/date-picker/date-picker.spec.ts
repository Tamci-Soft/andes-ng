import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import type { AndesCalendarCellContext } from '../calendar/calendar';
import { toDateKey, type AndesPickerType } from '../calendar/date-utils';
import type { AndesDateFormat } from '../calendar/date-format';
import {
  AndesDatePicker,
  type AndesDatePickerPlacement,
  type AndesDatePickerPreset,
  type AndesDatePickerSize,
  type AndesDatePickerStatus,
  type AndesDatePickerValue,
  type AndesDatePickerVariant,
  type AndesTimeOptions,
} from './date-picker';

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

/** Host for the extended inputs; every one is a signal a test can flip. */
@Component({
  imports: [AndesDatePicker, ReactiveFormsModule],
  template: `
    <button type="button" id="outside">Outside</button>
    <ng-template #cell let-cell="cell"
      ><i class="custom-cell">{{ cell.text }}</i></ng-template
    >
    <ng-template #prefix><span class="custom-prefix">Due</span></ng-template>
    <ng-template #footer><span class="custom-footer">Footer</span></ng-template>
    <andes-date-picker
      [formControl]="control"
      [mode]="mode()"
      [picker]="pickerType()"
      locale="en-US"
      [weekStartsOn]="weekStartsOn()"
      [defaultMonth]="defaultMonth()"
      [min]="min()"
      [max]="max()"
      [format]="format()"
      [placeholder]="placeholder()"
      [allowClear]="allowClear()"
      [size]="size()"
      [status]="status()"
      [variant]="variant()"
      [placement]="placement()"
      [showTime]="showTime()"
      [needConfirm]="needConfirm()"
      [showNow]="showNow()"
      [presets]="presets()"
      [numberOfMonths]="numberOfMonths()"
      [inputReadOnly]="inputReadOnly()"
      [cellTemplate]="useTemplates() ? cellTemplate() : null"
      [prefix]="useTemplates() ? prefixTemplate() : null"
      [extraFooter]="useTemplates() ? footerTemplate() : null"
      [(open)]="open"
      (valueChange)="values.push($event)"
      (clear)="clears = clears + 1"
      (ok)="oks = oks + 1"
      (calendarChange)="calendarChanges.push($event)"
    />
  `,
})
class FeatureHost {
  readonly picker = viewChild.required(AndesDatePicker);
  readonly cellTemplate =
    viewChild.required<TemplateRef<AndesCalendarCellContext>>('cell');
  readonly prefixTemplate = viewChild.required<TemplateRef<unknown>>('prefix');
  readonly footerTemplate = viewChild.required<TemplateRef<unknown>>('footer');
  readonly control = new FormControl<AndesDatePickerValue>(null);
  readonly mode = signal<'single' | 'range'>('single');
  readonly pickerType = signal<AndesPickerType>('date');
  readonly weekStartsOn = signal<0 | 1>(0);
  readonly defaultMonth = signal<Date | null>(d(2024, 2, 1));
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly format = signal<AndesDateFormat | null>(null);
  readonly placeholder = signal<string | readonly [string, string] | undefined>(
    undefined,
  );
  readonly allowClear = signal(true);
  readonly size = signal<AndesDatePickerSize>('md');
  readonly status = signal<AndesDatePickerStatus | null>(null);
  readonly variant = signal<AndesDatePickerVariant>('outlined');
  readonly placement = signal<AndesDatePickerPlacement>('bottomLeft');
  readonly showTime = signal<AndesTimeOptions | boolean | null>(null);
  readonly needConfirm = signal<boolean | undefined>(undefined);
  readonly showNow = signal(false);
  readonly presets = signal<readonly AndesDatePickerPreset[]>([]);
  readonly numberOfMonths = signal<number | undefined>(undefined);
  readonly inputReadOnly = signal(false);
  readonly useTemplates = signal(false);
  readonly open = signal(false);
  readonly values: AndesDatePickerValue[] = [];
  readonly calendarChanges: (readonly [Date | null, Date | null])[] = [];
  clears = 0;
  oks = 0;
}

describe('AndesDatePicker', () => {
  withElementGeometry();

  /** Shared DOM helpers over whichever host component a test mounts. */
  function harness<T>(fixture: ReturnType<typeof TestBed.createComponent<T>>) {
    const root = fixture.nativeElement as HTMLElement;

    /** The (first) combobox input: the element that holds focus and ARIA state. */
    const trigger = () =>
      root.querySelector<HTMLInputElement>(
        '[data-slot^="date-picker-input"]',
      ) as HTMLInputElement;
    const inputs = () =>
      Array.from(
        root.querySelectorAll<HTMLInputElement>(
          '[data-slot^="date-picker-input"]',
        ),
      );
    const panel = () =>
      document.querySelector<HTMLElement>('[data-slot="date-picker-panel"]');
    /**
     * What the field shows: the input value(s) — a range joined with an en dash —
     * or, when empty, the placeholder.
     */
    const triggerText = () => {
      const values = inputs()
        .map((input) => input.value)
        .filter(Boolean);
      return values.length
        ? values.join(' – ')
        : (inputs()[0]?.placeholder ?? '');
    };

    return {
      fixture,
      root,
      trigger,
      inputs,
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
    it('renders a combobox input showing the placeholder while nothing is selected', () => {
      const { trigger, triggerText } = createPlain();

      // The APG date-picker combobox: a text input that owns a dialog popup.
      expect(trigger().tagName).toBe('INPUT');
      expect(trigger().getAttribute('type')).toBe('text');
      expect(trigger().getAttribute('role')).toBe('combobox');
      expect(trigger().value).toBe('');
      expect(triggerText()).toBe('Select a date');
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
    it('opens on click and stays open on a second click, as a text field should', () => {
      const { trigger, panel, fixture } = createPlain();

      trigger().click();
      fixture.detectChanges();
      expect(panel()).toBeTruthy();

      // A second click positions the caret; it must not throw the panel away.
      trigger().click();
      fixture.detectChanges();
      expect(panel()).toBeTruthy();
    });

    it('toggles through the public API', () => {
      const { host, panel, fixture } = createPlain();

      host.picker().toggle();
      fixture.detectChanges();
      expect(panel()).toBeTruthy();

      host.picker().toggle();
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

    it('opens with ArrowDown and Enter from the input', () => {
      const { trigger, panel, fixture, pressEscape } = createPlain();

      // Space is text in an editable input, so it is deliberately not a key here.
      for (const key of ['ArrowDown', 'Enter']) {
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
      expect(trigger().value).toBe('Feb 15, 2024');
      fixture.detectChanges();

      control.reset();
      fixture.detectChanges();

      expect(triggerText()).toBe('Select a date');
      expect(trigger().value).toBe('');
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

  describe('weekStartsOn bare attribute', () => {
    /**
     * `AndesDatePicker` declares its own `weekStartsOn` input and passes it
     * through to the `AndesCalendar` it composes (`[weekStartsOn]="weekStartsOn()"`
     * in date-picker.html). It needs the same `numberAttribute` coercion as the
     * calendar's own input: a bare `weekStartsOn="1"` attribute (no square
     * brackets) otherwise reaches Angular as the string `"1"`, which corrupts
     * `weekdayNames`'s `+`-based offset math via string concatenation and
     * renders a Wednesday-first grid instead of Monday-first.
     */
    it('treats a bare weekStartsOn="1" attribute as the number 1, producing a Monday-first panel grid', () => {
      @Component({
        imports: [AndesDatePicker],
        template: `<andes-date-picker
          weekStartsOn="1"
          locale="en-US"
          [defaultMonth]="defaultMonth"
        />`,
      })
      class BareWeekStartsOnHost {
        readonly defaultMonth = d(2024, 2, 1);
      }

      const fixture = TestBed.createComponent(BareWeekStartsOnHost);
      fixture.detectChanges();
      const view = harness(fixture);
      view.openPanel();

      const headers = Array.from(
        view.panel()?.querySelectorAll<HTMLElement>('[role="columnheader"]') ??
          [],
      );

      // Correct, Monday-first order. Before the fix this rendered
      // Wednesday-first (Wed, Thu, Fri, Sat, Sun, Mon, Tue).
      expect(
        headers.map((header) => header.getAttribute('aria-label')),
      ).toEqual([
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ]);
    });

    it('clamps an out-of-range bare weekStartsOn="9" attribute to 0 (Sunday) instead of crashing', () => {
      @Component({
        imports: [AndesDatePicker],
        template: `<andes-date-picker
          weekStartsOn="9"
          locale="en-US"
          [defaultMonth]="defaultMonth"
        />`,
      })
      class OutOfRangeWeekStartsOnHost {
        readonly defaultMonth = d(2024, 2, 1);
      }

      const fixture = TestBed.createComponent(OutOfRangeWeekStartsOnHost);
      expect(() => fixture.detectChanges()).not.toThrow();
      const view = harness(fixture);
      expect(() => view.openPanel()).not.toThrow();

      const headers = Array.from(
        view.panel()?.querySelectorAll<HTMLElement>('[role="columnheader"]') ??
          [],
      );
      expect(headers).toHaveLength(7);
      expect(headers[0].getAttribute('aria-label')).toBe('Sunday');
    });
  });

  describe('extended features', () => {
    function createFeature(
      setup: (host: FeatureHost) => void = () => undefined,
    ) {
      const fixture = TestBed.createComponent(FeatureHost);
      setup(fixture.componentInstance);
      fixture.detectChanges();
      const view = harness(fixture);
      const field = () =>
        view.root.querySelector<HTMLElement>(
          '[data-slot="date-picker-trigger"]',
        ) as HTMLElement;
      return {
        ...view,
        host: fixture.componentInstance,
        field,
        typeInto: (input: HTMLInputElement, text: string) => {
          input.value = text;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          fixture.detectChanges();
        },
        keydown: (element: HTMLElement, key: string) => {
          element.dispatchEvent(
            new KeyboardEvent('keydown', { key, bubbles: true }),
          );
          fixture.detectChanges();
        },
        blurTo: (element: HTMLElement | null) => {
          field().dispatchEvent(
            new FocusEvent('focusout', {
              bubbles: true,
              relatedTarget: element,
            }),
          );
          fixture.detectChanges();
        },
        pressIn: (selector: string) => {
          const element = document.querySelector<HTMLElement>(selector);
          if (!element) {
            throw new Error(`Nothing matches ${selector}`);
          }
          element.dispatchEvent(
            new MouseEvent('mousedown', { bubbles: true, button: 0 }),
          );
          fixture.detectChanges();
        },
        clickIn: (selector: string) => {
          const element = document.querySelector<HTMLElement>(selector);
          if (!element) {
            throw new Error(`Nothing matches ${selector}`);
          }
          element.click();
          fixture.detectChanges();
        },
      };
    }

    describe('typed input', () => {
      it('previews a parsed date in the calendar and commits it on Enter', () => {
        const view = createFeature();
        view.openPanel();

        view.typeInto(view.trigger(), 'Mar 5, 2024');

        // The calendar follows the text before anything is committed.
        expect(view.caption()?.textContent?.trim()).toBe('March 2024');
        expect(view.day(d(2024, 3, 5)).getAttribute('aria-selected')).toBe(
          'true',
        );
        expect(view.host.control.value).toBeNull();

        view.keydown(view.trigger(), 'Enter');

        expect(toDateKey(view.host.control.value as Date)).toBe('2024-03-05');
        expect(view.panel()).toBeFalsy();
        expect(view.trigger().value).toBe('Mar 5, 2024');
      });

      it('always accepts ISO dates, whatever the display format', () => {
        const view = createFeature();

        view.typeInto(view.trigger(), '2024-03-05');
        view.keydown(view.trigger(), 'Enter');

        expect(toDateKey(view.host.control.value as Date)).toBe('2024-03-05');
        expect(view.trigger().value).toBe('Mar 5, 2024');
      });

      it('discards unparseable text and restores the value', () => {
        const view = createFeature();
        view.host.control.setValue(d(2024, 2, 15));
        view.fixture.detectChanges();

        view.typeInto(view.trigger(), 'next tuesday');
        view.keydown(view.trigger(), 'Enter');

        expect(toDateKey(view.host.control.value as Date)).toBe('2024-02-15');
        expect(view.trigger().value).toBe('Feb 15, 2024');
      });

      it('rejects a typed date outside min/max', () => {
        const view = createFeature((host) => host.max.set(d(2024, 2, 20)));

        view.typeInto(view.trigger(), '2024-02-25');
        view.keydown(view.trigger(), 'Enter');

        expect(view.host.control.value).toBeNull();
        expect(view.trigger().value).toBe('');
      });

      it('commits valid text when focus leaves the picker', () => {
        const view = createFeature();
        view.openPanel();

        view.typeInto(view.trigger(), '2024-03-05');
        view.blurTo(view.root.querySelector<HTMLElement>('#outside'));

        expect(toDateKey(view.host.control.value as Date)).toBe('2024-03-05');
        expect(view.panel()).toBeFalsy();
        expect(view.host.control.touched).toBe(true);
      });

      it('ignores focus moving between the field and its panel', () => {
        const view = createFeature();
        view.openPanel();

        view.blurTo(view.day(d(2024, 2, 10)));

        expect(view.panel()).toBeTruthy();
      });

      it('clears the value when the text is emptied', () => {
        const view = createFeature();
        view.host.control.setValue(d(2024, 2, 15));
        view.fixture.detectChanges();

        view.typeInto(view.trigger(), '');
        view.keydown(view.trigger(), 'Enter');

        expect(view.host.control.value).toBeNull();
      });

      it('uses a token format for display and parsing, trying every pattern', () => {
        const view = createFeature((host) =>
          host.format.set(['DD/MM/YYYY', 'DD.MM.YY']),
        );
        view.host.control.setValue(d(2024, 2, 5));
        view.fixture.detectChanges();
        expect(view.trigger().value).toBe('05/02/2024');

        view.typeInto(view.trigger(), '07.03.24');
        view.keydown(view.trigger(), 'Enter');

        expect(toDateKey(view.host.control.value as Date)).toBe('2024-03-07');
        expect(view.trigger().value).toBe('07/03/2024');
      });

      it('formats with a function format and falls back to ISO for typing', () => {
        const view = createFeature((host) =>
          host.format.set((date: Date) => `Day ${date.getDate()}`),
        );
        view.host.control.setValue(d(2024, 2, 5));
        view.fixture.detectChanges();
        expect(view.trigger().value).toBe('Day 5');

        view.typeInto(view.trigger(), '2024-02-09');
        view.keydown(view.trigger(), 'Enter');
        expect(view.trigger().value).toBe('Day 9');
      });

      it('discards typed text, and its calendar preview, on Escape', () => {
        const view = createFeature();
        view.host.control.setValue(d(2024, 2, 15));
        view.fixture.detectChanges();

        view.typeInto(view.trigger(), '2024-03-01');
        expect(view.panel()).toBeTruthy();
        view.pressEscape();

        expect(view.trigger().value).toBe('Feb 15, 2024');
        expect(toDateKey(view.host.control.value as Date)).toBe('2024-02-15');
        view.openPanel();
        expect(view.caption()?.textContent?.trim()).toBe('February 2024');
      });
    });

    describe('keyboard', () => {
      it('moves focus into the grid with ArrowDown', () => {
        const view = createFeature();

        view.keydown(view.trigger(), 'ArrowDown');

        expect(view.panel()).toBeTruthy();
        expect(document.activeElement?.getAttribute('role')).toBe('gridcell');
      });

      it('opens and focuses the input on a press on the field chrome', () => {
        const view = createFeature();

        view.pressIn('.andes-date-picker__icon');

        expect(view.panel()).toBeTruthy();
        expect(document.activeElement).toBe(view.trigger());
      });

      it('keeps focus in the input on a pointer open', () => {
        const view = createFeature();
        view.trigger().focus();

        view.openPanel();

        expect(document.activeElement).toBe(view.trigger());
      });

      it('opens on Space only when the input is read-only', () => {
        const view = createFeature();
        view.keydown(view.trigger(), ' ');
        expect(view.panel()).toBeFalsy();

        view.host.inputReadOnly.set(true);
        view.fixture.detectChanges();
        expect(view.trigger().readOnly).toBe(true);
        view.keydown(view.trigger(), ' ');
        expect(view.panel()).toBeTruthy();
      });
    });

    describe('allowClear', () => {
      it('shows a clear button only while there is a value', () => {
        const view = createFeature();
        const clearButton = () =>
          view.root.querySelector<HTMLButtonElement>(
            '[data-slot="date-picker-clear"]',
          );
        expect(clearButton()).toBeNull();

        view.host.control.setValue(d(2024, 2, 15));
        view.fixture.detectChanges();

        expect(clearButton()?.getAttribute('aria-label')).toBe('Clear');
        expect(clearButton()?.tabIndex).toBe(-1);
      });

      it('clears the value, emits clear and does not open the panel', () => {
        const view = createFeature();
        view.host.control.setValue(d(2024, 2, 15));
        view.fixture.detectChanges();

        view.clickIn('[data-slot="date-picker-clear"]');

        expect(view.host.control.value).toBeNull();
        expect(view.host.clears).toBe(1);
        expect(view.trigger().value).toBe('');
        expect(view.panel()).toBeFalsy();
      });

      it('can be turned off', () => {
        const view = createFeature((host) => host.allowClear.set(false));
        view.host.control.setValue(d(2024, 2, 15));
        view.fixture.detectChanges();

        expect(
          view.root.querySelector('[data-slot="date-picker-clear"]'),
        ).toBeNull();
      });
    });

    describe('appearance', () => {
      it('reflects size, variant and status on the field and host', () => {
        const view = createFeature((host) => {
          host.size.set('lg');
          host.variant.set('filled');
          host.status.set('warning');
        });

        expect(view.field().classList).toContain(
          'andes-date-picker__field--lg',
        );
        expect(view.field().classList).toContain(
          'andes-date-picker__field--filled',
        );
        expect(view.field().classList).toContain(
          'andes-date-picker__field--warning',
        );
        const hostElement = view.root.querySelector('andes-date-picker');
        expect(hostElement?.getAttribute('data-size')).toBe('lg');
        expect(hostElement?.getAttribute('data-status')).toBe('warning');
        // Only `error` is an invalid state.
        expect(view.trigger().getAttribute('aria-invalid')).toBeNull();

        view.host.status.set('error');
        view.fixture.detectChanges();
        expect(view.trigger().getAttribute('aria-invalid')).toBe('true');
      });

      it('maps placement onto the overlay positioning', () => {
        const view = createFeature((host) => host.placement.set('topRight'));

        expect(view.host.picker().overlay.config().positioning).toMatchObject({
          kind: 'anchored',
          side: 'top',
          align: 'end',
        });
      });

      it('renders prefix and extra footer templates', () => {
        const view = createFeature((host) => {
          host.useTemplates.set(true);
        });

        expect(view.root.querySelector('.custom-prefix')).toBeTruthy();
        view.openPanel();
        expect(view.panel()?.querySelector('.custom-footer')).toBeTruthy();
        expect(view.panel()?.querySelector('.custom-cell')).toBeTruthy();
      });
    });

    describe('open', () => {
      it('opens and closes from the bound open state', () => {
        const view = createFeature();

        view.host.open.set(true);
        view.fixture.detectChanges();
        expect(view.panel()).toBeTruthy();

        view.host.open.set(false);
        view.fixture.detectChanges();
        expect(view.panel()).toBeFalsy();
      });

      it('writes its own opens and closes back through [(open)]', () => {
        const view = createFeature();

        view.openPanel();
        expect(view.host.open()).toBe(true);

        view.pressEscape();
        expect(view.host.open()).toBe(false);
      });
    });

    describe('range', () => {
      function createRange(
        setup: (host: FeatureHost) => void = () => undefined,
      ) {
        return createFeature((host) => {
          host.mode.set('range');
          setup(host);
        });
      }

      it('renders two labelled inputs in a group', () => {
        const view = createRange((host) =>
          host.placeholder.set(['From', 'To']),
        );

        expect(view.field().getAttribute('role')).toBe('group');
        const [start, end] = view.inputs();
        expect(start.getAttribute('aria-label')).toBe('Start date');
        expect(end.getAttribute('aria-label')).toBe('End date');
        expect(start.placeholder).toBe('From');
        expect(end.placeholder).toBe('To');
      });

      it('shows two months by default, or numberOfMonths when set', () => {
        const view = createRange();
        view.openPanel();
        expect(view.panel()?.querySelectorAll('[role="grid"]')).toHaveLength(2);
        view.pressEscape();

        view.host.numberOfMonths.set(1);
        view.fixture.detectChanges();
        view.openPanel();
        expect(view.panel()?.querySelectorAll('[role="grid"]')).toHaveLength(1);
      });

      it('emits calendarChange for each boundary', () => {
        const view = createRange();
        view.openPanel();

        view.clickDay(d(2024, 2, 10));
        view.clickDay(d(2024, 2, 20));

        expect(
          view.host.calendarChanges.map(([start, end]) => [
            start && toDateKey(start),
            end && toDateKey(end),
          ]),
        ).toEqual([
          ['2024-02-10', null],
          ['2024-02-10', '2024-02-20'],
        ]);
      });

      it('accepts typed boundaries, moving from start to end on Enter', () => {
        const view = createRange();
        const [start, end] = view.inputs();

        view.typeInto(start, '2024-02-10');
        view.keydown(start, 'Enter');
        expect(document.activeElement).toBe(end);

        view.typeInto(end, '2024-02-12');
        view.keydown(end, 'Enter');

        const value = view.host.control.value as readonly [Date, Date];
        expect(value.map(toDateKey)).toEqual(['2024-02-10', '2024-02-12']);
      });

      it('commits a preset range at once', () => {
        const view = createRange((host) =>
          host.presets.set([
            {
              label: 'First week',
              value: () => [d(2024, 2, 1), d(2024, 2, 7)],
            },
          ]),
        );
        view.openPanel();

        view.clickIn('.andes-date-picker__preset');

        const value = view.host.control.value as readonly [Date, Date];
        expect(value.map(toDateKey)).toEqual(['2024-02-01', '2024-02-07']);
        expect(view.panel()).toBeFalsy();
      });
    });

    describe('showTime and needConfirm', () => {
      it('adds hour and minute listboxes and requires OK by default', () => {
        const view = createFeature((host) => host.showTime.set(true));
        view.openPanel();

        const columns = view.panel()?.querySelectorAll('[role="listbox"]');
        expect(
          Array.from(columns ?? []).map((c) => c.getAttribute('aria-label')),
        ).toEqual(['Hours', 'Minutes']);

        view.clickDay(d(2024, 2, 15));
        // Pending: nothing committed, panel still open.
        expect(view.host.control.value).toBeNull();
        expect(view.panel()).toBeTruthy();

        view.pressIn('[data-unit="hours"] [id$="-hours-14"]');
        view.pressIn('[data-unit="minutes"] [id$="-minutes-30"]');
        view.clickIn('[data-slot="date-picker-ok"] button');

        const value = view.host.control.value as Date;
        expect(toDateKey(value)).toBe('2024-02-15');
        expect([value.getHours(), value.getMinutes()]).toEqual([14, 30]);
        expect(view.host.oks).toBe(1);
        expect(view.panel()).toBeFalsy();
        expect(view.trigger().value).toBe('Feb 15, 2024, 2:30 PM');
      });

      it('discards pending picks when the panel closes without OK', () => {
        const view = createFeature((host) => host.showTime.set(true));
        view.host.control.setValue(new Date(2024, 1, 15, 9, 0));
        view.fixture.detectChanges();
        view.openPanel();

        view.clickDay(d(2024, 2, 20));
        expect(view.trigger().value).toBe('Feb 20, 2024, 9:00 AM');
        view.pressEscape();

        expect(view.trigger().value).toBe('Feb 15, 2024, 9:00 AM');
        expect(toDateKey(view.host.control.value as Date)).toBe('2024-02-15');
      });

      it('changes the time from the keyboard, selection following focus', () => {
        const view = createFeature((host) => {
          host.showTime.set({ minuteStep: 15 });
          host.needConfirm.set(false);
        });
        view.host.control.setValue(new Date(2024, 1, 15, 9, 0));
        view.fixture.detectChanges();
        view.openPanel();

        const minutes = view
          .panel()
          ?.querySelector<HTMLElement>('[data-unit="minutes"]') as HTMLElement;
        expect(minutes.querySelectorAll('[role="option"]')).toHaveLength(4);
        view.keydown(minutes, 'ArrowDown');
        view.keydown(minutes, 'ArrowDown');

        // needConfirm off: the time commits as it changes.
        expect((view.host.control.value as Date).getMinutes()).toBe(30);
        expect(minutes.getAttribute('aria-activedescendant')).toMatch(
          /-minutes-30$/,
        );
      });

      it('commits at once and stays open with needConfirm off', () => {
        const view = createFeature((host) => {
          host.showTime.set(true);
          host.needConfirm.set(false);
        });
        view.openPanel();

        view.clickDay(d(2024, 2, 15));

        expect(toDateKey(view.host.control.value as Date)).toBe('2024-02-15');
        expect(view.panel()).toBeTruthy();
      });

      it('makes a plain date picker wait for OK with needConfirm', () => {
        const view = createFeature((host) => host.needConfirm.set(true));
        view.openPanel();

        view.clickDay(d(2024, 2, 15));
        expect(view.host.control.value).toBeNull();

        view.keydown(view.trigger(), 'Enter');
        expect(toDateKey(view.host.control.value as Date)).toBe('2024-02-15');
      });
    });

    describe('showNow', () => {
      it('commits today and closes', () => {
        const view = createFeature((host) => host.showNow.set(true));
        view.openPanel();

        const now = view
          .panel()
          ?.querySelector<HTMLButtonElement>('[data-slot="date-picker-now"]');
        expect(now?.textContent?.trim()).toBe('Today');
        now?.click();
        view.fixture.detectChanges();

        expect(toDateKey(view.host.control.value as Date)).toBe(
          toDateKey(new Date()),
        );
        expect(view.panel()).toBeFalsy();
      });
    });

    describe('picker', () => {
      it('selects and displays months', () => {
        const view = createFeature((host) => host.pickerType.set('month'));
        view.openPanel();

        view.clickIn('[data-date="2024-06-01"]');

        expect(toDateKey(view.host.control.value as Date)).toBe('2024-06-01');
        expect(view.trigger().value).toBe('Jun 2024');
        expect(view.trigger().placeholder).toBe('Select a month');
      });

      it('parses a typed month', () => {
        const view = createFeature((host) => host.pickerType.set('month'));

        view.typeInto(view.trigger(), 'Sep 2025');
        view.keydown(view.trigger(), 'Enter');

        expect(toDateKey(view.host.control.value as Date)).toBe('2025-09-01');
      });

      it('displays and parses weeks as week-year and week number', () => {
        const view = createFeature((host) => {
          host.pickerType.set('week');
          host.weekStartsOn.set(1);
        });
        view.host.control.setValue(d(2024, 2, 14));
        view.fixture.detectChanges();
        expect(view.trigger().value).toBe('2024-W07');

        view.typeInto(view.trigger(), '2025-W01');
        view.keydown(view.trigger(), 'Enter');
        expect(toDateKey(view.host.control.value as Date)).toBe('2024-12-30');
      });

      it('displays quarters', () => {
        const view = createFeature((host) => host.pickerType.set('quarter'));
        view.openPanel();

        view.clickIn('[data-date="2024-10-01"]');

        expect(view.trigger().value).toBe('2024-Q4');
      });
    });
  });
});
