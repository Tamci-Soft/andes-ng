import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

import { AndesAvatarState } from './avatar-state';

/**
 * Emitted by `AndesAvatarImage` `(loadError)`. An Angular output can't
 * return a value, so a handler that wants to keep the image instead of
 * falling back cancels the event: call `preventFallback()` from the handler.
 */
export interface AndesAvatarImageErrorEvent {
  /** The native `<img>` `error` event. */
  readonly event: Event;
  /**
   * Keep rendering the `<img>` (the browser's broken-image/`alt` rendering)
   * instead of switching to `AndesAvatarFallback`. Has to be called
   * synchronously inside the `(loadError)` handler.
   */
  preventFallback(): void;
}

@Component({
  selector: 'andes-avatar-image',
  imports: [],
  templateUrl: './avatar-image.html',
  styleUrl: './avatar-image.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-slot]': "'avatar-image'",
    '[attr.data-status]': 'state.status()',
  },
})
export class AndesAvatarImage {
  // Falls back to a standalone instance if used outside `AndesAvatar` so the
  // component never crashes - it just behaves as an isolated image loader.
  // `protected` (not `private`) because the template binds `[hidden]`
  // directly on the native `<img>` from it - the hidden state must live on
  // the real img element, not this component's host, so that querying the
  // DOM's actual `<img>` reflects it correctly (e.g. in tests or from CSS
  // that targets `img[hidden]`).
  protected readonly state =
    inject(AndesAvatarState, { optional: true }) ?? new AndesAvatarState();

  /** Image URL. Required - a broken/empty src should be handled by the fallback. */
  readonly src = input.required<string>();
  /**
   * Accessible alt text. Required by design: an avatar image with no `alt` and
   * no visible fallback text is invisible to screen reader users. Pass `""`
   * only when the avatar is truly decorative and adjacent text already
   * identifies the person/entity.
   */
  readonly alt = input.required<string>();
  readonly referrerPolicy = input<string | undefined>(undefined);
  /** CORS mode for the image request. `''` is the same as `'anonymous'`. */
  readonly crossOrigin = input<
    'anonymous' | 'use-credentials' | '' | undefined
  >(undefined);
  /** Candidate sources for different pixel densities/widths (`<img srcset>`). */
  readonly srcSet = input<string | undefined>(undefined);
  /** Source-size hints for a width-descriptor `srcSet` (`<img sizes>`). */
  readonly sizes = input<string | undefined>(undefined);
  /**
   * Whether the image can be dragged. Unset leaves the browser default (which
   * is draggable); `false` suits avatars inside
   * draggable/sortable rows, where dragging the photo would hijack the row's
   * own drag.
   */
  readonly draggable = input<boolean | 'true' | 'false' | undefined>(undefined);

  /**
   * The image failed to load. Call `preventFallback()` on the event to keep
   * showing the image rather than the fallback. Not named `error`, which
   * would shadow the native DOM event.
   */
  readonly loadError = output<AndesAvatarImageErrorEvent>();

  protected readonly draggableAttr = computed(() => {
    const value = this.draggable();
    return value === undefined ? null : String(booleanAttribute(value));
  });

  constructor() {
    // Reset to `loading` whenever `src` changes (including on first render) so
    // a reused/recycled `AndesAvatarImage` doesn't keep showing a stale
    // loaded/error state for its previous image while the new one is in flight.
    effect(() => {
      this.src();
      this.state.setLoading();
    });
  }

  protected onLoad(): void {
    this.state.setLoaded();
  }

  protected onError(event: Event): void {
    let keepImage = false;
    this.loadError.emit({
      event,
      preventFallback: () => {
        keepImage = true;
      },
    });
    this.state.setError(keepImage);
  }
}
