import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AndesCheckbox } from './checkbox';
import { AndesCheckboxGroup } from './checkbox-group';
import { AndesCheckboxSelectAll } from './checkbox-select-all';
import {
  AndesCheckboxOption,
  AndesCheckboxOptionLabel,
} from './checkbox-option-label';

@Component({
  imports: [AndesCheckbox, AndesCheckboxGroup, AndesCheckboxSelectAll],
  template: `<andes-checkbox-group
    [(value)]="value"
    [disabled]="disabled()"
    aria-label="Fruits"
  >
    <andes-checkbox andesSelectAll>Select all</andes-checkbox>
    <andes-checkbox value="apple">Apple</andes-checkbox>
    <andes-checkbox value="banana" [disabled]="bananaDisabled()"
      >Banana</andes-checkbox
    >
    <andes-checkbox value="cherry">Cherry</andes-checkbox>
  </andes-checkbox-group>`,
})
class GroupHost {
  readonly value = signal<readonly string[]>([]);
  readonly disabled = signal(false);
  readonly bananaDisabled = signal(false);
}

describe('AndesCheckboxGroup', () => {
  function createHost() {
    const fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const [selectAll, apple, banana, cherry] = Array.from(
      host.querySelectorAll<HTMLInputElement>('input[type=checkbox]'),
    );

    /** Drives a checkbox the way a browser does: flip the DOM property, then fire `change`. */
    function click(input: HTMLInputElement): void {
      input.checked = !input.checked;
      input.indeterminate = false;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
    }

    return { fixture, selectAll, apple, banana, cherry, click };
  }

  it('renders as an ARIA group with an accessible name', () => {
    const { fixture } = createHost();
    const group = fixture.nativeElement.querySelector('andes-checkbox-group');

    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Fruits');
  });

  it('starts with every item unchecked and select-all unchecked', () => {
    const { selectAll, apple, banana, cherry } = createHost();

    expect([apple.checked, banana.checked, cherry.checked]).toEqual([
      false,
      false,
      false,
    ]);
    expect(selectAll.checked).toBe(false);
    expect(selectAll.indeterminate).toBe(false);
  });

  it('reflects a value written by the parent onto the matching items', () => {
    const { fixture, apple, banana, cherry } = createHost();
    fixture.componentInstance.value.set(['apple', 'cherry']);
    fixture.detectChanges();

    expect([apple.checked, banana.checked, cherry.checked]).toEqual([
      true,
      false,
      true,
    ]);
  });

  it('adds an item to the value when it is checked, in template order', () => {
    const { fixture, apple, cherry, click } = createHost();

    click(cherry);
    click(apple);

    // Template order, not click order - the value is a function of the selection itself.
    expect(fixture.componentInstance.value()).toEqual(['apple', 'cherry']);
  });

  it('removes an item from the value when it is unchecked', () => {
    const { fixture, apple, banana, click } = createHost();
    fixture.componentInstance.value.set(['apple', 'banana']);
    fixture.detectChanges();

    click(banana);

    expect(fixture.componentInstance.value()).toEqual(['apple']);
    expect(apple.checked).toBe(true);
  });

  describe('select all', () => {
    it('checks every child and becomes checked itself', () => {
      const { fixture, selectAll, apple, banana, cherry, click } = createHost();

      click(selectAll);

      expect([apple.checked, banana.checked, cherry.checked]).toEqual([
        true,
        true,
        true,
      ]);
      expect(selectAll.checked).toBe(true);
      expect(selectAll.indeterminate).toBe(false);
      expect(fixture.componentInstance.value()).toEqual([
        'apple',
        'banana',
        'cherry',
      ]);
    });

    it('becomes indeterminate when one child is unchecked while others stay checked', () => {
      const { selectAll, banana, apple, cherry, click } = createHost();
      click(selectAll);
      expect(selectAll.checked).toBe(true);

      click(banana);

      expect(selectAll.indeterminate).toBe(true);
      expect(selectAll.checked).toBe(false);
      expect([apple.checked, banana.checked, cherry.checked]).toEqual([
        true,
        false,
        true,
      ]);
    });

    it('becomes unchecked once every child is unchecked again', () => {
      const { fixture, selectAll, apple, banana, cherry, click } = createHost();
      click(selectAll);

      click(apple);
      click(banana);
      click(cherry);

      expect(selectAll.checked).toBe(false);
      expect(selectAll.indeterminate).toBe(false);
      expect(fixture.componentInstance.value()).toEqual([]);
    });

    it('unchecks every child when clicked while fully checked', () => {
      const { fixture, selectAll, apple, banana, cherry, click } = createHost();
      click(selectAll);

      click(selectAll);

      expect([apple.checked, banana.checked, cherry.checked]).toEqual([
        false,
        false,
        false,
      ]);
      expect(fixture.componentInstance.value()).toEqual([]);
    });

    it('selects everything when clicked while indeterminate', () => {
      const { fixture, selectAll, click } = createHost();
      fixture.componentInstance.value.set(['apple']);
      fixture.detectChanges();
      expect(selectAll.indeterminate).toBe(true);

      // The browser resolves a click on an indeterminate checkbox to `checked === true`.
      click(selectAll);

      expect(fixture.componentInstance.value()).toEqual([
        'apple',
        'banana',
        'cherry',
      ]);
    });

    it('goes straight to checked when the last remaining child is checked', () => {
      const { fixture, selectAll, cherry, click } = createHost();
      fixture.componentInstance.value.set(['apple', 'banana']);
      fixture.detectChanges();
      expect(selectAll.indeterminate).toBe(true);

      click(cherry);

      expect(selectAll.checked).toBe(true);
      expect(selectAll.indeterminate).toBe(false);
    });

    it('never counts itself as one of the items it summarizes', () => {
      // Regression guard for the select-all checkbox registering as a group item: it would
      // then contribute to the aggregate it derives from, and could never settle on "all
      // checked" because its own state is the thing being computed.
      const { fixture, selectAll, click } = createHost();

      click(selectAll);

      expect(fixture.componentInstance.value()).toEqual([
        'apple',
        'banana',
        'cherry',
      ]);
      expect(fixture.componentInstance.value()).not.toContain('');
    });
  });

  describe('disabled items', () => {
    it('ignores a disabled item so select-all can still reach "all checked"', () => {
      const { fixture, selectAll, apple, cherry, click } = createHost();
      fixture.componentInstance.bananaDisabled.set(true);
      fixture.detectChanges();

      click(selectAll);

      // Banana can never be toggled by a click, so counting it would strand select-all on
      // `indeterminate` forever - the aggregate deliberately spans enabled items only.
      expect([apple.checked, cherry.checked]).toEqual([true, true]);
      expect(selectAll.checked).toBe(true);
      expect(selectAll.indeterminate).toBe(false);
      expect(fixture.componentInstance.value()).toEqual(['apple', 'cherry']);
    });

    it('preserves an already-selected disabled item through select-all', () => {
      const { fixture, selectAll, click } = createHost();
      fixture.componentInstance.value.set(['banana']);
      fixture.componentInstance.bananaDisabled.set(true);
      fixture.detectChanges();

      click(selectAll);
      click(selectAll);

      // Select-all only ever speaks for the items it can reach; it must not silently drop a
      // selection the user could not have made through it.
      expect(fixture.componentInstance.value()).toEqual(['banana']);
    });
  });

  it('disables every item when the group is disabled', () => {
    const { fixture, selectAll, apple, banana, cherry } = createHost();
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect([
      selectAll.disabled,
      apple.disabled,
      banana.disabled,
      cherry.disabled,
    ]).toEqual([true, true, true, true]);
  });

  it('unregisters an item that is removed from the DOM', () => {
    @Component({
      imports: [AndesCheckbox, AndesCheckboxGroup, AndesCheckboxSelectAll],
      template: `<andes-checkbox-group [(value)]="value">
        <andes-checkbox andesSelectAll>Select all</andes-checkbox>
        <andes-checkbox value="apple">Apple</andes-checkbox>
        @if (showBanana()) {
          <andes-checkbox value="banana">Banana</andes-checkbox>
        }
      </andes-checkbox-group>`,
    })
    class DynamicHost {
      readonly value = signal<readonly string[]>(['apple']);
      readonly showBanana = signal(true);
    }

    const fixture = TestBed.createComponent(DynamicHost);
    fixture.detectChanges();
    const selectAll = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    expect(selectAll.indeterminate).toBe(true);

    fixture.componentInstance.showBanana.set(false);
    fixture.detectChanges();

    // With banana gone, apple is the only item left - and it is checked.
    expect(selectAll.checked).toBe(true);
    expect(selectAll.indeterminate).toBe(false);
  });

  describe('forms integration', () => {
    it('writes the selection into a bound FormControl', () => {
      @Component({
        imports: [AndesCheckbox, AndesCheckboxGroup, ReactiveFormsModule],
        template: `<andes-checkbox-group [formControl]="control">
          <andes-checkbox value="apple">Apple</andes-checkbox>
          <andes-checkbox value="banana">Banana</andes-checkbox>
        </andes-checkbox-group>`,
      })
      class FormHost {
        readonly control = new FormControl<readonly string[]>([], {
          nonNullable: true,
        });
      }

      const fixture = TestBed.createComponent(FormHost);
      fixture.detectChanges();
      const apple = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;

      apple.checked = true;
      apple.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.control.value).toEqual(['apple']);
    });

    it('renders a value pushed in through the FormControl', () => {
      @Component({
        imports: [AndesCheckbox, AndesCheckboxGroup, ReactiveFormsModule],
        template: `<andes-checkbox-group [formControl]="control">
          <andes-checkbox value="apple">Apple</andes-checkbox>
          <andes-checkbox value="banana">Banana</andes-checkbox>
        </andes-checkbox-group>`,
      })
      class FormHost {
        readonly control = new FormControl<readonly string[]>([], {
          nonNullable: true,
        });
      }

      const fixture = TestBed.createComponent(FormHost);
      fixture.detectChanges();
      fixture.componentInstance.control.setValue(['banana']);
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const inputs = Array.from(
        host.querySelectorAll<HTMLInputElement>('input'),
      );

      expect(inputs.map((input) => input.checked)).toEqual([false, true]);
    });

    it('disables the group through setDisabledState', () => {
      @Component({
        imports: [AndesCheckbox, AndesCheckboxGroup, ReactiveFormsModule],
        template: `<andes-checkbox-group [formControl]="control">
          <andes-checkbox value="apple">Apple</andes-checkbox>
        </andes-checkbox-group>`,
      })
      class FormHost {
        readonly control = new FormControl<readonly string[]>([], {
          nonNullable: true,
        });
      }

      const fixture = TestBed.createComponent(FormHost);
      fixture.detectChanges();
      fixture.componentInstance.control.disable();
      fixture.detectChanges();

      const apple = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;

      expect(apple.disabled).toBe(true);
    });
  });

  it('leaves a standalone checkbox outside any group untouched', () => {
    @Component({
      imports: [AndesCheckbox],
      template: `<andes-checkbox value="apple" [(checked)]="checked"
        >Apple</andes-checkbox
      >`,
    })
    class StandaloneHost {
      readonly checked = signal(false);
    }

    const fixture = TestBed.createComponent(StandaloneHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;

    input.checked = true;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    // A `value` on its own must not change anything: group participation comes from being
    // placed inside a group, never from carrying a value.
    expect(fixture.componentInstance.checked()).toBe(true);
    expect(input.checked).toBe(true);
  });

  describe('orientation', () => {
    it('lays items out vertically by default and horizontally on request', () => {
      @Component({
        imports: [AndesCheckbox, AndesCheckboxGroup],
        template: `<andes-checkbox-group [orientation]="orientation()">
          <andes-checkbox value="a">A</andes-checkbox>
        </andes-checkbox-group>`,
      })
      class OrientationHost {
        readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
      }

      const fixture = TestBed.createComponent(OrientationHost);
      fixture.detectChanges();
      const group = fixture.nativeElement.querySelector(
        'andes-checkbox-group',
      ) as HTMLElement;
      expect(group.classList).toContain('andes-checkbox-group--vertical');
      expect(group.getAttribute('data-orientation')).toBe('vertical');

      fixture.componentInstance.orientation.set('horizontal');
      fixture.detectChanges();
      expect(group.classList).toContain('andes-checkbox-group--horizontal');
      expect(group.classList).not.toContain('andes-checkbox-group--vertical');
      expect(group.getAttribute('data-orientation')).toBe('horizontal');
    });
  });

  describe('changed output (user-change event)', () => {
    @Component({
      imports: [AndesCheckbox, AndesCheckboxGroup, AndesCheckboxSelectAll],
      template: `<andes-checkbox-group
        [(value)]="value"
        (changed)="changes.push($event)"
      >
        <andes-checkbox andesSelectAll>All</andes-checkbox>
        <andes-checkbox value="apple">Apple</andes-checkbox>
        <andes-checkbox value="banana">Banana</andes-checkbox>
      </andes-checkbox-group>`,
    })
    class ChangeHost {
      readonly value = signal<readonly string[]>([]);
      readonly changes: (readonly string[])[] = [];
    }

    function setup() {
      const fixture = TestBed.createComponent(ChangeHost);
      fixture.detectChanges();
      const [selectAll, apple, banana] = Array.from(
        (
          fixture.nativeElement as HTMLElement
        ).querySelectorAll<HTMLInputElement>('input'),
      );
      return { fixture, selectAll, apple, banana };
    }

    it('emits the selected values array on each user change', () => {
      const { fixture, apple, selectAll } = setup();

      apple.click();
      fixture.detectChanges();
      selectAll.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.changes).toEqual([
        ['apple'],
        ['apple', 'banana'],
      ]);
    });

    it('does not emit for a programmatic value write', () => {
      const { fixture, banana } = setup();

      fixture.componentInstance.value.set(['banana']);
      fixture.detectChanges();

      expect(banana.checked).toBe(true);
      expect(fixture.componentInstance.changes).toEqual([]);
    });
  });

  describe('name', () => {
    it("propagates to every item's native input, letting an item's own name win", () => {
      @Component({
        imports: [AndesCheckbox, AndesCheckboxGroup, AndesCheckboxSelectAll],
        template: `<andes-checkbox-group [name]="name()">
          <andes-checkbox andesSelectAll>All</andes-checkbox>
          <andes-checkbox value="apple">Apple</andes-checkbox>
          <andes-checkbox value="banana" name="own">Banana</andes-checkbox>
        </andes-checkbox-group>`,
      })
      class NameHost {
        readonly name = signal<string | undefined>('fruits');
      }

      const fixture = TestBed.createComponent(NameHost);
      fixture.detectChanges();
      const [selectAll, apple, banana] = Array.from(
        (
          fixture.nativeElement as HTMLElement
        ).querySelectorAll<HTMLInputElement>('input'),
      );

      // Select-all submits nothing, so it gets no name.
      expect(selectAll.hasAttribute('name')).toBe(false);
      expect(apple.getAttribute('name')).toBe('fruits');
      expect(banana.getAttribute('name')).toBe('own');

      fixture.componentInstance.name.set(undefined);
      fixture.detectChanges();
      expect(apple.hasAttribute('name')).toBe(false);
    });
  });

  describe('options', () => {
    @Component({
      imports: [AndesCheckboxGroup, AndesCheckbox, AndesCheckboxSelectAll],
      template: `<andes-checkbox-group
        [options]="options()"
        [(value)]="value"
        name="fruits"
      >
        @if (withSelectAll()) {
          <andes-checkbox andesSelectAll>All</andes-checkbox>
        }
      </andes-checkbox-group>`,
    })
    class OptionsHost {
      readonly options = signal<readonly (string | AndesCheckboxOption)[]>([
        'apple',
        { label: 'Banana', value: 'banana', disabled: true, title: 'Sold out' },
        { label: 'Cherry', value: 'cherry' },
      ]);
      readonly value = signal<readonly string[]>([]);
      readonly withSelectAll = signal(false);
    }

    function setup(withSelectAll = false) {
      const fixture = TestBed.createComponent(OptionsHost);
      fixture.componentInstance.withSelectAll.set(withSelectAll);
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      const inputs = () =>
        Array.from(host.querySelectorAll<HTMLInputElement>('input'));
      const labels = () =>
        Array.from(host.querySelectorAll('.andes-checkbox__label')).map(
          (label) => label.textContent?.trim(),
        );
      return { fixture, host, inputs, labels };
    }

    it('renders one checkbox per option, accepting strings and objects', () => {
      const { inputs, labels, host } = setup();

      expect(labels()).toEqual(['apple', 'Banana', 'Cherry']);
      expect(inputs().map((input) => input.value)).toEqual([
        'apple',
        'banana',
        'cherry',
      ]);
      expect(inputs().map((input) => input.disabled)).toEqual([
        false,
        true,
        false,
      ]);
      expect(inputs().map((input) => input.getAttribute('name'))).toEqual([
        'fruits',
        'fruits',
        'fruits',
      ]);
      expect(
        host.querySelectorAll('andes-checkbox')[1].getAttribute('title'),
      ).toBe('Sold out');
    });

    it('keeps the rendered options in two-way sync with value', () => {
      const { fixture, inputs } = setup();

      inputs()[2].click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toEqual(['cherry']);

      fixture.componentInstance.value.set(['apple', 'cherry']);
      fixture.detectChanges();
      expect(inputs().map((input) => input.checked)).toEqual([
        true,
        false,
        true,
      ]);
    });

    it('re-renders when the options change, dropping removed values from the aggregate', () => {
      const { fixture, inputs } = setup(true);
      fixture.componentInstance.value.set(['apple']);
      fixture.detectChanges();
      expect(inputs()[0].indeterminate).toBe(true);

      fixture.componentInstance.options.set(['apple']);
      fixture.detectChanges();

      expect(inputs()).toHaveLength(2);
      expect(inputs()[0].checked).toBe(true);
      expect(inputs()[0].indeterminate).toBe(false);
    });

    it('drives a projected select-all, which renders above the options and skips disabled ones', () => {
      const { fixture, inputs, labels } = setup(true);
      expect(labels()[0]).toBe('All');

      inputs()[0].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.value()).toEqual(['apple', 'cherry']);
      expect(inputs()[0].checked).toBe(true);
    });

    it('renders a custom label template with the option and its index', () => {
      @Component({
        imports: [AndesCheckboxGroup, AndesCheckboxOptionLabel],
        template: `<andes-checkbox-group [options]="options">
          <ng-template andesCheckboxOptionLabel let-option let-i="index">
            <b class="custom">{{ i }}:{{ option.label }}</b>
          </ng-template>
        </andes-checkbox-group>`,
      })
      class TemplateHost {
        readonly options = ['Apple', { label: 'Banana', value: 'b' }];
      }

      const fixture = TestBed.createComponent(TemplateHost);
      fixture.detectChanges();
      const custom = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '.andes-checkbox__label .custom',
        ),
      ).map((el) => el.textContent);

      expect(custom).toEqual(['0:Apple', '1:Banana']);
    });
  });

  describe('skipGroup', () => {
    @Component({
      imports: [AndesCheckbox, AndesCheckboxGroup, AndesCheckboxSelectAll],
      template: `<andes-checkbox-group
        [(value)]="value"
        name="fruits"
        [disabled]="disabled()"
      >
        <andes-checkbox andesSelectAll>All</andes-checkbox>
        <andes-checkbox value="apple">Apple</andes-checkbox>
        <andes-checkbox value="notify" [skipGroup]="skip()" [(checked)]="notify"
          >Notify me</andes-checkbox
        >
      </andes-checkbox-group>`,
    })
    class SkipHost {
      readonly value = signal<readonly string[]>([]);
      readonly notify = signal(false);
      readonly skip = signal(true);
      readonly disabled = signal(false);
    }

    function setup() {
      const fixture = TestBed.createComponent(SkipHost);
      fixture.detectChanges();
      const [selectAll, apple, notify] = Array.from(
        (
          fixture.nativeElement as HTMLElement
        ).querySelectorAll<HTMLInputElement>('input'),
      );
      return { fixture, selectAll, apple, notify };
    }

    it("keeps its own checked state and stays out of the group's value", () => {
      const { fixture, notify } = setup();

      notify.click();
      fixture.detectChanges();

      expect(notify.checked).toBe(true);
      expect(fixture.componentInstance.notify()).toBe(true);
      expect(fixture.componentInstance.value()).toEqual([]);
      expect(notify.hasAttribute('name')).toBe(false);
    });

    it('is ignored by select-all and the aggregate', () => {
      const { fixture, selectAll, apple, notify } = setup();

      apple.click();
      fixture.detectChanges();
      // Apple is the only real item, so the group is fully selected despite notify being off.
      expect(selectAll.checked).toBe(true);
      expect(selectAll.indeterminate).toBe(false);

      selectAll.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toEqual([]);
      expect(notify.checked).toBe(false);
    });

    it('is still disabled by a disabled group', () => {
      const { fixture, notify } = setup();

      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      expect(notify.disabled).toBe(true);
    });

    it('rejoins the group when skipGroup is cleared at runtime', () => {
      const { fixture, notify } = setup();

      fixture.componentInstance.skip.set(false);
      fixture.detectChanges();
      notify.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.value()).toEqual(['notify']);
      expect(notify.getAttribute('name')).toBe('fruits');
    });
  });
});
