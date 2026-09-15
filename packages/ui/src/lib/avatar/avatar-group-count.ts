import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import clsx from 'clsx';

import type { AndesAvatarShape, AndesAvatarSize } from './avatar';

@Component({
  selector: 'andes-avatar-group-count',
  imports: [],
  templateUrl: './avatar-group-count.html',
  styleUrl: './avatar-group-count.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Same root cause as AndesAvatar (see avatar.ts): avatar-group-count.css's
  // shape/size rules are plain class selectors applied via `[class]` on this
  // component's own host element, which never carries the `_ngcontent-*`
  // attribute Emulated encapsulation requires for them to match. Opt out of
  // scoping so they match by class name globally, same fix as Breadcrumb.
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[attr.data-slot]': "'avatar-group-count'",
  },
})
export class AndesAvatarGroupCount {
  /** Number of avatars hidden past the visible group - rendered as `+count`. */
  readonly count = input.required<number>();
  readonly shape = input<AndesAvatarShape>('circular');
  readonly size = input<AndesAvatarSize>('md');

  protected readonly label = computed(() => `+${this.count()}`);

  protected readonly classes = computed(() =>
    clsx(
      'andes-avatar-group-count',
      `andes-avatar-group-count--${this.shape()}`,
      `andes-avatar-group-count--${this.size()}`,
    ),
  );
}
