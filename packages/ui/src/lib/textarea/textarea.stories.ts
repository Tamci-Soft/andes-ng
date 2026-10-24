import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import {
  AndesTextarea,
  AndesTextareaCountInfo,
  AndesTextareaExceedFormatter,
  AndesTextareaResizeEvent,
} from './textarea';

// Counts grapheme clusters, so a family emoji or a skin-toned thumbs-up counts as one.
const countGraphemes = (value: string) =>
  [...new Intl.Segmenter().segment(value)].length;

const keepGraphemes: AndesTextareaExceedFormatter = (value, { max }) =>
  [...new Intl.Segmenter().segment(value)]
    .slice(0, max)
    .map(({ segment }) => segment)
    .join('');

const meta: Meta<AndesTextarea> = {
  title: 'Textarea',
  component: AndesTextarea,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'borderless', 'underlined'],
    },
    status: { control: 'select', options: [undefined, 'error', 'warning'] },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    required: { control: 'boolean' },
    clearable: { control: 'boolean' },
    placeholder: { control: 'text' },
    rows: { control: 'number' },
    maxLength: { control: 'number' },
    countMax: { control: 'number' },
    showCount: { control: 'boolean' },
    resize: {
      control: 'select',
      options: ['none', 'vertical', 'horizontal', 'both'],
    },
    autoSize: { control: 'object' },
  },
  args: {
    value: '',
    size: 'md',
    variant: 'outlined',
    disabled: false,
    readonly: false,
    required: false,
    clearable: false,
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
        [(value)]="value"
        [size]="size"
        [variant]="variant"
        [status]="status"
        [disabled]="disabled"
        [readonly]="readonly"
        [required]="required"
        [clearable]="clearable"
        [placeholder]="placeholder"
        [rows]="rows"
        [maxLength]="maxLength"
        [countMax]="countMax"
        [showCount]="showCount"
        [resize]="resize"
        [autoSize]="autoSize"
        aria-label="Message"
      />
    </div>`,
  }),
};

export default meta;

type Story = StoryObj<AndesTextarea>;

export const Overview: Story = {};

export const Sizes: Story = {
  render: () => ({
    template: `<div style="display: flex; flex-direction: column; gap: 1rem; width: 320px;">
      <andes-textarea size="sm" [rows]="2" aria-label="Small" value="Small - typed text follows the size" />
      <andes-textarea size="md" [rows]="2" aria-label="Medium" value="Medium - typed text follows the size" />
      <andes-textarea size="lg" [rows]="2" aria-label="Large" value="Large - typed text follows the size" />
    </div>`,
  }),
};

export const Variants: Story = {
  render: () => ({
    template: `<div style="display: flex; flex-direction: column; gap: 1rem; width: 320px;">
      <andes-textarea variant="outlined" [rows]="2" aria-label="Outlined" placeholder="Outlined (default)" />
      <andes-textarea variant="filled" [rows]="2" aria-label="Filled" placeholder="Filled" />
      <andes-textarea variant="borderless" [rows]="2" aria-label="Borderless" placeholder="Borderless" />
      <andes-textarea variant="underlined" [rows]="2" aria-label="Underlined" placeholder="Underlined" />
    </div>`,
  }),
};

export const Status: Story = {
  render: () => ({
    template: `<div style="display: flex; flex-direction: column; gap: 1rem; width: 320px;">
      <andes-textarea status="error" [rows]="2" aria-label="Error" value="status=error (also sets aria-invalid)" />
      <andes-textarea status="warning" [rows]="2" aria-label="Warning" value="status=warning" />
      <andes-textarea variant="filled" status="error" [rows]="2" aria-label="Filled error" value="filled + error" />
      <andes-textarea variant="underlined" status="warning" [rows]="2" aria-label="Underlined warning" value="underlined + warning" />
    </div>`,
  }),
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Can’t type here' },
};

export const ReadOnly: Story = {
  args: {
    readonly: true,
    rows: 2,
    value: "This value can't be edited.",
  },
};

export const Required: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="width: 320px;">
      <label for="required-textarea" style="display: block; font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-foreground); margin-bottom: 0.25rem;">Message <span aria-hidden="true">*</span></label>
      <andes-textarea id="required-textarea" [size]="size" required placeholder="Required field" />
    </div>`,
  }),
};

export const Invalid: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="width: 320px;">
      <andes-textarea [size]="size" aria-label="Message" aria-invalid="true" aria-describedby="textarea-error" />
      <p id="textarea-error" style="font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-danger-text, var(--andes-color-danger)); font-size: 0.75rem; line-height: 1.25rem; margin: 0.25rem 0 0;">This field is required.</p>
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

export const CountFormatter: Story = {
  render: () => ({
    props: {
      formatter: ({ count, maxLength }: AndesTextareaCountInfo) =>
        `${(maxLength ?? 0) - count} characters left`,
      overLimit: 'This value was set programmatically past the limit.',
    },
    template: `<div style="display: flex; flex-direction: column; gap: 1rem; width: 320px;">
      <andes-textarea showCount [maxLength]="80" [countFormatter]="formatter" aria-label="Formatted count" placeholder="Custom count text" />
      <andes-textarea showCount [maxLength]="20" [value]="overLimit" aria-label="Over the limit" />
    </div>`,
  }),
};

export const SoftCountLimit: Story = {
  render: () => ({
    props: {
      text: 'A soft limit lets you keep typing past it, but flags the overflow.',
    },
    template: `<div style="width: 320px;">
      <andes-textarea showCount [countMax]="50" [(value)]="text" aria-label="Soft limit" />
    </div>`,
  }),
};

export const CustomCountStrategy: Story = {
  render: () => ({
    props: {
      countGraphemes,
      keepGraphemes,
      text: '👨‍👩‍👧 👍🏽',
    },
    template: `<div style="display: flex; flex-direction: column; gap: 0.5rem; width: 320px;">
      <andes-textarea
        showCount
        [countMax]="10"
        [countStrategy]="countGraphemes"
        [countExceedFormatter]="keepGraphemes"
        [(value)]="text"
        aria-label="Emoji-aware count"
      />
      <p style="font-size: 0.75rem; line-height: 1.25rem; margin: 0;">Each emoji counts as one; input past 10 is trimmed.</p>
    </div>`,
  }),
};

export const CountTemplate: Story = {
  render: () => ({
    props: { text: 'Rendered with a template' },
    template: `<div style="width: 320px;">
      <andes-textarea showCount [countMax]="60" [countTemplate]="countTpl" [(value)]="text" aria-label="Templated count" />
      <ng-template #countTpl let-info>
        <strong>{{ info.count }}</strong> of {{ info.maxLength }} used
      </ng-template>
    </div>`,
  }),
};

export const Clearable: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule] },
    props: {
      control: new FormControl('Clear me with the × button'),
      clearedCount: 0,
    },
    template: `<div style="width: 320px;">
      <andes-textarea clearable [formControl]="control" aria-label="Message" (cleared)="clearedCount = clearedCount + 1" />
      <p style="font-family: var(--andes-font-family), sans-serif; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground); margin: 0.5rem 0 0;">Form value: "{{ control.value }}" - cleared {{ clearedCount }}×</p>
    </div>`,
  }),
};

/**
 * The clear button is the same at every size and on every field: a small muted disc on the
 * first line's inline end, shown while the field is hovered or focused (always on touch
 * screens). It is a Tab stop of its own, named by `clearLabel`.
 */
export const ClearButtonSizes: Story = {
  render: () => ({
    props: {
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      localized: 'Texto',
    },
    template: `<div style="display: flex; flex-direction: column; gap: 1rem; width: 320px;">
      <andes-textarea size="sm" clearable [rows]="1" [(value)]="small" aria-label="Small" />
      <andes-textarea clearable [rows]="1" [(value)]="medium" aria-label="Medium" />
      <andes-textarea size="lg" clearable [rows]="1" [(value)]="large" aria-label="Large" />
      <andes-textarea clearable clearLabel="Borrar" [(value)]="localized" aria-label="Localized" />
    </div>`,
  }),
};

export const CustomClearIcon: Story = {
  render: () => ({
    props: { text: 'Cleared with a custom icon' },
    template: `<div style="width: 320px;">
      <andes-textarea clearable [clearIcon]="clearIcon" [(value)]="text" aria-label="Message" />
      <ng-template #clearIcon>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm3.7 12.3-1.4 1.4L12 13.4l-2.3 2.3-1.4-1.4 2.3-2.3-2.3-2.3 1.4-1.4 2.3 2.3 2.3-2.3 1.4 1.4-2.3 2.3 2.3 2.3Z" />
        </svg>
      </ng-template>
    </div>`,
  }),
};

export const PressEnter: Story = {
  render: () => ({
    props: { log: [] as string[] },
    template: `<div style="width: 320px;">
      <andes-textarea #ta aria-label="Message" placeholder="Press Enter…" (pressEnter)="log = [ta.value(), ...log].slice(0, 3)" />
      <p style="font-family: var(--andes-font-family), sans-serif; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground); margin: 0.5rem 0 0;">pressEnter fired with: {{ log.length ? log.join(' | ') : '—' }}</p>
    </div>`,
  }),
};

export const FocusMethods: Story = {
  render: () => ({
    template: `<div style="width: 320px;">
      <andes-textarea #ta aria-label="Message" value="Focus me from the buttons below" />
      <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
        <button type="button" (click)="ta.focus({ cursor: 'start' })">Start</button>
        <button type="button" (click)="ta.focus({ cursor: 'end' })">End</button>
        <button type="button" (click)="ta.focus({ cursor: 'all' })">Select all</button>
        <button type="button" (click)="ta.blur()">Blur</button>
      </div>
    </div>`,
  }),
};

/** `(focused)` / `(blurred)` re-emit the textarea's native FocusEvent. */
export const FocusEvents: Story = {
  render: () => ({
    props: { focusLog: [] as string[] },
    template: `<div style="width: 320px;">
      <andes-textarea aria-label="Message" placeholder="Focus me, then tab away"
        (focused)="focusLog = [...focusLog, 'focused']"
        (blurred)="focusLog = [...focusLog, 'blurred']" />
      <p style="font-size: 0.75rem; line-height: 1.25rem; margin-top: 0.5rem;">{{ focusLog.length ? focusLog.join(' → ') : 'No events yet' }}</p>
    </div>`,
  }),
};

export const ResizeModes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <div style="width: 220px;">
          <p style="font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-foreground); margin: 0 0 0.25rem;">none</p>
          <andes-textarea resize="none" aria-label="Resize none" placeholder="none" />
        </div>
        <div style="width: 220px;">
          <p style="font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-foreground); margin: 0 0 0.25rem;">vertical (default)</p>
          <andes-textarea resize="vertical" aria-label="Resize vertical" placeholder="vertical" />
        </div>
        <div style="width: 220px;">
          <p style="font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-foreground); margin: 0 0 0.25rem;">horizontal</p>
          <andes-textarea resize="horizontal" aria-label="Resize horizontal" placeholder="horizontal" />
        </div>
        <div style="width: 220px;">
          <p style="font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-foreground); margin: 0 0 0.25rem;">both</p>
          <andes-textarea resize="both" aria-label="Resize both" placeholder="both" />
        </div>
      </div>
    `,
  }),
};

export const AutoSize: Story = {
  args: {
    autoSize: true,
    rows: 1,
    placeholder: 'Grows with every line, without limit…',
  },
};

export const AutoSizeWithBounds: Story = {
  args: {
    autoSize: { minRows: 2, maxRows: 6 },
    placeholder: 'Starts at 2 rows, scrolls past 6…',
  },
};

export const WithNgModel: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [FormsModule] },
    props: { ...args, value: 'Bound with [(ngModel)]' },
    template: `<div style="width: 320px;">
      <andes-textarea [(ngModel)]="value" aria-label="Message" />
      <p style="font-family: var(--andes-font-family), sans-serif; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground); margin: 0.5rem 0 0;">Value: {{ value }}</p>
    </div>`,
  }),
};

export const TwoWayValue: Story = {
  render: () => ({
    props: { text: 'Bound with [(value)]' },
    template: `<div style="width: 320px;">
      <andes-textarea [(value)]="text" aria-label="Message" />
      <p style="font-family: var(--andes-font-family), sans-serif; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground); margin: 0.5rem 0 0;">Value: {{ text }}</p>
    </div>`,
  }),
};

export const ResizeEvents: Story = {
  render: () => ({
    props: { last: undefined as AndesTextareaResizeEvent | undefined },
    template: `<div style="width: 320px;">
      <andes-textarea
        [autoSize]="{ minRows: 2, maxRows: 5 }"
        aria-label="Message"
        placeholder="Type a few lines - the height change is reported below"
        (resized)="last = $event"
      />
      <p style="font-family: var(--andes-font-family), sans-serif; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground); margin: 0.5rem 0 0;">resized: {{ last ? last.width + ' × ' + last.height + 'px' : '—' }}</p>
    </div>`,
  }),
};
