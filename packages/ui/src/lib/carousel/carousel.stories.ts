import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesCarousel } from './carousel';
import { AndesCarouselLazy } from './carousel-lazy';
import { AndesCarouselSlide } from './carousel-slide';

/** Scenic slides drawn as SVG, so the stories need no network. */
const PALETTES = [
  ['#fde68a', '#fb923c', '#7c3aed'],
  ['#bae6fd', '#38bdf8', '#16a34a'],
  ['#c7d2fe', '#4338ca', '#1e1b4b'],
  ['#fecdd3', '#fb7185', '#be123c'],
  ['#a7f3d0', '#2dd4bf', '#0f766e'],
  ['#fef08a', '#f59e0b', '#92400e'],
];
const TITLES = [
  'Sunset ridge',
  'Green valley',
  'Night hills',
  'Rose horizon',
  'Teal coast',
  'Amber dunes',
];

function scene(index: number, width = 900, height = 420): string {
  const [top, bottom, hills] = PALETTES[index % PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/><circle cx="${width * 0.7}" cy="${height * 0.3}" r="${height * 0.1}" fill="#fff" opacity="0.85"/><path d="M0 ${height * 0.7} Q ${width * 0.3} ${height * 0.45} ${width * 0.6} ${height * 0.68} T ${width} ${height * 0.6} V ${height} H0Z" fill="${hills}"/><path d="M0 ${height * 0.86} Q ${width * 0.4} ${height * 0.7} ${width * 0.75} ${height * 0.84} T ${width} ${height * 0.8} V ${height} H0Z" fill="${hills}" opacity="0.7"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SLIDES = TITLES.map((title, i) => ({ title, src: scene(i) }));

const imports = [AndesCarousel, AndesCarouselSlide, AndesCarouselLazy];

const PICTURE =
  'display: block; width: 100%; height: 100%; object-fit: cover; user-select: none;';
const FRAME = 'max-width: 40rem; border-radius: 0.5rem; overflow: hidden;';

const meta: Meta<AndesCarousel> = {
  title: 'Carousel',
  component: AndesCarousel,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports })],
  argTypes: {
    effect: { control: 'inline-radio', options: ['scroll', 'fade'] },
    autoplay: { control: 'boolean' },
    autoplaySpeed: { control: 'number' },
    pauseOnHover: { control: 'boolean' },
    pauseOnFocus: { control: 'boolean' },
    stopOnInteraction: { control: 'boolean' },
    dots: { control: 'boolean' },
    dotPosition: {
      control: 'select',
      options: [null, 'top', 'bottom', 'start', 'end'],
    },
    dotProgress: { control: 'boolean' },
    arrows: { control: 'select', options: [false, 'hover', 'always'] },
    infinite: { control: 'boolean' },
    slidesPerView: { control: 'number' },
    gap: { control: 'number' },
    speed: { control: 'number' },
    draggable: { control: 'boolean' },
    keyboard: { control: 'boolean' },
    dotTemplate: { control: false },
    labels: { control: false },
    active: { control: 'number' },
  },
  args: {
    effect: 'scroll',
    autoplay: false,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    pauseOnFocus: true,
    stopOnInteraction: false,
    dots: true,
    dotPosition: null,
    dotProgress: false,
    arrows: 'hover',
    infinite: true,
    slidesPerView: 1,
    gap: 0,
    speed: 400,
    draggable: true,
    keyboard: true,
    active: 0,
  },
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<AndesCarousel>;

export const Default: Story = {
  render: (args) => ({
    props: { ...args, slides: SLIDES, frame: FRAME, picture: PICTURE },
    template: `
      <div [style]="frame">
        <andes-carousel aria-label="Landscapes" [effect]="effect" [autoplay]="autoplay" [autoplaySpeed]="autoplaySpeed" [pauseOnHover]="pauseOnHover" [pauseOnFocus]="pauseOnFocus" [stopOnInteraction]="stopOnInteraction" [dots]="dots" [dotPosition]="dotPosition" [dotProgress]="dotProgress" [arrows]="arrows" [infinite]="infinite" [slidesPerView]="slidesPerView" [gap]="gap" [speed]="speed" [draggable]="draggable" [keyboard]="keyboard" [active]="active">
          @for (slide of slides; track slide.title) {
            <andes-carousel-slide [label]="slide.title"><img [src]="slide.src" [alt]="slide.title" [style]="picture" draggable="false" /></andes-carousel-slide>
          }
        </andes-carousel>
      </div>`,
  }),
};

export const Fade: Story = {
  args: { effect: 'fade' },
  render: Default.render,
};

export const Autoplay: Story = {
  args: {
    autoplay: true,
    autoplaySpeed: 2500,
    arrows: 'hover',
    dotProgress: true,
  },
  render: Default.render,
  parameters: {
    docs: {
      description: {
        story:
          'Hover or focus pauses it, so does a hidden tab. The button in the corner stops and restarts it; the live region stays quiet while it rotates.',
      },
    },
  },
};

export const StopsOnInteraction: Story = {
  args: { autoplay: true, autoplaySpeed: 2000, stopOnInteraction: true },
  render: Default.render,
};

export const ArrowsAlways: Story = {
  args: { arrows: 'always' },
  render: Default.render,
};

export const NoDotsNoArrows: Story = {
  args: { dots: false, arrows: false },
  render: Default.render,
};

export const NotInfinite: Story = {
  args: { infinite: false, arrows: 'always' },
  render: Default.render,
};

export const DotPositions: Story = {
  render: () => ({
    props: {
      slides: SLIDES.slice(0, 4),
      frame: FRAME,
      picture: PICTURE,
      positions: ['top', 'bottom', 'start', 'end'],
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 20rem)); gap: 1.5rem;">
        @for (position of positions; track position) {
          <figure style="margin: 0; font: 12px/20px system-ui;">
            <div [style]="frame">
              <andes-carousel [aria-label]="'Dots at ' + position" [dotPosition]="position">
                @for (slide of slides; track slide.title) {
                  <andes-carousel-slide><img [src]="slide.src" alt="" [style]="picture" draggable="false" /></andes-carousel-slide>
                }
              </andes-carousel>
            </div>
            <figcaption>{{ position }}</figcaption>
          </figure>
        }
      </div>`,
  }),
};

export const SeveralPerView: Story = {
  args: { slidesPerView: 3, gap: 12, arrows: 'always' },
  render: (args) => ({
    props: { ...args, slides: SLIDES, picture: PICTURE },
    template: `
      <div style="max-width: 48rem;">
        <andes-carousel aria-label="Photos" [slidesPerView]="slidesPerView" [gap]="gap" [arrows]="arrows" [infinite]="infinite">
          @for (slide of slides; track slide.title) {
            <andes-carousel-slide [label]="slide.title"><img [src]="slide.src" [alt]="slide.title" [style]="picture + ' aspect-ratio: 4 / 3; border-radius: 0.375rem;'" draggable="false" /></andes-carousel-slide>
          }
        </andes-carousel>
      </div>`,
  }),
};

export const PeekingNext: Story = {
  args: { slidesPerView: 1.25, gap: 12, arrows: 'hover' },
  render: SeveralPerView.render,
};

export const Vertical: Story = {
  render: () => ({
    props: { slides: SLIDES.slice(0, 4), picture: PICTURE },
    template: `
      <div style="width: 24rem; height: 16rem;">
        <andes-carousel aria-label="Vertical landscapes" vertical arrows="hover" style="height: 100%;">
          @for (slide of slides; track slide.title) {
            <andes-carousel-slide [label]="slide.title"><img [src]="slide.src" [alt]="slide.title" [style]="picture" draggable="false" /></andes-carousel-slide>
          }
        </andes-carousel>
      </div>`,
  }),
};

export const CustomDots: Story = {
  render: () => ({
    props: { slides: SLIDES.slice(0, 5), frame: FRAME, picture: PICTURE },
    template: `
      <ng-template #dot let-index="index" let-active="active"><span style="font: 600 12px/20px system-ui; min-width: 1rem;">{{ index + 1 }}</span></ng-template>
      <div [style]="frame">
        <andes-carousel aria-label="Numbered dots" [dotTemplate]="dot">
          @for (slide of slides; track slide.title) {
            <andes-carousel-slide><img [src]="slide.src" alt="" [style]="picture" draggable="false" /></andes-carousel-slide>
          }
        </andes-carousel>
      </div>`,
  }),
};

export const LazySlides: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Only the visible slides and their neighbours are created; the rest build when they come near.',
      },
    },
  },
  render: () => ({
    props: { slides: SLIDES, frame: FRAME, picture: PICTURE },
    template: `
      <div [style]="frame">
        <andes-carousel aria-label="Lazy slides" arrows="hover" [preload]="0">
          @for (slide of slides; track slide.title) {
            <andes-carousel-slide>
              <ng-template andesCarouselLazy><img [src]="slide.src" [alt]="slide.title" [style]="picture" draggable="false" /></ng-template>
            </andes-carousel-slide>
          }
        </andes-carousel>
      </div>`,
  }),
};

@Component({
  selector: 'andes-story-carousel-controlled',
  imports: [AndesCarousel, AndesCarouselSlide],
  template: `
    <div
      style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; align-items: center; font: 14px/22px system-ui;"
    >
      <button type="button" (click)="carousel.prev()">prev()</button>
      <button type="button" (click)="carousel.next()">next()</button>
      <button type="button" (click)="carousel.goTo(3, false)">
        goTo(3, false)
      </button>
      <button type="button" (click)="active.set(0)">active = 0</button>
      <span>active: {{ active() }}, last: {{ log() }}</span>
    </div>
    <div style="max-width: 40rem; border-radius: 0.5rem; overflow: hidden;">
      <andes-carousel
        #carousel
        aria-label="Controlled"
        arrows="hover"
        [(active)]="active"
        (beforeChange)="log.set('before ' + $event.from + ' to ' + $event.to)"
        (afterChange)="log.set('after ' + $event)"
      >
        @for (slide of slides; track slide.title) {
          <andes-carousel-slide
            ><img
              [src]="slide.src"
              [alt]="slide.title"
              style="display: block; width: 100%; height: 100%; object-fit: cover;"
              draggable="false"
          /></andes-carousel-slide>
        }
      </andes-carousel>
    </div>
  `,
})
class ControlledDemo {
  protected readonly slides = SLIDES;
  protected readonly active = signal(1);
  protected readonly log = signal('none');
}

export const Controlled: Story = {
  decorators: [moduleMetadata({ imports: [ControlledDemo] })],
  render: () => ({ template: `<andes-story-carousel-controlled />` }),
};

export const Content: Story = {
  parameters: {
    docs: {
      description: { story: 'Slides hold any content, not just pictures.' },
    },
  },
  render: () => ({
    template: `
      <div style="max-width: 32rem; border: 1px solid var(--andes-color-border); border-radius: 0.5rem; overflow: hidden; font: 14px/22px system-ui;">
        <andes-carousel aria-label="Release notes" arrows="always">
          <andes-carousel-slide label="Reports"><div style="padding: 2.5rem 3.5rem; min-height: 9rem;"><strong style="font-size: 16px; line-height: 24px;">Faster reports</strong><p style="margin: 0.5rem 0 0;">Exports now run in the background and arrive by email.</p><a href="#reports" style="color: var(--andes-color-primary-text);">Read more</a></div></andes-carousel-slide>
          <andes-carousel-slide label="Search"><div style="padding: 2.5rem 3.5rem; min-height: 9rem;"><strong style="font-size: 16px; line-height: 24px;">Better search</strong><p style="margin: 0.5rem 0 0;">Filter by status, owner and date in one box.</p><a href="#search" style="color: var(--andes-color-primary-text);">Read more</a></div></andes-carousel-slide>
          <andes-carousel-slide label="Roles"><div style="padding: 2.5rem 3.5rem; min-height: 9rem;"><strong style="font-size: 16px; line-height: 24px;">Custom roles</strong><p style="margin: 0.5rem 0 0;">Give each team exactly the access it needs.</p><a href="#roles" style="color: var(--andes-color-primary-text);">Read more</a></div></andes-carousel-slide>
        </andes-carousel>
      </div>`,
  }),
};

export const Localised: Story = {
  render: () => ({
    props: {
      slides: SLIDES.slice(0, 3),
      frame: FRAME,
      picture: PICTURE,
      labels: {
        carousel: 'Carrusel',
        slides: 'Diapositivas',
        slide: (n: number, total: number) => `${n} de ${total}`,
        previous: 'Diapositiva anterior',
        next: 'Diapositiva siguiente',
        goTo: (n: number) => `Ir a la diapositiva ${n}`,
        dots: 'Elegir diapositiva',
        pause: 'Pausar',
        play: 'Reproducir',
      },
    },
    template: `
      <div [style]="frame">
        <andes-carousel [labels]="labels" autoplay arrows="always">
          @for (slide of slides; track slide.title) {
            <andes-carousel-slide><img [src]="slide.src" alt="" [style]="picture" draggable="false" /></andes-carousel-slide>
          }
        </andes-carousel>
      </div>`,
  }),
};

@Component({
  selector: 'andes-story-carousel-rtl',
  imports: [AndesCarousel, AndesCarouselSlide],
  template: `
    <div
      dir="rtl"
      style="max-width: 40rem; border-radius: 0.5rem; overflow: hidden;"
    >
      <andes-carousel aria-label="RTL" arrows="always">
        @for (slide of slides; track slide.title) {
          <andes-carousel-slide
            ><img
              [src]="slide.src"
              alt=""
              style="display: block; width: 100%; height: 100%; object-fit: cover;"
              draggable="false"
          /></andes-carousel-slide>
        }
      </andes-carousel>
    </div>
  `,
})
class RtlDemo {
  protected readonly slides = SLIDES.slice(0, 4);
}

export const RightToLeft: Story = {
  decorators: [moduleMetadata({ imports: [RtlDemo] })],
  render: () => ({ template: `<andes-story-carousel-rtl />` }),
};
