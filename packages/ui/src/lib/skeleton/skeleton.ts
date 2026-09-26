import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import clsx from 'clsx';

import {
  AndesSkeletonAvatar,
  AndesSkeletonAvatarShape,
} from './skeleton-avatar';
import { AndesSkeletonSize, toCssSize } from './skeleton-utils';

export type AndesSkeletonShape = 'text' | 'circular' | 'rectangular';

export interface AndesSkeletonAvatarConfig {
  size?: AndesSkeletonSize | number;
  shape?: AndesSkeletonAvatarShape;
}

export interface AndesSkeletonTitleConfig {
  /** Numbers are pixels. */
  width?: number | string;
}

export interface AndesSkeletonParagraphConfig {
  rows?: number;
  /**
   * An array sets each row's width in order; a single value sets only the LAST row's width,
   * so the paragraph ends on a shorter line. Numbers are pixels.
   */
  width?: number | string | (number | string)[];
}

type SectionInput<T> = boolean | T | string | null | undefined;

/** `true`/`false`, a bare attribute (`<andes-skeleton avatar>`), or a config object. */
function sectionAttribute<T extends object>(
  value: SectionInput<T>,
): boolean | T {
  return typeof value === 'object' && value !== null
    ? value
    : booleanAttribute(value);
}

/** Drops `undefined` keys so `{ rows: 4, width: undefined }` doesn't erase a default width. */
function definedOnly<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

@Component({
  selector: 'andes-skeleton',
  imports: [AndesSkeletonAvatar, NgTemplateOutlet],
  templateUrl: './skeleton.html',
  styleUrls: ['./skeleton-fill.css', './skeleton.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Block mode (legacy `shape` API) is a single decorative bar, hidden from assistive tech as
    // before - a consumer composing several bars provides its own busy region around them.
    //
    // Composite mode owns that busy region itself: while the placeholder shows, the host is
    // aria-busy and carries one visually hidden status text (`loadingLabel`); every placeholder
    // bar below it is aria-hidden. Once `loading` is false the host is a plain wrapper around the
    // real content, with no busy state and nothing hidden.
    '[attr.aria-hidden]': 'isBlock() ? "true" : null',
    '[attr.aria-busy]': 'showPlaceholder() ? "true" : null',
    // `title` is an input here (the title bar config), not a tooltip - a bare `title` attribute
    // must not leave an empty native tooltip on the host.
    '[attr.title]': 'null',
  },
})
export class AndesSkeleton {
  // --- Composite API ---------------------------------------------------------------------------

  /** Shows the placeholder while true; renders the projected content once false. */
  readonly loading = input(true, { transform: booleanAttribute });
  /** Shimmer animation (ignored under `prefers-reduced-motion: reduce`). */
  readonly active = input(false, { transform: booleanAttribute });
  readonly avatar = input<
    boolean | AndesSkeletonAvatarConfig,
    SectionInput<AndesSkeletonAvatarConfig>
  >(false, { transform: sectionAttribute });
  readonly title = input<
    boolean | AndesSkeletonTitleConfig,
    SectionInput<AndesSkeletonTitleConfig>
  >(true, { transform: sectionAttribute });
  readonly paragraph = input<
    boolean | AndesSkeletonParagraphConfig,
    SectionInput<AndesSkeletonParagraphConfig>
  >(true, { transform: sectionAttribute });
  /** Fully rounded title and paragraph bars. */
  readonly round = input(false, { transform: booleanAttribute });
  /** Visually hidden text announced for the busy region. */
  readonly loadingLabel = input('Loading…');

  // --- Block (original single-bar) API ---------------------------------------------------------
  // Setting `shape` switches the component to the original single-bar rendering, unchanged:
  // same DOM, same default sizes, same pulse animation controlled by `animated`.

  readonly shape = input<AndesSkeletonShape | undefined>(undefined);
  readonly width = input<string | number | undefined>(undefined);
  readonly height = input<string | number | undefined>(undefined);
  readonly animated = input(true, { transform: booleanAttribute });

  protected readonly isBlock = computed(() => this.shape() !== undefined);
  protected readonly showPlaceholder = computed(
    () => !this.isBlock() && this.loading(),
  );

  protected readonly blockClasses = computed(() =>
    clsx(
      'andes-skeleton',
      'andes-skeleton-fill',
      `andes-skeleton--${this.shape()}`,
      !this.animated() && 'andes-skeleton--static',
    ),
  );

  protected readonly widthStyle = computed(() => toCssSize(this.width()));
  protected readonly heightStyle = computed(() => toCssSize(this.height()));

  // Section defaults are chosen so a bare <andes-skeleton /> looks balanced: the title
  // shortens and the paragraph gets fewer rows as more sections share the space.

  protected readonly avatarConfig = computed(
    (): Required<AndesSkeletonAvatarConfig> | null => {
      const avatar = this.avatar();
      if (!avatar) {
        return null;
      }
      const hasSquareDefault = !!this.title() && !this.paragraph();
      return {
        size: 'md',
        shape: hasSquareDefault ? 'square' : 'circle',
        ...(avatar === true ? {} : definedOnly(avatar)),
      };
    },
  );

  protected readonly titleWidth = computed((): string | undefined | null => {
    const title = this.title();
    if (!title) {
      return null;
    }
    const hasAvatar = !!this.avatar();
    const hasParagraph = !!this.paragraph();
    const defaultWidth = hasParagraph ? (hasAvatar ? '50%' : '38%') : undefined;
    const width = title === true ? undefined : title.width;
    return toCssSize(width ?? defaultWidth);
  });

  /** One entry per paragraph row: its CSS width, or undefined for full width. */
  protected readonly paragraphRows = computed((): (string | undefined)[] => {
    const paragraph = this.paragraph();
    if (!paragraph) {
      return [];
    }
    const hasAvatar = !!this.avatar();
    const hasTitle = !!this.title();
    const config: AndesSkeletonParagraphConfig = {
      rows: !hasAvatar && hasTitle ? 3 : 2,
      width: !hasAvatar || !hasTitle ? '61%' : undefined,
      ...(paragraph === true ? {} : definedOnly(paragraph)),
    };
    const rows = Math.max(0, Math.floor(config.rows ?? 0));
    const width = config.width;

    return Array.from({ length: rows }, (_, index) => {
      if (Array.isArray(width)) {
        return toCssSize(width[index]);
      }
      return index === rows - 1 ? toCssSize(width) : undefined;
    });
  });

  protected readonly classes = computed(() =>
    clsx(
      'andes-skeleton-composite',
      this.avatar() && 'andes-skeleton-composite--with-avatar',
      this.round() && 'andes-skeleton-composite--round',
    ),
  );
}
