import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesEmpty,
  AndesEmptyDescription,
  AndesEmptyImage,
  AndesEmptyPreset,
  AndesEmptySize,
} from './empty';

@Component({
  imports: [AndesEmpty],
  template: `
    <ng-template #customImage><i data-test="art">art</i></ng-template>
    <ng-template #customText
      ><b data-test="rich">Nothing <em>here</em></b></ng-template
    >
    <andes-empty
      [preset]="preset()"
      [image]="image()"
      [imageAlt]="alt()"
      [imageStyle]="imageStyle()"
      [description]="description()"
      [size]="size()"
      [announce]="announce()"
    >
      @if (withActions()) {
        <button type="button">Create invoice</button>
      }
    </andes-empty>
  `,
})
class HostComponent {
  readonly customImage =
    viewChild.required<TemplateRef<unknown>>('customImage');
  readonly customText = viewChild.required<TemplateRef<unknown>>('customText');
  readonly preset = signal<AndesEmptyPreset>('default');
  readonly image = signal<AndesEmptyImage | undefined>(undefined);
  readonly alt = signal('');
  readonly imageStyle = signal<Record<string, string> | null>(null);
  readonly description = signal<AndesEmptyDescription | undefined>(undefined);
  readonly size = signal<AndesEmptySize | undefined>(undefined);
  readonly announce = signal(false);
  readonly withActions = signal(false);
}

describe('AndesEmpty', () => {
  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(
      'andes-empty',
    ) as HTMLElement;
    return { fixture, host };
  }

  const text = (host: HTMLElement) =>
    host.querySelector('[data-slot="empty-description"]')?.textContent?.trim();

  it('shows the default illustration and "No data" out of the box', () => {
    const { host } = create();

    expect(host.querySelector('svg.andes-empty__svg--default')).not.toBeNull();
    expect(text(host)).toBe('No data');
    expect(host.getAttribute('data-size')).toBe('default');
  });

  it('hides the built-in illustrations from assistive technology', () => {
    const { host } = create();

    expect(host.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('switches to the simple illustration', () => {
    const { fixture, host } = create();
    fixture.componentInstance.image.set('simple');
    fixture.detectChanges();

    expect(host.querySelector('svg.andes-empty__svg--simple')).not.toBeNull();
    expect(host.querySelector('svg.andes-empty__svg--default')).toBeNull();
  });

  it('renders a custom image URL with its alt text', () => {
    const { fixture, host } = create();
    fixture.componentInstance.image.set('/assets/empty-inbox.png');
    fixture.componentInstance.alt.set('An empty inbox');
    fixture.detectChanges();
    const img = host.querySelector('img') as HTMLImageElement;

    expect(img.getAttribute('src')).toBe('/assets/empty-inbox.png');
    expect(img.alt).toBe('An empty inbox');
    expect(host.querySelector('svg')).toBeNull();
  });

  it('renders a custom image template', () => {
    const { fixture, host } = create();
    fixture.componentInstance.image.set(
      fixture.componentInstance.customImage(),
    );
    fixture.detectChanges();

    expect(
      host.querySelector('[data-slot="empty-image"] [data-test="art"]'),
    ).not.toBeNull();
    expect(host.querySelector('svg')).toBeNull();
  });

  it.each([false, null] as const)(
    'hides the image when image is %s',
    (value) => {
      const { fixture, host } = create();
      fixture.componentInstance.image.set(value);
      fixture.detectChanges();

      expect(host.querySelector('[data-slot="empty-image"]')).toBeNull();
    },
  );

  it('applies imageStyle to the picture box', () => {
    const { fixture, host } = create();
    fixture.componentInstance.imageStyle.set({
      '--andes-empty-image-size': '120px',
    });
    fixture.detectChanges();
    const box = host.querySelector('[data-slot="empty-image"]') as HTMLElement;

    expect(box.style.getPropertyValue('--andes-empty-image-size')).toBe(
      '120px',
    );
  });

  it('shows custom description text or a template, and hides it with false', () => {
    const { fixture, host } = create();
    fixture.componentInstance.description.set('No invoices yet');
    fixture.detectChanges();
    expect(text(host)).toBe('No invoices yet');

    fixture.componentInstance.description.set(
      fixture.componentInstance.customText(),
    );
    fixture.detectChanges();
    expect(host.querySelector('[data-test="rich"]')).not.toBeNull();

    fixture.componentInstance.description.set(false);
    fixture.detectChanges();
    expect(host.querySelector('[data-slot="empty-description"]')).toBeNull();
  });

  it('projects actions below the message', () => {
    const { fixture, host } = create();
    const actions = host.querySelector(
      '[data-slot="empty-actions"]',
    ) as HTMLElement;
    expect(actions.children).toHaveLength(0);

    fixture.componentInstance.withActions.set(true);
    fixture.detectChanges();
    expect(actions.querySelector('button')?.textContent).toBe('Create invoice');
  });

  it('supports the small size', () => {
    const { fixture, host } = create();
    fixture.componentInstance.size.set('small');
    fixture.detectChanges();

    expect(host.getAttribute('data-size')).toBe('small');
  });

  it('is only a live region when asked to announce', () => {
    const { fixture, host } = create();
    expect(host.hasAttribute('role')).toBe(false);

    fixture.componentInstance.announce.set(true);
    fixture.detectChanges();
    expect(host.getAttribute('role')).toBe('status');
  });

  describe('presets', () => {
    it.each([
      ['select', 'simple', 'small', 'No options'],
      ['table', 'simple', 'default', 'No data'],
      ['list', 'simple', 'small', 'No items'],
      ['search', 'default', 'default', 'No results found'],
    ] as const)(
      '%s picks the %s illustration, %s size and "%s"',
      (preset, art, size, message) => {
        const { fixture, host } = create();
        fixture.componentInstance.preset.set(preset);
        fixture.detectChanges();

        expect(
          host.querySelector(`svg.andes-empty__svg--${art}`),
        ).not.toBeNull();
        expect(host.getAttribute('data-size')).toBe(size);
        expect(text(host)).toBe(message);
      },
    );

    it('lets explicit inputs win over the preset', () => {
      const { fixture, host } = create();
      fixture.componentInstance.preset.set('select');
      fixture.componentInstance.image.set('default');
      fixture.componentInstance.size.set('default');
      fixture.componentInstance.description.set('Pick a category first');
      fixture.detectChanges();

      expect(
        host.querySelector('svg.andes-empty__svg--default'),
      ).not.toBeNull();
      expect(host.getAttribute('data-size')).toBe('default');
      expect(text(host)).toBe('Pick a category first');
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/empty/empty.css'),
      'utf8',
    ).replace(/\s+/g, ' ');

    it('colours the illustrations from theme tokens only', () => {
      expect(css).toContain('var(--andes-color-foreground)');
      expect(css).toContain('var(--andes-color-background)');
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(css).not.toMatch(/rgba?\(/);
    });

    it('exposes the picture size and description colour as hooks', () => {
      expect(css).toContain('--andes-empty-image-size');
      expect(css).toContain('--andes-empty-color');
    });

    it('collapses an empty actions area', () => {
      expect(css).toContain('.andes-empty__actions:empty { display: none; }');
    });
  });
});
