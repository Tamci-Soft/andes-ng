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
  // Same root cause and fix as AndesAvatar (see avatar.ts): avatar-group-
  // count.css's shape/size rules target this component's own host element,
  // so they're written as `:host(.andes-avatar-group-count--xxx)` rather
  // than plain class selectors, which Emulated encapsulation (the default,
  // restored here) rewrites to match the host correctly. `ViewEncapsulation
  // .None`, used here previously, emits the stylesheet verbatim into a
  // global stylesheet where a `:host` selector - meaningful only inside a
  // real shadow root - matches nothing, dropping every rule in the file.
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
