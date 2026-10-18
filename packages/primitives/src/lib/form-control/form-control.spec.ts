import {
  booleanAttribute,
  Component,
  input,
  model,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  disabled,
  form,
  FormField,
  FormValueControl,
  required,
} from '@angular/forms/signals';
import { Subject } from 'rxjs';

import { AndesFormControlBase } from './form-control-base';
import { provideAndesValueAccessor } from './provide-value-accessor';
import { andesShallowArrayEquals, AndesValueAccessor } from './value-accessor';

/** A text field the way `AndesInput` / `AndesTextarea` will use the base class. */
@Component({
  selector: 'andes-text-harness',
  providers: [provideAndesValueAccessor(() => TextHarness)],
  template: `
    <input
      [value]="value()"
      [disabled]="isDisabled()"
      [attr.aria-invalid]="status.showError() ? 'true' : null"
      (input)="onInput($event)"
      (blur)="markTouched()"
    />
  `,
})
class TextHarness extends AndesFormControlBase<string> {
  protected emptyValue(): string {
    return '';
  }

  protected onInput(event: Event): void {
    this.commit((event.target as HTMLInputElement).value);
  }
}

/** A boolean control whose signal is `checked`, so it composes `AndesValueAccessor`. */
@Component({
  selector: 'andes-switch-harness',
  providers: [
    provideAndesValueAccessor(
      () => SwitchHarness,
      (self) => self.accessor,
    ),
  ],
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [disabled]="accessor.disabled()"
      (click)="accessor.commit(!checked())"
      (blur)="accessor.markTouched()"
    >
      toggle
    </button>
  `,
})
class SwitchHarness {
  readonly checked = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly accessor = new AndesValueAccessor<boolean>({
    value: this.checked,
    disabled: this.disabled,
    coerce: Boolean,
  });
}

/** An array value, as in a multi-select or a checkbox group. */
@Component({
  selector: 'andes-tags-harness',
  providers: [provideAndesValueAccessor(() => TagsHarness)],
  template: `
    @for (tag of value(); track tag) {
      <span class="tag">{{ tag }}</span>
    }
    <button type="button" class="add" (click)="add('x')">add</button>
    <button type="button" class="same" (click)="commit(copy())">same</button>
  `,
})
class TagsHarness extends AndesFormControlBase<readonly string[]> {
  protected emptyValue(): readonly string[] {
    return [];
  }

  protected override equals(
    previous: readonly string[],
    next: readonly string[],
  ): boolean {
    return andesShallowArrayEquals(previous, next);
  }

  protected add(tag: string): void {
    this.commit([...this.value(), tag]);
  }

  protected copy(): readonly string[] {
    return [...this.value()];
  }
}

interface Range {
  readonly min: number;
  readonly max: number;
}

/** An object value that normalizes what a form writes and tracks derived state. */
@Component({
  selector: 'andes-range-harness',
  providers: [provideAndesValueAccessor(() => RangeHarness)],
  template: `
    <button type="button" class="widen" (click)="widen()">widen</button>
    <output>{{ value().min }}-{{ value().max }}</output>
  `,
})
class RangeHarness extends AndesFormControlBase<Range> {
  readonly writes: Range[] = [];

  protected emptyValue(): Range {
    return { min: 0, max: 10 };
  }

  protected override coerce(raw: unknown): Range {
    const range = (raw ?? { min: 0, max: 10 }) as Range;
    return { min: Math.min(range.min, range.max), max: range.max };
  }

  protected override equals(previous: Range, next: Range): boolean {
    return previous.min === next.min && previous.max === next.max;
  }

  protected override onWritten(value: Range): void {
    this.writes.push(value);
  }

  protected widen(): void {
    this.commit({ min: this.value().min - 1, max: this.value().max + 1 });
  }
}

/** No accessor provider: bound only through signal forms' custom-control contract. */
@Component({
  selector: 'andes-native-harness',
  template: `
    <input
      [value]="value()"
      [disabled]="isDisabled()"
      (input)="commit($any($event.target).value)"
      (blur)="markTouched()"
    />
  `,
})
class NativeHarness extends AndesFormControlBase<string> {
  protected emptyValue(): string {
    return '';
  }
}

function typeInto(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event('input'));
}

function blur(element: HTMLElement): void {
  element.dispatchEvent(new Event('blur'));
}

describe('form-control harnesses', () => {
  describe('with reactive forms', () => {
    @Component({
      selector: 'andes-reactive-host',
      imports: [ReactiveFormsModule, TextHarness],
      template: `
        <andes-text-harness [formControl]="control()" [disabled]="locked()" />
      `,
    })
    class ReactiveHost {
      readonly locked = signal(false);
      readonly control = signal(new FormControl('start', Validators.required));
    }

    function setup() {
      const fixture = TestBed.createComponent(ReactiveHost);
      fixture.detectChanges();
      const harness = fixture.debugElement.children[0]
        .componentInstance as TextHarness;
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;
      return { fixture, harness, input, host: fixture.componentInstance };
    }

    it('shows the initial form value without marking the control dirty', () => {
      const { host, input } = setup();

      expect(input.value).toBe('start');
      expect(host.control().dirty).toBe(false);
      expect(host.control().touched).toBe(false);
    });

    it('reports a typed value to the form exactly once per change', () => {
      const { host, input } = setup();
      const emissions: unknown[] = [];
      host.control().valueChanges.subscribe((value) => emissions.push(value));

      typeInto(input, 'Ada');

      expect(host.control().value).toBe('Ada');
      expect(host.control().dirty).toBe(true);
      expect(emissions).toEqual(['Ada']);
    });

    it('does not notify the form when the user commits the value it already has', () => {
      const { host, input } = setup();
      const emissions: unknown[] = [];
      host.control().valueChanges.subscribe((value) => emissions.push(value));

      typeInto(input, 'start');

      expect(emissions).toEqual([]);
      expect(host.control().dirty).toBe(false);
    });

    it('writes setValue into the view without echoing it back', () => {
      const { fixture, host, input } = setup();
      const emissions: unknown[] = [];
      host.control().valueChanges.subscribe((value) => emissions.push(value));

      host.control().setValue('Grace');
      fixture.detectChanges();

      expect(input.value).toBe('Grace');
      // The control's own emission only: an echo through onChange would add a second one.
      expect(emissions).toEqual(['Grace']);
      expect(host.control().dirty).toBe(false);
    });

    it('does not echo a patchValue with emitEvent disabled', () => {
      const { host } = setup();
      const emissions: unknown[] = [];
      host.control().valueChanges.subscribe((value) => emissions.push(value));

      host.control().patchValue('quiet', { emitEvent: false });

      expect(emissions).toEqual([]);
    });

    it('marks the control touched on blur', () => {
      const { host, input } = setup();

      blur(input);

      expect(host.control().touched).toBe(true);
    });

    it('resets to the empty value and to a pristine state', () => {
      const { fixture, host, input } = setup();
      typeInto(input, 'Ada');
      blur(input);

      host.control().reset();
      fixture.detectChanges();

      expect(input.value).toBe('');
      expect(host.control().pristine).toBe(true);
      expect(host.control().untouched).toBe(true);
    });

    it('follows disable() and enable() on the control', () => {
      const { fixture, host, harness, input } = setup();

      host.control().disable();
      fixture.detectChanges();
      expect(input.disabled).toBe(true);
      expect(harness['isDisabled']()).toBe(true);

      host.control().enable();
      fixture.detectChanges();
      expect(input.disabled).toBe(false);
      expect(harness['isDisabled']()).toBe(false);
    });

    it('stays disabled while either the input or the form says so', () => {
      const { fixture, host, input } = setup();

      host.locked.set(true);
      fixture.detectChanges();
      expect(input.disabled).toBe(true);

      host.control().disable();
      host.locked.set(false);
      fixture.detectChanges();
      expect(input.disabled).toBe(true);

      host.control().enable();
      fixture.detectChanges();
      expect(input.disabled).toBe(false);
    });

    it('reads validity from the control and shows the error only after interaction', () => {
      const { fixture, host, harness, input } = setup();
      host.control().setValue('');
      fixture.detectChanges();

      expect(harness['status'].invalid()).toBe(true);
      expect(harness['status'].showError()).toBe(false);
      expect(input.hasAttribute('aria-invalid')).toBe(false);

      blur(input);
      fixture.detectChanges();

      expect(harness['status'].touched()).toBe(true);
      expect(harness['status'].showError()).toBe(true);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(harness['status'].errors()).toEqual({ required: true });

      typeInto(input, 'fixed');
      fixture.detectChanges();

      expect(harness['status'].invalid()).toBe(false);
      expect(harness['status'].valid()).toBe(true);
      expect(input.hasAttribute('aria-invalid')).toBe(false);
    });

    it('reports a pending async validation', () => {
      const { fixture, host, harness } = setup();
      const result = new Subject<null>();
      host.control().setAsyncValidators(() => result);
      host.control().updateValueAndValidity();
      fixture.detectChanges();

      expect(harness['status'].pending()).toBe(true);
      expect(harness['status'].valid()).toBe(false);

      result.next(null);
      result.complete();
      fixture.detectChanges();

      expect(harness['status'].pending()).toBe(false);
    });

    it('follows a [formControl] rebound to a different control', () => {
      const { fixture, host, harness, input } = setup();
      const other = new FormControl('other', Validators.required);
      other.markAsTouched();
      other.setValue('');

      host.control.set(other);
      fixture.detectChanges();

      expect(input.value).toBe('');
      expect(harness['status'].invalid()).toBe(true);
      expect(harness['status'].touched()).toBe(true);

      typeInto(input, 'now valid');
      expect(other.value).toBe('now valid');
      fixture.detectChanges();
      expect(harness['status'].invalid()).toBe(false);
    });
  });

  describe('with a form group and formControlName', () => {
    @Component({
      selector: 'andes-group-host',
      imports: [ReactiveFormsModule, TextHarness, SwitchHarness, TagsHarness],
      template: `
        <form [formGroup]="group">
          <andes-text-harness formControlName="name" />
          <andes-switch-harness formControlName="active" />
          <andes-tags-harness formControlName="tags" />
        </form>
      `,
    })
    class GroupHost {
      readonly group = new FormGroup({
        name: new FormControl('Ada', Validators.required),
        active: new FormControl(true),
        tags: new FormControl<string[]>(['a']),
      });
    }

    function setup() {
      const fixture = TestBed.createComponent(GroupHost);
      fixture.detectChanges();
      return { fixture, group: fixture.componentInstance.group };
    }

    it('resolves without a circular dependency and wires every control', () => {
      const { fixture } = setup();

      expect(
        (fixture.nativeElement.querySelector('input') as HTMLInputElement)
          .value,
      ).toBe('Ada');
      expect(
        fixture.nativeElement
          .querySelector('button[role="switch"]')
          .getAttribute('aria-checked'),
      ).toBe('true');
      expect(fixture.nativeElement.querySelectorAll('.tag').length).toBe(1);
    });

    it('resets the whole group in one pass without echoing any control', () => {
      const { fixture, group } = setup();
      const emissions: unknown[] = [];
      group.valueChanges.subscribe((value) => emissions.push(value));

      group.reset();
      fixture.detectChanges();

      expect(emissions.length).toBe(1);
      expect(group.value).toEqual({ name: null, active: null, tags: null });
      expect(fixture.nativeElement.querySelector('input').value).toBe('');
      expect(
        fixture.nativeElement
          .querySelector('button[role="switch"]')
          .getAttribute('aria-checked'),
      ).toBe('false');
      expect(fixture.nativeElement.querySelectorAll('.tag').length).toBe(0);
    });

    it('disables every control with the group', () => {
      const { fixture, group } = setup();

      group.disable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('input').disabled).toBe(true);
      expect(
        fixture.nativeElement.querySelector('button[role="switch"]').disabled,
      ).toBe(true);
    });
  });

  describe('with template-driven forms', () => {
    @Component({
      selector: 'andes-ng-model-host',
      imports: [FormsModule, TextHarness],
      template: `
        <andes-text-harness
          [ngModel]="name()"
          (ngModelChange)="name.set($event)"
          [disabled]="locked()"
          required
          #field="ngModel"
        />
        <p class="state">{{ field.invalid }}</p>
      `,
    })
    class NgModelHost {
      readonly name = signal<string | null>('Ada');
      readonly locked = signal(false);
    }

    async function setup() {
      const fixture = TestBed.createComponent(NgModelHost);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      return {
        fixture,
        host: fixture.componentInstance,
        input: fixture.nativeElement.querySelector('input') as HTMLInputElement,
      };
    }

    it('writes the model into the view', async () => {
      const { input } = await setup();

      expect(input.value).toBe('Ada');
    });

    it('pushes typed values back into the bound model', async () => {
      const { fixture, host, input } = await setup();

      typeInto(input, 'Grace');
      fixture.detectChanges();

      expect(host.name()).toBe('Grace');
    });

    it('applies a model change made by the page without writing it back', async () => {
      const { fixture, host, input } = await setup();

      host.name.set('Hopper');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(input.value).toBe('Hopper');
      expect(host.name()).toBe('Hopper');
    });

    it('flags touched on blur through the ng-touched class', async () => {
      const { fixture, input } = await setup();
      const host = fixture.nativeElement.querySelector(
        'andes-text-harness',
      ) as HTMLElement;
      expect(host.classList.contains('ng-untouched')).toBe(true);

      blur(input);
      fixture.detectChanges();

      expect(host.classList.contains('ng-touched')).toBe(true);
    });

    it('reflects validators set by directives on the element', async () => {
      const { fixture, input } = await setup();

      typeInto(input, '');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.state').textContent).toBe(
        'true',
      );
    });

    it('honours the disabled input next to ngModel', async () => {
      const { fixture, host, input } = await setup();

      host.locked.set(true);
      fixture.detectChanges();

      expect(input.disabled).toBe(true);
    });
  });

  describe('with signal forms', () => {
    @Component({
      selector: 'andes-signal-host',
      imports: [FormField, TextHarness, SwitchHarness, TagsHarness],
      template: `
        <andes-text-harness [formField]="f.name" />
        <andes-switch-harness [formField]="f.active" />
        <andes-tags-harness [formField]="f.tags" />
      `,
    })
    class SignalHost {
      readonly locked = signal(false);
      readonly model = signal({
        name: 'Ada',
        active: true,
        tags: ['a'] as string[],
      });
      readonly f = form(this.model, (path) => {
        required(path.name);
        disabled(path.active, () => this.locked());
      });
    }

    function setup() {
      const fixture = TestBed.createComponent(SignalHost);
      fixture.detectChanges();
      return {
        fixture,
        host: fixture.componentInstance,
        input: fixture.nativeElement.querySelector('input') as HTMLInputElement,
        toggle: fixture.nativeElement.querySelector(
          'button[role="switch"]',
        ) as HTMLButtonElement,
      };
    }

    it('shows the field values through the accessor', () => {
      const { input, toggle, fixture } = setup();

      expect(input.value).toBe('Ada');
      expect(toggle.getAttribute('aria-checked')).toBe('true');
      expect(fixture.nativeElement.querySelectorAll('.tag').length).toBe(1);
    });

    it('stores typed values in the form model', () => {
      const { fixture, host, input } = setup();

      typeInto(input, 'Grace');
      fixture.detectChanges();

      expect(host.model().name).toBe('Grace');
      expect(host.f.name().dirty()).toBe(true);
    });

    it('writes model changes into the view', () => {
      const { fixture, host, input } = setup();

      host.f.name().value.set('Hopper');
      fixture.detectChanges();

      expect(input.value).toBe('Hopper');
      expect(host.f.name().dirty()).toBe(false);
    });

    it('marks the field touched on blur', () => {
      const { host, input } = setup();
      expect(host.f.name().touched()).toBe(false);

      blur(input);

      expect(host.f.name().touched()).toBe(true);
    });

    it('follows the field disabled state', () => {
      const { fixture, host, toggle } = setup();
      expect(toggle.disabled).toBe(false);

      host.locked.set(true);
      fixture.detectChanges();
      expect(toggle.disabled).toBe(true);

      host.locked.set(false);
      fixture.detectChanges();
      expect(toggle.disabled).toBe(false);
    });

    it('commits array values once and ignores identical arrays', () => {
      const { fixture, host } = setup();
      const add = fixture.nativeElement.querySelector('.add') as HTMLElement;
      const same = fixture.nativeElement.querySelector('.same') as HTMLElement;

      same.click();
      fixture.detectChanges();
      expect(host.f.tags().dirty()).toBe(false);

      add.click();
      fixture.detectChanges();
      expect(host.model().tags).toEqual(['a', 'x']);
      expect(host.f.tags().dirty()).toBe(true);
    });

    it('reads validity from the field through the same status signals', () => {
      const { fixture, host, input } = setup();
      const harness = fixture.debugElement.children[0]
        .componentInstance as TextHarness;
      host.f.name().value.set('');
      fixture.detectChanges();

      expect(harness['status'].bound()).toBe(true);
      expect(harness['status'].invalid()).toBe(true);
      expect(harness['status'].showError()).toBe(false);

      blur(input);
      fixture.detectChanges();

      expect(harness['status'].showError()).toBe(true);
      expect(input.getAttribute('aria-invalid')).toBe('true');

      typeInto(input, 'ok');
      fixture.detectChanges();

      expect(harness['status'].invalid()).toBe(false);
      expect(input.hasAttribute('aria-invalid')).toBe(false);
    });
  });

  describe('with signal forms and no accessor provider', () => {
    @Component({
      selector: 'andes-native-host',
      imports: [FormField, NativeHarness],
      template: `<andes-native-harness [formField]="f.name" />`,
    })
    class NativeHost {
      readonly locked = signal(false);
      readonly model = signal({ name: 'Ada' });
      readonly f = form(this.model, (path) => {
        disabled(path.name, () => this.locked());
      });
    }

    function setup() {
      const fixture = TestBed.createComponent(NativeHost);
      fixture.detectChanges();
      return {
        fixture,
        host: fixture.componentInstance,
        input: fixture.nativeElement.querySelector('input') as HTMLInputElement,
      };
    }

    it('binds through the value model, disabled input and touch output', () => {
      const { fixture, host, input } = setup();
      expect(input.value).toBe('Ada');

      typeInto(input, 'Grace');
      expect(host.model().name).toBe('Grace');

      host.f.name().value.set('Hopper');
      fixture.detectChanges();
      expect(input.value).toBe('Hopper');

      blur(input);
      expect(host.f.name().touched()).toBe(true);

      host.locked.set(true);
      fixture.detectChanges();
      expect(input.disabled).toBe(true);
    });

    it('satisfies the custom-control contract of signal forms', () => {
      const contract: FormValueControl<string> = TestBed.runInInjectionContext(
        () => new NativeHarness(),
      );

      expect(contract.value).toBeDefined();
    });
  });

  describe('outside any form', () => {
    @Component({
      selector: 'andes-standalone-host',
      imports: [TextHarness, TagsHarness, RangeHarness],
      template: `
        <andes-text-harness [(value)]="text" />
        <andes-tags-harness />
        <andes-range-harness />
      `,
    })
    class StandaloneHost {
      text = 'hi';
    }

    let fixture: ComponentFixture<StandaloneHost>;

    beforeEach(() => {
      fixture = TestBed.createComponent(StandaloneHost);
      fixture.detectChanges();
    });

    it('works as a plain two-way bound component', () => {
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;
      expect(input.value).toBe('hi');

      typeInto(input, 'changed');
      fixture.detectChanges();

      expect(fixture.componentInstance.text).toBe('changed');
    });

    it('reports an unbound, valid status and tolerates touch events', () => {
      const harness = fixture.debugElement.children[0]
        .componentInstance as TextHarness;

      blur(fixture.nativeElement.querySelector('input'));

      expect(harness['status'].bound()).toBe(false);
      expect(harness['status'].invalid()).toBe(false);
      expect(harness['status'].showError()).toBe(false);
      expect(harness['status'].errors()).toBeNull();
    });

    it('emits the touch output for consumers that listen to it', () => {
      const harness = fixture.debugElement.children[0]
        .componentInstance as TextHarness;
      const touched = vi.fn();
      harness.touch.subscribe(touched);

      blur(fixture.nativeElement.querySelector('input'));

      expect(touched).toHaveBeenCalledTimes(1);
    });

    it('commits only real changes of an array value', () => {
      const tags = fixture.nativeElement.querySelectorAll('andes-tags-harness');
      const add = tags[0].querySelector('.add') as HTMLElement;
      const same = tags[0].querySelector('.same') as HTMLElement;
      const harness = fixture.debugElement.children[1]
        .componentInstance as TagsHarness;
      const changes: unknown[] = [];
      harness.value.subscribe((value) => changes.push(value));

      same.click();
      add.click();
      add.click();

      expect(changes).toEqual([['x'], ['x', 'x']]);
    });
  });

  describe('with an object value', () => {
    @Component({
      selector: 'andes-range-host',
      imports: [ReactiveFormsModule, RangeHarness],
      template: `<andes-range-harness [formControl]="control" />`,
    })
    class RangeHost {
      readonly control = new FormControl<Range>({ min: 2, max: 4 });
    }

    function setup() {
      const fixture = TestBed.createComponent(RangeHost);
      fixture.detectChanges();
      const harness = fixture.debugElement.children[0]
        .componentInstance as RangeHarness;
      return { fixture, harness, control: fixture.componentInstance.control };
    }

    it('coerces what the form writes and reports each write to the component', () => {
      const { fixture, harness, control } = setup();

      control.setValue({ min: 9, max: 5 });
      fixture.detectChanges();

      expect(harness.value()).toEqual({ min: 5, max: 5 });
      expect(harness.writes).toEqual([
        { min: 2, max: 4 },
        { min: 5, max: 5 },
      ]);
    });

    it('falls back to the coerced empty value on reset', () => {
      const { harness, control } = setup();

      control.reset();

      expect(harness.value()).toEqual({ min: 0, max: 10 });
    });

    it('commits objects by the component equality and never runs the write hook', () => {
      const { fixture, harness, control } = setup();
      const emissions: unknown[] = [];
      control.valueChanges.subscribe((value) => emissions.push(value));

      (fixture.nativeElement.querySelector('.widen') as HTMLElement).click();
      fixture.detectChanges();

      expect(emissions).toEqual([{ min: 1, max: 5 }]);
      expect(control.value).toEqual({ min: 1, max: 5 });
      expect(harness.writes.length).toBe(1);
    });
  });

  describe('with a composed accessor', () => {
    @Component({
      selector: 'andes-switch-host',
      imports: [ReactiveFormsModule, SwitchHarness],
      template: `<andes-switch-harness [formControl]="control" />`,
    })
    class SwitchHost {
      readonly control = new FormControl(false);
    }

    it('keeps the component API free of accessor methods', () => {
      const fixture = TestBed.createComponent(SwitchHost);
      fixture.detectChanges();
      const harness = fixture.debugElement.children[0]
        .componentInstance as SwitchHarness;

      expect('writeValue' in harness).toBe(false);
    });

    it('toggles through commit and mirrors form writes into the model', () => {
      const fixture = TestBed.createComponent(SwitchHost);
      fixture.detectChanges();
      const control = fixture.componentInstance.control;
      const toggle = fixture.nativeElement.querySelector(
        'button',
      ) as HTMLButtonElement;

      toggle.click();
      expect(control.value).toBe(true);

      control.setValue(false);
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-checked')).toBe('false');

      control.setValue(null);
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-checked')).toBe('false');
    });
  });
});
