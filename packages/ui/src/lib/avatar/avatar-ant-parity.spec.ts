import { Component, signal, type TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesAvatar, type AndesAvatarShape } from './avatar';
import { AndesAvatarFallback } from './avatar-fallback';
import { AndesAvatarGroup, type AndesAvatarGroupMax } from './avatar-group';
import {
  AndesAvatarGroupCount,
  type AndesAvatarGroupCountPanelContext,
} from './avatar-group-count';
import { AndesAvatarIcon } from './avatar-icon';
import {
  AndesAvatarImage,
  type AndesAvatarImageErrorEvent,
} from './avatar-image';
import {
  type AndesAvatarSizeInput,
  avatarFontSizeFor,
  resolveAvatarSize,
} from './avatar-size';

/**
 * Coverage for the Ant Design `Avatar` / `Avatar.Group` parity features:
 * pixel and responsive sizes, group-wide size/shape, `max` (with its
 * generated, revealing `+N` chip), the extra `<img>` attributes, the
 * cancelable `loadError`, and fallback text auto-scaling.
 */

// --- Test doubles ----------------------------------------------------------

interface FakeViewport {
  resize(width: number): void;
  listenerCount(): number;
}

/**
 * jsdom has no `matchMedia`. This one answers `(min-width: Npx)` queries
 * against a settable viewport width and fires `change` on every resize, which
 * is all the avatar's breakpoint tracking uses.
 */
function installViewport(initialWidth: number): FakeViewport {
  let width = initialWidth;
  const listeners = new Set<() => void>();
  (window as { matchMedia?: unknown }).matchMedia = (query: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0);
    return {
      media: query,
      get matches() {
        return width >= min;
      },
      addEventListener: (_type: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) =>
        listeners.delete(listener),
    };
  };
  return {
    resize(next: number) {
      width = next;
      [...listeners].forEach((listener) => listener());
    },
    listenerCount: () => listeners.size,
  };
}

function uninstallViewport(): void {
  delete (window as { matchMedia?: unknown }).matchMedia;
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observed: Element[] = [];
  disconnected = false;

  constructor(private readonly callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }

  observe(element: Element): void {
    this.observed.push(element);
  }

  disconnect(): void {
    this.disconnected = true;
  }

  fire(): void {
    this.callback();
  }
}

function setOffsetWidth(element: HTMLElement, width: number): void {
  Object.defineProperty(element, 'offsetWidth', {
    configurable: true,
    get: () => width,
  });
}

// --- Size ------------------------------------------------------------------

describe('resolveAvatarSize', () => {
  it('passes presets and valid pixel sizes straight through', () => {
    expect(resolveAvatarSize('lg', 'xs')).toBe('lg');
    expect(resolveAvatarSize(64, 'xl')).toBe(64);
  });

  it('falls back to md for unset, zero, negative or non-finite sizes', () => {
    expect(resolveAvatarSize(undefined, 'xs')).toBe('md');
    expect(resolveAvatarSize(0, 'xs')).toBe('md');
    expect(resolveAvatarSize(-10, 'xs')).toBe('md');
    expect(resolveAvatarSize(Number.NaN, 'xs')).toBe('md');
  });

  it('cascades a responsive map mobile-first', () => {
    const size = { xs: 24, lg: 64 } as const;

    expect(resolveAvatarSize(size, 'xs')).toBe(24);
    // No `sm`/`md` key: the nearest smaller provided breakpoint applies.
    expect(resolveAvatarSize(size, 'md')).toBe(24);
    expect(resolveAvatarSize(size, 'lg')).toBe(64);
    expect(resolveAvatarSize(size, 'xxl')).toBe(64);
  });

  it('falls back to md when no provided breakpoint is matched yet', () => {
    expect(resolveAvatarSize({ lg: 64 }, 'sm')).toBe('md');
  });

  it('accepts presets as responsive values', () => {
    expect(resolveAvatarSize({ xs: 'sm', md: 'xl' }, 'lg')).toBe('xl');
  });
});

describe('AndesAvatar size', () => {
  @Component({
    imports: [AndesAvatar, AndesAvatarFallback],
    template: `<andes-avatar [size]="size()">
      <andes-avatar-fallback>JD</andes-avatar-fallback>
    </andes-avatar>`,
  })
  class SizeHost {
    readonly size = signal<AndesAvatarSizeInput | undefined>(undefined);
  }

  function create(size: AndesAvatarSizeInput | undefined) {
    const fixture = TestBed.createComponent(SizeHost);
    fixture.componentInstance.size.set(size);
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector(
      'andes-avatar',
    ) as HTMLElement;
    return { fixture, avatar };
  }

  afterEach(() => uninstallViewport());

  it('sizes the box inline for a pixel size, with a proportional font size', () => {
    const { avatar } = create(64);

    expect(avatar.style.width).toBe('64px');
    expect(avatar.style.height).toBe('64px');
    expect(avatar.style.fontSize).toBe(`${avatarFontSizeFor(64)}px`);
    expect(avatar.getAttribute('data-size')).toBe('64');
    expect(avatar.classList).toContain('andes-avatar--custom-size');
    expect(avatar.className).not.toMatch(/andes-avatar--(xs|sm|md|lg|xl)\b/);
  });

  it('keeps a floor under the font size of a tiny pixel avatar', () => {
    expect(avatarFontSizeFor(16)).toBe(10);
    expect(avatarFontSizeFor(40)).toBe(14);
  });

  it('leaves presets to CSS - no inline box size', () => {
    const { avatar } = create('lg');

    expect(avatar.style.width).toBe('');
    expect(avatar.style.fontSize).toBe('');
    expect(avatar.classList).toContain('andes-avatar--lg');
  });

  it('defaults to md when size is unset', () => {
    const { avatar } = create(undefined);

    expect(avatar.classList).toContain('andes-avatar--md');
    expect(avatar.getAttribute('data-size')).toBe('md');
  });

  it('picks the responsive size for the current viewport on first render', () => {
    installViewport(1000);
    const { avatar } = create({ xs: 'sm', md: 48, xl: 72 });

    expect(avatar.style.width).toBe('48px');
  });

  it('follows the viewport as it crosses breakpoints', () => {
    const viewport = installViewport(400);
    const { fixture, avatar } = create({ xs: 'sm', md: 48, xl: 72 });

    expect(avatar.classList).toContain('andes-avatar--sm');
    expect(avatar.style.width).toBe('');

    viewport.resize(1300);
    fixture.detectChanges();
    expect(avatar.style.width).toBe('72px');
    expect(avatar.classList).not.toContain('andes-avatar--sm');

    viewport.resize(800);
    fixture.detectChanges();
    expect(avatar.style.width).toBe('48px');
  });

  it('registers matchMedia listeners only while the size is responsive, and removes them', () => {
    const viewport = installViewport(800);
    const { fixture } = create('md');

    expect(viewport.listenerCount()).toBe(0);

    fixture.componentInstance.size.set({ xs: 24, md: 48 });
    fixture.detectChanges();
    expect(viewport.listenerCount()).toBeGreaterThan(0);

    fixture.componentInstance.size.set(32);
    fixture.detectChanges();
    expect(viewport.listenerCount()).toBe(0);

    fixture.componentInstance.size.set({ xs: 24, md: 48 });
    fixture.detectChanges();
    fixture.destroy();
    expect(viewport.listenerCount()).toBe(0);
  });

  it('renders the xs value where matchMedia is unavailable (SSR, old envs)', () => {
    const { avatar } = create({ xs: 24, md: 48 });

    expect(avatar.style.width).toBe('24px');
  });
});

// --- Group size / shape propagation ----------------------------------------

describe('AndesAvatarGroup size and shape', () => {
  @Component({
    imports: [
      AndesAvatar,
      AndesAvatarFallback,
      AndesAvatarGroup,
      AndesAvatarGroupCount,
    ],
    template: `<andes-avatar-group [size]="groupSize()" [shape]="groupShape()">
      <andes-avatar class="inherits"
        ><andes-avatar-fallback>A</andes-avatar-fallback></andes-avatar
      >
      <andes-avatar class="own" size="xs" shape="rounded">
        <andes-avatar-fallback>B</andes-avatar-fallback>
      </andes-avatar>
      <andes-avatar-group-count [count]="3" />
    </andes-avatar-group>`,
  })
  class GroupHost {
    readonly groupSize = signal<AndesAvatarSizeInput | undefined>('lg');
    readonly groupShape = signal<AndesAvatarShape | undefined>('square');
  }

  function create() {
    const fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      inherits: el.querySelector('andes-avatar.inherits') as HTMLElement,
      own: el.querySelector('andes-avatar.own') as HTMLElement,
      count: el.querySelector('andes-avatar-group-count') as HTMLElement,
    };
  }

  it("applies the group's size and shape to avatars that don't set their own", () => {
    const { inherits, count } = create();

    expect(inherits.getAttribute('data-size')).toBe('lg');
    expect(inherits.getAttribute('data-shape')).toBe('square');
    // The +N chip has to match the avatars it's stacked against.
    expect(count.classList).toContain('andes-avatar-group-count--lg');
    expect(count.classList).toContain('andes-avatar-group-count--square');
  });

  it("lets an avatar's own size and shape win over the group's", () => {
    const { own } = create();

    expect(own.getAttribute('data-size')).toBe('xs');
    expect(own.getAttribute('data-shape')).toBe('rounded');
  });

  it('propagates a pixel group size to avatars and the +N chip', () => {
    const { fixture, inherits, count } = create();
    fixture.componentInstance.groupSize.set(56);
    fixture.detectChanges();

    expect(inherits.style.width).toBe('56px');
    expect(count.style.width).toBe('56px');
  });

  it('falls back to md / circular once the group stops setting them', () => {
    const { fixture, inherits } = create();
    fixture.componentInstance.groupSize.set(undefined);
    fixture.componentInstance.groupShape.set(undefined);
    fixture.detectChanges();

    expect(inherits.getAttribute('data-size')).toBe('md');
    expect(inherits.getAttribute('data-shape')).toBe('circular');
  });
});

// --- Group max -------------------------------------------------------------

describe('AndesAvatarGroup max', () => {
  @Component({
    imports: [
      AndesAvatar,
      AndesAvatarImage,
      AndesAvatarFallback,
      AndesAvatarIcon,
      AndesAvatarGroup,
    ],
    template: `<andes-avatar-group [max]="max()">
        <andes-avatar
          ><andes-avatar-image src="a.png" alt="Alice Moreau"
        /></andes-avatar>
        <andes-avatar
          ><andes-avatar-image src="b.png" alt="Bruno Castell"
        /></andes-avatar>
        <andes-avatar
          ><andes-avatar-image src="c.png" alt="Chika Adeyemi"
        /></andes-avatar>
        <andes-avatar
          ><andes-avatar-icon label="Unassigned seat"
        /></andes-avatar>
        <andes-avatar
          ><andes-avatar-fallback>EB</andes-avatar-fallback></andes-avatar
        >
      </andes-avatar-group>
      <ng-template #panel let-names let-count="count">
        <ul class="custom-panel">
          @for (name of names; track $index) {
            <li>{{ name }}</li>
          }
          <li class="custom-count">{{ count }}</li>
        </ul>
      </ng-template>`,
  })
  class MaxHost {
    readonly max = signal<AndesAvatarGroupMax | undefined>({ count: 2 });
    readonly panel =
      viewChild.required<TemplateRef<AndesAvatarGroupCountPanelContext>>(
        'panel',
      );
  }

  function create(max: AndesAvatarGroupMax | undefined) {
    const fixture = TestBed.createComponent(MaxHost);
    fixture.componentInstance.max.set(max);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const avatars = () =>
      [...el.querySelectorAll('andes-avatar')] as HTMLElement[];
    const count = () =>
      el.querySelector('andes-avatar-group-count') as HTMLElement | null;
    return { fixture, avatars, count };
  }

  it('shows every avatar and no +N chip without max', () => {
    const { avatars, count } = create(undefined);

    expect(avatars().every((avatar) => !avatar.hasAttribute('hidden'))).toBe(
      true,
    );
    expect(count()).toBeNull();
  });

  it('hides the avatars past max.count and generates a +N chip for them', () => {
    const { avatars, count } = create({ count: 2 });

    expect(avatars().map((avatar) => avatar.hasAttribute('hidden'))).toEqual([
      false,
      false,
      true,
      true,
      true,
    ]);
    // The `[hidden]` attribute alone would lose to `:host`'s inline-flex.
    expect(getComputedStyle(avatars()[2]).display).toBe('none');
    expect(count()?.textContent?.trim()).toBe('+3');
  });

  it('renders no chip when max.count covers every avatar', () => {
    const { count } = create({ count: 5 });

    expect(count()).toBeNull();
  });

  it('lists the hidden avatars by alt, icon label, then fallback text', () => {
    const { fixture, count } = create({ count: 2 });
    const chip = count() as HTMLElement;

    chip.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();

    const names = [
      ...chip.querySelectorAll('.andes-avatar-group-count__name'),
    ].map((name) => name.textContent?.trim());
    expect(names).toEqual(['Chika Adeyemi', 'Unassigned seat', 'EB']);
  });

  it('updates as max.count changes', () => {
    const { fixture, avatars, count } = create({ count: 2 });
    fixture.componentInstance.max.set({ count: 4 });
    fixture.detectChanges();

    expect(
      avatars().filter((avatar) => avatar.hasAttribute('hidden')),
    ).toHaveLength(1);
    expect(count()?.textContent?.trim()).toBe('+1');
  });

  it('leaves an inert +N when popover is false', () => {
    const { count } = create({ count: 2, popover: false });

    expect(count()?.querySelector('button')).toBeNull();
    expect(count()?.textContent?.trim()).toBe('+3');
  });

  it("applies max.class and max.style to the chip (Ant's max.style)", () => {
    const { count } = create({
      count: 2,
      class: 'my-overflow',
      style: { 'background-color': 'rgb(1, 2, 3)' },
    });
    const chip = count() as HTMLElement;

    expect(chip.classList).toContain('my-overflow');
    // Merged with, not replacing, the chip's own classes.
    expect(chip.classList).toContain('andes-avatar-group-count');
    expect(chip.style.backgroundColor).toBe('rgb(1, 2, 3)');
  });

  it('passes the popover label and placement through to the chip', () => {
    const { fixture, count } = create({
      count: 2,
      popover: { label: 'Also here', placement: 'bottom' },
    });
    const chip = count() as HTMLElement;
    chip.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();

    expect(chip.classList).toContain('andes-avatar-group-count--bottom');
    expect(chip.getAttribute('data-placement')).toBe('bottom');
    expect(chip.querySelector('[role="tooltip"]')?.textContent).toContain(
      'Also here',
    );
  });

  it('renders a custom panel template with the hidden names and count', () => {
    const { fixture, count } = create({ count: 2 });
    fixture.componentInstance.max.set({
      count: 2,
      popover: { template: fixture.componentInstance.panel() },
    });
    fixture.detectChanges();
    const chip = count() as HTMLElement;
    chip.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();

    const panel = chip.querySelector('.custom-panel') as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.textContent).toContain('Chika Adeyemi');
    expect(panel.querySelector('.custom-count')?.textContent).toBe('3');
  });
});

// --- Group count click trigger ---------------------------------------------

describe('AndesAvatarGroupCount click trigger', () => {
  @Component({
    imports: [AndesAvatarGroupCount],
    template: `<andes-avatar-group-count
        [count]="2"
        [hiddenNames]="['Dana', 'Elliot']"
        trigger="click"
      />
      <button type="button" class="outside">Outside</button>`,
  })
  class ClickHost {}

  function create() {
    const fixture = TestBed.createComponent(ClickHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const chip = el.querySelector('andes-avatar-group-count') as HTMLElement;
    const trigger = chip.querySelector('button') as HTMLButtonElement;
    const panel = () => chip.querySelector('.andes-avatar-group-count__panel');
    return { fixture, el, chip, trigger, panel };
  }

  it('ignores hover and focus, toggling on click instead', () => {
    const { fixture, chip, trigger, panel } = create();

    chip.dispatchEvent(new Event('mouseenter'));
    trigger.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(panel()).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    fixture.detectChanges();
    expect(panel()).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(panel()?.id);
    // A disclosure, not a tooltip: it may hold interactive content.
    expect(panel()?.getAttribute('role')).toBeNull();
    expect(trigger.getAttribute('aria-describedby')).toBeNull();

    chip.dispatchEvent(new Event('mouseleave'));
    fixture.detectChanges();
    expect(panel()).not.toBeNull();

    trigger.click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('closes on a pointerdown outside the chip, but not inside it', () => {
    const { fixture, el, trigger, panel } = create();
    trigger.click();
    fixture.detectChanges();

    (panel() as HTMLElement).dispatchEvent(
      new Event('pointerdown', { bubbles: true }),
    );
    fixture.detectChanges();
    expect(panel()).not.toBeNull();

    (el.querySelector('.outside') as HTMLElement).dispatchEvent(
      new Event('pointerdown', { bubbles: true }),
    );
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('stays open when focus moves into the panel, and closes when it leaves the chip', () => {
    const { fixture, el, trigger, panel } = create();
    trigger.click();
    fixture.detectChanges();

    trigger.dispatchEvent(
      new FocusEvent('blur', { relatedTarget: panel() as HTMLElement }),
    );
    fixture.detectChanges();
    expect(panel()).not.toBeNull();

    (panel() as HTMLElement).dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: el.querySelector('.outside') as HTMLElement,
      }),
    );
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('returns focus to the trigger when Escape closes the panel from inside it', () => {
    const { fixture, trigger, panel } = create();
    trigger.click();
    fixture.detectChanges();
    const openPanel = panel() as HTMLElement;
    openPanel.focus();

    openPanel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

// --- Image -----------------------------------------------------------------

describe('AndesAvatarImage attributes and loadError', () => {
  @Component({
    imports: [AndesAvatar, AndesAvatarImage, AndesAvatarFallback],
    template: `<andes-avatar>
      <andes-avatar-image
        src="a.png"
        alt="Jane Doe"
        [srcSet]="srcSet()"
        [sizes]="sizes()"
        [draggable]="draggable()"
        [crossOrigin]="crossOrigin()"
        (loadError)="onLoadError($event)"
      />
      <andes-avatar-fallback>JD</andes-avatar-fallback>
    </andes-avatar>`,
  })
  class ImageHost {
    readonly srcSet = signal<string | undefined>(undefined);
    readonly sizes = signal<string | undefined>(undefined);
    readonly draggable = signal<boolean | 'true' | 'false' | undefined>(
      undefined,
    );
    readonly crossOrigin = signal<
      'anonymous' | 'use-credentials' | '' | undefined
    >(undefined);
    keepImage = false;
    readonly errors: AndesAvatarImageErrorEvent[] = [];

    onLoadError(event: AndesAvatarImageErrorEvent): void {
      this.errors.push(event);
      if (this.keepImage) {
        event.preventFallback();
      }
    }
  }

  function create() {
    const fixture = TestBed.createComponent(ImageHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      avatar: el.querySelector('andes-avatar') as HTMLElement,
      img: el.querySelector('img') as HTMLImageElement,
      fallback: el.querySelector('andes-avatar-fallback') as HTMLElement,
    };
  }

  it('omits srcset, sizes, draggable and crossorigin by default', () => {
    const { img } = create();

    expect(img.hasAttribute('srcset')).toBe(false);
    expect(img.hasAttribute('sizes')).toBe(false);
    expect(img.hasAttribute('draggable')).toBe(false);
    expect(img.hasAttribute('crossorigin')).toBe(false);
  });

  it('forwards srcSet and sizes to the native img', () => {
    const { fixture, img } = create();
    fixture.componentInstance.srcSet.set('a.png 1x, a@2x.png 2x');
    fixture.componentInstance.sizes.set('40px');
    fixture.detectChanges();

    expect(img.getAttribute('srcset')).toBe('a.png 1x, a@2x.png 2x');
    expect(img.getAttribute('sizes')).toBe('40px');
  });

  it.each([
    [false, 'false'],
    [true, 'true'],
    ['false', 'false'],
    ['true', 'true'],
  ] as const)('maps draggable=%s to draggable="%s"', (value, expected) => {
    const { fixture, img } = create();
    fixture.componentInstance.draggable.set(value);
    fixture.detectChanges();

    expect(img.getAttribute('draggable')).toBe(expected);
  });

  it("accepts crossOrigin '' (anonymous) as well as the named modes", () => {
    const { fixture, img } = create();
    fixture.componentInstance.crossOrigin.set('');
    fixture.detectChanges();
    expect(img.getAttribute('crossorigin')).toBe('');

    fixture.componentInstance.crossOrigin.set('use-credentials');
    fixture.detectChanges();
    expect(img.getAttribute('crossorigin')).toBe('use-credentials');
  });

  it('emits loadError with the native event and falls back by default', () => {
    const { fixture, img, fallback } = create();
    const native = new Event('error');

    img.dispatchEvent(native);
    fixture.detectChanges();

    expect(fixture.componentInstance.errors).toHaveLength(1);
    expect(fixture.componentInstance.errors[0].event).toBe(native);
    expect(img.hidden).toBe(true);
    expect(fallback.hidden).toBe(false);
  });

  it("keeps the image when the handler calls preventFallback() (Ant's onError returning false)", () => {
    const { fixture, img, fallback, avatar } = create();
    fixture.componentInstance.keepImage = true;

    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(img.hidden).toBe(false);
    expect(fallback.hidden).toBe(true);
    // Still truthfully reported as an error.
    expect(avatar.getAttribute('data-status')).toBe('error');
  });

  it('forgets a kept error once the image loads', () => {
    const { fixture, img, fallback } = create();
    fixture.componentInstance.keepImage = true;
    img.dispatchEvent(new Event('error'));
    img.dispatchEvent(new Event('load'));
    fixture.detectChanges();

    expect(img.hidden).toBe(false);
    expect(fallback.hidden).toBe(true);
  });
});

// --- Fallback text auto-scaling --------------------------------------------

describe('AndesAvatarFallback text auto-scaling', () => {
  @Component({
    imports: [AndesAvatar, AndesAvatarFallback],
    template: `<andes-avatar>
      <andes-avatar-fallback [gap]="gap()">{{ text() }}</andes-avatar-fallback>
    </andes-avatar>`,
  })
  class ScaleHost {
    readonly gap = signal(4);
    readonly text = signal('Jhosepmyr');
  }

  const originalResizeObserver = globalThis.ResizeObserver;

  beforeEach(() => {
    FakeResizeObserver.instances = [];
    (globalThis as { ResizeObserver: unknown }).ResizeObserver =
      FakeResizeObserver;
  });

  afterEach(() => {
    (globalThis as { ResizeObserver: unknown }).ResizeObserver =
      originalResizeObserver;
  });

  async function create(hostWidth: number, contentWidth: number) {
    const fixture = TestBed.createComponent(ScaleHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const fallback = fixture.nativeElement.querySelector(
      'andes-avatar-fallback',
    ) as HTMLElement;
    const content = fallback.querySelector(
      '.andes-avatar-fallback__content',
    ) as HTMLElement;
    setOffsetWidth(fallback, hostWidth);
    setOffsetWidth(content, contentWidth);
    const observer = FakeResizeObserver.instances[0];
    observer.fire();
    fixture.detectChanges();
    return { fixture, fallback, content, observer };
  }

  it('observes both the avatar box and the text', async () => {
    const { fallback, content, observer } = await create(40, 20);

    expect(observer.observed).toEqual([fallback, content]);
  });

  it('leaves text that fits unscaled', async () => {
    const { content } = await create(40, 20);

    expect(content.style.transform).toBe('');
  });

  it("shrinks overlong text to the avatar width minus gap on each side (Ant's rule)", async () => {
    // (40 - 2 * 4) / 64 = 0.5
    const { content } = await create(40, 64);

    expect(content.style.transform).toBe('scale(0.5)');
  });

  it('takes the gap into account', async () => {
    const { fixture, content } = await create(40, 64);
    fixture.componentInstance.gap.set(12);
    fixture.detectChanges();

    // (40 - 2 * 12) / 64 = 0.25
    expect(content.style.transform).toBe('scale(0.25)');
  });

  it('ignores a gap that would leave no room at all', async () => {
    const { fixture, content } = await create(40, 64);
    fixture.componentInstance.gap.set(20);
    fixture.detectChanges();

    expect(content.style.transform).toBe('');
  });

  it('does not scale while unmeasurable (hidden, zero-sized)', async () => {
    const { content } = await create(0, 64);

    expect(content.style.transform).toBe('');
  });

  it('disconnects its ResizeObserver on destroy', async () => {
    const { fixture, observer } = await create(40, 20);
    fixture.destroy();

    expect(observer.disconnected).toBe(true);
  });
});

// --- Contrast --------------------------------------------------------------

describe('AndesAvatar fallback text contrast', () => {
  // `--andes-color-muted-foreground` on `--andes-color-muted` is 4.34:1 in the
  // light theme - under WCAG 1.4.3's 4.5:1 for the fallback initials. jsdom
  // doesn't resolve custom properties, so this reads the declared `var()`.
  it('uses the foreground token for avatar and +N text, not muted-foreground', () => {
    @Component({
      imports: [AndesAvatar, AndesAvatarFallback, AndesAvatarGroupCount],
      template: `<andes-avatar
          ><andes-avatar-fallback>JD</andes-avatar-fallback></andes-avatar
        >
        <andes-avatar-group-count [count]="2" />`,
    })
    class ContrastHost {}

    const fixture = TestBed.createComponent(ContrastHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    for (const selector of ['andes-avatar', 'andes-avatar-group-count']) {
      const color = getComputedStyle(
        el.querySelector(selector) as HTMLElement,
      ).color;
      expect(color).toContain('--andes-color-foreground');
    }
  });
});
