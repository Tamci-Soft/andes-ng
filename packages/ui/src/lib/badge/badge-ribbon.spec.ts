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
