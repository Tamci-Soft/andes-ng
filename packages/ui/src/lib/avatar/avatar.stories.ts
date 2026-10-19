import { type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
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

export const IconFallbackSizes: Story = {
  name: 'Icon fallback at every size',
  parameters: {
    docs: {
      description: {
        story:
          'A person glyph used as the fallback (top row) or as an icon avatar (middle row) is drawn at the same share of the avatar at every preset and pixel size - about two thirds of the box, so a glyph with the usual padding inside its viewBox covers a little over half of the avatar - and reads at the same weight as the initials (bottom row). Tune it with `--andes-avatar-icon-scale` (a unitless share of the box, default `0.66`) for an icon set whose glyphs fill the viewBox edge to edge.',
      },
    },
  },
  render: () => {
    const boxes: Record<string, number> = {
      xs: 20,
      sm: 24,
      md: 32,
      lg: 40,
      xl: 56,
      16: 16,
      48: 48,
      64: 64,
      96: 96,
    };
    const sizes = Object.keys(boxes);
    const attr = (size: string) =>
      /^\d+$/.test(size) ? `[size]="${size}"` : `size="${size}"`;
    const row = (title: string, content: (size: string) => string) =>
      `<div style="display: flex; align-items: center; gap: 1rem;">
        <span style="width: 7rem; font-size: 0.75rem; color: var(--andes-color-muted-foreground);">${title}</span>
        ${sizes.map((size) => `<andes-avatar ${attr(size)}>${content(size)}</andes-avatar>`).join('\n        ')}
      </div>`;
    return {
      template: `<div style="display: grid; gap: 1rem;">
      <div style="display: flex; gap: 1rem; padding-inline-start: 8rem; font-size: 0.75rem; color: var(--andes-color-muted-foreground);">
        ${sizes.map((size) => `<span style="width: ${boxes[size]}px; text-align: center;">${size}</span>`).join('')}
      </div>
      ${row('Fallback glyph', () => `<andes-avatar-fallback>${USER_ICON}</andes-avatar-fallback>`)}
      ${row('Icon avatar', () => `<andes-avatar-icon label="Unassigned">${USER_ICON}</andes-avatar-icon>`)}
      ${row('Initials', () => '<andes-avatar-fallback>JD</andes-avatar-fallback>')}
    </div>`,
    };
  },
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

export const GroupOnCard: Story = {
  name: 'Group on a card surface',
  parameters: {
    docs: {
      description: {
        story:
          'The ring between overlapping avatars is drawn in `--andes-avatar-ring-color` (the page background by default). On a card or any other surface, set it to that surface so the separator reads as a cut-out - compare the two groups in the dark theme.',
      },
    },
  },
  render: () => ({
    template: `<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-lg); background: var(--andes-color-card);">
      <andes-avatar-group>
        <andes-avatar><andes-avatar-fallback>AM</andes-avatar-fallback></andes-avatar>
        <andes-avatar><andes-avatar-fallback>BC</andes-avatar-fallback></andes-avatar>
        <andes-avatar><andes-avatar-fallback>CA</andes-avatar-fallback></andes-avatar>
        <andes-avatar-group-count [count]="4" />
      </andes-avatar-group>
      <andes-avatar-group style="--andes-avatar-ring-color: var(--andes-color-card)">
        <andes-avatar><andes-avatar-fallback>AM</andes-avatar-fallback></andes-avatar>
        <andes-avatar><andes-avatar-fallback>BC</andes-avatar-fallback></andes-avatar>
        <andes-avatar><andes-avatar-fallback>CA</andes-avatar-fallback></andes-avatar>
        <andes-avatar-group-count [count]="4" />
      </andes-avatar-group>
    </div>`,
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
          'Besides the `xs`-`xl` presets, `size` takes any pixel number (e.g. `[size]="64"`). The box is sized inline and the font size follows at ~40% of the box, with a 10px floor.',
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
          "`[max]=\"{ count: 3 }\"` keeps the first three avatars and collapses the rest into a generated `+N` chip that lists who is hidden (each avatar's image `alt`, icon `label` or fallback text) on hover, focus or tap. `max.popover` takes `{ label, placement: 'top' | 'bottom', trigger: 'hover' | 'focus' | 'click', template }` or `false`; `max.class` / `max.style` style the chip.",
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

export const GroupMaxFocusTrigger: Story = {
  name: 'Group: max with a focus trigger',
  parameters: {
    docs: {
      description: {
        story:
          "`trigger: 'focus'` opens the panel on keyboard focus and tap only - sweeping the pointer across a dense row doesn't pop it up. Tab to the `+N` chip to reveal who is hidden.",
      },
    },
  },
  render: () => ({
    template: `<andes-avatar-group
      [max]="{ count: 3, popover: { trigger: 'focus', label: 'Also in this project' } }"
    >
      ${teamAvatars()}
    </andes-avatar-group>`,
  }),
};

// --- Overflow at scale --------------------------------------------------------

const FIRST_NAMES = [
  'Alice',
  'Bruno',
  'Chika',
  'Dana',
  'Elliot',
  'Farah',
  'Gustavo',
  'Hana',
  'Ivan',
  'Jun',
  'Karla',
  'Liam',
  'Mina',
  'Noor',
  'Omar',
  'Priya',
  'Quinn',
  'Rosa',
  'Sven',
  'Tariq',
];
const LAST_NAMES = [
  'Moreau',
  'Castell',
  'Adeyemi',
  'Whitfield',
  'Brandt',
  'Nazari',
  'Rinaldi',
  'Okafor',
  'Petrov',
  'Sato',
  'Lindqvist',
  'Ferreira',
  'Haddad',
  'Novak',
  'Ibarra',
  'Kowalski',
  'Mbeki',
  'Yilmaz',
  'Duarte',
  'Larsen',
];

interface GeneratedPerson {
  readonly name: string;
  readonly initials: string;
  readonly background: string;
  /** A generated picture (an inline SVG, so no network) for every fourth person. */
  readonly picture: string | null;
}

/** `count` distinct people with generated names, colors and, for some, pictures. */
function generatePeople(count: number): GeneratedPerson[] {
  return Array.from({ length: count }, (_, i) => {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last =
      LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const initials = `${first[0]}${last[0]}`;
    const hue = (i * 47) % 360;
    const background = `hsl(${hue} 55% 38%)`;
    const picture =
      i % 4 === 0
        ? `data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(${hue} 60% 45%)"/><circle cx="32" cy="25" r="11" fill="hsl(${hue} 70% 85%)"/><path d="M10 64a22 22 0 0 1 44 0z" fill="hsl(${hue} 70% 85%)"/></svg>`,
          )}`
        : null;
    return { name: `${first} ${last}`, initials, background, picture };
  });
}

/** A source that never loads, so the person shows initials but keeps a name. */
const NO_PICTURE = 'data:,';

/** The group markup for generated people; `groupAttrs` goes on `andes-avatar-group`. */
function generatedGroup(groupAttrs: string): string {
  return `<andes-avatar-group ${groupAttrs}>
      @for (person of people; track person.name) {
        <andes-avatar
          [style.--andes-avatar-background]="person.background"
          style="--andes-avatar-foreground: #ffffff"
        >
          <andes-avatar-image [src]="person.picture ?? NO_PICTURE" [alt]="person.name" />
          <andes-avatar-fallback>{{ person.initials }}</andes-avatar-fallback>
        </andes-avatar>
      }
    </andes-avatar-group>`;
}

const OVERFLOW_ROOM =
  'min-height: 21rem; display: flex; align-items: flex-start; padding-top: 1rem;';

export const GroupOverflowFew: Story = {
  name: 'Group overflow: 8 hidden (faces)',
  parameters: {
    docs: {
      description: {
        story:
          'The `+N` panel shows the hidden avatars as faces - photo, else initials - not as a list of names. Each face is named for assistive technology (`aria-label`) and its name is shown in a caption under the faces while it is hovered or focused. With a handful of faces the panel is a single compact block with no heading. Tab to the chip (or hover it), then Arrow Down moves into the faces; arrow keys move across them, Escape closes the panel and returns to the chip.',
      },
    },
  },
  render: () => ({
    props: { people: generatePeople(11), NO_PICTURE },
    template: `<div style="${OVERFLOW_ROOM}">${generatedGroup(
      `[max]="{ count: 3, popover: { placement: 'bottom' } }"`,
    )}</div>`,
  }),
};

export const GroupOverflowMany: Story = {
  name: 'Group overflow: 40 hidden (scrolling grid)',
  parameters: {
    docs: {
      description: {
        story:
          'Past four rows the panel keeps its size and scrolls vertically (thin scrollbar, the page behind does not scroll), and shows a "+N more" heading. The grid is 6-8 faces wide depending on the avatar size. Page Up/Down move by a screenful; Home/End go to the start/end of a row and Ctrl+Home/End to the first/last face.',
      },
    },
  },
  render: () => ({
    props: { people: generatePeople(43), NO_PICTURE },
    template: `<div style="${OVERFLOW_ROOM}">${generatedGroup(
      `[max]="{ count: 3, popover: { placement: 'bottom' } }"`,
    )}</div>`,
  }),
};

export const GroupOverflowHundreds: StoryObj<{ hidden: number }> = {
  name: 'Group overflow: 300 hidden',
  args: { hidden: 300 },
  argTypes: {
    hidden: { control: { type: 'number', min: 1, max: 5000 } },
  },
  parameters: {
    docs: {
      description: {
        story:
          'The panel is built when it opens and renders only the rows in (and just beside) its scroll viewport, so 300 hidden avatars cost about as much as 40 - and 5,000 would too. Pictures load lazily as their rows scroll in.',
      },
    },
  },
  render: (args) => ({
    props: { people: generatePeople(args.hidden + 3), NO_PICTURE },
    template: `<div style="${OVERFLOW_ROOM}">${generatedGroup(
      `[max]="{ count: 3, popover: { placement: 'bottom', trigger: 'click' } }"`,
    )}</div>`,
  }),
};

export const GroupOverflowLayouts: Story = {
  name: 'Group overflow: grid vs row, hover vs click',
  parameters: {
    docs: {
      description: {
        story:
          "`max.popover.layout` is `'grid'` (default; any number of faces) or `'row'` (one horizontal line that scrolls sideways and snaps to faces - for a handful). `max.popover.trigger` is `'hover'` (default; also opens on focus and tap) or `'click'` (a disclosure that stays open until Escape or a click outside). Left to right: grid on hover, row on hover, grid on click, row on click.",
      },
    },
  },
  render: () => ({
    props: { people: generatePeople(15), NO_PICTURE },
    template: `<div style="${OVERFLOW_ROOM} gap: 4rem; flex-wrap: wrap;">
      ${[
        ["layout: 'grid'", 'hover'],
        ["layout: 'row'", 'hover'],
        ["layout: 'grid'", 'click'],
        ["layout: 'row'", 'click'],
      ]
        .map(([layout, trigger]) =>
          generatedGroup(
            `[max]="{ count: 3, popover: { placement: 'bottom', ${layout}, trigger: '${trigger}' } }"`,
          ),
        )
        .join('\n      ')}
    </div>`,
  }),
};

export const GroupWithoutMax: Story = {
  name: 'Group: 100 avatars without max',
  parameters: {
    docs: {
      description: {
        story:
          'Without `max` the stack never wraps or shrinks: its avatars keep their size and overlap, so 100 of them make a row about 2,400px wide that spills out of its container (here a 360px box, clipped for the demo). Always set `max` for a group that can grow - the visible row is then `max.count` avatars plus the chip, however many are hidden. If every avatar must stay visible, let the group wrap with `flex-wrap: wrap` and give it a gap (`--andes-avatar-group-overlap: 0.25rem`), as in the second box.',
      },
    },
  },
  render: () => ({
    props: { people: generatePeople(100), NO_PICTURE },
    template: `<div style="display: grid; gap: 1.5rem;">
      <div style="width: 360px; overflow: hidden; border: 1px dashed var(--andes-color-border);">
        ${generatedGroup('')}
      </div>
      <div style="width: 360px; border: 1px dashed var(--andes-color-border);">
        ${generatedGroup('style="flex-wrap: wrap; row-gap: 0.25rem; --andes-avatar-group-overlap: 0.25rem"')}
      </div>
    </div>`,
  }),
};

export const CustomColors: Story = {
  name: 'Custom colors',
  parameters: {
    docs: {
      description: {
        story:
          'Set `--andes-avatar-background` and `--andes-avatar-foreground` on an avatar, or once on a group (they inherit), to recolor initials and icon avatars and the `+N` chip. Keep the pair at 4.5:1 contrast for initials.',
      },
    },
  },
  render: () => ({
    template: `<div style="display: flex; align-items: center; gap: 1rem;">
      <andes-avatar style="--andes-avatar-background: var(--andes-color-primary); --andes-avatar-foreground: var(--andes-color-primary-foreground);">
        <andes-avatar-fallback>AN</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar style="--andes-avatar-background: #15803d; --andes-avatar-foreground: #ffffff;">
        <andes-avatar-fallback>OK</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar style="--andes-avatar-background: var(--andes-color-danger); --andes-avatar-foreground: var(--andes-color-danger-foreground);">
        <andes-avatar-fallback>ER</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar shape="rounded" style="--andes-avatar-background: #7c3aed; --andes-avatar-foreground: #ffffff;">
        <andes-avatar-fallback>VI</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar-group
        [max]="{ count: 2 }"
        style="--andes-avatar-background: #0f766e; --andes-avatar-foreground: #ffffff;"
      >
        <andes-avatar><andes-avatar-fallback>TA</andes-avatar-fallback></andes-avatar>
        <andes-avatar><andes-avatar-fallback>TB</andes-avatar-fallback></andes-avatar>
        <andes-avatar><andes-avatar-fallback>TC</andes-avatar-fallback></andes-avatar>
        <andes-avatar><andes-avatar-fallback>TD</andes-avatar-fallback></andes-avatar>
      </andes-avatar-group>
    </div>`,
  }),
};

export const DynamicFallbackText: Story = {
  name: 'Fallback text that changes at runtime',
  decorators: [moduleMetadata({ imports: [AndesButton] })],
  parameters: {
    docs: {
      description: {
        story:
          'The text re-fits whenever it or `gap` changes - cycle through names of different lengths and toggle the gap.',
      },
    },
  },
  render: () => ({
    props: { names: ['U', 'Lucy', 'Tom', 'Edward'], index: 0, gap: 4 },
    template: `<div style="display: flex; align-items: center; gap: 1rem;">
      <andes-avatar size="lg">
        <andes-avatar-fallback [gap]="gap">{{ names[index] }}</andes-avatar-fallback>
      </andes-avatar>
      <andes-button variant="secondary" size="sm" (click)="index = (index + 1) % names.length">Change user</andes-button>
      <andes-button variant="secondary" size="sm" (click)="gap = gap === 4 ? 8 : gap === 8 ? 2 : 4">Gap: {{ gap }}</andes-button>
    </div>`,
  }),
};

export const GroupSizeAndShape: Story = {
  name: 'Group: size and shape for every avatar',
  parameters: {
    docs: {
      description: {
        story:
          "`size` and `shape` on the group apply to every avatar and to the `+N` chip; an avatar's own `size`/`shape` still wins. `size` takes presets, pixel numbers and responsive maps here too. Overlap is `--andes-avatar-group-overlap` (default `-0.5rem`); the last row sets it to `0.25rem` for a spaced-out group.",
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
