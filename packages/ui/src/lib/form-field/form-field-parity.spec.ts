import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';

import { AndesForm } from './form';
import { AndesFormControl } from './form-control';
import { provideAndesFormErrorMessages } from './form-error-messages';
import { AndesFormError } from './form-error';
import { AndesFormField } from './form-field';
import type {
  AndesFormColumn,
  AndesFormErrorMessages,
  AndesFormLabelAlign,
  AndesFormLayout,
  AndesFormRequiredMark,
  AndesFormValidateStatus,
} from './form-field-tokens';

/**
 * Coverage for the presentation features layered onto AndesFormField
 * (validateStatus, hasFeedback, help/extra, generated error messages, required mark, colon,
 * tooltip, layout/columns, noStyle, submit-reveals-errors). The original anatomy/a11y
 * contract stays covered, unchanged, in form-field.spec.ts.
 */

/** The minimum every host needs; hosts add AndesForm/AndesFormError when they use them. */
const IMPORTS = [ReactiveFormsModule, AndesFormField, AndesFormControl];

@Component({
  imports: IMPORTS,
  template: `<andes-form-field
    [label]="label()"
    [validateStatus]="status()"
    [hasFeedback]="feedback()"
    [help]="help()"
    [extra]="extra()"
    [tooltip]="tooltip()"
    [required]="required()"
    [requiredMark]="requiredMark()"
    [errorMessages]="messages()"
  >
    <input andesFormControl [formControl]="control" />
  </andes-form-field>`,
})
class FieldHost {
  control = new FormControl('', {
    validators: [Validators.required, Validators.minLength(3)],
  });
  readonly label = signal<string | undefined>('Name');
  readonly status = signal<AndesFormValidateStatus | '' | undefined>(undefined);
  readonly feedback = signal(false);
  readonly help = signal<string | undefined>(undefined);
  readonly extra = signal<string | undefined>(undefined);
  readonly tooltip = signal<string | undefined>(undefined);
  readonly required = signal<boolean | undefined>(undefined);
  readonly requiredMark = signal<AndesFormRequiredMark | undefined>(undefined);
  readonly messages = signal<AndesFormErrorMessages | undefined>(undefined);
}

function setup(configure?: (host: FieldHost) => void) {
  const fixture = TestBed.createComponent(FieldHost);
  configure?.(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector('input') as HTMLInputElement;
  const root = () => el.querySelector('.andes-form-field') as HTMLElement;
  const help = () => el.querySelector('.andes-form-field__help');
  const feedback = () => el.querySelector('.andes-form-field__feedback');
  const blur = () => {
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const type = (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const update = (fn: (host: FieldHost) => void) => {
    fn(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { fixture, el, input, root, help, feedback, blur, type, update };
}

describe('AndesFormField - presentation features', () => {
  describe('validateStatus', () => {
    it('reports no status on a pristine, untouched field even though it is invalid', () => {
      const { root } = setup();
      expect(root().getAttribute('data-status')).toBeNull();
    });

    it('derives error once touched, and success once valid', () => {
      const { root, blur, type } = setup();
      blur();
      expect(root().getAttribute('data-status')).toBe('error');
      type('Ada');
      expect(root().getAttribute('data-status')).toBe('success');
    });

    it('derives validating while an async validator is pending, and marks the input aria-busy', async () => {
      let resolve!: (errors: ValidationErrors | null) => void;
      const { root, input, type, fixture } = setup((host) => {
        host.control = new FormControl('', {
          asyncValidators: () =>
            new Promise<ValidationErrors | null>((r) => (resolve = r)),
        });
      });
      type('taken');
      expect(root().getAttribute('data-status')).toBe('validating');
      expect(input.getAttribute('aria-busy')).toBe('true');

      resolve({ taken: 'That name is taken.' });
      await Promise.resolve();
      fixture.detectChanges();
      expect(root().getAttribute('data-status')).toBe('error');
      expect(input.hasAttribute('aria-busy')).toBe(false);
    });

    it('lets a manual override win over the derived status', () => {
      const { root, blur, update } = setup();
      blur();
      update((h) => h.status.set('warning'));
      expect(root().getAttribute('data-status')).toBe('warning');
      expect(root().classList).not.toContain('andes-form-field--invalid');
    });

    it('drives the error class and aria-invalid from a manual "error" on a valid control', () => {
      const { root, input, update } = setup((host) => {
        host.control = new FormControl('fine');
      });
      update((h) => h.status.set('error'));
      expect(root().classList).toContain('andes-form-field--invalid');
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('treats "" as an explicit "no status" even while invalid and touched', () => {
      const { root, input, blur, update } = setup();
      update((h) => h.status.set(''));
      blur();
      expect(root().getAttribute('data-status')).toBeNull();
      expect(input.hasAttribute('aria-invalid')).toBe(false);
    });

    it('reveals errors after the parent form is submitted, without touched/markAllAsTouched', () => {
      @Component({
        imports: IMPORTS,
        template: `<form [formGroup]="form">
          <andes-form-field>
            <input andesFormControl formControlName="name" />
          </andes-form-field>
        </form>`,
      })
      class SubmitHost {
        readonly form = new FormGroup({
          name: new FormControl('', Validators.required),
        });
      }
      const fixture = TestBed.createComponent(SubmitHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.andes-form-field__help')).toBeNull();

      el.querySelector('form')?.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(fixture.componentInstance.form.controls.name.touched).toBe(false);
      expect(
        el.querySelector('.andes-form-field__help')?.textContent,
      ).toContain('This field is required.');
    });
  });

  describe('hasFeedback', () => {
    it('draws nothing without hasFeedback, whatever the status', () => {
      const { feedback, blur } = setup();
      blur();
      expect(feedback()).toBeNull();
    });

    it('draws no icon before the user interacts', () => {
      const { feedback } = setup((h) => h.feedback.set(true));
      expect(feedback()).toBeNull();
    });

    it('draws an aria-hidden icon matching the status', () => {
      const { feedback, blur, type, update, root } = setup((h) =>
        h.feedback.set(true),
      );
      blur();
      expect(feedback()?.getAttribute('data-status')).toBe('error');
      expect(feedback()?.getAttribute('aria-hidden')).toBe('true');
      expect(feedback()?.querySelector('svg')).not.toBeNull();
      type('Ada');
      expect(feedback()?.getAttribute('data-status')).toBe('success');
      update((h) => h.status.set('warning'));
      expect(feedback()?.getAttribute('data-status')).toBe('warning');
      update((h) => h.status.set('validating'));
      expect(feedback()?.getAttribute('data-status')).toBe('validating');
      expect(root().classList).toContain('andes-form-field--has-feedback');
    });

    it('sits inside the control slot so it can be positioned over the control', () => {
      const { feedback, blur } = setup((h) => h.feedback.set(true));
      blur();
      expect(feedback()?.parentElement?.classList).toContain(
        'andes-form-field__control',
      );
    });
  });

  describe('generated error messages', () => {
    it('renders the message for the actual validator error, announced and described', () => {
      const { help, input, blur } = setup();
      blur();
      expect(help()?.textContent?.trim()).toBe('This field is required.');
      expect(help()?.getAttribute('role')).toBe('alert');
      expect(input.getAttribute('aria-describedby')).toContain(
        help()?.id as string,
      );
    });

    it('interpolates the validator error object into the message', () => {
      const { help, type } = setup();
      type('Ad');
      expect(help()?.textContent?.trim()).toBe('Enter at least 3 characters.');
    });

    it('renders one line per failing validator', () => {
      const { help, type } = setup((h) => {
        h.control = new FormControl('', {
          validators: [Validators.minLength(5), Validators.pattern(/^\d+$/)],
        });
      });
      type('ab');
      expect(
        Array.from(
          help()?.querySelectorAll('.andes-form-field__help-item') ?? [],
        ).map((n) => n.textContent?.trim()),
      ).toEqual([
        'Enter at least 5 characters.',
        'The value does not match the expected format.',
      ]);
    });

    it('uses a field-level map, with {label} and function messages', () => {
      const { help, blur, type } = setup((h) =>
        h.messages.set({
          required: '{label} is required.',
          minlength: (error: { requiredLength: number }, ctx) =>
            `${ctx.label} needs ${error.requiredLength}+ chars (${ctx.key}).`,
        }),
      );
      blur();
      expect(help()?.textContent?.trim()).toBe('Name is required.');
      type('A');
      expect(help()?.textContent?.trim()).toBe(
        'Name needs 3+ chars (minlength).',
      );
    });

    it('falls back to a string error value, then to the "default" message', () => {
      const custom = (c: AbstractControl) =>
        c.value === 'x'
          ? { taken: 'Already taken.' }
          : c.value === 'y'
            ? { odd: true }
            : null;
      const { help, type } = setup((h) => {
        h.control = new FormControl('', { validators: custom });
      });
      type('x');
      expect(help()?.textContent?.trim()).toBe('Already taken.');
      type('y');
      expect(help()?.textContent?.trim()).toBe('This value is invalid.');
    });

    it('resolves field > form > provided > built-in', () => {
      @Component({
        imports: [...IMPORTS, AndesForm],
        template: `<div
          andesForm
          [errorMessages]="{ required: 'form', minlength: 'form' }"
        >
          <andes-form-field [errorMessages]="{ required: 'field' }">
            <input andesFormControl [formControl]="a" />
          </andes-form-field>
          <andes-form-field>
            <input andesFormControl [formControl]="b" />
          </andes-form-field>
          <andes-form-field>
            <input andesFormControl [formControl]="c" />
          </andes-form-field>
          <andes-form-field>
            <input andesFormControl [formControl]="d" />
          </andes-form-field>
        </div>`,
        providers: [
          provideAndesFormErrorMessages({
            minlength: 'provided',
            email: 'provided',
          }),
        ],
      })
      class PrecedenceHost {
        readonly a = new FormControl('', Validators.required);
        readonly b = new FormControl('', Validators.required);
        readonly c = new FormControl('x', Validators.email);
        readonly d = new FormControl('x', Validators.maxLength(0));
      }
      const fixture = TestBed.createComponent(PrecedenceHost);
      const host = fixture.componentInstance;
      [host.a, host.b, host.c, host.d].forEach((c) => c.markAsTouched());
      fixture.detectChanges();
      const texts = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '.andes-form-field__help',
        ),
      ).map((n) => n.textContent?.trim());
      expect(texts).toEqual([
        'field',
        'form',
        'provided',
        'Enter no more than 0 characters.',
      ]);
    });

    it('stays out of the way when an <andes-form-error> was authored', () => {
      @Component({
        imports: [...IMPORTS, AndesFormError],
        template: `<andes-form-field>
          <input andesFormControl [formControl]="c" />
          <andes-form-error>Custom.</andes-form-error>
        </andes-form-field>`,
      })
      class AuthoredErrorHost {
        readonly c = new FormControl('', Validators.required);
      }
      const fixture = TestBed.createComponent(AuthoredErrorHost);
      fixture.componentInstance.c.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.andes-form-error')?.textContent?.trim()).toBe(
        'Custom.',
      );
      expect(el.querySelector('.andes-form-field__help')).toBeNull();
    });
  });

  describe('help and extra', () => {
    it('shows help in place of the generated messages, even before interaction', () => {
      const { help, blur, update } = setup((h) =>
        h.help.set('Pick something memorable.'),
      );
      expect(help()?.textContent?.trim()).toBe('Pick something memorable.');
      expect(help()?.getAttribute('role')).toBeNull();
      blur();
      expect(help()?.textContent?.trim()).toBe('Pick something memorable.');
      update((h) => h.help.set(''));
      expect(help()).toBeNull();
    });

    it('renders extra below, wired into aria-describedby after the help', () => {
      const { el, input, update } = setup((h) => h.help.set('Help.'));
      update((h) => h.extra.set('Extra.'));
      const extra = el.querySelector('.andes-form-field__extra') as HTMLElement;
      expect(extra.textContent?.trim()).toBe('Extra.');
      const ids = input.getAttribute('aria-describedby')?.split(' ');
      expect(ids).toEqual([
        el.querySelector('.andes-form-field__help')?.id,
        extra.id,
      ]);
    });

    it('hides the messages area entirely when there is nothing to show', () => {
      const { el, update } = setup();
      const messages = el.querySelector('.andes-form-field__messages');
      expect(messages?.classList).toContain(
        'andes-form-field__messages--empty',
      );
      update((h) => h.extra.set('Extra.'));
      expect(messages?.classList).not.toContain(
        'andes-form-field__messages--empty',
      );
    });
  });

  describe('label: required mark, optional mark, tooltip, label input', () => {
    const mark = (el: HTMLElement) =>
      el.querySelector('.andes-form-label__required');
    const optional = (el: HTMLElement) =>
      el.querySelector('.andes-form-label__optional');

    it('renders the label input as a real associated <label>', () => {
      const { el, input } = setup();
      const label = el.querySelector('label') as HTMLLabelElement;
      expect(label.textContent).toContain('Name');
      expect(label.htmlFor).toBe(input.id);
      expect(label.control).toBe(input);
    });

    it('auto-marks a Validators.required control with an aria-hidden asterisk', () => {
      const { el } = setup();
      expect(mark(el)?.textContent).toBe('*');
      expect(mark(el)?.getAttribute('aria-hidden')).toBe('true');
      expect(mark(el)?.closest('label')).not.toBeNull();
    });

    it('does not mark a non-required control, and follows validators changed at runtime', () => {
      const { el, fixture } = setup((h) => {
        h.control = new FormControl('');
      });
      expect(mark(el)).toBeNull();
      const control = fixture.componentInstance.control;
      control.addValidators(Validators.required);
      control.updateValueAndValidity();
      fixture.detectChanges();
      expect(mark(el)).not.toBeNull();
    });

    it('lets the required input force the mark off on a required control', () => {
      const { el, update } = setup((h) => h.required.set(false));
      expect(mark(el)).toBeNull();
      update((h) => h.required.set(undefined));
      expect(mark(el)).not.toBeNull();
    });

    it('lets the required input force the mark on for a control with no validator', () => {
      const { el } = setup((h) => {
        h.required.set(true);
        h.control = new FormControl('');
      });
      expect(mark(el)).not.toBeNull();
    });

    it('requiredMark=false hides it; "optional" marks only the non-required fields', () => {
      const { el, update } = setup((h) => h.requiredMark.set(false));
      expect(mark(el)).toBeNull();
      update((h) => h.requiredMark.set('optional'));
      expect(mark(el)).toBeNull();
      expect(optional(el)).toBeNull();
      update((h) => h.required.set(false));
      expect(optional(el)?.textContent?.trim()).toBe('(optional)');
    });

    it('marks a template-driven field from its native required attribute', () => {
      @Component({
        imports: [FormsModule, AndesFormField, AndesFormControl],
        template: `<andes-form-field label="Nick">
          <input andesFormControl name="nick" required [(ngModel)]="nick" />
        </andes-form-field>`,
      })
      class TemplateDrivenHost {
        nick = '';
      }
      const fixture = TestBed.createComponent(TemplateDrivenHost);
      fixture.detectChanges();
      expect(mark(fixture.nativeElement)).not.toBeNull();
    });

    it('renders a tooltip trigger OUTSIDE the <label>, described by a hidden tooltip', () => {
      const { el } = setup((h) => h.tooltip.set('Your legal name.'));
      const trigger = el.querySelector(
        '.andes-form-label__tooltip-trigger',
      ) as HTMLButtonElement;
      const tip = el.querySelector('[role="tooltip"]') as HTMLElement;
      expect(trigger.closest('label')).toBeNull();
      expect(trigger.type).toBe('button');
      expect(trigger.getAttribute('aria-label')).toBe('More information');
      expect(trigger.getAttribute('aria-describedby')).toBe(tip.id);
      expect(tip.textContent?.trim()).toBe('Your legal name.');
      expect(tip.hidden).toBe(true);
    });

    it('opens the tooltip on focus and hover, and closes it on Escape/blur/leave', () => {
      const { el, fixture } = setup((h) => h.tooltip.set('Tip.'));
      const trigger = el.querySelector(
        '.andes-form-label__tooltip-trigger',
      ) as HTMLButtonElement;
      const wrap = el.querySelector(
        '.andes-form-label__tooltip',
      ) as HTMLElement;
      const tip = () => el.querySelector('[role="tooltip"]') as HTMLElement;
      const fire = (target: HTMLElement, event: Event) => {
        target.dispatchEvent(event);
        fixture.detectChanges();
      };

      fire(trigger, new FocusEvent('focus'));
      expect(tip().hidden).toBe(false);
      fire(trigger, new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(tip().hidden).toBe(true);
      fire(wrap, new MouseEvent('mouseenter'));
      expect(tip().hidden).toBe(false);
      fire(wrap, new MouseEvent('mouseleave'));
      expect(tip().hidden).toBe(true);
    });
  });

  describe('layout, columns and colon', () => {
    @Component({
      imports: [...IMPORTS, AndesForm],
      template: `<form
        andesForm
        [layout]="layout()"
        [labelCol]="labelCol()"
        [wrapperCol]="wrapperCol()"
        [labelAlign]="labelAlign()"
        [labelWrap]="labelWrap()"
        [colon]="colon()"
      >
        <andes-form-field
          label="Email"
          [layout]="fieldLayout()"
          [colon]="fieldColon()"
        >
          <input andesFormControl [formControl]="c" />
        </andes-form-field>
        <andes-form-field>
          <button type="submit">Save</button>
        </andes-form-field>
      </form>`,
    })
    class LayoutHost {
      readonly c = new FormControl('');
      readonly layout = signal<AndesFormLayout>('horizontal');
      readonly fieldLayout = signal<AndesFormLayout | undefined>(undefined);
      readonly labelCol = signal<AndesFormColumn | undefined>(undefined);
      readonly wrapperCol = signal<AndesFormColumn | undefined>(undefined);
      readonly labelAlign = signal<AndesFormLabelAlign>('right');
      readonly labelWrap = signal(false);
      readonly colon = signal(true);
      readonly fieldColon = signal<boolean | undefined>(undefined);
    }

    function layoutSetup() {
      const fixture = TestBed.createComponent(LayoutHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const fields = () =>
        Array.from(el.querySelectorAll<HTMLElement>('.andes-form-field'));
      const update = (fn: (h: LayoutHost) => void) => {
        fn(fixture.componentInstance);
        fixture.detectChanges();
      };
      const colon = () => el.querySelector('.andes-form-label__colon');
      return { el, fields, update, colon };
    }

    it('lays a horizontal field out as a two-column grid, label one third by default', () => {
      const { fields } = layoutSetup();
      const [field] = fields();
      expect(field.classList).toContain('andes-form-field--horizontal');
      expect(field.style.gridTemplateColumns).toBe('33.3333% minmax(0, 1fr)');
      expect(getComputedStyle(field).display).toBe('grid');
    });

    it('sizes the columns from labelCol/wrapperCol spans (of 24) or CSS lengths', () => {
      const { fields, update } = layoutSetup();
      update((h) => {
        h.labelCol.set(6);
        h.wrapperCol.set(12);
      });
      expect(fields()[0].style.gridTemplateColumns).toBe('25% 50%');
      update((h) => {
        h.labelCol.set('10rem');
        h.wrapperCol.set(undefined);
      });
      expect(fields()[0].style.gridTemplateColumns).toBe(
        '10rem minmax(0, 1fr)',
      );
    });

    it('keeps the empty label column on a label-less horizontal field (submit row alignment)', () => {
      const { fields } = layoutSetup();
      const tail = fields()[1];
      expect(tail.classList).toContain('andes-form-field--no-label');
      expect(
        getComputedStyle(
          tail.querySelector('.andes-form-field__label') as HTMLElement,
        ).display,
      ).not.toBe('none');
    });

    it('reflects labelAlign and labelWrap as classes', () => {
      const { fields, update } = layoutSetup();
      expect(fields()[0].classList).not.toContain(
        'andes-form-field--label-left',
      );
      update((h) => {
        h.labelAlign.set('left');
        h.labelWrap.set(true);
      });
      expect(fields()[0].classList).toContain('andes-form-field--label-left');
      expect(fields()[0].classList).toContain('andes-form-field--label-wrap');
    });

    it('shows the colon in horizontal layout only, and honours colon=false at either level', () => {
      const { colon, update } = layoutSetup();
      expect(colon()?.getAttribute('aria-hidden')).toBe('true');
      expect(colon()?.closest('label')).toBeNull();
      update((h) => h.colon.set(false));
      expect(colon()).toBeNull();
      update((h) => h.fieldColon.set(true));
      expect(colon()).not.toBeNull();
      update((h) => h.layout.set('vertical'));
      expect(colon()).toBeNull();
    });

    it('lets a field override the form layout, and drops the inline grid style off-horizontal', () => {
      const { fields, update } = layoutSetup();
      update((h) => h.fieldLayout.set('vertical'));
      expect(fields()[0].classList).toContain('andes-form-field--vertical');
      expect(fields()[0].style.gridTemplateColumns).toBe('');
      expect(fields()[1].classList).toContain('andes-form-field--horizontal');
    });

    it('supports inline layout on both the form and its fields', () => {
      const { el, fields, update } = layoutSetup();
      update((h) => h.layout.set('inline'));
      expect(el.querySelector('form')?.classList).toContain(
        'andes-form--inline',
      );
      expect(fields()[0].classList).toContain('andes-form-field--inline');
    });

    it('defaults to the pre-existing vertical stack with no andesForm at all', () => {
      const { root, el } = setup();
      expect(root().classList).toContain('andes-form-field--vertical');
      expect(getComputedStyle(root()).flexDirection).toBe('column');
      expect(el.querySelector('.andes-form-label__colon')).toBeNull();
    });
  });

  describe('noStyle', () => {
    @Component({
      imports: IMPORTS,
      template: `<andes-form-field label="Phone">
        <andes-form-field noStyle>
          <input class="prefix" andesFormControl [formControl]="prefix" />
        </andes-form-field>
        <andes-form-field noStyle>
          <input class="number" andesFormControl [formControl]="number" />
        </andes-form-field>
      </andes-form-field>`,
    })
    class NoStyleHost {
      readonly prefix = new FormControl('', Validators.required);
      readonly number = new FormControl('', Validators.minLength(6));
    }

    function noStyleSetup() {
      const fixture = TestBed.createComponent(NoStyleHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const [parent, first, second] = Array.from(
        el.querySelectorAll<HTMLElement>('.andes-form-field'),
      );
      return { fixture, el, parent, first, second };
    }

    it('renders the children chrome-free (display: contents, no label/messages)', () => {
      const { first } = noStyleSetup();
      expect(first.classList).toContain('andes-form-field--no-style');
      expect(getComputedStyle(first).display).toBe('contents');
      expect(
        getComputedStyle(
          first.querySelector('.andes-form-field__messages') as HTMLElement,
        ).display,
      ).toBe('none');
    });

    it('surfaces every child`s status and messages on the parent field', () => {
      const { fixture, el, parent } = noStyleSetup();
      const host = fixture.componentInstance;
      host.number.setValue('12');
      host.number.markAsTouched();
      fixture.detectChanges();
      expect(parent.getAttribute('data-status')).toBe('error');
      expect(
        Array.from(
          parent.querySelectorAll(
            ':scope > .andes-form-field__messages .andes-form-field__help-item',
          ),
        ).map((n) => n.textContent?.trim()),
      ).toEqual(['Enter at least 6 characters.']);

      host.prefix.markAsTouched();
      fixture.detectChanges();
      expect(
        parent.querySelectorAll(
          ':scope > .andes-form-field__messages .andes-form-field__help-item',
        ).length,
      ).toBe(2);

      host.prefix.setValue('+51');
      host.number.setValue('987654');
      fixture.detectChanges();
      expect(parent.getAttribute('data-status')).toBe('success');
      expect(el.querySelector('.andes-form-field__help')).toBeNull();
    });

    it('describes each child control by the parent`s messages', () => {
      const { fixture, el, parent } = noStyleSetup();
      fixture.componentInstance.number.setValue('1');
      fixture.componentInstance.number.markAsTouched();
      fixture.detectChanges();
      const helpId = parent.querySelector(
        ':scope > .andes-form-field__messages > .andes-form-field__help',
      )?.id;
      expect(helpId).toBeTruthy();
      expect(
        el.querySelector('.number')?.getAttribute('aria-describedby'),
      ).toBe(helpId);
      expect(
        el.querySelector('.prefix')?.getAttribute('aria-describedby'),
      ).toBe(helpId);
    });

    it('keeps aria-invalid on the child control that is actually invalid', () => {
      const { fixture, el } = noStyleSetup();
      fixture.componentInstance.number.markAsTouched();
      fixture.componentInstance.number.setValue('1');
      fixture.detectChanges();
      expect(el.querySelector('.number')?.getAttribute('aria-invalid')).toBe(
        'true',
      );
      expect(el.querySelector('.prefix')?.hasAttribute('aria-invalid')).toBe(
        false,
      );
    });
  });
});
