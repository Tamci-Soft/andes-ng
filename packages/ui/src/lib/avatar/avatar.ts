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
  // avatar.css's shape/size rules target this component's OWN host element
  // (via the BEM classes bound through `[class]` below), not elements inside
  // its own template - so they're written as `:host(.andes-avatar--xxx)`
  // rather than plain class selectors. Emulated encapsulation (the default,
  // restored here) rewrites `:host(...)` to something like
  // `[_nghost-xxx].andes-avatar--circular`, which DOES match the host
  // element regardless of encapsulation, because `_nghost-*` is present on
  // the host itself. (A previous fix reached for
  // `encapsulation: ViewEncapsulation.None` instead, which solved that dead
  // -CSS problem but created a worse one: None emits the stylesheet verbatim
  // into a global, non-shadow-DOM `<style>` tag, where avatar.css's `:host`
  // selector - meaningful only inside a real shadow root - matches nothing
  // at all, dropping every rule in the file, not just the class ones.)
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
