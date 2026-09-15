import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesFormControl } from './form-control';
import { AndesFormDescription } from './form-description';
import { AndesFormError } from './form-error';
import { AndesFormField } from './form-field';
import { AndesFormLabel } from './form-label';

const fieldModuleMetadata = {
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AndesFormField,
    AndesFormLabel,
    AndesFormControl,
    AndesFormDescription,
    AndesFormError,
  ],
};

const controlStyle =
  'width: 100%; box-sizing: border-box; padding: 0.5rem; border-radius: 0.375rem; border: 1px solid var(--andes-color-input);';

const meta: Meta<AndesFormField> = {
  title: 'Form Field',
  component: AndesFormField,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<AndesFormField>;

/**
 * The core anatomy: label, a native input carrying `andesFormControl` alongside
 * `[formControl]`, a description and an error. Focus the input then blur it without typing
 * anything to see the error appear - it stays hidden on load even though the field is
 * already invalid (empty + required), matching the idiomatic Angular
 * "invalid && (touched || dirty)" rule instead of shouting at the user immediately.
 */
export const Basic: Story = {
  render: () => ({
    moduleMetadata: fieldModuleMetadata,
    props: {
      email: new FormControl('', {
        validators: [Validators.required, Validators.email],
      }),
      controlStyle,
    },
    template: `
      <div style="max-width: 320px;">
        <andes-form-field>
          <andes-form-label>Email</andes-form-label>
          <input
            andesFormControl
            [formControl]="email"
            type="email"
            placeholder="you@example.com"
            [style]="controlStyle"
          />
          <andes-form-description>
            We'll only use this to send your receipt.
          </andes-form-description>
          <andes-form-error>Enter a valid email address.</andes-form-error>
        </andes-form-field>
      </div>
    `,
  }),
};

/**
 * A small reactive form (`FormGroup`) with two fields, each independently wired, plus a
 * submit button that force-marks everything as touched (`markAllAsTouched`) - the standard
 * Angular pattern for surfacing every remaining error on a failed submit attempt.
 */
export const ReactiveFormExample: Story = {
  render: () => {
    const form = new FormGroup({
      name: new FormControl('', { validators: Validators.required }),
      country: new FormControl('', { validators: Validators.required }),
    });
    return {
      moduleMetadata: fieldModuleMetadata,
      props: {
        form,
        controlStyle,
        submitted: false,
        submit: function (this: { submitted: boolean }) {
          if (form.invalid) {
            form.markAllAsTouched();
            return;
          }
          this.submitted = true;
        },
      },
      template: `
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          style="max-width: 360px; display: flex; flex-direction: column; gap: 1.25rem;"
        >
          <andes-form-field>
            <andes-form-label>Full name</andes-form-label>
            <input andesFormControl formControlName="name" [style]="controlStyle" />
            <andes-form-error>Your name is required.</andes-form-error>
          </andes-form-field>

          <andes-form-field>
            <andes-form-label>Country</andes-form-label>
            <select andesFormControl formControlName="country" [style]="controlStyle">
              <option value="">Select a country</option>
              <option value="pe">Peru</option>
              <option value="cl">Chile</option>
              <option value="co">Colombia</option>
            </select>
            <andes-form-description>Used to calculate shipping.</andes-form-description>
            <andes-form-error>Please pick a country.</andes-form-error>
          </andes-form-field>

          <button type="submit" style="align-self: flex-start;">Submit</button>
          @if (submitted) {
            <p>Submitted: {{ form.value | json }}</p>
          }
        </form>
      `,
    };
  },
};

/**
 * Works identically with `[(ngModel)]` (template-driven forms) instead of Reactive Forms -
 * `AndesFormControl` reads whichever `NgControl` is present (`FormControlName`,
 * `FormControlDirective` or `NgModel`) without caring which.
 */
export const WithNgModel: Story = {
  render: () => ({
    moduleMetadata: fieldModuleMetadata,
    props: { nickname: '', controlStyle },
    template: `
      <div style="max-width: 320px;">
        <andes-form-field>
          <andes-form-label>Nickname</andes-form-label>
          <input
            andesFormControl
            name="nickname"
            required
            [(ngModel)]="nickname"
            [style]="controlStyle"
          />
          <andes-form-error>A nickname is required.</andes-form-error>
        </andes-form-field>
      </div>
    `,
  }),
};

/**
 * A description with no error slot at all, and an error slot with no description - both
 * parts are fully optional and `aria-describedby` only ever includes the ones actually
 * present.
 */
export const DescriptionOnly: Story = {
  render: () => ({
    moduleMetadata: fieldModuleMetadata,
    props: {
      value: new FormControl(''),
      controlStyle,
    },
    template: `
      <div style="max-width: 320px;">
        <andes-form-field>
          <andes-form-label>Coupon code</andes-form-label>
          <input andesFormControl [formControl]="value" [style]="controlStyle" />
          <andes-form-description>Optional - leave blank if you don't have one.</andes-form-description>
        </andes-form-field>
      </div>
    `,
  }),
};
