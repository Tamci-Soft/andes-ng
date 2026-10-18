import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesDescriptionItem } from './description-item';
import { AndesDescriptions } from './descriptions';

const meta: Meta<AndesDescriptions> = {
  title: 'Descriptions',
  component: AndesDescriptions,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [AndesDescriptions, AndesDescriptionItem, AndesButton],
    }),
  ],
  parameters: { layout: 'padded' },
  argTypes: {
    title: { control: 'text' },
    bordered: { control: 'boolean' },
    layout: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    column: { control: 'number' },
    size: { control: 'inline-radio', options: ['default', 'middle', 'small'] },
    colon: { control: 'boolean' },
    ellipsis: { control: 'boolean' },
  },
  args: {
    title: 'Supplier',
    bordered: false,
    layout: 'horizontal',
    column: 3,
    size: 'default',
    colon: true,
    ellipsis: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <andes-descriptions
        [title]="title"
        [bordered]="bordered"
        [layout]="layout"
        [column]="column"
        [size]="size"
        [colon]="colon"
        [ellipsis]="ellipsis"
      >
        <andes-description-item label="Name">Andes Metals S.A.C.</andes-description-item>
        <andes-description-item label="Tax id">20512345678</andes-description-item>
        <andes-description-item label="Phone">+51 1 555 0142</andes-description-item>
        <andes-description-item label="Region">Lima</andes-description-item>
        <andes-description-item label="Payment terms">30 days net</andes-description-item>
        <andes-description-item label="Rating">A</andes-description-item>
        <andes-description-item label="Address" span="filled">Av. Industrial 1450, Callao, Peru</andes-description-item>
      </andes-descriptions>`,
  }),
};

export default meta;

type Story = StoryObj<AndesDescriptions>;

export const Default: Story = {};

export const Bordered: Story = {
  args: { bordered: true },
};

export const BorderedVertical: Story = {
  args: { bordered: true, layout: 'vertical' },
};

export const Vertical: Story = {
  args: { layout: 'vertical' },
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display:grid; gap: 2rem">
        @for (size of ['default', 'middle', 'small']; track size) {
        <andes-descriptions [title]="'Size: ' + size" bordered [size]="size" [column]="3">
          <andes-description-item label="Product">Steel sheet 2mm</andes-description-item>
          <andes-description-item label="Quantity">120</andes-description-item>
          <andes-description-item label="Price">S/ 84.00</andes-description-item>
        </andes-descriptions>
        }
      </div>`,
  }),
};

export const Spans: Story = {
  render: () => ({
    template: `
      <andes-descriptions title="Spans" bordered [column]="3">
        <andes-description-item label="One">1</andes-description-item>
        <andes-description-item label="Two" [span]="2">spans 2 of 3 columns</andes-description-item>
        <andes-description-item label="Three" [span]="3">spans the whole row</andes-description-item>
        <andes-description-item label="Start">1</andes-description-item>
        <andes-description-item label="Filled" span="filled">takes the rest of the row</andes-description-item>
      </andes-descriptions>`,
  }),
};

export const TitleAndExtra: Story = {
  render: () => ({
    template: `
      <andes-descriptions title="Invoice F001-4012" bordered [column]="2">
        <span andesDescriptionsExtra style="display:flex; gap:.5rem">
          <andes-button size="sm" variant="outline">Download</andes-button>
          <andes-button size="sm">Edit</andes-button>
        </span>
        <andes-description-item label="Customer">Lucia Paredes</andes-description-item>
        <andes-description-item label="Issued">12 Oct 2026</andes-description-item>
        <andes-description-item label="Due">11 Nov 2026</andes-description-item>
        <andes-description-item label="Total">S/ 1,284.50</andes-description-item>
      </andes-descriptions>`,
  }),
};

export const TemplateLabelsAndContent: Story = {
  render: () => ({
    template: `
      <andes-descriptions title="Account" [column]="2">
        <andes-description-item [label]="statusLabel">
          <span style="color: var(--andes-color-success-text, #15803d); font-weight: 500">Active</span>
        </andes-description-item>
        <andes-description-item label="Plan">
          Business <a href="#" style="color: var(--andes-color-primary-text, #2563eb)">(upgrade)</a>
        </andes-description-item>
        <andes-description-item label="Members" span="filled">
          <ul style="margin:0; padding-inline-start: 1.25rem">
            <li>Lucia Paredes</li>
            <li>Marco Quispe</li>
          </ul>
        </andes-description-item>
      </andes-descriptions>
      <ng-template #statusLabel><strong>Status</strong></ng-template>`,
  }),
};

export const ResponsiveColumns: Story = {
  render: () => ({
    template: `
      <p style="font-size:.75rem; margin:0 0 .5rem">Drag the corner: columns follow this box's width, not the window.</p>
      <div style="width: 100%; max-width: 60rem; min-width: 14rem; resize: horizontal; overflow: auto; border: 1px dashed var(--andes-color-border); padding: 1rem">
        <andes-descriptions title="Container-based" bordered [column]="{ xs: 1, sm: 2, md: 3 }">
          <andes-description-item label="Item">Steel sheet</andes-description-item>
          <andes-description-item label="SKU">ST-2000</andes-description-item>
          <andes-description-item label="Stock">1,204</andes-description-item>
          <andes-description-item label="Unit">kg</andes-description-item>
          <andes-description-item label="Warehouse">Callao</andes-description-item>
          <andes-description-item label="Updated">Today</andes-description-item>
        </andes-descriptions>
      </div>`,
  }),
};

export const LongContent: Story = {
  render: () => ({
    template: `
      <div style="display:grid; gap: 2rem; max-width: 40rem">
        <andes-descriptions title="Wrapping (default)" bordered [column]="2">
          <andes-description-item label="Reference">PO-2026-10-00418-REV-3-APPROVED-BY-FINANCE-AND-LEGAL</andes-description-item>
          <andes-description-item label="Notes">Deliver to the loading dock between 8am and noon, ask for the shift supervisor before unloading.</andes-description-item>
        </andes-descriptions>
        <andes-descriptions title="Truncated" bordered [column]="2" ellipsis>
          <andes-description-item label="Reference">PO-2026-10-00418-REV-3-APPROVED-BY-FINANCE-AND-LEGAL</andes-description-item>
          <andes-description-item label="Notes">Deliver to the loading dock between 8am and noon, ask for the shift supervisor before unloading.</andes-description-item>
        </andes-descriptions>
        <andes-descriptions title="Truncated, plain" [column]="2" ellipsis>
          <andes-description-item label="Reference">PO-2026-10-00418-REV-3-APPROVED-BY-FINANCE-AND-LEGAL</andes-description-item>
          <andes-description-item label="Notes" [ellipsis]="false">This one wraps even though the group truncates, because it opts out.</andes-description-item>
        </andes-descriptions>
      </div>`,
  }),
};

export const StyledWithProperties: Story = {
  render: () => ({
    template: `
      <andes-descriptions
        title="Custom look"
        bordered
        [column]="2"
        style="
          --andes-descriptions-label-background: color-mix(in srgb, var(--andes-color-primary, #2563eb) 8%, transparent);
          --andes-descriptions-label-color: var(--andes-color-primary-text, #2563eb);
          --andes-descriptions-label-weight: 500;
          --andes-descriptions-label-width: 9rem;
          --andes-descriptions-border-color: color-mix(in srgb, var(--andes-color-primary, #2563eb) 30%, transparent);
        "
      >
        <andes-description-item label="Owner">Lucia Paredes</andes-description-item>
        <andes-description-item label="Team">Operations</andes-description-item>
        <andes-description-item label="Created">12 Oct 2026</andes-description-item>
        <andes-description-item label="Status">Open</andes-description-item>
      </andes-descriptions>`,
  }),
};

export const WithoutColon: Story = {
  args: { colon: false },
};

export const Rtl: Story = {
  render: () => ({
    template: `
      <div dir="rtl">
        <andes-descriptions title="Details" bordered [column]="2">
          <andes-description-item label="Name">Lucia Paredes</andes-description-item>
          <andes-description-item label="City">Lima</andes-description-item>
          <andes-description-item label="Notes" span="filled">Prefers email contact</andes-description-item>
        </andes-descriptions>
        <div style="margin-top: 2rem">
          <andes-descriptions title="Plain" [column]="2">
            <andes-description-item label="Name">Lucia Paredes</andes-description-item>
            <andes-description-item label="City">Lima</andes-description-item>
          </andes-descriptions>
        </div>
      </div>`,
  }),
};

export const DynamicItems: Story = {
  render: () => ({
    props: {
      fields: [
        { label: 'Customer', value: 'Lucia Paredes' },
        { label: 'Items', value: '14' },
        { label: 'Total', value: 'S/ 1,284.50' },
      ],
      add(this: { fields: { label: string; value: string }[] }) {
        this.fields = [
          ...this.fields,
          { label: 'Field ' + (this.fields.length + 1), value: 'Added' },
        ];
      },
    },
    template: `
      <andes-descriptions title="Generated from data" bordered [column]="3">
        @for (field of fields; track field.label) {
          <andes-description-item [label]="field.label">{{ field.value }}</andes-description-item>
        }
      </andes-descriptions>
      <andes-button style="margin-top: 1rem" size="sm" variant="outline" (click)="add()">Add field</andes-button>`,
  }),
};
