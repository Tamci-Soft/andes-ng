import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';

import { AndesAvatarState } from './avatar-state';

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
  readonly crossOrigin = input<'anonymous' | 'use-credentials' | undefined>(
    undefined,
  );

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

  protected onError(): void {
    this.state.setError();
  }
}
