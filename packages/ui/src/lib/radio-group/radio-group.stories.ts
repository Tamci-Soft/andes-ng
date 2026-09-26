import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesRadio } from './radio';
import { AndesRadioGroup } from './radio-group';

const meta: Meta<AndesRadioGroup> = {
  title: 'RadioGroup',
  component: AndesRadioGroup,
  tags: ['autodocs'],
  argTypes: {
    name: { control: 'text' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    orientation: {
      control: 'select',
      options: [undefined, 'vertical', 'horizontal'],
    },
    optionType: { control: 'inline-radio', options: ['default', 'button'] },
    buttonStyle: { control: 'inline-radio', options: ['outline', 'solid'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    block: { control: 'boolean' },
    labelPlacement: { control: 'inline-radio', options: ['end', 'start'] },
    selectionChange: { action: 'selectionChange' },
  },
  args: {
    disabled: false,
    required: false,
    optionType: 'default',
    buttonStyle: 'outline',
    size: 'md',
    block: false,
    labelPlacement: 'end',
  },
  render: (args) => ({
    moduleMetadata: { imports: [AndesRadio] },
    props: args,
    template: `
      <andes-radio-group aria-label="Plan" [name]="name" [disabled]="disabled" [required]="required" [orientation]="orientation" [optionType]="optionType" [buttonStyle]="buttonStyle" [size]="size" [block]="block" [labelPlacement]="labelPlacement" (selectionChange)="selectionChange($event)">
        <andes-radio value="starter">Starter</andes-radio>
        <andes-radio value="pro">Pro</andes-radio>
        <andes-radio value="enterprise">Enterprise</andes-radio>
      </andes-radio-group>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesRadioGroup>;

export const Default: Story = {};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
};

export const Preselected: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesRadio, FormsModule] },
    props: { value: 'pro' },
    template: `
      <andes-radio-group aria-label="Plan" [(ngModel)]="value">
        <andes-radio value="starter">Starter</andes-radio>
        <andes-radio value="pro">Pro</andes-radio>
        <andes-radio value="enterprise">Enterprise</andes-radio>
      </andes-radio-group>
    `,
  }),
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledItem: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesRadio] },
    props: args,
    template: `
      <andes-radio-group aria-label="Plan" [orientation]="orientation">
        <andes-radio value="starter">Starter</andes-radio>
        <andes-radio value="pro" disabled>Pro (sold out)</andes-radio>
        <andes-radio value="enterprise">Enterprise</andes-radio>
      </andes-radio-group>
    `,
  }),
};

export const Required: Story = {
  args: { required: true },
};

export const WithReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesRadio, ReactiveFormsModule] },
    props: { control: new FormControl('pro') },
    template: `
      <andes-radio-group aria-label="Plan" [formControl]="control">
        <andes-radio value="starter">Starter</andes-radio>
        <andes-radio value="pro">Pro</andes-radio>
        <andes-radio value="enterprise">Enterprise</andes-radio>
      </andes-radio-group>
    `,
  }),
};

export const AllStates: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesRadio] },
    template: `
      <div style="display: flex; gap: 3rem; flex-wrap: wrap;">
        <div>
          <p style="margin: 0 0 0.5rem; font-family: system-ui, sans-serif; color: var(--andes-color-foreground);">Vertical</p>
          <andes-radio-group aria-label="Plan (vertical)">
            <andes-radio value="starter">Starter</andes-radio>
            <andes-radio value="pro">Pro</andes-radio>
            <andes-radio value="enterprise">Enterprise</andes-radio>
          </andes-radio-group>
        </div>
        <div>
          <p style="margin: 0 0 0.5rem; font-family: system-ui, sans-serif; color: var(--andes-color-foreground);">Horizontal</p>
          <andes-radio-group aria-label="Plan (horizontal)" orientation="horizontal">
            <andes-radio value="starter">Starter</andes-radio>
            <andes-radio value="pro">Pro</andes-radio>
            <andes-radio value="enterprise">Enterprise</andes-radio>
          </andes-radio-group>
        </div>
        <div>
          <p style="margin: 0 0 0.5rem; font-family: system-ui, sans-serif; color: var(--andes-color-foreground);">Disabled group</p>
          <andes-radio-group aria-label="Plan (disabled)" disabled>
            <andes-radio value="starter">Starter</andes-radio>
            <andes-radio value="pro">Pro</andes-radio>
          </andes-radio-group>
        </div>
        <div>
          <p style="margin: 0 0 0.5rem; font-family: system-ui, sans-serif; color: var(--andes-color-foreground);">One disabled item</p>
          <andes-radio-group aria-label="Plan (one item disabled)">
            <andes-radio value="starter">Starter</andes-radio>
            <andes-radio value="pro" disabled>Pro (sold out)</andes-radio>
          </andes-radio-group>
        </div>
      </div>
    `,
  }),
};

/** `optionType="button"` turns the items into a segmented control. Arrow keys still move
 *  focus AND selection (native radio behavior). */
export const ButtonOutline: Story = {
  args: { optionType: 'button' },
};

export const ButtonSolid: Story = {
  args: { optionType: 'button', buttonStyle: 'solid' },
};

export const ButtonSizes: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesRadio, FormsModule] },
    props: { small: 'b', medium: 'b', large: 'b' },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
        @for (row of [['sm', 'Small'], ['md', 'Medium'], ['lg', 'Large']]; track row[0]) {
          <andes-radio-group [attr.aria-label]="row[1]" optionType="button" [size]="$any(row[0])" value="b">
            <andes-radio value="a">Daily</andes-radio>
            <andes-radio value="b">Weekly</andes-radio>
            <andes-radio value="c">Monthly</andes-radio>
          </andes-radio-group>
        }
      </div>
    `,
  }),
};

export const ButtonWithDisabled: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesRadio] },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
        <andes-radio-group aria-label="City (outline)" optionType="button" value="lima">
          <andes-radio value="lima">Lima</andes-radio>
          <andes-radio value="cusco" disabled>Cusco</andes-radio>
          <andes-radio value="arequipa">Arequipa</andes-radio>
        </andes-radio-group>
        <andes-radio-group aria-label="City (solid, disabled group)" optionType="button" buttonStyle="solid" value="lima" disabled>
          <andes-radio value="lima">Lima</andes-radio>
          <andes-radio value="cusco">Cusco</andes-radio>
          <andes-radio value="arequipa">Arequipa</andes-radio>
        </andes-radio-group>
      </div>
    `,
  }),
};

export const ButtonVertical: Story = {
  args: { optionType: 'button', orientation: 'vertical' },
};

/** `block` stretches the group to its container, sharing the width equally. */
export const Block: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesRadio] },
    template: `
      <div style="width: 28rem; display: flex; flex-direction: column; gap: 1rem;">
        <andes-radio-group aria-label="View (outline)" optionType="button" block value="list">
          <andes-radio value="list">List</andes-radio>
          <andes-radio value="board">Board</andes-radio>
          <andes-radio value="calendar">Calendar</andes-radio>
        </andes-radio-group>
        <andes-radio-group aria-label="View (solid)" optionType="button" buttonStyle="solid" block value="board">
          <andes-radio value="list">List</andes-radio>
          <andes-radio value="board">Board</andes-radio>
          <andes-radio value="calendar">Calendar</andes-radio>
        </andes-radio-group>
        <andes-radio-group aria-label="View (classic)" orientation="horizontal" block value="list">
          <andes-radio value="list">List</andes-radio>
          <andes-radio value="board">Board</andes-radio>
          <andes-radio value="calendar">Calendar</andes-radio>
        </andes-radio-group>
      </div>
    `,
  }),
};

/** Generate the items from data: bare strings or `{ label, value, disabled, title, id }`. */
export const Options: Story = {
  render: () => ({
    props: {
      fruits: ['Apple', 'Pear', 'Orange'],
      plans: [
        { label: 'Starter', value: 1 },
        { label: 'Pro', value: 2 },
        {
          label: 'Enterprise',
          value: 3,
          disabled: true,
          title: 'Contact sales',
        },
      ],
      fruit: 'Apple',
      plan: 2,
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div>
          <andes-radio-group aria-label="Fruit" orientation="horizontal" [options]="fruits" [(value)]="fruit" />
          <p style="margin: 0.5rem 0 0; font-family: system-ui, sans-serif; color: var(--andes-color-foreground);">Fruit: {{ fruit }}</p>
        </div>
        <div>
          <andes-radio-group aria-label="Plan" optionType="button" buttonStyle="solid" [options]="plans" [(value)]="plan" />
          <p style="margin: 0.5rem 0 0; font-family: system-ui, sans-serif; color: var(--andes-color-foreground);">Plan: {{ plan }} ({{ typeof plan }})</p>
        </div>
      </div>
    `,
  }),
};

/** `optionLabel` customizes every generated option's label; the template receives the
 *  option as `let-option`, plus `checked` and `index`. */
export const OptionsWithLabelTemplate: Story = {
  render: () => ({
    props: {
      plans: [
        { label: 'Starter', value: 'starter' },
        { label: 'Pro', value: 'pro' },
        { label: 'Enterprise', value: 'enterprise' },
      ],
      prices: { starter: 'Free', pro: '$12/mo', enterprise: 'Custom' },
      plan: 'pro',
    },
    template: `
      <andes-radio-group aria-label="Plan" [options]="plans" [optionLabel]="planLabel" [(value)]="plan" />
      <ng-template #planLabel let-option let-checked="checked">
        <span style="display: inline-flex; flex-direction: column;">
          <strong>{{ option.label }}{{ checked ? ' (selected)' : '' }}</strong>
          <small style="opacity: 0.8;">{{ prices[option.value] }}</small>
        </span>
      </ng-template>
    `,
  }),
};

/** `(selectionChange)` emits `{ value, event }` for user selections only - `[(value)]`
 *  writes do not emit it. */
export const ChangeEvent: Story = {
  render: () => {
    const log: string[] = [];
    return {
      moduleMetadata: { imports: [AndesRadio, AndesButton] },
      props: {
        value: 'a',
        log,
        onSelection(change: { value: unknown; event: Event }) {
          log.unshift(
            `selectionChange: value=${String(change.value)} event=${change.event.type}`,
          );
        },
      },
      template: `
        <andes-radio-group aria-label="Letter" optionType="button" [(value)]="value" (selectionChange)="onSelection($event)">
          <andes-radio value="a">A</andes-radio>
          <andes-radio value="b">B</andes-radio>
          <andes-radio value="c">C</andes-radio>
        </andes-radio-group>
        <andes-button variant="outline" size="sm" style="margin-left: 1rem;" (click)="value = 'a'">Set value to "a" programmatically</andes-button>
        <ol data-testid="change-log" style="font-family: system-ui, sans-serif; color: var(--andes-color-foreground);">
          @for (entry of log; track $index) { <li>{{ entry }}</li> }
        </ol>
      `,
    };
  },
};

export const LabelPlacementStart: Story = {
  args: { labelPlacement: 'start' },
};

/** `autoFocus` on the group focuses the checked item (or the first enabled one). */
export const AutoFocus: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesRadio] },
    template: `
      <andes-radio-group aria-label="Plan" optionType="button" value="pro" autoFocus>
        <andes-radio value="starter">Starter</andes-radio>
        <andes-radio value="pro">Pro</andes-radio>
        <andes-radio value="enterprise">Enterprise</andes-radio>
      </andes-radio-group>
    `,
  }),
};
