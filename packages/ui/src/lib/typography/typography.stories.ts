import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { AndesLink } from './link';
import { AndesParagraph } from './paragraph';
import { AndesText } from './text';
import { AndesTitle } from './title';

const LONG_TEXT =
  'Invoices are issued per series and numbered sequentially. A document that was rejected by the tax authority keeps its number until it is voided or corrected, so the next one in the series carries the following number. Review rejected documents every morning before the daily summary is sent.';

const meta: Meta<AndesText> = {
  title: 'Typography',
  component: AndesText,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [AndesTitle, AndesText, AndesParagraph, AndesLink],
    }),
  ],
  parameters: { layout: 'padded' },
  argTypes: {
    type: {
      control: 'select',
      options: [
        undefined,
        'secondary',
        'success',
        'warning',
        'danger',
        'disabled',
      ],
    },
    size: { control: 'inline-radio', options: ['md', 'sm'] },
    as: {
      control: 'select',
      options: [
        undefined,
        'span',
        'p',
        'div',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
      ],
    },
    disabled: { control: 'boolean' },
    strong: { control: 'boolean' },
    italic: { control: 'boolean' },
    underline: { control: 'boolean' },
    delete: { control: 'boolean' },
    mark: { control: 'boolean' },
    code: { control: 'boolean' },
    keyboard: { control: 'boolean' },
    ellipsis: { control: 'object' },
    copyable: { control: 'object' },
    editable: { control: 'object' },
    text: { control: 'text' },
    expanded: { control: 'boolean' },
    editing: { control: 'boolean' },
  },
  args: {
    size: 'md',
    disabled: false,
    strong: false,
    italic: false,
    underline: false,
    delete: false,
    mark: false,
    code: false,
    keyboard: false,
  },
  render: (args) => ({
    props: { ...args, elementTag: args.as, struck: args.delete },
    template: `<andes-text [type]="type" [size]="size" [as]="elementTag" [disabled]="disabled" [strong]="strong" [italic]="italic" [underline]="underline" [delete]="struck" [mark]="mark" [code]="code" [keyboard]="keyboard">Net amount due within 30 days</andes-text>`,
  }),
};

export default meta;
type Story = StoryObj<AndesText>;

export const Playground: Story = {};

/** Levels 1 to 5 follow the 24, 20, 18, 16 and 14px scale at weight 600. */
export const TitleLevels: Story = {
  render: () => ({
    template: `
      <andes-title [level]="1">Level 1 - Financial overview</andes-title>
      <andes-title [level]="2">Level 2 - Receivables aging</andes-title>
      <andes-title [level]="3">Level 3 - Customers over 60 days</andes-title>
      <andes-title [level]="4">Level 4 - Pending follow-ups</andes-title>
      <andes-title [level]="5">Level 5 - Notes</andes-title>`,
  }),
};

/** `as` changes the element without changing the look, to keep the document outline right. */
export const TitleSemanticTag: Story = {
  render: () => ({
    template: `
      <andes-title [level]="1" as="h2">Looks like level 1, is an h2</andes-title>
      <andes-title [level]="4" as="h1">Looks like level 4, is an h1</andes-title>
      <andes-title [level]="3" as="div">Looks like level 3, is a div</andes-title>`,
  }),
};

export const Types: Story = {
  render: () => ({
    template: `<div style="display: flex; flex-direction: column; gap: 0.25rem;">
      <andes-text>Default text</andes-text>
      <andes-text type="secondary">Secondary text</andes-text>
      <andes-text type="success">Success text</andes-text>
      <andes-text type="warning">Warning text</andes-text>
      <andes-text type="danger">Danger text</andes-text>
      <andes-text type="disabled">Disabled text</andes-text>
    </div>`,
  }),
};

export const Modifiers: Story = {
  render: () => ({
    template: `<div style="display: flex; flex-direction: column; gap: 0.25rem;">
      <andes-text strong>Strong</andes-text>
      <andes-text italic>Italic</andes-text>
      <andes-text underline>Underline</andes-text>
      <andes-text delete>Delete</andes-text>
      <andes-text mark>Mark</andes-text>
      <andes-text code>Code</andes-text>
      <andes-text keyboard>Ctrl + K</andes-text>
      <andes-text strong italic underline>Strong, italic and underline together</andes-text>
    </div>`,
  }),
};

/** Modifiers sit inside running text without breaking the line. */
export const Inline: Story = {
  render: () => ({
    template: `<andes-paragraph style="max-width: 36rem;">
      Press <andes-text keyboard>Ctrl + S</andes-text> to save, or run
      <andes-text code>pnpm build</andes-text> from the project root. The total is
      <andes-text strong>S/ 1,250.00</andes-text>, previously
      <andes-text delete type="secondary">S/ 1,400.00</andes-text>, and
      <andes-text mark>needs approval</andes-text> before
      <andes-link href="#">the period closes</andes-link>.
    </andes-paragraph>`,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `<div style="display: flex; flex-direction: column; gap: 0.5rem;">
      <andes-text>Body text, 14px on a 22px line</andes-text>
      <andes-text size="sm" type="secondary">Caption text, 12px on a 20px line</andes-text>
    </div>`,
  }),
};

export const Paragraphs: Story = {
  render: () => ({
    template: `<div style="max-width: 36rem;">
      <andes-title [level]="3">Closing the period</andes-title>
      <andes-paragraph>${LONG_TEXT}</andes-paragraph>
      <andes-paragraph type="secondary" size="sm">Last reviewed on 14 October by the accounting team.</andes-paragraph>
    </div>`,
  }),
};

export const Disabled: Story = {
  render: () => ({
    template: `<div style="display: flex; flex-direction: column; gap: 0.5rem;">
      <andes-text disabled>Disabled text</andes-text>
      <andes-text disabled copyable editable>Disabled with actions</andes-text>
      <andes-link disabled href="#">Disabled link</andes-link>
    </div>`,
  }),
};

/** One line, cut with an ellipsis. The popup with the full text shows on hover while it is cut. */
export const EllipsisSingleLine: Story = {
  render: () => ({
    props: { cut: signal(false) },
    template: `<div style="width: 20rem;">
      <andes-text [ellipsis]="{ tooltip: true }" (truncated)="cut.set($event)">${LONG_TEXT}</andes-text>
      <andes-text type="secondary" size="sm">{{ cut() ? 'Cut off' : 'Fits' }}</andes-text>
    </div>`,
  }),
};

export const EllipsisRows: Story = {
  render: () => ({
    template: `<div style="width: 24rem; display: flex; flex-direction: column; gap: 1rem;">
      <andes-paragraph [ellipsis]="{ rows: 2, tooltip: true }">${LONG_TEXT}</andes-paragraph>
      <andes-paragraph [ellipsis]="{ rows: 3 }">${LONG_TEXT}</andes-paragraph>
    </div>`,
  }),
};

/** `expanded` is a two-way value, so the toggle can be driven from outside as well. */
export const EllipsisExpandable: Story = {
  render: () => ({
    props: { expanded: signal(false) },
    template: `<div style="width: 24rem;">
      <andes-paragraph [ellipsis]="{ rows: 2, expandable: true }" [(expanded)]="expanded">${LONG_TEXT}</andes-paragraph>
      <andes-text type="secondary" size="sm">{{ expanded() ? 'Expanded' : 'Collapsed' }}</andes-text>
    </div>`,
  }),
};

export const EllipsisCustomLabels: Story = {
  render: () => ({
    template: `<div style="width: 24rem;">
      <andes-paragraph [ellipsis]="{ rows: 2, expandable: true, expandText: 'Show more', collapseText: 'Show less' }">${LONG_TEXT}</andes-paragraph>
    </div>`,
  }),
};

/** A heading can truncate too; the popup keeps the full title reachable. */
export const EllipsisTitle: Story = {
  render: () => ({
    template: `<div style="width: 18rem;">
      <andes-title [level]="3" [ellipsis]="{ tooltip: true }">Consolidated statement of receivables for the fiscal year</andes-title>
    </div>`,
  }),
};

export const Copyable: Story = {
  render: () => ({
    props: { copiedValue: signal('') },
    template: `<div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <andes-text copyable (copied)="copiedValue.set($event)">F001-000123</andes-text>
      <andes-text [copyable]="{ text: 'https://example.com/invoices/F001-000123', label: 'Copy link', copiedLabel: 'Link copied' }">Share this invoice</andes-text>
      <andes-text type="secondary" size="sm">Last copied: {{ copiedValue() || 'nothing yet' }}</andes-text>
    </div>`,
  }),
};

/** The pencil opens a field with the current text. Enter or leaving the field saves, Escape cancels. */
export const Editable: Story = {
  render: () => ({
    props: { name: signal('Q3 collections report'), saved: signal('') },
    template: `<div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 28rem;">
      <andes-text editable [(text)]="name" (save)="saved.set($event)">Q3 collections report</andes-text>
      <andes-text type="secondary" size="sm">Saved value: {{ saved() || 'nothing yet' }}</andes-text>
    </div>`,
  }),
};

export const EditableTitleAndParagraph: Story = {
  render: () => ({
    template: `<div style="max-width: 32rem;">
      <andes-title [level]="2" editable>Weekly cash forecast</andes-title>
      <andes-paragraph [editable]="{ maxLength: 160, autoSize: { minRows: 2, maxRows: 5 } }">Projected inflows assume customers pay on the due date. Update the figures every Monday.</andes-paragraph>
    </div>`,
  }),
};

/** With the text trigger the text itself opens the editor (click, or Enter once focused). */
export const EditableTextTrigger: Story = {
  render: () => ({
    template: `<andes-text [editable]="{ triggerType: 'text' }">Click this text to rename it</andes-text>`,
  }),
};

export const CopyableAndEditable: Story = {
  render: () => ({
    template: `<andes-text copyable editable [ellipsis]="true" style="width: 18rem;">Warehouse transfer WT-2026-004981</andes-text>`,
  }),
};

export const Links: Story = {
  render: () => ({
    template: `<div style="display: flex; flex-direction: column; gap: 0.5rem;">
      <andes-link href="#">Open the dashboard</andes-link>
      <andes-link href="https://example.com" external>Documentation</andes-link>
      <andes-link href="#" type="danger">Delete account</andes-link>
      <andes-link disabled href="#">Not available</andes-link>
      <andes-link href="#" copyable>Copy this link text</andes-link>
      <div style="width: 14rem;"><andes-link href="#" [ellipsis]="{ tooltip: true }">A link with a very long label that gets cut</andes-link></div>
    </div>`,
  }),
};

/** A realistic page header combining the pieces. */
export const Composition: Story = {
  render: () => ({
    template: `<div style="max-width: 40rem;">
      <andes-title [level]="2" editable>Customer: Andes Logistics S.A.C.</andes-title>
      <andes-paragraph type="secondary">
        Tax id <andes-text code copyable>20512345678</andes-text> - account manager
        <andes-link href="#">Lucia Paredes</andes-link>
      </andes-paragraph>
      <andes-paragraph [ellipsis]="{ rows: 2, expandable: true }">${LONG_TEXT}</andes-paragraph>
    </div>`,
  }),
};
