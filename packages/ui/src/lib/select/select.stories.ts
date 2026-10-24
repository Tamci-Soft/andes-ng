import { JsonPipe } from '@angular/common';
import { signal } from '@angular/core';
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
  JsonPipe,
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
 * Every story sets `aria-label` or an `id` for a `<label for>`: `role="combobox"` takes no
 * accessible name from its own content, so a select without a label (or an
 * `aria-labelledby` pointing at a visible one) is unnamed for a screen reader.
 */
const meta: Meta<AndesSelect> = {
  title: 'Select',
  component: AndesSelect,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    mode: { control: 'select', options: ['single', 'multiple', 'tags'] },
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'borderless', 'underlined'],
    },
    status: { control: 'select', options: [undefined, 'error', 'warning'] },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    allowClear: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
  args: {
    size: 'md',
    mode: 'single',
    variant: 'outlined',
    status: undefined,
    placeholder: 'Select a fruit',
    disabled: false,
    required: false,
    allowClear: false,
    loading: false,
  },
  render: (args) => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: args,
    template: `
      <div style="width: 260px;">
        <andes-select
          aria-label="Fruit"
          [size]="size"
          [mode]="mode"
          [variant]="variant"
          [status]="status"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [required]="required"
          [allowClear]="allowClear"
          [loading]="loading"
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

/**
 * `id` lands on the focusable combobox - the button, or the search input with
 * `showSearch` - so the `<label for>` names it and focuses it when clicked.
 */
export const WithLabel: Story = {
  render: (args) => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: args,
    template: `
      <div style="width: 260px;">
        <label for="fruit-select" style="display: block; font-size: 0.875rem; margin-bottom: 0.25rem;">Fruit</label>
        <andes-select id="fruit-select" placeholder="Select a fruit" [showSearch]="showSearch">
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
  args: { showSearch: false },
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

const FRUIT_OPTIONS = [
  { value: 'apple', label: 'Apple' },
  { value: 'apricot', label: 'Apricot' },
  { value: 'banana', label: 'Banana' },
  { value: 'blueberry', label: 'Blueberry' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'durian', label: 'Durian', disabled: true },
  { value: 'grape', label: 'Grape' },
  { value: 'kiwi', label: 'Kiwi' },
];

const note = (text: string) =>
  `<p style="margin: 0.5rem 0 0; font: 0.75rem/1.25rem var(--andes-font-family), sans-serif; color: var(--andes-color-muted-foreground);">${text}</p>`;

/**
 * `mode="multiple"`: the value is an array, rendered as removable tags, and the panel
 * stays open between picks. Search is on by default in this mode; `Backspace` in the
 * empty input removes the last tag.
 */
export const Multiple: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: { options: FRUIT_OPTIONS, picked: ['apple', 'cherry'] },
    template: `
      <div style="width: 320px;">
        <andes-select aria-label="Fruit" mode="multiple" placeholder="Select fruit" allowClear
          [options]="options" [(value)]="picked" />
        ${note('value: {{ picked | json }}')}
      </div>
    `,
  }),
};

/** `maxTagCount` collapses the overflow into a `+ N ...` tag; `maxCount` caps the selection. */
export const MaxTagCountAndMaxCount: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: {
      options: FRUIT_OPTIONS,
      picked: ['apple', 'apricot', 'banana', 'cherry'],
      picked2: ['kiwi'],
    },
    template: `
      <div style="width: 320px; display: flex; flex-direction: column; gap: 1.25rem;">
        <div>
          <andes-select aria-label="Fruit" mode="multiple" [maxTagCount]="2" maxTagTextLength="6"
            [options]="options" [(value)]="picked" />
          ${note('maxTagCount=2, maxTagTextLength=6')}
        </div>
        <div>
          <andes-select aria-label="Fruit" mode="multiple" [maxCount]="2" placeholder="Pick up to two"
            [options]="options" [(value)]="picked2" />
          ${note('maxCount=2 - the other options disable once two are picked')}
        </div>
      </div>
    `,
  }),
};

/**
 * `mode="tags"`: whatever is typed is offered as a new value; `tokenSeparators` split
 * typed or pasted text into several.
 */
export const Tags: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: {
      options: FRUIT_OPTIONS,
      picked: ['apple', 'dragonfruit'],
      separators: [','],
    },
    template: `
      <div style="width: 320px;">
        <andes-select aria-label="Fruit" mode="tags" placeholder="Type and press Enter"
          [options]="options" [tokenSeparators]="separators" [(value)]="picked" />
        ${note('Try typing "lime, mango," - value: {{ picked | json }}')}
      </div>
    `,
  }),
};

/**
 * `showSearch` turns the trigger into a text input that filters the options, with focus
 * kept in the input and the active option announced through `aria-activedescendant`.
 */
export const Searchable: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: { search: '' },
    template: `
      <div style="width: 260px;">
        <andes-select aria-label="Produce" placeholder="Search produce" showSearch allowClear
          [(searchValue)]="search">
          <andes-select-content>
            <andes-select-group>
              <andes-select-label>Fruit</andes-select-label>
              <andes-select-item value="apple">Apple</andes-select-item>
              <andes-select-item value="apricot">Apricot</andes-select-item>
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
        ${note('searchValue: "{{ search }}" - groups with no match hide themselves')}
      </div>
    `,
  }),
};

/** `optionFilterProp` matches on another field; `notFoundContent` takes a template. */
export const CustomFilterAndEmptyState: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: {
      countries: [
        { value: 'pe', label: 'Peru', capital: 'Lima' },
        { value: 'cl', label: 'Chile', capital: 'Santiago' },
        { value: 'ar', label: 'Argentina', capital: 'Buenos Aires' },
      ],
      props: ['label', 'capital'],
    },
    template: `
      <div style="width: 260px;">
        <andes-select aria-label="Country" placeholder="Country or capital" showSearch [open]="true"
          searchValue="xyz" [options]="countries" [optionFilterProp]="props" [notFoundContent]="empty" />
        <ng-template #empty>
          <span>Nothing matches - try a capital, like <em>Lima</em>.</span>
        </ng-template>
      </div>
    `,
  }),
};

export const AllowClear: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: { options: FRUIT_OPTIONS },
    template: `
      <div style="width: 260px;">
        <andes-select aria-label="Fruit" allowClear value="banana" [options]="options" />
        ${note('Hover or focus the field to swap the chevron for the clear button; Tab reaches it from the keyboard, and Backspace clears too.')}
      </div>
    `,
  }),
};

/**
 * The clear button is the same at every size and on every field: a small muted disc in the
 * chevron's place, named by `clearLabel`.
 */
export const ClearButtonSizes: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: { options: FRUIT_OPTIONS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 260px;">
        <andes-select aria-label="Small" size="sm" allowClear value="banana" [options]="options" />
        <andes-select aria-label="Medium" allowClear value="banana" [options]="options" />
        <andes-select aria-label="Large" size="lg" allowClear value="banana" [options]="options" />
        <andes-select aria-label="Localized" allowClear clearLabel="Borrar" value="banana" [options]="options" />
      </div>
    `,
  }),
};

export const Loading: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    template: `
      <div style="width: 260px;">
        <andes-select aria-label="Fruit" placeholder="Loading options" loading [options]="[]" [open]="true" />
      </div>
    `,
  }),
};

export const Status: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: { options: FRUIT_OPTIONS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 260px;">
        <andes-select aria-label="Fruit (error)" status="error" placeholder="Error" [options]="options" />
        <andes-select aria-label="Fruit (warning)" status="warning" placeholder="Warning" [options]="options" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: {
      options: FRUIT_OPTIONS,
      variants: ['outlined', 'filled', 'borderless', 'underlined'],
    },
    template: `
      <div style="display: grid; grid-template-columns: 260px 260px; gap: 1rem;">
        @for (variant of variants; track variant) {
          <andes-select [aria-label]="variant" [variant]="variant" [placeholder]="variant" [options]="options" />
          <andes-select [aria-label]="variant + ' multiple'" mode="multiple" [variant]="variant"
            [value]="['apple', 'kiwi']" [options]="options" />
        }
      </div>
    `,
  }),
};

/** `placement` shorthand (`bottomLeft`, ...); `side`/`align` on the content still win when set. */
export const Placement: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: { options: FRUIT_OPTIONS.slice(0, 3) },
    template: `
      <div style="padding-top: 12rem; display: flex; justify-content: flex-end; width: 420px;">
        <div style="width: 160px;">
          <andes-select aria-label="Fruit" placement="topRight" placeholder="topRight" [open]="true"
            [options]="options">
            <andes-select-content [matchTriggerWidth]="false" />
          </andes-select>
        </div>
      </div>
    `,
  }),
};

export const PrefixAndSuffixIcon: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: { options: FRUIT_OPTIONS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 260px;">
        <andes-select aria-label="Fruit" placeholder="With prefix and custom suffix"
          [prefix]="prefix" [suffixIcon]="suffix" [options]="options" />
        <andes-select aria-label="Fruit" placeholder="No suffix icon" [suffixIcon]="null" [options]="options" />
      </div>
      <ng-template #prefix>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" stroke-linecap="round" />
        </svg>
      </ng-template>
      <ng-template #suffix>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m7 15 5 5 5-5M7 9l5-5 5 5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </ng-template>
    `,
  }),
};

/**
 * The `options` input as an alternative to projected items, with groups, disabled
 * entries and custom rendering through `optionTemplate` and `labelTemplate`.
 */
export const OptionsArrayWithTemplates: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: {
      options: [
        { value: 'free', label: 'Free', price: '$0' },
        {
          label: 'Paid',
          options: [
            { value: 'pro', label: 'Pro', price: '$12' },
            { value: 'team', label: 'Team', price: '$40' },
            {
              value: 'enterprise',
              label: 'Enterprise',
              price: 'Contact us',
              disabled: true,
            },
          ],
        },
      ],
    },
    template: `
      <div style="width: 280px;">
        <andes-select aria-label="Plan" placeholder="Choose a plan" value="pro"
          [options]="options" [optionTemplate]="option" [labelTemplate]="label" />
      </div>
      <ng-template #option let-option let-selected="selected">
        <span style="display: flex; justify-content: space-between; width: 100%; gap: 1rem;">
          <span>{{ option.label }}</span>
          <span style="color: var(--andes-color-muted-foreground);">{{ option.price }}</span>
        </span>
      </ng-template>
      <ng-template #label let-item>
        <span>Plan: <strong>{{ item.label }}</strong></span>
      </ng-template>
    `,
  }),
};

/** `tagTemplate` renders each tag; its context carries an `onClose` callback. */
export const CustomTags: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: { options: FRUIT_OPTIONS, picked: ['apple', 'cherry', 'kiwi'] },
    template: `
      <div style="width: 320px;">
        <andes-select aria-label="Fruit" mode="multiple" [options]="options" [(value)]="picked" [tagTemplate]="tag" />
      </div>
      <ng-template #tag let-tag let-close="onClose">
        <span style="display: inline-flex; align-items: center; gap: 0.25rem; height: 1.25rem; padding: 0 0.5rem; border-radius: 999px;
          background: var(--andes-color-primary); color: var(--andes-color-primary-foreground); font-size: 0.75rem; line-height: 1.25rem;">
          {{ tag.label }}
          <button type="button" tabindex="-1" [attr.aria-label]="'Remove ' + tag.label" (mousedown)="$event.preventDefault()"
            (click)="$event.stopPropagation(); close()"
            style="border: none; background: none; color: inherit; cursor: pointer; padding: 0;">×</button>
        </span>
      </ng-template>
    `,
  }),
};

/** `labelInValue` emits `{ value, label }` objects, and labels written values without options loaded. */
export const LabelInValue: Story = {
  render: () => ({
    moduleMetadata: { imports: [...SELECT_IMPORTS, ReactiveFormsModule] },
    props: {
      options: FRUIT_OPTIONS,
      fruit: new FormControl({ value: 'mango', label: 'Mango (from server)' }),
    },
    template: `
      <div style="width: 260px;">
        <andes-select aria-label="Fruit" labelInValue [options]="options" [formControl]="fruit" />
        ${note('value: {{ fruit.value | json }}')}
      </div>
    `,
  }),
};

/** `[(open)]` controls the panel; `openChange` reports every transition. */
export const ControlledOpen: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: { options: FRUIT_OPTIONS.slice(0, 4), open: false },
    template: `
      <div style="width: 260px; display: flex; flex-direction: column; gap: 0.5rem;">
        <button type="button" (click)="open = !open"
          style="align-self: flex-start; font: 0.875rem var(--andes-font-family), sans-serif;">
          {{ open ? 'Close' : 'Open' }} from outside
        </button>
        <andes-select aria-label="Fruit" placeholder="Controlled" [options]="options" [(open)]="open" />
        ${note('open: {{ open }}')}
      </div>
    `,
  }),
};

const PEOPLE = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 2, name: 'Grace Hopper', email: 'grace@example.com' },
  { id: 3, name: 'Alan Turing', email: 'alan@example.com' },
  { id: 4, name: 'Katherine Johnson', email: 'katherine@example.com' },
  { id: 5, name: 'Edsger Dijkstra', email: 'edsger@example.com' },
];

/**
 * `fieldNames` reads rows as they come from an API - here `{ id, name, email }` - without
 * mapping them first. Hover an option: an entry's `title` field becomes its tooltip.
 */
export const FieldNames: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: {
      people: PEOPLE.map((person) => ({ ...person, title: person.email })),
      fieldNames: { value: 'id', label: 'name' },
      picked: 2,
    },
    template: `
      <div style="width: 260px;">
        <andes-select aria-label="Owner" [options]="people" [fieldNames]="fieldNames" [(value)]="picked" />
        ${note('value: {{ picked }}')}
      </div>
    `,
  }),
};

/** `filterSort` ranks the matches: options starting with the search text come first. */
export const SearchWithSort: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: {
      options: [
        { value: 'pineapple', label: 'Pineapple' },
        { value: 'apple', label: 'Apple' },
        { value: 'grape', label: 'Grape' },
        { value: 'apricot', label: 'Apricot' },
        { value: 'custard-apple', label: 'Custard apple' },
      ],
      sort: (
        a: { label: string },
        b: { label: string },
        info: { searchValue: string },
      ) => {
        const search = info.searchValue.toLowerCase();
        const rank = (label: string) =>
          search && label.toLowerCase().startsWith(search) ? 0 : 1;
        return rank(a.label) - rank(b.label) || a.label.localeCompare(b.label);
      },
    },
    template: `
      <div style="width: 260px;">
        <andes-select aria-label="Fruit" placeholder="Type 'ap'" showSearch [options]="options" [filterSort]="sort" />
      </div>
    `,
  }),
};

/**
 * `maxTagCount="responsive"` keeps the tags on one row and shows as many as fit. Drag
 * the container's bottom-right corner to resize it.
 */
export const ResponsiveTags: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: {
      options: FRUIT_OPTIONS,
      picked: ['apple', 'apricot', 'banana', 'blueberry', 'cherry', 'grape'],
    },
    template: `
      <div style="width: 320px; min-width: 120px; max-width: 100%; resize: horizontal; overflow: hidden; padding-bottom: 0.25rem;">
        <andes-select aria-label="Fruit" mode="multiple" maxTagCount="responsive" [options]="options" [(value)]="picked" />
      </div>
    `,
  }),
};

/**
 * `panelFooter` adds content below the options - here a field that adds a new option.
 * Keys typed into it stay in it; the option list's keyboard handling leaves them alone.
 */
export const PanelFooter: Story = {
  render: () => {
    const options = signal(FRUIT_OPTIONS.slice(0, 4));
    return {
      moduleMetadata: { imports: SELECT_IMPORTS },
      props: {
        options,
        add(input: HTMLInputElement) {
          const label = input.value.trim();
          if (!label) {
            return;
          }
          options.update((current) => [
            ...current,
            { value: label.toLowerCase(), label },
          ]);
          input.value = '';
        },
      },
      template: `
        <div style="width: 260px;">
          <andes-select aria-label="Fruit" placeholder="Pick or add a fruit" [options]="options()" [panelFooter]="footer" />
        </div>
        <ng-template #footer>
          <div style="display: flex; gap: 0.5rem;">
            <input #name class="demo-field" aria-label="New fruit" placeholder="New fruit" (keydown.enter)="add(name)" />
            <button type="button" (click)="add(name)"
              style="height: 1.5rem; padding: 0 0.625rem; border: none; border-radius: var(--andes-radius-sm); cursor: pointer;
                background: var(--andes-color-primary); color: var(--andes-color-primary-foreground); font-family: inherit; font-size: 0.875rem;">
              Add item
            </button>
          </div>
        </ng-template>
      `,
      // A small field drawn like the select's own box: one border, and on focus a primary
      // border with a soft ring instead of the browser's outline around it.
      styles: [
        `
        .demo-field {
          flex: 1;
          min-width: 0;
          height: 1.5rem;
          box-sizing: border-box;
          padding: 0 0.4375rem;
          border: 1px solid var(--andes-color-input);
          border-radius: var(--andes-radius-md);
          background: var(--andes-color-background);
          color: var(--andes-color-foreground);
          font: 0.875rem/1.375rem var(--andes-font-family), sans-serif;
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }
        .demo-field::placeholder {
          color: var(--andes-color-muted-foreground);
        }
        .demo-field:hover {
          border-color: color-mix(in srgb, var(--andes-color-primary) 65%, var(--andes-color-input));
        }
        .demo-field:focus {
          border-color: var(--andes-color-primary);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--andes-color-primary) 20%, transparent);
        }
        `,
      ],
    };
  },
};

/** `panelScroll` loads the next page as the list nears its end; `loading` shows meanwhile. */
export const InfiniteScroll: Story = {
  render: () => {
    const page = (start: number) =>
      Array.from({ length: 20 }, (_, index) => ({
        value: start + index,
        label: `Invoice #${String(start + index + 1).padStart(4, '0')}`,
      }));
    const options = signal(page(0));
    const loading = signal(false);
    return {
      moduleMetadata: { imports: SELECT_IMPORTS },
      props: {
        options,
        loading,
        onScroll(event: Event) {
          const list = event.target as HTMLElement;
          const nearEnd =
            list.scrollTop + list.clientHeight >= list.scrollHeight - 24;
          if (!nearEnd || loading() || options().length >= 100) {
            return;
          }
          loading.set(true);
          setTimeout(() => {
            options.update((current) => [...current, ...page(current.length)]);
            loading.set(false);
          }, 600);
        },
      },
      template: `
        <div style="width: 260px;">
          <andes-select aria-label="Invoice" placeholder="Scroll to load more" [options]="options()" [loading]="loading()"
            (panelScroll)="onScroll($event)" />
          ${note('{{ options().length }} of 100 loaded')}
        </div>
      `,
    };
  },
};

/**
 * Options fetched from a server as the user types: `searchInput` starts the request,
 * `filterOption` is off because the server already filtered, and `loading` covers the wait.
 */
export const RemoteSearch: Story = {
  render: () => {
    const options = signal<{ value: number; label: string }[]>([]);
    const loading = signal(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    return {
      moduleMetadata: { imports: SELECT_IMPORTS },
      props: {
        options,
        loading,
        onSearch(text: string) {
          clearTimeout(timer);
          if (!text.trim()) {
            options.set([]);
            loading.set(false);
            return;
          }
          loading.set(true);
          timer = setTimeout(() => {
            const needle = text.toLowerCase();
            options.set(
              PEOPLE.filter((person) =>
                person.name.toLowerCase().includes(needle),
              ).map((person) => ({ value: person.id, label: person.name })),
            );
            loading.set(false);
          }, 400);
        },
      },
      template: `
        <div style="width: 280px;">
          <andes-select aria-label="People" mode="multiple" placeholder="Search people" notFoundContent="Type to search"
            [filterOption]="false" [options]="options()" [loading]="loading()" (searchInput)="onSearch($event)" />
        </div>
      `,
    };
  },
};

/** `defaultActiveFirstOption` off: in `tags` mode, Enter adds exactly what was typed. */
export const FreeTextTags: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: { options: FRUIT_OPTIONS, picked: [] as string[] },
    template: `
      <div style="width: 300px;">
        <andes-select aria-label="Labels" mode="tags" placeholder="Type 'app' and press Enter" [defaultActiveFirstOption]="false"
          [options]="options" [(value)]="picked" />
        ${note('value: {{ picked | json }}')}
      </div>
    `,
  }),
};

/** `optionSelectedIcon` and `loadingIcon` replace the check mark and the spinner. */
export const CustomIcons: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: { options: FRUIT_OPTIONS, picked: ['apple', 'banana'] },
    template: `
      <div style="width: 300px; display: flex; flex-direction: column; gap: 0.75rem;">
        <andes-select aria-label="Fruit" mode="multiple" [options]="options" [(value)]="picked" [optionSelectedIcon]="selected" />
        <andes-select aria-label="Loading fruit" placeholder="Loading" loading [options]="options" [loadingIcon]="hourglass" />
        <andes-select aria-label="Fruit, no check mark" mode="multiple" [options]="options" [(value)]="picked" [optionSelectedIcon]="null" />
      </div>
      <ng-template #selected>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
        </svg>
      </ng-template>
      <ng-template #hourglass>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10" stroke-linecap="round" />
        </svg>
      </ng-template>
    `,
  }),
};

/**
 * `matchTriggerWidth` sizes the panel: `false` fits it to its content, a number sets
 * it in px.
 */
export const PanelWidth: Story = {
  render: () => ({
    moduleMetadata: { imports: SELECT_IMPORTS },
    props: {
      options: [
        {
          value: 'net30',
          label: 'Net 30 - payment due thirty days after invoice',
        },
        {
          value: 'net60',
          label: 'Net 60 - payment due sixty days after invoice',
        },
        { value: 'cod', label: 'Cash on delivery' },
      ],
    },
    template: `
      <div style="display: flex; gap: 1rem; align-items: flex-start;">
        <div style="width: 140px;">
          <andes-select aria-label="Terms, sized to content" placeholder="Content" [options]="options" [matchTriggerWidth]="false" />
        </div>
        <div style="width: 140px;">
          <andes-select aria-label="Terms, 360px" placeholder="360px" [options]="options" [matchTriggerWidth]="360" />
        </div>
      </div>
    `,
  }),
};

/**
 * `focused`/`blurred` fire as focus enters and leaves the select as a whole (moving into
 * the panel does not count), and `activeOptionChange` follows the keyboard cursor.
 */
export const FocusAndActiveEvents: Story = {
  render: () => {
    const log = signal<string[]>([]);
    const push = (entry: string) =>
      log.update((entries) => [entry, ...entries].slice(0, 6));
    return {
      moduleMetadata: { imports: SELECT_IMPORTS },
      props: { options: FRUIT_OPTIONS, log, push },
      template: `
        <div style="width: 260px;">
          <andes-select aria-label="Fruit" [options]="options" (focused)="push('focused')" (blurred)="push('blurred')"
            (activeOptionChange)="push('active: ' + $event)" />
          ${note('{{ log().join(" · ") || "Focus the select and use the arrow keys" }}')}
        </div>
      `,
    };
  },
};
