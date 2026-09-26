import { Component } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesTooltip, ANDES_TOOLTIP_PRESET_COLORS } from './tooltip';
import { AndesTooltipContent } from './tooltip-content';
import { ANDES_TOOLTIP_PLACEMENTS } from './tooltip-placement';
import { AndesTooltipTrigger } from './tooltip-trigger';

/** Shows when it was created - makes `destroyOnHidden` visible. */
@Component({
  selector: 'andes-story-render-stamp',
  template: `Rendered at {{ renderedAt }}`,
})
class StoryRenderStamp {
  readonly renderedAt = new Date().toLocaleTimeString();
}

const meta: Meta<AndesTooltip> = {
  title: 'Tooltip',
  component: AndesTooltip,
  tags: ['autodocs'],
  argTypes: {
    content: { control: 'text' },
    placement: {
      control: 'select',
      options: [null, ...ANDES_TOOLTIP_PLACEMENTS],
    },
    side: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
    align: { control: 'select', options: ['start', 'center', 'end'] },
    sideOffset: { control: 'number' },
    alignOffset: { control: 'number' },
    arrow: { control: 'boolean' },
    autoAdjustOverflow: { control: 'boolean' },
    trigger: {
      control: 'check',
      options: ['hover', 'focus', 'click', 'contextMenu'],
    },
    color: { control: 'text' },
    maxWidth: { control: 'text' },
    zIndex: { control: 'number' },
    destroyOnHidden: { control: 'boolean' },
    fresh: { control: 'boolean' },
    disabled: { control: 'boolean' },
    openDelay: { control: 'number' },
    closeDelay: { control: 'number' },
    instantReopenWindow: { control: 'number' },
  },
  args: {
    content: 'Helpful hint',
    placement: null,
    side: 'top',
    align: 'center',
    sideOffset: 6,
    alignOffset: 0,
    arrow: true,
    autoAdjustOverflow: true,
    trigger: ['hover', 'focus'],
    color: null,
    maxWidth: null,
    zIndex: null,
    destroyOnHidden: false,
    fresh: false,
    disabled: false,
    openDelay: 600,
    closeDelay: 0,
    instantReopenWindow: 400,
  },
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: args,
    template: `
      <div style="padding: 6rem;">
        <andes-tooltip
          [content]="content"
          [placement]="placement"
          [side]="side"
          [align]="align"
          [sideOffset]="sideOffset"
          [alignOffset]="alignOffset"
          [arrow]="arrow"
          [autoAdjustOverflow]="autoAdjustOverflow"
          [trigger]="trigger"
          [color]="color"
          [maxWidth]="maxWidth"
          [zIndex]="zIndex"
          [destroyOnHidden]="destroyOnHidden"
          [fresh]="fresh"
          [disabled]="disabled"
          [openDelay]="openDelay"
          [closeDelay]="closeDelay"
          [instantReopenWindow]="instantReopenWindow"
        >
          <button type="button" andesTooltipTrigger>Hover or focus me</button>
        </andes-tooltip>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesTooltip>;

export const Default: Story = {};

export const Sides: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: args,
    template: `
      <div style="display: flex; gap: 4rem; padding: 6rem;">
        <andes-tooltip content="Top" side="top">
          <button type="button" andesTooltipTrigger>Top</button>
        </andes-tooltip>
        <andes-tooltip content="Right" side="right">
          <button type="button" andesTooltipTrigger>Right</button>
        </andes-tooltip>
        <andes-tooltip content="Bottom" side="bottom">
          <button type="button" andesTooltipTrigger>Bottom</button>
        </andes-tooltip>
        <andes-tooltip content="Left" side="left">
          <button type="button" andesTooltipTrigger>Left</button>
        </andes-tooltip>
      </div>
    `,
  }),
};

/** The 12 named placements, laid out around a 3x3 grid of triggers. */
export const Placements: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: args,
    template: `
      <div
        style="display: grid; grid-template-columns: repeat(5, 5.5rem); grid-template-rows: repeat(5, 2.5rem); gap: 0.5rem; padding: 5rem 8rem; place-items: stretch;"
      >
        <andes-tooltip style="grid-area: 1 / 2" content="topLeft" placement="topLeft" [openDelay]="0">
          <button type="button" style="width: 100%; height: 100%" andesTooltipTrigger>TL</button>
        </andes-tooltip>
        <andes-tooltip style="grid-area: 1 / 3" content="top" placement="top" [openDelay]="0">
          <button type="button" style="width: 100%; height: 100%" andesTooltipTrigger>Top</button>
        </andes-tooltip>
        <andes-tooltip style="grid-area: 1 / 4" content="topRight" placement="topRight" [openDelay]="0">
          <button type="button" style="width: 100%; height: 100%" andesTooltipTrigger>TR</button>
        </andes-tooltip>
        <andes-tooltip style="grid-area: 2 / 1" content="leftTop" placement="leftTop" [openDelay]="0">
          <button type="button" style="width: 100%; height: 100%" andesTooltipTrigger>LT</button>
        </andes-tooltip>
        <andes-tooltip style="grid-area: 3 / 1" content="left" placement="left" [openDelay]="0">
          <button type="button" style="width: 100%; height: 100%" andesTooltipTrigger>Left</button>
        </andes-tooltip>
        <andes-tooltip style="grid-area: 4 / 1" content="leftBottom" placement="leftBottom" [openDelay]="0">
          <button type="button" style="width: 100%; height: 100%" andesTooltipTrigger>LB</button>
        </andes-tooltip>
        <andes-tooltip style="grid-area: 2 / 5" content="rightTop" placement="rightTop" [openDelay]="0">
          <button type="button" style="width: 100%; height: 100%" andesTooltipTrigger>RT</button>
        </andes-tooltip>
        <andes-tooltip style="grid-area: 3 / 5" content="right" placement="right" [openDelay]="0">
          <button type="button" style="width: 100%; height: 100%" andesTooltipTrigger>Right</button>
        </andes-tooltip>
        <andes-tooltip style="grid-area: 4 / 5" content="rightBottom" placement="rightBottom" [openDelay]="0">
          <button type="button" style="width: 100%; height: 100%" andesTooltipTrigger>RB</button>
        </andes-tooltip>
        <andes-tooltip style="grid-area: 5 / 2" content="bottomLeft" placement="bottomLeft" [openDelay]="0">
          <button type="button" style="width: 100%; height: 100%" andesTooltipTrigger>BL</button>
        </andes-tooltip>
        <andes-tooltip style="grid-area: 5 / 3" content="bottom" placement="bottom" [openDelay]="0">
          <button type="button" style="width: 100%; height: 100%" andesTooltipTrigger>Bottom</button>
        </andes-tooltip>
        <andes-tooltip style="grid-area: 5 / 4" content="bottomRight" placement="bottomRight" [openDelay]="0">
          <button type="button" style="width: 100%; height: 100%" andesTooltipTrigger>BR</button>
        </andes-tooltip>
      </div>
    `,
  }),
};

/**
 * `arrow`: on by default; `false` hides it; `{ pointAtCenter: true }` shifts an
 * edge-aligned tooltip so the arrow lands on the trigger's center.
 */
export const Arrow: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: { ...args, pointAtCenter: { pointAtCenter: true } },
    template: `
      <div style="display: flex; gap: 2rem; padding: 5rem 2rem;">
        <andes-tooltip content="Default arrow" placement="topLeft" [open]="true">
          <button type="button" style="width: 11rem" andesTooltipTrigger>topLeft</button>
        </andes-tooltip>
        <andes-tooltip content="Points at the center" placement="topLeft" [arrow]="pointAtCenter" [open]="true">
          <button type="button" style="width: 11rem" andesTooltipTrigger>topLeft + pointAtCenter</button>
        </andes-tooltip>
        <andes-tooltip content="No arrow" placement="top" [arrow]="false" [open]="true">
          <button type="button" style="width: 11rem" andesTooltipTrigger>arrow=false</button>
        </andes-tooltip>
      </div>
    `,
  }),
};

/**
 * `autoAdjustOverflow` (on by default): a tooltip that would leave the
 * viewport flips to the opposite side (top edge), falls back to a
 * perpendicular side when that does not fit either (left edge), and is shifted
 * back on screen as a last resort - the arrow follows it in every case. The
 * top-right trigger has it turned off and is clipped instead.
 */
export const AutoAdjustOverflow: Story = {
  parameters: { layout: 'fullscreen' },
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: args,
    template: `
      <div style="position: relative; height: 18rem;">
        <andes-tooltip
          style="position: absolute; top: 0.5rem; left: 50%; transform: translateX(-50%);"
          content="Asked for top - flipped below"
          placement="top"
          [open]="true"
        >
          <button type="button" andesTooltipTrigger>Top edge</button>
        </andes-tooltip>
        <andes-tooltip
          style="position: absolute; top: 0.5rem; right: 0.5rem;"
          content="autoAdjustOverflow=false - clipped"
          placement="top"
          [autoAdjustOverflow]="false"
          [open]="true"
        >
          <button type="button" andesTooltipTrigger>No adjust</button>
        </andes-tooltip>
        <andes-tooltip
          style="position: absolute; top: 8rem; left: 0.5rem;"
          content="Asked for left - flipped right"
          placement="left"
          [open]="true"
        >
          <button type="button" andesTooltipTrigger>Left edge</button>
        </andes-tooltip>
        <andes-tooltip
          style="position: absolute; bottom: 0.5rem; right: 0.5rem;"
          content="Asked for bottomLeft - no room below, so it moved to the first side with room"
          placement="bottomLeft"
          [open]="true"
        >
          <button type="button" andesTooltipTrigger>Corner</button>
        </andes-tooltip>
      </div>
    `,
  }),
};

/** `trigger`: hover, focus, click, contextMenu - alone or combined. */
export const Triggers: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: { ...args, hoverClick: ['hover', 'click'] },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; padding: 6rem 2rem;">
        <andes-tooltip content="Opened by hover" trigger="hover" [openDelay]="0">
          <button type="button" andesTooltipTrigger>Hover</button>
        </andes-tooltip>
        <andes-tooltip content="Opened by focus" trigger="focus" [openDelay]="0">
          <button type="button" andesTooltipTrigger>Focus (Tab here)</button>
        </andes-tooltip>
        <andes-tooltip content="Opened by click - click again or outside" trigger="click">
          <button type="button" andesTooltipTrigger>Click</button>
        </andes-tooltip>
        <andes-tooltip content="Opened by right-click" trigger="contextMenu">
          <button type="button" andesTooltipTrigger>Right-click</button>
        </andes-tooltip>
        <andes-tooltip content="Hover or click" [trigger]="hoverClick" [openDelay]="0">
          <button type="button" andesTooltipTrigger>Hover + click</button>
        </andes-tooltip>
      </div>
      <p style="max-width: 32rem; padding-inline: 2rem; color: var(--andes-color-muted-foreground); font-family: var(--andes-font-family), sans-serif;">
        On a touch screen, a long-press stands in for hover.
      </p>
    `,
  }),
};

/** `[(open)]`: controlled from outside; `openChange` reports user-driven changes. */
export const Controlled: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: { ...args, isOpen: true, log: [] as string[] },
    template: `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 1.5rem; padding: 5rem 2rem; font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-foreground);">
        <andes-tooltip
          content="Controlled tooltip"
          [(open)]="isOpen"
          (openChange)="log = [...log, 'openChange: ' + $event]"
        >
          <button type="button" andesTooltipTrigger>Trigger</button>
        </andes-tooltip>
        <button type="button" (click)="isOpen = !isOpen">
          {{ isOpen ? 'Close' : 'Open' }} programmatically
        </button>
        <code>open = {{ isOpen }}</code>
        <code>{{ log.join(', ') || 'no openChange yet' }}</code>
      </div>
    `,
  }),
};

/** `color`: semantic presets or any CSS color; text color and arrow follow. */
export const Colors: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: {
      ...args,
      presets: ANDES_TOOLTIP_PRESET_COLORS,
      customs: ['#7c3aed', 'hsl(45 100% 70%)', 'teal'],
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 2.5rem 1rem; padding: 4rem 2rem; max-width: 60rem;">
        @for (preset of presets; track preset) {
          <andes-tooltip [content]="preset" [color]="preset" [open]="true">
            <button type="button" andesTooltipTrigger>{{ preset }}</button>
          </andes-tooltip>
        }
        @for (custom of customs; track custom) {
          <andes-tooltip [content]="custom" [color]="custom" [open]="true">
            <button type="button" andesTooltipTrigger>{{ custom }}</button>
          </andes-tooltip>
        }
      </div>
    `,
  }),
};

/**
 * A disabled trigger still shows its tooltip: the `<andes-tooltip>` host
 * becomes an inline-block wrapper that catches the hover the disabled control
 * cannot.
 */
export const DisabledTrigger: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger, AndesButton] },
    props: args,
    template: `
      <div style="display: flex; gap: 1.5rem; padding: 6rem 2rem;">
        <andes-tooltip content="You need edit rights to save" [openDelay]="0">
          <button type="button" disabled andesTooltipTrigger>Native disabled</button>
        </andes-tooltip>
        <andes-tooltip content="Nothing to publish yet" [openDelay]="0">
          <andes-button disabled andesTooltipTrigger>andes-button disabled</andes-button>
        </andes-tooltip>
      </div>
    `,
  }),
};

/**
 * `<andes-button>` as the trigger: the tooltip anchors to, and describes, the
 * real `<button>` inside it.
 */
export const OnAndesButton: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger, AndesButton] },
    props: args,
    template: `
      <div style="padding: 6rem;">
        <andes-tooltip content="Saves a draft" [openDelay]="0">
          <andes-button andesTooltipTrigger variant="outline">Save</andes-button>
        </andes-tooltip>
      </div>
    `,
  }),
};

export const RichContent: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger, AndesTooltipContent] },
    props: args,
    template: `
      <div style="padding: 6rem;">
        <andes-tooltip>
          <button type="button" andesTooltipTrigger>Sync status</button>
          <ng-template andesTooltipContent>
            Last synced <strong>2 minutes ago</strong>
          </ng-template>
        </andes-tooltip>
      </div>
    `,
  }),
};

/** `content` also takes a `TemplateRef` for rich content. */
export const TemplateContent: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: args,
    template: `
      <div style="padding: 6rem;">
        <andes-tooltip [content]="hint" [open]="true">
          <button type="button" andesTooltipTrigger>Shortcut</button>
        </andes-tooltip>
        <ng-template #hint>Press <kbd>Ctrl</kbd> + <kbd>K</kbd></ng-template>
      </div>
    `,
  }),
};

/**
 * `maxWidth`, `tooltipClass` and the `--andes-tooltip-*` custom properties
 * style the tooltip panel.
 */
export const Sizing: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: args,
    // The tooltip is portalled out of the story, so the rule has to be global.
    styles: [
      `::ng-deep .story-tooltip-inverse {
        --andes-tooltip-background: var(--andes-color-foreground);
        --andes-tooltip-foreground: var(--andes-color-background);
        --andes-tooltip-max-width: 12rem;
      }`,
    ],
    template: `
      <div style="display: flex; gap: 14rem; padding: 7rem 2rem;">
        <andes-tooltip
          content="maxWidth=140: a long hint wraps onto several lines instead of stretching across the page."
          [maxWidth]="140"
          [open]="true"
        >
          <button type="button" andesTooltipTrigger>maxWidth</button>
        </andes-tooltip>
        <andes-tooltip
          content="Styled through tooltipClass and the --andes-tooltip-* custom properties."
          tooltipClass="story-tooltip-inverse"
          [open]="true"
        >
          <button type="button" andesTooltipTrigger>tooltipClass</button>
        </andes-tooltip>
      </div>
    `,
  }),
};

/**
 * `zIndex` overrides the `--andes-z-index-tooltip` layer. Both tooltips are
 * open and overlap; the second one is sent below the first.
 */
export const Stacking: Story = {
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: args,
    template: `
      <div style="display: flex; gap: 0.5rem; padding: 6rem 2rem 8rem;">
        <andes-tooltip content="Default layer: on top" placement="bottomLeft" [open]="true">
          <button type="button" andesTooltipTrigger>Default</button>
        </andes-tooltip>
        <andes-tooltip content="zIndex=1: drawn underneath the other tooltip" placement="bottom" [zIndex]="1" [open]="true" color="info">
          <button type="button" andesTooltipTrigger>zIndex=1</button>
        </andes-tooltip>
      </div>
    `,
  }),
};

/**
 * Content lifecycle: by default the content is rendered once and kept across
 * openings (the timestamp stays put); with `destroyOnHidden` it is recreated
 * every time. `fresh` additionally keeps kept-alive content updating while
 * hidden.
 */
export const ContentLifecycle: Story = {
  render: (args) => ({
    moduleMetadata: {
      imports: [AndesTooltipTrigger, AndesTooltipContent, StoryRenderStamp],
    },
    props: args,
    template: `
      <div style="display: flex; gap: 2rem; padding: 6rem;">
        <andes-tooltip [openDelay]="0">
          <button type="button" andesTooltipTrigger>Kept (default)</button>
          <ng-template andesTooltipContent><andes-story-render-stamp /></ng-template>
        </andes-tooltip>
        <andes-tooltip [openDelay]="0" destroyOnHidden>
          <button type="button" andesTooltipTrigger>destroyOnHidden</button>
          <ng-template andesTooltipContent><andes-story-render-stamp /></ng-template>
        </andes-tooltip>
      </div>
    `,
  }),
};

export const InstantReopenGroup: Story = {
  name: 'Instant reopen (toolbar)',
  render: (args) => ({
    moduleMetadata: { imports: [AndesTooltipTrigger] },
    props: args,
    template: `
      <div style="display: flex; gap: 0.5rem; padding: 6rem;">
        <andes-tooltip content="Cut">
          <button type="button" andesTooltipTrigger aria-label="Cut">✂️</button>
        </andes-tooltip>
        <andes-tooltip content="Copy">
          <button type="button" andesTooltipTrigger aria-label="Copy">📋</button>
        </andes-tooltip>
        <andes-tooltip content="Paste">
          <button type="button" andesTooltipTrigger aria-label="Paste">📌</button>
        </andes-tooltip>
      </div>
      <p style="max-width: 32rem; color: var(--andes-color-accent-foreground, #475569);">
        Hover the first icon and wait for its tooltip, then move to the next
        one - it opens instantly instead of paying the open delay again.
      </p>
    `,
  }),
};

export const Disabled: Story = {
  args: { disabled: true, content: 'You will not see me' },
};

export const CustomTiming: Story = {
  args: { openDelay: 0, closeDelay: 300 },
};
