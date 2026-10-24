import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesImage } from './image';
import { AndesImageGroup } from './image-group';
import { AndesImagePreview } from './image-preview';
import type { AndesImagePreviewItem } from './image-types';

/**
 * Scenic placeholders drawn as SVG so the stories need no network and look the same
 * everywhere: a sky gradient, a sun or moon, and three ridges of hills.
 */
const PALETTES = [
  {
    sky: ['#fde68a', '#fb923c'],
    sun: '#fff7ed',
    hills: ['#7c3aed', '#5b21b6', '#3b0764'],
  },
  {
    sky: ['#bae6fd', '#38bdf8'],
    sun: '#ffffff',
    hills: ['#16a34a', '#15803d', '#14532d'],
  },
  {
    sky: ['#1e1b4b', '#4338ca'],
    sun: '#e0e7ff',
    hills: ['#312e81', '#1e1b4b', '#0f0a3c'],
  },
  {
    sky: ['#fecdd3', '#fb7185'],
    sun: '#fff1f2',
    hills: ['#be123c', '#9f1239', '#4c0519'],
  },
  {
    sky: ['#a7f3d0', '#2dd4bf'],
    sun: '#f0fdfa',
    hills: ['#0f766e', '#115e59', '#042f2e'],
  },
];

function scene(index: number, width = 1200, height = 800): string {
  const p = PALETTES[index % PALETTES.length];
  const h = height;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <circle cx="${width * (0.25 + 0.12 * (index % 4))}" cy="${h * 0.3}" r="${h * 0.09}" fill="${p.sun}" opacity="0.9"/>
  <path d="M0 ${h * 0.62} Q ${width * 0.25} ${h * 0.42} ${width * 0.5} ${h * 0.6} T ${width} ${h * 0.55} V ${h} H0Z" fill="${p.hills[0]}"/>
  <path d="M0 ${h * 0.74} Q ${width * 0.3} ${h * 0.56} ${width * 0.6} ${h * 0.72} T ${width} ${h * 0.68} V ${h} H0Z" fill="${p.hills[1]}"/>
  <path d="M0 ${h * 0.88} Q ${width * 0.35} ${h * 0.74} ${width * 0.7} ${h * 0.86} T ${width} ${h * 0.82} V ${h} H0Z" fill="${p.hills[2]}"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const THUMBS = [0, 1, 2, 3, 4].map((i) => scene(i, 480, 320));
const LARGE = [0, 1, 2, 3, 4].map((i) => scene(i, 2400, 1600));
const NAMES = [
  'Sunset ridge',
  'Green valley',
  'Night hills',
  'Rose horizon',
  'Teal coast',
];

const GALLERY: readonly AndesImagePreviewItem[] = LARGE.map((src, i) => ({
  src,
  alt: NAMES[i],
  name: `${NAMES[i].toLowerCase().replace(/\s+/g, '-')}.svg`,
}));

const imports = [AndesImage, AndesImageGroup, AndesImagePreview];

/** Decodes to nothing, so the load fails at once without a network request. */
const BROKEN = 'data:image/png;base64,AAAA';

const meta: Meta<AndesImage> = {
  title: 'Image',
  component: AndesImage,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports })],
  argTypes: {
    src: { control: 'text' },
    alt: { control: 'text' },
    width: { control: 'text' },
    height: { control: 'text' },
    fallback: { control: 'text' },
    fit: {
      control: 'select',
      options: ['cover', 'contain', 'fill', 'none', 'scale-down'],
    },
    loading: { control: 'inline-radio', options: ['lazy', 'eager'] },
    preview: { control: 'boolean' },
    previewSrc: { control: 'text' },
    mask: { control: false },
    placeholder: { control: false },
    labels: { control: false },
  },
  args: {
    src: THUMBS[0],
    alt: NAMES[0],
    width: 240,
    height: 160,
    fit: 'cover',
    loading: 'eager',
    preview: true,
  },
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<AndesImage>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `<andes-image [src]="src" [alt]="alt" [width]="width" [height]="height" [fit]="fit" [loading]="loading" [preview]="preview" [previewSrc]="previewSrc" [fallback]="fallback" />`,
  }),
};

export const LargerPreviewAsset: Story = {
  name: 'Larger asset in the preview',
  args: { previewSrc: LARGE[0] },
  render: (args) => ({
    props: args,
    template: `
      <p style="margin: 0 0 0.75rem; max-width: 28rem; font: 14px/22px system-ui;">
        The thumbnail loads a small file; the preview loads <code>previewSrc</code>.
      </p>
      <andes-image loading="eager" [src]="src" [alt]="alt" [width]="width" [height]="height" [previewSrc]="previewSrc" />`,
  }),
};

export const FitModes: Story = {
  render: () => ({
    props: {
      src: scene(1, 480, 320),
      modes: ['cover', 'contain', 'fill', 'none', 'scale-down'],
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; font: 12px/20px system-ui;">
        @for (mode of modes; track mode) {
          <figure style="margin: 0;">
            <andes-image loading="eager" [src]="src" alt="" [width]="140" [height]="140" [fit]="mode" [preview]="false" />
            <figcaption>{{ mode }}</figcaption>
          </figure>
        }
      </div>`,
  }),
};

export const PreviewDisabled: Story = {
  args: { preview: false },
  render: (args) => ({
    props: args,
    template: `<andes-image loading="eager" [src]="src" [alt]="alt" [width]="width" [height]="height" [preview]="false" />`,
  }),
};

export const CustomMask: Story = {
  render: (args) => ({
    props: args,
    template: `
      <ng-template #zoom><strong style="font: 600 14px/22px system-ui;">Open full size</strong></ng-template>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <andes-image loading="eager" [src]="src" [alt]="alt" [width]="width" [height]="height" [mask]="zoom" />
        <andes-image loading="eager" [src]="src" [alt]="alt" [width]="width" [height]="height" mask="View" />
        <andes-image loading="eager" [src]="src" [alt]="alt" [width]="width" [height]="height" [mask]="false" />
      </div>`,
  }),
};

@Component({
  selector: 'andes-story-image-loading',
  imports: [AndesImage],
  template: `
    <div
      style="display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: flex-start;"
    >
      <figure style="margin: 0; font: 12px/20px system-ui;">
        <andes-image
          [src]="url()"
          alt="Skeleton placeholder"
          [width]="240"
          [height]="160"
          [placeholder]="true"
          [preview]="false"
        />
        <figcaption>Skeleton</figcaption>
      </figure>
      <figure style="margin: 0; font: 12px/20px system-ui;">
        <andes-image
          [src]="url()"
          alt="Blurred placeholder"
          [width]="240"
          [height]="160"
          placeholder="blur"
          [placeholderSrc]="blur"
          [preview]="false"
        />
        <figcaption>Blur-up</figcaption>
      </figure>
      <figure style="margin: 0; font: 12px/20px system-ui;">
        <ng-template #custom>
          <span
            style="display: grid; place-items: center; height: 100%; font: 13px/20px system-ui; color: var(--andes-color-muted-foreground);"
            >Fetching…</span
          >
        </ng-template>
        <andes-image
          [src]="url()"
          alt="Template placeholder"
          [width]="240"
          [height]="160"
          [placeholder]="custom"
          [preview]="false"
        />
        <figcaption>Template</figcaption>
      </figure>
    </div>
    <button
      type="button"
      (click)="reload()"
      style="margin-top: 1rem; font: 14px/22px system-ui;"
    >
      Load again
    </button>
  `,
})
class LoadingDemo {
  protected readonly blur = scene(0, 24, 16);
  protected readonly url = signal<string | undefined>(undefined);
  private runs = 0;

  constructor() {
    this.reload();
  }

  protected reload(): void {
    this.url.set(undefined);
    const run = ++this.runs;
    setTimeout(() => {
      if (run === this.runs) {
        this.url.set(scene(0, 480, 320));
      }
    }, 2200);
  }
}

export const Placeholders: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'While `src` has not arrived (`undefined`) the image shows its placeholder; it fades in over it once loaded.',
      },
    },
  },
  decorators: [moduleMetadata({ imports: [LoadingDemo] })],
  render: () => ({ template: `<andes-story-image-loading />` }),
};

export const FallbackAndError: Story = {
  render: () => ({
    props: { fallback: scene(3, 480, 320), broken: BROKEN },
    template: `
      <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; font: 12px/20px system-ui;">
        <figure style="margin: 0;">
          <andes-image loading="eager" [src]="broken" alt="Falls back" [fallback]="fallback" [width]="240" [height]="160" [preview]="false" />
          <figcaption>Broken src, with a fallback</figcaption>
        </figure>
        <figure style="margin: 0;">
          <andes-image loading="eager" [src]="broken" alt="Could not be loaded" [width]="240" [height]="160" />
          <figcaption>Broken src, no fallback</figcaption>
        </figure>
      </div>`,
  }),
};

export const Group: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Clicking any thumbnail opens one viewer over the whole group. Previous / next buttons, the arrow keys, `PageUp` / `PageDown`, `Home` and `End` move between images.',
      },
    },
  },
  render: () => ({
    props: { thumbs: THUMBS, large: LARGE, names: NAMES },
    template: `
      <andes-image-group>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          @for (thumb of thumbs; track thumb; let i = $index) {
            <andes-image [src]="thumb" [alt]="names[i]" [previewSrc]="large[i]" [width]="150" [height]="100" loading="eager" />
          }
        </div>
      </andes-image-group>`,
  }),
};

export const GroupLooping: Story = {
  render: () => ({
    props: { thumbs: THUMBS, large: LARGE, names: NAMES },
    template: `
      <andes-image-group [preview]="{ loop: true }">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          @for (thumb of thumbs; track thumb; let i = $index) {
            <andes-image [src]="thumb" [alt]="names[i]" [previewSrc]="large[i]" [width]="150" [height]="100" loading="eager" />
          }
        </div>
      </andes-image-group>`,
  }),
};

export const GroupWithExcludedImage: Story = {
  render: () => ({
    props: { thumbs: THUMBS, large: LARGE, names: NAMES },
    template: `
      <andes-image-group>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          @for (thumb of thumbs; track thumb; let i = $index) {
            <andes-image [src]="thumb" [alt]="names[i]" [previewSrc]="large[i]" [width]="150" [height]="100" loading="eager" [preview]="i !== 2" />
          }
        </div>
      </andes-image-group>
      <p style="margin: 0.75rem 0 0; font: 12px/20px system-ui;">The third picture has <code>[preview]="false"</code>, so the viewer skips it.</p>`,
  }),
};

export const ConfiguredPreview: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Zoom limits and step, which toolbar buttons appear, and a blurred scrim - all through the `preview` config object.',
      },
    },
  },
  render: () => ({
    props: {
      src: THUMBS[2],
      large: LARGE[2],
      config: {
        scaleStep: 0.25,
        maxScale: 8,
        actions: ['zoomOut', 'zoomIn', 'rotateRight', 'reset'],
        scrim: { blur: true },
      },
    },
    template: `<andes-image loading="eager" [src]="src" alt="Night hills" [previewSrc]="large" [width]="240" [height]="160" [preview]="config" />`,
  }),
};

export const ExtraActionsAndCount: Story = {
  render: () => ({
    props: {
      thumbs: THUMBS.slice(0, 3),
      large: LARGE,
      names: NAMES,
    },
    template: `
      <ng-template #extra let-item let-close="close">
        <button type="button" (click)="close()" style="border: 0; background: transparent; color: inherit; font: 500 13px/20px system-ui; padding: 0 0.5rem; cursor: pointer;">Use "{{ item.alt }}"</button>
      </ng-template>
      <ng-template #count let-current let-total="total"><span>Photo {{ current }} of {{ total }}</span></ng-template>
      <andes-image-group [preview]="{ extraActions: extra, countTemplate: count }">
        <div style="display: flex; gap: 0.75rem;">
          @for (thumb of thumbs; track thumb; let i = $index) {
            <andes-image [src]="thumb" [alt]="names[i]" [previewSrc]="large[i]" [width]="150" [height]="100" loading="eager" />
          }
        </div>
      </andes-image-group>`,
  }),
};

@Component({
  selector: 'andes-story-image-controlled',
  imports: [AndesImage, AndesImageGroup],
  template: `
    <div
      style="display: flex; gap: 0.5rem; margin-bottom: 1rem; font: 14px/22px system-ui;"
    >
      <button type="button" (click)="show(1)">Open the second</button>
      <button type="button" (click)="show(4)">Open the last</button>
      <span style="align-self: center;"
        >open: {{ open() }}, current: {{ current() }}</span
      >
    </div>
    <andes-image-group [(open)]="open" [(current)]="current">
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        @for (thumb of thumbs; track thumb; let i = $index) {
          <andes-image
            [src]="thumb"
            [alt]="names[i]"
            [previewSrc]="large[i]"
            [width]="120"
            [height]="80"
            loading="eager"
          />
        }
      </div>
    </andes-image-group>
  `,
})
class ControlledDemo {
  protected readonly thumbs = THUMBS;
  protected readonly large = LARGE;
  protected readonly names = NAMES;
  protected readonly open = signal(false);
  protected readonly current = signal(0);

  protected show(index: number): void {
    this.current.set(index);
    this.open.set(true);
  }
}

export const Controlled: Story = {
  decorators: [moduleMetadata({ imports: [ControlledDemo] })],
  render: () => ({ template: `<andes-story-image-controlled />` }),
};

@Component({
  selector: 'andes-story-image-standalone',
  imports: [AndesImagePreview],
  template: `
    <button
      type="button"
      (click)="open.set(true)"
      style="font: 14px/22px system-ui;"
    >
      Open the viewer
    </button>
    <andes-image-preview
      [items]="items"
      [(open)]="open"
      [(current)]="current"
      [config]="{ loop: true }"
    />
  `,
})
class StandaloneDemo {
  protected readonly items = GALLERY;
  protected readonly open = signal(false);
  protected readonly current = signal(0);
}

export const ViewerWithoutThumbnails: Story = {
  name: 'Viewer without thumbnails',
  decorators: [moduleMetadata({ imports: [StandaloneDemo] })],
  render: () => ({ template: `<andes-story-image-standalone />` }),
};

export const Localised: Story = {
  render: () => ({
    props: {
      src: THUMBS[1],
      large: LARGE[1],
      labels: {
        preview: 'Vista previa',
        dialog: 'Vista previa de imagen',
        close: 'Cerrar',
        zoomIn: 'Acercar',
        zoomOut: 'Alejar',
        rotateLeft: 'Girar a la izquierda',
        rotateRight: 'Girar a la derecha',
        flipX: 'Voltear horizontalmente',
        flipY: 'Voltear verticalmente',
        reset: 'Restablecer',
        download: 'Descargar',
        toolbar: 'Herramientas de imagen',
      },
    },
    template: `<andes-image loading="eager" [src]="src" alt="Valle verde" [previewSrc]="large" [width]="240" [height]="160" [labels]="labels" />`,
  }),
};

@Component({
  selector: 'andes-story-image-rtl',
  imports: [AndesImage, AndesImageGroup],
  template: `
    <andes-image-group>
      <div style="display: flex; gap: 0.75rem;">
        @for (thumb of thumbs; track thumb; let i = $index) {
          <andes-image
            loading="eager"
            [src]="thumb"
            [alt]="names[i]"
            [previewSrc]="large[i]"
            [width]="150"
            [height]="100"
          />
        }
      </div>
    </andes-image-group>
  `,
})
class RightToLeftDemo {
  protected readonly thumbs = THUMBS.slice(0, 3);
  protected readonly large = LARGE;
  protected readonly names = NAMES;

  constructor() {
    // The viewer renders in the overlay container, so it follows the document direction.
    const root = inject(DOCUMENT).documentElement;
    const previous = root.dir;
    root.dir = 'rtl';
    inject(DestroyRef).onDestroy(() => (root.dir = previous));
  }
}

export const RightToLeft: Story = {
  decorators: [moduleMetadata({ imports: [RightToLeftDemo] })],
  render: () => ({ template: `<andes-story-image-rtl />` }),
};
