import { FormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesCombobox } from './combobox';
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
  },
  args: {
    disabled: false,
    readOnly: false,
    autoHighlight: true,
  },
  render: (args) => ({
    props: { ...args, items: FRUITS },
    template: `
      <andes-combobox #combobox [items]="items" [disabled]="disabled" [readOnly]="readOnly" [autoHighlight]="autoHighlight" style="width: 260px; display: inline-block;">
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
