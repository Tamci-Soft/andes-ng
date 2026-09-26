import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesPopover } from './popover';
import { AndesPopoverContent } from './popover-content';
import { AndesPopoverTrigger } from './popover-trigger';
import { ANDES_POPOVER_PLACEMENTS } from './popover-types';

const PLACEMENTS = Object.keys(ANDES_POPOVER_PLACEMENTS);

const imports = [AndesButton, AndesPopoverTrigger, AndesPopoverContent];

const meta: Meta<AndesPopover> = {
  title: 'Popover',
  component: AndesPopover,
  tags: ['autodocs'],
  argTypes: {
    side: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
    align: { control: 'select', options: ['start', 'center', 'end'] },
    placement: { control: 'select', options: [undefined, ...PLACEMENTS] },
    trigger: {
      control: 'select',
      options: ['click', 'hover', 'focus', 'contextMenu'],
    },
    sideOffset: { control: 'number' },
    alignOffset: { control: 'number' },
    showArrow: { control: 'boolean' },
    arrowPointAtCenter: { control: 'boolean' },
    autoAdjustOverflow: { control: 'boolean' },
    openDelay: { control: 'number' },
    closeDelay: { control: 'number' },
    disabled: { control: 'boolean' },
    destroyOnHidden: { control: 'boolean' },
    zIndex: { control: 'number' },
  },
  args: {
    side: 'bottom',
    align: 'center',
    placement: undefined,
    trigger: 'click',
    sideOffset: 8,
    alignOffset: 0,
    showArrow: false,
    arrowPointAtCenter: false,
    autoAdjustOverflow: true,
    openDelay: 100,
    closeDelay: 100,
    disabled: false,
    destroyOnHidden: false,
  },
  render: (args) => ({
    moduleMetadata: { imports },
    props: args,
    template: `
      <div style="padding: 8rem;">
        <andes-popover
          [side]="side"
          [align]="align"
          [placement]="placement"
          [trigger]="trigger"
          [sideOffset]="sideOffset"
          [alignOffset]="alignOffset"
          [showArrow]="showArrow"
          [arrowPointAtCenter]="arrowPointAtCenter"
          [autoAdjustOverflow]="autoAdjustOverflow"
          [openDelay]="openDelay"
          [closeDelay]="closeDelay"
          [disabled]="disabled"
          [destroyOnHidden]="destroyOnHidden"
          [zIndex]="zIndex"
        >
          <andes-button andesPopoverTrigger>Open popover</andes-button>
          <andes-popover-content>
            <p style="margin: 0 0 0.5rem; font-weight: 600;">Popover title</p>
            <p style="margin: 0; font-size: 0.875rem;">This is the popover body content.</p>
          </andes-popover-content>
        </andes-popover>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesPopover>;

export const Default: Story = {};

export const WithArrow: Story = {
  args: { showArrow: true },
};

export const Top: Story = {
  args: { side: 'top' },
};

export const Right: Story = {
  args: { side: 'right' },
};

export const Left: Story = {
  args: { side: 'left' },
};

export const AlignStart: Story = {
  args: { align: 'start' },
};

export const AlignEnd: Story = {
  args: { align: 'end' },
};

/** `title` + `content` as plain strings: a structured header and body. */
export const TitleAndContent: Story = {
  render: (args) => ({
    moduleMetadata: { imports },
    props: args,
    template: `
      <div style="padding: 8rem;">
        <andes-popover title="Title" content="Content of the popover, rendered as its body." [showArrow]="true" [trigger]="trigger">
          <andes-button andesPopoverTrigger>Title + content</andes-button>
        </andes-popover>
      </div>
    `,
  }),
};

/** `title` and `content` also accept templates for rich markup. */
export const TemplateContent: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div style="padding: 8rem;">
        <andes-popover [title]="titleTpl" [content]="bodyTpl" [showArrow]="true">
          <andes-button andesPopoverTrigger>Rich content</andes-button>
        </andes-popover>
        <ng-template #titleTpl>
          <span style="display: inline-flex; align-items: center; gap: 0.375rem;">
            <span style="display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 9999px; background: var(--andes-color-success);"></span>
            Deployment healthy
          </span>
        </ng-template>
        <ng-template #bodyTpl>
          <p style="margin: 0 0 0.75rem; font-size: 0.875rem;">Last deploy <strong>12 minutes ago</strong> from <code>main</code>.</p>
          <andes-button size="sm" variant="outline">View logs</andes-button>
        </ng-template>
      </div>
    `,
  }),
};

/** Every trigger mode, plus a combination. Hover waits `openDelay`/`closeDelay`. */
export const Triggers: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; padding: 8rem 2rem;">
        <andes-popover trigger="hover" title="Hover" content="Opens after 100ms on hover." [showArrow]="true">
          <andes-button variant="outline" andesPopoverTrigger>Hover me</andes-button>
        </andes-popover>
        <andes-popover trigger="focus" title="Focus" content="Opens while the trigger has focus." [showArrow]="true">
          <andes-button variant="outline" andesPopoverTrigger>Focus me</andes-button>
        </andes-popover>
        <andes-popover trigger="click" title="Click" content="Toggles on click." [showArrow]="true">
          <andes-button variant="outline" andesPopoverTrigger>Click me</andes-button>
        </andes-popover>
        <andes-popover trigger="contextMenu" title="Context menu" content="Opens on right click." [showArrow]="true">
          <andes-button variant="outline" andesPopoverTrigger>Right-click me</andes-button>
        </andes-popover>
        <andes-popover [trigger]="['hover', 'click']" title="Hover + click" content="Hover previews it; a click pins it open." [showArrow]="true">
          <andes-button variant="outline" andesPopoverTrigger>Hover or click</andes-button>
        </andes-popover>
      </div>
    `,
  }),
};

/** Custom hover timing: slow to open, quick to close. */
export const HoverDelays: Story = {
  args: { trigger: 'hover', openDelay: 500, closeDelay: 50, showArrow: true },
};

/** The twelve `placement` values. */
export const Placements: Story = {
  render: () => ({
    moduleMetadata: { imports },
    props: { placements: PLACEMENTS },
    template: `
      <div style="display: grid; grid-template-columns: repeat(3, 8rem); gap: 3rem; padding: 6rem;">
        @for (placement of placements; track placement) {
          <andes-popover [placement]="placement" [showArrow]="true" [content]="placement">
            <andes-button size="sm" variant="outline" andesPopoverTrigger>{{ placement }}</andes-button>
          </andes-popover>
        }
      </div>
    `,
  }),
};

export const AllPlacements: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div style="display: grid; grid-template-columns: repeat(3, 8rem); gap: 3rem; padding: 6rem;">
        @for (side of ['top', 'right', 'bottom', 'left']; track side) {
          @for (align of ['start', 'center', 'end']; track align) {
            <andes-popover [side]="side" [align]="align" [showArrow]="true">
              <andes-button size="sm" andesPopoverTrigger>{{ side }}/{{ align }}</andes-button>
              <andes-popover-content>{{ side }} · {{ align }}</andes-popover-content>
            </andes-popover>
          }
        }
      </div>
    `,
  }),
};

/**
 * Edge-aligned placements keep the arrow near the aligned edge; with
 * `arrowPointAtCenter` the panel shifts so the arrow points at the trigger's
 * center instead.
 */
export const ArrowPointAtCenter: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div style="display: flex; gap: 4rem; padding: 8rem 4rem;">
        <andes-popover placement="bottomLeft" [showArrow]="true" content="Arrow near the left edge">
          <andes-button variant="outline" andesPopoverTrigger>bottomLeft (default arrow)</andes-button>
        </andes-popover>
        <andes-popover placement="bottomLeft" [showArrow]="true" [arrowPointAtCenter]="true" content="Arrow points at the center">
          <andes-button variant="outline" andesPopoverTrigger>bottomLeft + pointAtCenter</andes-button>
        </andes-popover>
      </div>
    `,
  }),
};

/**
 * Near a viewport edge the panel flips to the opposite side and shifts along
 * the cross axis to stay on screen; the arrow follows. Scroll or resize to see
 * it re-evaluate.
 */
export const AutoAdjustOverflow: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div style="position: relative; height: 100vh; min-height: 20rem;">
        <div style="position: absolute; top: 0.5rem; left: 0.5rem;">
          <andes-popover side="top" [showArrow]="true" title="Wanted top" content="No room above - flipped to bottom, shifted right.">
            <andes-button size="sm" andesPopoverTrigger>Top-left corner</andes-button>
          </andes-popover>
        </div>
        <div style="position: absolute; bottom: 0.5rem; right: 0.5rem;">
          <andes-popover side="bottom" [showArrow]="true" title="Wanted bottom" content="No room below - flipped to top, shifted left.">
            <andes-button size="sm" andesPopoverTrigger>Bottom-right corner</andes-button>
          </andes-popover>
        </div>
        <div style="position: absolute; top: 50%; right: 0.5rem;">
          <andes-popover side="right" [showArrow]="true" content="No room on the right - flipped left.">
            <andes-button size="sm" andesPopoverTrigger>Right edge</andes-button>
          </andes-popover>
        </div>
        <div style="position: absolute; bottom: 0.5rem; left: 0.5rem;">
          <andes-popover side="bottom" [showArrow]="true" [autoAdjustOverflow]="false" content="autoAdjustOverflow off: stays below, even off screen.">
            <andes-button size="sm" variant="outline" andesPopoverTrigger>No auto-adjust</andes-button>
          </andes-popover>
        </div>
      </div>
    `,
  }),
};

export const Controlled: Story = {
  render: (args) => ({
    moduleMetadata: { imports },
    props: { ...args, visible: false },
    template: `
      <div style="padding: 8rem; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
        <andes-button (click)="visible = !visible">Toggle from outside</andes-button>
        <andes-popover [side]="side" [align]="align" [(open)]="visible">
          <andes-button variant="outline" andesPopoverTrigger>Or click me</andes-button>
          <andes-popover-content>Controlled via [(open)].</andes-popover-content>
        </andes-popover>
      </div>
    `,
  }),
};

/** `(openChange)` reports every change the popover makes itself. */
export const OpenChange: Story = {
  render: () => {
    const log: string[] = [];
    let count = 0;
    return {
      moduleMetadata: { imports },
      props: {
        log,
        record: (open: boolean) => {
          log.unshift(`#${++count} ${open ? 'opened' : 'closed'}`);
          log.length = Math.min(log.length, 5);
        },
      },
      template: `
        <div style="padding: 6rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
          <andes-popover content="Close me with Escape, an outside click or the trigger." (openChange)="record($event)">
            <andes-button andesPopoverTrigger>Toggle</andes-button>
          </andes-popover>
          <ol aria-label="openChange log" style="margin: 0; font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; color: var(--andes-color-foreground);">
            @for (entry of log; track entry) { <li>{{ entry }}</li> }
          </ol>
        </div>
      `,
    };
  },
};

/**
 * Template content keeps its state between opens by default (type, close,
 * reopen); `destroyOnHidden` re-creates it every time.
 */
export const DestroyOnHidden: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div style="display: flex; gap: 2rem; padding: 8rem 2rem;">
        <andes-popover title="Kept" [content]="form">
          <andes-button variant="outline" andesPopoverTrigger>Keeps state</andes-button>
        </andes-popover>
        <andes-popover title="Destroyed" [content]="form" [destroyOnHidden]="true">
          <andes-button variant="outline" andesPopoverTrigger>destroyOnHidden</andes-button>
        </andes-popover>
        <ng-template #form>
          <label style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem;">
            Note
            <input placeholder="Type, close, reopen" style="font: inherit; padding: 0.25rem 0.5rem; border: 1px solid var(--andes-color-input); border-radius: var(--andes-radius-sm); background: var(--andes-color-background); color: var(--andes-color-foreground);" />
          </label>
        </ng-template>
      </div>
    `,
  }),
};

/**
 * Theming through `--andes-popover-*` custom properties, set here on
 * `<andes-popover-content>`; a `panelClass`
 * or a global rule works too.
 */
export const CustomProperties: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div style="padding: 8rem;">
        <andes-popover [showArrow]="true" title="Wide and roomy">
          <andes-button andesPopoverTrigger>Custom surface</andes-button>
          <andes-popover-content style="--andes-popover-padding: 1.5rem; --andes-popover-max-width: 32rem; --andes-popover-radius: var(--andes-radius-xl); --andes-popover-border-color: var(--andes-color-primary);">
            <p style="margin: 0; font-size: 0.875rem;">Padding, width, radius and border come from custom properties.</p>
          </andes-popover-content>
        </andes-popover>
      </div>
    `,
  }),
};

/** `zIndex` overrides the `--andes-z-index-popover` layer for one instance. */
export const ZIndex: Story = {
  args: { zIndex: 2000, showArrow: true },
};

/**
 * `disabled` never opens; a disabled trigger (here an `andes-button`) is
 * ignored too. Wrapping a disabled native button in a plain element keeps the
 * wrapper usable as a hover trigger to explain why.
 */
export const Disabled: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div style="display: flex; gap: 1rem; padding: 8rem 2rem;">
        <andes-popover [disabled]="true" content="Never shown">
          <andes-button variant="outline" andesPopoverTrigger>Popover disabled</andes-button>
        </andes-popover>
        <andes-popover content="Never shown">
          <andes-button [disabled]="true" andesPopoverTrigger>Trigger disabled</andes-button>
        </andes-popover>
        <andes-popover trigger="hover" content="Publishing needs an approved review." [showArrow]="true">
          <span andesPopoverTrigger style="display: inline-block; cursor: not-allowed;">
            <button type="button" disabled style="pointer-events: none; font: inherit;">Publish</button>
          </span>
        </andes-popover>
      </div>
    `,
  }),
};
