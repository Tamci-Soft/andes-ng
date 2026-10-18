import { readFileSync } from 'node:fs';

import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { AndesImage, type AndesImagePlaceholder } from './image';
import type { AndesImageLabels, AndesImagePreviewConfig } from './image-types';

/**
 * jsdom reports zero geometry for every element, which makes CDK treat everything as
 * invisible and so unfocusable. A nominal size lets the viewer's focus handling run.
 */
function withElementGeometry() {
  const descriptors = (['offsetWidth', 'offsetHeight'] as const).map(
    (prop) =>
      [
        prop,
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop),
      ] as const,
  );
  beforeAll(() => {
    for (const [prop] of descriptors) {
      Object.defineProperty(HTMLElement.prototype, prop, {
        configurable: true,
        get: () => 1,
      });
    }
  });
  afterAll(() => {
    for (const [prop, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, prop, descriptor);
      } else {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>)[
          prop
        ];
      }
    }
  });
}

@Component({
  imports: [AndesImage],
  template: `
    <ng-template #maskTemplate><b id="custom-mask">Zoom</b></ng-template>
    <ng-template #placeholderTemplate
      ><i id="custom-placeholder">…</i></ng-template
    >
    <button type="button" id="outside">Outside</button>
    <andes-image
      [src]="src()"
      [alt]="alt()"
      [width]="width()"
      [height]="height()"
      [fallback]="fallback()"
      [placeholder]="placeholder()"
      [placeholderSrc]="placeholderSrc()"
      [preview]="preview()"
      [previewSrc]="previewSrc()"
      [mask]="mask()"
      [labels]="labels()"
      [loading]="loading()"
      [(previewOpen)]="open"
      (loaded)="loadedCount = loadedCount + 1"
      (errored)="erroredCount = erroredCount + 1"
    />
  `,
})
class Host {
  readonly maskTemplate =
    viewChild.required<TemplateRef<unknown>>('maskTemplate');
  readonly placeholderTemplate = viewChild.required<TemplateRef<unknown>>(
    'placeholderTemplate',
  );
  readonly src = signal<string | null>('/a.jpg');
  readonly alt = signal('Harbour at dusk');
  readonly width = signal<number | string | null>(240);
  readonly height = signal<number | string | null>(160);
  readonly fallback = signal<string | null>(null);
  readonly placeholder = signal<AndesImagePlaceholder>(false);
  readonly placeholderSrc = signal<string | null>(null);
  readonly preview = signal<boolean | AndesImagePreviewConfig | ''>(true);
  readonly previewSrc = signal<string | null>(null);
  readonly mask = signal<boolean | string | TemplateRef<unknown>>(true);
  readonly labels = signal<AndesImageLabels | null>(null);
  readonly loading = signal<'lazy' | 'eager'>('lazy');
  readonly open = signal(false);
  loadedCount = 0;
  erroredCount = 0;
}

function setup(configure?: (host: Host) => void) {
  const fixture = TestBed.createComponent(Host);
  configure?.(fixture.componentInstance);
  fixture.detectChanges();
  return fixture;
}

const q = <T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document,
) => root.querySelector<T>(selector);

const image = (f: ComponentFixture<Host>) =>
  q<HTMLElement>('andes-image', f.nativeElement) as HTMLElement;
const img = (f: ComponentFixture<Host>) =>
  q<HTMLImageElement>(
    'img.andes-image__img',
    f.nativeElement,
  ) as HTMLImageElement;
const trigger = (f: ComponentFixture<Host>) =>
  q<HTMLButtonElement>('.andes-image__mask', f.nativeElement);
const viewer = () => q('.andes-image-preview');

function fire(element: Element, type: 'load' | 'error') {
  element.dispatchEvent(new Event(type));
}

function pressEscape() {
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      keyCode: 27,
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe('AndesImage', () => {
  withElementGeometry();

  describe('the picture', () => {
    it('wraps a native img carrying src, alt and lazy loading', () => {
      const f = setup();
      expect(image(f).getAttribute('data-slot')).toBe('image');
      expect(img(f).getAttribute('src')).toBe('/a.jpg');
      expect(img(f).getAttribute('alt')).toBe('Harbour at dusk');
      expect(img(f).getAttribute('loading')).toBe('lazy');
      expect(img(f).getAttribute('decoding')).toBe('async');
    });

    it('takes eager loading', () => {
      const f = setup((h) => h.loading.set('eager'));
      expect(img(f).getAttribute('loading')).toBe('eager');
    });

    it('sizes the box: numbers are px, strings pass through', () => {
      const f = setup((h) => {
        h.width.set(240);
        h.height.set('50%');
      });
      expect(image(f).style.width).toBe('240px');
      expect(image(f).style.height).toBe('50%');
    });

    it('reports load and tracks the state', () => {
      const f = setup();
      expect(image(f).dataset['state']).toBe('loading');
      fire(img(f), 'load');
      f.detectChanges();
      expect(image(f).dataset['state']).toBe('loaded');
      expect(f.componentInstance.loadedCount).toBe(1);
    });

    it('starts loading again when src changes', () => {
      const f = setup();
      fire(img(f), 'load');
      f.detectChanges();
      f.componentInstance.src.set('/b.jpg');
      f.detectChanges();
      expect(image(f).dataset['state']).toBe('loading');
      expect(img(f).getAttribute('src')).toBe('/b.jpg');
    });
  });

  describe('failure', () => {
    it('shows an error box and reports it', () => {
      const f = setup();
      fire(img(f), 'error');
      f.detectChanges();
      expect(image(f).dataset['state']).toBe('error');
      expect(q('[data-slot="image-error"]', f.nativeElement)).not.toBeNull();
      expect(f.componentInstance.erroredCount).toBe(1);
    });

    it('offers no preview for an image that failed', () => {
      const f = setup();
      fire(img(f), 'error');
      f.detectChanges();
      expect(trigger(f)).toBeNull();
    });

    it('swaps in the fallback once, then gives up', () => {
      const f = setup((h) => h.fallback.set('/fallback.jpg'));
      fire(img(f), 'error');
      f.detectChanges();
      expect(img(f).getAttribute('src')).toBe('/fallback.jpg');
      expect(image(f).dataset['state']).toBe('loading');

      fire(img(f), 'error');
      f.detectChanges();
      expect(image(f).dataset['state']).toBe('error');
      expect(f.componentInstance.erroredCount).toBe(2);
    });

    it('shows the fallback straight away when there is no src', () => {
      const f = setup((h) => {
        h.src.set(null);
        h.fallback.set('/fallback.jpg');
      });
      expect(img(f).getAttribute('src')).toBe('/fallback.jpg');
    });

    it('keeps loading while the url has not arrived, and fails for an empty one', () => {
      const f = setup((h) => {
        h.src.set(null);
        h.placeholder.set(true);
      });
      expect(image(f).dataset['state']).toBe('loading');
      expect(img(f).hasAttribute('src')).toBe(false);
      expect(
        q('[data-slot="image-placeholder"]', f.nativeElement),
      ).not.toBeNull();

      f.componentInstance.src.set('');
      f.detectChanges();
      expect(image(f).dataset['state']).toBe('error');

      f.componentInstance.src.set('/a.jpg');
      f.detectChanges();
      expect(image(f).dataset['state']).toBe('loading');
    });

    it('lets a new src recover from an error', () => {
      const f = setup();
      fire(img(f), 'error');
      f.detectChanges();
      f.componentInstance.src.set('/b.jpg');
      f.detectChanges();
      expect(image(f).dataset['state']).toBe('loading');
      expect(q('[data-slot="image-error"]', f.nativeElement)).toBeNull();
    });
  });

  describe('placeholder', () => {
    it('shows nothing by default', () => {
      const f = setup();
      expect(q('[data-slot="image-placeholder"]', f.nativeElement)).toBeNull();
    });

    it('shows a skeleton while loading and removes it on load', () => {
      const f = setup((h) => h.placeholder.set(true));
      const placeholder = q('[data-slot="image-placeholder"]', f.nativeElement);
      expect(placeholder?.classList).toContain(
        'andes-image__placeholder--skeleton',
      );
      expect(placeholder?.getAttribute('aria-hidden')).toBe('true');
      expect(img(f).classList).toContain('andes-image__img--pending');

      fire(img(f), 'load');
      f.detectChanges();
      expect(q('[data-slot="image-placeholder"]', f.nativeElement)).toBeNull();
      expect(img(f).classList).not.toContain('andes-image__img--pending');
    });

    it('blurs the placeholder source', () => {
      const f = setup((h) => {
        h.placeholder.set('blur');
        h.placeholderSrc.set('/tiny.jpg');
      });
      const blurred = q<HTMLImageElement>(
        '.andes-image__blur',
        f.nativeElement,
      );
      expect(blurred?.getAttribute('src')).toBe('/tiny.jpg');
      expect(blurred?.getAttribute('alt')).toBe('');
    });

    it('renders a template placeholder', () => {
      const f = setup();
      f.componentInstance.placeholder.set(
        f.componentInstance.placeholderTemplate(),
      );
      f.detectChanges();
      expect(q('#custom-placeholder', f.nativeElement)).not.toBeNull();
    });
  });

  describe('preview button', () => {
    it('covers the thumbnail with a named, dialog-announcing button', () => {
      const f = setup();
      const button = trigger(f);
      expect(button?.tagName).toBe('BUTTON');
      expect(button?.getAttribute('type')).toBe('button');
      expect(button?.getAttribute('aria-label')).toBe(
        'Preview: Harbour at dusk',
      );
      expect(button?.getAttribute('aria-haspopup')).toBe('dialog');
      expect(button?.textContent).toContain('Preview');
    });

    it('is absent with preview off, in every spelling', () => {
      const f = setup((h) => h.preview.set(false));
      expect(trigger(f)).toBeNull();
      expect(image(f).getAttribute('data-preview')).toBeNull();
    });

    it('treats a bare attribute as on', () => {
      const f = setup((h) => h.preview.set(''));
      expect(trigger(f)).not.toBeNull();
    });

    it('takes a custom label, a template, or none', () => {
      const f = setup((h) => h.mask.set('View'));
      expect(trigger(f)?.textContent).toContain('View');

      f.componentInstance.mask.set(f.componentInstance.maskTemplate());
      f.detectChanges();
      expect(q('#custom-mask', f.nativeElement)).not.toBeNull();

      f.componentInstance.mask.set(false);
      f.detectChanges();
      expect(trigger(f)?.classList).toContain('andes-image__mask--bare');
      expect(trigger(f)?.textContent?.trim()).toBe('');
      // Still a named, working control.
      expect(trigger(f)?.getAttribute('aria-label')).toBe(
        'Preview: Harbour at dusk',
      );
    });

    it('localises the label and the button name', () => {
      const f = setup((h) => h.labels.set({ preview: 'Vista previa' }));
      expect(trigger(f)?.textContent).toContain('Vista previa');
      expect(trigger(f)?.getAttribute('aria-label')).toBe(
        'Vista previa: Harbour at dusk',
      );
    });
  });

  describe('opening the viewer', () => {
    it('opens a modal dialog on click and reports the state', () => {
      const f = setup();
      expect(viewer()).toBeNull();
      trigger(f)?.click();
      f.detectChanges();

      const root = viewer();
      expect(root?.getAttribute('role')).toBe('dialog');
      expect(root?.getAttribute('aria-modal')).toBe('true');
      expect(root?.getAttribute('aria-label')).toBe(
        'Image preview: Harbour at dusk',
      );
      expect(f.componentInstance.open()).toBe(true);
      expect(
        q<HTMLImageElement>('.andes-image-preview__image')?.getAttribute('src'),
      ).toBe('/a.jpg');
    });

    it('opens from the two-way model', () => {
      const f = setup();
      f.componentInstance.open.set(true);
      f.detectChanges();
      expect(viewer()).not.toBeNull();
    });

    it('shows the larger asset when previewSrc is given', () => {
      const f = setup((h) => h.previewSrc.set('/a-large.jpg'));
      expect(img(f).getAttribute('src')).toBe('/a.jpg');
      trigger(f)?.click();
      f.detectChanges();
      expect(
        q<HTMLImageElement>('.andes-image-preview__image')?.getAttribute('src'),
      ).toBe('/a-large.jpg');
    });

    it('falls back to the thumbnail when the larger asset fails', () => {
      const f = setup((h) => h.previewSrc.set('/a-large.jpg'));
      trigger(f)?.click();
      f.detectChanges();
      fire(q('.andes-image-preview__image') as HTMLElement, 'error');
      f.detectChanges();
      expect(
        q<HTMLImageElement>('.andes-image-preview__image')?.getAttribute('src'),
      ).toBe('/a.jpg');
    });

    it('closes with the close button, Escape and a click on the empty stage', () => {
      const f = setup();
      const open = () => {
        trigger(f)?.click();
        f.detectChanges();
      };

      open();
      q<HTMLButtonElement>('.andes-image-preview__close')?.click();
      f.detectChanges();
      expect(viewer()).toBeNull();
      expect(f.componentInstance.open()).toBe(false);

      open();
      pressEscape();
      f.detectChanges();
      expect(viewer()).toBeNull();

      open();
      q('.andes-image-preview__stage')?.click();
      f.detectChanges();
      expect(viewer()).toBeNull();
    });

    it('does not close on a click on the picture itself', () => {
      const f = setup();
      trigger(f)?.click();
      f.detectChanges();
      q('.andes-image-preview__image')?.click();
      f.detectChanges();
      expect(viewer()).not.toBeNull();
    });

    it('moves focus into the viewer and returns it to the thumbnail', () => {
      const f = setup();
      trigger(f)?.focus();
      trigger(f)?.click();
      f.detectChanges();
      expect(q('.andes-image-preview')?.contains(document.activeElement)).toBe(
        true,
      );

      pressEscape();
      f.detectChanges();
      expect(document.activeElement).toBe(trigger(f));
    });

    it('makes the page behind inert while open', () => {
      const f = setup();
      trigger(f)?.click();
      f.detectChanges();
      expect(
        f.nativeElement.closest('[inert]') ??
          f.nativeElement.hasAttribute('inert'),
      ).toBeTruthy();
      pressEscape();
      f.detectChanges();
      expect(f.nativeElement.hasAttribute('inert')).toBe(false);
    });
  });

  describe('stylesheets', () => {
    const css = readFileSync('packages/ui/src/lib/image/image.css', 'utf8');
    const previewCss = readFileSync(
      'packages/ui/src/lib/image/image-preview.css',
      'utf8',
    );

    it('reveals the thumbnail label on hover and keyboard focus with the focus ring', () => {
      expect(css).toMatch(
        /\.andes-image__mask:hover,\s*\.andes-image__mask:focus-visible\s*\{[^}]*opacity: 1/,
      );
      expect(css).toMatch(
        /\.andes-image__mask:focus-visible\s*\{[^}]*outline: 2px solid var\(--andes-color-focus-ring/,
      );
    });

    it('runs the placeholder shimmer slowly and stops it for reduced motion', () => {
      expect(css).toMatch(/animation: andes-image-shimmer 1\.8s/);
      expect(css).toMatch(
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*andes-image__placeholder--skeleton::after\s*\{\s*animation: none/,
      );
    });

    it('fades the scrim in over 150ms and plays the exit window of 120ms ease-in', () => {
      expect(previewCss).toMatch(
        /\.andes-image-preview-backdrop\s*\{[^}]*transition-duration: var\(--andes-motion-duration-mid, 150ms\)/,
      );
      expect(previewCss).toMatch(
        /\.andes-image-preview\[data-andes-closing\]\s*\{[^}]*animation: andes-image-preview-fade-out\s+var\(--andes-motion-duration-fast, 120ms\)\s+var\(--andes-motion-ease-in[^;]*forwards/,
      );
      expect(previewCss).toMatch(
        /\.andes-image-preview-backdrop\[data-andes-closing\]\s*\{[^}]*animation: andes-image-preview-fade-out[^;]*forwards/,
      );
    });

    it('drops every animation and transition for reduced motion', () => {
      const reduced = previewCss.slice(
        previewCss.indexOf('@media (prefers-reduced-motion: reduce)'),
      );
      expect(reduced).toMatch(
        /\.andes-image-preview\[data-andes-closing\][\s\S]*animation: none/,
      );
      expect(reduced).toMatch(
        /\.andes-image-preview__image[\s\S]*transition: none/,
      );
    });

    it('keeps no hard-coded colour outside a token fallback', () => {
      for (const source of [css, previewCss]) {
        const withoutFallbacks = source.replace(
          /var\([^()]*(?:\([^()]*\)[^()]*)*\)/g,
          'var()',
        );
        expect(withoutFallbacks).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
      }
    });
  });
});
