import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  forwardRef,
  input,
  signal,
  type TemplateRef,
} from '@angular/core';

import { AndesAvatar } from './avatar';
import type { AndesAvatarFace } from './avatar-face';
import {
  AndesAvatarGroupCount,
  type AndesAvatarGroupCountLayout,
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
  /**
   * Default `hover` (which also opens on keyboard focus and tap); `focus`
   * opens on keyboard focus and tap only; `click` toggles a disclosure.
   */
  readonly trigger?: AndesAvatarGroupCountTrigger;
  /**
   * `grid` (default): the hidden avatars as faces in a wrapping grid, 6-8
   * wide, that scrolls vertically past five rows - fine for hundreds.
   * `row`: one horizontal line that scrolls sideways and snaps to faces -
   * only for a handful.
   */
  readonly layout?: AndesAvatarGroupCountLayout;
  /** Heading above the faces, e.g. "Also in this project". */
  readonly label?: string;
  /**
   * Text for the chip's accessible name, the panel's name and the heading of a
   * scrolling panel; `{count}` becomes the number hidden. Default
   * `"+{count} more"` - translate it for non-English apps.
   */
  readonly moreLabel?: string;
  /**
   * Custom panel content replacing the faces; see
   * `AndesAvatarGroupCount.panelTemplate`.
   */
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
   * generated `+N` chip whose panel shows who's hidden as faces - photo, else
   * initials, else a person glyph - each named by the avatar's image `alt`,
   * icon `label` or fallback text (as its `aria-label` and the caption on
   * hover/focus). Leave unset to show every avatar - and to keep composing a
   * hand-placed `andes-avatar-group-count` instead, as before; don't combine
   * the two.
   *
   * Set `max` for any group that can grow: without it the stack never wraps
   * or shrinks, so 100 avatars make a row 100 avatars wide.
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

  /** Bumped each time the panel opens, so inline colors are read fresh. */
  private readonly panelOpens = signal(0);

  protected readonly hiddenFaces = computed<readonly AndesAvatarFace[]>(() => {
    this.panelOpens();
    return this.popover()
      ? this.hiddenAvatars().map((avatar) => avatar.face())
      : [];
  });

  protected onPanelOpened(): void {
    this.panelOpens.update((count) => count + 1);
  }

  isHidden(avatar: unknown): boolean {
    return this.hiddenAvatars().includes(avatar as AndesAvatar);
  }
}
