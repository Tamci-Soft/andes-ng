import { booleanAttribute, Component, input, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesHoverCard } from './hover-card';
import { AndesHoverCardContent } from './hover-card-content';
import { ANDES_HOVER_CARD_PLACEMENTS } from './hover-card-placement';
import { AndesHoverCardTrigger } from './hover-card-trigger';

const TRIGGER_STYLE =
  'color: var(--andes-color-foreground); font-weight: 500; text-decoration: underline dotted; text-underline-offset: 3px; cursor: pointer;';

const PROFILE_STYLES = `
  :host { display: block; }
  .profile { display: flex; flex-direction: column; gap: 0.5rem; }
  .profile__head { display: flex; align-items: center; gap: 0.75rem; }
  .profile__avatar {
    display: inline-flex; align-items: center; justify-content: center;
    width: 2.5rem; height: 2.5rem; flex: none; border-radius: 9999px;
    background: var(--andes-color-muted); color: var(--andes-color-muted-foreground);
    font-weight: 600;
  }
  .profile__name { margin: 0; font-size: 1rem; line-height: 1.5rem; font-weight: 600; }
  .profile__handle { margin: 0; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground); }
  .profile__bio { margin: 0; }
  .profile__meta { margin: 0; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground); }
  .profile__actions { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
`;

/** A realistic preview body, shared by the stories. */
@Component({
  selector: 'andes-story-profile',
  imports: [AndesButton],
  styles: PROFILE_STYLES,
  template: `
    <div class="profile">
      <div class="profile__head">
        <span class="profile__avatar" aria-hidden="true">{{ initials }}</span>
        <div>
          <p class="profile__name">{{ name }}</p>
          <p class="profile__handle">{{ handle }}</p>
        </div>
      </div>
      <p class="profile__bio">{{ bio }}</p>
      <p class="profile__meta">Joined March 2021 &middot; 18 open requests</p>
      @if (actions()) {
        <div class="profile__actions">
          <andes-button size="sm">Message</andes-button>
          <andes-button size="sm" variant="outline">View profile</andes-button>
        </div>
      }
    </div>
  `,
})
class StoryProfile {
  readonly actions = input(false, { transform: booleanAttribute });
  protected readonly name = 'Ana Torres';
  protected readonly handle = '@ana.torres';
  protected readonly initials = 'AT';
  protected readonly bio =
    'Finance lead. Approves purchase orders and keeps the monthly close on schedule.';
}

/** Inline mentions in a paragraph, the classic use. */
@Component({
  selector: 'andes-story-inline-text',
  imports: [
    AndesHoverCard,
    AndesHoverCardTrigger,
    AndesHoverCardContent,
    StoryProfile,
  ],
  template: `
    <p
      style="max-width: 30rem; margin: 0; font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; line-height: 1.375rem; color: var(--andes-color-foreground);"
    >
      The purchase order was raised by
      <andes-hover-card>
        <a href="#ana" andesHoverCardTrigger style="${TRIGGER_STYLE}"
          >&#64;ana</a
        >
        <ng-template andesHoverCardContent><andes-story-profile /></ng-template>
      </andes-hover-card>
      and reviewed by
      <andes-hover-card>
        <a href="#luis" andesHoverCardTrigger style="${TRIGGER_STYLE}"
          >&#64;luis</a
        >
        <ng-template andesHoverCardContent>
          <andes-story-profile />
        </ng-template>
      </andes-hover-card>
      before it went out to the supplier. Rest the pointer on a name, or tab to
      it, to preview the person.
    </p>
  `,
})
class StoryInlineText {}

/** A card that reports its state and is driven from outside. */
@Component({
  selector: 'andes-story-controlled',
  imports: [
    AndesButton,
    AndesHoverCard,
    AndesHoverCardTrigger,
    AndesHoverCardContent,
    StoryProfile,
  ],
  template: `
    <div
      style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start; padding: 2rem 2rem 14rem;"
    >
      <div style="display: flex; gap: 0.5rem;">
        <andes-button size="sm" variant="outline" (click)="open.set(true)"
          >Open</andes-button
        >
        <andes-button size="sm" variant="outline" (click)="open.set(false)"
          >Close</andes-button
        >
      </div>
      <andes-hover-card [(open)]="open" [openDelay]="200">
        <a href="#ana" andesHoverCardTrigger style="${TRIGGER_STYLE}"
          >&#64;ana</a
        >
        <ng-template andesHoverCardContent><andes-story-profile /></ng-template>
      </andes-hover-card>
      <span
        style="font-family: var(--andes-font-family), sans-serif; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground);"
      >
        open = {{ open() }}
      </span>
    </div>
  `,
})
class StoryControlled {
  protected readonly open = signal(false);
}

const meta: Meta<AndesHoverCard> = {
  title: 'Hover card',
  component: AndesHoverCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A preview that appears when the pointer rests on a trigger or keyboard focus reaches it, and stays while the pointer is over the card. It is a hint with a body, not a dialog: it has no role, takes no focus when it opens and describes its trigger. The pointer reaches it across an invisible bridge over the gap. Press Escape to close it; press Alt+ArrowDown on the trigger to open it at once and move focus to its first link or button, then Tab to travel through it. On touch screens a tap on the trigger toggles it.',
      },
    },
  },
  argTypes: {
    side: {
      control: 'inline-radio',
      options: ['top', 'right', 'bottom', 'left'],
    },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
    placement: {
      control: 'select',
      options: [null, ...ANDES_HOVER_CARD_PLACEMENTS],
    },
    sideOffset: { control: 'number' },
    alignOffset: { control: 'number' },
    arrow: { control: 'boolean' },
    autoAdjustOverflow: { control: 'boolean' },
    openDelay: { control: 'number' },
    closeDelay: { control: 'number' },
    disabled: { control: 'boolean' },
    width: { control: 'text' },
    cardClass: { control: 'text' },
  },
  args: {
    side: 'bottom',
    align: 'center',
    placement: null,
    sideOffset: 8,
    alignOffset: 0,
    arrow: false,
    autoAdjustOverflow: true,
    openDelay: 600,
    closeDelay: 300,
    disabled: false,
    width: null,
    cardClass: null,
  },
  render: (args) => ({
    moduleMetadata: {
      imports: [AndesHoverCardTrigger, AndesHoverCardContent, StoryProfile],
    },
    props: args,
    template: `
      <div style="padding: 8rem 6rem;">
        <andes-hover-card
          [side]="side"
          [align]="align"
          [placement]="placement"
          [sideOffset]="sideOffset"
          [alignOffset]="alignOffset"
          [arrow]="arrow"
          [autoAdjustOverflow]="autoAdjustOverflow"
          [openDelay]="openDelay"
          [closeDelay]="closeDelay"
          [disabled]="disabled"
          [width]="width"
          [cardClass]="cardClass"
        >
          <a href="#ana" andesHoverCardTrigger style="${TRIGGER_STYLE}">&#64;ana.torres</a>
          <ng-template andesHoverCardContent>
            <andes-story-profile />
          </ng-template>
        </andes-hover-card>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesHoverCard>;

/** Rest the pointer on the link for 600ms, or Tab to it. */
export const Default: Story = {};

/** An optional arrow points at the trigger and follows the card through flips and shifts. */
export const WithArrow: Story = {
  args: { arrow: true },
};

/** A card that previews a mention inside running text. */
export const InlineMentions: Story = {
  render: () => ({
    moduleMetadata: { imports: [StoryInlineText] },
    template: `<div style="padding: 4rem 2rem 14rem;"><andes-story-inline-text /></div>`,
  }),
};

/** The card may hold links and buttons: the pointer can travel to it and use them. */
export const InteractiveContent: Story = {
  render: (args) => ({
    moduleMetadata: {
      imports: [AndesHoverCardTrigger, AndesHoverCardContent, StoryProfile],
    },
    props: args,
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; padding: 6rem 6rem 14rem;">
        <andes-hover-card [arrow]="arrow" [width]="'18rem'">
          <a href="#ana" andesHoverCardTrigger style="${TRIGGER_STYLE}">&#64;ana.torres</a>
          <ng-template andesHoverCardContent>
            <andes-story-profile [actions]="true" />
          </ng-template>
        </andes-hover-card>
        <p style="max-width: 26rem; margin: 0; font-family: var(--andes-font-family), sans-serif; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground);">
          Keyboard: focus the link, press Alt+ArrowDown to move into the card, Tab between its
          buttons, Shift+Tab or Escape to come back to the link.
        </p>
      </div>
    `,
  }),
};

/** All twelve placements, one card per trigger, opened with no delay. */
export const Placements: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    moduleMetadata: { imports: [AndesHoverCardTrigger, AndesHoverCardContent] },
    props: { placements: ANDES_HOVER_CARD_PLACEMENTS },
    template: `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6rem 2rem; padding: 14rem 8rem; justify-items: center;">
        @for (placement of placements; track placement) {
        <andes-hover-card [placement]="placement" [openDelay]="0" [arrow]="true" [width]="'10rem'">
          <button type="button" andesHoverCardTrigger style="padding: 0.25rem 0.75rem; border: 1px solid var(--andes-color-border); border-radius: 0.375rem; background: var(--andes-color-background); color: var(--andes-color-foreground); font: inherit; cursor: pointer;">{{ placement }}</button>
          <ng-template andesHoverCardContent>Placed {{ placement }}</ng-template>
        </andes-hover-card>
        }
      </div>
    `,
  }),
};

/** `openDelay` and `closeDelay`: instant, the defaults, and slow. */
export const Delays: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesHoverCardTrigger, AndesHoverCardContent] },
    template: `
      <div style="display: flex; gap: 2rem; padding: 4rem 2rem 8rem;">
        <andes-hover-card [openDelay]="0" [closeDelay]="0" [width]="'12rem'">
          <a href="#a" andesHoverCardTrigger style="${TRIGGER_STYLE}">No delay</a>
          <ng-template andesHoverCardContent>Opens and closes at once.</ng-template>
        </andes-hover-card>
        <andes-hover-card [width]="'12rem'">
          <a href="#b" andesHoverCardTrigger style="${TRIGGER_STYLE}">Default (600 / 300)</a>
          <ng-template andesHoverCardContent>Waits 600ms to open, 300ms to close.</ng-template>
        </andes-hover-card>
        <andes-hover-card [openDelay]="1200" [closeDelay]="800" [width]="'12rem'">
          <a href="#c" andesHoverCardTrigger style="${TRIGGER_STYLE}">Slow (1200 / 800)</a>
          <ng-template andesHoverCardContent>Waits 1.2s to open, 0.8s to close.</ng-template>
        </andes-hover-card>
      </div>
    `,
  }),
};

/** `[(open)]`: driven from outside; the model follows every user-driven change too. */
export const Controlled: Story = {
  render: () => ({
    moduleMetadata: { imports: [StoryControlled] },
    template: `<andes-story-controlled />`,
  }),
};

/** A disabled card never opens. */
export const Disabled: Story = {
  args: { disabled: true },
};

/** Width and look are CSS custom properties on the card, set through `cardClass` or globally. */
export const Styling: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [AndesHoverCardTrigger, AndesHoverCardContent, StoryProfile],
    },
    template: `
      <style>
        .compact-card {
          --andes-hover-card-padding: 0.75rem;
          --andes-hover-card-radius: 0.75rem;
        }
      </style>
      <div style="padding: 6rem;">
        <andes-hover-card cardClass="compact-card" [width]="'22rem'" [openDelay]="0" [open]="true">
          <a href="#ana" andesHoverCardTrigger style="${TRIGGER_STYLE}">Wide, compact card</a>
          <ng-template andesHoverCardContent><andes-story-profile /></ng-template>
        </andes-hover-card>
      </div>
    `,
  }),
};

/** Right-to-left: `start` and `end` alignment mirror, and the bridge and arrow follow. */
export const RightToLeft: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesHoverCardTrigger, AndesHoverCardContent] },
    template: `
      <div dir="rtl" style="padding: 6rem 6rem 10rem; font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-foreground);">
        <andes-hover-card placement="bottomLeft" [arrow]="true" [openDelay]="0" [open]="true" [width]="'14rem'">
          <a href="#a" andesHoverCardTrigger style="${TRIGGER_STYLE}">مرحبا</a>
          <ng-template andesHoverCardContent>
            <strong>Alignment mirrors</strong>
            <p style="margin: 0.25rem 0 0;">The card hugs the start edge of its trigger.</p>
          </ng-template>
        </andes-hover-card>
      </div>
    `,
  }),
};
