import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  TemplateRef,
} from '@angular/core';

/** Content inputs take plain text for the common case and a template for rich content. */
export type AndesListItemMetaContent =
  string | TemplateRef<unknown> | null | undefined;

/**
 * The lead of a row: an avatar (`[slot=avatar]`), a title and a description. `title` and
 * `description` take text or a template; the `[slot=title]` and `[slot=description]` slots are
 * the markup alternative.
 */
@Component({
  selector: 'andes-list-item-meta',
  imports: [NgTemplateOutlet],
  templateUrl: './list-item-meta.html',
  styleUrl: './list-item-meta.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'list-item-meta',
    // `title` is an input here; a bare attribute must not become a hover tooltip.
    '[attr.title]': 'null',
  },
})
export class AndesListItemMeta {
  readonly title = input<AndesListItemMetaContent>(undefined);
  readonly description = input<AndesListItemMetaContent>(undefined);

  protected asTemplate(
    content: AndesListItemMetaContent,
  ): TemplateRef<unknown> | null {
    return content instanceof TemplateRef ? content : null;
  }

  protected asText(content: AndesListItemMetaContent): string {
    return typeof content === 'string' ? content : '';
  }
}
