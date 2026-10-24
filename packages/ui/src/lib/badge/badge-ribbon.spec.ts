import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesBadgeColor } from './badge';
import { AndesBadgeRibbon, AndesBadgeRibbonPlacement } from './badge-ribbon';

@Component({
  imports: [AndesBadgeRibbon],
  template: `<andes-badge-ribbon
    [text]="text()"
    [color]="color()"
    [placement]="placement()"
    ><div class="card">Card body</div></andes-badge-ribbon
  >`,
})
class HostComponent {
  readonly text = signal<string | undefined>('Hippies');
  readonly color = signal<AndesBadgeColor>('primary');
  readonly placement = signal<AndesBadgeRibbonPlacement>('end');
}

describe('AndesBadgeRibbon', () => {
  function create(apply: (host: HostComponent) => void = () => undefined) {
    const fixture = TestBed.createComponent(HostComponent);
    apply(fixture.componentInstance);
    fixture.detectChanges();
    const ribbon = fixture.nativeElement.querySelector(
      '[data-slot="ribbon"]',
    ) as HTMLElement;
    return { fixture, ribbon };
  }

  it('wraps the projected content and renders the ribbon text', () => {
    const { fixture, ribbon } = create();

    expect(fixture.nativeElement.querySelector('.card').textContent).toBe(
      'Card body',
    );
    expect(
      ribbon.querySelector('.andes-ribbon__text')?.textContent?.trim(),
    ).toBe('Hippies');
  });

  it('defaults to the end placement and the primary color', () => {
    const { ribbon } = create();

    expect(ribbon.classList).toContain('andes-ribbon--end');
    expect(ribbon.classList).toContain('andes-ribbon--primary');
  });

  it('supports the start placement', () => {
    const { ribbon } = create((host) => host.placement.set('start'));

    expect(ribbon.classList).toContain('andes-ribbon--start');
    expect(ribbon.classList).not.toContain('andes-ribbon--end');
  });

  it.each(['secondary', 'danger', 'success', 'warning', 'info'] as const)(
    'supports the %s preset',
    (color) => {
      const { ribbon } = create((host) => host.color.set(color));

      expect(ribbon.classList).toContain(`andes-ribbon--${color}`);
      expect(ribbon.style.getPropertyValue('--andes-ribbon-color')).toBe('');
    },
  );

  it('applies an arbitrary CSS color through --andes-ribbon-color', () => {
    const { ribbon } = create((host) => host.color.set('#fa541c'));

    expect(ribbon.classList).toContain('andes-ribbon--custom');
    expect(ribbon.style.getPropertyValue('--andes-ribbon-color')).toBe(
      '#fa541c',
    );
  });

  it('hides the folded corner from assistive tech', () => {
    const { ribbon } = create();

    expect(
      ribbon
        .querySelector('.andes-ribbon__corner')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('renders a TemplateRef text', () => {
    @Component({
      imports: [AndesBadgeRibbon],
      template: `<ng-template #t><strong>New</strong></ng-template>
        <andes-badge-ribbon [text]="t"><div>Card</div></andes-badge-ribbon>`,
    })
    class TemplateHost {}

    const fixture = TestBed.createComponent(TemplateHost);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.andes-ribbon__text strong')
        ?.textContent,
    ).toBe('New');
  });

  it('sets its own font-family on the wrapper, not the ambient page font', () => {
    const css = readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/badge/badge-ribbon.css'),
      'utf8',
    );
    const rule = css.match(/\.andes-ribbon-wrapper\s*{([^}]*)}/)?.[1] ?? '';

    expect(rule).toContain('font-family: var(--andes-font-family), sans-serif');
    expect(css).not.toMatch(/font:\s*inherit/);
  });
});

describe('AndesBadgeRibbon palette colors', () => {
  it('resolves a palette name to its themed custom property', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.color.set('teal');
    fixture.detectChanges();
    const ribbon = fixture.nativeElement.querySelector(
      '[data-slot="ribbon"]',
    ) as HTMLElement;

    expect(ribbon.classList).toContain('andes-ribbon--custom');
    expect(ribbon.style.getPropertyValue('--andes-ribbon-color')).toBe(
      'var(--_andes-palette-teal)',
    );
  });
});

describe('AndesBadgeRibbon theme colours', () => {
  const css = readFileSync(
    join(process.cwd(), 'packages/ui/src/lib/badge/badge-ribbon.css'),
    'utf8',
  );

  afterEach(() => document.documentElement.removeAttribute('data-andes-theme'));

  it('shades the fold from theme tokens, never a fixed black', () => {
    const fold = css.match(/\.andes-ribbon__corner\s*{([^}]*)}/)?.[1] ?? '';
    expect(fold).not.toMatch(/#000\b|\bblack\b/);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const corner = fixture.nativeElement.querySelector(
      '.andes-ribbon__corner',
    ) as HTMLElement;

    expect(getComputedStyle(corner).backgroundColor).toContain(
      'var(--_andes-ribbon-shade)',
    );
    const ribbon = corner.parentElement as HTMLElement;
    expect(
      getComputedStyle(ribbon).getPropertyValue('--_andes-ribbon-shade'),
    ).toBe('var(--andes-color-foreground)');
  });

  it('shades the fold into the dark page in the dark theme', () => {
    document.documentElement.setAttribute('data-andes-theme', 'dark');
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const ribbon = fixture.nativeElement.querySelector(
      '[data-slot="ribbon"]',
    ) as HTMLElement;

    expect(
      getComputedStyle(ribbon).getPropertyValue('--_andes-ribbon-shade'),
    ).toBe('var(--andes-color-background)');
  });

  it.each(['success', 'warning', 'info'] as const)(
    'gives a %s ribbon a deep fill with light text in the dark theme',
    (color) => {
      document.documentElement.setAttribute('data-andes-theme', 'dark');
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.color.set(color);
      fixture.detectChanges();
      const ribbon = fixture.nativeElement.querySelector(
        '[data-slot="ribbon"]',
      ) as HTMLElement;
      const style = getComputedStyle(ribbon);

      expect(style.getPropertyValue('--andes-ribbon-bg')).toContain(
        `var(--andes-color-${color})`,
      );
      expect(style.getPropertyValue('--andes-ribbon-bg')).toContain(
        'var(--andes-color-background)',
      );
      expect(style.getPropertyValue('--andes-ribbon-fg')).toBe(
        'var(--andes-color-foreground)',
      );
    },
  );
});
