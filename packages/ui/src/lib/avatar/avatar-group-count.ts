import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import clsx from 'clsx';

import type { AndesAvatarShape, AndesAvatarSize } from './avatar';

@Component({
  selector: 'andes-avatar-group-count',
  imports: [],
  templateUrl: './avatar-group-count.html',
  styleUrl: './avatar-group-count.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
