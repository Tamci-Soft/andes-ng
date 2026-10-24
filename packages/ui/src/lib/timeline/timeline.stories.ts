import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesTimeline } from './timeline';
import { AndesTimelineItem } from './timeline-item';

const meta: Meta<AndesTimeline> = {
  title: 'Timeline',
  component: AndesTimeline,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [AndesTimeline, AndesTimelineItem] })],
  parameters: { layout: 'padded' },
  argTypes: {
    mode: { control: 'inline-radio', options: ['start', 'end', 'alternate'] },
    variant: { control: 'inline-radio', options: ['outlined', 'filled'] },
    density: { control: 'inline-radio', options: ['default', 'compact'] },
    reverse: { control: 'boolean' },
    pending: { control: 'text' },
    locale: { control: 'text' },
  },
  args: {
    mode: 'start',
    variant: 'outlined',
    density: 'default',
    reverse: false,
    pending: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 32rem">
        <andes-timeline
          aria-label="Purchase order history"
          [mode]="mode"
          [variant]="variant"
          [density]="density"
          [reverse]="reverse"
          [pending]="pending"
        >
          <andes-timeline-item color="success">Order created by Lucia Paredes</andes-timeline-item>
          <andes-timeline-item>Sent to supplier Andes Metals</andes-timeline-item>
          <andes-timeline-item color="warning">Delivery date moved to 12 Nov</andes-timeline-item>
          <andes-timeline-item>Goods received at warehouse 4</andes-timeline-item>
        </andes-timeline>
      </div>`,
  }),
};

export default meta;

type Story = StoryObj<AndesTimeline>;

export const Default: Story = {};

export const ModeEnd: Story = {
  args: { mode: 'end' },
};

export const Alternate: Story = {
  args: { mode: 'alternate' },
};

export const Filled: Story = {
  args: { variant: 'filled' },
};

export const Compact: Story = {
  args: { density: 'compact' },
};

export const Reverse: Story = {
  args: { reverse: true },
};

export const Colors: Story = {
  render: () => ({
    template: `
      <andes-timeline aria-label="Colour reference">
        <andes-timeline-item>Primary (default)</andes-timeline-item>
        <andes-timeline-item color="success">Success</andes-timeline-item>
        <andes-timeline-item color="warning">Warning</andes-timeline-item>
        <andes-timeline-item color="danger">Danger</andes-timeline-item>
        <andes-timeline-item color="info">Info</andes-timeline-item>
        <andes-timeline-item color="neutral">Neutral</andes-timeline-item>
        <andes-timeline-item color="#7c3aed">Any CSS colour: #7c3aed</andes-timeline-item>
        <andes-timeline-item color="oklch(0.7 0.15 40)">oklch(0.7 0.15 40)</andes-timeline-item>
      </andes-timeline>`,
  }),
};

export const FilledColors: Story = {
  render: () => ({
    template: `
      <andes-timeline aria-label="Filled dots" variant="filled">
        <andes-timeline-item color="success" dotLabel="Succeeded">Build passed</andes-timeline-item>
        <andes-timeline-item color="danger" dotLabel="Failed">Integration tests failed</andes-timeline-item>
        <andes-timeline-item color="warning" dotLabel="Warning">Coverage dropped below 80%</andes-timeline-item>
        <andes-timeline-item color="neutral">Waiting for review</andes-timeline-item>
      </andes-timeline>`,
  }),
};

export const WithLabels: Story = {
  render: () => ({
    template: `
      <div style="max-width: 36rem">
        <andes-timeline aria-label="Shipment tracking">
          <andes-timeline-item label="Mon 3 Nov" color="success">Picked up in Callao</andes-timeline-item>
          <andes-timeline-item label="Tue 4 Nov">Customs clearance</andes-timeline-item>
          <andes-timeline-item label="Thu 6 Nov">In transit to Arequipa</andes-timeline-item>
          <andes-timeline-item label="Fri 7 Nov" color="neutral">Out for delivery</andes-timeline-item>
        </andes-timeline>
      </div>`,
  }),
};

export const AlternateWithLabels: Story = {
  render: () => ({
    template: `
      <div style="max-width: 40rem">
        <andes-timeline aria-label="Project milestones" mode="alternate">
          <andes-timeline-item label="Q1" color="success">Discovery finished</andes-timeline-item>
          <andes-timeline-item label="Q2" color="success">Pilot with 3 branches</andes-timeline-item>
          <andes-timeline-item label="Q3">Rollout to all branches</andes-timeline-item>
          <andes-timeline-item label="Q4" color="neutral">Retire the legacy system</andes-timeline-item>
        </andes-timeline>
      </div>`,
  }),
};

export const TimeElements: Story = {
  render: () => ({
    props: {
      events: [
        {
          at: '2026-10-12T09:15:00Z',
          text: 'Invoice 4012 issued',
          color: 'primary',
        },
        {
          at: '2026-10-13T14:02:00Z',
          text: 'Reminder sent to the customer',
          color: 'info',
        },
        {
          at: '2026-10-16T08:40:00Z',
          text: 'Payment received',
          color: 'success',
        },
      ],
      format: { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' },
    },
    template: `
      <div style="max-width: 36rem">
        <andes-timeline aria-label="Invoice activity" locale="en-US" [timeFormat]="format">
          @for (event of events; track event.at) {
            <andes-timeline-item [time]="event.at" [color]="event.color">{{ event.text }}</andes-timeline-item>
          }
        </andes-timeline>
      </div>`,
  }),
};

export const CustomDot: Story = {
  render: () => ({
    template: `
      <andes-timeline aria-label="Support ticket">
        <andes-timeline-item [dot]="mailTpl" color="info">Customer wrote in</andes-timeline-item>
        <andes-timeline-item [dot]="userTpl">Assigned to Marco</andes-timeline-item>
        <andes-timeline-item [dot]="checkTpl" color="success" dotLabel="Resolved">Marked as resolved</andes-timeline-item>
      </andes-timeline>
      <ng-template #mailTpl>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="m2.5 4.5 5.5 4 5.5-4"/></svg>
      </ng-template>
      <ng-template #userTpl>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="5.5" r="2.5"/><path d="M3 13c.6-2.4 2.6-3.5 5-3.5s4.4 1.1 5 3.5"/></svg>
      </ng-template>
      <ng-template #checkTpl>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="m5.5 8.2 1.8 1.8 3.2-3.5"/></svg>
      </ng-template>`,
  }),
};

export const PendingEllipsis: Story = {
  args: { pending: true },
};

export const PendingText: Story = {
  args: { pending: 'Waiting for the carrier to confirm' },
};

export const PendingReversed: Story = {
  args: { pending: 'Syncing with the ledger', reverse: true },
};

export const PendingCustomDot: Story = {
  render: () => ({
    template: `
      <andes-timeline aria-label="Deploy" pending="Rolling out to region 2" [pendingDot]="clockTpl">
        <andes-timeline-item color="success">Region 1 healthy</andes-timeline-item>
      </andes-timeline>
      <ng-template #clockTpl>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.2 1.4"/></svg>
      </ng-template>`,
  }),
};

export const RichContent: Story = {
  render: () => ({
    template: `
      <div style="max-width: 36rem">
        <andes-timeline aria-label="Document revisions" mode="alternate">
          <andes-timeline-item label="v1.0" color="success">
            <strong>Initial draft</strong>
            <p style="margin: .25rem 0 0; color: var(--andes-color-muted-foreground)">Covers scope, budget and the delivery calendar for the first phase.</p>
          </andes-timeline-item>
          <andes-timeline-item label="v1.1">
            <strong>Legal review</strong>
            <p style="margin: .25rem 0 0; color: var(--andes-color-muted-foreground)">Clauses 4 and 9 reworded after feedback from procurement.</p>
          </andes-timeline-item>
          <andes-timeline-item label="v2.0" color="warning">
            <strong>Budget revision</strong>
            <p style="margin: .25rem 0 0; color: var(--andes-color-muted-foreground)">Awaiting sign-off.</p>
          </andes-timeline-item>
        </andes-timeline>
      </div>`,
  }),
};

export const Rtl: Story = {
  render: () => ({
    template: `
      <div dir="rtl" style="max-width: 36rem">
        <andes-timeline aria-label="Activity" mode="alternate">
          <andes-timeline-item label="09:00" color="success">Opened</andes-timeline-item>
          <andes-timeline-item label="11:30">Assigned</andes-timeline-item>
          <andes-timeline-item label="16:10" color="neutral">Closed</andes-timeline-item>
        </andes-timeline>
      </div>`,
  }),
};
