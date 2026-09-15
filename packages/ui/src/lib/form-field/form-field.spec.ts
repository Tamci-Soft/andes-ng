import { Component, forwardRef, Input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { AndesFormControl } from './form-control';
import { AndesFormDescription } from './form-description';
import { AndesFormError } from './form-error';
import { AndesFormField } from './form-field';
import { AndesFormLabel } from './form-label';

/**
 * Minimal stand-in for a wrapping `ControlValueAccessor` *component* (the shape AndesInput/
 * AndesCheckbox/etc. all share: a custom element that renders its own internal native
 * control). Used to prove `AndesFormControl` also correctly reads validity/touched/dirty
 * state for a component-based control, and to demonstrate the documented manual-binding
 * pattern for wiring id/aria-describedby/aria-invalid into a wrapper's own inputs.
 */
@Component({
  selector: 'andes-test-wrapper-input',
  imports: [],
  template: `<input
    #native
    [attr.id]="id"
    [attr.aria-describedby]="ariaDescribedby"
    [attr.aria-invalid]="ariaInvalid || null"
    [value]="value()"
    (input)="onInput($event)"
    (blur)="onTouched()"
  />`,
  host: { '[attr.id]': 'null' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TestWrapperInput),
      multi: true,
    },
  ],
})
class TestWrapperInput implements ControlValueAccessor {
  @Input() id: string | null = null;
  @Input('aria-describedby') ariaDescribedby: string | null = null;
  @Input('aria-invalid') ariaInvalid = false;

  protected readonly value = signal('');
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: string) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }
}

@Component({
  imports: [
    ReactiveFormsModule,
    AndesFormField,
    AndesFormLabel,
    AndesFormControl,
    AndesFormDescription,
    AndesFormError,
  ],
  template: `<andes-form-field #field="andesFormField">
    <andes-form-label>Email</andes-form-label>
    <input andesFormControl [formControl]="email" />
    <andes-form-description>We'll never share it.</andes-form-description>
    <andes-form-error>Email is required.</andes-form-error>
  </andes-form-field>`,
})
class NativeInputHost {
  readonly email = new FormControl('', { validators: Validators.required });
}

@Component({
  imports: [
    ReactiveFormsModule,
    AndesFormField,
    AndesFormControl,
    AndesFormError,
  ],
  template: `<andes-form-field>
    <input andesFormControl [formControl]="value" />
    <andes-form-error>Required.</andes-form-error>
  </andes-form-field>`,
})
class NoLabelNoDescriptionHost {
  readonly value = new FormControl('', { validators: Validators.required });
}

@Component({
  imports: [
    ReactiveFormsModule,
    AndesFormField,
    AndesFormLabel,
    AndesFormControl,
    AndesFormError,
    TestWrapperInput,
  ],
  template: `<andes-form-field #field="andesFormField">
    <andes-form-label>Name</andes-form-label>
    <andes-test-wrapper-input
      andesFormControl
      #ctrl="andesFormControl"
      [formControl]="name"
      [id]="field.controlId()"
      [aria-describedby]="ctrl.describedBy()"
      [aria-invalid]="field.showError()"
    />
    <andes-form-error>Name is required.</andes-form-error>
  </andes-form-field>`,
})
class WrapperControlHost {
  readonly name = new FormControl('', { validators: Validators.required });
}

describe('AndesFormField', () => {
  describe('with a native input', () => {
    function createHost() {
      const fixture = TestBed.createComponent(NativeInputHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;
      const label = fixture.nativeElement.querySelector(
        'label',
      ) as HTMLLabelElement;
      const getError = () =>
        fixture.nativeElement.querySelector(
          '.andes-form-error',
        ) as HTMLParagraphElement | null;
      const getDescription = () =>
        fixture.nativeElement.querySelector(
          '.andes-form-description',
        ) as HTMLParagraphElement | null;
      return { fixture, input, label, getError, getDescription };
    }

    it('does not show the error on an untouched, pristine, invalid (required) field', () => {
      const { input, getError } = createHost();

      expect(getError()).toBeNull();
      expect(input.getAttribute('aria-invalid')).toBeNull();
    });

    it('shows the error once the control is touched (blur), even without typing', () => {
      const { fixture, input, getError } = createHost();

      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      const error = getError();
      expect(error).not.toBeNull();
      expect(error?.textContent?.trim()).toBe('Email is required.');
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('shows the error once the control is dirty, even without being touched', () => {
      const { fixture, input, getError } = createHost();

      input.value = 'a';
      input.dispatchEvent(new Event('input'));
      input.value = '';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(getError()).not.toBeNull();
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('hides the error again once the field becomes valid', () => {
      const { fixture, input, getError } = createHost();

      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(getError()).not.toBeNull();

      input.value = 'me@example.com';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(getError()).toBeNull();
      expect(input.getAttribute('aria-invalid')).toBeNull();
    });

    it('associates the label with the control via matching for/id', () => {
      const { input, label } = createHost();

      expect(label.getAttribute('for')).toBe(input.id);
      expect(input.id).toBeTruthy();
    });

    it('renders the error with role="alert" for screen-reader announcement', () => {
      const { fixture, input, getError } = createHost();
      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(getError()?.getAttribute('role')).toBe('alert');
    });

    it('wires aria-describedby to the description id when there is no error yet', () => {
      const { input, getDescription } = createHost();
      const description = getDescription();

      expect(description).not.toBeNull();
      expect(input.getAttribute('aria-describedby')).toBe(description?.id);
    });

    it('folds both the description and error ids into aria-describedby once shown', () => {
      const { fixture, input, getError, getDescription } = createHost();

      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      const describedBy = input.getAttribute('aria-describedby');
      const description = getDescription();
      const error = getError();
      expect(description).not.toBeNull();
      expect(error).not.toBeNull();
      expect(describedBy).toContain(description?.id);
      expect(describedBy).toContain(error?.id);
    });
  });

  it('works without a label or description - just a control and an error', () => {
    const fixture = TestBed.createComponent(NoLabelNoDescriptionHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;

    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('.andes-form-error');
    expect(error).not.toBeNull();
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
  });

  describe('with a wrapping ControlValueAccessor component', () => {
    function createHost() {
      const fixture = TestBed.createComponent(WrapperControlHost);
      fixture.detectChanges();
      const innerInput = fixture.nativeElement.querySelector(
        'andes-test-wrapper-input input',
      ) as HTMLInputElement;
      const wrapperHost = fixture.nativeElement.querySelector(
        'andes-test-wrapper-input',
      ) as HTMLElement;
      const getError = () =>
        fixture.nativeElement.querySelector('.andes-form-error');
      return { fixture, innerInput, wrapperHost, getError };
    }

    it('does not show the error before interaction', () => {
      const { getError } = createHost();
      expect(getError()).toBeNull();
    });

    it('reads NgControl state through the directive regardless of the control being a component', () => {
      const { fixture, innerInput, getError } = createHost();

      innerInput.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(getError()).not.toBeNull();
    });

    it('propagates id/aria-describedby/aria-invalid into the wrapper´s own internal native input via the documented manual binding', () => {
      const { fixture, innerInput, getError } = createHost();

      innerInput.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      const error = getError();
      expect(error).not.toBeNull();
      expect(innerInput.id).toBeTruthy();
      expect(innerInput.getAttribute('aria-invalid')).toBe('true');
      expect(innerInput.getAttribute('aria-describedby')).toBe(error?.id);
    });
  });
});
