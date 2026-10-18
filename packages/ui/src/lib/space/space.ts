import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  forwardRef,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';

import {
  ANDES_SPACE,
  AndesSpaceContext,
  AndesSpaceSeparator,
} from './space-context';
import { AndesSpaceItem } from './space-item';

export type AndesSpaceDirection = 'horizontal' | 'vertical';
export type AndesSpaceAlign = 'start' | 'end' | 'center' | 'baseline';
export type AndesSpaceSizePreset = 'sm' | 'md' | 'lg';
/** A preset, a number of pixels, or any CSS length. */
export type AndesSpaceSizeValue = AndesSpaceSizePreset | number | string;
export type AndesSpaceSize =
  AndesSpaceSizeValue | readonly [AndesSpaceSizeValue, AndesSpaceSizeValue];

const PRESETS: Record<AndesSpaceSizePreset, string> = {
  sm: 'var(--andes-space-2, 0.5rem)',
  md: 'var(--andes-space-4, 1rem)',
  lg: 'var(--andes-space-6, 1.5rem)',
};

const PLAIN_NUMBER = /^\d+(\.\d+)?$/;

function toLength(value: AndesSpaceSizeValue): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? `${value}px` : PRESETS.sm;
  }
  if (value in PRESETS) {
    return PRESETS[value as AndesSpaceSizePreset];
  }
  return PLAIN_NUMBER.test(value.trim()) ? `${value.trim()}px` : value;
}

/**
 * Resolves `size` to the horizontal and vertical gap. A single value applies to both axes; a
 * `[horizontal, vertical]` pair sets them separately (the vertical one only matters when
 * wrapping, or in a vertical space).
 */
export function andesSpaceGaps(size: AndesSpaceSize): {
  horizontal: string;
  vertical: string;
} {
  if (Array.isArray(size)) {
    const [horizontal, vertical] = size as readonly [
      AndesSpaceSizeValue,
      AndesSpaceSizeValue,
    ];
    return { horizontal: toLength(horizontal), vertical: toLength(vertical) };
  }
  const length = toLength(size as AndesSpaceSizeValue);
  return { horizontal: length, vertical: length };
}

/**
 * Lays its children out in a row or a column with an even gap - a flex container using the
 * `gap` property, so there are no margins on the children and no wrapper elements.
 *
 * `split` draws a separator between children: a string (`'|'`, `'/'`) or a template. Mark each
 * child with `andesSpaceItem` so the space knows where the separators go; they are rendered as
 * real, `aria-hidden` sibling elements, so they take part in the gap like any other item.
 */
@Component({
  selector: 'andes-space',
  imports: [NgTemplateOutlet],
  template: `
    <ng-content />
    <ng-template #separatorTemplate let-content>
      <span
        class="andes-space__split"
        data-slot="space-split"
        aria-hidden="true"
      >
        @if (content.template; as template) {
          <ng-container [ngTemplateOutlet]="template" />
        } @else {
          {{ content.text }}
        }
      </span>
    </ng-template>
  `,
  styleUrl: './space.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: ANDES_SPACE, useExisting: forwardRef(() => AndesSpace) },
  ],
  host: {
    class: 'andes-space',
    'data-slot': 'space',
    '[attr.data-direction]': 'direction()',
    '[attr.data-align]': 'effectiveAlign()',
    '[attr.data-wrap]': 'wrap() ? "" : null',
    '[style.column-gap]': 'gaps().horizontal',
    '[style.row-gap]': 'gaps().vertical',
  },
})
export class AndesSpace implements AndesSpaceContext {
  readonly direction = input<AndesSpaceDirection>('horizontal');
  /** `sm` 8px, `md` 16px, `lg` 24px (spacing tokens), a number of pixels, any CSS length or a `[horizontal, vertical]` pair. */
  readonly size = input<AndesSpaceSize>('sm');
  /** Cross-axis alignment. Defaults to `center` in a row and to stretching in a column. */
  readonly align = input<AndesSpaceAlign | undefined>(undefined);
  /** Lets a horizontal space wrap onto more lines instead of overflowing. */
  readonly wrap = input(false, { transform: booleanAttribute });
  /** Separator drawn between items: text, or a template (`<ng-template #sep>`). */
  readonly split = input<string | TemplateRef<unknown> | null | undefined>(
    undefined,
  );

  private readonly items = contentChildren(AndesSpaceItem);

  protected readonly gaps = computed(() => andesSpaceGaps(this.size()));
  protected readonly effectiveAlign = computed(
    () => this.align() ?? (this.direction() === 'horizontal' ? 'center' : null),
  );

  private readonly separatorTemplate =
    viewChild<TemplateRef<unknown>>('separatorTemplate');

  separatorAfter(item: object): AndesSpaceSeparator | null {
    const split = this.split();
    const template = this.separatorTemplate();
    if (split === null || split === undefined || split === '' || !template) {
      return null;
    }
    const items = this.items();
    const index = items.indexOf(item as AndesSpaceItem);
    if (index < 0 || index === items.length - 1) {
      return null;
    }
    return {
      template,
      context:
        typeof split === 'string'
          ? { $implicit: { text: split, template: null } }
          : { $implicit: { text: null, template: split } },
    };
  }
}
