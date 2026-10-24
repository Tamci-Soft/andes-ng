import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesResult,
  AndesResultContent,
  AndesResultRole,
  AndesResultStatus,
  AndesResultTemplateContext,
} from './result';

@Component({
  imports: [AndesResult],
  template: `<andes-result
    [status]="status()"
    [title]="title()"
    [subTitle]="subTitle()"
    [icon]="icon()"
    [role]="role()"
    [titleLevel]="titleLevel()"
    [compact]="compact()"
  >
    @if (withSlots()) {
      <span slot="extra"><button type="button">Back home</button></span>
    }
    @if (withSlots()) {
      <p class="body-copy">Reference 4F2A-91</p>
    }
  </andes-result>`,
})
class HostComponent {
  readonly status = signal<AndesResultStatus>('success');
  readonly title = signal<AndesResultContent>('Payment received');
  readonly subTitle = signal<AndesResultContent>(
    'Order 2024-118 is confirmed.',
  );
  readonly icon = signal<TemplateRef<AndesResultTemplateContext> | undefined>(
    undefined,
  );
  readonly role = signal<AndesResultRole | undefined>(undefined);
  readonly titleLevel = signal<1 | 2 | 3 | 4 | 5 | 6>(2);
  readonly compact = signal(false);
  readonly withSlots = signal(true);
}

@Component({
  imports: [AndesResult],
  template: `
    <ng-template #customIcon let-status="status">
      <span class="custom-icon">{{ status }}!</span>
    </ng-template>
    <ng-template #customTitle let-status
      ><strong class="custom-title">Title for {{ status }}</strong></ng-template
    >
    <andes-result status="error" [icon]="customIcon" [title]="customTitle" />
  `,
})
class TemplateHostComponent {
  readonly iconTemplate =
    viewChild.required<TemplateRef<unknown>>('customIcon');
}

@Component({
  imports: [AndesResult],
  template: `<andes-result status="info">
    <span slot="title">Slotted title</span>
    <span slot="subtitle">Slotted sub title</span>
  </andes-result>`,
})
class SlotHostComponent {}

describe('AndesResult', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = () => fixture.nativeElement as HTMLElement;
    const root = () =>
      el().querySelector('[data-slot="result"]') as HTMLElement;
    return { fixture, el, root, host: fixture.componentInstance };
  }

  describe('rendering', () => {
    it('renders the title, sub title, extra and body', () => {
      const { el } = createHost();

      expect(el().querySelector('.andes-result__title')?.textContent).toContain(
        'Payment received',
      );
      expect(
        el().querySelector('.andes-result__subtitle')?.textContent,
      ).toContain('Order 2024-118');
      expect(el().querySelector('.andes-result__extra button')).toBeTruthy();
      expect(el().querySelector('.andes-result__body .body-copy')).toBeTruthy();
    });

    it('reflects the status on the root and picks a glyph for it', () => {
      const { fixture, root, el, host } = createHost();

      for (const status of [
        'success',
        'error',
        'info',
        'warning',
        'processing',
      ] as const) {
        host.status.set(status);
        fixture.detectChanges();
        expect(root().getAttribute('data-status')).toBe(status);
        expect(root().classList).toContain(`andes-result--${status}`);
        expect(el().querySelector('.andes-result__svg--glyph')).toBeTruthy();
        expect(
          el().querySelector('.andes-result__visual--illustration'),
        ).toBeNull();
      }
    });

    it('draws an illustration for 403, 404 and 500', () => {
      const { fixture, el, host } = createHost();
      const seen = new Set<string>();

      for (const status of ['403', '404', '500'] as const) {
        host.status.set(status);
        fixture.detectChanges();
        const visual = el().querySelector(
          '.andes-result__visual--illustration',
        );
        expect(visual).toBeTruthy();
        expect(
          visual?.querySelector('svg[viewBox="0 0 240 180"]'),
        ).toBeTruthy();
        seen.add(visual?.innerHTML ?? '');
      }

      expect(seen.size).toBe(3);
    });

    it('uses a different glyph for every glyph status', () => {
      const { fixture, el, host } = createHost();
      const glyphs = new Set<string>();

      for (const status of ['success', 'error', 'info', 'warning'] as const) {
        host.status.set(status);
        fixture.detectChanges();
        glyphs.add(
          el().querySelector('.andes-result__visual')?.innerHTML ?? '',
        );
      }

      expect(glyphs.size).toBe(4);
    });

    it('hides empty regions', () => {
      const { fixture, el, host } = createHost();
      host.title.set(null);
      host.subTitle.set(undefined);
      host.withSlots.set(false);
      fixture.detectChanges();

      for (const cls of ['title', 'subtitle', 'extra', 'body']) {
        const node = el().querySelector(`.andes-result__${cls}`) as HTMLElement;
        expect(node.matches(':empty')).toBe(true);
      }
    });

    it('applies the compact class', () => {
      const { fixture, root, host } = createHost();
      host.compact.set(true);
      fixture.detectChanges();

      expect(root().classList).toContain('andes-result--compact');
    });
  });

  describe('content inputs and slots', () => {
    it('renders template inputs with the status in context', () => {
      const fixture = TestBed.createComponent(TemplateHostComponent);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('.custom-icon')?.textContent).toBe('error!');
      expect(el.querySelector('.custom-title')?.textContent).toBe(
        'Title for error',
      );
      expect(el.querySelector('.andes-result__svg')).toBeNull();
    });

    it('falls back to projected title and sub title slots', () => {
      const fixture = TestBed.createComponent(SlotHostComponent);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('.andes-result__title')?.textContent).toContain(
        'Slotted title',
      );
      expect(
        el.querySelector('.andes-result__subtitle')?.textContent,
      ).toContain('Slotted sub title');
    });

    it('lets the text input win over the slot', () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('.andes-result__title').textContent,
      ).not.toContain('Slotted');
    });
  });

  describe('accessibility', () => {
    it('uses a polite status role for non-failures', () => {
      const { fixture, root, host } = createHost();

      for (const status of [
        'success',
        'info',
        'warning',
        'processing',
        '403',
        '404',
      ] as const) {
        host.status.set(status);
        fixture.detectChanges();
        expect(root().getAttribute('role')).toBe('status');
      }
    });

    it('uses the alert role for error and 500', () => {
      const { fixture, root, host } = createHost();

      for (const status of ['error', '500'] as const) {
        host.status.set(status);
        fixture.detectChanges();
        expect(root().getAttribute('role')).toBe('alert');
      }
    });

    it('lets the role input override the derived role, and keeps the host role-free', () => {
      const { fixture, root, el, host } = createHost();
      host.role.set('alert');
      fixture.detectChanges();

      expect(root().getAttribute('role')).toBe('alert');
      expect(el().querySelectorAll('[role="alert"]')).toHaveLength(1);
      expect(el().querySelector('andes-result')?.hasAttribute('role')).toBe(
        false,
      );
    });

    it('exposes the title as a heading with the requested level', () => {
      const { fixture, el, host } = createHost();
      const heading = () =>
        el().querySelector('[role="heading"]') as HTMLElement;

      expect(heading().getAttribute('aria-level')).toBe('2');
      host.titleLevel.set(1);
      fixture.detectChanges();
      expect(heading().getAttribute('aria-level')).toBe('1');
    });

    it('hides the decorative visual from assistive tech', () => {
      const { el } = createHost();

      expect(
        el()
          .querySelector('.andes-result__visual')
          ?.getAttribute('aria-hidden'),
      ).toBe('true');
    });

    it('does not leave a title tooltip on the host', () => {
      const { el } = createHost();

      expect(el().querySelector('andes-result')?.hasAttribute('title')).toBe(
        false,
      );
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/result/result.css'),
      'utf8',
    );

    it('stops the processing spinner under prefers-reduced-motion', () => {
      const block = css.match(
        /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/,
      )?.[0];

      expect(block).toMatch(/\.andes-result__spin\s*\{\s*animation: none/);
    });

    it('takes every colour from tokens', () => {
      const withoutFallbacks = css.replace(
        /var\(--andes-[a-z-]+,\s*#[0-9a-f]{3,8}\)/gi,
        '',
      );

      expect(withoutFallbacks).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(css).not.toMatch(/\brgba?\(|\bhsla?\(/);
    });

    it('uses logical properties for spacing', () => {
      expect(css).not.toMatch(/margin-(top|bottom|left|right)\s*:/);
      expect(css).not.toMatch(/padding-(top|bottom|left|right)\s*:/);
    });
  });
});
