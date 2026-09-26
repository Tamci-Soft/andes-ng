import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  numberAttribute,
  signal,
  viewChild,
} from '@angular/core';

import { AndesAvatarState } from './avatar-state';

@Component({
  selector: 'andes-avatar-fallback',
  imports: [],
  templateUrl: './avatar-fallback.html',
  styleUrl: './avatar-fallback.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-slot]': "'avatar-fallback'",
    '[hidden]': '!visible()',
  },
})
export class AndesAvatarFallback {
  // Falls back to a standalone instance if used outside `AndesAvatar` so the
  // fallback always renders rather than crashing.
  private readonly state =
    inject(AndesAvatarState, { optional: true }) ?? new AndesAvatarState();

  /**
   * Delay (ms) before the fallback appears while the image is still loading -
   * avoids a flash of initials for a fast-loading image. Does not delay the
   * `error` case: a broken image should fall back immediately.
   */
  readonly delayMs = input(0);

  /**
   * Minimum space (px) kept between the text and each side of the avatar
   * (default `4`). Text wider than the avatar minus twice this
   * is scaled down to fit - so a long name or three-letter initials still
   * read inside an `xs` avatar instead of being clipped at the edges.
   */
  readonly gap = input(4, { transform: numberAttribute });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly content =
    viewChild.required<ElementRef<HTMLElement>>('content');

  private readonly hostWidth = signal(0);
  private readonly contentWidth = signal(0);

  /**
   * Text-scaling rule: shrink (never grow) the content to fit the
   * avatar's width minus `gap` on both sides. Widths come from `offsetWidth`,
   * which ignores the transform this produces, so applying the scale never
   * feeds back into the measurement. A `gap` that eats the whole avatar is
   * ignored rather than scaling the text to nothing.
   */
  protected readonly scale = computed(() => {
    const hostWidth = this.hostWidth();
    const contentWidth = this.contentWidth();
    const gap = Math.max(0, this.gap() || 0);
    if (hostWidth === 0 || contentWidth === 0 || gap * 2 >= hostWidth) {
      return 1;
    }
    const available = hostWidth - gap * 2;
    return available < contentWidth ? available / contentWidth : 1;
  });

  private readonly loadingDelayElapsed = signal(true);
  private delayTimeoutId: ReturnType<typeof setTimeout> | undefined;

  protected readonly visible = computed(() => {
    const status = this.state.status();
    if (this.state.showsImage()) {
      return false;
    }
    if (status === 'error') {
      return true;
    }
    return this.loadingDelayElapsed();
  });

  constructor() {
    // A ResizeObserver on both boxes covers every reason the fit can change:
    // the avatar resizing (a responsive `size`), the text changing, a web
    // font finishing loading, and the fallback going from `display: none`
    // (zero-sized, so unmeasurable) to shown. Browser-only: never runs during
    // SSR, and skipped where ResizeObserver doesn't exist.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const host = this.host.nativeElement;
      const content = this.content().nativeElement;
      const observer = new ResizeObserver(() => {
        this.hostWidth.set(host.offsetWidth);
        this.contentWidth.set(content.offsetWidth);
      });
      observer.observe(host);
      observer.observe(content);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    effect((onCleanup) => {
      const status = this.state.status();
      const delay = this.delayMs();
      clearTimeout(this.delayTimeoutId);

      if (status !== 'loading' || delay <= 0) {
        this.loadingDelayElapsed.set(status === 'loading');
        return;
      }

      this.loadingDelayElapsed.set(false);
      this.delayTimeoutId = setTimeout(
        () => this.loadingDelayElapsed.set(true),
        delay,
      );
      onCleanup(() => clearTimeout(this.delayTimeoutId));
    });
  }

  /** The fallback's text, e.g. initials - `AndesAvatar.accessibleName()`'s last resort. */
  text(): string {
    return this.host.nativeElement.textContent?.trim() ?? '';
  }
}
