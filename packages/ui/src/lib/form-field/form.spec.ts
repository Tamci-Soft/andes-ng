import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { AndesForm, injectAndesFormSize } from './form';
import { AndesFormControl } from './form-control';
import {
  ANDES_DEFAULT_FORM_ERROR_MESSAGES,
  resolveAndesFormErrorMessages,
} from './form-error-messages';
import { AndesFormField } from './form-field';
import type { AndesFormLayout, AndesFormSize } from './form-field-tokens';

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

@Component({
  imports: [
    ReactiveFormsModule,
    AndesForm,
    AndesFormField,
    AndesFormControl,
    SizedControl,
  ],
  template: `<form
      andesForm
      #andesForm="andesForm"
      [formGroup]="form"
      [layout]="layout()"
      [size]="size()"
      [scrollToFirstError]="scroll()"
      (ngSubmit)="submits = submits + 1"
    >
      <andes-form-field label="First">
        <input class="first" andesFormControl formControlName="first" />
      </andes-form-field>
      <andes-form-field label="Second">
        <input class="second" andesFormControl formControlName="second" />
      </andes-form-field>
      <andes-test-sized-control />
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
  readonly scroll = signal(false);
  submits = 0;
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
