import type { Meta, StoryObj } from '@storybook/angular';

import { AndesAspectRatio } from './aspect-ratio';

/** An illustrative image drawn as an inline SVG, so the stories need no network. */
function scene(width: number, height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#sky)"/><circle cx="${width * 0.78}" cy="${height * 0.28}" r="${height * 0.12}" fill="#fde68a"/><path d="M0 ${height} L${width * 0.28} ${height * 0.42} L${width * 0.46} ${height * 0.68} L${width * 0.64} ${height * 0.36} L${width} ${height} Z" fill="#475569"/><path d="M0 ${height} L${width * 0.2} ${height * 0.7} L${width * 0.4} ${height} Z" fill="#334155"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const WIDE = scene(1600, 900);
const SQUARE = scene(800, 800);

const BOX =
  'display:flex;align-items:center;justify-content:center;background:var(--andes-color-muted);color:var(--andes-color-muted-foreground);border:1px solid var(--andes-color-border);border-radius:var(--andes-radius-md);font:14px/22px var(--andes-font-family),sans-serif;';

const meta: Meta<AndesAspectRatio> = {
  title: 'Aspect Ratio',
  component: AndesAspectRatio,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    ratio: {
      control: 'text',
      description: 'A number (`1.5`) or a fraction string (`"16/9"`, `"4:3"`).',
    },
    fit: {
      control: 'select',
      options: ['cover', 'contain', 'fill', 'none', 'scale-down'],
      description: 'How a projected image, video or canvas fills the box.',
    },
    position: {
      control: 'text',
      description: '`object-position` for that media.',
    },
    fill: {
      control: 'boolean',
      description: 'Children stretch over the box; off lets content flow.',
    },
  },
  args: { ratio: '16/9', fit: 'cover', position: 'center', fill: true },
  render: (args) => ({
    props: { ...args, src: WIDE },
    template: `
      <div style="max-width: 36rem">
        <andes-aspect-ratio [ratio]="ratio" [fit]="fit" [position]="position" [fill]="fill" style="border-radius: var(--andes-radius-lg)">
          <img [src]="src" alt="A mountain range under a clear sky" />
        </andes-aspect-ratio>
      </div>`,
  }),
};

export default meta;

type Story = StoryObj<AndesAspectRatio>;

export const Default: Story = {};

export const Square: Story = {
  args: { ratio: 1 },
  render: (args) => ({
    props: { ...args, src: SQUARE },
    template: `
      <div style="max-width: 20rem">
        <andes-aspect-ratio [ratio]="ratio" [fit]="fit" [fill]="fill" style="border-radius: var(--andes-radius-lg)">
          <img [src]="src" alt="A mountain range under a clear sky" />
        </andes-aspect-ratio>
      </div>`,
  }),
};

/** Common ratios side by side; every box is the same width, so only the ratio changes. */
export const Ratios: Story = {
  render: () => ({
    props: { box: BOX },
    template: `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:1rem;align-items:start;max-width:48rem">
        @for (r of ['1/1', '4/3', '16/9', '21/9', '9/16', '3/2']; track r) {
          <andes-aspect-ratio [ratio]="r">
            <div [style]="box">{{ r }}</div>
          </andes-aspect-ratio>
        }
      </div>`,
  }),
};

/** A wide picture in a square box: `cover` crops it, `contain` letterboxes it, `fill` stretches it. */
export const Fit: Story = {
  render: () => ({
    props: { src: WIDE, box: BOX },
    template: `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(9rem,1fr));gap:1rem;max-width:48rem">
        @for (fit of ['cover', 'contain', 'fill', 'none', 'scale-down']; track fit) {
          <figure style="margin:0">
            <andes-aspect-ratio [ratio]="1" [fit]="fit" style="background:var(--andes-color-muted);border-radius:var(--andes-radius-md)">
              <img [src]="src" alt="A mountain range under a clear sky" />
            </andes-aspect-ratio>
            <figcaption style="font:12px/20px var(--andes-font-family),sans-serif;color:var(--andes-color-muted-foreground);margin-top:0.25rem">{{ fit }}</figcaption>
          </figure>
        }
      </div>`,
  }),
};

/** `position` picks which part of a cropped picture stays visible. */
export const Position: Story = {
  render: () => ({
    props: { src: SQUARE },
    template: `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(11rem,1fr));gap:1rem;max-width:48rem">
        @for (p of ['top', 'center', 'bottom']; track p) {
          <figure style="margin:0">
            <andes-aspect-ratio ratio="21/9" fit="cover" [position]="p" style="border-radius:var(--andes-radius-md)">
              <img [src]="src" alt="A mountain range under a clear sky" />
            </andes-aspect-ratio>
            <figcaption style="font:12px/20px var(--andes-font-family),sans-serif;color:var(--andes-color-muted-foreground);margin-top:0.25rem">object-position: {{ p }}</figcaption>
          </figure>
        }
      </div>`,
  }),
};

/** Any element fills the box, not only media - useful for embeds, maps, charts and skeletons. */
export const AnyContent: Story = {
  render: () => ({
    props: { box: BOX },
    template: `
      <div style="max-width: 32rem">
        <andes-aspect-ratio ratio="2/1">
          <div [style]="box">A chart or a map would fill this box</div>
        </andes-aspect-ratio>
      </div>`,
  }),
};

/** With `fill` off, content flows and the ratio only sets the preferred shape: tall content grows the box. */
export const FlowingContent: Story = {
  args: { fill: false, ratio: '16/9' },
  render: (args) => ({
    props: { ...args, box: BOX },
    template: `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:1rem;max-width:40rem">
        <andes-aspect-ratio [ratio]="ratio" [fill]="fill" [style]="box">Short content keeps the shape</andes-aspect-ratio>
        <andes-aspect-ratio [ratio]="ratio" [fill]="fill" [style]="box + 'display:block;padding:1rem'">
          Longer content pushes the box taller than its ratio: the minimum height of a box is always the height of what is inside it, so nothing is ever clipped. Add more lines and the box keeps growing while the other one keeps its shape. Add more lines and the box keeps growing while the other one keeps its shape.
        </andes-aspect-ratio>
      </div>`,
  }),
};

/** The ratio lives in `--andes-aspect-ratio`, so a stylesheet can change it per breakpoint. */
export const ResponsiveRatio: Story = {
  render: () => ({
    props: { src: WIDE },
    styles: [
      `.hero { --andes-aspect-ratio: 1 / 1; }
       @media (min-width: 576px) { .hero { --andes-aspect-ratio: 4 / 3; } }
       @media (min-width: 992px) { .hero { --andes-aspect-ratio: 21 / 9; } }`,
    ],
    template: `
      <div style="max-width: 48rem">
        <p style="font:14px/22px var(--andes-font-family),sans-serif;color:var(--andes-color-muted-foreground);margin:0 0 0.5rem">
          1:1 below 576px, 4:3 from 576px, 21:9 from 992px.
        </p>
        <andes-aspect-ratio class="hero" style="border-radius: var(--andes-radius-lg)">
          <img [src]="src" alt="A mountain range under a clear sky" />
        </andes-aspect-ratio>
      </div>`,
  }),
};

/** A media card: the ratio box keeps the thumbnail from jumping while the image loads. */
export const MediaCard: Story = {
  render: () => ({
    props: { src: WIDE },
    template: `
      <article style="width:min(20rem,100%);border:1px solid var(--andes-color-border);border-radius:var(--andes-radius-lg);background:var(--andes-color-card);color:var(--andes-color-card-foreground);overflow:hidden;font:14px/22px var(--andes-font-family),sans-serif">
        <andes-aspect-ratio ratio="16/9" style="background:var(--andes-color-muted)">
          <img [src]="src" alt="A mountain range under a clear sky" loading="lazy" />
        </andes-aspect-ratio>
        <div style="padding:1rem">
          <h3 style="margin:0;font-size:16px;line-height:24px;font-weight:600">Alpine ridge</h3>
          <p style="margin:0.25rem 0 0;color:var(--andes-color-muted-foreground)">A 16:9 thumbnail that reserves its space up front.</p>
        </div>
      </article>`,
  }),
};
