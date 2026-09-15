import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesSelect } from './select';
import { AndesSelectContent } from './select-content';
import { AndesSelectGroup } from './select-group';
import { AndesSelectItem } from './select-item';
import { AndesSelectLabel } from './select-label';
import { AndesSelectSeparator } from './select-separator';
import { AndesSelectTrigger } from './select-trigger';
import { AndesSelectValue } from './select-value';

const SELECT_IMPORTS = [
  AndesSelect,
  AndesSelectContent,
  AndesSelectGroup,
  AndesSelectItem,
  AndesSelectLabel,
  AndesSelectSeparator,
  AndesSelectTrigger,
  AndesSelectValue,
];

/**
 * Every story sets `aria-label`: `role="combobox"` takes no accessible name from its own
 * content, so a select without a label (or an `aria-labelledby` pointing at a visible
 * one) is unnamed for a screen reader.
 */
const meta: Meta<AndesSelect> = {
  title: 'Select',
  component: AndesSelect,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    size: 'md',
    placeholder: 'Select a fruit',
    disabled: false,
    required: false,
  },
  render: (args) => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: args,
    template: `
      <div style="width: 260px;">
        <andes-select
          aria-label="Fruit"
          [size]="size"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [required]="required"
        >
          <andes-select-trigger>
            <andes-select-value />
          </andes-select-trigger>
          <andes-select-content>
            <andes-select-item value="apple">Apple</andes-select-item>
            <andes-select-item value="apricot">Apricot</andes-select-item>
            <andes-select-item value="banana">Banana</andes-select-item>
            <andes-select-item value="cherry">Cherry</andes-select-item>
          </andes-select-content>
        </andes-select>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesSelect>;

export const Default: Story = {};

export const WithValue: Story = {
  render: (args) => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: args,
    template: `
      <div style="width: 260px;">
        <andes-select aria-label="Fruit" value="banana" [size]="size">
          <andes-select-trigger>
            <andes-select-value />
          </andes-select-trigger>
          <andes-select-content>
            <andes-select-item value="apple">Apple</andes-select-item>
            <andes-select-item value="banana">Banana</andes-select-item>
            <andes-select-item value="cherry">Cherry</andes-select-item>
          </andes-select-content>
        </andes-select>
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 260px;">
        <andes-select aria-label="Fruit (small)" size="sm" placeholder="Small">
          <andes-select-trigger>
            <andes-select-value />
          </andes-select-trigger>
          <andes-select-content>
            <andes-select-item value="apple">Apple</andes-select-item>
            <andes-select-item value="banana">Banana</andes-select-item>
          </andes-select-content>
        </andes-select>
        <andes-select aria-label="Fruit (medium)" size="md" placeholder="Medium">
          <andes-select-trigger>
            <andes-select-value />
          </andes-select-trigger>
          <andes-select-content>
            <andes-select-item value="apple">Apple</andes-select-item>
            <andes-select-item value="banana">Banana</andes-select-item>
          </andes-select-content>
        </andes-select>
        <andes-select aria-label="Fruit (large)" size="lg" placeholder="Large">
          <andes-select-trigger>
            <andes-select-value />
          </andes-select-trigger>
          <andes-select-content>
            <andes-select-item value="apple">Apple</andes-select-item>
            <andes-select-item value="banana">Banana</andes-select-item>
          </andes-select-content>
        </andes-select>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Required: Story = {
  args: { required: true },
};

export const Invalid: Story = {
  render: (args) => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: args,
    template: `
      <div style="width: 260px;">
        <andes-select aria-label="Fruit" aria-invalid="true" placeholder="Select a fruit">
          <andes-select-trigger>
            <andes-select-value />
          </andes-select-trigger>
          <andes-select-content>
            <andes-select-item value="apple">Apple</andes-select-item>
            <andes-select-item value="banana">Banana</andes-select-item>
          </andes-select-content>
        </andes-select>
      </div>
    `,
  }),
};

export const WithDisabledOption: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    template: `
      <div style="width: 260px;">
        <andes-select aria-label="Fruit" placeholder="Select a fruit">
          <andes-select-trigger>
            <andes-select-value />
          </andes-select-trigger>
          <andes-select-content>
            <andes-select-item value="apple">Apple</andes-select-item>
            <andes-select-item value="apricot" disabled>Apricot (out of season)</andes-select-item>
            <andes-select-item value="banana">Banana</andes-select-item>
          </andes-select-content>
        </andes-select>
      </div>
    `,
  }),
};

export const Grouped: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    template: `
      <div style="width: 260px;">
        <andes-select aria-label="Produce" placeholder="Select produce">
          <andes-select-trigger>
            <andes-select-value />
          </andes-select-trigger>
          <andes-select-content>
            <andes-select-group>
              <andes-select-label>Fruit</andes-select-label>
              <andes-select-item value="apple">Apple</andes-select-item>
              <andes-select-item value="banana">Banana</andes-select-item>
            </andes-select-group>
            <andes-select-separator />
            <andes-select-group>
              <andes-select-label>Vegetables</andes-select-label>
              <andes-select-item value="leek">Leek</andes-select-item>
              <andes-select-item value="carrot">Carrot</andes-select-item>
            </andes-select-group>
          </andes-select-content>
        </andes-select>
      </div>
    `,
  }),
};

export const ManyOptions: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: {
      years: Array.from({ length: 30 }, (_, index) => 1996 + index),
    },
    template: `
      <div style="width: 260px;">
        <andes-select aria-label="Year" placeholder="Select a year">
          <andes-select-trigger>
            <andes-select-value />
          </andes-select-trigger>
          <andes-select-content>
            @for (year of years; track year) {
              <andes-select-item [value]="year">{{ year }}</andes-select-item>
            }
          </andes-select-content>
        </andes-select>
      </div>
    `,
  }),
};

export const OpensAbove: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    template: `
      <div style="width: 260px;">
        <andes-select aria-label="Fruit" placeholder="Select a fruit">
          <andes-select-trigger>
            <andes-select-value />
          </andes-select-trigger>
          <andes-select-content side="top">
            <andes-select-item value="apple">Apple</andes-select-item>
            <andes-select-item value="banana">Banana</andes-select-item>
          </andes-select-content>
        </andes-select>
      </div>
    `,
  }),
};

export const PanelSizedToItsContent: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    template: `
      <div style="width: 160px;">
        <andes-select aria-label="Region" placeholder="Region">
          <andes-select-trigger>
            <andes-select-value />
          </andes-select-trigger>
          <andes-select-content [matchTriggerWidth]="false">
            <andes-select-item value="us-east">US East (Northern Virginia)</andes-select-item>
            <andes-select-item value="eu-west">EU West (Ireland)</andes-select-item>
          </andes-select-content>
        </andes-select>
      </div>
    `,
  }),
};

export const WithObjectValues: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: {
      users: [
        { id: 1, name: 'Ada Lovelace' },
        { id: 2, name: 'Grace Hopper' },
        { id: 3, name: 'Alan Turing' },
      ],
      selected: { id: 2, name: 'Grace Hopper' },
      compareById: (a: unknown, b: unknown) =>
        (a as { id: number } | null)?.id === (b as { id: number } | null)?.id,
    },
    template: `
      <div style="width: 260px;">
        <andes-select
          aria-label="Assignee"
          placeholder="Select an assignee"
          [value]="selected"
          [compareWith]="compareById"
        >
          <andes-select-trigger>
            <andes-select-value />
          </andes-select-trigger>
          <andes-select-content>
            @for (user of users; track user.id) {
              <andes-select-item [value]="user">{{ user.name }}</andes-select-item>
            }
          </andes-select-content>
        </andes-select>
      </div>
    `,
  }),
};

export const WithReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [...SELECT_IMPORTS, ReactiveFormsModule] },
    props: { fruit: new FormControl<string | null>('cherry') },
    template: `
      <div style="width: 260px; display: flex; flex-direction: column; gap: 0.75rem;">
        <andes-select aria-label="Fruit" placeholder="Select a fruit" [formControl]="fruit">
          <andes-select-trigger>
            <andes-select-value />
          </andes-select-trigger>
          <andes-select-content>
            <andes-select-item value="apple">Apple</andes-select-item>
            <andes-select-item value="banana">Banana</andes-select-item>
            <andes-select-item value="cherry">Cherry</andes-select-item>
          </andes-select-content>
        </andes-select>
        <p style="margin: 0; font: 0.875rem var(--andes-font-family), sans-serif; color: var(--andes-color-muted-foreground);">
          value: <code>{{ fruit.value }}</code> · touched: {{ fruit.touched }}
        </p>
      </div>
    `,
  }),
};
