import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';

import { AndesTypographyBase } from './typography-base';
import { AndesTypographyTag } from './typography-types';

/** A block of body text. Takes the same options as `andes-text`. */
@Component({
  selector: 'andes-paragraph',
  imports: [NgTemplateOutlet],
  templateUrl: './typography.html',
  styleUrl: './typography.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'paragraph',
    class: 'andes-typography andes-typography--paragraph',
  },
})
export class AndesParagraph extends AndesTypographyBase {
  protected readonly defaultTag = computed((): AndesTypographyTag => 'p');
}
