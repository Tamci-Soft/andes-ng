import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { AndesMenuDivider } from './menu-divider';
import { AndesMenuGroup } from './menu-group';
import { AndesMenuItem } from './menu-item';
import { AndesSubMenu } from './sub-menu';
import type {
  AndesMenuDividerNode,
  AndesMenuGroupNode,
  AndesMenuItemNode,
  AndesMenuNode,
  AndesMenuSubMenuNode,
} from './menu-types';

type NormalizedNode =
  | { id: string; kind: 'item'; node: AndesMenuItemNode }
  | { id: string; kind: 'sub'; node: AndesMenuSubMenuNode }
  | { id: string; kind: 'group'; node: AndesMenuGroupNode }
  | { id: string; kind: 'divider'; node: AndesMenuDividerNode };

/**
 * Renders the data-driven `items` model with the same components the declarative
 * markup uses, recursing into submenus and groups. Internal to `andes-menu`.
 *
 * @internal
 */
@Component({
  selector: 'andes-menu-nodes',
  imports: [AndesMenuItem, AndesSubMenu, AndesMenuGroup, AndesMenuDivider],
  template: `
    @for (entry of entries(); track entry.id) {
      @switch (entry.kind) {
        @case ('item') {
          <andes-menu-item
            [key]="entry.node.key"
            [label]="entry.node.label"
            [icon]="entry.node.icon"
            [disabled]="!!entry.node.disabled"
            [danger]="!!entry.node.danger"
            [title]="entry.node.title"
            [extra]="entry.node.extra"
            [href]="entry.node.href"
            [target]="entry.node.target"
            [rel]="entry.node.rel"
          />
        }
        @case ('sub') {
          <andes-sub-menu
            [key]="entry.node.key"
            [label]="entry.node.label"
            [icon]="entry.node.icon"
            [disabled]="!!entry.node.disabled"
            [title]="entry.node.title"
            [extra]="entry.node.extra"
          >
            <andes-menu-nodes [nodes]="entry.node.children" />
          </andes-sub-menu>
        }
        @case ('group') {
          <andes-menu-group [label]="entry.node.label">
            <andes-menu-nodes [nodes]="entry.node.children" />
          </andes-menu-group>
        }
        @case ('divider') {
          <andes-menu-divider [dashed]="!!entry.node.dashed" />
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
})
export class AndesMenuNodes {
  readonly nodes = input.required<readonly AndesMenuNode[]>();

  protected readonly entries = computed<NormalizedNode[]>(() =>
    this.nodes().map((node, index) => {
      const id = `${node.key ?? node.type ?? 'node'}-${index}`;
      if (node.type === 'divider') {
        return { id, kind: 'divider', node };
      }
      if (node.type === 'group') {
        return { id, kind: 'group', node };
      }
      if (node.children) {
        return { id, kind: 'sub', node: node as AndesMenuSubMenuNode };
      }
      return { id, kind: 'item', node: node as AndesMenuItemNode };
    }),
  );
}
