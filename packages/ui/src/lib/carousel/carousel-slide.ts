import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { ANDES_CAROUSEL } from './carousel-context';
import { AndesCarouselLazy } from './carousel-lazy';

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
    '[attr.data-orientation]':
      'carousel.isVertical() ? "vertical" : "horizontal"',
    '[style.--andes-carousel-index]': 'index()',
  },
})
export class AndesCarouselSlide {
  protected readonly carousel = inject(ANDES_CAROUSEL);

  /** Extra description appended to the slide's name ("2 of 5: Autumn"). */
  readonly label = input<string | null>(null);

  protected readonly lazy = contentChild(AndesCarouselLazy);

  /** 0-based position among the carousel's slides. */
  readonly index = computed(() => this.carousel.indexOf(this));

  /** Slides ahead of the first visible one, going round when the carousel loops. */
  private readonly ahead = computed(() => {
    const count = this.carousel.count();
    const delta = this.index() - this.carousel.index();
    return this.carousel.wraps() && count > 0
      ? ((delta % count) + count) % count
      : delta;
  });

  /** Whether the slide is one of the visible ones. */
  readonly visible = computed(() => {
    const ahead = this.ahead();
    return ahead >= 0 && ahead < this.carousel.visibleCount();
  });

  private readonly near = computed(() => {
    const ahead = this.ahead();
    const preload = this.carousel.preload();
    const count = this.carousel.count();
    const reach = this.carousel.visibleCount() + preload;
    if (this.carousel.wraps()) {
      return ahead < reach || ahead >= count - preload;
    }
    return ahead >= -preload && ahead < reach;
  });

  private readonly seen = signal(false);
  protected readonly rendered = computed(() => this.seen() || this.near());

  protected readonly name = computed(() => {
    const base = this.carousel
      .resolvedLabels()
      .slide(this.index() + 1, this.carousel.count());
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
