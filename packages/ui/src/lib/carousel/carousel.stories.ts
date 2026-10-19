import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesCarousel } from './carousel';
import { AndesCarouselLazy } from './carousel-lazy';
import { AndesCarouselSlide } from './carousel-slide';
import { AndesCarouselThumbs } from './carousel-thumbs';

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

const imports = [
  AndesCarousel,
  AndesCarouselSlide,
  AndesCarouselLazy,
  AndesCarouselThumbs,
];

const PICTURE =
  'display: block; width: 100%; height: 100%; object-fit: cover; user-select: none;';
const FRAME = 'max-width: 40rem; border-radius: 0.5rem; overflow: hidden;';

/** The slides of most stories: one picture each, named after its scene. */
function pictures(style = ''): string {
  return `@for (slide of slides; track slide.title) {
    <andes-carousel-slide [label]="slide.title"><img [src]="slide.src" [alt]="slide.title" [style]="picture + '${style}'" draggable="false" /></andes-carousel-slide>
  }`;
}

const COMMON_PROPS = { slides: SLIDES, frame: FRAME, picture: PICTURE };

const meta: Meta<AndesCarousel> = {
  title: 'Carousel',
  component: AndesCarousel,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports })],
  argTypes: {
    effect: {
      control: 'inline-radio',
      options: ['scroll', 'fade', 'slide-fade'],
    },
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
    autoplay: { control: 'boolean' },
    autoplaySpeed: { control: 'number' },
    pauseOnHover: { control: 'boolean' },
    pauseOnFocus: { control: 'boolean' },
    stopOnInteraction: { control: 'boolean' },
    autoplayControl: { control: 'boolean' },
    dots: { control: 'boolean' },
    dotStyle: { control: 'inline-radio', options: ['dot', 'line', 'pill'] },
    dotSize: { control: 'number' },
    dotPlacement: {
      control: 'select',
      options: [null, 'top', 'bottom', 'start', 'end'],
    },
    dotPosition: { control: 'inline-radio', options: ['inside', 'outside'] },
    dotProgress: { control: 'boolean' },
    arrows: { control: 'select', options: [false, 'hover', 'always'] },
    arrowPlacement: { control: 'inline-radio', options: ['inside', 'outside'] },
    arrowSize: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    hideArrowsOnTouch: { control: 'boolean' },
    infinite: { control: 'boolean' },
    slidesPerView: { control: 'number' },
    slidesToScroll: { control: 'number' },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
    containScroll: { control: 'boolean' },
    gap: { control: 'number' },
    peek: { control: 'number' },
    speed: { control: 'number' },
    easing: {
      control: 'select',
      options: [null, 'out', 'ease', 'ease-in-out', 'linear', 'spring'],
    },
    waitForAnimate: { control: 'boolean' },
    reducedMotion: {
      control: 'inline-radio',
      options: ['system', 'reduce', 'allow'],
    },
    draggable: { control: 'boolean' },
    dragFree: { control: 'boolean' },
    dragThreshold: { control: 'number' },
    skipSnaps: { control: 'boolean' },
    wheel: { control: 'boolean' },
    keyboard: { control: 'boolean' },
    dotTemplate: { control: false },
    arrowTemplate: { control: false },
    labels: { control: false },
    active: { control: 'number' },
  },
  args: {
    effect: 'scroll',
    orientation: 'horizontal',
    autoplay: false,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    pauseOnFocus: true,
    stopOnInteraction: false,
    autoplayControl: true,
    dots: true,
    dotStyle: 'dot',
    dotSize: null,
    dotPlacement: null,
    dotPosition: 'inside',
    dotProgress: false,
    arrows: 'hover',
    arrowPlacement: 'inside',
    arrowSize: 'md',
    hideArrowsOnTouch: false,
    infinite: true,
    slidesPerView: 1,
    slidesToScroll: 1,
    align: 'start',
    containScroll: true,
    gap: 0,
    peek: null,
    speed: null,
    easing: null,
    waitForAnimate: false,
    reducedMotion: 'system',
    draggable: true,
    dragFree: false,
    dragThreshold: 6,
    skipSnaps: false,
    wheel: false,
    keyboard: true,
    active: 0,
  },
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<AndesCarousel>;

export const Default: Story = {
  render: (args) => ({
    props: { ...args, ...COMMON_PROPS },
    template: `
      <div [style]="frame">
        <andes-carousel aria-label="Landscapes" [effect]="effect" [orientation]="orientation" [autoplay]="autoplay" [autoplaySpeed]="autoplaySpeed" [pauseOnHover]="pauseOnHover" [pauseOnFocus]="pauseOnFocus" [stopOnInteraction]="stopOnInteraction" [autoplayControl]="autoplayControl" [dots]="dots" [dotStyle]="dotStyle" [dotSize]="dotSize" [dotPlacement]="dotPlacement" [dotPosition]="dotPosition" [dotProgress]="dotProgress" [arrows]="arrows" [arrowPlacement]="arrowPlacement" [arrowSize]="arrowSize" [hideArrowsOnTouch]="hideArrowsOnTouch" [infinite]="infinite" [slidesPerView]="slidesPerView" [slidesToScroll]="slidesToScroll" [align]="align" [containScroll]="containScroll" [gap]="gap" [peek]="peek" [speed]="speed" [easing]="easing" [waitForAnimate]="waitForAnimate" [reducedMotion]="reducedMotion" [draggable]="draggable" [dragFree]="dragFree" [dragThreshold]="dragThreshold" [skipSnaps]="skipSnaps" [wheel]="wheel" [keyboard]="keyboard" [active]="active" [style.height]="orientation === 'vertical' ? '16rem' : null">
          ${pictures()}
        </andes-carousel>
      </div>`,
  }),
};

// --- Autoplay -----------------------------------------------------------------------------

const AUTOPLAY_DOC =
  'Hover, keyboard focus, a drag, a hidden tab and scrolling out of view each hold it, and each lets go on its own: the delay then starts over from the full length. A press with the pointer does not count as focus. The button in the corner stops and restarts it for good; the live region stays quiet while it rotates.';

export const Autoplay: Story = {
  args: { autoplay: true, autoplaySpeed: 2500, dotProgress: true },
  render: Default.render,
  parameters: { docs: { description: { story: AUTOPLAY_DOC } } },
};

@Component({
  selector: 'andes-story-carousel-autoplay-state',
  imports: [AndesCarousel, AndesCarouselSlide],
  template: `
    <p style="margin: 0 0 0.5rem; font: 14px/22px system-ui;">
      State:
      <strong data-testid="state">{{ carousel.autoplayState() }}</strong> ·
      playing:
      <strong data-testid="playing">{{ carousel.isPlaying() }}</strong> · stop:
      <strong data-testid="stop">{{ carousel.selectedIndex() + 1 }}</strong>
    </p>
    <div style="max-width: 40rem; border-radius: 0.5rem; overflow: hidden;">
      <andes-carousel
        #carousel
        aria-label="Autoplay states"
        [autoplay]="{ speed: 2000, pauseOnHover: true, pauseOnFocus: true }"
        dotProgress
        dotStyle="pill"
        arrows="hover"
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
class AutoplayStateDemo {
  protected readonly slides = SLIDES.slice(0, 4);
}

export const AutoplayStates: Story = {
  decorators: [moduleMetadata({ imports: [AutoplayStateDemo] })],
  parameters: {
    docs: {
      description: {
        story:
          'The readout shows which state autoplay is in: running, or paused by hover, focus, a drag, the user, a hidden tab, scrolling out of view; or off for reduced motion. Move the pointer in and out, press Tab, drag, scroll the page.',
      },
    },
  },
  render: () => ({ template: `<andes-story-carousel-autoplay-state />` }),
};

export const AutoplayBackwards: Story = {
  render: () => ({
    props: COMMON_PROPS,
    template: `
      <div [style]="frame">
        <andes-carousel aria-label="Backwards" [autoplay]="{ speed: 2000, direction: 'backward', pauseOnHover: false }" arrows="hover">
          ${pictures()}
        </andes-carousel>
      </div>`,
  }),
};

export const StopsOnInteraction: Story = {
  args: { autoplay: true, autoplaySpeed: 2000, stopOnInteraction: true },
  render: Default.render,
  parameters: {
    docs: {
      description: {
        story:
          'The first drag, arrow, dot or key stops autoplay until the play button is pressed.',
      },
    },
  },
};

export const AutoplayWithoutButton: Story = {
  args: { autoplay: true, autoplayControl: false },
  render: Default.render,
  parameters: {
    docs: {
      description: {
        story:
          'Only for short, non-essential motion: a slide show that runs for more than a few seconds needs the button.',
      },
    },
  },
};

// --- Dots ---------------------------------------------------------------------------------

export const DotStyles: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`dotStyle` is a circle (`dot`), a flat bar (`line`) or a short bar whose active one is longer (`pill`). `dotSize` sets the thickness.',
      },
    },
  },
  render: () => ({
    props: { ...COMMON_PROPS, styles: ['dot', 'line', 'pill'] },
    template: `
      <div style="display: grid; gap: 1.5rem; max-width: 40rem;">
        @for (style of styles; track style) {
          <figure style="margin: 0; font: 12px/20px system-ui;">
            <div [style]="frame">
              <andes-carousel [aria-label]="style + ' dots'" [dotStyle]="style" autoplay dotProgress [active]="1">
                ${pictures()}
              </andes-carousel>
            </div>
            <figcaption>{{ style }}</figcaption>
          </figure>
        }
      </div>`,
  }),
};

export const DotPlacements: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The dots sit on any edge; `start` and `end` are vertical rails on the inline edges and swap sides in right-to-left layouts.',
      },
    },
  },
  render: () => ({
    props: {
      slides: SLIDES.slice(0, 4),
      frame: FRAME,
      picture: PICTURE,
      placements: ['top', 'bottom', 'start', 'end'],
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 20rem)); gap: 1.5rem;">
        @for (placement of placements; track placement) {
          <figure style="margin: 0; font: 12px/20px system-ui;">
            <div [style]="frame">
              <andes-carousel [aria-label]="'Dots at ' + placement" dotStyle="pill" [dotPlacement]="placement" [active]="1">
                ${pictures()}
              </andes-carousel>
            </div>
            <figcaption>{{ placement }}</figcaption>
          </figure>
        }
      </div>`,
  }),
};

export const DotsOutside: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`dotPosition="outside"` gives the dots their own space beside the slides, in the page colours.',
      },
    },
  },
  render: () => ({
    props: {
      slides: SLIDES.slice(0, 4),
      frame: FRAME,
      picture: PICTURE,
      placements: ['bottom', 'top', 'start', 'end'],
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 22rem)); gap: 1.5rem;">
        @for (placement of placements; track placement) {
          <figure style="margin: 0; font: 12px/20px system-ui;">
            <andes-carousel [aria-label]="'Outside dots at ' + placement" dotStyle="pill" dotPosition="outside" [dotPlacement]="placement" [active]="1">
              ${pictures('border-radius: 0.5rem;')}
            </andes-carousel>
            <figcaption>{{ placement }}</figcaption>
          </figure>
        }
      </div>`,
  }),
};

export const DotColours: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Colours come from `--andes-carousel-dot-color`, `-dot-active-color`, `-dot-hover-color`, `-dot-size`, `-dot-length`, `-dot-active-length` and `-dot-background`. Set them on the carousel, an ancestor or through `dots.className`.',
      },
    },
  },
  render: () => ({
    props: COMMON_PROPS,
    template: `
      <style>
        .story-dots-dark { --andes-carousel-dot-color: rgb(15 23 42 / 30%); --andes-carousel-dot-active-color: rgb(15 23 42); }
        .story-dots-brand { --andes-carousel-dot-color: rgb(255 255 255 / 45%); --andes-carousel-dot-active-color: #f59e0b; --andes-carousel-dot-background: rgb(15 23 42 / 55%); }
      </style>
      <div style="display: grid; gap: 1.5rem; max-width: 40rem;">
        <div [style]="frame">
          <andes-carousel aria-label="Dark dots" dotStyle="pill" [dots]="{ className: 'story-dots-dark' }" [active]="1">${pictures()}</andes-carousel>
        </div>
        <div [style]="frame">
          <andes-carousel aria-label="Light dots" dotStyle="line" [active]="2">${pictures()}</andes-carousel>
        </div>
        <div [style]="frame">
          <andes-carousel aria-label="Branded dots" dotStyle="dot" [dots]="{ className: 'story-dots-brand' }" [dotSize]="8">${pictures()}</andes-carousel>
        </div>
      </div>`,
  }),
};

export const DotProgress: Story = {
  args: {
    autoplay: true,
    autoplaySpeed: 3000,
    dotProgress: true,
    dotStyle: 'pill',
  },
  render: Default.render,
  parameters: {
    docs: {
      description: {
        story:
          'The active dot fills over the autoplay delay, so it shows when the next change comes. It restarts whenever the delay does.',
      },
    },
  },
};

export const CustomDots: Story = {
  render: () => ({
    props: { slides: SLIDES.slice(0, 5), frame: FRAME, picture: PICTURE },
    template: `
      <ng-template #dot let-index="index" let-active="active"><span style="font: 600 12px/20px system-ui; min-width: 1rem;">{{ index + 1 }}</span></ng-template>
      <div [style]="frame">
        <andes-carousel aria-label="Numbered dots" [dotTemplate]="dot">
          ${pictures()}
        </andes-carousel>
      </div>`,
  }),
};

export const NoDotsNoArrows: Story = {
  args: { dots: false, arrows: false },
  render: Default.render,
};

// --- Orientation --------------------------------------------------------------------------

export const Vertical: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A vertical carousel needs a height: give the host one (here `height: 16rem`) or set `slideHeight`. Up and Down move it, a drag follows the vertical axis, the arrows go to the top and bottom and the dots to the end rail.',
      },
    },
  },
  render: () => ({
    props: { slides: SLIDES.slice(0, 4), picture: PICTURE },
    template: `
      <div style="width: 24rem; height: 16rem;">
        <andes-carousel aria-label="Vertical landscapes" orientation="vertical" arrows="hover" style="height: 100%;">
          ${pictures()}
        </andes-carousel>
      </div>`,
  }),
};

export const VerticalAutoplay: Story = {
  render: () => ({
    props: { slides: SLIDES.slice(0, 5), picture: PICTURE },
    template: `
      <div style="width: 24rem; height: 16rem;">
        <andes-carousel aria-label="Vertical autoplay" vertical autoplay [autoplaySpeed]="2500" dotStyle="pill" dotProgress arrows="hover" style="height: 100%;">
          ${pictures()}
        </andes-carousel>
      </div>`,
  }),
};

export const VerticalSeveralPerView: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`slideHeight` sizes the carousel from its slides: three at 5rem, with a gap and wheel scrolling.',
      },
    },
  },
  render: () => ({
    props: { slides: SLIDES, picture: PICTURE },
    template: `
      <div style="width: 22rem;">
        <andes-carousel aria-label="News" orientation="vertical" [slidesPerView]="3" [gap]="8" slideHeight="5rem" wheel dotPosition="outside" arrows="hover">
          ${pictures('border-radius: 0.375rem;')}
        </andes-carousel>
      </div>`,
  }),
};

// --- Drag ---------------------------------------------------------------------------------

export const DragAndSwipe: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Drag with a mouse, finger or pen. A drag follows the pointer, resists at the ends of a carousel that does not loop, snaps to the nearest stop and never clicks what it was released over. The cursor is a grab hand; the page still scrolls on the other axis on touch screens.',
      },
    },
  },
  args: { infinite: false, arrows: 'always' },
  render: Default.render,
};

export const DragFree: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`dragFree` lets a drag coast to rest anywhere, without snapping. `--andes-carousel-release-duration` sets the length of the coast.',
      },
    },
  },
  args: {
    dragFree: true,
    slidesPerView: 2.5,
    gap: 12,
    infinite: false,
    dots: false,
  },
  render: (args) => ({
    props: { ...args, ...COMMON_PROPS },
    template: `
      <div style="max-width: 48rem;">
        <andes-carousel aria-label="Free drag" [dragFree]="dragFree" [slidesPerView]="slidesPerView" [gap]="gap" [infinite]="infinite" [dots]="dots">
          ${pictures('aspect-ratio: 4 / 3; border-radius: 0.375rem;')}
        </andes-carousel>
      </div>`,
  }),
};

export const NotDraggable: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'With `draggable` off the cursor is a plain pointer and text can be selected; arrows, dots and keys still work.',
      },
    },
  },
  render: () => ({
    template: `
      <div style="max-width: 32rem; border: 1px solid var(--andes-color-border); border-radius: 0.5rem; overflow: hidden; font: 14px/22px system-ui;">
        <andes-carousel aria-label="Selectable text" [draggable]="false" arrows="always">
          <andes-carousel-slide label="Terms"><div style="padding: 2.5rem 3.5rem; min-height: 8rem;"><strong>Select this text</strong><p style="margin: 0.5rem 0 0;">Payment is due within thirty days of the invoice date.</p></div></andes-carousel-slide>
          <andes-carousel-slide label="Delivery"><div style="padding: 2.5rem 3.5rem; min-height: 8rem;"><strong>Delivery</strong><p style="margin: 0.5rem 0 0;">Orders ship within two working days.</p></div></andes-carousel-slide>
          <andes-carousel-slide label="Returns"><div style="padding: 2.5rem 3.5rem; min-height: 8rem;"><strong>Returns</strong><p style="margin: 0.5rem 0 0;">Unused items can be returned for thirty days.</p></div></andes-carousel-slide>
        </andes-carousel>
      </div>`,
  }),
};

export const WheelAndKeys: Story = {
  args: { wheel: true, infinite: false, arrows: 'always' },
  render: Default.render,
  parameters: {
    docs: {
      description: {
        story:
          'A horizontal wheel or trackpad swipe moves one stop at a time, and lets the page scroll once the end is reached. Arrow keys, Home and End work while focus is inside.',
      },
    },
  },
};

// --- Animation ----------------------------------------------------------------------------

export const Fade: Story = {
  args: { effect: 'fade' },
  render: Default.render,
};

export const SlideFade: Story = {
  args: { effect: 'slide-fade', speed: 600 },
  render: Default.render,
  parameters: {
    docs: {
      description: {
        story:
          'Slides move as usual and fade out as they leave, following a drag.',
      },
    },
  },
};

export const SpeedAndEasing: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`speed` (ms) and `easing` (a preset or any CSS easing) set the transition; `--andes-carousel-duration` and `--andes-carousel-easing` do the same from CSS. `waitForAnimate` ignores arrows, dots and keys while a change is still moving.',
      },
    },
  },
  render: () => ({
    props: {
      ...COMMON_PROPS,
      curves: [
        { easing: 'out', speed: 400 },
        { easing: 'ease-in-out', speed: 700 },
        { easing: 'linear', speed: 700 },
        { easing: 'spring', speed: 700 },
      ],
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 20rem)); gap: 1.5rem;">
        @for (curve of curves; track curve.easing) {
          <figure style="margin: 0; font: 12px/20px system-ui;">
            <div [style]="frame">
              <andes-carousel [aria-label]="curve.easing" [easing]="curve.easing" [speed]="curve.speed" waitForAnimate arrows="always" [dots]="false">
                ${pictures()}
              </andes-carousel>
            </div>
            <figcaption>{{ curve.easing }}, {{ curve.speed }}ms</figcaption>
          </figure>
        }
      </div>`,
  }),
};

export const CssTransition: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The whole transition can be set from CSS with `--andes-carousel-duration` and `--andes-carousel-easing`, with no input at all.',
      },
    },
  },
  render: () => ({
    props: COMMON_PROPS,
    template: `
      <style>.story-slow { --andes-carousel-duration: 1200ms; --andes-carousel-easing: cubic-bezier(0.7, 0, 0.3, 1); }</style>
      <div [style]="frame">
        <andes-carousel class="story-slow" aria-label="Slow" arrows="always">
          ${pictures()}
        </andes-carousel>
      </div>`,
  }),
};

export const ReducedMotion: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'With `prefers-reduced-motion: reduce` slides change instantly and autoplay does not start (and the play button is not shown). `reducedMotion="reduce"` forces that; `"allow"` keeps the motion whatever the preference. This one forces it.',
      },
    },
  },
  render: () => ({
    props: COMMON_PROPS,
    template: `
      <div [style]="frame">
        <andes-carousel aria-label="Reduced motion" autoplay reducedMotion="reduce" arrows="always">
          ${pictures()}
        </andes-carousel>
      </div>`,
  }),
};

// --- Layout -------------------------------------------------------------------------------

export const NotInfinite: Story = {
  args: { infinite: false, arrows: 'always' },
  render: Default.render,
};

export const SeveralPerView: Story = {
  args: { slidesPerView: 3, gap: 12, arrows: 'always' },
  render: (args) => ({
    props: { ...args, ...COMMON_PROPS },
    template: `
      <div style="max-width: 48rem;">
        <andes-carousel aria-label="Photos" [slidesPerView]="slidesPerView" [gap]="gap" [arrows]="arrows" [infinite]="infinite">
          ${pictures('aspect-ratio: 4 / 3; border-radius: 0.375rem;')}
        </andes-carousel>
      </div>`,
  }),
};

export const ResponsivePerView: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`slidesPerView` takes a map of the carousel's own minimum width to a count. Drag the corner of the frame to resize it.",
      },
    },
  },
  render: () => ({
    props: { ...COMMON_PROPS, breakpoints: { 0: 1, 360: 2, 560: 3 } },
    template: `
      <div style="max-width: 100%; width: 40rem; min-width: 12rem; resize: horizontal; overflow: auto; padding-bottom: 0.5rem; border: 1px dashed var(--andes-color-border);">
        <andes-carousel aria-label="Responsive" [slidesPerView]="breakpoints" [gap]="12" arrows="hover" dotPosition="outside">
          ${pictures('aspect-ratio: 4 / 3; border-radius: 0.375rem;')}
        </andes-carousel>
      </div>`,
  }),
};

export const SlidesToScroll: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`slidesToScroll` moves by pages: three slides per view, three per step, so the dots become pages.',
      },
    },
  },
  render: () => ({
    props: COMMON_PROPS,
    template: `
      <div style="max-width: 48rem;">
        <andes-carousel aria-label="Pages" [slidesPerView]="3" [slidesToScroll]="3" [gap]="12" arrows="always" [infinite]="false" dotPosition="outside">
          ${pictures('aspect-ratio: 4 / 3; border-radius: 0.375rem;')}
        </andes-carousel>
      </div>`,
  }),
};

export const PeekingNext: Story = {
  args: { slidesPerView: 1.25, gap: 12, arrows: 'hover' },
  render: SeveralPerView.render,
};

export const CenteredWithPeek: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`align="center"` lines the selected slide up with the middle of the view; `peek` shows a sliver of each neighbour.',
      },
    },
  },
  render: () => ({
    props: COMMON_PROPS,
    template: `
      <div style="max-width: 44rem;">
        <andes-carousel aria-label="Centered" align="center" [slidesPerView]="1" [peek]="56" [gap]="12" arrows="hover" dotPosition="outside" dotStyle="pill">
          ${pictures('border-radius: 0.5rem;')}
        </andes-carousel>
      </div>`,
  }),
};

export const CenteredSeveral: Story = {
  render: () => ({
    props: COMMON_PROPS,
    template: `
      <div style="max-width: 48rem;">
        <andes-carousel aria-label="Centered several" align="center" [slidesPerView]="3" [gap]="12" [containScroll]="false" [infinite]="false" arrows="always" dotPosition="outside">
          ${pictures('aspect-ratio: 4 / 3; border-radius: 0.375rem;')}
        </andes-carousel>
      </div>`,
  }),
};

export const AspectRatio: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`aspectRatio` fixes the shape of the viewport; slides stretch to fill it.',
      },
    },
  },
  render: () => ({
    props: COMMON_PROPS,
    template: `
      <div [style]="frame">
        <andes-carousel aria-label="Square" [aspectRatio]="'1 / 1'" arrows="hover">
          ${pictures()}
        </andes-carousel>
      </div>`,
  }),
};

export const AdaptiveHeight: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`adaptiveHeight` lets the viewport follow the height of the slides in view, animating between them.',
      },
    },
  },
  render: () => ({
    template: `
      <div style="max-width: 32rem; border: 1px solid var(--andes-color-border); border-radius: 0.5rem; overflow: hidden; font: 14px/22px system-ui;">
        <andes-carousel aria-label="Notes" adaptiveHeight arrows="always" dotPosition="outside">
          <andes-carousel-slide label="Short"><div style="padding: 1rem 3.5rem;">One short line.</div></andes-carousel-slide>
          <andes-carousel-slide label="Medium"><div style="padding: 1rem 3.5rem;"><p style="margin: 0;">A note that runs to a few lines, so the carousel has to grow to hold it and shrink again for the next one.</p><p style="margin: 0.5rem 0 0;">Second paragraph.</p></div></andes-carousel-slide>
          <andes-carousel-slide label="Tall"><div style="padding: 1rem 3.5rem;"><p style="margin: 0;">The tallest note.</p><ul style="margin: 0.5rem 0 0;"><li>First</li><li>Second</li><li>Third</li><li>Fourth</li><li>Fifth</li></ul></div></andes-carousel-slide>
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
    props: COMMON_PROPS,
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

// --- Controls -----------------------------------------------------------------------------

export const ArrowsAlways: Story = {
  args: { arrows: 'always' },
  render: Default.render,
};

export const ArrowsOutside: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`arrowPlacement="outside"` puts the arrows beside the slides; `arrowSize` is 24, 32 or 40 px. At the ends of a carousel that does not loop an arrow is disabled.',
      },
    },
  },
  render: () => ({
    props: { ...COMMON_PROPS, sizes: ['sm', 'md', 'lg'] },
    template: `
      <div style="display: grid; gap: 1.5rem; max-width: 40rem;">
        @for (size of sizes; track size) {
          <andes-carousel [aria-label]="'Outside arrows ' + size" arrows="always" arrowPlacement="outside" [arrowSize]="size" [infinite]="false" dotPosition="outside">
            ${pictures('border-radius: 0.5rem;')}
          </andes-carousel>
        }
      </div>`,
  }),
};

export const CustomArrows: Story = {
  render: () => ({
    props: COMMON_PROPS,
    template: `
      <ng-template #arrow let-direction="direction" let-disabled="disabled"><span style="font: 600 16px/1 system-ui;" [style.opacity]="disabled ? 0.4 : 1">{{ direction === 'prev' ? '‹' : '›' }}</span></ng-template>
      <div [style]="frame">
        <andes-carousel aria-label="Custom arrows" arrows="always" [arrowTemplate]="arrow" [hideArrowsOnTouch]="true">
          ${pictures()}
        </andes-carousel>
      </div>`,
  }),
};

@Component({
  selector: 'andes-story-carousel-gallery',
  imports: [AndesCarousel, AndesCarouselSlide, AndesCarouselThumbs],
  template: `
    <div style="max-width: 40rem;">
      <andes-carousel
        #main
        aria-label="Gallery"
        arrows="hover"
        [dots]="false"
        [infinite]="false"
        style="border-radius: 0.5rem; overflow: hidden;"
      >
        @for (slide of slides; track slide.title) {
          <andes-carousel-slide [label]="slide.title"
            ><img
              [src]="slide.src"
              [alt]="slide.title"
              style="display: block; width: 100%; height: 100%; object-fit: cover;"
              draggable="false"
          /></andes-carousel-slide>
        }
      </andes-carousel>
      <andes-carousel-thumbs
        style="margin-top: 0.5rem;"
        [carousel]="main"
        [items]="thumbs"
      />
    </div>
  `,
})
class GalleryDemo {
  protected readonly slides = SLIDES;
  protected readonly thumbs = SLIDES.map((s) => s.src);
}

export const Thumbnails: Story = {
  decorators: [moduleMetadata({ imports: [GalleryDemo] })],
  parameters: {
    docs: {
      description: {
        story:
          '`andes-carousel-thumbs` keeps a strip of thumbnails in step with a carousel: the current one is marked and scrolled into view, and pressing one goes to that slide.',
      },
    },
  },
  render: () => ({ template: `<andes-story-carousel-gallery />` }),
};

@Component({
  selector: 'andes-story-carousel-controlled',
  imports: [AndesCarousel, AndesCarouselSlide],
  template: `
    <div
      style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; align-items: center; font: 14px/22px system-ui;"
    >
      <button type="button" (click)="carousel.prev()">prev()</button>
      <button type="button" (click)="carousel.next()">next()</button>
      <button type="button" (click)="carousel.goTo(3, false)">
        goTo(3, false)
      </button>
      <button type="button" (click)="carousel.play()">play()</button>
      <button type="button" (click)="carousel.pause()">pause()</button>
      <button type="button" (click)="active.set(0)">active = 0</button>
    </div>
    <p style="margin: 0 0 0.75rem; font: 12px/20px system-ui;">
      active: {{ active() }} · selectedIndex: {{ carousel.selectedIndex() }} ·
      slideCount: {{ carousel.slideCount() }} · canScrollPrev:
      {{ carousel.canScrollPrev() }} · canScrollNext:
      {{ carousel.canScrollNext() }} · isPlaying: {{ carousel.isPlaying() }}
      <br />
      events: {{ log() }}
    </p>
    <div style="max-width: 40rem; border-radius: 0.5rem; overflow: hidden;">
      <andes-carousel
        #carousel
        aria-label="Controlled"
        arrows="hover"
        autoplay
        [autoplaySpeed]="4000"
        [infinite]="false"
        [(active)]="active"
        (slideChange)="push('slideChange ' + $event.from + '>' + $event.to)"
        (slideChanged)="push('slideChanged ' + $event)"
        (settled)="push('settled ' + $event)"
        (dragStarted)="push('dragStarted ' + $event)"
        (dragEnded)="push('dragEnded ' + $event.from + '>' + $event.to)"
        (ready)="push('ready')"
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
  private readonly recent: string[] = [];

  protected push(entry: string): void {
    this.recent.unshift(entry);
    this.recent.length = Math.min(this.recent.length, 3);
    this.log.set(this.recent.join(' | '));
  }
}

export const Controlled: Story = {
  decorators: [moduleMetadata({ imports: [ControlledDemo] })],
  parameters: {
    docs: {
      description: {
        story:
          'The two-way `active` model, the methods `next()`, `prev()`, `goTo()`, `play()` and `pause()`, the signals `selectedIndex`, `slideCount`, `canScrollPrev`, `canScrollNext` and `isPlaying`, and the outputs `slideChange`, `slideChanged`, `settled`, `dragStarted`, `dragEnded` and `ready`.',
      },
    },
  },
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
          ${pictures()}
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
      <andes-carousel
        aria-label="RTL"
        arrows="always"
        dotStyle="pill"
        dotPlacement="end"
      >
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
