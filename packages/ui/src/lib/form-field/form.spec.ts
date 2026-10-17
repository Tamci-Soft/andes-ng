import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { Subject } from 'rxjs';

import {
  AndesForm,
  collectAndesFormErrors,
  injectAndesFormDisabled,
  injectAndesFormSize,
  injectAndesFormVariant,
} from './form';
import { AndesFormControl } from './form-control';
import {
  ANDES_DEFAULT_FORM_ERROR_MESSAGES,
  resolveAndesFormErrorMessages,
} from './form-error-messages';
import { AndesFormField } from './form-field';
import type {
  AndesFormInvalidSubmit,
  AndesFormLayout,
  AndesFormScrollOptions,
  AndesFormSize,
  AndesFormVariant,
} from './form-field-tokens';

/** Stand-in for a control on another branch that adopts the size hook. */
@Component({
  selector: 'andes-test-sized-control',
  template: `{{ effectiveSize() }}`,
})
class SizedControl {
  private readonly formSize = injectAndesFormSize();
  readonly size = signal<AndesFormSize | undefined>(undefined);
  protected readonly effectiveSize = computed(
    () => this.size() ?? this.formSize() ?? 'md',
  );
}

/** Stand-in for a control that follows the form's variant and disabled hints. */
@Component({
  selector: 'andes-test-hinted-control',
  template: `{{ variant() ?? 'none' }}|{{ disabled() }}`,
})
class HintedControl {
  protected readonly variant = injectAndesFormVariant();
  protected readonly disabled = injectAndesFormDisabled();
}

@Component({
  imports: [
    ReactiveFormsModule,
    AndesForm,
    AndesFormField,
    AndesFormControl,
    SizedControl,
    HintedControl,
  ],
  template: `<form
      andesForm
      #andesForm="andesForm"
      [formGroup]="form"
      [layout]="layout()"
      [size]="size()"
      [variant]="variant()"
      [disabled]="disabled()"
      [scrollToFirstError]="scroll()"
      (ngSubmit)="submits = submits + 1"
      (validSubmit)="valid.push($event)"
      (invalidSubmit)="invalid.push($event)"
    >
      <andes-form-field label="First">
        <input class="first" andesFormControl formControlName="first" />
      </andes-form-field>
      <andes-form-field label="Second">
        <input class="second" andesFormControl formControlName="second" />
      </andes-form-field>
      <andes-test-sized-control />
      <andes-test-hinted-control />
    </form>
    <andes-test-sized-control class="outside" />`,
})
class FormHost {
  readonly form = new FormGroup({
    first: new FormControl('ok'),
    second: new FormControl('', Validators.required),
  });
  readonly layout = signal<AndesFormLayout>('vertical');
  readonly size = signal<AndesFormSize | undefined>(undefined);
  readonly variant = signal<AndesFormVariant | undefined>(undefined);
  readonly disabled = signal(false);
  readonly scroll = signal<boolean | AndesFormScrollOptions>(false);
  submits = 0;
  readonly valid: unknown[] = [];
  readonly invalid: AndesFormInvalidSubmit[] = [];
}

function setup() {
  const fixture = TestBed.createComponent(FormHost);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const form = el.querySelector('form') as HTMLFormElement;
  const update = (fn: (h: FormHost) => void) => {
    fn(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { fixture, el, form, update };
}

describe('AndesForm', () => {
  it('tags its host with the layout, defaulting to vertical', () => {
    const { form, update } = setup();
    expect(form.classList).toContain('andes-form');
    expect(form.classList).toContain('andes-form--vertical');
    update((h) => h.layout.set('horizontal'));
    expect(form.classList).toContain('andes-form--horizontal');
    expect(form.classList).not.toContain('andes-form--vertical');
  });

  it('cascades its layout to every field', () => {
    const { el, update } = setup();
    update((h) => h.layout.set('inline'));
    el.querySelectorAll('.andes-form-field').forEach((field) =>
      expect(field.classList).toContain('andes-form-field--inline'),
    );
  });

  it('coexists with FormGroupDirective on the same <form>', () => {
    const { fixture, form } = setup();
    form.dispatchEvent(new Event('submit'));
    expect(fixture.componentInstance.submits).toBe(1);
  });

  describe('size', () => {
    it('reflects size as data-size, and omits it when unset', () => {
      const { form, update } = setup();
      expect(form.hasAttribute('data-size')).toBe(false);
      update((h) => h.size.set('lg'));
      expect(form.getAttribute('data-size')).toBe('lg');
    });

    it('feeds injectAndesFormSize() for controls inside, and nothing outside', () => {
      const { el, update } = setup();
      const inside = () =>
        el.querySelector('form andes-test-sized-control')?.textContent?.trim();
      const outside = () => el.querySelector('.outside')?.textContent?.trim();
      expect(inside()).toBe('md');
      update((h) => h.size.set('sm'));
      expect(inside()).toBe('sm');
      expect(outside()).toBe('md');
    });
  });

  describe('scrollToFirstError', () => {
    it('focuses the first invalid control after a failed submit', async () => {
      const { fixture, el, form, update } = setup();
      update((h) => h.scroll.set(true));
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(document.activeElement).toBe(el.querySelector('.second'));
    });

    it('does nothing unless enabled', async () => {
      const { fixture, form } = setup();
      const before = document.activeElement;
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(document.activeElement).toBe(before);
    });

    it('focusFirstError() reports whether there was anything to focus', () => {
      const { fixture } = setup();
      const directive = fixture.debugElement
        .query((de) => de.name === 'form')
        .injector.get(AndesForm);
      expect(directive.focusFirstError()).toBe(false);
      fixture.componentInstance.form.markAllAsTouched();
      fixture.detectChanges();
      expect(directive.focusFirstError()).toBe(true);
    });
  });
});

describe('AndesForm - form-wide state and submit outputs', () => {
  const directiveOf = (fixture: ReturnType<typeof setup>['fixture']) =>
    fixture.debugElement
      .query((de) => de.name === 'form')
      .injector.get(AndesForm);

  it('reflects variant and feeds injectAndesFormVariant()', () => {
    const { el, form, update } = setup();
    const hinted = () =>
      el.querySelector('andes-test-hinted-control')?.textContent?.trim();
    expect(form.hasAttribute('data-variant')).toBe(false);
    expect(hinted()).toBe('none|false');
    update((h) => h.variant.set('filled'));
    expect(form.getAttribute('data-variant')).toBe('filled');
    expect(hinted()).toBe('filled|false');
  });

  it('disabled disables the bound form, and re-enables it when cleared', async () => {
    const { fixture, el, form, update } = setup();
    update((h) => h.disabled.set(true));
    await fixture.whenStable();
    const model = fixture.componentInstance.form;
    expect(model.disabled).toBe(true);
    expect((el.querySelector('.first') as HTMLInputElement).disabled).toBe(
      true,
    );
    expect(form.hasAttribute('data-disabled')).toBe(true);
    expect(
      el.querySelector('andes-test-hinted-control')?.textContent?.trim(),
    ).toBe('none|true');
    update((h) => h.disabled.set(false));
    await fixture.whenStable();
    expect(model.enabled).toBe(true);
    expect(form.hasAttribute('data-disabled')).toBe(false);
  });

  it('disabled also catches controls added to the group later', async () => {
    const { fixture, update } = setup();
    update((h) => h.disabled.set(true));
    await fixture.whenStable();
    const model = fixture.componentInstance.form as FormGroup;
    model.addControl('third', new FormControl(''));
    expect(model.get('third')?.disabled).toBe(true);
  });

  it('disables a template-driven form once its controls register', async () => {
    @Component({
      imports: [FormsModule, AndesForm],
      template: `<form andesForm disabled>
        <input name="nick" [(ngModel)]="nick" />
      </form>`,
    })
    class TemplateDrivenHost {
      nick = 'x';
    }
    const fixture = TestBed.createComponent(TemplateDrivenHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector(
      'input',
    ) as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('emits invalidSubmit with every failing control, and validSubmit once valid', () => {
    const { fixture, form } = setup();
    form.dispatchEvent(new Event('submit'));
    const host = fixture.componentInstance;
    expect(host.valid).toEqual([]);
    expect(host.invalid).toEqual([
      {
        value: { first: 'ok', second: '' },
        errors: [{ path: ['second'], errors: { required: true } }],
      },
    ]);
    host.form.controls.second.setValue('filled');
    form.dispatchEvent(new Event('submit'));
    expect(host.valid).toEqual([{ first: 'ok', second: 'filled' }]);
    expect(host.submits).toBe(2);
  });

  it('waits for pending async validators before deciding', () => {
    const { fixture, form } = setup();
    const host = fixture.componentInstance;
    const verdict = new Subject<ValidationErrors | null>();
    host.form.controls.second.setValue('x');
    host.form.controls.second.setAsyncValidators(() => verdict);
    host.form.controls.second.updateValueAndValidity();
    expect(host.form.pending).toBe(true);
    form.dispatchEvent(new Event('submit'));
    expect(host.valid).toEqual([]);
    expect(host.invalid).toEqual([]);
    verdict.next({ taken: true });
    verdict.complete();
    expect(host.invalid[0]?.errors).toEqual([
      { path: ['second'], errors: { taken: true } },
    ]);
  });

  it('scrollToFirstError takes options; focus: false scrolls without focusing', async () => {
    const { fixture, form, update } = setup();
    update((h) => h.scroll.set({ focus: false, block: 'start' }));
    const before = document.activeElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(before);
  });

  it('scrollToField finds a field by its control path', () => {
    const { fixture, el } = setup();
    const directive = directiveOf(fixture);
    expect(directive.scrollToField('second')).toBe(true);
    expect(document.activeElement).toBe(el.querySelector('.second'));
    expect(directive.scrollToField(['first'], { focus: false })).toBe(true);
    expect(document.activeElement).toBe(el.querySelector('.second'));
    expect(directive.scrollToField('missing')).toBe(false);
  });
});

describe('collectAndesFormErrors', () => {
  it('walks groups and arrays, with root errors first and disabled controls skipped', () => {
    const mismatch = (group: AbstractControl): ValidationErrors | null =>
      group.get('a')?.value === group.get('b')?.value
        ? null
        : { mismatch: true };
    const form = new FormGroup(
      {
        a: new FormControl('1'),
        b: new FormControl('2'),
        lines: new FormArray([
          new FormGroup({ qty: new FormControl(0, Validators.min(1)) }),
        ]),
        off: new FormControl(
          { value: '', disabled: true },
          Validators.required,
        ),
      },
      { validators: mismatch },
    );
    expect(collectAndesFormErrors(form)).toEqual([
      { path: [], errors: { mismatch: true } },
      { path: ['lines', 0, 'qty'], errors: { min: { min: 1, actual: 0 } } },
    ]);
  });
});

describe('resolveAndesFormErrorMessages', () => {
  it('returns nothing for null errors', () => {
    expect(resolveAndesFormErrorMessages(null, [], 'X')).toEqual([]);
  });

  it('covers every built-in Angular validator', () => {
    const errors = {
      required: true,
      requiredTrue: true,
      email: true,
      minlength: { requiredLength: 3, actualLength: 1 },
      maxlength: { requiredLength: 5, actualLength: 9 },
      min: { min: 1, actual: 0 },
      max: { max: 10, actual: 11 },
      pattern: { requiredPattern: '^a', actualValue: 'b' },
    };
    const messages = resolveAndesFormErrorMessages(errors, [], undefined);
    expect(messages).toEqual([
      ANDES_DEFAULT_FORM_ERROR_MESSAGES['required'],
      ANDES_DEFAULT_FORM_ERROR_MESSAGES['requiredTrue'],
      ANDES_DEFAULT_FORM_ERROR_MESSAGES['email'],
      'Enter at least 3 characters.',
      'Enter no more than 5 characters.',
      'Enter a value of at least 1.',
      'Enter a value of at most 10.',
      ANDES_DEFAULT_FORM_ERROR_MESSAGES['pattern'],
    ]);
  });

  it('blanks placeholders the error object does not carry', () => {
    expect(
      resolveAndesFormErrorMessages(
        { required: true },
        [{ required: '{label}|{nope}' }],
        undefined,
      ),
    ).toEqual(['|']);
  });
});
