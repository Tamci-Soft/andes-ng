import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Icon-only avatar content: a first-class "icon mode" for avatars that
 * represent a generic/unknown entity rather than a person with a photo.
 *
 * Deliberately NOT the same thing as putting an icon inside
 * `AndesAvatarFallback`. A fallback is bound to the image-load state machine:
 * with no `AndesAvatarImage` sibling the avatar sits at `data-status="loading"`
 * forever, and a `delayMs` fallback would stay hidden for that whole time -
 * neither of which is correct for an avatar that never had an image to begin
 * with. `AndesAvatarIcon` renders unconditionally and carries no state.
 */
@Component({
  selector: 'andes-avatar-icon',
  imports: [],
  templateUrl: './avatar-icon.html',
  styleUrl: './avatar-icon.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-slot]': "'avatar-icon'",
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
})
export class AndesAvatarIcon {
  /**
   * Accessible name for the icon. Required - same rationale as
   * `AndesAvatarImage.alt`: an icon avatar with no accessible name and no
   * adjacent text is invisible to screen reader users, and silently defaulting
   * to something like "Avatar" would ship untranslated English into every
   * consuming app. Pass `""` when the avatar is genuinely decorative because
   * neighbouring text already identifies the entity - the empty string then
   * marks the host `aria-hidden` so the icon is skipped rather than announced
   * as an unnamed image.
   */
  readonly label = input.required<string>();
}
