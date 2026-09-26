import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import {
  AndesCombobox,
  type AndesComboboxFilterOption,
  type AndesComboboxOptionEntry,
  type AndesComboboxPlacement,
  type AndesComboboxSelectEvent,
  type AndesComboboxSize,
  type AndesComboboxStatus,
  type AndesComboboxVariant,
} from './combobox';
import { AndesComboboxContent } from './combobox-content';
import { AndesComboboxEmpty } from './combobox-empty';
import { AndesComboboxInput } from './combobox-input';
import { AndesComboboxItem } from './combobox-item';

/** jsdom leaves `keyCode` at 0 on synthetic events; CDK's key manager reads that field. */
const KEY_CODES: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  Enter: 13,
  Escape: 27,
};

const FRUIT_OPTIONS: readonly AndesComboboxOptionEntry<string>[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'apricot', label: 'Apricot' },
  { value: 'banana', label: 'Banana', disabled: true },
  { value: 'cherry', label: 'Cherry' },
];

const GROUPED_OPTIONS: readonly AndesComboboxOptionEntry<string>[] = [
  {
    label: 'Fruit',
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
    ],
  },
  {
    label: 'Vegetables',
    options: [
      { value: 'carrot', label: 'Carrot' },
      { value: 'pea', label: 'Pea' },
    ],
  },
  { value: 'other', label: 'Something else' },
];

@Component({
  imports: [AndesCombobox, FormsModule],
  template: `
    <andes-combobox
      [options]="options()"
      [(ngModel)]="value"
      [(open)]="open"
      [filterOption]="filterOption()"
      [optionFilterProp]="optionFilterProp()"
      [autoHighlight]="autoHighlight()"
      [allowClear]="allowClear()"
      [backfill]="backfill()"
      [loading]="loading()"
      [notFoundContent]="notFoundContent()"
      [disabled]="disabled()"
      [readOnly]="readOnly()"
      [size]="size()"
      [status]="status()"
      [variant]="variant()"
      [placement]="placement()"
      [popupMatchSelectWidth]="matchWidth()"
      [optionTemplate]="useTemplate() ? optionTpl : undefined"
      [autoFocus]="autoFocus()"
      placeholder="Search fruit"
      maxLength="12"
      inputId="fruit-input"
      aria-label="Fruit"
      (searchChange)="searches.push($event)"
      (optionSelect)="selections.push($event)"
      (clear)="clears = clears + 1"
    />
    <ng-template #optionTpl let-option let-query="query">
      <b class="custom">{{ option.label }}</b
      ><i class="query">{{ query }}</i>
    </ng-template>
    <ng-template #notFoundTpl><em class="custom-empty">Nada</em></ng-template>
  `,
})
class OptionsHost {
  readonly combobox = viewChild.required(AndesCombobox<string>);
  readonly notFoundTpl = viewChild.required<TemplateRef<void>>('notFoundTpl');

  readonly options =
    signal<readonly AndesComboboxOptionEntry<string>[]>(FRUIT_OPTIONS);
  readonly value = signal<string | null>(null);
  readonly open = signal(false);
  readonly filterOption = signal<boolean | AndesComboboxFilterOption<string>>(
    true,
  );
  readonly optionFilterProp = signal('label');
  readonly autoHighlight = signal(false);
  readonly allowClear = signal(false);
  readonly backfill = signal(false);
  readonly loading = signal(false);
  readonly notFoundContent = signal<string | TemplateRef<void> | null>(
    'No results found.',
  );
  readonly disabled = signal(false);
  readonly readOnly = signal(false);
  readonly size = signal<AndesComboboxSize>('md');
  readonly status = signal<AndesComboboxStatus | undefined>(undefined);
  readonly variant = signal<AndesComboboxVariant>('outlined');
  readonly placement = signal<AndesComboboxPlacement>('bottom-start');
  readonly matchWidth = signal<boolean | number>(true);
  readonly useTemplate = signal(false);
  readonly autoFocus = signal(false);

  readonly searches: string[] = [];
  readonly selections: AndesComboboxSelectEvent<string>[] = [];
  clears = 0;
}

@Component({
  imports: [
    AndesCombobox,
    AndesComboboxInput,
    AndesComboboxContent,
    AndesComboboxItem,
    AndesComboboxEmpty,
  ],
  template: `
    <andes-combobox
      #comboboxRef
      [items]="items"
      [(value)]="value"
      [allowClear]="true"
      [filterOption]="filterOption()"
      [autoHighlight]="false"
    >
      <input andesComboboxInput placeholder="Own placeholder" />
      <div andesComboboxContent>
        @for (item of comboboxRef.filteredItems(); track item) {
          <div andesComboboxItem [value]="item">{{ item }}</div>
        } @empty {
          <div andesComboboxEmpty>No results found.</div>
        }
      </div>
    </andes-combobox>
  `,
})
class CompoundHost {
  readonly items = ['Apple', 'Apricot', 'Banana', 'Cherry'];
  readonly value = signal<string | null>(null);
  readonly filterOption = signal<boolean | AndesComboboxFilterOption<string>>(
    true,
  );
}

function setup<H>(component: new () => H) {
  const fixture: ComponentFixture<H> = TestBed.createComponent(component);
  fixture.detectChanges();

  const input = fixture.nativeElement.querySelector(
    'input',
  ) as HTMLInputElement;
  const options = () =>
    Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
  const labels = () => options().map((el) => el.textContent?.trim());
  const panel = () => document.querySelector<HTMLElement>('[role="listbox"]');
  const clearButton = () =>
    fixture.nativeElement.querySelector(
      '.andes-combobox-clear',
    ) as HTMLButtonElement | null;

  const detect = () => fixture.detectChanges();

  /** Lets effects (model sync, [open] writes) and a full change-detection pass settle. */
  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function focus(): void {
    input.dispatchEvent(new Event('focus'));
    detect();
  }

  function blur(): void {
    input.dispatchEvent(new Event('blur'));
    detect();
  }

  function type(text: string): void {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    detect();
  }

  function press(key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'keyCode', { get: () => KEY_CODES[key] ?? 0 });
    input.dispatchEvent(event);
    detect();
    return event;
  }

  return {
    fixture,
    host: fixture.componentInstance,
    input,
    options,
    labels,
    panel,
    clearButton,
    detect,
    settle,
    focus,
    blur,
    type,
    press,
  };
}

describe('AndesCombobox (data-driven options mode)', () => {
  afterEach(() => {
    document
      .querySelectorAll('.cdk-overlay-container')
      .forEach((el) => el.remove());
  });

  describe('[options] mode', () => {
    it('renders its own combobox input, with placeholder, maxlength, id and aria-label', () => {
      const { input } = setup(OptionsHost);

      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('placeholder')).toBe('Search fruit');
      expect(input.getAttribute('maxlength')).toBe('12');
      expect(input.id).toBe('fruit-input');
      expect(input.getAttribute('aria-label')).toBe('Fruit');
    });

    it('renders one option per entry, showing each label', () => {
      const { focus, labels } = setup(OptionsHost);
      focus();

      expect(labels()).toEqual(['Apple', 'Apricot', 'Banana', 'Cherry']);
    });

    it('filters by label, case-insensitively', () => {
      const { type, labels } = setup(OptionsHost);

      type('AP');

      expect(labels()).toEqual(['Apple', 'Apricot']);
    });

    it('commits the option value to the model and its label to the input', async () => {
      const { focus, press, host, input, settle } = setup(OptionsHost);
      // Lets NgModel's initial (asynchronous) writeValue(null) land first.
      await settle();
      focus();
      press('ArrowDown');
      press('ArrowDown');

      press('Enter');
      await settle();

      expect(host.value()).toBe('apricot');
      expect(input.value).toBe('Apricot');
    });

    it('shows the label of a value written by the form', async () => {
      const { host, input, settle } = setup(OptionsHost);

      host.value.set('cherry');
      await settle();

      expect(input.value).toBe('Cherry');
    });

    it('marks disabled options and never selects them', () => {
      const { focus, options, host } = setup(OptionsHost);
      focus();
      const banana = options()[2];

      banana.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );

      expect(banana.getAttribute('aria-disabled')).toBe('true');
      expect(host.value()).toBeNull();
    });

    it('renders groups as labelled role="group" containers', () => {
      const { fixture, host, focus } = setup(OptionsHost);
      host.options.set(GROUPED_OPTIONS);
      fixture.detectChanges();
      focus();

      const groups = Array.from(
        document.querySelectorAll<HTMLElement>('[role="group"]'),
      );
      expect(groups).toHaveLength(2);
      const labelId = groups[0].getAttribute('aria-labelledby') as string;
      expect(document.getElementById(labelId)?.textContent?.trim()).toBe(
        'Fruit',
      );
      expect(
        Array.from(groups[1].querySelectorAll('[role="option"]')).map((el) =>
          el.textContent?.trim(),
        ),
      ).toEqual(['Carrot', 'Pea']);
    });

    it('drops a group once none of its options match', () => {
      const { fixture, host, type, labels } = setup(OptionsHost);
      host.options.set(GROUPED_OPTIONS);
      fixture.detectChanges();

      type('car');

      expect(document.querySelectorAll('[role="group"]')).toHaveLength(1);
      expect(labels()).toEqual(['Carrot']);
    });

    it('navigates across group boundaries with the arrow keys', () => {
      const { fixture, host, focus, press, input, options } =
        setup(OptionsHost);
      host.options.set(GROUPED_OPTIONS);
      fixture.detectChanges();
      focus();

      press('ArrowDown');
      press('ArrowDown');
      press('ArrowDown');

      expect(input.getAttribute('aria-activedescendant')).toBe(options()[2].id);
      expect(options()[2].textContent?.trim()).toBe('Carrot');
    });

    it('renders a custom option template with the option and query', () => {
      const { fixture, host, type } = setup(OptionsHost);
      host.useTemplate.set(true);
      fixture.detectChanges();

      type('ch');

      const option = document.querySelector('[role="option"]');
      expect(option?.querySelector('.custom')?.textContent).toBe('Cherry');
      expect(option?.querySelector('.query')?.textContent).toBe('ch');
    });
  });

  describe('filterOption and optionFilterProp', () => {
    it('does not filter at all when filterOption is false', () => {
      const { fixture, host, type, labels } = setup(OptionsHost);
      host.filterOption.set(false);
      fixture.detectChanges();

      type('zzz');

      expect(labels()).toHaveLength(4);
    });

    it('calls a filterOption function with the query and the option', () => {
      const { fixture, host, type, labels } = setup(OptionsHost);
      const calls: [string, string][] = [];
      host.filterOption.set((query, option) => {
        calls.push([query, option.value]);
        return option.value.startsWith(query);
      });
      fixture.detectChanges();

      type('ch');

      expect(labels()).toEqual(['Cherry']);
      expect(calls).toContainEqual(['ch', 'apple']);
    });

    it('matches against optionFilterProp instead of the label', () => {
      const { fixture, host, type, labels } = setup(OptionsHost);
      host.options.set([
        { value: 'NL', label: 'Netherlands' },
        { value: 'DE', label: 'Germany' },
      ]);
      host.optionFilterProp.set('value');
      fixture.detectChanges();

      type('de');

      expect(labels()).toEqual(['Germany']);
    });

    it('applies to projected items too, wrapped as { value, label }', () => {
      const { fixture, host, type, labels } = setup(CompoundHost);
      host.filterOption.set((query, option) => option.label === 'Banana');
      fixture.detectChanges();

      type('x');

      expect(labels()).toEqual(['Banana']);
    });
  });

  describe('notFoundContent', () => {
    it('shows the message with the empty-state icon when nothing matches', () => {
      const { type, panel } = setup(OptionsHost);

      type('zzz');

      const empty = panel()?.querySelector('.andes-combobox-empty');
      expect(empty?.textContent?.trim()).toBe('No results found.');
      expect(
        empty?.querySelector('svg.andes-combobox-empty__icon'),
      ).toBeTruthy();
    });

    it('renders a template', () => {
      const { fixture, host, type, panel } = setup(OptionsHost);
      host.notFoundContent.set(host.notFoundTpl());
      fixture.detectChanges();

      type('zzz');

      expect(panel()?.querySelector('.custom-empty')?.textContent).toBe('Nada');
    });

    it('hides the popup while nothing matches when set to null', () => {
      const { fixture, host, type, panel } = setup(OptionsHost);
      host.notFoundContent.set(null);
      fixture.detectChanges();

      type('zzz');

      expect(panel()?.hasAttribute('data-hidden')).toBe(true);
      expect(panel()?.querySelector('.andes-combobox-empty')).toBeNull();

      type('a');
      expect(panel()?.hasAttribute('data-hidden')).toBe(false);
    });
  });

  describe('loading', () => {
    it('shows a spinner in the field, the loading text in the popup, and aria-busy', () => {
      const { fixture, host, focus, panel, options, input } =
        setup(OptionsHost);
      host.loading.set(true);
      fixture.detectChanges();
      focus();

      expect(
        fixture.nativeElement.querySelector(
          '.andes-combobox-suffix .andes-combobox-spinner',
        ),
      ).toBeTruthy();
      expect(panel()?.getAttribute('aria-busy')).toBe('true');
      expect(
        panel()?.querySelector('.andes-combobox-loading')?.textContent?.trim(),
      ).toBe('Loading...');
      expect(options()).toHaveLength(0);
      expect(input.getAttribute('data-suffix')).toBe('1');
    });

    it('shows the options once loading ends', () => {
      const { fixture, host, focus, panel, options } = setup(OptionsHost);
      host.loading.set(true);
      fixture.detectChanges();
      focus();

      host.loading.set(false);
      fixture.detectChanges();

      expect(panel()?.hasAttribute('aria-busy')).toBe(false);
      expect(options()).toHaveLength(4);
    });

    it('auto-highlights the first option of results that arrive while open', async () => {
      const { fixture, host, focus, input, options, settle } =
        setup(OptionsHost);
      host.autoHighlight.set(true);
      host.options.set([]);
      host.loading.set(true);
      fixture.detectChanges();
      focus();

      host.options.set(FRUIT_OPTIONS);
      host.loading.set(false);
      await settle();

      expect(options()).toHaveLength(4);
      expect(input.getAttribute('aria-activedescendant')).toBe(options()[0].id);
    });
  });

  describe('allowClear', () => {
    it('shows the clear button only while there is text', () => {
      const { fixture, host, type, clearButton, input } = setup(OptionsHost);
      host.allowClear.set(true);
      fixture.detectChanges();
      expect(clearButton()).toBeNull();

      type('ap');

      expect(clearButton()).toBeTruthy();
      expect(clearButton()?.getAttribute('aria-label')).toBe('Clear');
      expect(clearButton()?.tabIndex).toBe(-1);
      expect(input.getAttribute('data-suffix')).toBe('1');
    });

    it('empties the text and the value, and emits clear and searchChange', async () => {
      const { host, focus, press, clearButton, input, settle } =
        setup(OptionsHost);
      host.allowClear.set(true);
      await settle();
      focus();
      press('ArrowDown');
      press('Enter');
      await settle();
      expect(host.value()).toBe('apple');

      clearButton()?.click();
      await settle();

      expect(input.value).toBe('');
      expect(host.value()).toBeNull();
      expect(host.clears).toBe(1);
      expect(host.searches.at(-1)).toBe('');
      expect(clearButton()).toBeNull();
    });

    it('keeps focus on the input by cancelling mousedown on the button', () => {
      const { fixture, host, type, clearButton } = setup(OptionsHost);
      host.allowClear.set(true);
      fixture.detectChanges();
      type('ap');

      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      clearButton()?.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('is not offered while disabled or read-only', async () => {
      const { host, clearButton, input, settle } = setup(OptionsHost);
      host.allowClear.set(true);
      host.value.set('apple');
      host.readOnly.set(true);
      await settle();
      expect(input.value).toBe('Apple');
      expect(clearButton()).toBeNull();

      host.readOnly.set(false);
      host.disabled.set(true);
      await settle();
      expect(clearButton()).toBeNull();

      // NgModel's own `disabled` input sees this binding too, and re-enables the control
      // asynchronously.
      host.disabled.set(false);
      await settle();
      expect(clearButton()).toBeTruthy();
    });

    it('works around a projected andesComboboxInput too', () => {
      const { type, clearButton, input, host, fixture } = setup(CompoundHost);

      type('ban');
      clearButton()?.click();
      fixture.detectChanges();

      expect(input.value).toBe('');
      expect(host.value()).toBeNull();
    });
  });

  describe('backfill', () => {
    function withBackfill() {
      const parts = setup(OptionsHost);
      parts.host.backfill.set(true);
      parts.fixture.detectChanges();
      return parts;
    }

    it('previews the highlighted label in the input without re-filtering', () => {
      const { type, press, input, labels, host } = withBackfill();
      type('ap');

      press('ArrowDown');
      press('ArrowDown');

      expect(input.value).toBe('Apricot');
      expect(labels()).toEqual(['Apple', 'Apricot']);
      // A preview is not a selection.
      expect(host.value()).toBeNull();
    });

    it('restores the typed text on Escape', () => {
      const { type, press, input } = withBackfill();
      type('ap');
      press('ArrowDown');

      press('Escape');

      expect(input.value).toBe('ap');
    });

    it('commits the previewed option on Enter', async () => {
      const { type, press, host, settle } = withBackfill();
      await settle();
      type('ap');
      press('ArrowDown');

      press('Enter');
      await settle();

      expect(host.value()).toBe('apple');
    });

    it('commits the previewed option when the field is left', async () => {
      const { type, press, blur, host, input, settle } = withBackfill();
      await settle();
      type('ch');
      press('ArrowDown');

      blur();
      await settle();

      expect(host.value()).toBe('cherry');
      expect(input.value).toBe('Cherry');
    });

    it('does nothing when off', () => {
      const { type, press, input } = setup(OptionsHost);
      type('ap');

      press('ArrowDown');

      expect(input.value).toBe('ap');
    });
  });

  describe('[(open)]', () => {
    it('reports opening and closing through the model', async () => {
      const { focus, press, host, settle } = setup(OptionsHost);

      focus();
      await settle();
      expect(host.open()).toBe(true);

      press('Escape');
      await settle();
      expect(host.open()).toBe(false);
    });

    it('opens and closes the popup when the parent writes it', async () => {
      const { host, panel, input, settle } = setup(OptionsHost);

      host.open.set(true);
      await settle();
      expect(panel()).toBeTruthy();
      expect(input.getAttribute('aria-expanded')).toBe('true');

      host.open.set(false);
      await settle();
      expect(panel()).toBeNull();
    });

    it('refuses to open while disabled, and says so', async () => {
      const { host, panel, settle } = setup(OptionsHost);
      host.disabled.set(true);
      await settle();

      host.open.set(true);
      await settle();

      expect(panel()).toBeNull();
      expect(host.open()).toBe(false);
    });

    it('closes after a selection', async () => {
      const { focus, press, host, settle } = setup(OptionsHost);
      focus();
      press('ArrowDown');

      press('Enter');
      await settle();

      expect(host.open()).toBe(false);
    });
  });

  describe('outputs', () => {
    it('emits searchChange with the text on every edit', () => {
      const { type, host } = setup(OptionsHost);

      type('a');
      type('ap');

      expect(host.searches).toEqual(['a', 'ap']);
    });

    it('emits optionSelect with the value and the whole option', () => {
      const { focus, options, host, detect } = setup(OptionsHost);
      focus();

      options()[3].dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
      detect();

      expect(host.selections).toEqual([
        { value: 'cherry', option: { value: 'cherry', label: 'Cherry' } },
      ]);
    });
  });

  describe('[(value)] without a form', () => {
    it('writes the selection back to the parent', async () => {
      const { focus, press, host, settle } = setup(CompoundHost);
      focus();
      press('ArrowDown');
      press('Enter');
      await settle();

      expect(host.value()).toBe('Apple');
    });

    it('shows a value the parent writes, and resets to a later write', async () => {
      const { host, input, type, settle } = setup(CompoundHost);

      host.value.set('Cherry');
      await settle();
      expect(input.value).toBe('Cherry');

      // Editing away clears the selection, and the parent hears about it...
      type('Cher');
      await settle();
      expect(host.value()).toBeNull();

      // ...so writing the same value again is a real change that shows up.
      host.value.set('Cherry');
      await settle();
      expect(input.value).toBe('Cherry');
    });

    it('keeps the placeholder written on a projected input', () => {
      const { input } = setup(CompoundHost);

      expect(input.getAttribute('placeholder')).toBe('Own placeholder');
    });
  });

  describe('size, status and variant', () => {
    it('reflects them on the input for styling', () => {
      const { fixture, host, input } = setup(OptionsHost);
      expect(input.getAttribute('data-size')).toBe('md');
      expect(input.getAttribute('data-variant')).toBe('outlined');
      expect(input.hasAttribute('data-status')).toBe(false);

      host.size.set('lg');
      host.variant.set('filled');
      host.status.set('warning');
      fixture.detectChanges();

      expect(input.getAttribute('data-size')).toBe('lg');
      expect(input.getAttribute('data-variant')).toBe('filled');
      expect(input.getAttribute('data-status')).toBe('warning');
      expect(input.hasAttribute('aria-invalid')).toBe(false);
    });

    it('sets aria-invalid for status="error"', () => {
      const { fixture, host, input } = setup(OptionsHost);

      host.status.set('error');
      fixture.detectChanges();

      expect(input.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('placement and popupMatchSelectWidth', () => {
    it('configures the overlay side and alignment from placement', async () => {
      const { host, settle } = setup(OptionsHost);

      host.placement.set('top-end');
      await settle();

      expect(host.combobox().overlay.config().positioning).toMatchObject({
        kind: 'anchored',
        side: 'top',
        align: 'end',
      });
    });

    it('matches the input width by default, a fixed width for a number, content width for false', async () => {
      const { host, settle } = setup(OptionsHost);
      await settle();
      const config = () => host.combobox().overlay.config();
      expect(config().positioning).toMatchObject({ matchAnchorWidth: true });

      host.matchWidth.set(320);
      await settle();
      expect(config().positioning).toMatchObject({ matchAnchorWidth: false });
      expect(config().size).toEqual({ width: 320 });

      host.matchWidth.set(false);
      await settle();
      expect(config().positioning).toMatchObject({ matchAnchorWidth: false });
      expect(config().size).toEqual({});
    });
  });

  describe('autoFocus, focus() and blur()', () => {
    it('focuses the input once rendered when autoFocus is set', async () => {
      const fixture = TestBed.createComponent(OptionsHost);
      fixture.componentInstance.autoFocus.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(
        fixture.nativeElement.querySelector('input'),
      );
    });

    it('moves focus to and from the input imperatively', () => {
      const { host, input } = setup(OptionsHost);

      host.combobox().focus();
      expect(document.activeElement).toBe(input);

      host.combobox().blur();
      expect(document.activeElement).not.toBe(input);
    });
  });
});
