import { Component, computed, input } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesForm, injectAndesFormSize } from './form';
import { AndesFormControl } from './form-control';
import { AndesFormField } from './form-field';
import type {
  AndesFormLabelAlign,
  AndesFormLayout,
  AndesFormRequiredMark,
  AndesFormSize,
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

const moduleMetadata = {
  imports: [
    ReactiveFormsModule,
    AndesForm,
    AndesFormField,
    AndesFormLabel,
    AndesFormControl,
    AndesButton,
    DemoSizeReadout,
  ],
};

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
          'your `AndesFormField`s. It carries the *presentation* half of Ant Design’s `<Form>` -',
          '`layout`, `labelCol` / `wrapperCol`, `labelAlign`, `labelWrap`, `colon`,',
          '`requiredMark`, `size`, `errorMessages` (Ant’s `validateMessages`) and',
          '`scrollToFirstError` - and hands it to every field through DI. Each field has a',
          'same-named input that overrides it.',
          '',
          'Form **state** is deliberately *not* here: values, validation, `disabled`, reset and',
          'submit all stay with Angular’s `FormGroupDirective` / `NgForm`, which `andesForm` sits',
          'alongside on the same element. Ant’s `useForm` / `FormInstance`, `onFinish`,',
          '`initialValues`, `Form.List` and `Form.Provider` map to `FormGroup`, `(ngSubmit)`,',
          'the `FormControl` constructor, `FormArray` and plain component composition.',
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
