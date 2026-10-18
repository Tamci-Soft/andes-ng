import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';

import { AndesTypographyBase } from './typography-base';
import { AndesTypographyTag } from './typography-types';

export type AndesTitleLevel = 1 | 2 | 3 | 4 | 5;

function levelAttribute(value: unknown): AndesTitleLevel {
  const level = Math.round(numberAttribute(value, 1));
  return Math.min(5, Math.max(1, level)) as AndesTitleLevel;
}

/**
 * A heading. `level` picks the look from the type scale (24, 20, 18, 16 and 14px, all weight
 * 600) and, unless `as` says otherwise, the element: level 2 renders an `h2`.
 */
@Component({
  selector: 'andes-title',
  imports: [NgTemplateOutlet],
  templateUrl: './typography.html',
  styleUrl: './typography.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'title',
    class: 'andes-typography andes-typography--title',
    '[attr.data-level]': 'level()',
  },
})
export class AndesTitle extends AndesTypographyBase {
  readonly level = input<AndesTitleLevel, unknown>(1, {
    transform: levelAttribute,
  });

  protected readonly defaultTag = computed(
    () => `h${this.level()}` as AndesTypographyTag,
  );
}
