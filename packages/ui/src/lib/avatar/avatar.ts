import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
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
  // avatar.css's shape/size rules are plain class selectors applied via
  // `[class]` directly on this component's OWN host element (see `classes`
  // below), not on elements inside its own template. Under the default
  // Emulated encapsulation, Angular only rewrites plain class selectors to
  // require its `_ngcontent-*` attribute, which the host element itself
  // never carries (only `_nghost-*`) - so every one of those rules is dead
  // and the host renders with no explicit width/height/border-radius (see
  // Breadcrumb's `encapsulation: ViewEncapsulation.None` fix for the same
  // root cause). Opting out of scoping here makes the plain class selectors
  // match by class name the same way a hand-written global stylesheet would.
  encapsulation: ViewEncapsulation.None,
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
