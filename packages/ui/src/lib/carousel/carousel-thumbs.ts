import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  type TemplateRef,
  viewChildren,
} from '@angular/core';

import type { AndesCarousel } from './carousel';
import {
  resolveCarouselLabels,
  type AndesCarouselLabels,
} from './carousel-types';

/** Context of a custom thumbnail template. */
export interface AndesCarouselThumbContext {
  readonly $implicit: unknown;
  readonly index: number;
  readonly active: boolean;
}

/**
 * A strip of thumbnails that stays in step with a carousel showing one slide at a time:
 * the current slide's thumbnail is marked and scrolled into view, and pressing one goes to
 * that slide. `items` are image URLs, or anything at all with a `thumbTemplate`.
 *
 * ```html
 * <andes-carousel #main aria-label="Gallery"> ... </andes-carousel>
 * <andes-carousel-thumbs [carousel]="main" [items]="photoUrls" />
 * ```
 *
 * To keep a second *carousel* in step with the first instead, bind both to one model:
 * `[(active)]="stop"` on each.
 */
@Component({
  selector: 'andes-carousel-thumbs',
  imports: [NgTemplateOutlet],
  template: `
    <div
      class="andes-carousel-thumbs__strip"
      role="group"
      [attr.aria-label]="resolvedLabels().thumbs"
    >
      @for (item of items(); track $index) {
        <button
          #thumb
          type="button"
          class="andes-carousel-thumbs__thumb"
          data-slot="carousel-thumb"
          [class.andes-carousel-thumbs__thumb--active]="$index === current()"
          [attr.aria-label]="resolvedLabels().goTo($index + 1, items().length)"
          [attr.aria-current]="$index === current() ? 'true' : null"
          (click)="carousel().goTo($index)"
        >
          @if (thumbTemplate(); as template) {
            <ng-container
              [ngTemplateOutlet]="template"
              [ngTemplateOutletContext]="{
                $implicit: item,
                index: $index,
                active: $index === current(),
              }"
            />
          } @else {
            <img [src]="item" alt="" draggable="false" />
          }
        </button>
      }
    </div>
  `,
  styleUrl: './carousel-thumbs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-slot]': '"carousel-thumbs"',
    '[attr.data-orientation]': 'orientation()',
  },
})
export class AndesCarouselThumbs {
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  /** The carousel to follow and drive. */
  readonly carousel = input.required<AndesCarousel>();
  /** One entry per slide: an image URL, or any value for `thumbTemplate`. */
  readonly items = input<readonly unknown[]>([]);
  /** Content of each thumbnail, in place of an image. */
  readonly thumbTemplate = input<TemplateRef<AndesCarouselThumbContext> | null>(
    null,
  );
  /** Lay the strip out in a row or in a column. */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly labels = input<AndesCarouselLabels | null>(null);

  private readonly thumbs = viewChildren<ElementRef<HTMLElement>>('thumb');

  protected readonly resolvedLabels = computed(() =>
    resolveCarouselLabels(this.labels()),
  );
  protected readonly current = computed(() => this.carousel().selectedIndex());

  constructor() {
    effect(() => {
      const index = this.current();
      afterNextRender(() => this.reveal(index), { injector: this.injector });
    });
  }

  /** Scrolls the strip (not the page) so the thumbnail of the current slide is centred. */
  private reveal(index: number): void {
    const thumb = this.thumbs()[index]?.nativeElement;
    const strip = thumb?.parentElement;
    if (!thumb || !strip || typeof strip.scrollTo !== 'function') {
      return;
    }
    const smooth = !this.host.ownerDocument.defaultView?.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const behavior = smooth ? 'smooth' : 'auto';
    if (this.orientation() === 'vertical') {
      strip.scrollTo({
        top: thumb.offsetTop - (strip.clientHeight - thumb.offsetHeight) / 2,
        behavior,
      });
    } else {
      strip.scrollTo({
        left: thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2,
        behavior,
      });
    }
  }
}
