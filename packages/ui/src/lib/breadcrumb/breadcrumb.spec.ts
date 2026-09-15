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
});
