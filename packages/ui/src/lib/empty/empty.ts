import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  TemplateRef,
} from '@angular/core';

/** The built-in illustrations. `default` is a tray with a few floating cards; `simple` is a minimal outline. */
export type AndesEmptyIllustration = 'default' | 'simple';
export type AndesEmptySize = 'default' | 'small';
/**
 * Ready-made combinations of illustration, size and message for the places an empty state
 * usually appears: a dropdown list, a table body, a list, or a search with no hits.
 */
export type AndesEmptyPreset =
  'default' | 'select' | 'table' | 'list' | 'search';

/**
 * What `image` takes: a built-in illustration, a URL to an image, a template (any markup, e.g.
 * your own SVG), or `false` / `null` to show no picture.
 */
export type AndesEmptyImage =
  AndesEmptyIllustration | string | TemplateRef<unknown> | false | null;

/** What `description` takes: text, a template, or `false` / `null` to hide it. */
export type AndesEmptyDescription =
  string | TemplateRef<unknown> | false | null;

interface PresetConfig {
  readonly image: AndesEmptyIllustration;
  readonly size: AndesEmptySize;
  readonly description: string;
}

const PRESETS: Record<AndesEmptyPreset, PresetConfig> = {
  default: { image: 'default', size: 'default', description: 'No data' },
  select: { image: 'simple', size: 'small', description: 'No options' },
  table: { image: 'simple', size: 'default', description: 'No data' },
  list: { image: 'simple', size: 'small', description: 'No items' },
  search: {
    image: 'default',
    size: 'default',
    description: 'No results found',
  },
};

/**
 * The state for "there is nothing to show": a picture, a short message and optional actions.
 *
 * - `image`: the built-in `default` / `simple` illustration (drawn inline, so it follows the
 *   light and dark theme tokens), an image URL, or a template. `false` hides it.
 * - `description`: text or a template; `false` hides it.
 * - Projected content is the actions area (buttons, links) below the message.
 * - `preset` picks illustration, size and message for a place - `select`, `table`, `list`,
 *   `search` - and every explicit input still wins over it. Drop `<andes-empty preset="table" />`
 *   inside a `<td colspan>` or a list's empty slot.
 * - `announce` makes it a polite live region (`role="status"`), for states that appear after a
 *   search or a filter; leave it off for empty states that are simply there on load.
 *
 * Styling hooks: `--andes-empty-image-size` (the picture's height), `--andes-empty-padding`,
 * `--andes-empty-color`. `imageStyle` applies inline styles to the picture box for one-off tweaks.
 */
@Component({
  selector: 'andes-empty',
  imports: [NgTemplateOutlet],
  templateUrl: './empty.html',
  styleUrl: './empty.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-slot]': '"empty"',
    '[attr.data-size]': 'resolvedSize()',
    '[attr.role]': 'announce() ? "status" : null',
  },
})
export class AndesEmpty {
  /** Illustration, size and message defaults for a common place; explicit inputs override it. */
  readonly preset = input<AndesEmptyPreset>('default');
  readonly image = input<AndesEmptyImage | undefined>(undefined);
  /** Accessible text for a custom image URL; the built-in illustrations are decorative. */
  readonly imageAlt = input('');
  /** Inline styles for the picture box, e.g. `{ '--andes-empty-image-size': '120px' }`. */
  readonly imageStyle = input<Readonly<Record<string, string>> | null>(null);
  readonly description = input<AndesEmptyDescription | undefined>(undefined);
  readonly size = input<AndesEmptySize | undefined>(undefined);
  /** Announce the state to screen readers when it appears (`role="status"`). */
  readonly announce = input(false, { transform: booleanAttribute });

  private readonly presetConfig = computed(() => PRESETS[this.preset()]);

  protected readonly resolvedSize = computed(
    () => this.size() ?? this.presetConfig().size,
  );

  protected readonly resolvedImage = computed(() => {
    const image = this.image();
    return image === undefined ? this.presetConfig().image : image;
  });

  protected readonly resolvedDescription = computed(() => {
    const description = this.description();
    return description === undefined
      ? this.presetConfig().description
      : description;
  });

  protected readonly illustration = computed<AndesEmptyIllustration | null>(
    () => {
      const image = this.resolvedImage();
      return image === 'default' || image === 'simple' ? image : null;
    },
  );

  protected readonly imageUrl = computed(() => {
    const image = this.resolvedImage();
    return typeof image === 'string' && !this.illustration() && image !== ''
      ? image
      : null;
  });

  protected readonly imageTemplate = computed(() => {
    const image = this.resolvedImage();
    return image instanceof TemplateRef ? image : null;
  });

  protected readonly descriptionText = computed(() => {
    const description = this.resolvedDescription();
    return typeof description === 'string' && description !== ''
      ? description
      : null;
  });

  protected readonly descriptionTemplate = computed(() => {
    const description = this.resolvedDescription();
    return description instanceof TemplateRef ? description : null;
  });

  protected readonly hasImage = computed(
    () =>
      this.illustration() !== null ||
      this.imageUrl() !== null ||
      this.imageTemplate() !== null,
  );
}
