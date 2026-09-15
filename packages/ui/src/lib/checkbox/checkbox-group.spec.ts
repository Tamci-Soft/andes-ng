import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AndesCheckbox } from './checkbox';
import { AndesCheckboxGroup } from './checkbox-group';
import { AndesCheckboxSelectAll } from './checkbox-select-all';

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
});
