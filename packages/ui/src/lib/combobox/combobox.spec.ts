import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AndesCombobox } from './combobox';
import { AndesComboboxContent } from './combobox-content';
import { AndesComboboxEmpty } from './combobox-empty';
import { AndesComboboxInput } from './combobox-input';
import { AndesComboboxItem } from './combobox-item';

const FRUITS = ['Apple', 'Apricot', 'Banana', 'Cherry'] as const;

/** jsdom leaves `keyCode` at 0 on synthetic events; CDK's key manager reads that field. */
const KEY_CODES: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  Enter: 13,
  Escape: 27,
};

@Component({
  imports: [
    AndesCombobox,
    AndesComboboxInput,
    AndesComboboxContent,
    AndesComboboxItem,
    AndesComboboxEmpty,
    FormsModule,
  ],
  template: `
    <andes-combobox
      #comboboxRef
      [items]="items()"
      [(ngModel)]="value"
      [disabled]="disabled()"
      [autoHighlight]="autoHighlight()"
      aria-label="Fruit"
    >
      <input andesComboboxInput placeholder="Search fruit" />
      <div andesComboboxContent>
        @for (item of comboboxRef.filteredItems(); track item) {
          <div
            andesComboboxItem
            [value]="item"
            [disabled]="item === disabledItem()"
          >
            {{ item }}
          </div>
        } @empty {
          <div andesComboboxEmpty>No results found.</div>
        }
      </div>
    </andes-combobox>
  `,
})
class NgModelHost {
  readonly items = signal<readonly string[]>(FRUITS);
  readonly value = signal<string | null>(null);
  readonly disabled = signal(false);
  readonly autoHighlight = signal(false);
  readonly disabledItem = signal<string | null>(null);
}

@Component({
  imports: [
    AndesCombobox,
    AndesComboboxInput,
    AndesComboboxContent,
    AndesComboboxItem,
    AndesComboboxEmpty,
    ReactiveFormsModule,
  ],
  template: `
    <andes-combobox
      #comboboxRef
      [items]="items()"
      [formControl]="control"
      [autoHighlight]="false"
    >
      <input andesComboboxInput placeholder="Search fruit" />
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
class ReactiveFormsHost {
  readonly items = signal<readonly string[]>(FRUITS);
  readonly control = new FormControl<string | null>(null);
}

/** Wraps dispatch + `detectChanges()`: a delta on an already-rendered view (as opposed to
 *  the panel's *first* render, which CDK's portal attach checks synchronously) is only
 *  flushed to the DOM on the next change-detection pass in this zoneless app. */
function harness<
  T extends { fixture: ComponentFixture<unknown>; input: HTMLInputElement },
>(parts: T) {
  const { fixture, input } = parts;

  function detect(): void {
    fixture.detectChanges();
  }

  function focus(): void {
    input.dispatchEvent(new Event('focus'));
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

  function mousedown(el: Element): MouseEvent {
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(event);
    detect();
    return event;
  }

  /** Mouse arriving over a row: the pair of events a real pointer entry always fires. */
  function hover(el: Element): void {
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    detect();
  }

  /** A pointer that never left the row twitching again, e.g. after an arrow key. */
  function mousemove(el: Element): void {
    el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    detect();
  }

  return { ...parts, detect, focus, type, press, mousedown, hover, mousemove };
}

describe('AndesCombobox', () => {
  function createNgModelHost() {
    const fixture = TestBed.createComponent(NgModelHost);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    const options = () =>
      Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
    const panel = () => document.querySelector<HTMLElement>('[role="listbox"]');

    return harness({
      fixture,
      host: fixture.componentInstance,
      input,
      options,
      panel,
    });
  }

  function createReactiveFormsHost() {
    const fixture = TestBed.createComponent(ReactiveFormsHost);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    const options = () =>
      Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
    const panel = () => document.querySelector<HTMLElement>('[role="listbox"]');

    return harness({
      fixture,
      control: fixture.componentInstance.control,
      input,
      options,
      panel,
    });
  }

  afterEach(() => {
    // Overlay content is portaled to document.body; guard against leaking one test's
    // panel into the next when a test forgets to close it.
    document
      .querySelectorAll('.cdk-overlay-container')
      .forEach((el) => el.remove());
  });

  describe('filtering', () => {
    it('shows every item before any text is typed', () => {
      const { focus, options } = createNgModelHost();
      focus();

      expect(options()).toHaveLength(FRUITS.length);
    });

    it('filters to a case-insensitive substring match as the user types', () => {
      const { type, options } = createNgModelHost();

      type('ap');

      const labels = options().map((el) => el.textContent?.trim());
      expect(labels).toEqual(['Apple', 'Apricot']);
    });

    it('re-filters as the query changes further', () => {
      const { type, options } = createNgModelHost();

      type('ap');
      type('apr');

      expect(options().map((el) => el.textContent?.trim())).toEqual([
        'Apricot',
      ]);
    });
  });

  describe('empty results', () => {
    it('renders andesComboboxEmpty and no options when nothing matches', () => {
      const { type, options, panel } = createNgModelHost();

      type('zzz');

      expect(options()).toHaveLength(0);
      const empty = panel()?.querySelector('.andes-combobox-empty');
      expect(empty).toBeTruthy();
      expect(empty?.getAttribute('role')).toBe('status');
      expect(empty?.textContent?.trim()).toBe('No results found.');
    });

    it('renders an icon alongside the message', () => {
      const { type, panel } = createNgModelHost();

      type('zzz');

      const empty = panel()?.querySelector('.andes-combobox-empty');
      const icon = empty?.querySelector('svg.andes-combobox-empty__icon');
      expect(icon).toBeTruthy();
      // Decorative: the role="status" live region must announce the message only.
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
      // ...and above it, not in place of it.
      expect(empty?.firstElementChild).toBe(icon);
      expect(empty?.textContent?.trim()).toBe('No results found.');
    });
  });

  describe('pointer hover highlighting', () => {
    it('makes a hovered option the active descendant, even when it is not the first', () => {
      const { focus, hover, input, options } = createNgModelHost();
      focus();

      hover(options()[2]);

      expect(input.getAttribute('aria-activedescendant')).toBe(options()[2].id);
      expect(options()[2].hasAttribute('data-active')).toBe(true);
    });

    it('moves the highlight off whichever option was active before', () => {
      const { focus, press, hover, input, options } = createNgModelHost();
      focus();
      press('ArrowDown');
      expect(options()[0].hasAttribute('data-active')).toBe(true);

      hover(options()[2]);

      expect(options()[0].hasAttribute('data-active')).toBe(false);
      expect(input.getAttribute('aria-activedescendant')).toBe(options()[2].id);
    });

    it('takes the highlight back on the next mousemove after an arrow key moved it away', () => {
      const { focus, hover, press, mousemove, input, options } =
        createNgModelHost();
      focus();
      hover(options()[2]);
      press('ArrowDown');
      expect(input.getAttribute('aria-activedescendant')).toBe(options()[3].id);

      // The pointer never left row 2, so no second mouseenter is ever fired for it.
      mousemove(options()[2]);

      expect(input.getAttribute('aria-activedescendant')).toBe(options()[2].id);
    });

    it('commits the hovered option on Enter', () => {
      const { focus, hover, press, host, options } = createNgModelHost();
      focus();

      hover(options()[2]);
      press('Enter');

      expect(host.value()).toBe('Banana');
    });

    it('never highlights a disabled option', () => {
      const { fixture, focus, hover, input, options, host } =
        createNgModelHost();
      host.disabledItem.set('Banana');
      fixture.detectChanges();
      focus();

      hover(options()[2]);

      expect(input.hasAttribute('aria-activedescendant')).toBe(false);
      expect(options()[2].hasAttribute('data-active')).toBe(false);
    });

    it('keeps real DOM focus on the input while hovering', () => {
      const { focus, hover, input, options } = createNgModelHost();
      input.focus();
      focus();

      hover(options()[2]);

      expect(document.activeElement).toBe(input);
    });
  });

  describe('the selected option indicator', () => {
    it('renders a trailing check on the selected option only', () => {
      const { focus, press, options } = createNgModelHost();
      focus();
      press('ArrowDown');
      press('Enter');
      focus();

      const selected = options().find(
        (el) => el.textContent?.trim() === 'Apple',
      );
      expect(selected?.getAttribute('data-selected')).toBe('');
      expect(
        selected?.querySelector('.andes-combobox-item__indicator svg'),
      ).toBeTruthy();
      expect(
        options()
          .filter((el) => el !== selected)
          .every(
            (el) =>
              !el.hasAttribute('data-selected') &&
              !el.querySelector('.andes-combobox-item__indicator svg'),
          ),
      ).toBe(true);
    });

    it('reserves the indicator column on every option, so labels stay aligned', () => {
      const { focus, press, options } = createNgModelHost();
      focus();
      press('ArrowDown');
      press('Enter');
      focus();

      expect(
        options().every(
          (el) =>
            el.lastElementChild?.className === 'andes-combobox-item__indicator',
        ),
      ).toBe(true);
    });

    it('hides the indicator from assistive tech, which reads aria-selected instead', () => {
      const { focus, press, options } = createNgModelHost();
      focus();
      press('ArrowDown');
      press('Enter');
      focus();

      const indicator = options()[0].querySelector(
        '.andes-combobox-item__indicator',
      );
      expect(indicator?.getAttribute('aria-hidden')).toBe('true');
    });

    it('drops the indicator again once the selection is edited away', () => {
      const { focus, press, type, options } = createNgModelHost();
      focus();
      press('ArrowDown');
      press('Enter');
      focus();
      expect(
        options()[0].querySelector('.andes-combobox-item__indicator svg'),
      ).toBeTruthy();

      type('App');

      expect(
        options()[0].querySelector('.andes-combobox-item__indicator svg'),
      ).toBeNull();
    });
  });

  describe('the panel', () => {
    it('fills the width the overlay sizes to the input, rather than its own content', () => {
      const { focus, panel } = createNgModelHost();
      focus();

      // The CDK's .cdk-overlay-pane is itself a flex container already sized to the
      // anchor, so a content-sized panel would leave every row short of the input's
      // right edge - see the note in combobox.css.
      expect(getComputedStyle(panel() as HTMLElement).width).toBe('100%');
    });
  });

  describe('keyboard navigation (aria-activedescendant)', () => {
    it('has no active descendant until a key is pressed', () => {
      const { focus, input } = createNgModelHost();
      focus();

      expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('moves aria-activedescendant forward through the filtered options on ArrowDown', () => {
      const { focus, press, input, options } = createNgModelHost();
      focus();

      press('ArrowDown');
      expect(input.getAttribute('aria-activedescendant')).toBe(options()[0].id);

      press('ArrowDown');
      expect(input.getAttribute('aria-activedescendant')).toBe(options()[1].id);
    });

    it('moves backward on ArrowUp and wraps around', () => {
      const { focus, press, input, options } = createNgModelHost();
      focus();

      press('ArrowUp');

      expect(input.getAttribute('aria-activedescendant')).toBe(
        options()[options().length - 1].id,
      );
    });

    it('never moves real DOM focus off the input while navigating', () => {
      const { focus, press, input } = createNgModelHost();
      input.focus();
      focus();

      press('ArrowDown');
      press('ArrowDown');
      press('ArrowUp');

      expect(document.activeElement).toBe(input);
    });

    it('re-highlights from the first item once the filtered set changes', () => {
      const { focus, press, type, input, options } = createNgModelHost();
      focus();
      press('ArrowDown');
      press('ArrowDown');
      expect(input.getAttribute('aria-activedescendant')).toBe(options()[1].id);

      type('ap');
      expect(input.hasAttribute('aria-activedescendant')).toBe(false);

      press('ArrowDown');
      expect(input.getAttribute('aria-activedescendant')).toBe(options()[0].id);
    });

    it('opens the panel on ArrowDown when closed, without navigating yet', () => {
      const { press, panel } = createNgModelHost();

      expect(panel()).toBeNull();
      press('ArrowDown');

      expect(panel()).toBeTruthy();
    });
  });

  describe('auto-highlight', () => {
    it('highlights the first filtered match automatically when enabled', async () => {
      const fixture = TestBed.createComponent(NgModelHost);
      fixture.componentInstance.autoHighlight.set(true);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;

      input.dispatchEvent(new Event('focus'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const firstOption =
        document.querySelector<HTMLElement>('[role="option"]');
      expect(input.getAttribute('aria-activedescendant')).toBe(firstOption?.id);
    });
  });

  describe('selecting with Enter', () => {
    it('commits the active option, updates the model and closes the panel', () => {
      const { focus, press, host, input, panel } = createNgModelHost();
      focus();
      press('ArrowDown');
      press('ArrowDown');

      press('Enter');

      expect(host.value()).toBe('Apricot');
      expect(input.value).toBe('Apricot');
      expect(input.getAttribute('aria-expanded')).toBe('false');
      expect(panel()).toBeNull();
    });

    it('does nothing when nothing is highlighted', () => {
      const { focus, press, host } = createNgModelHost();
      focus();

      press('Enter');

      expect(host.value()).toBeNull();
    });
  });

  describe('selecting with the pointer', () => {
    it('commits the clicked option on mousedown and closes the panel', () => {
      const { focus, mousedown, host, input, options, panel } =
        createNgModelHost();
      focus();

      mousedown(options()[2]);

      expect(host.value()).toBe('Banana');
      expect(input.value).toBe('Banana');
      expect(panel()).toBeNull();
    });

    it('prevents the default mousedown action, so the input never blurs', () => {
      const { focus, mousedown, options } = createNgModelHost();
      focus();

      const event = mousedown(options()[0]);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('Escape', () => {
    it('closes the panel without selecting, leaving typed text in place', () => {
      const { type, press, host, input, panel } = createNgModelHost();
      type('ap');
      press('ArrowDown');

      press('Escape');

      expect(panel()).toBeNull();
      expect(input.getAttribute('aria-expanded')).toBe('false');
      expect(host.value()).toBeNull();
      expect(input.value).toBe('ap');
    });
  });

  describe('ARIA roles and attributes on the input', () => {
    it('sets role="combobox" and aria-autocomplete="list" up front', () => {
      const { input } = createNgModelHost();

      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-autocomplete')).toBe('list');
      expect(input.getAttribute('aria-expanded')).toBe('false');
      expect(input.hasAttribute('aria-controls')).toBe(false);
    });

    it('sets aria-expanded and aria-controls once open, pointing at the panel', () => {
      const { focus, input, panel } = createNgModelHost();

      focus();

      const openPanel = panel();
      expect(input.getAttribute('aria-expanded')).toBe('true');
      expect(input.getAttribute('aria-controls')).toBe(openPanel?.id);
    });

    it('forwards aria-label to the input', () => {
      const { input } = createNgModelHost();

      expect(input.getAttribute('aria-label')).toBe('Fruit');
    });
  });

  describe('ARIA roles inside the panel', () => {
    it('gives the panel role="listbox" and each suggestion role="option"', () => {
      const { focus, panel, options } = createNgModelHost();
      focus();

      expect(panel()?.getAttribute('role')).toBe('listbox');
      expect(
        options().every((el) => el.getAttribute('role') === 'option'),
      ).toBe(true);
    });

    it('reflects the selected item with aria-selected', () => {
      const { focus, press, options } = createNgModelHost();
      focus();
      press('ArrowDown');
      press('Enter');

      focus();
      const selected = options().find(
        (el) => el.textContent?.trim() === 'Apple',
      );
      expect(selected?.getAttribute('aria-selected')).toBe('true');
      expect(
        options()
          .filter((el) => el !== selected)
          .every((el) => el.getAttribute('aria-selected') === 'false'),
      ).toBe(true);
    });
  });

  describe('disabled', () => {
    it('disables the native input and does not open on focus or typing', () => {
      const fixture = TestBed.createComponent(NgModelHost);
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;

      expect(input.disabled).toBe(true);

      input.dispatchEvent(new Event('focus'));
      fixture.detectChanges();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    });
  });

  describe('ControlValueAccessor', () => {
    it('works with template-driven forms (ngModel), in both directions', async () => {
      const { fixture, host, focus, type, press, input } = createNgModelHost();

      host.value.set('Banana');
      fixture.detectChanges();
      // NgModel's own model -> view sync runs through a signal effect that needs a full
      // flush, one tick after the write - real apps never notice since the zoneless
      // scheduler ticks on its own, but a synchronous test assertion right after the write
      // would see the old value without waiting for it here.
      await fixture.whenStable();
      fixture.detectChanges();
      expect(input.value).toBe('Banana');

      focus();
      // Clears the query so every item is back in play - Banana's own label had already
      // narrowed the filtered set down to itself.
      type('');
      press('ArrowDown');
      press('Enter');

      expect(host.value()).toBe('Apple');
    });

    it('works with reactive forms (FormControl), in both directions', async () => {
      const { fixture, control, focus, type, press, input } =
        createReactiveFormsHost();

      control.setValue('Cherry');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(input.value).toBe('Cherry');

      focus();
      type('');
      press('ArrowDown');
      press('Enter');

      expect(control.value).toBe('Apple');
    });

    it('honours FormControl.disable()', () => {
      const { fixture, control, input } = createReactiveFormsHost();

      control.disable();
      fixture.detectChanges();

      expect(input.disabled).toBe(true);
    });

    it('marks the control as touched on blur', () => {
      const { control, input } = createReactiveFormsHost();

      expect(control.touched).toBe(false);
      input.dispatchEvent(new Event('focus'));
      input.dispatchEvent(new Event('blur'));

      expect(control.touched).toBe(true);
    });
  });
});
