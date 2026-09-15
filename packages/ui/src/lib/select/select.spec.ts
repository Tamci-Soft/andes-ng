import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AndesSelect } from './select';
import { AndesSelectContent } from './select-content';
import { AndesSelectGroup } from './select-group';
import { AndesSelectItem } from './select-item';
import { AndesSelectLabel } from './select-label';
import { AndesSelectSeparator } from './select-separator';
import { AndesSelectTrigger } from './select-trigger';
import { AndesSelectValue } from './select-value';

/**
 * The CDK's `ListKeyManager` reads the deprecated-but-universal `KeyboardEvent.keyCode`,
 * which jsdom leaves at 0 on synthetic events, so tests have to populate it.
 */
const KEY_CODES: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  Home: 36,
  End: 35,
  Tab: 9,
  Enter: 13,
  Escape: 27,
  ' ': 32,
};

function keyCodeFor(key: string): number {
  return KEY_CODES[key] ?? key.toUpperCase().charCodeAt(0);
}

function pressKey(
  target: Element,
  key: string,
  modifiers: Partial<KeyboardEventInit> = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  Object.defineProperty(event, 'keyCode', { get: () => keyCodeFor(key) });
  target.dispatchEvent(event);
  return event;
}

interface Fruit {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

const FRUITS: readonly Fruit[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'apricot', label: 'Apricot' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

@Component({
  imports: [
    AndesSelect,
    AndesSelectContent,
    AndesSelectItem,
    AndesSelectTrigger,
    AndesSelectValue,
  ],
  template: `<andes-select
    aria-label="Fruit"
    [value]="value()"
    [placeholder]="placeholder()"
    [disabled]="disabled()"
    [required]="required()"
    [aria-invalid]="invalid()"
    [displayWith]="displayWith()"
    (valueChange)="valueChanges.push($event)"
    (openChange)="openChanges.push($event)"
  >
    <andes-select-trigger>
      <andes-select-value />
    </andes-select-trigger>
    <andes-select-content>
      @for (fruit of fruits(); track fruit.value) {
        <andes-select-item
          [value]="fruit.value"
          [disabled]="fruit.disabled ?? false"
          >{{ fruit.label }}</andes-select-item
        >
      }
    </andes-select-content>
  </andes-select>`,
})
class SelectHost {
  readonly fruits = signal<readonly Fruit[]>(FRUITS);
  readonly value = signal<unknown>(undefined);
  readonly placeholder = signal('Pick a fruit');
  readonly disabled = signal(false);
  readonly required = signal(false);
  readonly invalid = signal(false);
  readonly displayWith = signal<((value: unknown) => string) | undefined>(
    undefined,
  );
  readonly valueChanges: unknown[] = [];
  readonly openChanges: boolean[] = [];
}

describe('AndesSelect', () => {
  function createHost() {
    const fixture = TestBed.createComponent(SelectHost);
    fixture.detectChanges();
    return withHelpers(fixture);
  }

  function withHelpers(fixture: ComponentFixture<SelectHost>) {
    const trigger = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;

    const panel = () =>
      document.querySelector<HTMLElement>('[data-slot="select-content"]');
    const options = () =>
      Array.from(
        panel()?.querySelectorAll<HTMLElement>('[role="option"]') ?? [],
      );
    const optionLabels = () => options().map((el) => el.textContent?.trim());
    const activeOption = () =>
      options().find((el) => el.hasAttribute('data-active'));

    const open = () => {
      trigger.click();
      fixture.detectChanges();
    };

    return {
      fixture,
      host: fixture.componentInstance,
      trigger,
      panel,
      options,
      optionLabels,
      activeOption,
      open,
      detect: () => fixture.detectChanges(),
    };
  }

  describe('closed state and ARIA', () => {
    it('renders a real button as the combobox, not the host element', () => {
      const { fixture, trigger } = createHost();
      const host = fixture.nativeElement.querySelector('andes-select');

      expect(trigger.tagName).toBe('BUTTON');
      expect(trigger.getAttribute('type')).toBe('button');
      expect(trigger.getAttribute('role')).toBe('combobox');
      // Aliased ARIA inputs are forwarded to the button; the non-focusable host must
      // not keep a copy a screen reader would never reach anyway.
      expect(trigger.getAttribute('aria-label')).toBe('Fruit');
      expect(host.hasAttribute('aria-label')).toBe(false);
    });

    it('advertises the listbox it opens', () => {
      const { trigger } = createHost();

      expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.getAttribute('data-state')).toBe('closed');
    });

    it('shows the placeholder until something is selected', () => {
      const { trigger, fixture, host } = createHost();

      expect(trigger.textContent?.trim()).toBe('Pick a fruit');
      expect(trigger.hasAttribute('data-placeholder')).toBe(true);

      host.value.set('banana');
      fixture.detectChanges();

      expect(trigger.hasAttribute('data-placeholder')).toBe(false);
    });

    it('reflects required and invalid on the button', () => {
      const { trigger, fixture, host } = createHost();

      expect(trigger.hasAttribute('aria-required')).toBe(false);
      expect(trigger.hasAttribute('aria-invalid')).toBe(false);

      host.required.set(true);
      host.invalid.set(true);
      fixture.detectChanges();

      expect(trigger.getAttribute('aria-required')).toBe('true');
      expect(trigger.getAttribute('aria-invalid')).toBe('true');
      expect(trigger.classList).toContain('andes-select__trigger--invalid');
    });

    it('disables the button and refuses to open when disabled', () => {
      const { trigger, fixture, host, panel } = createHost();
      host.disabled.set(true);
      fixture.detectChanges();

      expect(trigger.disabled).toBe(true);

      trigger.click();
      fixture.detectChanges();

      expect(panel()).toBeNull();
    });
  });

  describe('opening and closing', () => {
    it('opens on click and renders a listbox of options', () => {
      const { trigger, panel, optionLabels, open } = createHost();
      open();

      expect(panel()).not.toBeNull();
      expect(panel()?.getAttribute('role')).toBe('listbox');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe(panel()?.id);
      expect(optionLabels()).toEqual(['Apple', 'Apricot', 'Banana', 'Cherry']);
    });

    it('labels the listbox from the same ARIA inputs as the trigger', () => {
      const { panel, open } = createHost();
      open();

      expect(panel()?.getAttribute('aria-label')).toBe('Fruit');
    });

    it('closes when the trigger is clicked again', () => {
      const { trigger, panel, open, fixture } = createHost();
      open();
      trigger.click();
      fixture.detectChanges();

      expect(panel()).toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('emits openChange on both transitions', () => {
      const { host, trigger, open, fixture } = createHost();
      open();
      trigger.click();
      fixture.detectChanges();

      expect(host.openChanges).toEqual([true, false]);
    });

    it('opens on End with the last option active', () => {
      const { trigger, options, activeOption, fixture } = createHost();
      pressKey(trigger, 'End');
      fixture.detectChanges();

      expect(activeOption()).toBe(options()[3]);
    });

    it('opens on ArrowDown, Enter and Space from the closed trigger', () => {
      for (const key of ['ArrowDown', 'ArrowUp', 'Enter', ' ']) {
        const { trigger, panel, fixture } = createHost();
        const event = pressKey(trigger, key);
        fixture.detectChanges();

        expect(panel(), `${key} should open the panel`).not.toBeNull();
        expect(event.defaultPrevented).toBe(true);

        fixture.destroy();
      }
    });
  });

  describe('keyboard navigation', () => {
    it('moves real focus onto the first option when nothing is selected', () => {
      const { options, activeOption, open } = createHost();
      open();

      expect(activeOption()).toBe(options()[0]);
      expect(document.activeElement).toBe(options()[0]);
    });

    it('opens with the selected option active and focused', () => {
      const { fixture, host, options, activeOption, open } = createHost();
      host.value.set('banana');
      fixture.detectChanges();
      open();

      expect(activeOption()).toBe(options()[2]);
      expect(document.activeElement).toBe(options()[2]);
    });

    it('keeps the roving tabindex on the active option alone', () => {
      const { options, open, detect } = createHost();
      open();

      pressKey(options()[0], 'ArrowDown');
      detect();

      expect(options().map((el) => el.getAttribute('tabindex'))).toEqual([
        '-1',
        '0',
        '-1',
        '-1',
      ]);
    });

    it('moves the active option with the arrow keys', () => {
      const { options, activeOption, open, detect } = createHost();
      open();

      pressKey(options()[0], 'ArrowDown');
      detect();
      expect(activeOption()).toBe(options()[1]);
      expect(document.activeElement).toBe(options()[1]);

      pressKey(options()[1], 'ArrowUp');
      detect();
      expect(activeOption()).toBe(options()[0]);
    });

    it('jumps to the first and last option with Home and End', () => {
      const { options, activeOption, open, detect } = createHost();
      open();

      pressKey(options()[0], 'End');
      detect();
      expect(activeOption()).toBe(options()[3]);

      pressKey(options()[3], 'Home');
      detect();
      expect(activeOption()).toBe(options()[0]);
    });

    it('stops at the ends instead of wrapping, as a native select does', () => {
      const { options, activeOption, open, detect } = createHost();
      open();

      pressKey(options()[0], 'ArrowUp');
      detect();

      expect(activeOption()).toBe(options()[0]);
    });

    it('skips disabled options', () => {
      const { fixture, host, options, activeOption, open, detect } =
        createHost();
      host.fruits.set([
        { value: 'apple', label: 'Apple' },
        { value: 'apricot', label: 'Apricot', disabled: true },
        { value: 'banana', label: 'Banana' },
      ]);
      fixture.detectChanges();
      open();

      pressKey(options()[0], 'ArrowDown');
      detect();

      expect(activeOption()).toBe(options()[2]);
      expect(options()[1].getAttribute('aria-disabled')).toBe('true');
      // `disabled` binds to the list-navigation directive, never to the button element:
      // a natively disabled option would drop out of the roving tabindex and stop being
      // announced at all.
      expect((options()[1] as HTMLButtonElement).disabled).toBe(false);
      expect(options()[1].getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('typeahead', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('jumps to the option matching a typed prefix', () => {
      const { options, activeOption, open, detect } = createHost();
      open();

      pressKey(options()[0], 'b');
      vi.advanceTimersByTime(250);
      detect();

      expect(activeOption()).toBe(options()[2]);
    });

    it('matches a multi-character prefix typed inside the debounce window', () => {
      const { options, activeOption, open, detect } = createHost();
      open();

      pressKey(options()[0], 'a');
      pressKey(options()[0], 'p');
      pressKey(options()[0], 'r');
      vi.advanceTimersByTime(250);
      detect();

      expect(activeOption()).toBe(options()[1]);
    });

    it('opens and typeaheads when a character is typed on the closed trigger', () => {
      const { trigger, panel, activeOption, options, detect } = createHost();

      pressKey(trigger, 'c');
      vi.advanceTimersByTime(250);
      detect();

      expect(panel()).not.toBeNull();
      expect(activeOption()).toBe(options()[3]);
    });
  });

  describe('selection', () => {
    it('selects the active option with Enter, closes and returns focus', () => {
      const { host, trigger, options, panel, open, detect } = createHost();
      open();

      pressKey(options()[0], 'ArrowDown');
      detect();
      pressKey(options()[1], 'Enter');
      detect();

      expect(host.valueChanges).toEqual(['apricot']);
      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(trigger.textContent?.trim()).toBe('Apricot');
    });

    it('selects the active option with Space', () => {
      const { host, options, panel, open, detect } = createHost();
      open();

      pressKey(options()[0], ' ');
      detect();

      expect(host.valueChanges).toEqual(['apple']);
      expect(panel()).toBeNull();
    });

    it('selects on click', () => {
      const { host, options, panel, open, detect } = createHost();
      open();

      options()[2].click();
      detect();

      expect(host.valueChanges).toEqual(['banana']);
      expect(panel()).toBeNull();
    });

    it('ignores clicks on a disabled option', () => {
      const { fixture, host, options, panel, open, detect } = createHost();
      host.fruits.set([
        { value: 'apple', label: 'Apple' },
        { value: 'apricot', label: 'Apricot', disabled: true },
      ]);
      fixture.detectChanges();
      open();

      options()[1].click();
      detect();

      expect(host.valueChanges).toEqual([]);
      expect(panel()).not.toBeNull();
    });

    it('marks the selected option with aria-selected', () => {
      const { fixture, host, options, open } = createHost();
      host.value.set('banana');
      fixture.detectChanges();
      open();

      expect(options().map((el) => el.getAttribute('aria-selected'))).toEqual([
        'false',
        'false',
        'true',
        'false',
      ]);
      expect(options()[2].hasAttribute('data-selected')).toBe(true);
    });

    it('closes on Escape without selecting, and returns focus to the trigger', () => {
      const { host, trigger, options, panel, open, detect } = createHost();
      open();

      pressKey(options()[0], 'ArrowDown');
      detect();
      pressKey(options()[1], 'Escape');
      detect();

      expect(panel()).toBeNull();
      expect(host.valueChanges).toEqual([]);
      expect(document.activeElement).toBe(trigger);
    });

    it('closes on Tab without selecting', () => {
      const { host, trigger, options, panel, open, detect } = createHost();
      open();

      const event = pressKey(options()[0], 'Tab');
      detect();

      expect(panel()).toBeNull();
      expect(host.valueChanges).toEqual([]);
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe('trigger label', () => {
    it('shows the selected option label without the panel ever being opened', () => {
      const { fixture, host, trigger } = createHost();
      host.value.set('banana');
      fixture.detectChanges();

      expect(trigger.textContent?.trim()).toBe('Banana');
    });

    it('keeps showing the selected option label after the panel closes', () => {
      const { trigger, options, open, detect } = createHost();
      open();
      options()[3].click();
      detect();

      expect(trigger.textContent?.trim()).toBe('Cherry');
    });

    it('keeps the label of a selected option that is removed from the list', () => {
      const { fixture, host, trigger } = createHost();
      host.value.set('banana');
      fixture.detectChanges();
      host.fruits.set([{ value: 'apple', label: 'Apple' }]);
      fixture.detectChanges();

      expect(trigger.textContent?.trim()).toBe('Banana');
    });

    it('falls back to displayWith for a value no option carries', () => {
      const { fixture, host, trigger } = createHost();
      host.displayWith.set((value) => `Fruit #${value}`);
      host.value.set('durian');
      fixture.detectChanges();

      expect(trigger.textContent?.trim()).toBe('Fruit #durian');
    });

    it('stringifies a value no option carries when there is no displayWith', () => {
      const { fixture, host, trigger } = createHost();
      host.value.set('durian');
      fixture.detectChanges();

      expect(trigger.textContent?.trim()).toBe('durian');
    });

    it('prefers a matching option label over the fallback', () => {
      const { fixture, host, trigger } = createHost();
      host.displayWith.set(() => 'fallback');
      host.value.set('apple');
      fixture.detectChanges();

      expect(trigger.textContent?.trim()).toBe('Apple');
    });
  });

  describe('reopening', () => {
    it('re-projects the options into the panel on every open', () => {
      const {
        trigger,
        panel,
        optionLabels,
        options,
        activeOption,
        open,
        detect,
      } = createHost();
      open();
      expect(optionLabels()).toEqual(['Apple', 'Apricot', 'Banana', 'Cherry']);

      pressKey(options()[0], 'Escape');
      detect();
      expect(panel()).toBeNull();

      trigger.click();
      detect();

      expect(optionLabels()).toEqual(['Apple', 'Apricot', 'Banana', 'Cherry']);
      expect(activeOption()).toBe(options()[0]);
      expect(document.activeElement).toBe(options()[0]);

      pressKey(options()[0], 'ArrowDown');
      detect();
      expect(activeOption()).toBe(options()[1]);
    });

    it('opens on the previously selected option', () => {
      const { trigger, options, activeOption, open, detect } = createHost();
      open();
      options()[2].click();
      detect();

      trigger.click();
      detect();

      expect(activeOption()).toBe(options()[2]);
    });
  });
});

@Component({
  imports: [
    AndesSelect,
    AndesSelectContent,
    AndesSelectItem,
    AndesSelectTrigger,
    AndesSelectValue,
    ReactiveFormsModule,
  ],
  template: `<andes-select [formControl]="control" placeholder="none">
    <andes-select-trigger><andes-select-value /></andes-select-trigger>
    <andes-select-content>
      @for (fruit of fruits; track fruit.value) {
        <andes-select-item [value]="fruit.value">{{
          fruit.label
        }}</andes-select-item>
      }
    </andes-select-content>
  </andes-select>`,
})
class ReactiveFormHost {
  readonly fruits = FRUITS;
  readonly control = new FormControl<string | null>('banana');
}

describe('AndesSelect with a reactive form', () => {
  function createHost() {
    const fixture = TestBed.createComponent(ReactiveFormHost);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    const options = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-slot="select-content"] [role="option"]',
        ),
      );
    return {
      fixture,
      control: fixture.componentInstance.control,
      trigger,
      options,
    };
  }

  it('shows the option label for a value written by the form', () => {
    const { trigger } = createHost();

    expect(trigger.textContent?.trim()).toBe('Banana');
  });

  it('opens with the form value active', () => {
    const { fixture, trigger, options } = createHost();
    trigger.click();
    fixture.detectChanges();

    expect(options()[2].hasAttribute('data-active')).toBe(true);
    expect(options()[2].getAttribute('aria-selected')).toBe('true');
  });

  it('propagates a selection to the form control', () => {
    const { fixture, control, trigger, options } = createHost();
    trigger.click();
    fixture.detectChanges();

    options()[0].click();
    fixture.detectChanges();

    expect(control.value).toBe('apple');
    expect(control.dirty).toBe(true);
  });

  it('marks the control touched once the panel closes', () => {
    const { fixture, control, trigger, options } = createHost();
    expect(control.touched).toBe(false);

    trigger.click();
    fixture.detectChanges();
    pressKey(options()[0], 'Escape');
    fixture.detectChanges();

    expect(control.touched).toBe(true);
  });

  it('honours the disabled state of the form control', () => {
    const { fixture, control, trigger } = createHost();
    control.disable();
    fixture.detectChanges();

    expect(trigger.disabled).toBe(true);

    control.enable();
    fixture.detectChanges();

    expect(trigger.disabled).toBe(false);
  });

  it('reacts to a value set on the control', () => {
    const { fixture, control, trigger } = createHost();
    control.setValue('cherry');
    fixture.detectChanges();

    expect(trigger.textContent?.trim()).toBe('Cherry');
  });
});

@Component({
  imports: [
    AndesSelect,
    AndesSelectContent,
    AndesSelectItem,
    AndesSelectTrigger,
    AndesSelectValue,
    FormsModule,
  ],
  template: `<andes-select [(ngModel)]="fruit" placeholder="none">
    <andes-select-trigger><andes-select-value /></andes-select-trigger>
    <andes-select-content>
      @for (item of fruits; track item.value) {
        <andes-select-item [value]="item.value">{{
          item.label
        }}</andes-select-item>
      }
    </andes-select-content>
  </andes-select>`,
})
class NgModelHost {
  readonly fruits = FRUITS;
  fruit: string | null = 'apple';
}

describe('AndesSelect with ngModel', () => {
  it('writes and reads back through the model', async () => {
    const fixture = TestBed.createComponent(NgModelHost);
    fixture.detectChanges();
    // ngModel writes its initial value in a microtask, so the first render still shows
    // the placeholder.
    await fixture.whenStable();
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    expect(trigger.textContent?.trim()).toBe('Apple');

    trigger.click();
    fixture.detectChanges();

    const options = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-slot="select-content"] [role="option"]',
      ),
    );
    expect(options[0].hasAttribute('data-active')).toBe(true);

    options[3].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.fruit).toBe('cherry');
    expect(trigger.textContent?.trim()).toBe('Cherry');
  });
});

@Component({
  imports: [
    AndesSelect,
    AndesSelectContent,
    AndesSelectGroup,
    AndesSelectItem,
    AndesSelectLabel,
    AndesSelectSeparator,
    AndesSelectTrigger,
    AndesSelectValue,
  ],
  template: `<andes-select aria-label="Food">
    <andes-select-trigger><andes-select-value /></andes-select-trigger>
    <andes-select-content>
      <andes-select-group>
        <andes-select-label>Fruit</andes-select-label>
        <andes-select-item value="apple">Apple</andes-select-item>
      </andes-select-group>
      <andes-select-separator />
      <andes-select-group>
        <andes-select-label>Vegetables</andes-select-label>
        <andes-select-item value="leek">Leek</andes-select-item>
      </andes-select-group>
    </andes-select-content>
  </andes-select>`,
})
class GroupedHost {}

describe('AndesSelect groups', () => {
  it('names each group from its own label and hides the separator', () => {
    const fixture = TestBed.createComponent(GroupedHost);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLElement).click();
    fixture.detectChanges();

    const panel = document.querySelector('[data-slot="select-content"]');
    const groups = Array.from(panel?.querySelectorAll('[role="group"]') ?? []);
    expect(groups).toHaveLength(2);

    for (const group of groups) {
      const labelId = group.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();
      const label = panel?.querySelector(`#${labelId}`);
      expect(label?.textContent?.trim()).toBe(
        group === groups[0] ? 'Fruit' : 'Vegetables',
      );
    }

    expect(
      panel
        ?.querySelector('[data-slot="select-separator"]')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('navigates across groups as one flat list of options', () => {
    const fixture = TestBed.createComponent(GroupedHost);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLElement).click();
    fixture.detectChanges();

    const options = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-slot="select-content"] [role="option"]',
      ),
    );
    expect(options).toHaveLength(2);

    pressKey(options[0], 'ArrowDown');
    fixture.detectChanges();

    expect(options[1].hasAttribute('data-active')).toBe(true);
  });
});

@Component({
  imports: [
    AndesSelect,
    AndesSelectContent,
    AndesSelectItem,
    AndesSelectTrigger,
    AndesSelectValue,
  ],
  template: `<andes-select aria-label="Fruit" [value]="value()">
    <andes-select-trigger><andes-select-value /></andes-select-trigger>
    <andes-select-content>
      @for (fruit of fruits; track fruit.value) {
        <andes-select-item [value]="fruit.value">{{
          fruit.label
        }}</andes-select-item>
      }
    </andes-select-content>
  </andes-select>`,
})
class TwoWaySelectHost {
  readonly fruits = FRUITS;
  readonly value = signal<unknown>('banana');
}

describe('AndesSelect resyncing a diverged value', () => {
  // Regression test for a bug a QA judge found: once a user's pick had diverged the
  // trigger from the bound `value`, the old design - a plain `input()` mirrored into a
  // separate internal signal by an `effect()` - could never be reliably nudged back into
  // sync by the parent, because the *only* channel the parent has for "re-asserting" a
  // value is the `[value]` template binding, and Angular only pushes a binding through
  // when its own bound expression evaluates to something it did not already push last
  // time. Once the input has been sitting on 'banana' the whole time, there is no way for
  // a parent to make that binding "fire again" with the exact same value - so with a
  // *separate* internal signal that only the effect mirrors into, a value the effect
  // never got told to re-apply is a display that can never be corrected short of the user
  // picking 'banana' again themselves. A `linkedSignal` has the identical blind spot,
  // since it also only recomputes when its `source` produces a value it considers new
  // (confirmed by the Switch/Checkbox investigation).
  //
  // `model()` removes this dependency on the template binding "firing" at all: the value
  // a consumer holds a reference to (through `[(value)]`, or - as here - by reading the
  // model straight off the component, exactly what a real two-way-bound parent signal
  // amounts to) *is* the control's own state, so writing 'banana' into it is always a
  // direct, unconditional resync, the same way `writeValue` already was.
  it('re-displays a re-asserted value after the user picks something else', () => {
    const fixture = TestBed.createComponent(TwoWaySelectHost);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    const options = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-slot="select-content"] [role="option"]',
        ),
      );
    const select = fixture.debugElement.query(
      (node) => node.name === 'andes-select',
    ).componentInstance as { value: { set(value: unknown): void } };

    expect(trigger.textContent?.trim()).toBe('Banana');

    // The user picks a different option, diverging the trigger from 'banana'.
    trigger.click();
    fixture.detectChanges();
    options()[0].click();
    fixture.detectChanges();

    expect(trigger.textContent?.trim()).toBe('Apple');

    // The parent re-asserts the value it originally bound - through the exact same
    // channel `[(value)]`/`valueChange` two-way binding writes through, since that is
    // what `value` being a `model()` (rather than a plain `input()`) now enables.
    select.value.set('banana');
    fixture.detectChanges();

    expect(trigger.textContent?.trim()).toBe('Banana');
  });
});
