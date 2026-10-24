import { Directive, inject, TemplateRef } from '@angular/core';

import type { AndesTreeNodeContext } from './tree-types';

/**
 * Marks the `ng-template` that draws a node's content, in place of its plain title. The switcher,
 * checkbox and icon stay the tree's own.
 *
 * ```html
 * <andes-tree [nodes]="nodes">
 *   <ng-template andesTreeNode let-node let-selected="selected">
 *     {{ node.title }} <small>{{ node['count'] }}</small>
 *   </ng-template>
 * </andes-tree>
 * ```
 */
@Directive({ selector: 'ng-template[andesTreeNode]' })
export class AndesTreeNodeTemplate {
  readonly template = inject<TemplateRef<AndesTreeNodeContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: AndesTreeNodeTemplate,
    _context: unknown,
  ): _context is AndesTreeNodeContext {
    return true;
  }
}
