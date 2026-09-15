import { type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

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
  // `moduleMetadata(...)`, the helper from `@storybook/angular` - NOT a
  // hand-rolled `(story) => ({ moduleMetadata: {...}, ...story() })`
  // decorator, which is what this file used to carry and which silently
  // dropped imports.
  //
  // Decorators compose inside-out: a story-level decorator runs first, and
  // its result is what the meta-level decorator receives from `story()`. So
  // spreading `...story()` over a literal `moduleMetadata` key means any
  // story that supplies its OWN `moduleMetadata` (the Group story did, for
  // `AndesAvatarGroup`/`AndesAvatarGroupCount`) overwrites the meta-level one
  // wholesale rather than adding to it. `AndesAvatarImage` and
  // `AndesAvatarFallback` then never reached the compiled story module, and
  // every `<andes-avatar-image>` / `<andes-avatar-fallback>` in that story's
  // template rendered as an unknown element - NG0304 at runtime, with the
  // photo and the initials simply missing from the page.
  //
  // The official helper merges instead of replacing: it reads the inner
  // story's `moduleMetadata` and concatenates each array (`imports`,
  // `declarations`, `providers`, `schemas`) with its own, which is precisely
  // the behaviour a per-story override needs.
  //
  // Every Avatar part is declared once here rather than per story: the parts
  // are a single compound component, an unused import costs nothing, and one
  // shared list is exactly what an `autodocs` page - which renders all of a
  // component's stories together - needs in order to compile them side by
  // side.
  decorators: [
    moduleMetadata({
      imports: [
        AndesAvatarImage,
        AndesAvatarFallback,
        AndesAvatarGroup,
        AndesAvatarGroupCount,
      ],
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
