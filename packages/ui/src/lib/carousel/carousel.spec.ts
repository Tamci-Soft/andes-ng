import { readFileSync } from 'node:fs';

import { Directionality } from '@angular/cdk/bidi';
import { Component, signal, type TemplateRef, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AndesCarousel } from './carousel';
import { AndesCarouselLazy } from './carousel-lazy';
import { AndesCarouselSlide } from './carousel-slide';
import type {
  AndesCarouselArrows,
  AndesCarouselChange,
  AndesCarouselDotContext,
  AndesCarouselDotPosition,
  AndesCarouselEffect,
  AndesCarouselLabels,
} from './carousel-types';

@Component({
  imports: [AndesCarousel, AndesCarouselSlide, AndesCarouselLazy],
  template: `
    <button type="button" id="outside">Outside</button>
    <ng-template #dot let-index="index" let-active="active">
      <i class="custom-dot">{{ index }}{{ active ? '*' : '' }}</i>
    </ng-template>
    <andes-carousel
      [aria-label]="ariaLabel()"
      [effect]="effect()"
      [autoplay]="autoplay()"
      [autoplaySpeed]="autoplaySpeed()"
      [pauseOnHover]="pauseOnHover()"
      [pauseOnFocus]="pauseOnFocus()"
      [stopOnInteraction]="stopOnInteraction()"
      [dots]="dots()"
      [dotPosition]="dotPosition()"
      [dotProgress]="dotProgress()"
      [dotTemplate]="useDotTemplate() ? dotTemplate() : null"
      [arrows]="arrows()"
      [infinite]="infinite()"
      [vertical]="vertical()"
      [slidesPerView]="slidesPerView()"
      [gap]="gap()"
      [speed]="speed()"
      [draggable]="draggable()"
      [keyboard]="keyboard()"
      [preload]="preload()"
      [labels]="labels()"
      [(active)]="active"
      (beforeChange)="before.push($event)"
      (afterChange)="after.push($event)"
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
  readonly items = signal([1, 2, 3, 4]);
  readonly ariaLabel = signal<string | null>('Featured');
  readonly effect = signal<AndesCarouselEffect>('scroll');
  readonly autoplay = signal(false);
  readonly autoplaySpeed = signal(3000);
  readonly pauseOnHover = signal(true);
  readonly pauseOnFocus = signal(true);
  readonly stopOnInteraction = signal(false);
  readonly dots = signal(true);
  readonly dotPosition = signal<AndesCarouselDotPosition | null>(null);
  readonly dotProgress = signal(false);
  readonly useDotTemplate = signal(false);
  readonly arrows = signal<AndesCarouselArrows>(false);
  readonly infinite = signal(true);
  readonly vertical = signal(false);
  readonly slidesPerView = signal(1);
  readonly gap = signal<number | string>(0);
  readonly speed = signal(400);
  readonly draggable = signal(true);
  readonly keyboard = signal(true);
  readonly preload = signal(1);
  readonly labels = signal<AndesCarouselLabels | null>(null);
  readonly lazy = signal(false);
  readonly active = signal(0);
  readonly before: AndesCarouselChange[] = [];
  readonly after: number[] = [];
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
) {
  const event = new PointerEvent(type, {
    pointerId: id,
    pointerType: 'mouse',
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
      expect(cssVar(f, '--andes-carousel-speed')).toBe('250ms');
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
      expect(cssVar(f, '--andes-carousel-speed')).toBe('400ms');
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
      vi.advanceTimersByTime(500);
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
      const f = setup((h) => h.dotPosition.set('top'));
      const group = () =>
        f.nativeElement.querySelector('[data-slot="carousel-dots"]');
      expect(group().dataset.position).toBe('top');
      f.componentInstance.dotPosition.set(null);
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
      expect(cssVar(f, '--andes-carousel-speed')).toBe('400ms');
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

  describe('stylesheets', () => {
    const css = readFileSync(
      'packages/ui/src/lib/carousel/carousel.css',
      'utf8',
    );
    const slideCss = readFileSync(
      'packages/ui/src/lib/carousel/carousel-slide.css',
      'utf8',
    );

    it('registers the position so the browser can animate it, and transitions it', () => {
      expect(css).toMatch(
        /@property --andes-carousel-position\s*\{[^}]*syntax: '<number>'/,
      );
      expect(css).toMatch(
        /transition: --andes-carousel-position var\(--andes-carousel-speed/,
      );
    });

    it('derives every slide offset from the one position, looping with mod()', () => {
      expect(slideCss).toContain(
        'var(--andes-carousel-index, 0) - var(--andes-carousel-position, 0)',
      );
      expect(slideCss).toMatch(
        /mod\(\s*var\(--_distance\) - var\(--andes-carousel-window-start/,
      );
    });

    it('fades by opacity alone', () => {
      expect(slideCss).toMatch(/\[data-effect='fade'\]\)\s*\{[^}]*opacity: 0/);
      expect(slideCss).toMatch(
        /\[data-effect='fade'\]\[data-state='active'\]\)\s*\{[^}]*opacity: 1/,
      );
    });

    it('drops transitions and the progress bar for reduced motion', () => {
      const reduced = css.slice(
        css.indexOf('@media (prefers-reduced-motion: reduce)'),
      );
      expect(reduced).toMatch(/:host\s*\{\s*transition: none/);
      expect(reduced).toMatch(/::after\s*\{\s*display: none/);
      expect(slideCss).toMatch(
        /prefers-reduced-motion: reduce[\s\S]*transition: none/,
      );
    });

    it('draws a visible focus ring on every control', () => {
      expect(css).toMatch(
        /\.andes-carousel__dot:focus-visible[\s\S]*outline: 2px solid var\(--andes-color-focus-ring/,
      );
      expect(css).toMatch(
        /\.andes-carousel__viewport:focus-visible\s*\{[^}]*outline: 2px solid/,
      );
    });

    it('lays slides out along the inline axis, flipping in right-to-left', () => {
      expect(css).toMatch(
        /:host\(:dir\(rtl\)\)\s*\{\s*--andes-carousel-dir: -1/,
      );
      expect(slideCss).toContain('var(--andes-carousel-dir, 1)');
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
});
