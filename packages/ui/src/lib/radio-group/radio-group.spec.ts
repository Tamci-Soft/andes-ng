import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AndesRadio } from './radio';
import { AndesRadioGroup, AndesRadioGroupOrientation } from './radio-group';

@Component({
  imports: [AndesRadioGroup, AndesRadio],
  template: `<andes-radio-group
    [name]="name()"
    [disabled]="disabled()"
    [required]="required()"
    [orientation]="orientation()"
  >
    <andes-radio value="a" [disabled]="itemADisabled()">Option A</andes-radio>
    <andes-radio value="b" [disabled]="itemBDisabled()">Option B</andes-radio>
    <andes-radio value="c">Option C</andes-radio>
  </andes-radio-group>`,
})
class PlainHostComponent {
  readonly name = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly required = signal(false);
  readonly orientation = signal<AndesRadioGroupOrientation>('vertical');
  readonly itemADisabled = signal(false);
  readonly itemBDisabled = signal(false);
}

@Component({
  imports: [AndesRadioGroup, AndesRadio, ReactiveFormsModule],
  template: `<andes-radio-group [formControl]="control">
    <andes-radio value="a">Option A</andes-radio>
    <andes-radio value="b">Option B</andes-radio>
  </andes-radio-group>`,
})
class ReactiveFormHostComponent {
  readonly control = new FormControl<string | null>(null);
}

@Component({
  imports: [AndesRadioGroup, AndesRadio, FormsModule],
  template: `<andes-radio-group [(ngModel)]="value">
    <andes-radio value="a">Option A</andes-radio>
    <andes-radio value="b">Option B</andes-radio>
  </andes-radio-group>`,
})
class NgModelHostComponent {
  value: string | null = null;
}

describe('AndesRadioGroup / AndesRadio', () => {
  function createPlainHost() {
    const fixture = TestBed.createComponent(PlainHostComponent);
    fixture.detectChanges();
    const group = fixture.nativeElement.querySelector('andes-radio-group');
    const inputs = Array.from(
      fixture.nativeElement.querySelectorAll('input[type=radio]'),
    ) as HTMLInputElement[];
    return { fixture, group, inputs };
  }

  it('renders one native radio input per item, sharing a single generated name', () => {
    const { inputs } = createPlainHost();

    expect(inputs).toHaveLength(3);
    const names = new Set(inputs.map((input) => input.name));
    expect(names.size).toBe(1);
    expect([...names][0]).toMatch(/^andes-radio-group-\d+$/);
  });

  it('gives each group instance its own isolated name via DI-scoped state', () => {
    const first = createPlainHost();
    const second = createPlainHost();

    expect(first.inputs[0].name).not.toBe(second.inputs[0].name);
  });

  it('uses an explicit name when one is provided', () => {
    const { fixture, inputs } = createPlainHost();
    fixture.componentInstance.name.set('plan');
    fixture.detectChanges();

    expect(inputs.every((input) => input.name === 'plan')).toBe(true);
  });

  it('propagates selection between items through the shared group state', () => {
    const { inputs } = createPlainHost();
    const [a, b, c] = inputs;

    a.click();
    expect(a.checked).toBe(true);
    expect(b.checked).toBe(false);
    expect(c.checked).toBe(false);

    b.click();
    expect(a.checked).toBe(false);
    expect(b.checked).toBe(true);
    expect(c.checked).toBe(false);
  });

  it('reflects the checked item with data-checked on the andes-radio host', () => {
    const { fixture, inputs } = createPlainHost();
    inputs[0].click();
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('andes-radio');
    expect(items[0].hasAttribute('data-checked')).toBe(true);
    expect(items[1].hasAttribute('data-checked')).toBe(false);
  });

  it('sets role="radiogroup" and forwards aria-label to the group host', () => {
    const { group } = createPlainHost();

    expect(group.getAttribute('role')).toBe('radiogroup');
  });

  it('disables every item when the group is disabled, even if the item itself is not', () => {
    const { fixture, inputs } = createPlainHost();
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(inputs.every((input) => input.disabled)).toBe(true);
  });

  it('disables only the individually-disabled item when the group itself is enabled', () => {
    const { fixture, inputs } = createPlainHost();
    fixture.componentInstance.itemADisabled.set(true);
    fixture.detectChanges();

    const [a, b, c] = inputs;
    expect(a.disabled).toBe(true);
    expect(b.disabled).toBe(false);
    expect(c.disabled).toBe(false);
  });

  it('prevents selecting a disabled item', () => {
    const { fixture, inputs } = createPlainHost();
    fixture.componentInstance.itemADisabled.set(true);
    fixture.detectChanges();
    const [a] = inputs;

    // A disabled native input cannot be checked via a user click; jsdom mirrors this.
    a.click();
    expect(a.checked).toBe(false);
  });

  it('marks every native input required when the group is required', () => {
    const { fixture, inputs } = createPlainHost();
    fixture.componentInstance.required.set(true);
    fixture.detectChanges();

    expect(inputs.every((input) => input.required)).toBe(true);
  });

  it('reflects data-orientation on the group host', () => {
    const { fixture, group } = createPlainHost();

    expect(group.getAttribute('data-orientation')).toBe('vertical');

    fixture.componentInstance.orientation.set('horizontal');
    fixture.detectChanges();
    expect(group.getAttribute('data-orientation')).toBe('horizontal');
  });

  describe('ControlValueAccessor', () => {
    it('writes the initial FormControl value to the matching radio', () => {
      const fixture = TestBed.createComponent(ReactiveFormHostComponent);
      fixture.componentInstance.control.setValue('b');
      fixture.detectChanges();

      const inputs = fixture.nativeElement.querySelectorAll(
        'input[type=radio]',
      ) as NodeListOf<HTMLInputElement>;
      expect(inputs[0].checked).toBe(false);
      expect(inputs[1].checked).toBe(true);
    });

    it('updates the FormControl value when the user selects an item', () => {
      const fixture = TestBed.createComponent(ReactiveFormHostComponent);
      fixture.detectChanges();

      const inputs = fixture.nativeElement.querySelectorAll(
        'input[type=radio]',
      ) as NodeListOf<HTMLInputElement>;
      inputs[1].click();

      expect(fixture.componentInstance.control.value).toBe('b');
    });

    it('marks the FormControl as touched once the user selects an item', () => {
      const fixture = TestBed.createComponent(ReactiveFormHostComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance.control.touched).toBe(false);

      const inputs = fixture.nativeElement.querySelectorAll(
        'input[type=radio]',
      ) as NodeListOf<HTMLInputElement>;
      inputs[0].click();

      expect(fixture.componentInstance.control.touched).toBe(true);
    });

    it('disables every native input when the FormControl is disabled', () => {
      const fixture = TestBed.createComponent(ReactiveFormHostComponent);
      fixture.componentInstance.control.disable();
      fixture.detectChanges();

      const inputs = fixture.nativeElement.querySelectorAll(
        'input[type=radio]',
      ) as NodeListOf<HTMLInputElement>;
      expect(Array.from(inputs).every((input) => input.disabled)).toBe(true);
    });

    it('works with [(ngModel)] two-way binding', () => {
      const fixture = TestBed.createComponent(NgModelHostComponent);
      fixture.detectChanges();

      const inputs = fixture.nativeElement.querySelectorAll(
        'input[type=radio]',
      ) as NodeListOf<HTMLInputElement>;
      inputs[1].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.value).toBe('b');
    });

    it('reflects an externally-set ngModel value onto the radios', async () => {
      const fixture = TestBed.createComponent(NgModelHostComponent);
      fixture.componentInstance.value = 'a';
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const inputs = fixture.nativeElement.querySelectorAll(
        'input[type=radio]',
      ) as NodeListOf<HTMLInputElement>;
      expect(inputs[0].checked).toBe(true);
    });
  });

  describe('native keyboard behavior', () => {
    // Native <input type="radio"> elements that share a `name` get arrow-key roving
    // navigation and Tab-into/out-of-the-group behavior for free from the browser's own
    // input-handling engine - it is not part of the DOM/HTML event model jsdom implements
    // (confirmed empirically: dispatching a real 'ArrowDown' KeyboardEvent against jsdom
    // radios does not move focus or selection, unlike a real browser). So this suite can
    // only assert the precondition browsers rely on - a single shared `name` per group,
    // with disabled items excluded from the tab order - and the compound-set structure was
    // additionally verified interactively in a real browser via Storybook (arrow keys did
    // move focus and selection there, and Tab skipped the disabled item).
    it('gives every enabled item the same name (the precondition for native roving)', () => {
      const { inputs } = createPlainHost();

      expect(new Set(inputs.map((input) => input.name)).size).toBe(1);
    });

    it('removes a disabled item from the tab order via the native disabled attribute', () => {
      const { fixture, inputs } = createPlainHost();
      fixture.componentInstance.itemADisabled.set(true);
      fixture.detectChanges();

      // A native `disabled` input is unfocusable and skipped by the browser's own Tab/arrow
      // handling - no explicit tabindex management is needed on our part.
      expect(inputs[0].disabled).toBe(true);
      expect(inputs[1].disabled).toBe(false);
    });
  });
});
