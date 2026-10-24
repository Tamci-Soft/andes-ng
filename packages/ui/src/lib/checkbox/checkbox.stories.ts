import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesCheckbox } from './checkbox';

const meta: Meta<AndesCheckbox> = {
  title: 'Checkbox',
  component: AndesCheckbox,
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    required: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    labelPosition: { control: 'inline-radio', options: ['end', 'start'] },
    name: { control: 'text' },
    value: { control: 'text' },
  },
  args: {
    checked: false,
    disabled: false,
    indeterminate: false,
    required: false,
    readOnly: false,
    labelPosition: 'end',
  },
  render: (args) => ({
    props: args,
    template: `<andes-checkbox [checked]="checked" [disabled]="disabled" [indeterminate]="indeterminate" [required]="required" [readOnly]="readOnly" [labelPosition]="labelPosition" [name]="name" [value]="value">Accept terms and conditions</andes-checkbox>`,
  }),
};

export default meta;

type Story = StoryObj<AndesCheckbox>;

export const Unchecked: Story = {
  args: { checked: false },
};

export const Checked: Story = {
  args: { checked: true },
};

export const Indeterminate: Story = {
  args: { indeterminate: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledChecked: Story = {
  args: { disabled: true, checked: true },
};

export const DisabledIndeterminate: Story = {
  args: { disabled: true, indeterminate: true },
};

export const ReadOnly: Story = {
  args: { readOnly: true, checked: true },
};

export const Invalid: Story = {
  render: (args) => ({
    props: args,
    template: `<andes-checkbox [checked]="checked" aria-invalid="true">Accept terms and conditions</andes-checkbox>`,
  }),
};

export const WithoutLabel: Story = {
  render: (args) => ({
    props: args,
    template: `<andes-checkbox [checked]="checked" aria-label="Select row" />`,
  }),
};

export const ReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule] },
    props: { control: new FormControl(false, { nonNullable: true }) },
    template: `<andes-checkbox [formControl]="control">Subscribe to newsletter</andes-checkbox>`,
  }),
};

export const TemplateDrivenForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [FormsModule] },
    props: { value: false },
    template: `<andes-checkbox [(ngModel)]="value">Subscribe to newsletter</andes-checkbox>`,
  }),
};

export const AllStates: Story = {
  render: () => ({
    // `checked`/`indeterminate` are `model()`s, which - unlike `disabled`'s plain
    // `input({ transform: booleanAttribute })` - don't support a transform (a two-way
    // binding's output must emit exactly the type its input accepts), so a bare, bracket-less
    // attribute isn't accepted for them; bind the literal with brackets instead.
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <andes-checkbox>Unchecked</andes-checkbox>
        <andes-checkbox [checked]="true">Checked</andes-checkbox>
        <andes-checkbox [indeterminate]="true">Indeterminate</andes-checkbox>
        <andes-checkbox disabled>Disabled unchecked</andes-checkbox>
        <andes-checkbox disabled [checked]="true">Disabled checked</andes-checkbox>
        <andes-checkbox disabled [indeterminate]="true">Disabled indeterminate</andes-checkbox>
        <andes-checkbox readOnly [checked]="true">Read-only checked</andes-checkbox>
        <andes-checkbox aria-invalid="true">Invalid</andes-checkbox>
      </div>
    `,
  }),
};

export const LabelStart: Story = {
  name: 'Label position: start',
  args: { labelPosition: 'start', checked: true },
};

export const AutoFocus: Story = {
  render: () => ({
    template: `<andes-checkbox autoFocus>Focused on first render (press Space to toggle)</andes-checkbox>`,
  }),
};

export const ChangeEvent: Story = {
  name: 'Change event',
  render: () => ({
    props: { checked: false, last: 'none yet' },
    // `(changed)` receives an `AndesCheckboxChange`: new state, value, and the native event.
    template: `
      <andes-checkbox
        value="newsletter"
        [(checked)]="checked"
        (changed)="last = 'checked=' + $event.checked + ', value=' + $event.value + ', native=' + $event.event.type"
      >Subscribe to newsletter</andes-checkbox>
      <p style="font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; line-height: 1.375rem; color: var(--andes-color-foreground); margin-top: 1rem;">
        Last change: {{ last }}
      </p>
    `,
  }),
};

export const IndeterminateToChecked: Story = {
  name: 'Indeterminate resolves to checked',
  render: () => ({
    props: { checked: false, indeterminate: true },
    // Clicking - or pressing Space on - a mixed checkbox checks it, like the native control.
    template: `
      <andes-checkbox [(checked)]="checked" [(indeterminate)]="indeterminate">Mixed state</andes-checkbox>
      <p style="font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; line-height: 1.375rem; color: var(--andes-color-foreground); margin-top: 1rem;">
        checked={{ checked }}, indeterminate={{ indeterminate }}
      </p>
    `,
  }),
};

const note = `font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; line-height: 1.375rem; color: var(--andes-color-foreground); margin-top: 1rem;`;

export const Controlled: Story = {
  name: 'Controlled (checked + disabled from outside)',
  render: () => ({
    moduleMetadata: { imports: [AndesButton] },
    props: { checked: true, disabled: false },
    // The parent owns both states: the buttons flip them, and `[(checked)]` keeps a user click
    // in sync with the parent's own value.
    template: `
      <andes-checkbox [(checked)]="checked" [disabled]="disabled">
        {{ checked ? 'Checked' : 'Unchecked' }}-{{ disabled ? 'Disabled' : 'Enabled' }}
      </andes-checkbox>
      <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
        <andes-button size="sm" (click)="checked = !checked">{{ checked ? 'Uncheck' : 'Check' }}</andes-button>
        <andes-button size="sm" variant="outline" (click)="disabled = !disabled">{{ disabled ? 'Enable' : 'Disable' }}</andes-button>
      </div>
    `,
  }),
};

export const FocusEvents: Story = {
  name: 'Focus, blur and the native input',
  render: () => ({
    moduleMetadata: { imports: [AndesButton] },
    props: { log: 'none yet' },
    // `(focused)`/`(blurred)` carry the native FocusEvent; `focus()`, `blur()` and
    // `nativeElement` are public on the component instance (here via a template reference).
    template: `
      <andes-checkbox
        #box
        (focused)="log = 'focused (' + $event.type + ')'"
        (blurred)="log = 'blurred (' + $event.type + ')'"
      >Remember me</andes-checkbox>
      <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
        <andes-button size="sm" variant="outline" (mousedown)="$event.preventDefault()" (click)="box.focus()">focus()</andes-button>
        <andes-button size="sm" variant="outline" (mousedown)="$event.preventDefault()" (click)="box.blur()">blur()</andes-button>
        <andes-button size="sm" variant="outline" (click)="log = 'nativeElement: <' + box.nativeElement.tagName.toLowerCase() + ' type=' + box.nativeElement.type + '>'">Read nativeElement</andes-button>
      </div>
      <p style="${note}">Last event: {{ log }}</p>
    `,
  }),
};

export const CustomBorderWidth: Story = {
  name: 'Custom border width',
  render: () => ({
    // `--andes-checkbox-border-width` (default 1px) is the styling hook for the box outline.
    template: `
      <div style="display: flex; gap: 1.5rem; --andes-checkbox-border-width: 2px;">
        <andes-checkbox>2px border</andes-checkbox>
        <andes-checkbox checked>2px border</andes-checkbox>
        <andes-checkbox indeterminate>2px border</andes-checkbox>
      </div>
    `,
  }),
};

export const InlineWithText: Story = {
  name: 'Inline with surrounding text',
  render: () => ({
    template: `
      <p style="${note}">
        Before <andes-checkbox>Inline checkbox</andes-checkbox> after, on the same text line.
      </p>
    `,
  }),
};
