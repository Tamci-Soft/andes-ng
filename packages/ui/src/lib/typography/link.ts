import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from '@angular/core';

import { AndesText } from './text';
import {
  AndesTypographyCopyConfig,
  AndesTypographyEllipsisConfig,
  AndesTypographyFeature,
  AndesTypographySize,
  AndesTypographyType,
  featureAttribute,
} from './typography-types';

/**
 * An anchor with the typography treatment: link colour, external-link affordance, a disabled
 * state, and the same truncation and copy button as `andes-text` (the label is an `andes-text`
 * inside, so they behave identically).
 */
@Component({
  selector: 'andes-link',
  imports: [AndesText],
  templateUrl: './link.html',
  styleUrl: './link.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'link',
    '[attr.data-type]': 'type() ?? null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class AndesLink {
  readonly href = input<string | undefined>(undefined);
  readonly target = input<string | undefined>(undefined);
  readonly rel = input<string | undefined>(undefined);
  readonly download = input<string | boolean | undefined>(undefined);
  /**
   * Opens in a new tab with `noopener noreferrer` and shows an arrow glyph. An explicit
   * `target` or `rel` still wins.
   */
  readonly external = input(false, { transform: booleanAttribute });
  /** Announced for external links, in the user's language. */
  readonly externalLabel = input('(opens in a new tab)');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly type = input<AndesTypographyType | undefined>(undefined);
  readonly size = input<AndesTypographySize>('md');
  readonly ellipsis = input<
    AndesTypographyFeature<AndesTypographyEllipsisConfig>,
    boolean | AndesTypographyEllipsisConfig | string | null | undefined
  >(false, { transform: featureAttribute });
  readonly expanded = model(false);
  readonly copyable = input<
    AndesTypographyFeature<AndesTypographyCopyConfig>,
    boolean | AndesTypographyCopyConfig | string | null | undefined
  >(false, { transform: featureAttribute });
  readonly copied = output<string>();
  readonly truncated = output<boolean>();

  protected readonly resolvedTarget = computed(
    () => this.target() ?? (this.external() ? '_blank' : null),
  );

  protected readonly resolvedRel = computed(() => {
    const rel = this.rel();
    if (rel !== undefined) {
      return rel;
    }
    return this.resolvedTarget() === '_blank' ? 'noopener noreferrer' : null;
  });

  protected readonly resolvedDownload = computed(() => {
    const value = this.download();
    return value === true || value === '' ? '' : value ? value : null;
  });

  protected onClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
}
