import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  inject,
  input,
} from '@angular/core';
import clsx from 'clsx';

import { AndesAvatarFallback } from './avatar-fallback';
import type { AndesAvatarShape } from './avatar-group-context';
import { AndesAvatarIcon } from './avatar-icon';
import { AndesAvatarImage } from './avatar-image';
import {
  type AndesAvatarSizeInput,
  type AndesAvatarSizePreset,
  injectAvatarAppearance,
} from './avatar-size';
import { AndesAvatarState } from './avatar-state';

export type { AndesAvatarShape } from './avatar-group-context';
/** The five preset steps. `size` also takes a pixel number or a responsive map. */
export type AndesAvatarSize = AndesAvatarSizePreset;

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
    '[attr.data-shape]': 'appearance.shape()',
    '[attr.data-size]': 'appearance.size()',
    '[attr.data-status]': 'state.status()',
    '[attr.hidden]': "hiddenInGroup() ? '' : null",
    // A pixel `size` can't be a class, so it's bound inline; preset steps
    // are left to avatar.css (these bindings are `null`, i.e. removed).
    '[style.width.px]': 'appearance.px()',
    '[style.height.px]': 'appearance.px()',
    '[style.font-size.px]': 'appearance.fontPx()',
  },
})
export class AndesAvatar {
  protected readonly state = inject(AndesAvatarState);

  /**
   * `circular` (Ant's `circle`), `rounded` or `square`. Left unset, the
   * avatar takes its enclosing `AndesAvatarGroup`'s shape, else `circular`.
   */
  readonly shape = input<AndesAvatarShape | undefined>(undefined);

  /**
   * A preset step (`xs`-`xl`), a pixel size (`64`), or a responsive map keyed
   * by viewport breakpoint (`{ xs: 'sm', md: 48, xl: 72 }`, mobile-first -
   * see `AndesAvatarResponsiveSize`). Left unset, the avatar takes its
   * enclosing `AndesAvatarGroup`'s size, else `md`.
   */
  readonly size = input<AndesAvatarSizeInput | undefined>(undefined);

  protected readonly appearance = injectAvatarAppearance(this.size, this.shape);

  private readonly image = contentChild(AndesAvatarImage);
  private readonly icon = contentChild(AndesAvatarIcon);
  private readonly fallback = contentChild(AndesAvatarFallback);

  protected readonly hiddenInGroup = computed(
    () => this.appearance.group?.isHidden(this) ?? false,
  );

  protected readonly classes = computed(() => {
    const preset = this.appearance.preset();
    return clsx(
      'andes-avatar',
      `andes-avatar--${this.appearance.shape()}`,
      preset ? `andes-avatar--${preset}` : 'andes-avatar--custom-size',
    );
  });

  /**
   * Who this avatar stands for, as text: the image's `alt`, else the icon's
   * `label`, else the fallback's text. `AndesAvatarGroup` lists these in its
   * `+N` overflow panel for the avatars `max.count` hides - the panel can't
   * show the hidden avatars themselves, since projected content can only be
   * rendered in one place.
   */
  accessibleName(): string {
    return (
      this.image()?.alt() ||
      this.icon()?.label() ||
      this.fallback()?.text() ||
      ''
    ).trim();
  }
}
