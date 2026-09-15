import type { Meta, StoryObj } from '@storybook/angular';

import { AndesAvatar } from './avatar';
import { AndesAvatarFallback } from './avatar-fallback';
import { AndesAvatarGroup } from './avatar-group';
import { AndesAvatarGroupCount } from './avatar-group-count';
import { AndesAvatarImage } from './avatar-image';

const VALID_IMAGE = 'https://i.pravatar.cc/150?img=12';
const BROKEN_IMAGE = 'https://andes-ng.dev/this-image-does-not-exist.png';

const meta: Meta<AndesAvatar> = {
  title: 'Avatar',
  component: AndesAvatar,
  tags: ['autodocs'],
  decorators: [
    (story) => ({
      moduleMetadata: {
        imports: [AndesAvatarImage, AndesAvatarFallback],
      },
      ...story(),
    }),
  ],
  argTypes: {
    shape: { control: 'select', options: ['circular', 'rounded', 'square'] },
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
  },
  args: {
    shape: 'circular',
    size: 'md',
  },
  render: (args) => ({
    props: args,
    template: `<andes-avatar [shape]="shape" [size]="size">
      <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
      <andes-avatar-fallback>JD</andes-avatar-fallback>
    </andes-avatar>`,
  }),
};

export default meta;

type Story = StoryObj<AndesAvatar>;

export const Default: Story = {};

export const ValidImage: Story = {
  render: (args) => ({
    props: args,
    template: `<andes-avatar [shape]="shape" [size]="size">
      <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
      <andes-avatar-fallback>JD</andes-avatar-fallback>
    </andes-avatar>`,
  }),
};

export const BrokenImageFallsBackToInitials: Story = {
  name: 'Broken image (falls back to initials)',
  render: (args) => ({
    props: args,
    template: `<andes-avatar [shape]="shape" [size]="size">
      <andes-avatar-image src="${BROKEN_IMAGE}" alt="Jane Doe" />
      <andes-avatar-fallback>JD</andes-avatar-fallback>
    </andes-avatar>`,
  }),
};

export const NoImageIconFallback: Story = {
  name: 'No image (generic icon fallback)',
  render: (args) => ({
    props: args,
    template: `<andes-avatar [shape]="shape" [size]="size">
      <andes-avatar-fallback>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="60%" height="60%">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </andes-avatar-fallback>
    </andes-avatar>`,
  }),
};

export const DelayedFallback: Story = {
  name: 'Fallback with a delay (avoids flash on fast loads)',
  render: (args) => ({
    props: args,
    template: `<andes-avatar [shape]="shape" [size]="size">
      <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
      <andes-avatar-fallback [delayMs]="600">JD</andes-avatar-fallback>
    </andes-avatar>`,
  }),
};

export const Shapes: Story = {
  render: () => ({
    template: `<div style="display: flex; align-items: center; gap: 1rem;">
      <andes-avatar shape="circular">
        <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
        <andes-avatar-fallback>JD</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar shape="rounded">
        <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
        <andes-avatar-fallback>JD</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar shape="square">
        <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
        <andes-avatar-fallback>JD</andes-avatar-fallback>
      </andes-avatar>
    </div>`,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `<div style="display: flex; align-items: center; gap: 1rem;">
      <andes-avatar size="xs">
        <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
        <andes-avatar-fallback>JD</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar size="sm">
        <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
        <andes-avatar-fallback>JD</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar size="md">
        <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
        <andes-avatar-fallback>JD</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar size="lg">
        <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
        <andes-avatar-fallback>JD</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar size="xl">
        <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
        <andes-avatar-fallback>JD</andes-avatar-fallback>
      </andes-avatar>
    </div>`,
  }),
};

export const Group: Story = {
  decorators: [
    (story) => ({
      moduleMetadata: {
        imports: [AndesAvatarGroup, AndesAvatarGroupCount],
      },
      ...story(),
    }),
  ],
  render: () => ({
    template: `<andes-avatar-group>
      <andes-avatar>
        <andes-avatar-image src="https://i.pravatar.cc/150?img=1" alt="Person one" />
        <andes-avatar-fallback>P1</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar>
        <andes-avatar-image src="https://i.pravatar.cc/150?img=2" alt="Person two" />
        <andes-avatar-fallback>P2</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar>
        <andes-avatar-image src="https://i.pravatar.cc/150?img=3" alt="Person three" />
        <andes-avatar-fallback>P3</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar-group-count [count]="4" />
    </andes-avatar-group>`,
  }),
};
