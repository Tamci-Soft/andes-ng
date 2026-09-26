import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesSkeletonAvatar,
  AndesSkeletonAvatarShape,
} from './skeleton-avatar';
import {
  AndesSkeletonButton,
  AndesSkeletonButtonShape,
} from './skeleton-button';
import { AndesSkeletonImage } from './skeleton-image';
import { AndesSkeletonInput } from './skeleton-input';
import { AndesSkeletonNode } from './skeleton-node';
import { AndesSkeletonSize } from './skeleton-utils';

function render<T>(component: new () => T) {
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const part = (slot: string) =>
    root.querySelector(`[data-slot="${slot}"]`) as HTMLElement;
  return { fixture, root, part };
}

describe('AndesSkeletonAvatar', () => {
  @Component({
    imports: [AndesSkeletonAvatar],
    template: `<andes-skeleton-avatar
      [size]="size()"
      [shape]="shape()"
      [active]="active()"
    />`,
  })
  class Host {
    readonly size = signal<AndesSkeletonSize | number>('md');
    readonly shape = signal<AndesSkeletonAvatarShape>('circle');
    readonly active = signal(false);
  }

  it('defaults to a static md circle, hidden from assistive tech', () => {
    const { root, part } = render(Host);
    const avatar = part('skeleton-avatar');

    expect(avatar.classList).toContain('andes-skeleton-avatar--circle');
    expect(avatar.classList).toContain('andes-skeleton-element--md');
    expect(avatar.classList).not.toContain('andes-skeleton-fill--active');
    expect(
      root.querySelector('andes-skeleton-avatar')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it.each(['sm', 'md', 'lg'] as const)('supports the %s size', (size) => {
    const { fixture, part } = render(Host);
    fixture.componentInstance.size.set(size);
    fixture.detectChanges();

    expect(part('skeleton-avatar').classList).toContain(
      `andes-skeleton-element--${size}`,
    );
  });

  it('applies a numeric size as pixels', () => {
    const { fixture, part } = render(Host);
    fixture.componentInstance.size.set(72);
    fixture.detectChanges();
    const avatar = part('skeleton-avatar');

    expect(avatar.style.width).toBe('72px');
    expect(avatar.style.height).toBe('72px');
    expect(avatar.className).not.toMatch(/andes-skeleton-element--(sm|md|lg)/);
  });

  it('supports the square shape and the active shimmer', () => {
    const { fixture, part } = render(Host);
    fixture.componentInstance.shape.set('square');
    fixture.componentInstance.active.set(true);
    fixture.detectChanges();

    expect(part('skeleton-avatar').classList).toContain(
      'andes-skeleton-avatar--square',
    );
    expect(part('skeleton-avatar').classList).toContain(
      'andes-skeleton-fill--active',
    );
  });
});

describe('AndesSkeletonButton', () => {
  @Component({
    imports: [AndesSkeletonButton],
    template: `<andes-skeleton-button
      [size]="size()"
      [shape]="shape()"
      [block]="block()"
      [active]="active()"
    />`,
  })
  class Host {
    readonly size = signal<AndesSkeletonSize>('md');
    readonly shape = signal<AndesSkeletonButtonShape>('default');
    readonly block = signal(false);
    readonly active = signal(false);
  }

  it('defaults to a static md placeholder with the default shape', () => {
    const { root, part } = render(Host);
    const button = part('skeleton-button');

    expect(button.classList).toContain('andes-skeleton-element--md');
    expect(button.className).not.toMatch(/andes-skeleton-button--/);
    expect(button.classList).not.toContain('andes-skeleton-fill--active');
    expect(
      root.querySelector('andes-skeleton-button')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it.each(['round', 'circle', 'square'] as const)(
    'supports the %s shape',
    (shape) => {
      const { fixture, part } = render(Host);
      fixture.componentInstance.shape.set(shape);
      fixture.detectChanges();

      expect(part('skeleton-button').classList).toContain(
        `andes-skeleton-button--${shape}`,
      );
    },
  );

  it.each(['sm', 'lg'] as const)('supports the %s size', (size) => {
    const { fixture, part } = render(Host);
    fixture.componentInstance.size.set(size);
    fixture.detectChanges();

    expect(part('skeleton-button').classList).toContain(
      `andes-skeleton-element--${size}`,
    );
  });

  it('stretches to the parent width when block', () => {
    const { fixture, root, part } = render(Host);
    fixture.componentInstance.block.set(true);
    fixture.componentInstance.active.set(true);
    fixture.detectChanges();

    expect(root.querySelector('andes-skeleton-button')?.classList).toContain(
      'andes-skeleton-element--block',
    );
    expect(part('skeleton-button').classList).toContain(
      'andes-skeleton-element--block',
    );
    expect(part('skeleton-button').classList).toContain(
      'andes-skeleton-fill--active',
    );
  });
});

describe('AndesSkeletonInput', () => {
  @Component({
    imports: [AndesSkeletonInput],
    template: `<andes-skeleton-input
      [size]="size()"
      [block]="block()"
      [active]="active()"
    />`,
  })
  class Host {
    readonly size = signal<AndesSkeletonSize>('md');
    readonly block = signal(false);
    readonly active = signal(false);
  }

  it('defaults to a static, inline md placeholder', () => {
    const { root, part } = render(Host);

    expect(part('skeleton-input').classList).toContain(
      'andes-skeleton-element--md',
    );
    expect(part('skeleton-input').classList).not.toContain(
      'andes-skeleton-element--block',
    );
    expect(
      root.querySelector('andes-skeleton-input')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('supports size, block and active', () => {
    const { fixture, root, part } = render(Host);
    fixture.componentInstance.size.set('lg');
    fixture.componentInstance.block.set(true);
    fixture.componentInstance.active.set(true);
    fixture.detectChanges();
    const input = part('skeleton-input');

    expect(input.classList).toContain('andes-skeleton-element--lg');
    expect(input.classList).toContain('andes-skeleton-element--block');
    expect(input.classList).toContain('andes-skeleton-fill--active');
    expect(root.querySelector('andes-skeleton-input')?.classList).toContain(
      'andes-skeleton-element--block',
    );
  });

  it('treats a bare block attribute as true', () => {
    @Component({
      imports: [AndesSkeletonInput],
      template: `<andes-skeleton-input block />`,
    })
    class BareHost {}
    const { part } = render(BareHost);

    expect(part('skeleton-input').classList).toContain(
      'andes-skeleton-element--block',
    );
  });
});

describe('AndesSkeletonImage', () => {
  @Component({
    imports: [AndesSkeletonImage],
    template: `<andes-skeleton-image
      [width]="width()"
      [height]="height()"
      [active]="active()"
    />`,
  })
  class Host {
    readonly width = signal<string | number | undefined>(undefined);
    readonly height = signal<string | number | undefined>(undefined);
    readonly active = signal(false);
  }

  it('renders an image glyph inside a decorative placeholder', () => {
    const { root, part } = render(Host);

    expect(part('skeleton-image').querySelector('svg')).not.toBeNull();
    expect(part('skeleton-image').style.width).toBe('');
    expect(
      root.querySelector('andes-skeleton-image')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('applies width/height and active', () => {
    const { fixture, part } = render(Host);
    fixture.componentInstance.width.set(200);
    fixture.componentInstance.height.set('8rem');
    fixture.componentInstance.active.set(true);
    fixture.detectChanges();
    const image = part('skeleton-image');

    expect(image.style.width).toBe('200px');
    expect(image.style.height).toBe('8rem');
    expect(image.classList).toContain('andes-skeleton-fill--active');
  });
});

describe('AndesSkeletonNode', () => {
  @Component({
    imports: [AndesSkeletonNode],
    template: `<andes-skeleton-node [width]="width()" [active]="active()"
      ><span class="glyph">chart</span></andes-skeleton-node
    >`,
  })
  class Host {
    readonly width = signal<string | number | undefined>(undefined);
    readonly active = signal(false);
  }

  it('projects its content into a decorative placeholder box', () => {
    const { root, part } = render(Host);

    expect(part('skeleton-node').querySelector('.glyph')?.textContent).toBe(
      'chart',
    );
    expect(
      root.querySelector('andes-skeleton-node')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('applies width and active', () => {
    const { fixture, part } = render(Host);
    fixture.componentInstance.width.set('10rem');
    fixture.componentInstance.active.set(true);
    fixture.detectChanges();

    expect(part('skeleton-node').style.width).toBe('10rem');
    expect(part('skeleton-node').classList).toContain(
      'andes-skeleton-fill--active',
    );
  });
});
