import { Component, signal, type TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesCarousel } from './carousel';
import { AndesCarouselSlide } from './carousel-slide';
import {
  AndesCarouselThumbs,
  type AndesCarouselThumbContext,
} from './carousel-thumbs';

@Component({
  imports: [AndesCarousel, AndesCarouselSlide, AndesCarouselThumbs],
  template: `
    <ng-template #custom let-item let-index="index" let-active="active">
      <span class="custom-thumb">{{ item }}{{ active ? '*' : '' }}</span>
    </ng-template>
    <andes-carousel #main aria-label="Gallery" [infinite]="false">
      @for (n of items; track n) {
        <andes-carousel-slide>Slide {{ n }}</andes-carousel-slide>
      }
    </andes-carousel>
    <andes-carousel-thumbs
      [carousel]="main"
      [items]="images"
      [thumbTemplate]="useTemplate() ? customTemplate() : null"
      [orientation]="orientation()"
    />
  `,
})
class Host {
  readonly customTemplate =
    viewChild.required<TemplateRef<AndesCarouselThumbContext>>('custom');
  readonly main = viewChild.required(AndesCarousel);
  readonly items = [1, 2, 3];
  readonly images = ['a.png', 'b.png', 'c.png'];
  readonly useTemplate = signal(false);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
}

const thumbs = (el: HTMLElement) =>
  Array.from(
    el.querySelectorAll('[data-slot="carousel-thumb"]'),
  ) as HTMLButtonElement[];

function setup(configure?: (host: Host) => void) {
  const fixture = TestBed.createComponent(Host);
  configure?.(fixture.componentInstance);
  fixture.detectChanges();
  return fixture;
}

describe('AndesCarouselThumbs', () => {
  it('renders one named button per item, with the first marked', () => {
    const f = setup();
    const buttons = thumbs(f.nativeElement);
    expect(buttons).toHaveLength(3);
    expect(buttons[0].getAttribute('aria-current')).toBe('true');
    expect(buttons[1].getAttribute('aria-current')).toBeNull();
    expect(buttons[1].getAttribute('aria-label')).toBe('Go to slide 2');
    expect(buttons[0].querySelector('img')?.getAttribute('src')).toBe('a.png');
    expect(
      f.nativeElement
        .querySelector('.andes-carousel-thumbs__strip')
        .getAttribute('aria-label'),
    ).toBe('Slide thumbnails');
  });

  it('drives the carousel when one is pressed', () => {
    const f = setup();
    thumbs(f.nativeElement)[2].click();
    f.detectChanges();
    expect(f.componentInstance.main().selectedIndex()).toBe(2);
    expect(thumbs(f.nativeElement)[2].getAttribute('aria-current')).toBe(
      'true',
    );
  });

  it('follows the carousel when it moves by other means', () => {
    const f = setup();
    f.componentInstance.main().next();
    f.detectChanges();
    expect(thumbs(f.nativeElement)[1].getAttribute('aria-current')).toBe(
      'true',
    );
    expect(thumbs(f.nativeElement)[0].getAttribute('aria-current')).toBeNull();
  });

  it('renders a custom thumbnail with its context', () => {
    const f = setup((h) => h.useTemplate.set(true));
    const first = f.nativeElement.querySelector('.custom-thumb') as HTMLElement;
    expect(first.textContent).toBe('a.png*');
    expect(f.nativeElement.querySelector('img')).toBeNull();
  });

  it('lays out in a column when vertical', () => {
    const f = setup((h) => h.orientation.set('vertical'));
    expect(
      f.nativeElement.querySelector('andes-carousel-thumbs').dataset
        .orientation,
    ).toBe('vertical');
  });
});
