import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesSkeleton } from './skeleton';
import { AndesSkeletonAvatar } from './skeleton-avatar';
import { AndesSkeletonButton } from './skeleton-button';
import { AndesSkeletonImage } from './skeleton-image';
import { AndesSkeletonInput } from './skeleton-input';
import { AndesSkeletonNode } from './skeleton-node';

const meta: Meta<AndesSkeleton> = {
  title: 'Skeleton',
  component: AndesSkeleton,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        AndesButton,
        AndesSkeletonAvatar,
        AndesSkeletonButton,
        AndesSkeletonImage,
        AndesSkeletonInput,
        AndesSkeletonNode,
      ],
    }),
  ],
  argTypes: {
    loading: { control: 'boolean' },
    active: { control: 'boolean' },
    avatar: { control: 'object' },
    title: { control: 'object' },
    paragraph: { control: 'object' },
    round: { control: 'boolean' },
    loadingLabel: { control: 'text' },
    shape: {
      control: 'select',
      options: [undefined, 'text', 'circular', 'rectangular'],
      description: 'Block mode: set to render the original single bar.',
    },
    width: { control: 'text' },
    height: { control: 'text' },
    animated: { control: 'boolean' },
  },
  args: {
    loading: true,
    active: false,
    avatar: false,
    title: true,
    paragraph: true,
    round: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="width: 420px;">
        <andes-skeleton
          [loading]="loading"
          [active]="active"
          [avatar]="avatar"
          [title]="title"
          [paragraph]="paragraph"
          [round]="round"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesSkeleton>;

// --- Composite -----------------------------------------------------------------------------------

export const Basic: Story = {};

export const WithAvatar: Story = {
  args: { avatar: true, paragraph: { rows: 4 } },
};

export const Active: Story = {
  args: { active: true, avatar: true },
};

export const Round: Story = {
  args: { round: true, avatar: { shape: 'square', size: 'lg' } },
};

export const ParagraphWidths: Story = {
  args: {
    title: { width: 160 },
    paragraph: { rows: 4, width: ['90%', '75%', '85%', 120] },
  },
};

export const TitleOnly: Story = {
  args: { avatar: true, paragraph: false },
};

/** `loading` swaps the placeholder for the projected content - toggle it with the button. */
export const LoadingWrapper: Story = {
  args: { active: true, avatar: true },
  render: (args) => ({
    props: { ...args, isLoading: true },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 420px;">
        <andes-button variant="secondary" size="sm" (click)="isLoading = !isLoading">
          {{ isLoading ? 'Show content' : 'Show skeleton' }}
        </andes-button>
        <andes-skeleton [loading]="isLoading" [active]="active" [avatar]="avatar">
          <div style="display: flex; gap: 1rem; font-family: var(--andes-font-family), sans-serif; color: var(--andes-color-foreground);">
            <div style="flex: none; width: 2.5rem; height: 2.5rem; border-radius: 9999px; background: var(--andes-color-primary); color: var(--andes-color-primary-foreground); display: flex; align-items: center; justify-content: center;">AN</div>
            <div>
              <h4 style="margin: 0.5rem 0 0.75rem;">Andes NG</h4>
              <p style="margin: 0; color: var(--andes-color-muted-foreground);">
                The real content, rendered once loading is false.
              </p>
            </div>
          </div>
        </andes-skeleton>
      </div>
    `,
  }),
};

export const List: Story = {
  args: { active: true },
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; width: 420px;">
        @for (item of [1, 2, 3]; track item) {
          <andes-skeleton [active]="active" avatar [paragraph]="{ rows: 1 }" />
        }
      </div>
    `,
  }),
};

// --- Elements ------------------------------------------------------------------------------------

export const Elements: Story = {
  args: { active: true },
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 480px;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <andes-skeleton-avatar [active]="active" size="sm" />
          <andes-skeleton-avatar [active]="active" />
          <andes-skeleton-avatar [active]="active" size="lg" />
          <andes-skeleton-avatar [active]="active" shape="square" size="lg" />
          <andes-skeleton-avatar [active]="active" [size]="56" />
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <andes-skeleton-button [active]="active" size="sm" />
          <andes-skeleton-button [active]="active" />
          <andes-skeleton-button [active]="active" size="lg" />
          <andes-skeleton-button [active]="active" shape="round" />
          <andes-skeleton-button [active]="active" shape="circle" />
          <andes-skeleton-button [active]="active" shape="square" />
        </div>
        <andes-skeleton-button [active]="active" block />
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <andes-skeleton-input [active]="active" size="sm" />
          <andes-skeleton-input [active]="active" size="lg" />
        </div>
        <andes-skeleton-input [active]="active" block />
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <andes-skeleton-image [active]="active" />
          <andes-skeleton-node [active]="active">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
            </svg>
          </andes-skeleton-node>
          <andes-skeleton-node [active]="active" [width]="160" height="6rem">Loading chart…</andes-skeleton-node>
        </div>
      </div>
    `,
  }),
};

/** Standalone elements are decorative - give the region its own single busy indicator. */
export const ElementsInBusyRegion: Story = {
  args: { active: true },
  render: (args) => ({
    props: args,
    template: `
      <div aria-busy="true" style="display: flex; align-items: center; gap: 0.75rem;">
        <span role="status" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0);">Loading form…</span>
        <andes-skeleton-input [active]="active" />
        <andes-skeleton-button [active]="active" />
      </div>
    `,
  }),
};

// --- Block mode (original single-bar API, `shape` set) -------------------------------------------

const blockRender: Story['render'] = (args) => ({
  props: args,
  template: `<andes-skeleton [shape]="shape" [width]="width" [height]="height" [animated]="animated" />`,
});

export const Text: Story = {
  args: { shape: 'text', animated: true },
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 250px;">
        <andes-skeleton [shape]="shape" [animated]="animated" />
        <andes-skeleton [shape]="shape" [animated]="animated" width="80%" />
        <andes-skeleton [shape]="shape" [animated]="animated" width="60%" />
      </div>
    `,
  }),
};

export const Circular: Story = {
  args: { shape: 'circular', animated: true },
  render: blockRender,
};

export const Rectangular: Story = {
  args: { shape: 'rectangular', animated: true },
  render: (args) => ({
    props: args,
    template: `<div style="width: 300px;"><andes-skeleton [shape]="shape" [animated]="animated" /></div>`,
  }),
};

export const CustomSize: Story = {
  args: { shape: 'circular', width: 80, height: 80, animated: true },
  render: blockRender,
};

export const Static: Story = {
  args: { shape: 'text', animated: false },
  render: (args) => ({
    props: args,
    template: `<div style="width: 250px;"><andes-skeleton [shape]="shape" [animated]="animated" /></div>`,
  }),
};

export const CardPlaceholder: Story = {
  args: { animated: true },
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; align-items: center; gap: 1rem; width: 300px;">
        <andes-skeleton shape="circular" [width]="48" [height]="48" [animated]="animated" />
        <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
          <andes-skeleton shape="text" width="60%" [animated]="animated" />
          <andes-skeleton shape="text" width="90%" [animated]="animated" />
        </div>
      </div>
    `,
  }),
};

export const AllShapes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 1.5rem;">
        <andes-skeleton shape="text" [width]="120" />
        <andes-skeleton shape="circular" />
        <andes-skeleton shape="rectangular" [width]="120" [height]="80" />
      </div>
    `,
  }),
};

/** Placeholders stay visible on a card surface too (muted fill vanished there in dark mode). */
export const OnCard: Story = {
  args: { active: true, avatar: true },
  render: (args) => ({
    props: args,
    template: `
      <div style="width: 420px; padding: 1.5rem; border-radius: var(--andes-radius-lg); border: 1px solid var(--andes-color-border); background: var(--andes-color-card);">
        <andes-skeleton [active]="active" [avatar]="avatar" />
      </div>
    `,
  }),
};
