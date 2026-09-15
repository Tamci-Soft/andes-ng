import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesCard,
  AndesCardAction,
  AndesCardContent,
  AndesCardDescription,
  AndesCardFooter,
  AndesCardHeader,
  AndesCardSize,
  AndesCardTitle,
  AndesCardTitleLevel,
  AndesCardVariant,
} from './card';

@Component({
  imports: [
    AndesCard,
    AndesCardHeader,
    AndesCardTitle,
    AndesCardDescription,
    AndesCardAction,
    AndesCardContent,
    AndesCardFooter,
  ],
  template: `<andes-card
    [variant]="variant()"
    [size]="size()"
    [hoverable]="hoverable()"
  >
    <andes-card-header>
      <andes-card-title [level]="titleLevel()">Team members</andes-card-title>
      <andes-card-description
        >Manage who has access to this project.</andes-card-description
      >
      <andes-card-action><button type="button">Edit</button></andes-card-action>
    </andes-card-header>
    <andes-card-content>Body content</andes-card-content>
    <andes-card-footer>Footer content</andes-card-footer>
  </andes-card>`,
})
class HostComponent {
  readonly variant = signal<AndesCardVariant>('outlined');
  readonly size = signal<AndesCardSize>('default');
  readonly hoverable = signal(false);
  readonly titleLevel = signal<AndesCardTitleLevel>(3);
}

describe('AndesCard', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector(
      'andes-card',
    ) as HTMLElement;
    return { fixture, card };
  }

  it('renders the full compound structure with projected content', () => {
    const { card } = createHost();

    expect(card.querySelector('andes-card-header')).toBeTruthy();
    expect(card.querySelector('andes-card-title')?.textContent?.trim()).toBe(
      'Team members',
    );
    expect(
      card.querySelector('andes-card-description')?.textContent?.trim(),
    ).toBe('Manage who has access to this project.');
    expect(card.querySelector('andes-card-action button')).toBeTruthy();
    expect(card.querySelector('andes-card-content')?.textContent?.trim()).toBe(
      'Body content',
    );
    expect(card.querySelector('andes-card-footer')?.textContent?.trim()).toBe(
      'Footer content',
    );
  });

  it('defaults to the outlined variant and default size', () => {
    const { card } = createHost();

    expect(card.classList).toContain('andes-card--outlined');
    expect(card.getAttribute('data-variant')).toBe('outlined');
    expect(card.getAttribute('data-size')).toBe('default');
  });

  it('applies the borderless variant', () => {
    const { fixture, card } = createHost();
    fixture.componentInstance.variant.set('borderless');
    fixture.detectChanges();

    expect(card.classList).toContain('andes-card--borderless');
    expect(card.getAttribute('data-variant')).toBe('borderless');
  });

  it('applies the sm size', () => {
    const { fixture, card } = createHost();
    fixture.componentInstance.size.set('sm');
    fixture.detectChanges();

    expect(card.classList).toContain('andes-card--sm');
    expect(card.getAttribute('data-size')).toBe('sm');
  });

  it('is not hoverable by default', () => {
    const { card } = createHost();

    expect(card.classList).not.toContain('andes-card--hoverable');
  });

  it('applies the hoverable class when requested', () => {
    const { fixture, card } = createHost();
    fixture.componentInstance.hoverable.set(true);
    fixture.detectChanges();

    expect(card.classList).toContain('andes-card--hoverable');
  });

  it('treats a bare hoverable attribute (no brackets) as true, not the string ""', () => {
    @Component({
      imports: [AndesCard],
      template: `<andes-card hoverable>Content</andes-card>`,
    })
    class BareAttrHost {}

    const fixture = TestBed.createComponent(BareAttrHost);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('andes-card');

    expect(card.classList).toContain('andes-card--hoverable');
  });

  it('reflects data-slot on every sub-part', () => {
    const { card } = createHost();

    expect(card.getAttribute('data-slot')).toBe('card');
    expect(
      card.querySelector('andes-card-header')?.getAttribute('data-slot'),
    ).toBe('card-header');
    expect(
      card.querySelector('andes-card-title')?.getAttribute('data-slot'),
    ).toBe('card-title');
    expect(
      card.querySelector('andes-card-description')?.getAttribute('data-slot'),
    ).toBe('card-description');
    expect(
      card.querySelector('andes-card-action')?.getAttribute('data-slot'),
    ).toBe('card-action');
    expect(
      card.querySelector('andes-card-content')?.getAttribute('data-slot'),
    ).toBe('card-content');
    expect(
      card.querySelector('andes-card-footer')?.getAttribute('data-slot'),
    ).toBe('card-footer');
  });

  it('renders the title as a real heading element, defaulting to h3', () => {
    const { card } = createHost();

    expect(
      card.querySelector('h3.andes-card__title')?.textContent?.trim(),
    ).toBe('Team members');
  });

  it.each([2, 4, 5, 6] as const)(
    'renders the title as an h%s when level is set',
    (level) => {
      const { fixture, card } = createHost();
      fixture.componentInstance.titleLevel.set(level);
      fixture.detectChanges();

      expect(
        card.querySelector(`h${level}.andes-card__title`)?.textContent?.trim(),
      ).toBe('Team members');
    },
  );

  it('renders a card with only content, no header or footer', () => {
    @Component({
      imports: [AndesCard, AndesCardContent],
      template: `<andes-card
        ><andes-card-content>Just content</andes-card-content></andes-card
      >`,
    })
    class ContentOnlyHost {}

    const fixture = TestBed.createComponent(ContentOnlyHost);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('andes-card');

    expect(card.querySelector('andes-card-header')).toBeFalsy();
    expect(card.querySelector('andes-card-content')?.textContent?.trim()).toBe(
      'Just content',
    );
  });

  it('supports a cover image placed before the header', () => {
    @Component({
      imports: [AndesCard, AndesCardHeader, AndesCardTitle],
      template: `<andes-card>
        <img src="cover.jpg" alt="" />
        <andes-card-header
          ><andes-card-title>Title</andes-card-title></andes-card-header
        >
      </andes-card>`,
    })
    class CoverHost {}

    const fixture = TestBed.createComponent(CoverHost);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('andes-card');
    const children = Array.from(card.children) as HTMLElement[];

    expect(children[0].tagName).toBe('IMG');
    expect(children[1].tagName.toLowerCase()).toBe('andes-card-header');
  });
});
