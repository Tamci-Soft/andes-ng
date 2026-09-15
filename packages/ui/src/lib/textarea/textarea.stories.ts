import { FormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesTextarea } from './textarea';

const meta: Meta<AndesTextarea> = {
  title: 'Textarea',
  component: AndesTextarea,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    required: { control: 'boolean' },
    placeholder: { control: 'text' },
    rows: { control: 'number' },
    maxLength: { control: 'number' },
    showCount: { control: 'boolean' },
    resize: {
      control: 'select',
      options: ['none', 'vertical', 'horizontal', 'both'],
    },
    autoSize: { control: 'boolean' },
    autoSizeMinRows: { control: 'number' },
    autoSizeMaxRows: { control: 'number' },
  },
  args: {
    size: 'md',
    disabled: false,
    readonly: false,
    required: false,
    placeholder: 'Type your message…',
    rows: 3,
    showCount: false,
    resize: 'vertical',
    autoSize: false,
  },
  render: (args) => ({
    props: args,
    template: `<div style="width: 320px;">
      <andes-textarea
        [size]="size"
        [disabled]="disabled"
        [readonly]="readonly"
        [required]="required"
        [placeholder]="placeholder"
        [rows]="rows"
        [maxLength]="maxLength"
        [showCount]="showCount"
        [resize]="resize"
        [autoSize]="autoSize"
        [autoSizeMinRows]="autoSizeMinRows"
        [autoSizeMaxRows]="autoSizeMaxRows"
        aria-label="Message"
      />
    </div>`,
  }),
};

export default meta;

type Story = StoryObj<AndesTextarea>;

export const Overview: Story = {};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Medium: Story = {
  args: { size: 'md' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Can’t type here' },
};

export const ReadOnly: Story = {
  args: {
    readonly: true,
    rows: 2,
  },
  render: (args) => ({
    props: args,
    template: `<div style="width: 320px;">
      <andes-textarea [readonly]="readonly" [rows]="rows" aria-label="Message">This value can't be edited.</andes-textarea>
    </div>`,
  }),
};

export const Required: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="width: 320px;">
      <label for="required-textarea" style="display: block; font-size: 0.875rem; margin-bottom: 0.25rem;">Message <span aria-hidden="true">*</span></label>
      <andes-textarea id="required-textarea" [size]="size" required placeholder="Required field" />
    </div>`,
  }),
};

export const Invalid: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="width: 320px;">
      <andes-textarea [size]="size" aria-label="Message" aria-invalid="true" aria-describedby="textarea-error" />
      <p id="textarea-error" style="color: #dc2626; font-size: 0.8rem; margin-top: 0.25rem;">This field is required.</p>
    </div>`,
  }),
};

export const WithCharacterCount: Story = {
  args: {
    showCount: true,
    maxLength: 120,
    placeholder: 'Up to 120 characters',
  },
};

export const ResizeModes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <div style="width: 220px;">
          <p style="font-size: 0.75rem; margin-bottom: 0.25rem;">none</p>
          <andes-textarea resize="none" aria-label="Resize none" placeholder="none" />
        </div>
        <div style="width: 220px;">
          <p style="font-size: 0.75rem; margin-bottom: 0.25rem;">vertical (default)</p>
          <andes-textarea resize="vertical" aria-label="Resize vertical" placeholder="vertical" />
        </div>
        <div style="width: 220px;">
          <p style="font-size: 0.75rem; margin-bottom: 0.25rem;">horizontal</p>
          <andes-textarea resize="horizontal" aria-label="Resize horizontal" placeholder="horizontal" />
        </div>
        <div style="width: 220px;">
          <p style="font-size: 0.75rem; margin-bottom: 0.25rem;">both</p>
          <andes-textarea resize="both" aria-label="Resize both" placeholder="both" />
        </div>
      </div>
    `,
  }),
};

export const AutoSize: Story = {
  args: {
    autoSize: true,
    autoSizeMinRows: 2,
    autoSizeMaxRows: 6,
    placeholder: 'Grows as you type, up to 6 rows…',
  },
};

export const WithNgModel: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [FormsModule] },
    props: { ...args, value: 'Bound with [(ngModel)]' },
    template: `<div style="width: 320px;">
      <andes-textarea [(ngModel)]="value" aria-label="Message" />
      <p style="font-size: 0.8rem; margin-top: 0.5rem;">Value: {{ value }}</p>
    </div>`,
  }),
};
