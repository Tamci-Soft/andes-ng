import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import clsx from 'clsx';

import { AndesAvatarState } from './avatar-state';

export type AndesAvatarShape = 'circular' | 'rounded' | 'square';
export type AndesAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'andes-avatar',
  imports: [],
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AndesAvatarState],
  host: {
    '[class]': 'classes()',
    '[attr.data-slot]': "'avatar'",
    '[attr.data-shape]': 'shape()',
    '[attr.data-size]': 'size()',
    '[attr.data-status]': 'state.status()',
  },
})
export class AndesAvatar {
  protected readonly state = inject(AndesAvatarState);

  readonly shape = input<AndesAvatarShape>('circular');
  readonly size = input<AndesAvatarSize>('md');

  protected readonly classes = computed(() =>
    clsx(
      'andes-avatar',
      `andes-avatar--${this.shape()}`,
      `andes-avatar--${this.size()}`,
    ),
  );
}
