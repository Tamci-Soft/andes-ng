import { JsonPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesColor } from './color';
import { AndesColorPicker } from './color-picker';
import { AndesColorPickerTrigger } from './color-picker-trigger';
import type { AndesColorPreset } from './color-picker-types';

const IMPORTS = [
  AndesColorPicker,
  AndesColorPickerTrigger,
  JsonPipe,
  ReactiveFormsModule,
];

const PRESETS: readonly AndesColorPreset[] = [
  {
    label: 'Recommended',
    colors: [
      '#f5222d',
      '#fa8c16',
      '#fadb14',
      '#8bbb11',
      '#52c41a',
      '#13a8a8',
      '#1677ff',
      '#2f54eb',
      '#722ed1',
      '#eb2f96',
    ],
  },
  {
    label: 'Neutrals',
    colors: ['#000000', '#434343', '#8c8c8c', '#d9d9d9', '#f5f5f5', '#ffffff'],
  },
  {
    label: 'Brand',
    defaultOpen: false,
    colors: ['#0b5cff', '#00b8a9', '#f6416c', '#ffde7d'],
  },
];

const meta: Meta<AndesColorPicker> = {
  title: 'Color Picker',
  component: AndesColorPicker,
  tags: ['autodocs'],
  // The panel opens below the trigger, so the stories sit at the top of the canvas.
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    status: { control: 'select', options: [undefined, 'error', 'warning'] },
    defaultFormat: { control: 'select', options: ['hex', 'rgb', 'hsb'] },
    placement: {
      control: 'select',
      options: ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'],
    },
    disabled: { control: 'boolean' },
    allowClear: { control: 'boolean' },
    showText: { control: 'boolean' },
    showAlpha: { control: 'boolean' },
    disabledAlpha: { control: 'boolean' },
    disabledFormat: { control: 'boolean' },
    eyeDropper: { control: 'boolean' },
  },
  args: {
    size: 'md',
    status: undefined,
    defaultFormat: 'hex',
    placement: 'bottomLeft',
    disabled: false,
    allowClear: false,
    showText: false,
    showAlpha: true,
    disabledAlpha: false,
    disabledFormat: false,
    eyeDropper: true,
  },
  render: (args) => ({
    moduleMetadata: { imports: IMPORTS },
    props: { ...args, value: '#1677ff' },
    template: `
      <andes-color-picker
        aria-label="Brand color"
        [(value)]="value"
        [size]="size"
        [status]="status"
        [defaultFormat]="defaultFormat"
        [placement]="placement"
        [disabled]="disabled"
        [allowClear]="allowClear"
        [showText]="showText"
        [showAlpha]="showAlpha"
        [disabledAlpha]="disabledAlpha"
        [disabledFormat]="disabledFormat"
        [eyeDropper]="eyeDropper"
      />
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesColorPicker>;

export const Default: Story = {};

export const Empty: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
        <andes-color-picker aria-label="Accent color" showText placeholder="Pick a color" />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    template: `
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        <andes-color-picker aria-label="Small" size="sm" value="#52c41a" />
        <andes-color-picker aria-label="Medium" size="md" value="#1677ff" />
        <andes-color-picker aria-label="Large" size="lg" value="#f5222d" />
      </div>
      <div style="display: flex; gap: 1.5rem; align-items: center; margin-top: 1rem;">
        <andes-color-picker aria-label="Small with text" size="sm" value="#52c41a" showText />
        <andes-color-picker aria-label="Medium with text" size="md" value="#1677ff" showText />
        <andes-color-picker aria-label="Large with text" size="lg" value="#f5222d" showText />
      </div>
    `,
  }),
};

export const ShowText: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { value: 'rgba(22, 119, 255, 0.6)' },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
        <andes-color-picker aria-label="Text color" [(value)]="value" showText defaultFormat="rgb" />
        <ng-template #named let-color let-text="value">
          <span style="display: inline-flex; gap: 0.5rem;">
            <strong>Brand</strong>
            <span style="opacity: 0.7;">{{ text }}</span>
          </span>
        </ng-template>
        <andes-color-picker aria-label="Branded text" value="#722ed1" [showText]="named" />
      </div>
    `,
  }),
};

export const TwoWayBinding: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { value: '#fa8c16', events: [] as string[] },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start; width: 22rem;">
        <andes-color-picker
          aria-label="Warning color"
          [(value)]="value"
          showText
          (colorChange)="events = ['change ' + $event.value, ...events].slice(0, 4)"
          (colorChangeComplete)="events = ['complete ' + $event.value, ...events].slice(0, 4)"
        />
        <code style="font-size: 0.75rem;">value: {{ value }}</code>
        <code style="font-size: 0.75rem; white-space: pre;">{{ events.join('\\n') }}</code>
      </div>
    `,
  }),
};

export const ColorObject: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { color: AndesColor.parse('#13a8a8') },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
        <andes-color-picker aria-label="Accent" [(value)]="color" showText />
        <code style="font-size: 0.75rem;">
          {{ color.toRgbString() }} · {{ color.toHsbString() }}
        </code>
      </div>
    `,
  }),
};

export const Presets: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { presets: PRESETS, value: '#1677ff' },
    template: `
      <andes-color-picker aria-label="Theme color" [(value)]="value" [presets]="presets" showText />
    `,
  }),
};

export const AllowClear: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { value: '#eb2f96', cleared: 0 },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
        <andes-color-picker
          aria-label="Highlight"
          [(value)]="value"
          allowClear
          showText
          placeholder="No highlight"
          (clear)="cleared = cleared + 1"
        />
        <code style="font-size: 0.75rem;">value: {{ value ?? 'null' }} · cleared {{ cleared }}×</code>
      </div>
    `,
  }),
};

export const Formats: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { value: '#2f54eb', format: 'rgb' },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
          <span style="font-size: 0.75rem;">Starts in HSB, the user can switch</span>
          <andes-color-picker aria-label="Starts in HSB" defaultFormat="hsb" value="hsb(215, 91%, 100%)" showText />
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
          <span style="font-size: 0.75rem;">Controlled: the format is {{ format }}</span>
          <andes-color-picker
            aria-label="Controlled format"
            [(value)]="value"
            [format]="format"
            (formatChange)="format = $event"
            showText
          />
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
          <span style="font-size: 0.75rem;">Format switch hidden</span>
          <andes-color-picker aria-label="Fixed RGB" format="rgb" disabledFormat value="#13a8a8" showText />
        </div>
      </div>
    `,
  }),
};

export const Opacity: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
        <andes-color-picker aria-label="With opacity" value="#1677ff80" showText />
        <andes-color-picker aria-label="Opacity controls hidden" value="#1677ff80" [showAlpha]="false" showText />
        <andes-color-picker aria-label="Opaque only" value="#1677ff80" disabledAlpha showText />
      </div>
    `,
  }),
};

export const States: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
        <andes-color-picker aria-label="Disabled" disabled value="#1677ff" showText />
        <andes-color-picker aria-label="Error" status="error" value="#f5222d" showText />
        <andes-color-picker aria-label="Warning" status="warning" value="#fa8c16" showText />
      </div>
    `,
  }),
};

export const CustomTrigger: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { value: '#722ed1' },
    template: `
      <andes-color-picker aria-label="Heading color" [(value)]="value">
        <span andesColorPickerTrigger style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: underline; text-decoration-color: currentColor;">
          <span style="width: 0.75rem; height: 0.75rem; border-radius: 9999px;" [style.background]="value"></span>
          Heading color
        </span>
      </andes-color-picker>
    `,
  }),
};

export const Placement: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    template: `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; height: 26rem; padding: 1rem;">
        <andes-color-picker aria-label="Opens upwards, start" placement="topLeft" value="#1677ff" />
        <andes-color-picker aria-label="Opens upwards, end" placement="topRight" value="#52c41a" />
      </div>
    `,
  }),
};

export const ReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { control: new FormControl('#fa541c', { nonNullable: true }) },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
        <label for="story-accent" style="font-size: 0.875rem;">Accent color</label>
        <andes-color-picker id="story-accent" [formControl]="control" showText />
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" (click)="control.setValue('#13c2c2')">Set teal</button>
          <button type="button" (click)="control.disabled ? control.enable() : control.disable()">
            Toggle disabled
          </button>
        </div>
        <code style="font-size: 0.75rem;">value: {{ control.value | json }} · {{ control.status }}</code>
      </div>
    `,
  }),
};
