import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  forwardRef,
  input,
  type TemplateRef,
} from '@angular/core';

import { AndesAvatar } from './avatar';
import {
  AndesAvatarGroupCount,
  type AndesAvatarGroupCountPanelContext,
  type AndesAvatarGroupCountPlacement,
  type AndesAvatarGroupCountTrigger,
} from './avatar-group-count';
import {
  ANDES_AVATAR_GROUP,
  type AndesAvatarGroupContext,
  type AndesAvatarShape,
} from './avatar-group-context';
import type { AndesAvatarSizeInput } from './avatar-size';

/** The overflow panel of `max`: where it opens, what opens it and what it shows. */
export interface AndesAvatarGroupPopover {
  /** Default `top`. */
  readonly placement?: AndesAvatarGroupCountPlacement;
  /** Default `hover` (which also opens on keyboard focus and tap). */
  readonly trigger?: AndesAvatarGroupCountTrigger;
  /** Heading above the names, e.g. "Also in this project". */
  readonly label?: string;
  /** Custom panel content; see `AndesAvatarGroupCount.panelTemplate`. */
  readonly template?: TemplateRef<AndesAvatarGroupCountPanelContext>;
}

/**
 * Overflow settings for `AndesAvatarGroup`'s `max`. Style hooks are Angular's
 * `class`/`style` so the chip is styled the same way as any other element.
 */
export interface AndesAvatarGroupMax {
  /** How many avatars stay visible; the rest collapse into a `+N` chip. */
  readonly count: number;
  /** Extra classes for the `+N` chip. */
  readonly class?: string;
  /** Inline styles for the `+N` chip. */
  readonly style?: Readonly<Record<string, string | number>>;
  /**
   * The panel listing who's hidden. On by default; `false` leaves
   * an inert `+N`.
   */
  readonly popover?: boolean | AndesAvatarGroupPopover;
}

@Component({
  selector: 'andes-avatar-group',
  imports: [AndesAvatarGroupCount],
  templateUrl: './avatar-group.html',
  styleUrl: './avatar-group.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ANDES_AVATAR_GROUP,
      useExisting: forwardRef(() => AndesAvatarGroup),
    },
  ],
  host: {
    class: 'andes-avatar-group',
    '[attr.data-slot]': "'avatar-group'",
  },
})
export class AndesAvatarGroup implements AndesAvatarGroupContext {
  /**
   * Size for every avatar and `+N` chip inside, unless one sets its own. Same
   * values as `AndesAvatar.size`, responsive maps included.
   */
  readonly size = input<AndesAvatarSizeInput | undefined>(undefined);
  /** Shape for every avatar and `+N` chip inside, unless one sets its own. */
  readonly shape = input<AndesAvatarShape | undefined>(undefined);

  /**
   * Cap the visible avatars at `max.count` and collapse the rest into a
   * generated `+N` chip whose panel lists who's hidden (each hidden avatar's
   * image `alt`, icon `label` or fallback text). Leave unset to show every
   * avatar - and to keep composing a hand-placed `andes-avatar-group-count`
   * instead, as before; don't combine the two.
   */
  readonly max = input<AndesAvatarGroupMax | undefined>(undefined);

  /**
   * Every avatar in the group, including ones wrapped in other elements
   * (a tooltip trigger, a link) - hence `descendants`.
   */
  private readonly avatars = contentChildren(AndesAvatar, {
    descendants: true,
  });

  private readonly hiddenAvatars = computed(() => {
    const max = this.max();
    if (!max) {
      return [];
    }
    return this.avatars().slice(Math.max(0, Math.floor(max.count)));
  });

  protected readonly overflowCount = computed(
    () => this.hiddenAvatars().length,
  );

  protected readonly popover = computed<AndesAvatarGroupPopover | null>(() => {
    const popover = this.max()?.popover ?? true;
    if (popover === false) {
      return null;
    }
    return popover === true ? {} : popover;
  });

  protected readonly hiddenNames = computed(() =>
    this.popover()
      ? this.hiddenAvatars()
          .map((avatar) => avatar.accessibleName())
          .filter((name) => name !== '')
      : [],
  );

  isHidden(avatar: unknown): boolean {
    return this.hiddenAvatars().includes(avatar as AndesAvatar);
  }
}
