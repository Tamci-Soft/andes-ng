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
    // Presets only in the control; a pixel number or a breakpoint map is
    // shown in the PixelSizes / ResponsiveSize stories.
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

// --- Extended sizing, fallback and overflow ----------------------------------

export const PixelSizes: Story = {
  name: 'Pixel sizes (size as a number)',
  parameters: {
    docs: {
      description: {
        story:
          "Besides the `xs`-`xl` presets, `size` takes any pixel number (e.g. `[size]=\"64\"`). The box is sized inline and the font size follows at ~35% of the box, with a 10px floor.",
      },
    },
  },
  render: () => ({
    template: `<div style="display: flex; align-items: center; gap: 1rem;">
      ${[20, 32, 48, 64, 96]
        .map(
          (px) => `<andes-avatar [size]="${px}">
        <andes-avatar-fallback>JD</andes-avatar-fallback>
      </andes-avatar>`,
        )
        .join('\n      ')}
      <andes-avatar [size]="96">
        <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
        <andes-avatar-fallback>JD</andes-avatar-fallback>
        <andes-avatar-badge status="online" label="Online" />
      </andes-avatar>
    </div>`,
  }),
};

export const ResponsiveSize: Story = {
  name: 'Responsive size (per breakpoint)',
  parameters: {
    docs: {
      description: {
        story:
          "Pass a breakpoint map - `{ xs: 'sm', md: 48, xl: 72 }` - and the avatar resizes with the viewport (`matchMedia`, breakpoints: sm 576, md 768, lg 992, xl 1200, xxl 1600). Mobile-first: a breakpoint with no key of its own uses the nearest smaller one. Resize the preview to see it change.",
      },
    },
  },
  render: () => ({
    props: { responsive: { xs: 'sm', md: 48, xl: 72 } },
    template: `<andes-avatar [size]="responsive">
      <andes-avatar-image src="${VALID_IMAGE}" alt="Jane Doe" />
      <andes-avatar-fallback>JD</andes-avatar-fallback>
    </andes-avatar>`,
  }),
};

export const TextAutoScaling: Story = {
  name: 'Fallback text shrinks to fit (gap)',
  parameters: {
    docs: {
      description: {
        story:
          'Fallback text wider than the avatar is scaled down to fit, keeping `gap` px (default 4) clear on each side - measured with a ResizeObserver, so it re-fits when the size, the text or the font changes. The second row uses `[gap]="8"`.',
      },
    },
  },
  render: () => ({
    template: `<div style="display: grid; gap: 1rem;">
      ${[4, 8]
        .map(
          (gap) => `<div style="display: flex; align-items: center; gap: 1rem;">
        ${(['xs', 'sm', 'md', 'lg', 'xl'] as const)
          .map(
            (size) => `<andes-avatar size="${size}">
          <andes-avatar-fallback [gap]="${gap}">Maria</andes-avatar-fallback>
        </andes-avatar>`,
          )
          .join('\n        ')}
        <andes-avatar size="lg">
          <andes-avatar-fallback [gap]="${gap}">JD</andes-avatar-fallback>
        </andes-avatar>
      </div>`,
        )
        .join('\n      ')}
    </div>`,
  }),
};

export const ImageAttributes: Story = {
  name: 'srcSet and draggable',
  parameters: {
    docs: {
      description: {
        story:
          "`srcSet` (+ `sizes`), `crossOrigin` and `draggable` pass straight to the `<img>`. This avatar serves a 2x source to high-density screens and cannot be dragged out of the page. (No `crossOrigin` here: it makes the request a CORS one, which fails - and falls back - against an image host that sends no `Access-Control-Allow-Origin`, as this demo's does.)",
      },
    },
  },
  render: () => ({
    template: `<andes-avatar size="xl">
      <andes-avatar-image
        src="https://i.pravatar.cc/72?img=12"
        srcSet="https://i.pravatar.cc/72?img=12 1x, https://i.pravatar.cc/144?img=12 2x"
        [draggable]="false"
        alt="Jane Doe"
      />
      <andes-avatar-fallback>JD</andes-avatar-fallback>
    </andes-avatar>`,
  }),
};

export const LoadErrorKeepsImage: Story = {
  name: 'loadError: keep the image (preventFallback)',
  parameters: {
    docs: {
      description: {
        story:
          "`(loadError)` fires when the image fails. Calling `$event.preventFallback()` in the handler keeps the `<img>` (the browser's broken-image/alt rendering) instead of switching to the fallback. Left: default behaviour. Right: fallback prevented.",
      },
    },
  },
  render: () => ({
    template: `<div style="display: flex; align-items: center; gap: 1rem;">
      <andes-avatar size="xl">
        <andes-avatar-image src="${BROKEN_IMAGE}" alt="Jane Doe" />
        <andes-avatar-fallback>JD</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar size="xl">
        <andes-avatar-image
          src="${BROKEN_IMAGE}"
          alt="Jane Doe"
          (loadError)="$event.preventFallback()"
        />
        <andes-avatar-fallback>JD</andes-avatar-fallback>
      </andes-avatar>
    </div>`,
  }),
};

const TEAM = [
  { name: 'Alice Moreau', img: 1 },
  { name: 'Bruno Castell', img: 2 },
  { name: 'Chika Adeyemi', img: 3 },
  { name: 'Dana Whitfield', img: 4 },
  { name: 'Elliot Brandt', img: 5 },
  { name: 'Farah Nazari', img: 6 },
];

function teamAvatars(): string {
  return TEAM.map(
    (person) => `<andes-avatar>
        <andes-avatar-image src="https://i.pravatar.cc/150?img=${person.img}" alt="${person.name}" />
        <andes-avatar-fallback>${person.name
          .split(' ')
          .map((part) => part[0])
          .join('')}</andes-avatar-fallback>
      </andes-avatar>`,
  ).join('\n      ');
}

export const GroupMax: Story = {
  name: 'Group: max (auto +N with reveal)',
  parameters: {
    docs: {
      description: {
        story:
          "`[max]=\"{ count: 3 }\"` keeps the first three avatars and collapses the rest into a generated `+N` chip that lists who is hidden (each avatar's image `alt`, icon `label` or fallback text) on hover, focus or tap. `max.popover` takes `{ label, placement: 'top' | 'bottom', trigger: 'hover' | 'click', template }` or `false`; `max.class` / `max.style` style the chip.",
      },
    },
  },
  render: () => ({
    template: `<andes-avatar-group [max]="{ count: 3, popover: { label: 'Also in this project' } }">
      ${teamAvatars()}
    </andes-avatar-group>`,
  }),
};

export const GroupMaxClickBottom: Story = {
  name: 'Group: max with a click trigger, below, styled',
  render: () => ({
    template: `<andes-avatar-group
      [max]="{
        count: 2,
        style: { 'background-color': 'var(--andes-color-primary)', color: 'var(--andes-color-primary-foreground)' },
        popover: { trigger: 'click', placement: 'bottom', label: 'Also in this project' }
      }"
    >
      ${teamAvatars()}
    </andes-avatar-group>`,
  }),
};

export const GroupMaxCustomPanel: Story = {
  name: 'Group: max with a custom panel template',
  parameters: {
    docs: {
      description: {
        story:
          "`max.popover.template` replaces the plain list of names; it receives the names (`let-names`) and `count`. Use `trigger: 'click'` when the panel holds anything interactive.",
      },
    },
  },
  render: () => ({
    template: `<andes-avatar-group
      [max]="{ count: 3, popover: { template: overflowPanel, trigger: 'click' } }"
    >
      ${teamAvatars()}
    </andes-avatar-group>
    <ng-template #overflowPanel let-names let-count="count">
      <strong style="font-size: 0.75rem;">{{ count }} more</strong>
      @for (name of names; track $index) {
        <span style="display: flex; align-items: center; gap: 0.5rem;">
          <andes-avatar size="xs"><andes-avatar-fallback>{{ name[0] }}</andes-avatar-fallback></andes-avatar>
          {{ name }}
        </span>
      }
    </ng-template>`,
  }),
};

export const GroupSizeAndShape: Story = {
  name: 'Group: size and shape for every avatar',
  parameters: {
    docs: {
      description: {
        story:
          "`size` and `shape` on the group apply to every avatar and to the `+N` chip; an avatar's own `size`/`shape` still wins. `size` takes presets, pixel numbers and responsive maps here too. Overlap is `--andes-avatar-group-overlap` (default `-0.625rem`); the last row sets it to `0.25rem` for a spaced-out group.",
      },
    },
  },
  render: () => ({
    template: `<div style="display: grid; gap: 1.25rem; justify-items: start;">
      <andes-avatar-group size="lg" shape="square" [max]="{ count: 4 }">
        ${teamAvatars()}
      </andes-avatar-group>
      <andes-avatar-group [size]="28" [max]="{ count: 4 }">
        ${teamAvatars()}
      </andes-avatar-group>
      <andes-avatar-group size="md" style="--andes-avatar-group-overlap: 0.25rem;" [max]="{ count: 4 }">
        ${teamAvatars()}
      </andes-avatar-group>
    </div>`,
  }),
};
