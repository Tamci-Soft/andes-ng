import { readFileSync } from 'node:fs';

import { Directionality } from '@angular/cdk/bidi';
import { Component, signal, type TemplateRef, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AndesCarousel } from './carousel';
import { resolveAutoplayState } from './carousel-autoplay';
import { AndesCarouselLazy } from './carousel-lazy';
import { AndesCarouselSlide } from './carousel-slide';
import type { AndesCarouselAutoplayOptions } from './carousel-autoplay';
import type {
  AndesCarouselAlign,
  AndesCarouselArrowContext,
  AndesCarouselArrowPlacement,
  AndesCarouselArrows,
  AndesCarouselArrowSize,
  AndesCarouselChange,
  AndesCarouselDotContext,
  AndesCarouselDotPlacement,
  AndesCarouselDotPosition,
  AndesCarouselDotsOptions,
  AndesCarouselDotStyle,
  AndesCarouselEasing,
  AndesCarouselEffect,
  AndesCarouselLabels,
  AndesCarouselOrientation,
  AndesCarouselReducedMotion,
  AndesCarouselSlidesPerView,
} from './carousel-types';

@Component({
  imports: [AndesCarousel, AndesCarouselSlide, AndesCarouselLazy],
  template: `
    <button type="button" id="outside">Outside</button>
    <ng-template #dot let-index="index" let-active="active">
      <i class="custom-dot">{{ index }}{{ active ? '*' : '' }}</i>
    </ng-template>
    <ng-template #arrow let-direction="direction" let-disabled="disabled">
      <i class="custom-arrow">{{ direction }}{{ disabled ? '!' : '' }}</i>
    </ng-template>
    <andes-carousel
      [aria-label]="ariaLabel()"
      [effect]="effect()"
      [orientation]="orientation()"
      [autoplay]="autoplay()"
      [autoplaySpeed]="autoplaySpeed()"
      [pauseOnHover]="pauseOnHover()"
      [pauseOnFocus]="pauseOnFocus()"
      [stopOnInteraction]="stopOnInteraction()"
      [autoplayControl]="autoplayControl()"
      [dots]="dots()"
      [dotStyle]="dotStyle()"
      [dotSize]="dotSize()"
      [dotPlacement]="dotPlacement()"
      [dotPosition]="dotPosition()"
      [dotProgress]="dotProgress()"
      [dotTemplate]="useDotTemplate() ? dotTemplate() : null"
      [arrows]="arrows()"
      [arrowPlacement]="arrowPlacement()"
      [arrowSize]="arrowSize()"
      [arrowTemplate]="useArrowTemplate() ? arrowTemplate() : null"
      [hideArrowsOnTouch]="hideArrowsOnTouch()"
      [infinite]="infinite()"
      [vertical]="vertical()"
      [slidesPerView]="slidesPerView()"
      [slidesToScroll]="slidesToScroll()"
      [align]="align()"
      [containScroll]="containScroll()"
      [gap]="gap()"
      [peek]="peek()"
      [aspectRatio]="aspectRatio()"
      [slideHeight]="slideHeight()"
      [adaptiveHeight]="adaptiveHeight()"
      [startIndex]="startIndex()"
      [speed]="speed()"
      [easing]="easing()"
      [waitForAnimate]="waitForAnimate()"
      [reducedMotion]="reducedMotion()"
      [draggable]="draggable()"
      [dragFree]="dragFree()"
      [dragThreshold]="dragThreshold()"
      [skipSnaps]="skipSnaps()"
      [wheel]="wheel()"
      [keyboard]="keyboard()"
      [preload]="preload()"
      [labels]="labels()"
      [(active)]="active"
      (slideChange)="before.push($event)"
      (slideChanged)="after.push($event)"
      (settled)="settled.push($event)"
      (dragStarted)="dragStarts.push($event)"
      (dragEnded)="dragEnds.push($event)"
      (ready)="readyCount = readyCount + 1"
    >
      @for (n of items(); track n) {
        <andes-carousel-slide [label]="n === 1 ? 'First' : null">
          @if (lazy()) {
            <ng-template andesCarouselLazy
              ><b class="lazy-content" [attr.data-n]="n"
                >Lazy {{ n }}</b
              ></ng-template
            >
          } @else {
            <button type="button" class="in-slide" [attr.data-n]="n">
              Slide {{ n }}
            </button>
          }
        </andes-carousel-slide>
      }
    </andes-carousel>
  `,
})
class Host {
  readonly carousel = viewChild.required(AndesCarousel);
  readonly dotTemplate =
    viewChild.required<TemplateRef<AndesCarouselDotContext>>('dot');
  readonly arrowTemplate =
    viewChild.required<TemplateRef<AndesCarouselArrowContext>>('arrow');
  readonly items = signal([1, 2, 3, 4]);
  readonly ariaLabel = signal<string | null>('Featured');
  readonly effect = signal<AndesCarouselEffect>('scroll');
  readonly orientation = signal<AndesCarouselOrientation>('horizontal');
  readonly autoplay = signal<boolean | AndesCarouselAutoplayOptions>(false);
  readonly autoplaySpeed = signal(3000);
  readonly pauseOnHover = signal(true);
  readonly pauseOnFocus = signal(true);
  readonly stopOnInteraction = signal(false);
  readonly autoplayControl = signal(true);
  readonly dots = signal<boolean | AndesCarouselDotsOptions>(true);
  readonly dotStyle = signal<AndesCarouselDotStyle>('dot');
  readonly dotSize = signal<number | null>(null);
  readonly dotPlacement = signal<AndesCarouselDotPlacement | null>(null);
  readonly dotPosition = signal<AndesCarouselDotPosition>('inside');
  readonly dotProgress = signal(false);
  readonly useDotTemplate = signal(false);
  readonly arrows = signal<AndesCarouselArrows>(false);
  readonly arrowPlacement = signal<AndesCarouselArrowPlacement>('inside');
  readonly arrowSize = signal<AndesCarouselArrowSize>('md');
  readonly useArrowTemplate = signal(false);
  readonly hideArrowsOnTouch = signal(false);
  readonly infinite = signal(true);
  readonly vertical = signal(false);
  readonly slidesPerView = signal<AndesCarouselSlidesPerView>(1);
  readonly slidesToScroll = signal<number | 'auto'>(1);
  readonly align = signal<AndesCarouselAlign>('start');
  readonly containScroll = signal(true);
  readonly gap = signal<number | string>(0);
  readonly peek = signal<number | string | null>(null);
  readonly aspectRatio = signal<number | string | null>(null);
  readonly slideHeight = signal<number | string | null>(null);
  readonly adaptiveHeight = signal(false);
  readonly startIndex = signal(0);
  readonly speed = signal<number | null>(null);
  readonly easing = signal<AndesCarouselEasing | null>(null);
  readonly waitForAnimate = signal(false);
  readonly reducedMotion = signal<AndesCarouselReducedMotion>('system');
  readonly draggable = signal(true);
  readonly dragFree = signal(false);
  readonly dragThreshold = signal(6);
  readonly skipSnaps = signal(false);
  readonly wheel = signal(false);
  readonly keyboard = signal(true);
  readonly preload = signal(1);
  readonly labels = signal<AndesCarouselLabels | null>(null);
  readonly lazy = signal(false);
  readonly active = signal(0);
  readonly before: AndesCarouselChange[] = [];
  readonly after: number[] = [];
  readonly settled: number[] = [];
  readonly dragStarts: number[] = [];
  readonly dragEnds: AndesCarouselChange[] = [];
  readyCount = 0;
}

function setup(configure?: (host: Host) => void) {
  const fixture = TestBed.createComponent(Host);
  configure?.(fixture.componentInstance);
  fixture.detectChanges();
  return fixture;
}

const root = (f: ComponentFixture<Host>) =>
  f.nativeElement.querySelector('andes-carousel') as HTMLElement;
const slides = (f: ComponentFixture<Host>) =>
  Array.from(
    f.nativeElement.querySelectorAll('andes-carousel-slide'),
  ) as HTMLElement[];
const dots = (f: ComponentFixture<Host>) =>
  Array.from(
    f.nativeElement.querySelectorAll('[data-slot="carousel-dot"]'),
  ) as HTMLButtonElement[];
const viewport = (f: ComponentFixture<Host>) =>
  f.nativeElement.querySelector(
    '[data-slot="carousel-viewport"]',
  ) as HTMLElement;
const button = (f: ComponentFixture<Host>, slot: string) =>
  f.nativeElement.querySelector(
    `[data-slot="${slot}"]`,
  ) as HTMLButtonElement | null;
const cssVar = (f: ComponentFixture<Host>, name: string) =>
  root(f).style.getPropertyValue(name);
const activeStates = (f: ComponentFixture<Host>) =>
  slides(f)
    .map((s) => (s.dataset['state'] === 'active' ? 1 : 0))
    .join('');

function keydown(target: Element, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

function pointer(
  target: Element,
  type: string,
  x: number,
  y: number,
  time: number,
  id = 1,
  pointerType = 'mouse',
) {
  const event = new PointerEvent(type, {
    pointerId: id,
    pointerType,
    button: 0,
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'timeStamp', { value: time });
  target.dispatchEvent(event);
}

describe('AndesCarousel', () => {
  describe('semantics', () => {
    it('is a labelled carousel region', () => {
      const f = setup();
      expect(root(f).getAttribute('role')).toBe('region');
      expect(root(f).getAttribute('aria-roledescription')).toBe('carousel');
      expect(root(f).getAttribute('aria-label')).toBe('Featured');
    });

    it('falls back to a default name', () => {
      const f = setup((h) => h.ariaLabel.set(null));
      expect(root(f).getAttribute('aria-label')).toBe('Carousel');
    });

    it('announces each slide as "n of m", with its own label appended', () => {
      const f = setup();
      expect(slides(f).map((s) => s.getAttribute('role'))).toEqual(
        Array(4).fill('group'),
      );
      expect(slides(f)[0].getAttribute('aria-roledescription')).toBe('slide');
      expect(slides(f).map((s) => s.getAttribute('aria-label'))).toEqual([
        '1 of 4: First',
        '2 of 4',
        '3 of 4',
        '4 of 4',
      ]);
    });

    it('makes slides out of view inert and hidden, so their content is not tabbable', () => {
      const f = setup();
      expect(slides(f).map((s) => s.hasAttribute('inert'))).toEqual([
        false,
        true,
        true,
        true,
      ]);
      expect(slides(f)[1].getAttribute('aria-hidden')).toBe('true');
      expect(slides(f)[0].hasAttribute('aria-hidden')).toBe(false);
      expect(activeStates(f)).toBe('1000');
    });

    it('is a named, focusable viewport', () => {
      const f = setup();
      expect(viewport(f).getAttribute('tabindex')).toBe('0');
      expect(viewport(f).getAttribute('aria-label')).toBe('Slides');
    });

    it('localises every string', () => {
      const f = setup((h) => {
        h.arrows.set('always');
        h.autoplay.set(true);
        h.labels.set({
          slides: 'Diapositivas',
          slide: (n, t) => `${n} de ${t}`,
          previous: 'Anterior',
          next: 'Siguiente',
          goTo: (n) => `Ir a ${n}`,
          dots: 'Elegir',
          pause: 'Pausar',
        });
      });
      expect(viewport(f).getAttribute('aria-label')).toBe('Diapositivas');
      expect(slides(f)[1].getAttribute('aria-label')).toBe('2 de 4');
      expect(button(f, 'carousel-previous')?.getAttribute('aria-label')).toBe(
        'Anterior',
      );
      expect(button(f, 'carousel-next')?.getAttribute('aria-label')).toBe(
        'Siguiente',
      );
      expect(dots(f)[2].getAttribute('aria-label')).toBe('Ir a 3');
      expect(
        f.nativeElement
          .querySelector('[data-slot="carousel-dots"]')
          .getAttribute('aria-label'),
      ).toBe('Elegir');
      expect(button(f, 'carousel-pause')?.getAttribute('aria-label')).toBe(
        'Pausar',
      );
    });
  });

  describe('layout contract', () => {
    it('publishes the geometry every slide reads', () => {
      const f = setup((h) => {
        h.gap.set(12);
        h.speed.set(250);
      });
      expect(cssVar(f, '--andes-carousel-position')).toBe('0');
      expect(cssVar(f, '--andes-carousel-count')).toBe('4');
      expect(cssVar(f, '--andes-carousel-per-view')).toBe('1');
      expect(cssVar(f, '--andes-carousel-gap')).toBe('12px');
      expect(cssVar(f, '--andes-carousel-duration')).toBe('250ms');
      expect(
        slides(f).map((s) =>
          s.style.getPropertyValue('--andes-carousel-index'),
        ),
      ).toEqual(['0', '1', '2', '3']);
    });

    it('keeps spare slides on both sides of the loop window', () => {
      const f = setup((h) => h.items.set([1, 2, 3, 4, 5, 6]));
      expect(cssVar(f, '--andes-carousel-window-start')).toBe('-2');
      expect(slides(f)[0].hasAttribute('data-wrap')).toBe(true);
    });

    it('does not loop when told not to', () => {
      const f = setup((h) => h.infinite.set(false));
      expect(slides(f)[0].hasAttribute('data-wrap')).toBe(false);
    });

    it('reports orientation and effect on the host', () => {
      const f = setup((h) => h.vertical.set(true));
      expect(root(f).dataset['orientation']).toBe('vertical');
      expect(root(f).dataset['effect']).toBe('scroll');
    });
  });

  describe('moving', () => {
    it('steps with next() and prev(), looping past the ends', () => {
      const f = setup();
      const carousel = f.componentInstance.carousel();
      carousel.next();
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(1);
      expect(cssVar(f, '--andes-carousel-position')).toBe('1');
      carousel.prev();
      carousel.prev();
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(3);
      carousel.next();
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(0);
      // Position keeps counting forward: -1 -> 0 is one step, not three back.
      expect(cssVar(f, '--andes-carousel-position')).toBe('0');
    });

    it('takes the shorter way round to a distant slide', () => {
      const f = setup((h) => h.items.set([1, 2, 3, 4, 5, 6, 7, 8]));
      f.componentInstance.carousel().goTo(7);
      f.detectChanges();
      expect(cssVar(f, '--andes-carousel-position')).toBe('-1');
      expect(f.componentInstance.active()).toBe(7);
    });

    it('stops at the ends without looping', () => {
      const f = setup((h) => {
        h.infinite.set(false);
        h.arrows.set('always');
      });
      const carousel = f.componentInstance.carousel();
      carousel.prev();
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(0);
      expect(
        button(f, 'carousel-previous')?.getAttribute('aria-disabled'),
      ).toBe('true');
      carousel.goTo(3);
      carousel.next();
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(3);
      expect(button(f, 'carousel-next')?.getAttribute('aria-disabled')).toBe(
        'true',
      );
    });

    it('rewinds when there are too few slides to loop seamlessly', () => {
      const f = setup((h) => h.items.set([1, 2]));
      const carousel = f.componentInstance.carousel();
      carousel.next();
      carousel.next();
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(0);
      carousel.prev();
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(1);
    });

    it('goes to a slide with no animation on request, then restores the speed', () => {
      const f = setup();
      f.componentInstance.carousel().goTo(2, false);
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(2);
      expect(cssVar(f, '--andes-carousel-position')).toBe('2');
      expect(cssVar(f, '--andes-carousel-speed')).toContain(
        'var(--andes-carousel-duration',
      );
    });

    it('follows the two-way model from outside', () => {
      const f = setup();
      f.componentInstance.active.set(2);
      f.detectChanges();
      expect(cssVar(f, '--andes-carousel-position')).toBe('2');
      expect(activeStates(f)).toBe('0010');
    });

    it('clamps an out-of-range model value', () => {
      const f = setup();
      f.componentInstance.active.set(99);
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(3);
    });

    it('survives slides being removed under it', () => {
      const f = setup();
      f.componentInstance.carousel().goTo(3);
      f.detectChanges();
      f.componentInstance.items.set([1, 2]);
      f.detectChanges();
      expect(f.componentInstance.active()).toBeLessThanOrEqual(1);
    });
  });

  describe('change notifications', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('reports before at once and after once the change has settled', () => {
      const f = setup((h) => h.speed.set(300));
      f.componentInstance.carousel().next();
      f.detectChanges();
      expect(f.componentInstance.before).toEqual([{ from: 0, to: 1 }]);
      expect(f.componentInstance.after).toEqual([]);
      vi.advanceTimersByTime(299);
      expect(f.componentInstance.after).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(f.componentInstance.after).toEqual([1]);
    });

    it('reports after at once for an instant change', () => {
      const f = setup();
      f.componentInstance.carousel().goTo(2, false);
      expect(f.componentInstance.after).toEqual([2]);
    });

    it('reports only the last change when a new one interrupts', () => {
      const f = setup();
      const carousel = f.componentInstance.carousel();
      carousel.next();
      vi.advanceTimersByTime(100);
      carousel.next();
      vi.advanceTimersByTime(600);
      expect(f.componentInstance.before).toHaveLength(2);
      expect(f.componentInstance.after).toEqual([2]);
    });

    it('stays quiet when nothing changes', () => {
      const f = setup((h) => h.infinite.set(false));
      f.componentInstance.carousel().prev();
      expect(f.componentInstance.before).toEqual([]);
    });
  });

  describe('dots', () => {
    it('shows one per slide and marks the current one', () => {
      const f = setup();
      expect(dots(f)).toHaveLength(4);
      expect(dots(f).map((d) => d.getAttribute('aria-current'))).toEqual([
        'true',
        null,
        null,
        null,
      ]);
      expect(dots(f)[1].getAttribute('aria-label')).toBe('Go to slide 2');
      expect(dots(f)[1].tagName).toBe('BUTTON');
    });

    it('selects a slide on click and follows it', () => {
      const f = setup();
      dots(f)[2].click();
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(2);
      expect(dots(f)[2].getAttribute('aria-current')).toBe('true');
    });

    it('goes away when turned off, and with a single slide', () => {
      const f = setup((h) => h.dots.set(false));
      expect(dots(f)).toHaveLength(0);
      f.componentInstance.dots.set(true);
      f.componentInstance.items.set([1]);
      f.detectChanges();
      expect(dots(f)).toHaveLength(0);
    });

    it('sits where asked, and at the end of a vertical carousel by default', () => {
      const f = setup((h) => h.dotPlacement.set('top'));
      const group = () =>
        f.nativeElement.querySelector('[data-slot="carousel-dots"]');
      expect(group().dataset.position).toBe('top');
      f.componentInstance.dotPlacement.set(null);
      f.componentInstance.vertical.set(true);
      f.detectChanges();
      expect(group().dataset.position).toBe('end');
      f.componentInstance.vertical.set(false);
      f.detectChanges();
      expect(group().dataset.position).toBe('bottom');
    });

    it('renders a custom dot with its context', () => {
      const f = setup((h) => h.useDotTemplate.set(true));
      expect(f.nativeElement.querySelectorAll('.custom-dot')).toHaveLength(4);
      expect(f.nativeElement.querySelector('.custom-dot').textContent).toBe(
        '0*',
      );
    });
  });

  describe('arrows', () => {
    it('are absent by default, and with one slide', () => {
      const f = setup();
      expect(button(f, 'carousel-next')).toBeNull();
      f.componentInstance.arrows.set('always');
      f.componentInstance.items.set([1]);
      f.detectChanges();
      expect(button(f, 'carousel-next')).toBeNull();
    });

    it('show always or on hover, as asked', () => {
      const f = setup((h) => h.arrows.set('hover'));
      expect(root(f).dataset['arrows']).toBe('hover');
      f.componentInstance.arrows.set(true);
      f.detectChanges();
      expect(root(f).dataset['arrows']).toBe('always');
    });

    it('step the carousel and are named', () => {
      const f = setup((h) => h.arrows.set('always'));
      expect(button(f, 'carousel-previous')?.getAttribute('aria-label')).toBe(
        'Previous slide',
      );
      button(f, 'carousel-next')?.click();
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(1);
      button(f, 'carousel-previous')?.click();
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(0);
    });
  });

  describe('keyboard', () => {
    it('moves with the arrow keys, Home and End', () => {
      const f = setup();
      keydown(viewport(f), 'ArrowRight');
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(1);
      keydown(viewport(f), 'ArrowLeft');
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(0);
      keydown(viewport(f), 'End');
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(3);
      keydown(viewport(f), 'Home');
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(0);
    });

    it('handles keys from anywhere inside, and stops the page from scrolling', () => {
      const f = setup();
      const inner = f.nativeElement.querySelector('.in-slide') as HTMLElement;
      const event = keydown(inner, 'ArrowRight');
      f.detectChanges();
      expect(event.defaultPrevented).toBe(true);
      expect(f.componentInstance.active()).toBe(1);
    });

    it('uses up and down when vertical', () => {
      const f = setup((h) => h.vertical.set(true));
      expect(keydown(viewport(f), 'ArrowRight').defaultPrevented).toBe(false);
      keydown(viewport(f), 'ArrowDown');
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(1);
      keydown(viewport(f), 'ArrowUp');
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(0);
    });

    it('swaps left and right in right-to-left', () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Directionality,
            useValue: {
              value: 'rtl',
              change: of(),
              ngOnDestroy: () => undefined,
            },
          },
        ],
      });
      const f = setup();
      keydown(viewport(f), 'ArrowLeft');
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(1);
    });

    it('follows a dir attribute on an ancestor over the document direction', () => {
      const f = setup();
      f.nativeElement.setAttribute('dir', 'rtl');
      keydown(viewport(f), 'ArrowLeft');
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(1);
      f.nativeElement.removeAttribute('dir');
    });

    it('ignores keys with modifiers, in text fields, and when switched off', () => {
      const f = setup();
      expect(
        keydown(viewport(f), 'ArrowRight', { ctrlKey: true }).defaultPrevented,
      ).toBe(false);
      const input = document.createElement('input');
      viewport(f).appendChild(input);
      expect(keydown(input, 'ArrowRight').defaultPrevented).toBe(false);
      f.componentInstance.keyboard.set(false);
      f.detectChanges();
      expect(keydown(viewport(f), 'ArrowRight').defaultPrevented).toBe(false);
      expect(f.componentInstance.active()).toBe(0);
    });
  });

  describe('several slides at once', () => {
    it('shows that many as active and stops at the last full view', () => {
      const f = setup((h) => {
        h.items.set([1, 2, 3, 4, 5, 6]);
        h.slidesPerView.set(3);
        h.infinite.set(false);
      });
      expect(activeStates(f)).toBe('111000');
      expect(cssVar(f, '--andes-carousel-per-view')).toBe('3');
      // 6 slides, 3 per view: first-visible index 0..3.
      expect(dots(f)).toHaveLength(4);
      f.componentInstance.carousel().goTo(5);
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(3);
      expect(activeStates(f)).toBe('000111');
    });

    it('loops with every position a stop', () => {
      const f = setup((h) => {
        h.items.set([1, 2, 3, 4, 5, 6]);
        h.slidesPerView.set(2);
      });
      expect(dots(f)).toHaveLength(6);
      f.componentInstance.carousel().goTo(5);
      f.detectChanges();
      expect(activeStates(f)).toBe('100001');
    });

    it('allows a fractional view and lands the last stop flush with the end', () => {
      const f = setup((h) => {
        h.items.set([1, 2, 3, 4]);
        h.slidesPerView.set(1.5);
        h.infinite.set(false);
      });
      f.componentInstance.carousel().goTo(3);
      f.detectChanges();
      expect(cssVar(f, '--andes-carousel-position')).toBe('2.5');
      expect(f.componentInstance.active()).toBe(3);
    });

    it('never shows more than there are', () => {
      const f = setup((h) => h.slidesPerView.set(10));
      expect(cssVar(f, '--andes-carousel-per-view')).toBe('4');
    });
  });

  describe('fade', () => {
    it('shows one slide and ignores gap and several-per-view', () => {
      const f = setup((h) => {
        h.effect.set('fade');
        h.slidesPerView.set(3);
        h.gap.set(20);
      });
      expect(root(f).dataset['effect']).toBe('fade');
      expect(cssVar(f, '--andes-carousel-per-view')).toBe('1');
      expect(cssVar(f, '--andes-carousel-gap')).toBe('0px');
      expect(activeStates(f)).toBe('1000');
    });

    it('wraps round, even with two slides', () => {
      const f = setup((h) => {
        h.effect.set('fade');
        h.items.set([1, 2]);
      });
      const carousel = f.componentInstance.carousel();
      carousel.next();
      carousel.next();
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(0);
      expect(activeStates(f)).toBe('10');
    });

    it('is never vertical', () => {
      const f = setup((h) => {
        h.effect.set('fade');
        h.vertical.set(true);
      });
      expect(root(f).dataset['orientation']).toBe('horizontal');
    });
  });

  describe('lazy slides', () => {
    it('builds only the slides near the visible one, and keeps them', () => {
      const f = setup((h) => {
        h.items.set([1, 2, 3, 4, 5, 6, 7, 8]);
        h.lazy.set(true);
        h.preload.set(1);
      });
      const built = () =>
        Array.from(f.nativeElement.querySelectorAll('.lazy-content')).map(
          (e) => (e as HTMLElement).dataset['n'],
        );
      // Visible 1, one ahead (2) and, because it loops, one behind (8).
      expect(built().sort()).toEqual(['1', '2', '8']);
      f.componentInstance.carousel().goTo(3);
      f.detectChanges();
      f.detectChanges();
      expect(built().sort()).toEqual(['1', '2', '3', '4', '5', '8']);
    });

    it('builds nothing beyond the visible slide with no preload', () => {
      const f = setup((h) => {
        h.items.set([1, 2, 3, 4, 5, 6]);
        h.lazy.set(true);
        h.preload.set(0);
      });
      expect(f.nativeElement.querySelectorAll('.lazy-content')).toHaveLength(1);
    });
  });

  describe('dragging', () => {
    function stubSize(f: ComponentFixture<Host>) {
      Object.defineProperty(viewport(f), 'clientWidth', {
        configurable: true,
        value: 400,
      });
      viewport(f).setPointerCapture = () => undefined;
      viewport(f).releasePointerCapture = () => undefined;
    }

    it('follows the pointer past a small threshold, then snaps to the nearest slide', () => {
      const f = setup();
      stubSize(f);
      const v = viewport(f);
      pointer(v, 'pointerdown', 300, 50, 0);
      pointer(v, 'pointermove', 297, 50, 10);
      f.detectChanges();
      expect(root(f).hasAttribute('data-dragging')).toBe(false);

      pointer(v, 'pointermove', 100, 50, 400);
      f.detectChanges();
      expect(root(f).hasAttribute('data-dragging')).toBe(true);
      expect(cssVar(f, '--andes-carousel-position')).toBe('0.5');
      expect(cssVar(f, '--andes-carousel-speed')).toBe('0ms');

      pointer(v, 'pointerup', 100, 50, 800);
      f.detectChanges();
      expect(root(f).hasAttribute('data-dragging')).toBe(false);
      expect(f.componentInstance.active()).toBe(1);
      expect(cssVar(f, '--andes-carousel-speed')).toContain(
        'var(--andes-carousel-duration',
      );
    });

    it('lets a quick flick carry it on, but only so far', () => {
      const f = setup((h) => h.items.set([1, 2, 3, 4, 5, 6]));
      stubSize(f);
      const v = viewport(f);
      pointer(v, 'pointerdown', 300, 50, 0);
      pointer(v, 'pointermove', 280, 50, 10);
      pointer(v, 'pointermove', 220, 50, 40);
      pointer(v, 'pointermove', 160, 50, 70);
      pointer(v, 'pointerup', 160, 50, 80);
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(1);
    });

    it('snaps back when released short of halfway', () => {
      const f = setup();
      stubSize(f);
      const v = viewport(f);
      pointer(v, 'pointerdown', 300, 50, 0);
      pointer(v, 'pointermove', 250, 50, 500);
      pointer(v, 'pointerup', 250, 50, 1000);
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(0);
      expect(f.componentInstance.before).toEqual([]);
    });

    it('goes the other way when dragged to the right', () => {
      const f = setup();
      stubSize(f);
      const v = viewport(f);
      pointer(v, 'pointerdown', 100, 50, 0);
      pointer(v, 'pointermove', 300, 50, 400);
      pointer(v, 'pointerup', 300, 50, 800);
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(3);
    });

    it('resists past the first and last slide when not looping', () => {
      const f = setup((h) => h.infinite.set(false));
      stubSize(f);
      const v = viewport(f);
      pointer(v, 'pointerdown', 100, 50, 0);
      pointer(v, 'pointermove', 300, 50, 400);
      f.detectChanges();
      // 200px of a 400px slide would be 0.5; with resistance it shows 0.175.
      expect(cssVar(f, '--andes-carousel-position')).toBe('-0.175');
      pointer(v, 'pointerup', 300, 50, 800);
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(0);
    });

    it('ignores a mostly vertical gesture so the page can scroll', () => {
      const f = setup();
      stubSize(f);
      const v = viewport(f);
      pointer(v, 'pointerdown', 100, 50, 0);
      pointer(v, 'pointermove', 110, 200, 100);
      f.detectChanges();
      expect(root(f).hasAttribute('data-dragging')).toBe(false);
    });

    it('swallows the click that ends a drag', () => {
      const f = setup();
      stubSize(f);
      const v = viewport(f);
      const target = f.nativeElement.querySelector('.in-slide') as HTMLElement;
      let clicks = 0;
      target.addEventListener('click', () => clicks++);
      pointer(v, 'pointerdown', 300, 50, 0);
      pointer(v, 'pointermove', 100, 50, 400);
      pointer(v, 'pointerup', 100, 50, 800);
      target.click();
      expect(clicks).toBe(0);
      target.click();
      expect(clicks).toBe(1);
    });

    it('is off when not draggable', () => {
      const f = setup((h) => h.draggable.set(false));
      stubSize(f);
      pointer(viewport(f), 'pointerdown', 300, 50, 0);
      pointer(viewport(f), 'pointermove', 100, 50, 400);
      f.detectChanges();
      expect(root(f).hasAttribute('data-dragging')).toBe(false);
    });
  });

  describe('autoplay', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      vi.useRealTimers();
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
    });

    const run = (f: ComponentFixture<Host>, ms: number) => {
      vi.advanceTimersByTime(ms);
      f.detectChanges();
    };

    it('advances on a timer', () => {
      const f = setup((h) => {
        h.autoplay.set(true);
        h.autoplaySpeed.set(1000);
      });
      run(f, 999);
      expect(f.componentInstance.active()).toBe(0);
      run(f, 1);
      expect(f.componentInstance.active()).toBe(1);
      run(f, 1000);
      expect(f.componentInstance.active()).toBe(2);
    });

    it('does nothing unless asked', () => {
      const f = setup();
      run(f, 10_000);
      expect(f.componentInstance.active()).toBe(0);
    });

    it('holds while the pointer is over it, and carries on after', () => {
      const f = setup((h) => h.autoplay.set(true));
      root(f).dispatchEvent(
        new PointerEvent('pointerenter', { pointerType: 'mouse' }),
      );
      f.detectChanges();
      run(f, 10_000);
      expect(f.componentInstance.active()).toBe(0);
      root(f).dispatchEvent(
        new PointerEvent('pointerleave', { pointerType: 'mouse' }),
      );
      f.detectChanges();
      run(f, 3000);
      expect(f.componentInstance.active()).toBe(1);
    });

    it('ignores hover when told to', () => {
      const f = setup((h) => {
        h.autoplay.set(true);
        h.pauseOnHover.set(false);
      });
      root(f).dispatchEvent(
        new PointerEvent('pointerenter', { pointerType: 'mouse' }),
      );
      f.detectChanges();
      run(f, 3000);
      expect(f.componentInstance.active()).toBe(1);
    });

    it('holds while focus is inside', () => {
      const f = setup((h) => h.autoplay.set(true));
      const inner = f.nativeElement.querySelector('.in-slide') as HTMLElement;
      inner.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      f.detectChanges();
      run(f, 10_000);
      expect(f.componentInstance.active()).toBe(0);
      inner.dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
      );
      f.detectChanges();
      run(f, 3000);
      expect(f.componentInstance.active()).toBe(1);
    });

    it('holds while the page is hidden', () => {
      const f = setup((h) => h.autoplay.set(true));
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
      f.detectChanges();
      run(f, 10_000);
      expect(f.componentInstance.active()).toBe(0);
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
      f.detectChanges();
      run(f, 3000);
      expect(f.componentInstance.active()).toBe(1);
    });

    it('has a pause control that stops and restarts it', () => {
      const f = setup((h) => h.autoplay.set(true));
      const control = button(f, 'carousel-pause') as HTMLButtonElement;
      expect(control.getAttribute('aria-label')).toBe('Pause slide show');
      control.click();
      f.detectChanges();
      expect(control.getAttribute('aria-label')).toBe('Start slide show');
      run(f, 10_000);
      expect(f.componentInstance.active()).toBe(0);
      control.click();
      f.detectChanges();
      run(f, 3000);
      expect(f.componentInstance.active()).toBe(1);
    });

    it('puts the pause control before the slides in the document', () => {
      const f = setup((h) => h.autoplay.set(true));
      const control = button(f, 'carousel-pause') as HTMLElement;
      expect(
        control.compareDocumentPosition(viewport(f)) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('shows no pause control without autoplay', () => {
      const f = setup();
      expect(button(f, 'carousel-pause')).toBeNull();
    });

    it('keeps the live region silent while rotating, polite otherwise', () => {
      const f = setup();
      expect(viewport(f).getAttribute('aria-live')).toBe('polite');
      f.componentInstance.autoplay.set(true);
      f.detectChanges();
      expect(viewport(f).getAttribute('aria-live')).toBe('off');
      expect(root(f).hasAttribute('data-playing')).toBe(true);
      root(f).dispatchEvent(
        new PointerEvent('pointerenter', { pointerType: 'mouse' }),
      );
      f.detectChanges();
      expect(viewport(f).getAttribute('aria-live')).toBe('polite');
    });

    it('stops for good after the first interaction, when so configured', () => {
      const f = setup((h) => {
        h.autoplay.set(true);
        h.stopOnInteraction.set(true);
      });
      dots(f)[2].click();
      f.detectChanges();
      run(f, 30_000);
      expect(f.componentInstance.active()).toBe(2);
      expect(button(f, 'carousel-pause')?.getAttribute('aria-label')).toBe(
        'Start slide show',
      );
      // The user can still bring it back.
      button(f, 'carousel-pause')?.click();
      f.detectChanges();
      run(f, 3000);
      expect(f.componentInstance.active()).toBe(3);
    });

    it('keeps going after an interaction by default', () => {
      const f = setup((h) => h.autoplay.set(true));
      keydown(viewport(f), 'ArrowRight');
      f.detectChanges();
      run(f, 3000);
      expect(f.componentInstance.active()).toBe(2);
    });

    it('stops at the last slide when not looping', () => {
      const f = setup((h) => {
        h.autoplay.set(true);
        h.infinite.set(false);
        h.autoplaySpeed.set(100);
      });
      run(f, 100);
      run(f, 100);
      run(f, 100);
      run(f, 1000);
      expect(f.componentInstance.active()).toBe(3);
    });

    it('does not tick with a single slide', () => {
      const f = setup((h) => {
        h.autoplay.set(true);
        h.items.set([1]);
      });
      expect(button(f, 'carousel-pause')).toBeNull();
      run(f, 10_000);
      expect(f.componentInstance.active()).toBe(0);
    });

    it('fills the active dot over the delay while rotating', () => {
      const f = setup((h) => {
        h.autoplay.set(true);
        h.dotProgress.set(true);
        h.autoplaySpeed.set(2500);
      });
      expect(dots(f)[0].classList).toContain('andes-carousel__dot--progress');
      expect(
        dots(f)[0].style.getPropertyValue('--andes-carousel-progress-duration'),
      ).toBe('2500ms');
      expect(dots(f)[1].classList).not.toContain(
        'andes-carousel__dot--progress',
      );
    });

    it('clears its timer when destroyed', () => {
      const f = setup((h) => h.autoplay.set(true));
      f.destroy();
      vi.advanceTimersByTime(60_000);
      expect(f.componentInstance.before).toEqual([]);
    });
  });

  describe('reduced motion', () => {
    const original = window.matchMedia;
    afterEach(() => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: original,
      });
    });

    it('changes slides instantly', () => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: () => ({
          matches: true,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }),
      });
      const f = setup();
      expect(cssVar(f, '--andes-carousel-speed')).toBe('0ms');
      f.componentInstance.carousel().next();
      expect(f.componentInstance.after).toEqual([1]);
    });
  });
});

const state = (f: ComponentFixture<Host>) =>
  f.componentInstance.carousel().autoplayState();

function hover(
  f: ComponentFixture<Host>,
  type: 'enter' | 'leave',
  kind = 'mouse',
) {
  root(f).dispatchEvent(
    new PointerEvent(`pointer${type}`, { pointerType: kind }),
  );
  f.detectChanges();
}

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      matches,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

describe('AndesCarousel autoplay state machine', () => {
  const originalMatchMedia = window.matchMedia;
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  const run = (f: ComponentFixture<Host>, ms: number) => {
    vi.advanceTimersByTime(ms);
    f.detectChanges();
  };
  const autoplaying = () =>
    setup((h) => {
      h.autoplay.set(true);
      h.autoplaySpeed.set(3000);
    });
  const idx = (f: ComponentFixture<Host>) => f.componentInstance.active();

  describe('a pause keeps what is left of the delay', () => {
    const enter = (f: ComponentFixture<Host>) => {
      root(f).dispatchEvent(
        new PointerEvent('pointerenter', { pointerType: 'mouse' }),
      );
      f.detectChanges();
    };
    const leave = (f: ComponentFixture<Host>) => {
      root(f).dispatchEvent(
        new PointerEvent('pointerleave', { pointerType: 'mouse' }),
      );
      f.detectChanges();
    };

    it('carries on from where hover stopped it instead of starting over', () => {
      const f = autoplaying();
      run(f, 2000);
      enter(f);
      run(f, 10_000);
      expect(idx(f)).toBe(0);
      leave(f);
      run(f, 999);
      expect(idx(f)).toBe(0);
      run(f, 1);
      expect(idx(f)).toBe(1);
    });

    it('keeps adding up across several pauses', () => {
      const f = autoplaying();
      run(f, 1000);
      enter(f);
      run(f, 5000);
      leave(f);
      run(f, 1000);
      enter(f);
      run(f, 5000);
      leave(f);
      run(f, 999);
      expect(idx(f)).toBe(0);
      run(f, 1);
      expect(idx(f)).toBe(1);
    });

    it('starts over from a full delay after a change of slide', () => {
      const f = autoplaying();
      run(f, 3000);
      expect(idx(f)).toBe(1);
      run(f, 1000);
      enter(f);
      run(f, 5000);
      leave(f);
      run(f, 1999);
      expect(idx(f)).toBe(1);
      run(f, 1);
      expect(idx(f)).toBe(2);
    });

    it('freezes the progress fill while held instead of removing it', () => {
      const f = setup((h) => {
        h.autoplay.set(true);
        h.autoplaySpeed.set(3000);
        h.dotProgress.set(true);
      });
      const dot = () =>
        f.nativeElement.querySelector(
          '.andes-carousel__dot--progress',
        ) as HTMLElement;
      expect(dot()).not.toBeNull();
      expect(dot().classList).not.toContain(
        'andes-carousel__dot--progress-held',
      );
      run(f, 1000);
      enter(f);
      expect(dot()).not.toBeNull();
      expect(dot().classList).toContain('andes-carousel__dot--progress-held');
      leave(f);
      f.detectChanges();
      expect(dot().classList).not.toContain(
        'andes-carousel__dot--progress-held',
      );
    });
  });

  it('folds the pause sources in a fixed order', () => {
    const none = {
      enabled: true,
      reducedMotion: false,
      userPaused: false,
      hidden: false,
      offscreen: false,
      dragging: false,
      focus: false,
      hover: false,
    };
    expect(resolveAutoplayState(none)).toBe('running');
    expect(resolveAutoplayState({ ...none, enabled: false, hover: true })).toBe(
      'idle',
    );
    const everything = {
      ...none,
      reducedMotion: true,
      userPaused: true,
      hidden: true,
      offscreen: true,
      dragging: true,
      focus: true,
      hover: true,
    };
    expect(resolveAutoplayState(everything)).toBe('reduced-motion');
    expect(resolveAutoplayState({ ...everything, reducedMotion: false })).toBe(
      'paused-by-user',
    );
    expect(
      resolveAutoplayState({
        ...everything,
        reducedMotion: false,
        userPaused: false,
      }),
    ).toBe('paused-hidden');
    expect(
      resolveAutoplayState({
        ...none,
        offscreen: true,
        dragging: true,
        focus: true,
        hover: true,
      }),
    ).toBe('paused-offscreen');
    expect(
      resolveAutoplayState({
        ...none,
        dragging: true,
        focus: true,
        hover: true,
      }),
    ).toBe('paused-by-drag');
    expect(resolveAutoplayState({ ...none, focus: true, hover: true })).toBe(
      'paused-by-focus',
    );
    expect(resolveAutoplayState({ ...none, hover: true })).toBe(
      'paused-by-hover',
    );
  });

  it('is idle without autoplay and with a single slide', () => {
    const f = setup();
    expect(state(f)).toBe('idle');
    expect(root(f).hasAttribute('data-autoplay')).toBe(false);
    const single = setup((h) => {
      h.autoplay.set(true);
      h.items.set([1]);
    });
    expect(state(single)).toBe('idle');
  });

  it('runs, and exposes the state on the host and as isPlaying', () => {
    const f = autoplaying();
    expect(state(f)).toBe('running');
    expect(root(f).dataset['autoplay']).toBe('running');
    expect(f.componentInstance.carousel().isPlaying()).toBe(true);
    hover(f, 'enter');
    expect(root(f).dataset['autoplay']).toBe('paused-by-hover');
    expect(f.componentInstance.carousel().isPlaying()).toBe(false);
  });

  it('running -> paused-by-hover -> running, carrying on from where it stopped', () => {
    const f = autoplaying();
    run(f, 2000);
    hover(f, 'enter');
    expect(state(f)).toBe('paused-by-hover');
    run(f, 10_000);
    expect(idx(f)).toBe(0);
    hover(f, 'leave');
    expect(state(f)).toBe('running');
    run(f, 999);
    expect(idx(f)).toBe(0);
    run(f, 1);
    expect(idx(f)).toBe(1);
    run(f, 3000);
    expect(idx(f)).toBe(2);
  });

  it('counts a pen hovering, but not a finger', () => {
    const f = autoplaying();
    hover(f, 'enter', 'touch');
    expect(state(f)).toBe('running');
    hover(f, 'enter', 'pen');
    expect(state(f)).toBe('paused-by-hover');
    hover(f, 'leave', 'pen');
    expect(state(f)).toBe('running');
  });

  it('ends a hover that never got its pointerleave, on the next move elsewhere', () => {
    const f = autoplaying();
    hover(f, 'enter');
    expect(state(f)).toBe('paused-by-hover');
    document.body.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true }),
    );
    f.detectChanges();
    expect(state(f)).toBe('running');
  });

  it('ignores hover when told to', () => {
    const f = setup((h) => h.autoplay.set({ pauseOnHover: false }));
    hover(f, 'enter');
    expect(state(f)).toBe('running');
    run(f, 3000);
    expect(idx(f)).toBe(1);
  });

  it('running -> paused-by-focus -> running for keyboard focus', () => {
    const f = autoplaying();
    const inner = f.nativeElement.querySelector('.in-slide') as HTMLElement;
    inner.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    f.detectChanges();
    expect(state(f)).toBe('paused-by-focus');
    run(f, 10_000);
    expect(idx(f)).toBe(0);
    inner.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
    );
    f.detectChanges();
    expect(state(f)).toBe('running');
    run(f, 3000);
    expect(idx(f)).toBe(1);
  });

  it('does not hold for focus that a pointer press put there', () => {
    const f = autoplaying();
    document.body.appendChild(f.nativeElement);
    const inner = f.nativeElement.querySelector('.in-slide') as HTMLElement;
    vi.spyOn(inner, 'matches').mockImplementation(
      (selector: string) => selector !== ':focus-visible',
    );
    inner.focus();
    f.detectChanges();
    expect(document.activeElement).toBe(inner);
    expect(state(f)).toBe('running');
    run(f, 3000);
    expect(idx(f)).toBe(1);
    inner.blur();
  });

  it('holds once the keyboard is used inside, even after a pointer press', () => {
    const f = autoplaying();
    document.body.appendChild(f.nativeElement);
    const inner = f.nativeElement.querySelector('.in-slide') as HTMLElement;
    vi.spyOn(inner, 'matches').mockReturnValue(false);
    inner.focus();
    expect(state(f)).toBe('running');
    keydown(viewport(f), 'Shift');
    f.detectChanges();
    expect(state(f)).toBe('paused-by-focus');
    inner.blur();
    f.detectChanges();
    expect(state(f)).toBe('running');
  });

  it('lets hover and focus go independently', () => {
    const f = autoplaying();
    const inner = f.nativeElement.querySelector('.in-slide') as HTMLElement;
    hover(f, 'enter');
    inner.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    f.detectChanges();
    expect(state(f)).toBe('paused-by-focus');
    hover(f, 'leave');
    expect(state(f)).toBe('paused-by-focus');
    inner.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    f.detectChanges();
    expect(state(f)).toBe('running');
  });

  it('ignores focus when told to', () => {
    const f = setup((h) => h.autoplay.set({ pauseOnFocus: false }));
    const inner = f.nativeElement.querySelector('.in-slide') as HTMLElement;
    inner.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    f.detectChanges();
    expect(state(f)).toBe('running');
  });

  it('running -> paused-by-drag -> running, with a full delay after the drop', () => {
    const f = autoplaying();
    viewport(f).setPointerCapture = () => undefined;
    viewport(f).releasePointerCapture = () => undefined;
    Object.defineProperty(viewport(f), 'clientWidth', {
      configurable: true,
      value: 400,
    });
    run(f, 2000);
    const v = viewport(f);
    pointer(v, 'pointerdown', 300, 50, 0);
    pointer(v, 'pointermove', 100, 50, 400);
    f.detectChanges();
    expect(state(f)).toBe('paused-by-drag');
    run(f, 20_000);
    expect(idx(f)).toBe(0);
    pointer(v, 'pointerup', 100, 50, 800);
    f.detectChanges();
    expect(idx(f)).toBe(1);
    expect(state(f)).toBe('running');
    run(f, 2999);
    expect(idx(f)).toBe(1);
    run(f, 1);
    expect(idx(f)).toBe(2);
  });

  it('restarts from a full delay after a dot or an arrow, even the current dot', () => {
    const f = setup((h) => {
      h.autoplay.set(true);
      h.arrows.set('always');
    });
    run(f, 2500);
    dots(f)[0].click();
    f.detectChanges();
    run(f, 2999);
    expect(idx(f)).toBe(0);
    run(f, 1);
    expect(idx(f)).toBe(1);
    run(f, 2000);
    button(f, 'carousel-next')?.click();
    f.detectChanges();
    expect(idx(f)).toBe(2);
    run(f, 2999);
    expect(idx(f)).toBe(2);
    run(f, 1);
    expect(idx(f)).toBe(3);
  });

  it('running -> paused-by-user -> running with the button, and holds over the other sources', () => {
    const f = autoplaying();
    const control = button(f, 'carousel-pause') as HTMLButtonElement;
    control.click();
    f.detectChanges();
    expect(state(f)).toBe('paused-by-user');
    hover(f, 'enter');
    hover(f, 'leave');
    run(f, 20_000);
    expect(idx(f)).toBe(0);
    control.click();
    f.detectChanges();
    expect(state(f)).toBe('running');
    run(f, 3000);
    expect(idx(f)).toBe(1);
  });

  it('pauses and plays from code', () => {
    const f = autoplaying();
    f.componentInstance.carousel().pause();
    f.detectChanges();
    expect(state(f)).toBe('paused-by-user');
    f.componentInstance.carousel().play();
    f.detectChanges();
    expect(state(f)).toBe('running');
  });

  it('stops for good on interaction with resumeAfterInteraction off, until play()', () => {
    const f = setup((h) => h.autoplay.set({ resumeAfterInteraction: false }));
    keydown(viewport(f), 'ArrowRight');
    f.detectChanges();
    expect(state(f)).toBe('paused-by-user');
    run(f, 30_000);
    expect(idx(f)).toBe(1);
    f.componentInstance.carousel().play();
    f.detectChanges();
    run(f, 3000);
    expect(idx(f)).toBe(2);
  });

  it('running -> paused-hidden -> running with the tab', () => {
    const f = autoplaying();
    const show = (value: string) => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      f.detectChanges();
    };
    show('hidden');
    expect(state(f)).toBe('paused-hidden');
    run(f, 20_000);
    expect(idx(f)).toBe(0);
    show('visible');
    expect(state(f)).toBe('running');
    run(f, 3000);
    expect(idx(f)).toBe(1);
  });

  it('running -> paused-offscreen -> running as it scrolls out of and into view', () => {
    let notify: (entries: { isIntersecting: boolean }[]) => void = () =>
      undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof notify) {
          notify = callback;
        }
        observe() {
          /* nothing to watch in jsdom */
        }
        disconnect() {
          /* nothing to release */
        }
      },
    );
    const f = autoplaying();
    notify([{ isIntersecting: false }]);
    f.detectChanges();
    expect(state(f)).toBe('paused-offscreen');
    run(f, 20_000);
    expect(idx(f)).toBe(0);
    notify([{ isIntersecting: true }]);
    f.detectChanges();
    expect(state(f)).toBe('running');
    run(f, 3000);
    expect(idx(f)).toBe(1);
  });

  it('is reduced-motion under the preference: no timer, no button', () => {
    stubMatchMedia(true);
    const f = autoplaying();
    expect(state(f)).toBe('reduced-motion');
    run(f, 20_000);
    expect(idx(f)).toBe(0);
    expect(button(f, 'carousel-pause')).toBeNull();
    expect(root(f).hasAttribute('data-reduced')).toBe(true);
  });

  it('keeps playing under the preference when the app opts in', () => {
    stubMatchMedia(true);
    const f = setup((h) => {
      h.autoplay.set(true);
      h.reducedMotion.set('allow');
    });
    expect(state(f)).toBe('running');
    expect(root(f).hasAttribute('data-reduced')).toBe(false);
    expect(cssVar(f, '--andes-carousel-speed')).toContain(
      'var(--andes-carousel-duration',
    );
    run(f, 3000);
    expect(idx(f)).toBe(1);
  });

  it('can be forced to reduced motion without the preference', () => {
    const f = setup((h) => {
      h.autoplay.set(true);
      h.reducedMotion.set('reduce');
    });
    expect(state(f)).toBe('reduced-motion');
    expect(cssVar(f, '--andes-carousel-speed')).toBe('0ms');
  });

  it('follows the preference changing while mounted', () => {
    let change: (event: { matches: boolean }) => void = () => undefined;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: false,
        addEventListener: (_: string, fn: typeof change) => (change = fn),
        removeEventListener: () => undefined,
      }),
    });
    const f = autoplaying();
    expect(state(f)).toBe('running');
    change({ matches: true });
    f.detectChanges();
    expect(state(f)).toBe('reduced-motion');
    change({ matches: false });
    f.detectChanges();
    expect(state(f)).toBe('running');
  });

  it('rotates backwards, with its own speed', () => {
    const f = setup((h) =>
      h.autoplay.set({ speed: 1000, direction: 'backward' }),
    );
    run(f, 1000);
    expect(idx(f)).toBe(3);
    run(f, 1000);
    expect(idx(f)).toBe(2);
  });

  it('keeps the live region off while running and polite when held or stopped', () => {
    const f = autoplaying();
    expect(viewport(f).getAttribute('aria-live')).toBe('off');
    hover(f, 'enter');
    expect(viewport(f).getAttribute('aria-live')).toBe('polite');
    hover(f, 'leave');
    expect(viewport(f).getAttribute('aria-live')).toBe('off');
    (button(f, 'carousel-pause') as HTMLElement).click();
    f.detectChanges();
    expect(viewport(f).getAttribute('aria-live')).toBe('polite');
  });

  it('shows the button unless autoplayControl is off', () => {
    const f = setup((h) => {
      h.autoplay.set(true);
      h.autoplayControl.set(false);
    });
    expect(button(f, 'carousel-pause')).toBeNull();
    expect(state(f)).toBe('running');
    f.componentInstance.autoplayControl.set(true);
    f.detectChanges();
    expect(button(f, 'carousel-pause')).not.toBeNull();
  });

  it('restarts the progress animation when the delay restarts, and only holds it on a pause', () => {
    const f = setup((h) => {
      h.autoplay.set(true);
      h.dotProgress.set(true);
    });
    const before = dots(f)[0].classList.contains(
      'andes-carousel__dot--progress-alt',
    );
    dots(f)[0].click();
    f.detectChanges();
    expect(
      dots(f)[0].classList.contains('andes-carousel__dot--progress-alt'),
    ).toBe(!before);
    hover(f, 'enter');
    expect(dots(f)[0].classList).toContain('andes-carousel__dot--progress');
    expect(dots(f)[0].classList).toContain(
      'andes-carousel__dot--progress-held',
    );
  });
});

describe('AndesCarousel dots', () => {
  const group = (f: ComponentFixture<Host>) =>
    f.nativeElement.querySelector('[data-slot="carousel-dots"]') as HTMLElement;

  it('reports style, size, placement and position on the host', () => {
    const f = setup((h) => {
      h.dotStyle.set('pill');
      h.dotSize.set(8);
      h.dotPlacement.set('start');
      h.dotPosition.set('outside');
    });
    expect(root(f).dataset['dotStyle']).toBe('pill');
    expect(root(f).dataset['dotPlacement']).toBe('start');
    expect(root(f).dataset['dotPosition']).toBe('outside');
    expect(cssVar(f, '--andes-carousel-dot-size')).toBe('8px');
    expect(group(f).dataset['position']).toBe('start');
  });

  it('tells the container its style and whether it sits outside, and rails their markers', () => {
    const f = setup((h) => {
      h.dotStyle.set('line');
      h.dotPlacement.set('end');
      h.dotPosition.set('outside');
    });
    expect(group(f).dataset['style']).toBe('line');
    expect(group(f).hasAttribute('data-outside')).toBe(true);
    expect(
      f.nativeElement.querySelector('.andes-carousel__marker--rail'),
    ).not.toBeNull();
    f.componentInstance.dotPlacement.set('bottom');
    f.componentInstance.dotPosition.set('inside');
    f.detectChanges();
    expect(group(f).hasAttribute('data-outside')).toBe(false);
    expect(
      f.nativeElement.querySelector('.andes-carousel__marker--rail'),
    ).toBeNull();
  });

  it('defaults to round dots over the slides', () => {
    const f = setup();
    expect(root(f).dataset['dotStyle']).toBe('dot');
    expect(root(f).dataset['dotPosition']).toBe('inside');
    expect(cssVar(f, '--andes-carousel-dot-size')).toBe('');
  });

  it('adds a class to the container from the dots object, and hides with false', () => {
    const f = setup((h) => h.dots.set({ className: 'my-dots' }));
    expect(group(f).classList).toContain('my-dots');
    expect(group(f).classList).toContain('andes-carousel__dots');
    f.componentInstance.dots.set(false);
    f.detectChanges();
    expect(dots(f)).toHaveLength(0);
  });

  it('puts the end rail first when vertical, and keeps the placement when asked', () => {
    const f = setup((h) => h.orientation.set('vertical'));
    expect(group(f).dataset['position']).toBe('end');
    f.componentInstance.dotPlacement.set('bottom');
    f.detectChanges();
    expect(group(f).dataset['position']).toBe('bottom');
  });

  it('has a dot per page when sliding by pages', () => {
    const f = setup((h) => {
      h.items.set([1, 2, 3, 4, 5, 6]);
      h.slidesPerView.set(3);
      h.slidesToScroll.set(3);
    });
    expect(dots(f)).toHaveLength(2);
    expect(dots(f)[1].getAttribute('aria-label')).toBe('Go to slide 2');
  });
});

describe('AndesCarousel orientation', () => {
  it('goes vertical with the orientation input or the boolean alias', () => {
    const f = setup((h) => h.orientation.set('vertical'));
    expect(root(f).dataset['orientation']).toBe('vertical');
    expect(slides(f)[0].dataset['orientation']).toBe('vertical');
    const alias = setup((h) => h.vertical.set(true));
    expect(root(alias).dataset['orientation']).toBe('vertical');
  });

  it('sizes itself from slideHeight when vertical', () => {
    const f = setup((h) => {
      h.orientation.set('vertical');
      h.slideHeight.set(80);
      h.slidesPerView.set(2);
      h.gap.set(10);
    });
    expect(root(f).style.height).toMatch(/170px|2 \* 80px \+ 1 \* 10px/);
    const flat = setup((h) => h.slideHeight.set(80));
    expect(root(flat).style.height).toBe('');
  });

  it('drags on the vertical axis', () => {
    const f = setup((h) => h.orientation.set('vertical'));
    Object.defineProperty(viewport(f), 'clientHeight', {
      configurable: true,
      value: 400,
    });
    viewport(f).setPointerCapture = () => undefined;
    viewport(f).releasePointerCapture = () => undefined;
    const v = viewport(f);
    pointer(v, 'pointerdown', 50, 300, 0);
    pointer(v, 'pointermove', 50, 100, 400);
    f.detectChanges();
    expect(root(f).hasAttribute('data-dragging')).toBe(true);
    expect(cssVar(f, '--andes-carousel-position')).toBe('0.5');
    pointer(v, 'pointerup', 50, 100, 800);
    f.detectChanges();
    expect(f.componentInstance.active()).toBe(1);
  });

  it('ignores a mostly horizontal gesture so the page can still scroll sideways', () => {
    const f = setup((h) => h.orientation.set('vertical'));
    Object.defineProperty(viewport(f), 'clientHeight', {
      configurable: true,
      value: 400,
    });
    pointer(viewport(f), 'pointerdown', 50, 100, 0);
    pointer(viewport(f), 'pointermove', 250, 110, 100);
    f.detectChanges();
    expect(root(f).hasAttribute('data-dragging')).toBe(false);
  });

  it('loops vertically too', () => {
    const f = setup((h) => h.orientation.set('vertical'));
    keydown(viewport(f), 'ArrowUp');
    f.detectChanges();
    expect(f.componentInstance.active()).toBe(3);
    expect(cssVar(f, '--andes-carousel-position')).toBe('-1');
  });

  it('steps with the wheel along the axis when asked, and leaves the page alone otherwise', () => {
    const f = setup((h) => {
      h.orientation.set('vertical');
      h.wheel.set(true);
    });
    const wheel = (init: WheelEventInit) => {
      const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ...init,
      });
      root(f).dispatchEvent(event);
      f.detectChanges();
      return event;
    };
    expect(wheel({ deltaY: 100 }).defaultPrevented).toBe(true);
    expect(f.componentInstance.active()).toBe(1);
    expect(wheel({ deltaX: 100 }).defaultPrevented).toBe(false);
    f.componentInstance.wheel.set(false);
    f.detectChanges();
    expect(wheel({ deltaY: 100 }).defaultPrevented).toBe(false);
  });

  it('lets the page scroll once the end is reached without looping', () => {
    const f = setup((h) => {
      h.wheel.set(true);
      h.infinite.set(false);
    });
    const event = new WheelEvent('wheel', {
      deltaX: -50,
      cancelable: true,
      bubbles: true,
    });
    root(f).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('AndesCarousel drag', () => {
  function prepare(f: ComponentFixture<Host>) {
    Object.defineProperty(viewport(f), 'clientWidth', {
      configurable: true,
      value: 400,
    });
    viewport(f).setPointerCapture = () => undefined;
    viewport(f).releasePointerCapture = () => undefined;
    return viewport(f);
  }

  it('marks the host draggable, and not when switched off or with one slide', () => {
    const f = setup();
    expect(root(f).hasAttribute('data-draggable')).toBe(true);
    f.componentInstance.draggable.set(false);
    f.detectChanges();
    expect(root(f).hasAttribute('data-draggable')).toBe(false);
    const single = setup((h) => h.items.set([1]));
    expect(root(single).hasAttribute('data-draggable')).toBe(false);
  });

  it('takes touch and pen as well as the mouse', () => {
    for (const kind of ['touch', 'pen']) {
      const f = setup();
      const v = prepare(f);
      pointer(v, 'pointerdown', 300, 50, 0, 1, kind);
      pointer(v, 'pointermove', 100, 50, 400, 1, kind);
      pointer(v, 'pointerup', 100, 50, 800, 1, kind);
      f.detectChanges();
      expect(f.componentInstance.active()).toBe(1);
    }
  });

  it('only the primary mouse button drags', () => {
    const f = setup();
    const v = prepare(f);
    const down = new PointerEvent('pointerdown', {
      pointerId: 1,
      pointerType: 'mouse',
      button: 2,
      clientX: 300,
      clientY: 50,
      bubbles: true,
    });
    v.dispatchEvent(down);
    pointer(v, 'pointermove', 100, 50, 400);
    f.detectChanges();
    expect(root(f).hasAttribute('data-dragging')).toBe(false);
  });

  it('waits for the threshold, which is adjustable', () => {
    const f = setup((h) => h.dragThreshold.set(40));
    const v = prepare(f);
    pointer(v, 'pointerdown', 300, 50, 0);
    pointer(v, 'pointermove', 270, 50, 10);
    f.detectChanges();
    expect(root(f).hasAttribute('data-dragging')).toBe(false);
    pointer(v, 'pointermove', 250, 50, 20);
    f.detectChanges();
    expect(root(f).hasAttribute('data-dragging')).toBe(true);
  });

  it('reports where a drag started and where it ended up', () => {
    const f = setup();
    const v = prepare(f);
    pointer(v, 'pointerdown', 300, 50, 0);
    pointer(v, 'pointermove', 100, 50, 400);
    f.detectChanges();
    expect(f.componentInstance.dragStarts).toEqual([0]);
    pointer(v, 'pointerup', 100, 50, 800);
    f.detectChanges();
    expect(f.componentInstance.dragEnds).toEqual([{ from: 0, to: 1 }]);
  });

  it('settles after a drag that snapped back, without reporting a change', () => {
    vi.useFakeTimers();
    try {
      const f = setup();
      const v = prepare(f);
      pointer(v, 'pointerdown', 300, 50, 0);
      pointer(v, 'pointermove', 250, 50, 500);
      pointer(v, 'pointerup', 250, 50, 1000);
      f.detectChanges();
      vi.advanceTimersByTime(600);
      expect(f.componentInstance.dragEnds).toEqual([{ from: 0, to: 0 }]);
      expect(f.componentInstance.settled).toEqual([0]);
      expect(f.componentInstance.after).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('moves one stop at a time unless told to skip', () => {
    const flick = (f: ComponentFixture<Host>) => {
      const v = prepare(f);
      pointer(v, 'pointerdown', 300, 50, 0);
      pointer(v, 'pointermove', 240, 50, 10);
      pointer(v, 'pointermove', 120, 50, 40);
      pointer(v, 'pointermove', 0, 50, 70);
      pointer(v, 'pointerup', 0, 50, 80);
      f.detectChanges();
    };
    const one = setup((h) => {
      h.items.set([1, 2, 3, 4, 5, 6]);
      h.infinite.set(false);
    });
    flick(one);
    expect(one.componentInstance.active()).toBe(1);
    const many = setup((h) => {
      h.items.set([1, 2, 3, 4, 5, 6]);
      h.infinite.set(false);
      h.skipSnaps.set(true);
    });
    flick(many);
    expect(many.componentInstance.active()).toBeGreaterThan(2);
  });

  it('coasts to rest between stops when free, still reporting the nearest stop', () => {
    const f = setup((h) => {
      h.dragFree.set(true);
      h.infinite.set(false);
    });
    const v = prepare(f);
    pointer(v, 'pointerdown', 300, 50, 0);
    pointer(v, 'pointermove', 100, 50, 400);
    pointer(v, 'pointerup', 100, 50, 800);
    f.detectChanges();
    expect(Number(cssVar(f, '--andes-carousel-position'))).toBeCloseTo(
      0.775,
      3,
    );
    expect(root(f).dataset['release']).toBe('free');
    expect(f.componentInstance.active()).toBe(1);
  });

  it('never coasts past the last stop', () => {
    const f = setup((h) => {
      h.dragFree.set(true);
      h.infinite.set(false);
    });
    const v = prepare(f);
    pointer(v, 'pointerdown', 380, 50, 0);
    pointer(v, 'pointermove', 280, 50, 10);
    pointer(v, 'pointermove', 0, 50, 20);
    pointer(v, 'pointerup', 0, 50, 30);
    pointer(v, 'pointerdown', 380, 50, 40);
    f.detectChanges();
    expect(Number(cssVar(f, '--andes-carousel-position'))).toBeLessThanOrEqual(
      3,
    );
  });

  it('also follows a right-to-left layout', () => {
    const f = setup();
    f.nativeElement.setAttribute('dir', 'rtl');
    const v = prepare(f);
    pointer(v, 'pointerdown', 100, 50, 0);
    pointer(v, 'pointermove', 300, 50, 400);
    pointer(v, 'pointerup', 300, 50, 800);
    f.detectChanges();
    expect(f.componentInstance.active()).toBe(1);
    f.nativeElement.removeAttribute('dir');
  });

  it('loops past the end by dragging, with the position still counting forward', () => {
    const f = setup();
    f.componentInstance.carousel().goTo(2, false);
    f.detectChanges();
    const v = prepare(f);
    const drag = (id: number, t: number) => {
      pointer(v, 'pointerdown', 300, 50, t, id);
      pointer(v, 'pointermove', 100, 50, t + 400, id);
      pointer(v, 'pointerup', 100, 50, t + 800, id);
      f.detectChanges();
    };
    drag(1, 0);
    expect(f.componentInstance.active()).toBe(3);
    drag(2, 2000);
    expect(f.componentInstance.active()).toBe(0);
    expect(cssVar(f, '--andes-carousel-position')).toBe('4');
  });
});

describe('AndesCarousel layout', () => {
  it('moves by pages, looping page to page', () => {
    const f = setup((h) => {
      h.items.set([1, 2, 3, 4, 5, 6]);
      h.slidesPerView.set(3);
      h.slidesToScroll.set(3);
    });
    const carousel = f.componentInstance.carousel();
    expect(carousel.stopCount()).toBe(2);
    carousel.next();
    f.detectChanges();
    expect(cssVar(f, '--andes-carousel-position')).toBe('3');
    expect(activeStates(f)).toBe('000111');
    carousel.next();
    f.detectChanges();
    expect(cssVar(f, '--andes-carousel-position')).toBe('6');
    expect(f.componentInstance.active()).toBe(0);
  });

  it('accepts auto for slidesToScroll', () => {
    const f = setup((h) => {
      h.items.set([1, 2, 3, 4, 5, 6]);
      h.slidesPerView.set(2);
      h.slidesToScroll.set('auto');
    });
    expect(f.componentInstance.carousel().stopCount()).toBe(3);
  });

  it('centres the selected slide, and trims the stops that would leave blank space', () => {
    const f = setup((h) => {
      h.items.set([1, 2, 3, 4, 5, 6]);
      h.slidesPerView.set(3);
      h.align.set('center');
      h.infinite.set(false);
    });
    expect(cssVar(f, '--andes-carousel-shift')).toBe('1');
    expect(f.componentInstance.carousel().stopCount()).toBe(4);
    f.componentInstance.containScroll.set(false);
    f.detectChanges();
    expect(f.componentInstance.carousel().stopCount()).toBe(6);
    f.componentInstance.carousel().goTo(0, false);
    f.detectChanges();
    expect(cssVar(f, '--andes-carousel-position')).toBe('-1');
  });

  it('lines the selected slide up with the end', () => {
    const f = setup((h) => {
      h.items.set([1, 2, 3, 4, 5, 6]);
      h.slidesPerView.set(3);
      h.align.set('end');
    });
    expect(cssVar(f, '--andes-carousel-shift')).toBe('2');
    f.componentInstance.carousel().goTo(2, false);
    f.detectChanges();
    expect(cssVar(f, '--andes-carousel-position')).toBe('0');
    expect(activeStates(f)).toBe('111000');
  });

  it('publishes peek, aspect ratio and the fill mode', () => {
    const f = setup((h) => {
      h.peek.set(24);
      h.aspectRatio.set('16 / 9');
    });
    expect(cssVar(f, '--andes-carousel-peek')).toBe('24px');
    expect(cssVar(f, '--andes-carousel-aspect')).toBe('16 / 9');
    expect(slides(f)[0].hasAttribute('data-fill')).toBe(true);
    const plain = setup();
    expect(slides(plain)[0].hasAttribute('data-fill')).toBe(false);
    expect(cssVar(plain, '--andes-carousel-peek')).toBe('');
  });

  it('starts on startIndex without announcing a change, then says it is ready', () => {
    const f = setup((h) => h.startIndex.set(2));
    f.detectChanges();
    expect(f.componentInstance.active()).toBe(2);
    expect(cssVar(f, '--andes-carousel-position')).toBe('2');
    expect(f.componentInstance.before).toEqual([]);
    expect(f.componentInstance.readyCount).toBe(1);
  });

  it('prefers a bound active value over startIndex', () => {
    const f = setup((h) => {
      h.startIndex.set(2);
      h.active.set(3);
    });
    expect(f.componentInstance.active()).toBe(3);
  });

  it('picks the slides per view from the width of the carousel itself', () => {
    let resize: (entries: unknown[]) => void = () => undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: typeof resize) {
          resize = callback;
        }
        observe() {
          /* sizes come from the test */
        }
        disconnect() {
          /* nothing to release */
        }
      },
    );
    try {
      const f = setup((h) => {
        h.items.set([1, 2, 3, 4, 5, 6]);
        h.slidesPerView.set({ 0: 1, 360: 2, 560: 3 });
      });
      expect(cssVar(f, '--andes-carousel-per-view')).toBe('1');
      resize([{ target: root(f), contentRect: { width: 400 } }]);
      f.detectChanges();
      expect(cssVar(f, '--andes-carousel-per-view')).toBe('2');
      resize([{ target: root(f), contentRect: { width: 700 } }]);
      f.detectChanges();
      expect(cssVar(f, '--andes-carousel-per-view')).toBe('3');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps the slide shown when the layout changes under it', () => {
    const f = setup((h) => {
      h.items.set([1, 2, 3, 4, 5, 6]);
      h.infinite.set(false);
    });
    f.componentInstance.carousel().goTo(4, false);
    f.detectChanges();
    f.componentInstance.slidesPerView.set(3);
    f.detectChanges();
    expect(f.componentInstance.active()).toBe(3);
    expect(cssVar(f, '--andes-carousel-position')).toBe('3');
  });

  it('is adaptive only on the horizontal axis', () => {
    const f = setup((h) => h.adaptiveHeight.set(true));
    expect(root(f).hasAttribute('data-adaptive')).toBe(true);
    f.componentInstance.orientation.set('vertical');
    f.detectChanges();
    expect(root(f).hasAttribute('data-adaptive')).toBe(false);
  });

  it('wraps without cloning, so assistive technology meets each slide once', () => {
    const f = setup((h) => h.items.set([1, 2, 3, 4, 5, 6]));
    expect(slides(f)).toHaveLength(6);
    expect(f.nativeElement.querySelectorAll('[data-n="1"]')).toHaveLength(1);
  });
});

describe('AndesCarousel arrows', () => {
  const arrow = (f: ComponentFixture<Host>, slot: string) =>
    button(f, slot) as HTMLElement;

  it('reports their placement, size and touch behaviour', () => {
    const f = setup((h) => {
      h.arrows.set('always');
      h.arrowPlacement.set('outside');
      h.arrowSize.set('lg');
      h.hideArrowsOnTouch.set(true);
    });
    expect(root(f).dataset['arrowPlacement']).toBe('outside');
    expect(root(f).dataset['arrowSize']).toBe('lg');
    expect(root(f).dataset['arrowsTouch']).toBe('hide');
  });

  it('tells each arrow whether it sits outside and whether the carousel is vertical', () => {
    const f = setup((h) => {
      h.arrows.set('always');
      h.arrowPlacement.set('outside');
      h.orientation.set('vertical');
    });
    const next = arrow(f, 'carousel-next');
    expect(next.hasAttribute('data-outside')).toBe(true);
    expect(next.hasAttribute('data-vertical')).toBe(true);
  });

  it('renders a custom arrow with its direction and disabled state', () => {
    const f = setup((h) => {
      h.arrows.set('always');
      h.useArrowTemplate.set(true);
      h.infinite.set(false);
    });
    expect(arrow(f, 'carousel-previous').textContent?.trim()).toBe('prev!');
    expect(arrow(f, 'carousel-next').textContent?.trim()).toBe('next');
    expect(
      f.nativeElement.querySelector('.andes-carousel__chevron'),
    ).toBeNull();
  });

  it('is disabled at the ends without looping, and clicking it does nothing', () => {
    const f = setup((h) => {
      h.arrows.set('always');
      h.infinite.set(false);
    });
    arrow(f, 'carousel-previous').click();
    f.detectChanges();
    expect(f.componentInstance.active()).toBe(0);
    expect(arrow(f, 'carousel-previous').getAttribute('aria-disabled')).toBe(
      'true',
    );
    expect(arrow(f, 'carousel-next').getAttribute('aria-disabled')).toBeNull();
  });
});

describe('AndesCarousel API', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('exposes the position as signals', () => {
    const f = setup((h) => h.infinite.set(false));
    const carousel = f.componentInstance.carousel();
    expect(carousel.slideCount()).toBe(4);
    expect(carousel.selectedIndex()).toBe(0);
    expect(carousel.canScrollPrev()).toBe(false);
    expect(carousel.canScrollNext()).toBe(true);
    expect(carousel.isPlaying()).toBe(false);
    carousel.goTo(3);
    f.detectChanges();
    expect(carousel.selectedIndex()).toBe(3);
    expect(carousel.canScrollPrev()).toBe(true);
    expect(carousel.canScrollNext()).toBe(false);
  });

  it('always can scroll when it loops', () => {
    const f = setup();
    expect(f.componentInstance.carousel().canScrollPrev()).toBe(true);
    expect(f.componentInstance.carousel().canScrollNext()).toBe(true);
  });

  it('reports slideChange at once, slideChanged and settled when the move ends', () => {
    const f = setup((h) => h.speed.set(300));
    f.componentInstance.carousel().next();
    f.detectChanges();
    expect(f.componentInstance.before).toEqual([{ from: 0, to: 1 }]);
    expect(f.componentInstance.after).toEqual([]);
    expect(f.componentInstance.settled).toEqual([]);
    vi.advanceTimersByTime(300);
    expect(f.componentInstance.after).toEqual([1]);
    expect(f.componentInstance.settled).toEqual([1]);
  });

  it('says ready once', () => {
    const f = setup();
    f.detectChanges();
    f.componentInstance.carousel().next();
    f.detectChanges();
    expect(f.componentInstance.readyCount).toBe(1);
  });

  it('ignores arrows, dots and keys while moving, when asked to wait', () => {
    const f = setup((h) => {
      h.waitForAnimate.set(true);
      h.speed.set(300);
      h.arrows.set('always');
    });
    button(f, 'carousel-next')?.click();
    button(f, 'carousel-next')?.click();
    dots(f)[3].click();
    keydown(viewport(f), 'ArrowRight');
    f.detectChanges();
    expect(f.componentInstance.active()).toBe(1);
    vi.advanceTimersByTime(300);
    button(f, 'carousel-next')?.click();
    f.detectChanges();
    expect(f.componentInstance.active()).toBe(2);
  });

  it('lets code move it while it is moving, even when waiting', () => {
    const f = setup((h) => {
      h.waitForAnimate.set(true);
      h.speed.set(300);
    });
    const carousel = f.componentInstance.carousel();
    carousel.next();
    carousel.next();
    f.detectChanges();
    expect(f.componentInstance.active()).toBe(2);
  });

  it('turns the transition into a variable the page can override', () => {
    const f = setup((h) => {
      h.speed.set(900);
      h.easing.set('spring');
    });
    expect(cssVar(f, '--andes-carousel-duration')).toBe('900ms');
    expect(cssVar(f, '--andes-carousel-easing')).toMatch(/^cubic-bezier\(/);
    f.componentInstance.easing.set('steps(4, end)');
    f.detectChanges();
    expect(cssVar(f, '--andes-carousel-easing')).toBe('steps(4, end)');
    f.componentInstance.easing.set('ease-in-out');
    f.detectChanges();
    expect(cssVar(f, '--andes-carousel-easing')).toMatch(/^cubic-bezier\(/);
  });

  it('sets nothing when no transition input is given, so the page decides', () => {
    const f = setup();
    expect(cssVar(f, '--andes-carousel-duration')).toBe('');
    expect(cssVar(f, '--andes-carousel-easing')).toBe('');
  });

  it('keeps the model and the carousel in step both ways', () => {
    const f = setup();
    f.componentInstance.active.set(2);
    f.detectChanges();
    expect(f.componentInstance.carousel().selectedIndex()).toBe(2);
    f.componentInstance.carousel().goTo(1);
    f.detectChanges();
    expect(f.componentInstance.active()).toBe(1);
  });
});

describe('AndesCarousel effects', () => {
  it('slides and fades', () => {
    const f = setup((h) => h.effect.set('slide-fade'));
    expect(root(f).dataset['effect']).toBe('slide-fade');
    expect(slides(f)[0].dataset['effect']).toBe('slide-fade');
    expect(cssVar(f, '--andes-carousel-per-view')).toBe('1');
    f.componentInstance.carousel().next();
    f.detectChanges();
    expect(cssVar(f, '--andes-carousel-position')).toBe('1');
    expect(activeStates(f)).toBe('0100');
  });

  it('keeps several slides per view when sliding and fading', () => {
    const f = setup((h) => {
      h.effect.set('slide-fade');
      h.slidesPerView.set(2);
    });
    expect(cssVar(f, '--andes-carousel-per-view')).toBe('2');
  });

  it('is vertical for the sliding effects and horizontal for fade', () => {
    const f = setup((h) => {
      h.effect.set('slide-fade');
      h.orientation.set('vertical');
    });
    expect(root(f).dataset['orientation']).toBe('vertical');
    f.componentInstance.effect.set('fade');
    f.detectChanges();
    expect(root(f).dataset['orientation']).toBe('horizontal');
  });
});

describe('AndesCarousel accessibility', () => {
  it('names every dot and marks the current one', () => {
    const f = setup();
    expect(dots(f).every((d) => d.getAttribute('aria-label'))).toBe(true);
    expect(
      dots(f).filter((d) => d.getAttribute('aria-current') === 'true'),
    ).toHaveLength(1);
  });

  it('puts the rail dots in a labelled group', () => {
    const f = setup((h) => h.dotPlacement.set('end'));
    expect(
      f.nativeElement
        .querySelector('[data-slot="carousel-dots"]')
        .getAttribute('aria-label'),
    ).toBe('Choose a slide');
  });

  it('keeps keyboard focus in the carousel when the focused slide goes inert', () => {
    const f = setup();
    document.body.appendChild(f.nativeElement);
    const inner = f.nativeElement.querySelector('.in-slide') as HTMLElement;
    inner.focus();
    f.componentInstance.carousel().next();
    f.detectChanges();
    f.detectChanges();
    expect(
      root(f).contains(document.activeElement) ||
        document.activeElement === document.body,
    ).toBe(true);
    inner.blur();
  });

  it('does not trap the keyboard: Tab is never swallowed', () => {
    const f = setup();
    expect(keydown(viewport(f), 'Tab').defaultPrevented).toBe(false);
    expect(keydown(viewport(f), 'Escape').defaultPrevented).toBe(false);
  });
});

describe('AndesCarousel stylesheet contract', () => {
  const css = readFileSync('packages/ui/src/lib/carousel/carousel.css', 'utf8');
  const slideCss = readFileSync(
    'packages/ui/src/lib/carousel/carousel-slide.css',
    'utf8',
  );
  /** The sheets on one line each, so a rule can be matched however it was wrapped. */
  const flat = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\( /g, '(');
  const flatSlide = slideCss.replace(/\s+/g, ' ').replace(/\( /g, '(');
  const rule = (selector: string) => {
    const start = flat.indexOf(`${selector} {`);
    return start < 0 ? '' : flat.slice(start, flat.indexOf('}', start));
  };

  it('sets touch-action by axis so the page still scrolls, only while draggable', () => {
    expect(rule(':host([data-draggable]) .andes-carousel__viewport')).toContain(
      'touch-action: pan-y',
    );
    expect(
      rule(
        ":host([data-draggable][data-orientation='vertical']) .andes-carousel__viewport",
      ),
    ).toContain('touch-action: pan-x');
    expect(rule('.andes-carousel__viewport')).not.toContain('touch-action');
  });

  it('shows a grab hand while draggable and a grabbing one while dragging', () => {
    expect(rule(':host([data-draggable]) .andes-carousel__viewport')).toContain(
      'cursor: grab;',
    );
    expect(rule(':host([data-dragging]) .andes-carousel__viewport')).toContain(
      'cursor: grabbing',
    );
    expect(rule('.andes-carousel__viewport')).toContain('cursor: default');
  });

  it('reads every public custom property with a fallback and never defaults it on the host', () => {
    const host = rule(':host');
    for (const name of ['duration', 'easing', 'peek', 'aspect', 'dot-color']) {
      expect(host).not.toMatch(new RegExp(`--andes-carousel-${name}:`));
    }
    for (const name of [
      'easing',
      'peek',
      'aspect',
      'dot-color',
      'dot-active-color',
      'dot-hover-color',
      'dot-size',
      'dot-length',
      'dot-active-length',
      'dot-gap',
      'dot-background',
      'dot-offset',
    ]) {
      expect(flat + flatSlide).toContain(`var(--andes-carousel-${name}`);
    }
  });

  it('draws the three dot styles with a longer active pill', () => {
    expect(rule(".andes-carousel__dots[data-style='line']")).toContain(
      'dot-length',
    );
    expect(rule(".andes-carousel__dots[data-style='pill']")).toContain(
      '--_len-active: var(--andes-carousel-dot-active-length',
    );
    expect(
      rule('.andes-carousel__dot--active .andes-carousel__marker'),
    ).toContain('--_main: var(--_len-active)');
  });

  it('turns the marker round the other way on the rails', () => {
    const rail = rule('.andes-carousel__marker--rail');
    expect(rail).toContain('width: var(--_size)');
    expect(rail).toContain('height: var(--_main)');
  });

  it('lays arrows and dots out in tracks of their own when outside', () => {
    expect(rule(':host')).toContain(
      'grid-template-columns: auto auto minmax(0, 1fr) auto auto',
    );
    expect(
      rule(".andes-carousel__dots[data-outside][data-position='bottom']"),
    ).toContain('grid-area: 5 / 3');
    expect(rule('.andes-carousel__arrow--next[data-outside]')).toContain(
      'grid-area: 3 / 4',
    );
    expect(
      rule('.andes-carousel__arrow--next[data-outside][data-vertical]'),
    ).toContain('grid-area: 4 / 3');
  });

  it('never wraps a selector over several lines, which scoped styles cannot read', () => {
    for (const source of [css, slideCss]) {
      const selectors = source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split(/\{[^{}]*\}/)
        .map((chunk) => chunk.replace(/^[\s}]+/, ''))
        .filter((chunk) => chunk.length > 0 && !chunk.startsWith('@'));
      for (const selector of selectors) {
        for (const part of selector.split(/,\n/)) {
          expect(part.trim()).not.toContain('\n');
        }
      }
    }
  });

  it('hides arrows on touch screens only when asked', () => {
    expect(flat).toMatch(
      /@media \(hover: none\) \{ :host\(\[data-arrows-touch='hide'\]\)/,
    );
  });

  it('drops transitions when reduced motion is on', () => {
    expect(rule(':host([data-reduced])')).toContain('transition: none');
  });

  it('has a forced-colors fallback with system colours', () => {
    const forced = flat.slice(flat.indexOf('@media (forced-colors: active)'));
    expect(forced).toMatch(/ButtonText/);
    expect(forced).toMatch(/Highlight/);
  });

  it('registers the position so the browser can animate it, and transitions it', () => {
    expect(flat).toMatch(
      /@property --andes-carousel-position \{ syntax: '<number>'/,
    );
    expect(rule(':host')).toContain(
      'transition: --andes-carousel-position var(--andes-carousel-speed',
    );
  });

  it('derives every slide offset from the one position, looping with mod()', () => {
    expect(flatSlide).toContain(
      'var(--andes-carousel-index, 0) - var(--andes-carousel-position, 0)',
    );
    expect(flatSlide).toMatch(
      /mod\(var\(--_distance\) - var\(--andes-carousel-window-start/,
    );
  });

  it('lines the selected slide up through one shared shift', () => {
    expect(flatSlide).toContain('var(--andes-carousel-shift, 0)');
  });

  it('fades by opacity alone, and slide-fades by the offset', () => {
    expect(flatSlide).toMatch(/\[data-effect='fade'\]\) \{[^}]*opacity: 0/);
    expect(flatSlide).toMatch(
      /\[data-effect='fade'\]\[data-state='active'\]\) \{[^}]*opacity: 1/,
    );
    expect(flatSlide).toMatch(
      /\[data-effect='slide-fade'\]\) \{[^}]*opacity: calc\(1 - min\(1, var\(--_out\)\)\)/,
    );
  });

  it('lays slides out along the inline axis, flipping in right-to-left', () => {
    expect(flat).toMatch(/:host\(:dir\(rtl\)\) \{ --andes-carousel-dir: -1/);
    expect(flatSlide).toContain('var(--andes-carousel-dir, 1)');
  });

  it('draws a visible focus ring on every control', () => {
    expect(flat).toMatch(
      /\.andes-carousel__dot:focus-visible \{[^}]*outline: 2px solid var\(--andes-color-focus-ring/,
    );
    expect(rule('.andes-carousel__viewport:focus-visible')).toContain(
      'outline: 2px solid',
    );
  });

  it('keeps no hard-coded colour outside a token fallback', () => {
    for (const source of [css, slideCss]) {
      const bare = source.replace(
        /var\([^()]*(?:\([^()]*\)[^()]*)*\)/g,
        'var()',
      );
      expect(bare).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
    }
  });
});
