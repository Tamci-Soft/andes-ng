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

/**
 * The *naive* wrapper usage - `andesFormControl` applied straight onto a wrapper component with
 * nothing hand-wired. Stands in for `<andes-checkbox andesFormControl [formControl]="...">`,
 * which is what a consumer writes before discovering the limitation documented on
 * `AndesFormControl`. Deliberately has NO `id`/`aria-*` inputs at all, matching `AndesCheckbox`/
 * `AndesSwitch`/`AndesSelect`/`AndesRadioGroup`/`AndesSlider` as of this PR.
 */
@Component({
  selector: 'andes-test-bare-wrapper',
  imports: [],
  template: `<input
    #native
    [value]="value()"
    (input)="onInput($event)"
    (blur)="onTouched()"
  />`,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TestBareWrapper),
      multi: true,
    },
  ],
})
class TestBareWrapper implements ControlValueAccessor {
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
    AndesFormError,
    TestBareWrapper,
  ],
  template: `<andes-form-field>
    <andes-form-label>Accept</andes-form-label>
    <andes-test-bare-wrapper
      andesFormControl
      #ctrl="andesFormControl"
      [formControl]="accept"
    />
    <andes-form-error>Required.</andes-form-error>
  </andes-form-field>`,
})
class BareWrapperControlHost {
  readonly accept = new FormControl('', { validators: Validators.required });
}

/**
 * A wrapper exposing `aria-labelledby`/`aria-describedby`/`aria-invalid` but deliberately NO
 * `id` input - the exact shape of `AndesSelect`, `AndesCheckbox`, `AndesSwitch`,
 * `AndesRadioGroup` and `AndesSlider` (each was re-read from its own branch to confirm). Used to
 * prove the `labelledBy()` workaround gives those components a correct accessible name without
 * any change to their own source.
 */
@Component({
  selector: 'andes-test-labelledby-wrapper',
  imports: [],
  template: `<input
    #native
    [attr.aria-labelledby]="ariaLabelledby"
    [attr.aria-describedby]="ariaDescribedby"
    [attr.aria-invalid]="ariaInvalid || null"
    [value]="value()"
    (input)="onInput($event)"
    (blur)="onTouched()"
  />`,
  host: { '[attr.aria-labelledby]': 'null' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TestLabelledbyWrapper),
      multi: true,
    },
  ],
})
class TestLabelledbyWrapper implements ControlValueAccessor {
  @Input('aria-labelledby') ariaLabelledby: string | null = null;
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
    AndesFormError,
    TestLabelledbyWrapper,
  ],
  template: `<andes-form-field>
    <andes-form-label>Country</andes-form-label>
    <andes-test-labelledby-wrapper
      andesFormControl
      #ctrl="andesFormControl"
      [formControl]="country"
      [aria-labelledby]="ctrl.labelledBy()"
      [aria-describedby]="ctrl.describedBy()"
      [aria-invalid]="ctrl.showError()"
    />
    <andes-form-error>Please pick a country.</andes-form-error>
  </andes-form-field>`,
})
class LabelledbyWrapperHost {
  readonly country = new FormControl('', { validators: Validators.required });
}

/** Same wrapper, but with no `<andes-form-label>` authored at all - `labelledBy()` must stay
 *  `null` rather than point `aria-labelledby` at an id that does not exist. */
@Component({
  imports: [
    ReactiveFormsModule,
    AndesFormField,
    AndesFormControl,
    TestLabelledbyWrapper,
  ],
  template: `<andes-form-field>
    <andes-test-labelledby-wrapper
      andesFormControl
      #ctrl="andesFormControl"
      [formControl]="country"
      [aria-labelledby]="ctrl.labelledBy()"
    />
  </andes-form-field>`,
})
class LabelledbyWrapperNoLabelHost {
  readonly country = new FormControl('');
}

@Component({
  selector: 'andes-test-optional-host',
  imports: [ReactiveFormsModule, AndesFormField, AndesFormControl],
  template: `<andes-form-field>
    <input andesFormControl [formControl]="optional" />
  </andes-form-field>`,
})
class OptionalControlHost {
  readonly optional = new FormControl('');
}

@Component({
  selector: 'andes-test-textarea-host',
  imports: [ReactiveFormsModule, AndesFormField, AndesFormControl],
  template: `<andes-form-field>
    <textarea andesFormControl [formControl]="bio"></textarea>
  </andes-form-field>`,
})
class TextareaHost {
  readonly bio = new FormControl('', { validators: Validators.required });
}

@Component({
  selector: 'andes-test-required-true-host',
  imports: [ReactiveFormsModule, AndesFormField, AndesFormControl],
  template: `<andes-form-field>
    <input andesFormControl [formControl]="consent" type="checkbox" />
  </andes-form-field>`,
})
class RequiredTrueHost {
  readonly consent = new FormControl(false, {
    validators: Validators.requiredTrue,
  });
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

  // ---------------------------------------------------------------------------------------
  // Bug 1 regression coverage: form-field.css was almost entirely dead.
  //
  // Only `.andes-form-field` lives in AndesFormField's own template; the label/description/
  // error classes live in three sibling components' templates, and the invalid-state rules
  // target the control the CONSUMER authored and Angular projects in. Under the default
  // emulated view encapsulation none of those carry AndesFormField's `_ngcontent-*` attribute,
  // so 5 of the 6 rules never matched anything.
  //
  // These assertions read REAL computed styles rather than checking class names: a
  // `expect(el.classList).toContain('andes-form-error')` assertion (as several tests above do,
  // for structural coverage) stays green even when every rule in the stylesheet is dead,
  // because it never asks the CSS engine to resolve a selector. Measured before the fix:
  // error color `rgb(0, 0, 0)` and label font-size/font-weight both empty strings.
  //
  // jsdom's CSSOM does not resolve `var()`, so token-valued properties are asserted as the
  // literal `var(--andes-*)` text they were authored with - which still proves the rule
  // matched, since an unmatched rule yields an empty string (or the UA default) instead.
  describe('applies real styles to every part (not dead CSS)', () => {
    function renderStyled() {
      const fixture = TestBed.createComponent(NativeInputHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;
      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      return {
        fixture,
        input,
        field: fixture.nativeElement.querySelector(
          '.andes-form-field',
        ) as HTMLElement,
        label: fixture.nativeElement.querySelector(
          '.andes-form-label',
        ) as HTMLElement,
        description: fixture.nativeElement.querySelector(
          '.andes-form-description',
        ) as HTMLElement,
        error: fixture.nativeElement.querySelector(
          '.andes-form-error',
        ) as HTMLElement,
      };
    }

    it('lays the field out as a spaced vertical flex column', () => {
      const style = getComputedStyle(renderStyled().field);

      expect(style.display).toBe('flex');
      expect(style.flexDirection).toBe('column');
      expect(style.gap).toBe('var(--andes-space-2)');
    });

    it('styles the <label> rendered by AndesFormLabel', () => {
      const style = getComputedStyle(renderStyled().label);

      expect(style.fontSize).toBe('0.875rem');
      expect(style.fontWeight).toBe('var(--andes-font-weight-medium)');
      expect(style.color).toBe('var(--andes-color-foreground)');
    });

    it('styles the <p> rendered by AndesFormDescription', () => {
      const style = getComputedStyle(renderStyled().description);

      expect(style.fontSize).toBe('0.8125rem');
      expect(style.color).toBe('var(--andes-color-muted-foreground)');
      // <p>'s UA default margin is 1em 0 - proving it is 0 proves the rule matched.
      expect(style.margin).toBe('0px');
    });

    it('renders the error text in the danger color, not the initial black', () => {
      const style = getComputedStyle(renderStyled().error);

      // This is the exact assertion that failed before the fix, with `rgb(0, 0, 0)`.
      expect(style.color).toBe('var(--andes-color-danger)');
      expect(style.color).not.toBe('rgb(0, 0, 0)');
      expect(style.fontSize).toBe('0.8125rem');
      expect(style.margin).toBe('0px');
    });

    it('tints the projected native control´s border while the field is invalid', () => {
      const { input, field } = renderStyled();

      // A control in a field that is NOT in the invalid state, as the differential baseline:
      // the same property, on the same kind of element, with the rule deliberately not
      // applying. jsdom cannot resolve `var()` so it reports an unhelpful placeholder for the
      // value itself - but "the rule matched here and not there" is exactly what makes this a
      // real CSS-engine assertion rather than a class-name check.
      const validFixture = TestBed.createComponent(OptionalControlHost);
      validFixture.detectChanges();
      const validInput = validFixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;

      expect(field.classList).toContain('andes-form-field--invalid');
      expect(
        validFixture.nativeElement.querySelector('.andes-form-field')
          ?.classList,
      ).not.toContain('andes-form-field--invalid');

      // `.andes-form-field--invalid :where(input, select, textarea)` targets an element the
      // consumer authored and Angular projected in, so it was unreachable from a scoped
      // stylesheet - this property read back as an empty string before the fix, exactly like
      // the untinted baseline below still does.
      const tinted = getComputedStyle(input).getPropertyValue('border-color');
      const untinted =
        getComputedStyle(validInput).getPropertyValue('border-color');

      expect(untinted).toBe('');
      expect(tinted).not.toBe('');
      expect(tinted).not.toBe(untinted);
    });
  });

  // Bug 2 regression coverage: the generated id must only ever be written onto an element the
  // platform is actually willing to associate a <label for> with.
  describe('id/label association across native and wrapper controls', () => {
    it('puts the id on a native <input> so label.control resolves to it', () => {
      const fixture = TestBed.createComponent(NativeInputHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;
      const label = fixture.nativeElement.querySelector(
        'label',
      ) as HTMLLabelElement;

      expect(input.id).toBeTruthy();
      expect(label.getAttribute('for')).toBe(input.id);
      // The real proof, as opposed to "two strings happen to be equal": the platform's own
      // labelable-element association, resolved by the DOM rather than asserted by us.
      expect(input.labels?.length).toBe(1);
      expect(input.labels?.[0]).toBe(label);
      expect(label.control).toBe(input);
    });

    it('also associates a <textarea>', () => {
      const fixture = TestBed.createComponent(TextareaHost);
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector(
        'textarea',
      ) as HTMLTextAreaElement;

      expect(textarea.id).toBeTruthy();
    });

    it('does NOT write the id onto a non-labelable wrapper component´s host element', () => {
      const fixture = TestBed.createComponent(BareWrapperControlHost);
      fixture.detectChanges();
      const wrapper = fixture.nativeElement.querySelector(
        'andes-test-bare-wrapper',
      ) as HTMLElement;
      const label = fixture.nativeElement.querySelector(
        'label',
      ) as HTMLLabelElement;

      // A custom element is not labelable (it is not a form-associated custom element), so an
      // id here produces a `for` that *looks* wired while associating nothing. Writing nothing
      // leaves a dangling `for` instead, which axe and friends can actually flag. Neither is
      // a working association - see the KNOWN LIMITATION on AndesFormControl: the five wrapper
      // components need their own `id` input before this can be closed.
      expect(wrapper.hasAttribute('id')).toBe(false);
      expect(label.control).toBeNull();
    });

    it('does NOT write aria-describedby/aria-invalid onto a wrapper host either', () => {
      const fixture = TestBed.createComponent(BareWrapperControlHost);
      fixture.detectChanges();
      const wrapper = fixture.nativeElement.querySelector(
        'andes-test-bare-wrapper',
      ) as HTMLElement;
      const innerInput = wrapper.querySelector('input') as HTMLInputElement;

      innerInput.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      // Verified against the real AndesCheckbox while fixing this: these attributes never
      // reach the wrapper's internal native control (wrappers forward ARIA through their own
      // @Input()s, which a co-located directive's host bindings cannot feed), and writing them
      // on the host silently overrides the `'[attr.aria-*]': 'null'` those components declare
      // to keep their outer element out of the accessibility tree.
      expect(wrapper.hasAttribute('aria-describedby')).toBe(false);
      expect(wrapper.hasAttribute('aria-invalid')).toBe(false);
      expect(wrapper.hasAttribute('aria-required')).toBe(false);
      expect(innerInput.hasAttribute('aria-describedby')).toBe(false);
    });

    it('still exposes the ids/state as public signals so a wrapper can be wired by hand', () => {
      // Covered end-to-end by the WrapperControlHost suite above, which binds exactly these
      // signals into a wrapper's own inputs and asserts they land on the internal <input>.
      const fixture = TestBed.createComponent(WrapperControlHost);
      fixture.detectChanges();
      const innerInput = fixture.nativeElement.querySelector(
        'andes-test-wrapper-input input',
      ) as HTMLInputElement;

      expect(innerInput.id).toBeTruthy();
    });
  });

  // The aria-labelledby escape hatch for the five wrapper components that expose no `id` input
  // (AndesSelect/Checkbox/Switch/RadioGroup/Slider). They all DO accept aria-labelledby and
  // forward it onto their real internal control, so naming them needs no change on their side -
  // only a stable id on the label AndesFormLabel already renders.
  describe('aria-labelledby fallback for wrappers with no id input', () => {
    it('gives the rendered <label> a stable id derived from the field id', () => {
      const fixture = TestBed.createComponent(NativeInputHost);
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector(
        'label',
      ) as HTMLLabelElement;
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;

      expect(label.id).toBe(`${input.id}-label`);
    });

    it('names a wrapper´s internal control through aria-labelledby', () => {
      const fixture = TestBed.createComponent(LabelledbyWrapperHost);
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector(
        'label',
      ) as HTMLLabelElement;
      const innerInput = fixture.nativeElement.querySelector(
        'andes-test-labelledby-wrapper input',
      ) as HTMLInputElement;

      expect(label.id).toBeTruthy();
      expect(innerInput.getAttribute('aria-labelledby')).toBe(label.id);
      // The id it points at must actually resolve in the document, which is the whole
      // difference between this and the dangling `for` it works around.
      expect(fixture.nativeElement.querySelector(`#${label.id}`)).toBe(label);
    });

    it('omits aria-labelledby entirely when no label was authored', () => {
      const fixture = TestBed.createComponent(LabelledbyWrapperNoLabelHost);
      fixture.detectChanges();
      const innerInput = fixture.nativeElement.querySelector(
        'andes-test-labelledby-wrapper input',
      ) as HTMLInputElement;

      expect(innerInput.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('still folds description/error ids into the same wrapper´s aria-describedby', () => {
      const fixture = TestBed.createComponent(LabelledbyWrapperHost);
      fixture.detectChanges();
      const innerInput = fixture.nativeElement.querySelector(
        'andes-test-labelledby-wrapper input',
      ) as HTMLInputElement;

      expect(innerInput.hasAttribute('aria-describedby')).toBe(false);

      fixture.componentInstance.country.markAsTouched();
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector(
        '.andes-form-error',
      ) as HTMLElement;
      expect(innerInput.getAttribute('aria-describedby')).toBe(error.id);
      expect(innerInput.getAttribute('aria-invalid')).toBe('true');
    });

    it('does not make the label clickable - the remaining, documented gap', () => {
      const fixture = TestBed.createComponent(LabelledbyWrapperHost);
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector(
        'label',
      ) as HTMLLabelElement;

      // aria-labelledby supplies the accessible NAME only. Only a native for/id pair populates
      // `label.control`/`element.labels` and moves focus on click, and that still needs an `id`
      // input on each of those five components.
      expect(label.control).toBeNull();
    });
  });

  // Bug 3 regression coverage: aria-required was never derived at all, despite the directive
  // holding the AbstractControl and already reading validity off it.
  describe('aria-required', () => {
    it('sets aria-required="true" when the bound control has Validators.required', () => {
      const fixture = TestBed.createComponent(NativeInputHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;

      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('omits aria-required entirely when the control is not required', () => {
      const fixture = TestBed.createComponent(OptionalControlHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;

      expect(input.hasAttribute('aria-required')).toBe(false);
    });

    it('also recognises Validators.requiredTrue (the consent-checkbox validator)', () => {
      const fixture = TestBed.createComponent(RequiredTrueHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;

      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('reacts to validators added or removed at runtime', () => {
      const fixture = TestBed.createComponent(OptionalControlHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;
      expect(input.hasAttribute('aria-required')).toBe(false);

      fixture.componentInstance.optional.addValidators(Validators.required);
      fixture.componentInstance.optional.updateValueAndValidity();
      fixture.detectChanges();
      expect(input.getAttribute('aria-required')).toBe('true');

      fixture.componentInstance.optional.removeValidators(Validators.required);
      fixture.componentInstance.optional.updateValueAndValidity();
      fixture.detectChanges();
      expect(input.hasAttribute('aria-required')).toBe(false);
    });

    it('is independent of the error state - required is announced before any interaction', () => {
      const fixture = TestBed.createComponent(NativeInputHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;

      // Untouched and pristine: no error shown, no aria-invalid - but aria-required already
      // tells the user the field must be filled, which is the whole point.
      expect(
        fixture.nativeElement.querySelector('.andes-form-error'),
      ).toBeNull();
      expect(input.hasAttribute('aria-invalid')).toBe(false);
      expect(input.getAttribute('aria-required')).toBe('true');
    });
  });
});
