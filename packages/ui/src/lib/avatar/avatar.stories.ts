import { type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { AndesAvatar } from './avatar';
import { AndesAvatarBadge } from './avatar-badge';
import { AndesAvatarFallback } from './avatar-fallback';
import { AndesAvatarGroup } from './avatar-group';
import { AndesAvatarGroupCount } from './avatar-group-count';
import { AndesAvatarIcon } from './avatar-icon';
import { AndesAvatarImage } from './avatar-image';

const VALID_IMAGE = 'https://i.pravatar.cc/150?img=12';
const BROKEN_IMAGE = 'https://andes-ng.dev/this-image-does-not-exist.png';

const USER_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>`;

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
        AndesAvatarIcon,
        AndesAvatarBadge,
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
        ${USER_ICON}
      </andes-avatar-fallback>
    </andes-avatar>`,
  }),
};

export const IconAvatar: Story = {
  name: 'Icon avatar (no image at all)',
  parameters: {
    docs: {
      description: {
        story:
          'Use `andes-avatar-icon` - not `andes-avatar-fallback` - when the avatar never had an image to fall back FROM. A fallback is tied to the image-load state machine: with no sibling `andes-avatar-image` the root stays at `data-status="loading"` forever and a `delayMs` fallback would never appear. `andes-avatar-icon` renders unconditionally and takes a required `label` for its accessible name (pass `""` when adjacent text already names the entity).',
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<div style="display: flex; align-items: center; gap: 1rem;">
      <andes-avatar [shape]="shape" [size]="size">
        <andes-avatar-icon label="Unassigned">${USER_ICON}</andes-avatar-icon>
      </andes-avatar>
      <andes-avatar shape="rounded" [size]="size">
        <andes-avatar-icon label="Unassigned">${USER_ICON}</andes-avatar-icon>
      </andes-avatar>
      <andes-avatar shape="square" [size]="size">
        <andes-avatar-icon label="Unassigned">${USER_ICON}</andes-avatar-icon>
      </andes-avatar>
    </div>`,
  }),
};

export const WithStatusBadge: Story = {
  name: 'With a status badge',
  parameters: {
    docs: {
      description: {
        story:
          'Project an `andes-avatar-badge` to pin a presence dot to a corner. `status` is `online | offline | busy | away`, `placement` is `bottom-end | bottom-start | top-end | top-start`, and `label` is required so the state reaches screen reader users through something other than colour.',
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<div style="display: flex; align-items: center; gap: 1.25rem;">
      <andes-avatar [shape]="shape" [size]="size">
        <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
        <andes-avatar-fallback>JD</andes-avatar-fallback>
        <andes-avatar-badge status="online" label="Online" />
      </andes-avatar>
      <andes-avatar [shape]="shape" [size]="size">
        <andes-avatar-fallback>AB</andes-avatar-fallback>
        <andes-avatar-badge status="busy" label="Busy" />
      </andes-avatar>
      <andes-avatar [shape]="shape" [size]="size">
        <andes-avatar-fallback>CD</andes-avatar-fallback>
        <andes-avatar-badge status="away" label="Away" />
      </andes-avatar>
      <andes-avatar [shape]="shape" [size]="size">
        <andes-avatar-fallback>EF</andes-avatar-fallback>
        <andes-avatar-badge status="offline" label="Offline" />
      </andes-avatar>
      <andes-avatar [shape]="shape" [size]="size">
        <andes-avatar-icon label="Unassigned">${USER_ICON}</andes-avatar-icon>
        <andes-avatar-badge status="offline" placement="top-end" label="Offline" />
      </andes-avatar>
    </div>`,
  }),
};

export const BadgeSizes: Story = {
  name: 'Status badge across every size',
  render: () => ({
    template: `<div style="display: flex; align-items: center; gap: 1.25rem;">
      ${(['xs', 'sm', 'md', 'lg', 'xl'] as const)
        .map(
          (size) => `<andes-avatar size="${size}">
        <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
        <andes-avatar-fallback>JD</andes-avatar-fallback>
        <andes-avatar-badge status="online" label="Online" />
      </andes-avatar>`,
        )
        .join('\n      ')}
    </div>`,
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

export const GroupWithOverflowReveal: Story = {
  name: 'Group with a revealing +N overflow',
  parameters: {
    docs: {
      description: {
        story:
          'Pass `hiddenNames` to turn the `+N` chip from inert text into a focusable trigger that reveals who is hidden - on hover, on keyboard focus (Tab to it) and on tap. Escape dismisses the panel. Without `hiddenNames` the chip stays exactly as before: plain, non-focusable text.',
      },
    },
  },
  render: () => ({
    props: {
      hidden: [
        'Dana Whitfield',
        'Elliot Brandt',
        'Farah Nazari',
        'Gustavo Rinaldi',
      ],
    },
    template: `<andes-avatar-group>
      <andes-avatar>
        <andes-avatar-image src="https://i.pravatar.cc/150?img=1" alt="Alice Moreau" />
        <andes-avatar-fallback>AM</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar>
        <andes-avatar-image src="https://i.pravatar.cc/150?img=2" alt="Bruno Castell" />
        <andes-avatar-fallback>BC</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar>
        <andes-avatar-image src="https://i.pravatar.cc/150?img=3" alt="Chika Adeyemi" />
        <andes-avatar-fallback>CA</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar-group-count
        [count]="hidden.length"
        [hiddenNames]="hidden"
        overflowLabel="Also in this project"
      />
    </andes-avatar-group>`,
  }),
};
