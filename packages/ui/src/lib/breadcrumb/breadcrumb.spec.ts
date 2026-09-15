import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesBreadcrumb,
  AndesBreadcrumbEllipsis,
  AndesBreadcrumbItem,
  AndesBreadcrumbLink,
  AndesBreadcrumbList,
  AndesBreadcrumbPage,
  AndesBreadcrumbSeparator,
} from './breadcrumb';

@Component({
  imports: [
    AndesBreadcrumb,
    AndesBreadcrumbList,
    AndesBreadcrumbItem,
    AndesBreadcrumbLink,
    AndesBreadcrumbPage,
    AndesBreadcrumbSeparator,
  ],
  template: `
    <andes-breadcrumb>
      <ol andesBreadcrumbList>
        <li andesBreadcrumbItem>
          <a andesBreadcrumbLink href="/">Home</a>
        </li>
        <li andesBreadcrumbSeparator></li>
        <li andesBreadcrumbItem>
          <a andesBreadcrumbLink href="/library">Library</a>
        </li>
        <li andesBreadcrumbSeparator></li>
        <li andesBreadcrumbItem>
          <span andesBreadcrumbPage>Data</span>
        </li>
      </ol>
    </andes-breadcrumb>
  `,
})
class TrailHostComponent {}

describe('Breadcrumb', () => {
  function createTrail() {
    const fixture = TestBed.createComponent(TrailHostComponent);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
    return { fixture, nav };
  }

  it('renders a nav landmark labelled "breadcrumb" by default', () => {
    const { nav } = createTrail();

    expect(nav.tagName).toBe('NAV');
    expect(nav.getAttribute('aria-label')).toBe('breadcrumb');
  });

  it('allows overriding the aria-label for localization', () => {
    @Component({
      imports: [AndesBreadcrumb],
      template: `<andes-breadcrumb aria-label="Ruta de navegación" />`,
    })
    class LocalizedHost {}

    const fixture = TestBed.createComponent(LocalizedHost);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;

    expect(nav.getAttribute('aria-label')).toBe('Ruta de navegación');
  });

  it('renders aria-label only on the <nav>, never duplicated onto the <andes-breadcrumb> host', () => {
    @Component({
      imports: [AndesBreadcrumb],
      template: `<andes-breadcrumb aria-label="Ruta de navegación" />`,
    })
    class LocalizedHost {}

    const fixture = TestBed.createComponent(LocalizedHost);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(
      'andes-breadcrumb',
    ) as HTMLElement;
    const nav = host.querySelector('nav') as HTMLElement;

    expect(nav.getAttribute('aria-label')).toBe('Ruta de navegación');
    // Angular writes a static/bound attribute matching an input's alias to both the component's
    // own template AND its host element unless the host metadata explicitly nulls it out - this
    // asserts that nulling actually took effect and the host isn't a second element in the a11y
    // tree with the same accessible name as the nav landmark it wraps.
    expect(host.hasAttribute('aria-label')).toBe(false);
  });

  it('reaches the <nav> when aria-label is bound dynamically (as the Storybook control does)', () => {
    @Component({
      imports: [AndesBreadcrumb],
      template: `<andes-breadcrumb [aria-label]="label" />`,
    })
    class DynamicHost {
      label = 'Ruta dinámica';
    }

    const fixture = TestBed.createComponent(DynamicHost);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(
      'andes-breadcrumb',
    ) as HTMLElement;
    const nav = host.querySelector('nav') as HTMLElement;

    expect(nav.getAttribute('aria-label')).toBe('Ruta dinámica');
    expect(host.hasAttribute('aria-label')).toBe(false);
  });

  it('renders the ol/li structure with no intervening wrapper elements', () => {
    const { nav } = createTrail();
    const list = nav.querySelector('ol') as HTMLOListElement;

    expect(list.classList).toContain('andes-breadcrumb-list');
    expect(
      Array.from(list.children).every((child) => child.tagName === 'LI'),
    ).toBe(true);
    expect(list.children.length).toBe(5);
  });

  it('renders crumb links with their href and text preserved', () => {
    const { nav } = createTrail();
    const links = Array.from(nav.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('/');
    expect(links[0].textContent?.trim()).toBe('Home');
    expect(links[0].classList).toContain('andes-breadcrumb-link');
    expect(links[1].getAttribute('href')).toBe('/library');
  });

  it('marks only the last crumb as the current page with aria-current', () => {
    const { nav } = createTrail();
    const page = nav.querySelector('.andes-breadcrumb-page') as HTMLElement;

    expect(page.tagName).toBe('SPAN');
    expect(page.getAttribute('aria-current')).toBe('page');
    expect(page.getAttribute('aria-disabled')).toBe('true');
    expect(page.getAttribute('role')).toBe('link');
    expect(page.textContent?.trim()).toBe('Data');
    // aria-current must not leak onto the non-current crumbs.
    for (const link of Array.from(nav.querySelectorAll('a'))) {
      expect(link.hasAttribute('aria-current')).toBe(false);
    }
  });

  it('renders separators as presentational and hidden from assistive tech', () => {
    const { nav } = createTrail();
    const separators = Array.from(
      nav.querySelectorAll('.andes-breadcrumb-separator'),
    ) as HTMLElement[];

    expect(separators).toHaveLength(2);
    for (const separator of separators) {
      expect(separator.tagName).toBe('LI');
      expect(separator.getAttribute('role')).toBe('presentation');
      expect(separator.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('renders a default chevron icon in the separator when nothing is projected', async () => {
    const { fixture, nav } = createTrail();
    // The default icon is inserted imperatively after the first render (afterNextRender).
    await fixture.whenStable();
    const separator = nav.querySelector(
      '.andes-breadcrumb-separator',
    ) as HTMLElement;

    expect(
      separator.querySelector('svg.andes-breadcrumb-separator__icon'),
    ).toBeTruthy();
  });

  it('renders custom projected content in the separator instead of the default icon', async () => {
    @Component({
      imports: [AndesBreadcrumbSeparator],
      template: `<li andesBreadcrumbSeparator>/</li>`,
    })
    class CustomSeparatorHost {}

    const fixture = TestBed.createComponent(CustomSeparatorHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const separator = fixture.nativeElement.querySelector('li') as HTMLElement;

    expect(separator.textContent?.trim()).toBe('/');
    expect(separator.querySelector('svg')).toBeFalsy();
  });

  it('renders the ellipsis as presentational with a default icon and sr-only text', () => {
    @Component({
      imports: [AndesBreadcrumbEllipsis],
      template: `<andes-breadcrumb-ellipsis></andes-breadcrumb-ellipsis>`,
    })
    class EllipsisHost {}

    const fixture = TestBed.createComponent(EllipsisHost);
    fixture.detectChanges();
    const ellipsis = fixture.nativeElement.querySelector(
      'andes-breadcrumb-ellipsis',
    ) as HTMLElement;

    expect(ellipsis.getAttribute('role')).toBe('presentation');
    expect(ellipsis.getAttribute('aria-hidden')).toBe('true');
    expect(
      ellipsis.querySelector('svg.andes-breadcrumb-ellipsis__icon'),
    ).toBeTruthy();
    expect(
      ellipsis.querySelector('.andes-breadcrumb-ellipsis__sr-only')
        ?.textContent,
    ).toBe('More');
  });

  it('supports a collapsed trail with an ellipsis item between two real crumbs', async () => {
    @Component({
      imports: [
        AndesBreadcrumb,
        AndesBreadcrumbList,
        AndesBreadcrumbItem,
        AndesBreadcrumbLink,
        AndesBreadcrumbEllipsis,
        AndesBreadcrumbSeparator,
        AndesBreadcrumbPage,
      ],
      template: `
        <andes-breadcrumb>
          <ol andesBreadcrumbList>
            <li andesBreadcrumbItem>
              <a andesBreadcrumbLink href="/">Home</a>
            </li>
            <li andesBreadcrumbSeparator></li>
            <li andesBreadcrumbItem>
              <andes-breadcrumb-ellipsis></andes-breadcrumb-ellipsis>
            </li>
            <li andesBreadcrumbSeparator></li>
            <li andesBreadcrumbItem>
              <span andesBreadcrumbPage>Current</span>
            </li>
          </ol>
        </andes-breadcrumb>
      `,
    })
    class CollapsedHost {}

    const fixture = TestBed.createComponent(CollapsedHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const nav = fixture.nativeElement as HTMLElement;

    expect(nav.querySelector('andes-breadcrumb-ellipsis')).toBeTruthy();
    expect(
      nav.querySelector('.andes-breadcrumb-page')?.textContent?.trim(),
    ).toBe('Current');
  });

  // Regression coverage for breadcrumb.css being dead CSS: AndesBreadcrumbList/Item/Link/Page/
  // Separator are directives applied to elements the consumer authors and Angular projects in
  // via <ng-content>, so under the default (Emulated) view encapsulation those elements never
  // carry AndesBreadcrumb's own scope attribute and its stylesheet's selectors never match them.
  // A test asserting `list.classList.toContain('andes-breadcrumb-list')` (as earlier tests in
  // this file do, for structural coverage) would stay green even if every rule in breadcrumb.css
  // were dead, because it never asks the browser/jsdom CSS engine to actually resolve a
  // selector - only real computed styles, read off the actually-compiled component, can catch
  // that regression.
  describe('applies real layout/color styles to the projected list (not dead CSS)', () => {
    function renderStyledTrail() {
      const fixture = TestBed.createComponent(TrailHostComponent);
      fixture.detectChanges();
      const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
      const list = nav.querySelector('ol') as HTMLOListElement;
      const item = nav.querySelector('li') as HTMLLIElement;
      const link = nav.querySelector('a') as HTMLAnchorElement;
      const separator = nav.querySelector(
        '.andes-breadcrumb-separator',
      ) as HTMLElement;
      return { fixture, list, item, link, separator };
    }

    it('lays the <ol> out as a wrapping, centered flex row with a real gap', () => {
      const { list } = renderStyledTrail();
      const style = getComputedStyle(list);

      expect(style.display).toBe('flex');
      expect(style.flexWrap).toBe('wrap');
      expect(style.alignItems).toBe('center');
      // Not asserting the literal --andes-space-2 value: jsdom's CSSOM doesn't resolve custom
      // properties, but a non-empty/non-"normal" gap still proves the rule (and not the
      // display: block browser default for <ol>, which has no gap at all) actually matched.
      expect(style.gap).not.toBe('');
      expect(style.gap).not.toBe('normal');
      expect(style.margin).toBe('0px');
      expect(style.getPropertyValue('list-style')).toBe('none');
    });

    it('lays each <li> item out as a centered inline-flex group', () => {
      const { item } = renderStyledTrail();
      const style = getComputedStyle(item);

      expect(style.display).toBe('inline-flex');
      expect(style.alignItems).toBe('center');
    });

    it('styles the crumb <a> as a plain, underline-free link (not the browser default blue)', () => {
      const { link } = renderStyledTrail();
      const style = getComputedStyle(link);

      expect(style.getPropertyValue('text-decoration')).toBe('none');
      // jsdom's UA stylesheet gives an unstyled <a> "rgb(0, 0, 238)" - proving the color is no
      // longer that default (it now inherits --andes-color-muted-foreground from the list) is
      // enough to show `.andes-breadcrumb-link` actually matched, without hard-coding a
      // resolved token value jsdom won't compute anyway.
      expect(style.color).not.toBe('rgb(0, 0, 238)');
    });

    it('lays the separator out inline and sizes its default chevron icon explicitly', async () => {
      const { fixture, separator } = renderStyledTrail();
      await fixture.whenStable();
      const style = getComputedStyle(separator);
      const svg = separator.querySelector('svg') as SVGElement;

      expect(style.display).toBe('inline-flex');
      expect(style.alignItems).toBe('center');
      // The default chevron is inserted imperatively via Renderer2 (see breadcrumb.ts) using the
      // consumer's own renderer, so it can never be reached by breadcrumb.css's scoped selectors
      // either - it must carry an explicit size so it can't fall back to a replaced element's
      // ~300x150px browser default.
      expect(svg.getAttribute('width')).toBe('14');
      expect(svg.getAttribute('height')).toBe('14');
    });
  });
});
