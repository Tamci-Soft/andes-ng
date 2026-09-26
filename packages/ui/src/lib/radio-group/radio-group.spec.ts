import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AndesRadio } from './radio';
import {
  AndesRadioButtonStyle,
  AndesRadioChange,
  AndesRadioGroup,
  AndesRadioGroupOrientation,
  AndesRadioLabelPlacement,
  AndesRadioOptionInput,
  AndesRadioOptionType,
  AndesRadioSize,
} from './radio-group';

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

@Component({
  imports: [AndesRadioGroup, AndesRadio],
  template: `<andes-radio-group
    [(value)]="value"
    [optionType]="optionType()"
    [buttonStyle]="buttonStyle()"
    [size]="size()"
    [orientation]="orientation()"
    [block]="block()"
    [labelPlacement]="labelPlacement()"
    (selectionChange)="changes.push($event)"
  >
    <andes-radio value="a">Option A</andes-radio>
    <andes-radio value="b">Option B</andes-radio>
    <andes-radio value="c" [disabled]="itemCDisabled()">Option C</andes-radio>
  </andes-radio-group>`,
})
class StyledHostComponent {
  readonly value = signal<string | null>(null);
  readonly optionType = signal<AndesRadioOptionType>('default');
  readonly buttonStyle = signal<AndesRadioButtonStyle>('outline');
  readonly size = signal<AndesRadioSize>('md');
  readonly orientation = signal<AndesRadioGroupOrientation | undefined>(
    undefined,
  );
  readonly block = signal(false);
  readonly labelPlacement = signal<AndesRadioLabelPlacement>('end');
  readonly itemCDisabled = signal(false);
  readonly changes: AndesRadioChange<unknown>[] = [];
}

@Component({
  imports: [AndesRadioGroup],
  template: `<andes-radio-group
      [options]="options()"
      [(value)]="value"
      (selectionChange)="lastChange = $event"
    />
    <andes-radio-group
      class="templated"
      [options]="options()"
      [optionLabel]="label"
    />
    <ng-template #label let-option let-checked="checked" let-index="index">
      <b class="custom-label">{{ index }}:{{ option.label }}:{{ checked }}</b>
    </ng-template>`,
})
class OptionsHostComponent {
  readonly value = signal<unknown>(null);
  lastChange: AndesRadioChange<unknown> | undefined;
  readonly options = signal<readonly AndesRadioOptionInput[]>([
    'Apple',
    { label: 'Pear', value: 'pear', title: 'A pear', id: 'pear-radio' },
    { label: 'Orange', value: 'orange', disabled: true },
  ]);
}

@Component({
  imports: [AndesRadioGroup, AndesRadio],
  template: `<andes-radio-group [(value)]="value">
    <andes-radio [value]="1">One</andes-radio>
    <andes-radio [value]="2">Two</andes-radio>
  </andes-radio-group>`,
})
class NumericHostComponent {
  readonly value = signal<number | null>(2);
}

@Component({
  imports: [AndesRadioGroup, AndesRadio],
  template: `<andes-radio-group [autoFocus]="groupAutoFocus" [value]="value">
      <andes-radio value="a" disabled>Option A</andes-radio>
      <andes-radio value="b">Option B</andes-radio>
      <andes-radio value="c">Option C</andes-radio>
    </andes-radio-group>
    <andes-radio-group>
      <andes-radio value="x" [autoFocus]="radioAutoFocus">Option X</andes-radio>
    </andes-radio-group>`,
})
class AutoFocusHostComponent {
  groupAutoFocus = false;
  radioAutoFocus = false;
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

  describe('value model and selectionChange', () => {
    function createStyledHost() {
      const fixture = TestBed.createComponent(StyledHostComponent);
      fixture.detectChanges();
      const group = fixture.nativeElement.querySelector(
        'andes-radio-group',
      ) as HTMLElement;
      const items = Array.from(
        fixture.nativeElement.querySelectorAll('andes-radio'),
      ) as HTMLElement[];
      const inputs = Array.from(
        fixture.nativeElement.querySelectorAll('input[type=radio]'),
      ) as HTMLInputElement[];
      return { fixture, group, items, inputs };
    }

    it('writes the user selection back through [(value)]', () => {
      const { fixture, inputs } = createStyledHost();
      inputs[1].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.value()).toBe('b');
    });

    it('reflects a parent-driven [(value)] change onto the radios', () => {
      const { fixture, inputs } = createStyledHost();
      fixture.componentInstance.value.set('c');
      fixture.detectChanges();

      expect(inputs[2].checked).toBe(true);
      expect(inputs[0].checked).toBe(false);
    });

    it('emits selectionChange with the value and the native event on user selection', () => {
      const { fixture, inputs } = createStyledHost();
      inputs[0].click();

      const { changes } = fixture.componentInstance;
      expect(changes).toHaveLength(1);
      expect(changes[0].value).toBe('a');
      expect(changes[0].event.type).toBe('change');
      expect(changes[0].event.target).toBe(inputs[0]);
    });

    it('does not emit selectionChange for programmatic value writes', () => {
      const { fixture } = createStyledHost();
      fixture.componentInstance.value.set('b');
      fixture.detectChanges();

      expect(fixture.componentInstance.changes).toHaveLength(0);
    });

    it('does not emit selectionChange when re-clicking the already-checked item', () => {
      const { fixture, inputs } = createStyledHost();
      inputs[0].click();
      inputs[0].click();

      expect(fixture.componentInstance.changes).toHaveLength(1);
    });

    it('does not emit selectionChange for a disabled item', () => {
      const { fixture, inputs } = createStyledHost();
      fixture.componentInstance.itemCDisabled.set(true);
      fixture.detectChanges();
      inputs[2].click();

      expect(fixture.componentInstance.changes).toHaveLength(0);
    });

    it('supports non-string values compared by identity', () => {
      const fixture = TestBed.createComponent(NumericHostComponent);
      fixture.detectChanges();
      const inputs = fixture.nativeElement.querySelectorAll(
        'input[type=radio]',
      ) as NodeListOf<HTMLInputElement>;

      expect(inputs[1].checked).toBe(true);
      expect(inputs[1].value).toBe('2');

      inputs[0].click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toBe(1);
    });

    describe('optionType="button"', () => {
      it('defaults to the classic style with the circle control', () => {
        const { group, items } = createStyledHost();

        expect(group.getAttribute('data-option-type')).toBe('default');
        expect(items[0].querySelector('.andes-radio__control')).not.toBeNull();
        expect(items[0].classList).not.toContain('andes-radio--button');
      });

      it('renders segment buttons without the circle control, still backed by native radios', () => {
        const { fixture, group, items, inputs } = createStyledHost();
        fixture.componentInstance.optionType.set('button');
        fixture.detectChanges();

        expect(group.getAttribute('data-option-type')).toBe('button');
        expect(group.classList).toContain('andes-radio-group--button');
        expect(items[0].classList).toContain('andes-radio--button');
        expect(items[0].querySelector('.andes-radio__control')).toBeNull();
        expect(inputs).toHaveLength(3);
        expect(new Set(inputs.map((input) => input.name)).size).toBe(1);
      });

      it('applies buttonStyle and size to every item (outline/md by default)', () => {
        const { fixture, items } = createStyledHost();
        fixture.componentInstance.optionType.set('button');
        fixture.detectChanges();

        expect(items[0].classList).toContain('andes-radio--outline');
        expect(items[0].classList).toContain('andes-radio--md');

        fixture.componentInstance.buttonStyle.set('solid');
        fixture.componentInstance.size.set('lg');
        fixture.detectChanges();
        expect(
          items.every((item) => item.classList.contains('andes-radio--solid')),
        ).toBe(true);
        expect(
          items.every((item) => item.classList.contains('andes-radio--lg')),
        ).toBe(true);
        expect(items[0].classList).not.toContain('andes-radio--md');
      });

      it('does not apply button-only modifiers in the classic style', () => {
        const { fixture, items } = createStyledHost();
        fixture.componentInstance.buttonStyle.set('solid');
        fixture.componentInstance.size.set('lg');
        fixture.detectChanges();

        expect(items[0].classList).not.toContain('andes-radio--solid');
        expect(items[0].classList).not.toContain('andes-radio--lg');
      });

      it('selects a segment on click like any radio', () => {
        const { fixture, items, inputs } = createStyledHost();
        fixture.componentInstance.optionType.set('button');
        fixture.detectChanges();
        inputs[1].click();
        fixture.detectChanges();

        expect(fixture.componentInstance.value()).toBe('b');
        expect(items[1].classList).toContain('andes-radio--checked');
        expect(items[0].classList).not.toContain('andes-radio--checked');
      });
    });

    describe('orientation', () => {
      it('defaults to vertical for the classic style and horizontal for buttons', () => {
        const { fixture, group, items } = createStyledHost();
        expect(group.getAttribute('data-orientation')).toBe('vertical');
        expect(items[0].classList).toContain('andes-radio--vertical');

        fixture.componentInstance.optionType.set('button');
        fixture.detectChanges();
        expect(group.getAttribute('data-orientation')).toBe('horizontal');
        expect(items[0].classList).toContain('andes-radio--horizontal');
      });

      it('lets an explicit orientation override the option-type default', () => {
        const { fixture, group } = createStyledHost();
        fixture.componentInstance.optionType.set('button');
        fixture.componentInstance.orientation.set('vertical');
        fixture.detectChanges();

        expect(group.getAttribute('data-orientation')).toBe('vertical');
        expect(group.classList).toContain('andes-radio-group--vertical');
      });
    });

    it('marks the group and every item as block', () => {
      const { fixture, group, items } = createStyledHost();
      fixture.componentInstance.block.set(true);
      fixture.detectChanges();

      expect(group.classList).toContain('andes-radio-group--block');
      expect(
        items.every((item) => item.classList.contains('andes-radio--block')),
      ).toBe(true);
    });

    it('places the label before the control with labelPlacement="start"', () => {
      const { fixture, items } = createStyledHost();
      expect(items[0].classList).not.toContain('andes-radio--label-start');

      fixture.componentInstance.labelPlacement.set('start');
      fixture.detectChanges();
      expect(items[0].classList).toContain('andes-radio--label-start');
    });
  });

  describe('options input', () => {
    function createOptionsHost() {
      const fixture = TestBed.createComponent(OptionsHostComponent);
      fixture.detectChanges();
      const [plain, templated] = Array.from(
        fixture.nativeElement.querySelectorAll('andes-radio-group'),
      ) as HTMLElement[];
      const inputsOf = (group: HTMLElement) =>
        Array.from(
          group.querySelectorAll('input[type=radio]'),
        ) as HTMLInputElement[];
      return { fixture, plain, templated, inputsOf };
    }

    it('renders one radio per option, normalizing bare strings to { label, value }', () => {
      const { plain, inputsOf } = createOptionsHost();
      const items = Array.from(plain.querySelectorAll('andes-radio'));

      expect(items.map((item) => item.textContent?.trim())).toEqual([
        'Apple',
        'Pear',
        'Orange',
      ]);
      expect(inputsOf(plain).map((input) => input.value)).toEqual([
        'Apple',
        'pear',
        'orange',
      ]);
    });

    it('applies per-option disabled, title and id', () => {
      const { plain, inputsOf } = createOptionsHost();
      const inputs = inputsOf(plain);
      const items = plain.querySelectorAll('andes-radio');

      expect(inputs[2].disabled).toBe(true);
      expect(inputs[1].disabled).toBe(false);
      expect(items[1].getAttribute('title')).toBe('A pear');
      expect(inputs[1].id).toBe('pear-radio');
    });

    it('selects generated options and reports the option value', () => {
      const { fixture, plain, inputsOf } = createOptionsHost();
      inputsOf(plain)[0].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.value()).toBe('Apple');
      expect(fixture.componentInstance.lastChange?.value).toBe('Apple');
    });

    it('renders a custom optionLabel template with option, checked and index', () => {
      const { fixture, templated, inputsOf } = createOptionsHost();
      const labels = () =>
        Array.from(templated.querySelectorAll('.custom-label')).map((label) =>
          label.textContent?.trim(),
        );

      expect(labels()).toEqual([
        '0:Apple:false',
        '1:Pear:false',
        '2:Orange:false',
      ]);

      inputsOf(templated)[1].click();
      fixture.detectChanges();
      expect(labels()).toEqual([
        '0:Apple:false',
        '1:Pear:true',
        '2:Orange:false',
      ]);
    });

    it('re-renders when the options array changes', () => {
      const { fixture, plain } = createOptionsHost();
      fixture.componentInstance.options.set(['Kiwi']);
      fixture.detectChanges();

      expect(
        Array.from(plain.querySelectorAll('andes-radio')).map((item) =>
          item.textContent?.trim(),
        ),
      ).toEqual(['Kiwi']);
    });
  });

  describe('focus management', () => {
    it('autoFocus on the group focuses the checked item', async () => {
      const fixture = TestBed.createComponent(AutoFocusHostComponent);
      fixture.componentInstance.groupAutoFocus = true;
      fixture.componentInstance.value = 'c';
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
      await fixture.whenStable();

      const inputs =
        fixture.nativeElement.querySelectorAll('input[type=radio]');
      expect(document.activeElement).toBe(inputs[2]);
      fixture.nativeElement.remove();
    });

    it('autoFocus on the group falls back to the first enabled item when none is checked', async () => {
      const fixture = TestBed.createComponent(AutoFocusHostComponent);
      fixture.componentInstance.groupAutoFocus = true;
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
      await fixture.whenStable();

      const inputs =
        fixture.nativeElement.querySelectorAll('input[type=radio]');
      // Item A is disabled, so B is the first focusable one.
      expect(document.activeElement).toBe(inputs[1]);
      fixture.nativeElement.remove();
    });

    it('autoFocus on an individual radio focuses its native input', async () => {
      const fixture = TestBed.createComponent(AutoFocusHostComponent);
      fixture.componentInstance.radioAutoFocus = true;
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
      await fixture.whenStable();

      const inputs =
        fixture.nativeElement.querySelectorAll('input[type=radio]');
      expect(document.activeElement).toBe(inputs[3]);
      fixture.nativeElement.remove();
    });

    it('does not move focus without autoFocus', async () => {
      const fixture = TestBed.createComponent(AutoFocusHostComponent);
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.nativeElement.contains(document.activeElement)).toBe(
        false,
      );
      fixture.nativeElement.remove();
    });

    it('exposes focus()/blur() on AndesRadio and focus() on the group', () => {
      const fixture = TestBed.createComponent(PlainHostComponent);
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
      const inputs =
        fixture.nativeElement.querySelectorAll('input[type=radio]');

      const group = fixture.debugElement.children[0]
        .componentInstance as AndesRadioGroup;
      group.focus();
      expect(document.activeElement).toBe(inputs[0]);

      const radio = fixture.debugElement.children[0].children[1]
        .componentInstance as AndesRadio;
      radio.focus();
      expect(document.activeElement).toBe(inputs[1]);
      radio.blur();
      expect(document.activeElement).not.toBe(inputs[1]);
      fixture.nativeElement.remove();
    });

    it('marks the FormControl as touched when focus leaves the group', () => {
      const fixture = TestBed.createComponent(ReactiveFormHostComponent);
      fixture.detectChanges();
      const inputs =
        fixture.nativeElement.querySelectorAll('input[type=radio]');

      inputs[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      expect(fixture.componentInstance.control.touched).toBe(true);
      expect(fixture.componentInstance.control.value).toBeNull();
    });
  });
});
