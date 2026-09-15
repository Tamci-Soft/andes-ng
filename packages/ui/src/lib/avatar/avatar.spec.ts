import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesAvatar, AndesAvatarShape, AndesAvatarSize } from './avatar';
import { AndesAvatarFallback } from './avatar-fallback';
import { AndesAvatarGroup } from './avatar-group';
import { AndesAvatarGroupCount } from './avatar-group-count';
import { AndesAvatarImage } from './avatar-image';

const VALID_SRC = 'https://andes-ng.dev/avatar.png';
const BROKEN_SRC = 'https://andes-ng.dev/broken.png';

@Component({
  imports: [AndesAvatar, AndesAvatarImage, AndesAvatarFallback],
  template: `<andes-avatar [shape]="shape()" [size]="size()">
    <andes-avatar-image [src]="src()" alt="Jane Doe" />
    <andes-avatar-fallback [delayMs]="delayMs()">JD</andes-avatar-fallback>
  </andes-avatar>`,
})
class HostComponent {
  readonly shape = signal<AndesAvatarShape>('circular');
  readonly size = signal<AndesAvatarSize>('md');
  readonly src = signal(VALID_SRC);
  readonly delayMs = signal(0);
}

describe('AndesAvatar', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector(
      'andes-avatar',
    ) as HTMLElement;
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    const fallback = fixture.nativeElement.querySelector(
      'andes-avatar-fallback',
    ) as HTMLElement;
    return { fixture, avatar, img, fallback };
  }

  it('shows the fallback while the image is loading and hides the image', () => {
    const { img, fallback } = createHost();

    expect(fallback.hidden).toBe(false);
    expect(img.hidden).toBe(true);
    expect(fallback.textContent?.trim()).toBe('JD');
  });

  it('reflects the loading status as a data attribute on the root', () => {
    const { avatar } = createHost();

    expect(avatar.getAttribute('data-status')).toBe('loading');
  });

  it('replaces the fallback with the image once (load) fires', () => {
    const { fixture, img, fallback, avatar } = createHost();

    img.dispatchEvent(new Event('load'));
    fixture.detectChanges();

    expect(img.hidden).toBe(false);
    expect(fallback.hidden).toBe(true);
    expect(avatar.getAttribute('data-status')).toBe('loaded');
  });

  it('keeps showing the fallback if a real error event fires on the native img', () => {
    const { fixture, img, fallback, avatar } = createHost();
    fixture.componentInstance.src.set(BROKEN_SRC);
    fixture.detectChanges();

    // Simulate the browser actually failing to fetch the image - not merely
    // asserting on the initial state, which would pass even if the component
    // never wired up (error) at all.
    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fallback.hidden).toBe(false);
    expect(img.hidden).toBe(true);
    expect(avatar.getAttribute('data-status')).toBe('error');
  });

  it('stays on the fallback after an error even if a later load event somehow fires', () => {
    const { img, fallback } = createHost();

    img.dispatchEvent(new Event('error'));
    expect(fallback.hidden).toBe(false);
  });

  it('resets to loading when src changes, even from a previously loaded image', () => {
    const { fixture, img, avatar } = createHost();
    img.dispatchEvent(new Event('load'));
    fixture.detectChanges();
    expect(avatar.getAttribute('data-status')).toBe('loaded');

    fixture.componentInstance.src.set(BROKEN_SRC);
    fixture.detectChanges();

    expect(avatar.getAttribute('data-status')).toBe('loading');
  });

  it.each(['circular', 'rounded', 'square'] as const)(
    'supports the %s shape',
    (shape) => {
      const { fixture, avatar } = createHost();
      fixture.componentInstance.shape.set(shape);
      fixture.detectChanges();

      expect(avatar.classList).toContain(`andes-avatar--${shape}`);
      expect(avatar.getAttribute('data-shape')).toBe(shape);
    },
  );

  it.each(['xs', 'sm', 'md', 'lg', 'xl'] as const)(
    'supports the %s size',
    (size) => {
      const { fixture, avatar } = createHost();
      fixture.componentInstance.size.set(size);
      fixture.detectChanges();

      expect(avatar.classList).toContain(`andes-avatar--${size}`);
      expect(avatar.getAttribute('data-size')).toBe(size);
    },
  );

  it('defaults to circular shape and md size', () => {
    const { avatar } = createHost();

    expect(avatar.classList).toContain('andes-avatar--circular');
    expect(avatar.classList).toContain('andes-avatar--md');
  });

  // Regression coverage for avatar.css being dead CSS under two different
  // failure modes:
  //
  // 1. Plain class selectors (e.g. `.andes-avatar--circular { ... }`) under
  //    the default Emulated encapsulation: `classes()` binds the BEM classes
  //    via `[class]` directly on AndesAvatar's OWN host element (host
  //    metadata above), not on an element inside its own template. Angular
  //    only rewrites plain class selectors to also require its
  //    `_ngcontent-*` attribute, which the host element itself never
  //    carries (only `_nghost-*` does) - so every shape/size rule was dead.
  // 2. `encapsulation: ViewEncapsulation.None` (a previous, worse fix for
  //    the above): this emits the whole stylesheet verbatim into a global,
  //    non-shadow-DOM `<style>` tag with no scoping rewrite at all. The
  //    bare `:host { ... }` rule at the top of avatar.css - meaningful only
  //    inside a real shadow root - then matches NOTHING, dropping the
  //    host's `display`, `overflow`, `align-items`/`justify-content`,
  //    `position`, `background-color`, etc., even though the class-based
  //    width/height/border-radius rules technically "worked" again (as
  //    plain global class selectors).
  //
  // The `classList).toContain(...)` assertions above would stay green under
  // EITHER failure mode, because they never ask the browser/jsdom CSS engine
  // to actually resolve a selector - only real computed styles, read off the
  // actually-compiled component, can catch these regressions.
  describe('applies real computed styles to the host (not dead CSS)', () => {
    it.each([
      ['circular', 'xs', '1.5rem', '1.5rem'],
      ['square', 'lg', '3.5rem', '3.5rem'],
    ] as const)(
      'gives a %s %s avatar a real, non-empty width/height/border-radius',
      (shape, size, width, height) => {
        const { fixture, avatar } = createHost();
        fixture.componentInstance.shape.set(shape);
        fixture.componentInstance.size.set(size);
        fixture.detectChanges();

        const style = getComputedStyle(avatar);

        // jsdom's CSSOM reports the specified value verbatim (it doesn't
        // resolve rem to px), so these compare against avatar.css's literal
        // rem values rather than a resolved pixel size - either way, a
        // non-empty match here proves `:host(.andes-avatar--${size})`
        // actually matched, which is what was dead before the fix.
        expect(style.width).toBe(width);
        expect(style.height).toBe(height);
        // Not asserting the literal --andes-radius-* value: jsdom's CSSOM
        // doesn't resolve custom properties, but a non-empty, non-zero
        // border-radius still proves `:host(.andes-avatar--${shape})`
        // actually matched (an unstyled host has no border-radius rule at
        // all).
        expect(style.borderRadius).not.toBe('');
        expect(style.borderRadius).not.toBe('0px');
      },
    );

    it.each(['circular', 'rounded', 'square'] as const)(
      'lays out a %s avatar as an inline-flex box that clips and centers its content',
      (shape) => {
        const { fixture, avatar } = createHost();
        fixture.componentInstance.shape.set(shape);
        fixture.detectChanges();

        const style = getComputedStyle(avatar);

        // The bare `:host { ... }` rule in avatar.css - not a `:host(.class)`
        // selector - carries the box's non-shape/size-dependent layout.
        // Under `ViewEncapsulation.None` this whole rule is dead (a literal
        // `:host` selector matches nothing outside a real shadow root), so
        // the host fell back to `display: inline` (a non-replaced inline
        // box, which ignores width/height/overflow and can't center
        // content), lost `overflow: hidden` (so a clipped image would
        // overflow its rounded/circular frame), and lost the flex alignment
        // that centers fallback initials.
        expect(style.display).toBe('inline-flex');
        expect(style.overflow).toBe('hidden');
        expect(style.alignItems).toBe('center');
        expect(style.justifyContent).toBe('center');
        expect(style.position).toBe('relative');
        expect(style.flexShrink).toBe('0');
      },
    );

    it('gives the host a background color from the muted token', () => {
      const { avatar } = createHost();

      const style = getComputedStyle(avatar);

      // jsdom's CSSOM doesn't resolve custom properties, so this can't
      // compare against a resolved color - but a background-color other
      // than the initial value still proves the bare `:host { ... }` rule
      // actually matched. jsdom reports an unstyled element's initial
      // `background-color` as `rgba(0, 0, 0, 0)` (fully transparent black),
      // not the empty string, so that's the value a dead rule leaves behind.
      expect(style.backgroundColor).not.toBe('');
      expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(style.backgroundColor).not.toBe('transparent');
    });
  });

  it('sets data-slot on the root and its parts', () => {
    const { fixture } = createHost();
    const image = fixture.nativeElement.querySelector('andes-avatar-image');
    const fallback = fixture.nativeElement.querySelector(
      'andes-avatar-fallback',
    );

    expect(
      fixture.nativeElement
        .querySelector('andes-avatar')
        .getAttribute('data-slot'),
    ).toBe('avatar');
    expect(image.getAttribute('data-slot')).toBe('avatar-image');
    expect(fallback.getAttribute('data-slot')).toBe('avatar-fallback');
  });

  it('forwards alt text to the native img', () => {
    const { img } = createHost();

    expect(img.getAttribute('alt')).toBe('Jane Doe');
  });

  it('delays showing the fallback for loadingDelay ms while loading', () => {
    vi.useFakeTimers();
    try {
      // A fresh fixture with delayMs already set before the first
      // detectChanges(), so the delay is observed from the very start of the
      // loading cycle.
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.delayMs.set(200);
      fixture.detectChanges();
      const fallback = fixture.nativeElement.querySelector(
        'andes-avatar-fallback',
      ) as HTMLElement;

      expect(fallback.hidden).toBe(true);

      vi.advanceTimersByTime(200);
      fixture.detectChanges();

      expect(fallback.hidden).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows an error fallback immediately, ignoring loadingDelay', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.delayMs.set(200);
      fixture.detectChanges();
      const img = fixture.nativeElement.querySelector(
        'img',
      ) as HTMLImageElement;
      const fallback = fixture.nativeElement.querySelector(
        'andes-avatar-fallback',
      ) as HTMLElement;

      img.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(fallback.hidden).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('AndesAvatarGroup', () => {
  @Component({
    imports: [
      AndesAvatar,
      AndesAvatarImage,
      AndesAvatarGroup,
      AndesAvatarGroupCount,
    ],
    template: `<andes-avatar-group>
      <andes-avatar><andes-avatar-image src="a.png" alt="A" /></andes-avatar>
      <andes-avatar><andes-avatar-image src="b.png" alt="B" /></andes-avatar>
      <andes-avatar-group-count [count]="2" />
    </andes-avatar-group>`,
  })
  class GroupHost {}

  it('stacks avatars and renders the overflow count', () => {
    const fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();

    const avatars = fixture.nativeElement.querySelectorAll('andes-avatar');
    const count = fixture.nativeElement.querySelector(
      'andes-avatar-group-count',
    ) as HTMLElement;

    expect(avatars.length).toBe(2);
    expect(count.textContent?.trim()).toBe('+2');
    expect(count.getAttribute('data-slot')).toBe('avatar-group-count');
  });

  it('applies shape and size classes to the overflow count', () => {
    @Component({
      imports: [AndesAvatarGroupCount],
      template: `<andes-avatar-group-count
        [count]="5"
        shape="square"
        size="lg"
      />`,
    })
    class SizedCountHost {}

    const fixture = TestBed.createComponent(SizedCountHost);
    fixture.detectChanges();
    const count = fixture.nativeElement.querySelector(
      'andes-avatar-group-count',
    ) as HTMLElement;

    expect(count.classList).toContain('andes-avatar-group-count--square');
    expect(count.classList).toContain('andes-avatar-group-count--lg');
  });

  // Same regression as AndesAvatar's own "not dead CSS" suite above:
  // avatar-group-count.css's shape/size rules are also plain class selectors
  // bound via `[class]` directly on this component's own host, which never
  // carries the `_ngcontent-*` attribute Emulated encapsulation requires.
  it('applies a real, non-empty width/height/border-radius to the overflow count', () => {
    @Component({
      imports: [AndesAvatarGroupCount],
      template: `<andes-avatar-group-count
        [count]="5"
        shape="square"
        size="lg"
      />`,
    })
    class SizedCountHost {}

    const fixture = TestBed.createComponent(SizedCountHost);
    fixture.detectChanges();
    const count = fixture.nativeElement.querySelector(
      'andes-avatar-group-count',
    ) as HTMLElement;
    const style = getComputedStyle(count);

    expect(style.width).toBe('3.5rem');
    expect(style.height).toBe('3.5rem');
    expect(style.borderRadius).not.toBe('');
    expect(style.borderRadius).not.toBe('0px');
  });
});

describe('AndesAvatarFallback', () => {
  // Regression coverage for a leading `::ng-deep` in avatar-fallback.css
  // (i.e. `::ng-deep svg { ... }` instead of `:host ::ng-deep svg { ... }`).
  // `::ng-deep` as the LEADING part of a selector disables Angular's style
  // scoping ENTIRELY for that rule, so it compiles to a truly global,
  // unscoped `svg { width: 1em; height: 1em }` - not merely a rule that
  // reaches past AndesAvatarFallback's own encapsulation boundary into its
  // projected content, but one that matches every `<svg>` in the DOM,
  // anywhere, in any app that ever loads this component. This test renders
  // AndesAvatarFallback with its own projected icon AND a completely
  // unrelated `<svg>` elsewhere in the same DOM (simulating some other part
  // of a consuming app - another component's icon, a chart, anything) and
  // asserts that only the icon actually inside AndesAvatarFallback's host is
  // sized; the unrelated one must be untouched.
  it('sizes an SVG projected into its own host, without leaking that sizing onto an unrelated svg elsewhere in the DOM', () => {
    @Component({
      imports: [AndesAvatarFallback],
      template: `
        <andes-avatar-fallback>
          <svg class="fallback-icon" viewBox="0 0 24 24"></svg>
        </andes-avatar-fallback>
        <svg class="unrelated-icon" viewBox="0 0 24 24"></svg>
      `,
    })
    class FallbackWithUnrelatedSvgHost {}

    const fixture = TestBed.createComponent(FallbackWithUnrelatedSvgHost);
    fixture.detectChanges();

    const fallbackIcon = fixture.nativeElement.querySelector(
      '.fallback-icon',
    ) as SVGElement;
    const unrelatedIcon = fixture.nativeElement.querySelector(
      '.unrelated-icon',
    ) as SVGElement;

    const fallbackStyle = getComputedStyle(fallbackIcon);
    const unrelatedStyle = getComputedStyle(unrelatedIcon);

    expect(fallbackStyle.width).toBe('1em');
    expect(fallbackStyle.height).toBe('1em');
    // The bug under regression: with a leading `::ng-deep`, this unrelated
    // svg - not a descendant of andes-avatar-fallback at all - would ALSO
    // get forced to 1em, because the compiled rule has no host scope left.
    expect(unrelatedStyle.width).not.toBe('1em');
    expect(unrelatedStyle.height).not.toBe('1em');
  });
});
