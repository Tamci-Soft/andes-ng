import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { ANDES_CAROUSEL } from './carousel-context';
import { AndesCarouselLazy } from './carousel-lazy';

/** Slack for float arithmetic when deciding whether a slide is in view. */
const EPSILON = 1e-6;

/**
 * One slide of an `andes-carousel`. Announced as "slide, 2 of 5" and made inert while it is
 * not in view, so its links and buttons are neither tabbable nor read out.
 */
@Component({
  selector: 'andes-carousel-slide',
  imports: [NgTemplateOutlet],
  template: `
    <ng-content />
    @if (rendered()) {
      @if (lazy(); as lazyContent) {
        <ng-container [ngTemplateOutlet]="lazyContent.templateRef" />
      }
    }
  `,
  styleUrl: './carousel-slide.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    'aria-roledescription': 'slide',
    '[attr.aria-label]': 'name()',
    '[attr.aria-hidden]': 'visible() ? null : "true"',
    '[attr.inert]': 'visible() ? null : ""',
    '[attr.data-slot]': '"carousel-slide"',
    '[attr.data-state]': 'visible() ? "active" : "inactive"',
    '[attr.data-wrap]': 'carousel.wraps() ? "" : null',
    '[attr.data-effect]': 'carousel.effect()',
    '[attr.data-fill]': 'carousel.fill() ? "" : null',
    '[attr.data-orientation]':
      'carousel.isVertical() ? "vertical" : "horizontal"',
    '[style.--andes-carousel-index]': 'index()',
  },
})
export class AndesCarouselSlide {
  protected readonly carousel = inject(ANDES_CAROUSEL);
  /** The slide's own element, for height measuring. */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Extra description appended to the slide's name ("2 of 5: Autumn"). */
  readonly label = input<string | null>(null);

  protected readonly lazy = contentChild(AndesCarouselLazy);

  /** 0-based position among the carousel's slides. */
  readonly index = computed(() => this.carousel.indexOf(this));

  /**
   * Where the slide sits relative to the start edge, in slide steps: 0 is flush with it,
   * a looping slide that left one end shows up at the other.
   */
  private readonly offset = computed(() => {
    const count = this.carousel.slideCount();
    const delta = this.index() - this.carousel.position();
    if (!this.carousel.wraps() || count <= 0) {
      return delta;
    }
    const start = this.carousel.windowStart();
    return start + ((((delta - start) % count) + count) % count);
  });

  /** Whether any part of the slide is inside the view. */
  readonly visible = computed(() => {
    const offset = this.offset();
    return offset > -1 + EPSILON && offset < this.carousel.perView() - EPSILON;
  });

  private readonly near = computed(() => {
    const offset = this.offset();
    const preload = this.carousel.preload();
    return (
      offset > -1 - preload + EPSILON &&
      offset < this.carousel.perView() + preload - EPSILON
    );
  });

  private readonly seen = signal(false);
  protected readonly rendered = computed(() => this.seen() || this.near());

  protected readonly name = computed(() => {
    const base = this.carousel
      .resolvedLabels()
      .slide(this.index() + 1, this.carousel.slideCount());
    const label = this.label();
    return label ? `${base}: ${label}` : base;
  });

  constructor() {
    effect(() => {
      if (this.near()) {
        this.seen.set(true);
      }
    });
  }
}
