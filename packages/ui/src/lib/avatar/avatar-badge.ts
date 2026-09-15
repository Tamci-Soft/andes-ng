import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import clsx from 'clsx';

export type AndesAvatarStatus = 'online' | 'offline' | 'busy' | 'away';
export type AndesAvatarBadgePlacement =
  'bottom-end' | 'bottom-start' | 'top-end' | 'top-start';

/**
 * Small status dot pinned to a corner of an `AndesAvatar` (shadcn's
 * avatar-with-status-dot pattern, Ant's `Badge.dot` wrapped around an avatar).
 *
 * Projected into `AndesAvatar` rather than driven by a `status` input on the
 * avatar itself, which keeps it consistent with the rest of this library's
 * slot-based composition (`AndesAvatarImage` / `AndesAvatarFallback` here,
 * `[slot=icon-start]` / `[slot=icon-end]` on `AndesButton`) and leaves room for
 * a consumer to project a fully custom indicator instead - a count chip, a
 * verified tick - without the avatar growing a union type per variant.
 *
 * Deliberately self-contained rather than projecting the separate `AndesBadge`
 * component: `AndesBadge` is a count/label chip on its own feature branch and
 * is not a public export of `@andes-ng/ui` at this point, and a presence dot
 * has no text content to lay out anyway.
 */
@Component({
  selector: 'andes-avatar-badge',
  imports: [],
  templateUrl: './avatar-badge.html',
  styleUrl: './avatar-badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `:host(.class)` selectors again, for the same reason as AndesAvatar: the
  // BEM classes are bound on this component's OWN host element, which under
  // Emulated encapsulation never carries the `_ngcontent-*` attribute a plain
  // class selector is rewritten to require. See avatar.css.
  host: {
    '[class]': 'classes()',
    '[attr.data-slot]': "'avatar-badge'",
    '[attr.data-status]': 'status()',
    '[attr.data-placement]': 'placement()',
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
})
export class AndesAvatarBadge {
  readonly status = input<AndesAvatarStatus>('online');
  readonly placement = input<AndesAvatarBadgePlacement>('bottom-end');

  /**
   * Accessible name for the indicator. Required - a colour-only dot conveys
   * nothing to a screen reader user, and colour alone is also a WCAG 1.4.1
   * failure, so the name is the non-visual channel. Required rather than
   * defaulted because any default would be an untranslated English string
   * baked into every consuming app; the same reasoning makes
   * `AndesAvatarImage.alt` required. Pass `""` when the surrounding UI already
   * states the presence in text - the host is then marked `aria-hidden` and
   * skipped, rather than announced as an unnamed image.
   */
  readonly label = input.required<string>();

  protected readonly classes = computed(() =>
    clsx(
      'andes-avatar-badge',
      `andes-avatar-badge--${this.status()}`,
      `andes-avatar-badge--${this.placement()}`,
    ),
  );
}
