import { Component, computed, input, signal } from '@angular/core';
import {
  type AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import {
  AndesForm,
  injectAndesFormDisabled,
  injectAndesFormSize,
  injectAndesFormVariant,
} from './form';
import { AndesFormControl } from './form-control';
import { AndesFormField } from './form-field';
import type {
  AndesFormInvalidSubmit,
  AndesFormLabelAlign,
  AndesFormLayout,
  AndesFormRequiredMark,
  AndesFormShowErrorsOn,
  AndesFormSize,
  AndesFormVariant,
} from './form-field-tokens';
import { AndesFormLabel } from './form-label';
import { withDemoControls } from './form-field.stories';

/**
 * Stand-in for a control on another branch adopting the size hook: it defaults its own
 * `size` from the enclosing `andesForm` via `injectAndesFormSize()`.
 */
@Component({
  selector: 'andes-demo-size-readout',
  template: `<code
    style="font-size: 0.75rem; color: var(--andes-color-muted-foreground);"
    >injectAndesFormSize() → {{ effective() }}</code
  >`,
})
class DemoSizeReadout {
  readonly size = input<AndesFormSize | undefined>(undefined);
  private readonly formSize = injectAndesFormSize();
  protected readonly effective = computed(
    () => this.size() ?? this.formSize() ?? 'md (default)',
  );
}

/** Stand-in for a non-form control (an action button, an uploader) that follows the form's
 *  `variant` and `disabled` through the DI hooks. */
@Component({
  selector: 'andes-demo-hint-readout',
  template: `<code
    style="font-size: 0.75rem; color: var(--andes-color-muted-foreground);"
    >injectAndesFormVariant() → {{ variant() ?? 'undefined' }} ·
    injectAndesFormDisabled() → {{ disabled() }}</code
  >`,
})
class DemoHintReadout {
  protected readonly variant = injectAndesFormVariant();
  protected readonly disabled = injectAndesFormDisabled();
}

const moduleMetadata = {
  imports: [
    ReactiveFormsModule,
    AndesForm,
    AndesFormField,
    AndesFormLabel,
    AndesFormControl,
    AndesButton,
    DemoSizeReadout,
    DemoHintReadout,
  ],
};

/** Shared look for the small result panels the stories below print into. */
const LOG_STYLE =
  'margin: 0; padding: 0.5rem 0.75rem; border-radius: var(--andes-radius-md); background: var(--andes-color-muted); color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif; font-size: 0.75rem; line-height: 1.25rem; white-space: pre-wrap;';

interface FormArgs {
  layout: AndesFormLayout;
  labelAlign: AndesFormLabelAlign;
  labelCol: number;
  labelWrap: boolean;
  colon: boolean;
  requiredMark: AndesFormRequiredMark;
  size: AndesFormSize | undefined;
}

const meta: Meta<FormArgs> = {
  title: 'Form',
  tags: ['autodocs'],
  decorators: [withDemoControls],
  parameters: {
    docs: {
      description: {
        component: [
          '`andesForm` is an attribute directive for the `<form>` (or any container) that holds',
          'your `AndesFormField`s. It carries the form’s *presentation* settings -',
          '`layout`, `labelCol` / `wrapperCol`, `labelAlign`, `labelWrap`, `colon`,',
          '`requiredMark`, `size`, `variant`, `showErrorsOn`, `feedbackIcons`, `errorMessages`',
          'and `scrollToFirstError` - and hands it to every field through DI. Each field has a',
          'same-named input that overrides it.',
          '',
          'Form **state** is deliberately *not* here: values, validation, reset and submit all',
          'stay with Angular’s `FormGroupDirective` / `NgForm`, which `andesForm` sits alongside',
          'on the same element. The form instance, initial values, value watching, dynamic lists',
          'and cross-form coordination map to `FormGroup`, the `FormControl` constructor,',
          '`valueChanges` / `toSignal`, `FormArray` and plain component composition.',
          '',
          'A few thin conveniences drive or read that same Angular form: `disabled`',
          '(`disable()` / `enable()` on it), `(validSubmit)` / `(invalidSubmit)` (the submit',
          'verdict, after async validators settle, with every failing control path) and',
          '`scrollToField(path)`.',
          '',
          '`size` does not resize anything by itself: controls opt in with',
          '`injectAndesFormSize()` (none of the unmerged andes-ng controls do yet), and it is',
          'reflected as `data-size` for plain CSS. The native controls in these stories use that',
          'attribute.',
        ].join('\n'),
      },
    },
  },
  argTypes: {
    layout: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical', 'inline'],
    },
    labelAlign: { control: 'inline-radio', options: ['left', 'right'] },
    labelCol: { control: { type: 'range', min: 2, max: 16, step: 1 } },
    labelWrap: { control: 'boolean' },
    colon: { control: 'boolean' },
    requiredMark: {
      control: 'inline-radio',
      options: [true, false, 'optional'],
    },
    size: { control: 'inline-radio', options: [undefined, 'sm', 'md', 'lg'] },
  },
  args: {
    layout: 'horizontal',
    labelAlign: 'right',
    labelCol: 8,
    labelWrap: false,
    colon: true,
    requiredMark: true,
    size: undefined,
  },
};

export default meta;

type Story = StoryObj<FormArgs>;

function signUpForm() {
  return new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    company: new FormControl(''),
    plan: new FormControl('pro', Validators.required),
  });
}

const signUpTemplate = (extra = '') => `
  <form
    andesForm
    [formGroup]="form"
    [layout]="layout"
    [labelAlign]="labelAlign"
    [labelCol]="labelCol"
    [labelWrap]="labelWrap"
    [colon]="colon"
    [requiredMark]="requiredMark"
    [size]="size"
    ${extra}
    (ngSubmit)="form.markAllAsTouched()"
    style="max-width: 560px;"
  >
    <andes-form-field label="Full name" tooltip="As printed on your ID." hasFeedback>
      <input andesFormControl formControlName="name" class="andes-demo-control" />
    </andes-form-field>
    <andes-form-field label="Work email address" hasFeedback>
      <input andesFormControl formControlName="email" type="email" class="andes-demo-control" />
    </andes-form-field>
    <andes-form-field label="Company" extra="Leave blank if you are signing up alone.">
      <input andesFormControl formControlName="company" class="andes-demo-control" />
    </andes-form-field>
    <andes-form-field label="Plan">
      <select andesFormControl formControlName="plan" class="andes-demo-control">
        <option value="free">Free</option>
        <option value="pro">Pro</option>
      </select>
    </andes-form-field>
    <andes-form-field>
      <andes-button type="submit">Create account</andes-button>
    </andes-form-field>
  </form>
`;

/** Every form-level option as a control. Submit with empty fields to reveal the errors. */
export const Playground: Story = {
  render: (args) => ({
    moduleMetadata,
    props: { ...args, form: signUpForm() },
    template: signUpTemplate(),
  }),
};

/**
 * `layout="horizontal"`: label and control side by side, the label column one third wide by
 * default (`labelCol` 8 of 24). Labels are right-aligned and truncated unless `labelWrap`;
 * the colon only appears in this layout. The label-less submit field keeps the empty label
 * column, so the button lines up under the controls. The name field was touched to show a
 * message sitting in the control column.
 */
export const Horizontal: Story = {
  args: { layout: 'horizontal' },
  render: (args) => {
    const form = signUpForm();
    form.controls.name.markAsTouched();
    form.controls.email.setValue('ada@lovelace.dev');
    form.controls.email.markAsTouched();
    return {
      moduleMetadata,
      props: { ...args, form },
      template: signUpTemplate(),
    };
  },
};

/** `labelCol` as a CSS length and `labelAlign="left"`, with `labelWrap` on. */
export const HorizontalLeftAlignedFixedWidth: Story = {
  args: { layout: 'horizontal', labelAlign: 'left', labelWrap: true },
  render: (args) => ({
    moduleMetadata,
    props: { ...args, labelCol: '9rem', form: signUpForm() },
    template: signUpTemplate(),
  }),
};

/** The default - identical to fields with no `andesForm` at all. */
export const Vertical: Story = {
  args: { layout: 'vertical' },
  render: (args) => ({
    moduleMetadata,
    props: { ...args, form: signUpForm() },
    template: signUpTemplate(),
  }),
};

/** `layout="inline"`: fields flow in a wrapping row, label beside control. */
export const Inline: Story = {
  args: { layout: 'inline' },
  render: (args) => ({
    moduleMetadata,
    props: {
      ...args,
      form: new FormGroup({
        user: new FormControl('', Validators.required),
        password: new FormControl('', Validators.required),
      }),
    },
    template: `
      <form
        andesForm
        [formGroup]="form"
        [layout]="layout"
        [requiredMark]="requiredMark"
        (ngSubmit)="form.markAllAsTouched()"
      >
        <andes-form-field label="Username">
          <input andesFormControl formControlName="user" class="andes-demo-control" style="width: 12rem;" />
        </andes-form-field>
        <andes-form-field label="Password">
          <input andesFormControl formControlName="password" type="password" class="andes-demo-control" style="width: 12rem;" />
        </andes-form-field>
        <andes-form-field>
          <andes-button type="submit">Log in</andes-button>
        </andes-form-field>
      </form>
    `,
  }),
};

/**
 * `size` cascades through DI: the readout component calls `injectAndesFormSize()`, and the
 * native controls react to the `data-size` the form reflects.
 */
export const SizePropagation: Story = {
  args: { layout: 'vertical' },
  render: (args) => ({
    moduleMetadata,
    props: {
      ...args,
      sizes: ['sm', 'md', 'lg'],
      value: new FormControl('Ada Lovelace'),
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.5rem; max-width: 900px;">
        @for (s of sizes; track s) {
          <div andesForm [size]="s">
            <andes-form-field [label]="'size = ' + s">
              <input andesFormControl [formControl]="value" class="andes-demo-control" />
            </andes-form-field>
            <andes-demo-size-readout />
          </div>
        }
      </div>
    `,
  }),
};

/**
 * `scrollToFirstError`: submit the empty form - the page scrolls to, and focuses, the first
 * field in error (the spacer pushes it off-screen first). Errors show on submit without any
 * `markAllAsTouched()`, because fields also reveal errors once their form is submitted.
 */
export const ScrollToFirstError: Story = {
  args: { layout: 'vertical' },
  render: (args) => ({
    moduleMetadata,
    props: {
      ...args,
      form: new FormGroup({
        first: new FormControl('Filled in'),
        second: new FormControl('', Validators.required),
      }),
    },
    template: `
      <form andesForm scrollToFirstError [formGroup]="form" style="max-width: 360px;">
        <andes-form-field label="First">
          <input andesFormControl formControlName="first" class="andes-demo-control" />
        </andes-form-field>
        <div style="height: 120vh; border-inline-start: 2px dashed var(--andes-color-border); padding-inline-start: 0.5rem; font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-muted-foreground);">
          (spacer)
        </div>
        <andes-form-field label="Second">
          <input andesFormControl formControlName="second" class="andes-demo-control" />
        </andes-form-field>
        <andes-button type="submit" style="position: sticky; bottom: 1rem; align-self: flex-start;">Submit</andes-button>
      </form>
    `,
  }),
};

/**
 * `(validSubmit)` emits the value of a valid submit; `(invalidSubmit)` emits the value plus
 * every failing control as `{ path, errors }` - both after async validators settle, so the
 * username check (≈0.6 s, "admin" is taken) is part of the verdict. `scrollToField(path)`
 * jumps to any field by its control path.
 */
export const SubmitOutputs: Story = {
  args: { layout: 'horizontal' },
  render: (args) => {
    const taken = (control: AbstractControl) =>
      new Promise<ValidationErrors | null>((resolve) =>
        setTimeout(
          () => resolve(control.value === 'admin' ? { taken: true } : null),
          600,
        ),
      );
    const log = signal('Submit the form to see the verdict.');
    return {
      moduleMetadata,
      props: {
        ...args,
        log,
        form: new FormGroup({
          username: new FormControl('admin', {
            validators: Validators.required,
            asyncValidators: taken,
          }),
          address: new FormGroup({
            city: new FormControl('', Validators.required),
          }),
        }),
        onValid: (value: unknown) =>
          log.set('validSubmit\n' + JSON.stringify(value, null, 2)),
        onInvalid: (event: AndesFormInvalidSubmit) =>
          log.set(
            'invalidSubmit\n' +
              event.errors
                .map((e) => e.path.join('.') + ' → ' + Object.keys(e.errors))
                .join('\n'),
          ),
      },
      template: `
        <form
          andesForm
          #f="andesForm"
          [formGroup]="form"
          [layout]="layout"
          [labelCol]="labelCol"
          (validSubmit)="onValid($event)"
          (invalidSubmit)="onInvalid($event)"
          style="width: 100%; max-width: 560px;"
        >
          <andes-form-field label="Username" hasFeedback [errorMessages]="{ taken: 'That username is taken.' }">
            <input andesFormControl formControlName="username" class="andes-demo-control" />
          </andes-form-field>
          <ng-container formGroupName="address">
            <andes-form-field label="City">
              <input andesFormControl formControlName="city" class="andes-demo-control" />
            </andes-form-field>
          </ng-container>
          <andes-form-field>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <andes-button type="submit">Submit</andes-button>
              <andes-button variant="outline" (click)="f.scrollToField('address.city')">Go to city</andes-button>
            </div>
          </andes-form-field>
          <pre style="${LOG_STYLE}">{{ log() }}</pre>
        </form>
      `,
    };
  },
};

/**
 * `disabled` disables the whole Angular form (`disable()`), and re-enables it when switched
 * off. `variant` is a hint, like `size`: controls read both through
 * `injectAndesFormVariant()` / `injectAndesFormDisabled()` - the readout below does - and
 * plain CSS can key off the reflected `data-variant` / `data-disabled`.
 */
export const DisabledAndVariant: Story = {
  args: { layout: 'horizontal' },
  render: (args) => ({
    moduleMetadata,
    props: {
      ...args,
      disabled: signal(true),
      variant: 'filled' satisfies AndesFormVariant,
      form: signUpForm(),
    },
    template: `
      <label style="display: inline-flex; gap: 0.5rem; align-items: center; margin-block-end: 1rem; font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-foreground);">
        <input type="checkbox" [checked]="disabled()" (change)="disabled.set(!disabled())" />
        Disable the form
      </label>
      <form
        andesForm
        [formGroup]="form"
        [layout]="layout"
        [labelCol]="labelCol"
        [disabled]="disabled()"
        [variant]="variant"
        style="width: 100%; max-width: 560px;"
      >
        <andes-form-field label="Full name">
          <input andesFormControl formControlName="name" class="andes-demo-control" />
        </andes-form-field>
        <andes-form-field label="Work email">
          <input andesFormControl formControlName="email" class="andes-demo-control" />
        </andes-form-field>
        <andes-form-field label="Plan">
          <select andesFormControl formControlName="plan" class="andes-demo-control">
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </andes-form-field>
        <andes-form-field>
          <andes-demo-hint-readout />
        </andes-form-field>
      </form>
    `,
  }),
};

/**
 * `showErrorsOn` picks when fields start showing their status - type into each column, tab
 * out, then submit. When validation *runs* stays Angular's `updateOn`.
 */
export const ShowErrorsOn: Story = {
  args: { layout: 'vertical' },
  render: (args) => ({
    moduleMetadata,
    props: {
      ...args,
      gates: [
        'interacted',
        'touched',
        'dirty',
        'submitted',
        'always',
      ] satisfies AndesFormShowErrorsOn[],
      forms: Array.from(
        { length: 5 },
        () =>
          new FormGroup({
            code: new FormControl('', [
              Validators.required,
              Validators.minLength(4),
            ]),
          }),
      ),
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: 1.5rem; max-width: 960px;">
        @for (gate of gates; track gate; let i = $index) {
          <form andesForm [showErrorsOn]="gate" [formGroup]="forms[i]">
            <andes-form-field [label]="gate" hasFeedback>
              <input andesFormControl formControlName="code" class="andes-demo-control" />
            </andes-form-field>
            <andes-button type="submit" variant="outline" size="sm" style="align-self: flex-start;">Submit</andes-button>
          </form>
        }
      </div>
    `,
  }),
};

/**
 * Dynamic rows with a plain `FormArray`: every row is its own field (only the first one
 * labelled, the rest keep the empty label column so they line up), and the array-level
 * validator's error is shown on the field holding the add button through `validateStatus` +
 * `help`. Nothing beyond `FormArray` is needed.
 */
export const DynamicRows: Story = {
  args: { layout: 'horizontal' },
  render: (args) => {
    const emails = new FormArray(
      [
        new FormControl('ada@lovelace.dev', [
          Validators.required,
          Validators.email,
        ]),
      ],
      // `required` on an array fails while it is empty.
      Validators.required,
    );
    const form = new FormGroup({ emails });
    const log = signal('');
    return {
      moduleMetadata,
      props: {
        ...args,
        form,
        emails,
        log,
        add: () =>
          emails.push(
            new FormControl('', [Validators.required, Validators.email]),
          ),
        remove: (index: number) => {
          emails.removeAt(index);
          emails.markAsTouched();
        },
        onValid: (value: unknown) => log.set(JSON.stringify(value)),
      },
      template: `
        <form
          andesForm
          [formGroup]="form"
          [layout]="layout"
          [labelCol]="labelCol"
          (validSubmit)="onValid($event)"
          style="width: 100%; max-width: 560px;"
        >
          <ng-container formArrayName="emails">
            @for (control of emails.controls; track control; let i = $index) {
              <andes-form-field [label]="i === 0 ? 'Notify' : undefined">
                <div style="display: flex; gap: 0.5rem;">
                  <input andesFormControl [formControlName]="i" type="email" placeholder="name@company.com" class="andes-demo-control" />
                  <andes-button variant="ghost" size="icon" [aria-label]="'Remove email ' + (i + 1)" (click)="remove(i)">✕</andes-button>
                </div>
              </andes-form-field>
            }
          </ng-container>
          <andes-form-field
            [label]="emails.length === 0 ? 'Notify' : undefined"
            [validateStatus]="emails.errors && emails.touched ? 'error' : undefined"
            [help]="emails.errors && emails.touched ? 'Add at least one email.' : undefined"
          >
            <div style="display: flex; gap: 0.5rem;">
              <andes-button variant="dashed" (click)="add()">Add email</andes-button>
              <andes-button type="submit">Save</andes-button>
            </div>
          </andes-form-field>
          @if (log()) {
            <pre style="${LOG_STYLE}">validSubmit {{ log() }}</pre>
          }
        </form>
      `,
    };
  },
};

/**
 * `requiredMark` also takes a template, rendered after every label with `$implicit` = whether
 * the field is required - here a "Required" / "Optional" tag.
 */
export const CustomRequiredMark: Story = {
  args: { layout: 'vertical' },
  render: (args) => ({
    moduleMetadata,
    props: { ...args, form: signUpForm() },
    template: `
      <ng-template #tag let-required>
        <span
          [style.color]="required ? 'var(--andes-color-danger-hover)' : 'var(--andes-color-muted-foreground)'"
          style="margin-inline-start: 0.375rem; padding: 0 0.375rem; border: 1px solid currentColor; border-radius: var(--andes-radius-sm); font-size: 0.75rem; font-weight: normal;"
          >{{ required ? 'Required' : 'Optional' }}</span
        >
      </ng-template>
      <form andesForm [formGroup]="form" [requiredMark]="tag" style="max-width: 360px;">
        <andes-form-field label="Full name">
          <input andesFormControl formControlName="name" class="andes-demo-control" />
        </andes-form-field>
        <andes-form-field label="Company">
          <input andesFormControl formControlName="company" class="andes-demo-control" />
        </andes-form-field>
      </form>
    `,
  }),
};
