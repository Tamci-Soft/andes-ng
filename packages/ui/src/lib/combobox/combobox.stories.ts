import { signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import {
  AndesCombobox,
  type AndesComboboxOption,
  type AndesComboboxOptionEntry,
} from './combobox';
import { AndesComboboxContent } from './combobox-content';
import { AndesComboboxEmpty } from './combobox-empty';
import { AndesComboboxInput } from './combobox-input';
import { AndesComboboxItem } from './combobox-item';

const FRUITS = [
  'Apple',
  'Apricot',
  'Banana',
  'Blueberry',
  'Cherry',
  'Cranberry',
  'Grape',
  'Kiwi',
  'Lemon',
  'Mango',
  'Orange',
  'Peach',
  'Pineapple',
  'Strawberry',
];

const FRUIT_OPTIONS: readonly AndesComboboxOption[] = FRUITS.map((fruit) => ({
  value: fruit.toLowerCase(),
  label: fruit,
}));

const GROUPED_OPTIONS: readonly AndesComboboxOptionEntry[] = [
  {
    label: 'Fruit',
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
      { value: 'cherry', label: 'Cherry' },
    ],
  },
  {
    label: 'Vegetables',
    options: [
      { value: 'carrot', label: 'Carrot' },
      { value: 'lettuce', label: 'Lettuce', disabled: true },
      { value: 'pea', label: 'Pea' },
    ],
  },
  {
    label: 'Grains',
    options: [
      { value: 'oats', label: 'Oats' },
      { value: 'rice', label: 'Rice' },
    ],
  },
];

interface Country extends AndesComboboxOption {
  readonly capital: string;
  readonly flag: string;
}

const COUNTRIES: readonly Country[] = [
  { value: 'AR', label: 'Argentina', capital: 'Buenos Aires', flag: '🇦🇷' },
  { value: 'BO', label: 'Bolivia', capital: 'Sucre', flag: '🇧🇴' },
  { value: 'BR', label: 'Brazil', capital: 'Brasília', flag: '🇧🇷' },
  { value: 'CL', label: 'Chile', capital: 'Santiago', flag: '🇨🇱' },
  { value: 'CO', label: 'Colombia', capital: 'Bogotá', flag: '🇨🇴' },
  { value: 'EC', label: 'Ecuador', capital: 'Quito', flag: '🇪🇨' },
  { value: 'PE', label: 'Peru', capital: 'Lima', flag: '🇵🇪' },
  { value: 'UY', label: 'Uruguay', capital: 'Montevideo', flag: '🇺🇾' },
];

/** Muted helper text under a story's control, readable in either theme. */
const CAPTION =
  'font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-muted-foreground);';

/** A column of labelled examples, e.g. one per size or variant. */
const STACK = 'display: flex; flex-direction: column; gap: 1rem; width: 260px;';

const meta: Meta<AndesCombobox> = {
  title: 'Combobox',
  component: AndesCombobox,
  tags: ['autodocs'],
  decorators: [
    (story) => ({
      moduleMetadata: {
        imports: [
          AndesCombobox,
          AndesComboboxInput,
          AndesComboboxContent,
          AndesComboboxItem,
          AndesComboboxEmpty,
          AndesButton,
          FormsModule,
        ],
      },
      ...story(),
    }),
  ],
  argTypes: {
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    autoHighlight: { control: 'boolean' },
    allowClear: { control: 'boolean' },
    backfill: { control: 'boolean' },
    loading: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'borderless', 'underlined'],
    },
    status: { control: 'select', options: [undefined, 'error', 'warning'] },
    placement: {
      control: 'select',
      options: ['bottom-start', 'bottom-end', 'top-start', 'top-end'],
    },
  },
  args: {
    disabled: false,
    readOnly: false,
    autoHighlight: true,
    allowClear: false,
    backfill: false,
    loading: false,
    size: 'md',
    variant: 'outlined',
    status: undefined,
    placement: 'bottom-start',
  },
  render: (args) => ({
    props: { ...args, items: FRUITS },
    template: `
      <andes-combobox #combobox [items]="items" [disabled]="disabled" [readOnly]="readOnly" [autoHighlight]="autoHighlight" [allowClear]="allowClear" [backfill]="backfill" [loading]="loading" [size]="size" [variant]="variant" [status]="status" [placement]="placement" style="width: 260px; display: inline-block;">
        <input andesComboboxInput placeholder="Search fruit..." style="width: 100%;" />
        <div andesComboboxContent>
          @for (item of combobox.filteredItems(); track item) {
            <div andesComboboxItem [value]="item">{{ item }}</div>
          } @empty {
            <div andesComboboxEmpty>No results found.</div>
          }
        </div>
      </andes-combobox>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesCombobox>;

export const Default: Story = {};

export const WithNgModel: Story = {
  render: (args) => ({
    props: { ...args, items: FRUITS, value: null },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 260px;">
        <andes-combobox #combobox [items]="items" [(ngModel)]="value">
          <input andesComboboxInput placeholder="Search fruit..." style="width: 100%;" />
          <div andesComboboxContent>
            @for (item of combobox.filteredItems(); track item) {
              <div andesComboboxItem [value]="item">{{ item }}</div>
            } @empty {
              <div andesComboboxEmpty>No results found.</div>
            }
          </div>
        </andes-combobox>
        <span>Selected: {{ value ?? '(none)' }}</span>
      </div>
    `,
  }),
};

/** Shows the trailing check the currently selected suggestion carries, as `AndesSelect` does. */
export const WithSelectedValue: Story = {
  render: (args) => ({
    props: { ...args, items: FRUITS, value: 'Banana' },
    template: `
      <andes-combobox #combobox [items]="items" [(ngModel)]="value" style="width: 260px; display: inline-block;">
        <input andesComboboxInput placeholder="Search fruit..." style="width: 100%;" />
        <div andesComboboxContent>
          @for (item of combobox.filteredItems(); track item) {
            <div andesComboboxItem [value]="item">{{ item }}</div>
          } @empty {
            <div andesComboboxEmpty>No results found.</div>
          }
        </div>
      </andes-combobox>
    `,
  }),
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const ReadOnly: Story = {
  args: { readOnly: true },
};

export const NoAutoHighlight: Story = {
  args: { autoHighlight: false },
};

export const EmptyResults: Story = {
  render: (args) => ({
    props: { ...args, items: [] },
    template: `
      <andes-combobox #combobox [items]="items" style="width: 260px; display: inline-block;">
        <input andesComboboxInput placeholder="Nothing will match..." style="width: 100%;" />
        <div andesComboboxContent>
          @for (item of combobox.filteredItems(); track item) {
            <div andesComboboxItem [value]="item">{{ item }}</div>
          } @empty {
            <div andesComboboxEmpty>No results found.</div>
          }
        </div>
      </andes-combobox>
    `,
  }),
};

export const Invalid: Story = {
  render: (args) => ({
    props: { ...args, items: FRUITS },
    template: `
      <andes-combobox #combobox [items]="items" aria-invalid="true" style="width: 260px; display: inline-block;">
        <input andesComboboxInput placeholder="Search fruit..." style="width: 100%;" />
        <div andesComboboxContent>
          @for (item of combobox.filteredItems(); track item) {
            <div andesComboboxItem [value]="item">{{ item }}</div>
          } @empty {
            <div andesComboboxEmpty>No results found.</div>
          }
        </div>
      </andes-combobox>
    `,
  }),
};

/**
 * Data-driven mode: pass `[options]` (`{ value, label }` objects) and the component
 * renders the input, the popup and every option itself. The model holds the option's
 * `value`; the input shows its `label`.
 */
export const Options: Story = {
  render: () => ({
    props: { options: FRUIT_OPTIONS, value: null, caption: CAPTION },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 260px;">
        <andes-combobox [options]="options" [(ngModel)]="value" placeholder="Search fruit..." aria-label="Fruit" />
        <span [style]="caption">Value: {{ value ?? '(none)' }}</span>
      </div>
    `,
  }),
};

/** `{ label, options }` entries render as labelled `role="group"` sections. */
export const GroupedOptions: Story = {
  render: () => ({
    props: { options: GROUPED_OPTIONS },
    template: `
      <andes-combobox [options]="options" placeholder="Search produce..." aria-label="Produce" style="width: 260px; display: inline-block;" />
    `,
  }),
};

/** `[optionTemplate]` renders each option; its context carries the option and the query. */
export const CustomOptionTemplate: Story = {
  render: () => ({
    props: { options: COUNTRIES, caption: CAPTION },
    template: `
      <andes-combobox [options]="options" placeholder="Search country..." aria-label="Country" [optionTemplate]="country" style="width: 300px; display: inline-block;" />
      <ng-template #country let-option>
        <span style="display: flex; align-items: center; gap: 0.5rem;">
          <span aria-hidden="true">{{ option.flag }}</span>
          <span style="flex: 1;">{{ option.label }}</span>
          <span [style]="caption">{{ option.capital }}</span>
        </span>
      </ng-template>
    `,
  }),
};

/**
 * `filterOption` as a function (here: prefix match only) and `optionFilterProp` (here:
 * the second box matches the ISO code in `value`, not the label - try "pe").
 */
export const CustomFilter: Story = {
  render: () => ({
    props: {
      options: COUNTRIES,
      startsWith: (query: string, option: AndesComboboxOption) =>
        (option.label ?? '').toLowerCase().startsWith(query.toLowerCase()),
      caption: CAPTION,
      stack: STACK,
    },
    template: `
      <div [style]="stack">
        <span [style]="caption">Prefix match on the label</span>
        <andes-combobox [options]="options" [filterOption]="startsWith" placeholder="Try &quot;b&quot;..." aria-label="Country, prefix match" />
        <span [style]="caption">Matches the ISO code (optionFilterProp="value")</span>
        <andes-combobox [options]="options" optionFilterProp="value" placeholder="Try &quot;pe&quot;..." aria-label="Country by code" />
      </div>
    `,
  }),
};

/**
 * Server-side search: `filterOption="false"` shows whatever the server returned,
 * `(searchChange)` fires the request and `loading` shows a spinner meanwhile.
 */
export const AsyncSearch: Story = {
  render: () => {
    const results = signal<readonly AndesComboboxOption[]>([]);
    const loading = signal(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const search = (text: string) => {
      clearTimeout(timer);
      if (!text.trim()) {
        loading.set(false);
        results.set([]);
        return;
      }
      loading.set(true);
      timer = setTimeout(() => {
        const query = text.trim().toLowerCase();
        results.set(
          COUNTRIES.filter((c) =>
            (c.label ?? '').toLowerCase().includes(query),
          ),
        );
        loading.set(false);
      }, 800);
    };
    return {
      props: { results, loading, search },
      template: `
        <andes-combobox [options]="results()" [loading]="loading()" filterOption="false" (searchChange)="search($event)" notFoundContent="No countries found." placeholder="Type to search countries..." aria-label="Country" style="width: 280px; display: inline-block;" />
      `,
    };
  },
};

/** A clear button appears while there is text; `(clear)` reports its use. */
export const AllowClear: Story = {
  render: () => ({
    props: { options: FRUIT_OPTIONS, value: 'mango' },
    template: `
      <andes-combobox [options]="options" [(ngModel)]="value" allowClear placeholder="Search fruit..." aria-label="Fruit" style="width: 260px; display: inline-block;" />
    `,
  }),
};

/** Arrow keys preview the highlighted option in the input; Enter or leaving keeps it, Escape reverts. */
export const Backfill: Story = {
  render: () => ({
    props: { options: FRUIT_OPTIONS },
    template: `
      <andes-combobox [options]="options" backfill placeholder="Type, then use the arrow keys" aria-label="Fruit" style="width: 280px; display: inline-block;" />
    `,
  }),
};

/** `[(open)]` two-way binds the popup. */
export const ControlledOpen: Story = {
  render: () => ({
    props: { options: FRUIT_OPTIONS, open: false, caption: CAPTION },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 260px;">
        <!-- Above the field, so the open popup never covers them. Two buttons rather than
             one toggle: pressing anything outside an open popup already closes it. -->
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <andes-button size="sm" variant="outline" (click)="open = true">Open</andes-button>
          <andes-button size="sm" variant="outline" (click)="open = false">Close</andes-button>
          <span [style]="caption">open: {{ open }}</span>
        </div>
        <andes-combobox [options]="options" [(open)]="open" placeholder="Search fruit..." aria-label="Fruit" />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    props: { options: FRUIT_OPTIONS, stack: STACK },
    template: `
      <div [style]="stack">
        <andes-combobox [options]="options" size="sm" placeholder="Small" aria-label="Small" allowClear />
        <andes-combobox [options]="options" size="md" placeholder="Medium" aria-label="Medium" allowClear />
        <andes-combobox [options]="options" size="lg" placeholder="Large" aria-label="Large" allowClear />
      </div>
    `,
  }),
};

/** `status="error"` also sets `aria-invalid`; `warning` is visual only. */
export const Status: Story = {
  render: () => ({
    props: { options: FRUIT_OPTIONS, stack: STACK },
    template: `
      <div [style]="stack">
        <andes-combobox [options]="options" status="error" placeholder="Error" aria-label="Error" />
        <andes-combobox [options]="options" status="warning" placeholder="Warning" aria-label="Warning" />
        <andes-combobox [options]="options" status="error" variant="filled" placeholder="Error, filled" aria-label="Error, filled" />
        <andes-combobox [options]="options" status="warning" variant="underlined" placeholder="Warning, underlined" aria-label="Warning, underlined" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    props: { options: FRUIT_OPTIONS, stack: STACK },
    template: `
      <div [style]="stack">
        <andes-combobox [options]="options" variant="outlined" placeholder="Outlined" aria-label="Outlined" />
        <andes-combobox [options]="options" variant="filled" placeholder="Filled" aria-label="Filled" />
        <andes-combobox [options]="options" variant="borderless" placeholder="Borderless" aria-label="Borderless" />
        <andes-combobox [options]="options" variant="underlined" placeholder="Underlined" aria-label="Underlined" />
      </div>
    `,
  }),
};

/** `placement` picks the preferred side and alignment; the popup still flips when it does not fit. */
export const Placement: Story = {
  render: () => ({
    props: { options: FRUIT_OPTIONS },
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, 200px); gap: 1rem; padding-block: 18rem;">
        <andes-combobox [options]="options" placement="top-start" placeholder="top-start" aria-label="top-start" [popupMatchSelectWidth]="260" />
        <andes-combobox [options]="options" placement="top-end" placeholder="top-end" aria-label="top-end" [popupMatchSelectWidth]="260" />
        <andes-combobox [options]="options" placement="bottom-start" placeholder="bottom-start" aria-label="bottom-start" [popupMatchSelectWidth]="260" />
        <andes-combobox [options]="options" placement="bottom-end" placeholder="bottom-end" aria-label="bottom-end" [popupMatchSelectWidth]="260" />
      </div>
    `,
  }),
};

/** `true` (default) matches the input, a number fixes the width in px, `false` fits the content. */
export const PopupMatchSelectWidth: Story = {
  render: () => ({
    props: { options: COUNTRIES, caption: CAPTION, stack: STACK },
    template: `
      <div [style]="stack">
        <span [style]="caption">Fixed 360px</span>
        <andes-combobox [options]="options" [popupMatchSelectWidth]="360" placeholder="Search country..." aria-label="Fixed width" />
        <span [style]="caption">Content width</span>
        <andes-combobox [options]="options" [popupMatchSelectWidth]="false" placeholder="Search country..." aria-label="Content width" />
      </div>
    `,
  }),
};

/** A custom message, or `null` to hide the popup while nothing matches. */
export const NotFoundContent: Story = {
  render: () => ({
    props: { options: FRUIT_OPTIONS, caption: CAPTION, stack: STACK },
    template: `
      <div [style]="stack">
        <span [style]="caption">Custom message</span>
        <andes-combobox [options]="options" notFoundContent="No fruit by that name." placeholder="Type &quot;xyz&quot;..." aria-label="Custom message" />
        <span [style]="caption">Hidden while empty</span>
        <andes-combobox [options]="options" [notFoundContent]="null" placeholder="Type &quot;xyz&quot;..." aria-label="Hidden while empty" />
      </div>
    `,
  }),
};

/** `autoFocus` focuses (and so opens) the field on render; `maxLength` caps the text. */
export const AutoFocusAndMaxLength: Story = {
  render: () => ({
    props: { options: FRUIT_OPTIONS },
    template: `
      <andes-combobox [options]="options" autoFocus [maxLength]="6" placeholder="At most 6 characters" aria-label="Fruit" style="width: 260px; display: inline-block;" />
    `,
  }),
};
