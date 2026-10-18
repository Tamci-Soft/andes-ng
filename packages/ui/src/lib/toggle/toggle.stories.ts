import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesToggle } from './toggle';
import { AndesToggleGroup } from './toggle-group';

const bold = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 2.5h4a2.5 2.5 0 0 1 0 5h-4zM4.5 7.5h4.5a2.5 2.5 0 0 1 0 5H4.5z"/></svg>`;
const italic = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2.5H6.5M9.5 13.5H6M9.8 2.5 6.2 13.5"/></svg>`;
const underline = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 2.5v5a3.5 3.5 0 0 0 7 0v-5M3 14h10"/></svg>`;
const left = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2 3.5h12M2 6.5h8M2 9.5h12M2 12.5h8"/></svg>`;
const center = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2 3.5h12M4 6.5h8M2 9.5h12M4 12.5h8"/></svg>`;
const right = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2 3.5h12M6 6.5h8M2 9.5h12M6 12.5h8"/></svg>`;

const meta: Meta<AndesToggle> = {
  title: 'Toggle',
  component: AndesToggle,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'outline'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    pressed: { control: 'boolean' },
    tooltip: { control: 'text' },
  },
  args: { variant: 'default', size: 'md', disabled: false, pressed: false },
  render: (args) => ({
    props: args,
    template: `<andes-toggle aria-label="Bold" tooltip="Bold" [(pressed)]="pressed" [variant]="variant" [size]="size" [disabled]="disabled">${bold}</andes-toggle>`,
  }),
};

export default meta;

type Story = StoryObj<AndesToggle>;

export const Default: Story = {};

export const Pressed: Story = { args: { pressed: true } };

export const Outline: Story = { args: { variant: 'outline' } };

export const OutlinePressed: Story = {
  args: { variant: 'outline', pressed: true },
};

export const Disabled: Story = { args: { disabled: true } };

export const WithText: Story = {
  render: (args) => ({
    props: args,
    template: `<andes-toggle [(pressed)]="pressed" [variant]="variant" [size]="size" [disabled]="disabled">${italic} Italic</andes-toggle>`,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 0.75rem; align-items: center;">
        <andes-toggle size="sm" variant="outline" aria-label="Bold">${bold}</andes-toggle>
        <andes-toggle size="md" variant="outline" aria-label="Bold">${bold}</andes-toggle>
        <andes-toggle size="lg" variant="outline" aria-label="Bold">${bold}</andes-toggle>
        <andes-toggle size="sm" variant="outline">Small</andes-toggle>
        <andes-toggle size="md" variant="outline">Medium</andes-toggle>
        <andes-toggle size="lg" variant="outline">Large</andes-toggle>
      </div>
    `,
  }),
};

export const ReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule] },
    props: { control: new FormControl(true) },
    template: `
      <div style="display: flex; gap: 1rem; align-items: center;">
        <andes-toggle variant="outline" aria-label="Underline" [formControl]="control">${underline}</andes-toggle>
        <span style="font-size: 0.875rem; line-height: 1.375rem;">Control value: {{ control.value }}</span>
      </div>
    `,
  }),
};

export const NgModel: Story = {
  render: () => ({
    moduleMetadata: { imports: [FormsModule] },
    props: { on: false },
    template: `
      <div style="display: flex; gap: 1rem; align-items: center;">
        <andes-toggle variant="outline" [(ngModel)]="on">Notifications</andes-toggle>
        <span style="font-size: 0.875rem; line-height: 1.375rem;">{{ on ? 'on' : 'off' }}</span>
      </div>
    `,
  }),
};

/** Single type: at most one pressed; pressing it again clears the value. */
export const GroupSingle: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesToggleGroup] },
    props: { value: 'center' },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
        <andes-toggle-group aria-label="Text alignment" type="single" [(value)]="value">
          <andes-toggle value="left" aria-label="Align left">${left}</andes-toggle>
          <andes-toggle value="center" aria-label="Align center">${center}</andes-toggle>
          <andes-toggle value="right" aria-label="Align right">${right}</andes-toggle>
        </andes-toggle-group>
        <span style="font-size: 0.75rem; line-height: 1.25rem;">value: {{ value ?? 'none' }}</span>
      </div>
    `,
  }),
};

export const GroupSingleRequired: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesToggleGroup] },
    props: { value: 'list' },
    template: `
      <andes-toggle-group aria-label="View" variant="outline" [allowEmpty]="false" [(value)]="value">
        <andes-toggle value="list">List</andes-toggle>
        <andes-toggle value="board">Board</andes-toggle>
        <andes-toggle value="calendar">Calendar</andes-toggle>
      </andes-toggle-group>
    `,
  }),
};

/** Multiple type: `value` is an array. */
export const GroupMultiple: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesToggleGroup] },
    props: { value: ['bold', 'underline'] },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
        <andes-toggle-group aria-label="Text formatting" type="multiple" variant="outline" [(value)]="value">
          <andes-toggle value="bold" aria-label="Bold">${bold}</andes-toggle>
          <andes-toggle value="italic" aria-label="Italic">${italic}</andes-toggle>
          <andes-toggle value="underline" aria-label="Underline">${underline}</andes-toggle>
        </andes-toggle-group>
        <span style="font-size: 0.75rem; line-height: 1.25rem;">value: {{ value.join(', ') || 'none' }}</span>
      </div>
    `,
  }),
};

export const GroupDefaultVariant: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesToggleGroup] },
    template: `
      <andes-toggle-group aria-label="Text formatting" type="multiple">
        <andes-toggle value="bold" aria-label="Bold">${bold}</andes-toggle>
        <andes-toggle value="italic" aria-label="Italic">${italic}</andes-toggle>
        <andes-toggle value="underline" aria-label="Underline">${underline}</andes-toggle>
      </andes-toggle-group>
    `,
  }),
};

/** `spacing` separates the buttons instead of joining them. */
export const GroupSpacing: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesToggleGroup] },
    template: `
      <andes-toggle-group aria-label="Quick filters" type="multiple" variant="outline" [spacing]="8" [value]="['open']">
        <andes-toggle value="open">Open</andes-toggle>
        <andes-toggle value="mine">Assigned to me</andes-toggle>
        <andes-toggle value="late">Overdue</andes-toggle>
      </andes-toggle-group>
    `,
  }),
};

export const GroupVertical: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesToggleGroup] },
    template: `
      <andes-toggle-group aria-label="Alignment" variant="outline" orientation="vertical" value="center">
        <andes-toggle value="left" aria-label="Align left">${left}</andes-toggle>
        <andes-toggle value="center" aria-label="Align center">${center}</andes-toggle>
        <andes-toggle value="right" aria-label="Align right">${right}</andes-toggle>
      </andes-toggle-group>
    `,
  }),
};

export const GroupSizes: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesToggleGroup] },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
        <andes-toggle-group aria-label="Small" variant="outline" size="sm" value="b"><andes-toggle value="a">A</andes-toggle><andes-toggle value="b">B</andes-toggle><andes-toggle value="c">C</andes-toggle></andes-toggle-group>
        <andes-toggle-group aria-label="Medium" variant="outline" size="md" value="b"><andes-toggle value="a">A</andes-toggle><andes-toggle value="b">B</andes-toggle><andes-toggle value="c">C</andes-toggle></andes-toggle-group>
        <andes-toggle-group aria-label="Large" variant="outline" size="lg" value="b"><andes-toggle value="a">A</andes-toggle><andes-toggle value="b">B</andes-toggle><andes-toggle value="c">C</andes-toggle></andes-toggle-group>
      </div>
    `,
  }),
};

export const GroupDisabled: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesToggleGroup] },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
        <andes-toggle-group aria-label="Disabled group" variant="outline" disabled value="b"><andes-toggle value="a">A</andes-toggle><andes-toggle value="b">B</andes-toggle></andes-toggle-group>
        <andes-toggle-group aria-label="One disabled" variant="outline" value="a"><andes-toggle value="a">A</andes-toggle><andes-toggle value="b" disabled>B</andes-toggle><andes-toggle value="c">C</andes-toggle></andes-toggle-group>
      </div>
    `,
  }),
};

export const GroupReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesToggleGroup, ReactiveFormsModule] },
    props: { control: new FormControl(['mon', 'wed']) },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
        <andes-toggle-group aria-label="Days" type="multiple" variant="outline" [formControl]="control">
          <andes-toggle value="mon">Mon</andes-toggle>
          <andes-toggle value="tue">Tue</andes-toggle>
          <andes-toggle value="wed">Wed</andes-toggle>
          <andes-toggle value="thu">Thu</andes-toggle>
          <andes-toggle value="fri">Fri</andes-toggle>
        </andes-toggle-group>
        <span style="font-size: 0.75rem; line-height: 1.25rem;">Control value: {{ control.value }}</span>
      </div>
    `,
  }),
};
