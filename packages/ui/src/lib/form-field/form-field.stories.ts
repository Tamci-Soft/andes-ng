import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
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
    // The one andes-ng control this package can depend on today: AndesButton is already on
    // `develop`. AndesInput/AndesSelect are still unmerged branches of their own - see the
    // "Using andes-ng's own controls" section of the docs below.
    AndesButton,
  ],
};

const controlStyle =
  'width: 100%; box-sizing: border-box; padding: 0.5rem; border-radius: 0.375rem; border: 1px solid var(--andes-color-input);';

const meta: Meta<AndesFormField> = {
  title: 'Form Field',
  component: AndesFormField,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Wire `andesFormControl` onto the control itself, alongside `formControlName` /',
          '`[formControl]` / `[(ngModel)]`. For a **native** `<input>` / `<textarea>` /',
          '`<select>` everything (`id`/`for`, `aria-describedby`, `aria-invalid`,',
          '`aria-required`) is derived and applied automatically - nothing to hand-wire. That is',
          'what the stories below render.',
          '',
          '### Using andes-ng’s own controls',
          '',
          'For a wrapper component that renders its real control inside its own template',
          '(`AndesInput`, `AndesSelect`, `AndesCheckbox`, `AndesSwitch`, `AndesRadioGroup`,',
          '`AndesSlider`), `andesFormControl` sits on the outer custom element, which is not a',
          'labelable form control and is deliberately kept out of the accessibility tree by',
          "those components' own host metadata. Writing `id`/`aria-*` there would reach neither",
          'the `<label for>` machinery nor the buried native control, so the directive writes',
          'nothing at all in that case and instead exposes `resolvedId()`, `labelledBy()`,',
          "`describedBy()`, `showError()` and `isRequired()` for you to bind into the wrapper's",
          'own inputs.',
          '',
          '**`AndesInput` is fully supported by that pattern** - verified against its own',
          'component source: it exposes `id`, `aria-labelledby`, `aria-describedby` and',
          '`aria-invalid` inputs, nulls each of them on its host element and forwards them onto',
          'the real `<input>` in its template, so the label is correctly associated *and*',
          'clickable. Its `required` input puts the native `required` attribute on that same',
          'inner `<input>`, which already implies `aria-required`:',
          '',
          '```html',
          '<andes-form-field #field="andesFormField">',
          '  <andes-form-label>Full name</andes-form-label>',
          '  <andes-input',
          '    andesFormControl',
          '    #ctrl="andesFormControl"',
          '    formControlName="name"',
          '    [id]="field.controlId()"',
          '    [aria-describedby]="ctrl.describedBy()"',
          '    [aria-invalid]="ctrl.showError()"',
          '    [required]="ctrl.isRequired()"',
          '  />',
          '  <andes-form-error>Your name is required.</andes-form-error>',
          '</andes-form-field>',
          '```',
          '',
          '### Known limitation: wrappers with no `id` input',
          '',
          '`AndesSelect`, `AndesCheckbox`, `AndesSwitch`, `AndesRadioGroup` and `AndesSlider`',
          'expose **no `id` input**, so `[id]="field.controlId()"` has nowhere to land and the',
          "label's `for` stays dangling - deliberately detectable rather than silently pointing",
          'at an element the platform refuses to associate. Adding an `id` input to each of them',
          'is the proper fix and has to happen on their own branches.',
          '',
          'All five *do* accept `aria-labelledby` and forward it onto their real internal',
          'control, so `AndesFormLabel` now stamps an id onto the `<label>` it renders and the',
          'field exposes it as `labelledBy()`. That gives those controls a correct accessible',
          'name today, without changing a line of their source:',
          '',
          '```html',
          '<andes-form-field>',
          '  <andes-form-label>Country</andes-form-label>',
          '  <andes-select',
          '    andesFormControl',
          '    #ctrl="andesFormControl"',
          '    formControlName="country"',
          '    [aria-labelledby]="ctrl.labelledBy()"',
          '    [aria-describedby]="ctrl.describedBy()"',
          '    [aria-invalid]="ctrl.showError()"',
          '  >',
          '    <andes-select-trigger><andes-select-value /></andes-select-trigger>',
          '    <andes-select-content>',
          '      <andes-select-item value="pe">Peru</andes-select-item>',
          '    </andes-select-content>',
          '  </andes-select>',
          '  <andes-form-error>Please pick a country.</andes-form-error>',
          '</andes-form-field>',
          '```',
          '',
          'It is an improvement, not a full substitute: `aria-labelledby` supplies the accessible',
          'name, but only a native `for`/`id` pair makes the label **clickable**. Label-click',
          'focus is the one thing still genuinely missing for those five.',
          '',
          '### Why these stories still render native controls',
          '',
          'Only `AndesButton` (used for the submit action in **Reactive Form Example**) has landed',
          'on `develop` so far. `AndesInput` and `AndesSelect` are still open, unmerged PRs of',
          'their own - and `AndesSelect` additionally depends on the overlay and list-navigation',
          'primitives, which are two further unmerged PRs. Importing them here would make this',
          'package fail to build until all of those merge, so the live examples stay on native',
          'controls and the wiring for the andes-ng controls is documented above instead. Swap',
          'them in - using exactly the snippets above - once those branches are on `develop`.',
        ].join('\n'),
      },
    },
  },
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
 * A small reactive form (`FormGroup`) with two fields, each independently wired, plus an
 * `AndesButton` submit that force-marks everything as touched (`markAllAsTouched`) - the
 * standard Angular pattern for surfacing every remaining error on a failed submit attempt.
 *
 * The submit uses the library's own `<andes-button type="submit">`: its internal `<button>`
 * is still a descendant of this `<form>`, so implicit submission and `(ngSubmit)` behave
 * exactly as with a native button. The two controls are native `<input>`/`<select>` for the
 * reason documented on the component above - `AndesInput`/`AndesSelect` are not on `develop`
 * yet - and are the fully-automatic wiring path in the meantime.
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

          <andes-button type="submit" style="align-self: flex-start;">Submit</andes-button>
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
 * `FormControlDirective` or `NgModel`) without caring which. The `AndesButton` here only
 * echoes the current value; the field itself needs no submit to work.
 */
export const WithNgModel: Story = {
  render: () => ({
    moduleMetadata: fieldModuleMetadata,
    props: { nickname: '', echoed: '', controlStyle },
    template: `
      <div style="max-width: 320px; display: flex; flex-direction: column; gap: 1rem;">
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
        <andes-button
          variant="secondary"
          style="align-self: flex-start;"
          (click)="echoed = nickname"
          >Greet me</andes-button
        >
        @if (echoed) {
          <p>Hello, {{ echoed }}!</p>
        }
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
