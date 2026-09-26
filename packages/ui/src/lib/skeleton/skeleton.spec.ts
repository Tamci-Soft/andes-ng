import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesSkeleton,
  AndesSkeletonAvatarConfig,
  AndesSkeletonParagraphConfig,
  AndesSkeletonShape,
  AndesSkeletonTitleConfig,
} from './skeleton';

@Component({
  imports: [AndesSkeleton],
  template: `<andes-skeleton
    [shape]="shape()"
    [width]="width()"
    [height]="height()"
    [animated]="animated()"
  />`,
})
class HostComponent {
  readonly shape = signal<AndesSkeletonShape>('text');
  readonly width = signal<string | number | undefined>(undefined);
  readonly height = signal<string | number | undefined>(undefined);
  readonly animated = signal(true);
}

describe('AndesSkeleton (block mode: `shape` set)', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector(
      '[data-slot="skeleton"]',
    ) as HTMLElement;
    const host = fixture.nativeElement.querySelector(
      'andes-skeleton',
    ) as HTMLElement;
    return { fixture, bar, host };
  }

  it('renders the text shape', () => {
    const { bar } = createHost();

    expect(bar.classList).toContain('andes-skeleton--text');
    expect(bar.getAttribute('data-shape')).toBe('text');
  });

  it.each(['text', 'circular', 'rectangular'] as const)(
    'supports the %s shape',
    (shape) => {
      const { fixture, bar } = createHost();
      fixture.componentInstance.shape.set(shape);
      fixture.detectChanges();

      expect(bar.classList).toContain(`andes-skeleton--${shape}`);
      expect(bar.getAttribute('data-shape')).toBe(shape);
    },
  );

  it('always renders aria-hidden on the host, regardless of shape', () => {
    const { host } = createHost();

    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.hasAttribute('aria-busy')).toBe(false);
  });

  it('renders only the single bar - no composite sections or status text', () => {
    const { fixture } = createHost();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(1);
    expect(root.querySelector('[data-slot="skeleton-title"]')).toBeNull();
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('uses the theme-aware placeholder fill', () => {
    const { bar } = createHost();

    expect(bar.classList).toContain('andes-skeleton-fill');
  });

  it('does not set an inline width/height by default', () => {
    const { bar } = createHost();

    expect(bar.style.width).toBe('');
    expect(bar.style.height).toBe('');
  });

  it('applies a numeric width/height as pixels', () => {
    const { fixture, bar } = createHost();
    fixture.componentInstance.width.set(120);
    fixture.componentInstance.height.set(16);
    fixture.detectChanges();

    expect(bar.style.width).toBe('120px');
    expect(bar.style.height).toBe('16px');
  });

  it('applies a string width/height verbatim', () => {
    const { fixture, bar } = createHost();
    fixture.componentInstance.width.set('50%');
    fixture.componentInstance.height.set('3rem');
    fixture.detectChanges();

    expect(bar.style.width).toBe('50%');
    expect(bar.style.height).toBe('3rem');
  });

  it('is animated by default', () => {
    const { bar } = createHost();

    expect(bar.classList).not.toContain('andes-skeleton--static');
  });

  it('can disable the pulse animation', () => {
    const { fixture, bar } = createHost();
    fixture.componentInstance.animated.set(false);
    fixture.detectChanges();

    expect(bar.classList).toContain('andes-skeleton--static');
  });

  it('treats a bare animated attribute (no brackets) as true', () => {
    @Component({
      imports: [AndesSkeleton],
      template: `<andes-skeleton shape="circular" />`,
    })
    class BareAttrHost {}

    const fixture = TestBed.createComponent(BareAttrHost);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('[data-slot="skeleton"]');

    expect(bar.classList).toContain('andes-skeleton--circular');
    expect(bar.classList).not.toContain('andes-skeleton--static');
  });
});

describe('AndesSkeleton (composite)', () => {
  @Component({
    imports: [AndesSkeleton],
    template: `<andes-skeleton
      [loading]="loading()"
      [active]="active()"
      [avatar]="avatar()"
      [title]="title()"
      [paragraph]="paragraph()"
      [round]="round()"
      ><p class="real-content">Real content</p></andes-skeleton
    >`,
  })
  class CompositeHost {
    readonly loading = signal(true);
    readonly active = signal(false);
    readonly avatar = signal<boolean | AndesSkeletonAvatarConfig>(false);
    readonly title = signal<boolean | AndesSkeletonTitleConfig>(true);
    readonly paragraph = signal<boolean | AndesSkeletonParagraphConfig>(true);
    readonly round = signal(false);
  }

  function createComposite(
    setup: (host: CompositeHost) => void = () => undefined,
  ) {
    const fixture = TestBed.createComponent(CompositeHost);
    setup(fixture.componentInstance);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const host = root.querySelector('andes-skeleton') as HTMLElement;
    const q = (slot: string) =>
      root.querySelector(`[data-slot="${slot}"]`) as HTMLElement | null;
    const rows = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          '[data-slot="skeleton-paragraph-row"]',
        ),
      );
    return { fixture, root, host, q, rows };
  }

  it('renders a title and a three-row paragraph by default, last row at 61%', () => {
    const { q, rows } = createComposite();

    expect(q('skeleton-title')).not.toBeNull();
    expect(q('skeleton-title')?.style.width).toBe('38%');
    expect(rows()).toHaveLength(3);
    expect(rows().map((row) => row.style.width)).toEqual(['', '', '61%']);
  });

  it('shows the placeholder instead of the projected content while loading', () => {
    const { root } = createComposite();

    expect(root.querySelector('.real-content')).toBeNull();
  });

  it('renders the projected content once loading is false', () => {
    const { fixture, root, q } = createComposite();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();

    expect(root.querySelector('.real-content')?.textContent).toBe(
      'Real content',
    );
    expect(q('skeleton')).toBeNull();
  });

  it('switches back to the placeholder and keeps a single copy of the content', () => {
    const { fixture, root } = createComposite((h) => h.loading.set(false));
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    expect(root.querySelector('.real-content')).toBeNull();

    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    expect(root.querySelectorAll('.real-content')).toHaveLength(1);
  });

  it('marks the host busy with one status text and hides every bar from assistive tech', () => {
    const { host, q } = createComposite((h) => h.avatar.set(true));

    expect(host.getAttribute('aria-busy')).toBe('true');
    expect(host.hasAttribute('aria-hidden')).toBe(false);
    const statuses = host.querySelectorAll('[role="status"]');
    expect(statuses).toHaveLength(1);
    expect(statuses[0].textContent?.trim()).toBe('Loading…');
    const body = host.querySelector('.andes-skeleton-composite__body');
    expect(body?.getAttribute('aria-hidden')).toBe('true');
    expect(body?.contains(q('skeleton-title'))).toBe(true);
    expect(body?.querySelector('andes-skeleton-avatar')).not.toBeNull();
  });

  it('drops the busy state once loaded', () => {
    const { host } = createComposite((h) => h.loading.set(false));

    expect(host.hasAttribute('aria-busy')).toBe(false);
    expect(host.hasAttribute('aria-hidden')).toBe(false);
    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it('accepts a custom loading label', () => {
    @Component({
      imports: [AndesSkeleton],
      template: `<andes-skeleton loadingLabel="Cargando perfil" />`,
    })
    class LabelHost {}
    const fixture = TestBed.createComponent(LabelHost);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[role="status"]').textContent.trim(),
    ).toBe('Cargando perfil');
  });

  it('renders an avatar (circle, md) and adjusts the defaults when avatar is on', () => {
    const { root, q, rows } = createComposite((h) => h.avatar.set(true));
    const avatar = root.querySelector('[data-slot="skeleton-avatar"]');

    expect(avatar?.classList).toContain('andes-skeleton-avatar--circle');
    expect(avatar?.classList).toContain('andes-skeleton-element--md');
    expect(q('skeleton-title')?.style.width).toBe('50%');
    expect(rows()).toHaveLength(2);
    expect(rows().map((row) => row.style.width)).toEqual(['', '']);
  });

  it('defaults the avatar to square when there is a title but no paragraph', () => {
    const { root } = createComposite((h) => {
      h.avatar.set(true);
      h.paragraph.set(false);
    });

    expect(
      root.querySelector('[data-slot="skeleton-avatar"]')?.classList,
    ).toContain('andes-skeleton-avatar--square');
  });

  it('applies an avatar config', () => {
    const { root } = createComposite((h) =>
      h.avatar.set({ size: 64, shape: 'square' }),
    );
    const avatar = root.querySelector(
      '[data-slot="skeleton-avatar"]',
    ) as HTMLElement;

    expect(avatar.classList).toContain('andes-skeleton-avatar--square');
    expect(avatar.style.width).toBe('64px');
    expect(avatar.style.height).toBe('64px');
  });

  it('can hide the title and the paragraph', () => {
    const { q, rows } = createComposite((h) => {
      h.title.set(false);
      h.paragraph.set(false);
    });

    expect(q('skeleton-title')).toBeNull();
    expect(q('skeleton-paragraph')).toBeNull();
    expect(rows()).toHaveLength(0);
  });

  it('applies a title width', () => {
    const { q } = createComposite((h) => h.title.set({ width: 120 }));

    expect(q('skeleton-title')?.style.width).toBe('120px');
  });

  it('uses the full width for a title with no paragraph', () => {
    const { q } = createComposite((h) => h.paragraph.set(false));

    expect(q('skeleton-title')?.style.width).toBe('');
  });

  it('applies a row count and a single width to the last row only', () => {
    const { rows } = createComposite((h) =>
      h.paragraph.set({ rows: 4, width: 200 }),
    );

    expect(rows().map((row) => row.style.width)).toEqual(['', '', '', '200px']);
  });

  it('keeps the default last-row width when only rows is given', () => {
    const { rows } = createComposite((h) =>
      h.paragraph.set({ rows: 2, width: undefined }),
    );

    expect(rows().map((row) => row.style.width)).toEqual(['', '61%']);
  });

  it('applies an array of widths row by row', () => {
    const { rows } = createComposite((h) =>
      h.paragraph.set({ rows: 3, width: ['80%', 150] }),
    );

    expect(rows().map((row) => row.style.width)).toEqual(['80%', '150px', '']);
  });

  it('renders no paragraph for zero rows', () => {
    const { q } = createComposite((h) => h.paragraph.set({ rows: 0 }));

    expect(q('skeleton-paragraph')).toBeNull();
  });

  it('is static by default and shimmers every bar when active', () => {
    const { fixture, root, rows, q } = createComposite((h) =>
      h.avatar.set(true),
    );
    expect(root.querySelector('.andes-skeleton-fill--active')).toBeNull();

    fixture.componentInstance.active.set(true);
    fixture.detectChanges();

    expect(q('skeleton-title')?.classList).toContain(
      'andes-skeleton-fill--active',
    );
    rows().forEach((row) =>
      expect(row.classList).toContain('andes-skeleton-fill--active'),
    );
    expect(
      root.querySelector('[data-slot="skeleton-avatar"]')?.classList,
    ).toContain('andes-skeleton-fill--active');
  });

  it('rounds the bars', () => {
    const { q } = createComposite((h) => h.round.set(true));

    expect(q('skeleton')?.classList).toContain(
      'andes-skeleton-composite--round',
    );
  });

  it('accepts bare boolean attributes', () => {
    @Component({
      imports: [AndesSkeleton],
      template: `<andes-skeleton active avatar round />`,
    })
    class BareHost {}
    const fixture = TestBed.createComponent(BareHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const host = root.querySelector('andes-skeleton') as HTMLElement;

    expect(root.querySelector('[data-slot="skeleton-avatar"]')).not.toBeNull();
    expect(
      root.querySelector('.andes-skeleton-composite--round'),
    ).not.toBeNull();
    expect(root.querySelector('.andes-skeleton-fill--active')).not.toBeNull();
    expect(host.hasAttribute('title')).toBe(false);
  });

  it('treats a bare loading attribute as true and loading="false" as loaded', () => {
    @Component({
      imports: [AndesSkeleton],
      template: `<andes-skeleton loading><b>a</b></andes-skeleton
        ><andes-skeleton loading="false"><b>b</b></andes-skeleton>`,
    })
    class LoadingAttrHost {}
    const fixture = TestBed.createComponent(LoadingAttrHost);
    fixture.detectChanges();
    const bold = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('b'),
    ).map((b) => b.textContent);

    expect(bold).toEqual(['b']);
  });
});
