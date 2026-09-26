import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  TemplateRef,
} from '@angular/core';

import { AndesDropdownMenuGroup } from './dropdown-menu-group';
import { AndesDropdownMenuItem } from './dropdown-menu-item';
import { AndesDropdownMenuLabel } from './dropdown-menu-label';
import { AndesDropdownMenuSeparator } from './dropdown-menu-separator';
import { AndesDropdownMenuSub } from './dropdown-menu-sub';
import { AndesDropdownMenuSubContent } from './dropdown-menu-sub-content';
import { AndesDropdownMenuSubTrigger } from './dropdown-menu-sub-trigger';
import {
  type AndesDropdownMenuLabelValue,
  type AndesDropdownMenuDividerOption,
  type AndesDropdownMenuGroupOption,
  type AndesDropdownMenuItemDef,
  type AndesDropdownMenuItemOption,
  type AndesDropdownMenuSubmenuOption,
  isAndesDropdownMenuSubmenu,
} from './dropdown-menu-types';

type Kind = 'divider' | 'group' | 'submenu' | 'item';

/**
 * @internal Renders the root's `items` array with the regular projected-content parts,
 * so both authoring styles share one implementation of every behavior.
 *
 * A component rather than a recursive `<ng-template>`: an embedded view resolves DI
 * from where its template is *declared*, so a recursive template's submenu items would
 * all inject the root panel's list navigation instead of their own submenu panel's.
 * Each nested `<andes-dropdown-menu-items>` element sits inside its
 * `<andes-dropdown-menu-sub-content>`, so it resolves that panel's providers.
 */
@Component({
  selector: 'andes-dropdown-menu-items',
  imports: [
    NgTemplateOutlet,
    AndesDropdownMenuGroup,
    AndesDropdownMenuItem,
    AndesDropdownMenuLabel,
    AndesDropdownMenuSeparator,
    AndesDropdownMenuSub,
    AndesDropdownMenuSubContent,
    AndesDropdownMenuSubTrigger,
  ],
  template: `
    @for (def of items(); track trackBy($index, def)) {
      @switch (kind(def)) {
        @case ('divider') {
          <andes-dropdown-menu-separator
            [dashed]="asDivider(def).dashed ?? false"
          />
        }
        @case ('group') {
          @let group = asGroup(def);
          <andes-dropdown-menu-group>
            @if (group.label) {
              <andes-dropdown-menu-label>
                <ng-container
                  *ngTemplateOutlet="
                    content;
                    context: { $implicit: group.label }
                  "
                />
              </andes-dropdown-menu-label>
            }
            <andes-dropdown-menu-items [items]="group.children" />
          </andes-dropdown-menu-group>
        }
        @case ('submenu') {
          @let submenu = asSubmenu(def);
          <andes-dropdown-menu-sub [key]="submenu.key">
            <andes-dropdown-menu-sub-trigger
              [disabled]="submenu.disabled ?? false"
              [typeaheadLabel]="submenu.title ?? textOf(submenu.label)"
            >
              @if (submenu.icon) {
                <span slot="icon-start" class="andes-dropdown-menu__item-icon">
                  <ng-container *ngTemplateOutlet="submenu.icon" />
                </span>
              }
              <ng-container
                *ngTemplateOutlet="
                  content;
                  context: { $implicit: submenu.label }
                "
              />
            </andes-dropdown-menu-sub-trigger>
            <andes-dropdown-menu-sub-content>
              <andes-dropdown-menu-items [items]="submenu.children" />
            </andes-dropdown-menu-sub-content>
          </andes-dropdown-menu-sub>
        }
        @default {
          @let item = asItem(def);
          <andes-dropdown-menu-item
            [key]="item.key"
            [disabled]="item.disabled ?? false"
            [variant]="item.danger ? 'destructive' : 'default'"
            [typeaheadLabel]="item.title ?? textOf(item.label)"
          >
            @if (item.icon) {
              <span slot="icon-start" class="andes-dropdown-menu__item-icon">
                <ng-container *ngTemplateOutlet="item.icon" />
              </span>
            }
            <ng-container
              *ngTemplateOutlet="content; context: { $implicit: item.label }"
            />
            @if (item.extra) {
              <span class="andes-dropdown-menu__extra">
                <ng-container
                  *ngTemplateOutlet="
                    content;
                    context: { $implicit: item.extra }
                  "
                />
              </span>
            }
          </andes-dropdown-menu-item>
        }
      }
    }

    <ng-template #content let-value>
      @if (isTemplate(value)) {
        <ng-container *ngTemplateOutlet="value" />
      } @else {
        {{ value }}
      }
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Items must lay out as rows of the enclosing panel's flex column.
    style: 'display: contents',
  },
})
export class AndesDropdownMenuItems {
  readonly items = input.required<readonly AndesDropdownMenuItemDef[]>();

  protected kind(def: AndesDropdownMenuItemDef): Kind {
    if (def.type === 'divider' || def.type === 'group') {
      return def.type;
    }
    return isAndesDropdownMenuSubmenu(def) ? 'submenu' : 'item';
  }

  protected trackBy(index: number, def: AndesDropdownMenuItemDef): string {
    return def.key ?? `${def.type ?? 'item'}-${index}`;
  }

  protected isTemplate(value: AndesDropdownMenuLabelValue): boolean {
    return value instanceof TemplateRef;
  }

  /** Typeahead text for a label; `undefined` (use the rendered text) for a template. */
  protected textOf(value: AndesDropdownMenuLabelValue): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  protected asItem(def: AndesDropdownMenuItemDef): AndesDropdownMenuItemOption {
    return def as AndesDropdownMenuItemOption;
  }

  protected asSubmenu(
    def: AndesDropdownMenuItemDef,
  ): AndesDropdownMenuSubmenuOption {
    return def as AndesDropdownMenuSubmenuOption;
  }

  protected asGroup(
    def: AndesDropdownMenuItemDef,
  ): AndesDropdownMenuGroupOption {
    return def as AndesDropdownMenuGroupOption;
  }

  protected asDivider(
    def: AndesDropdownMenuItemDef,
  ): AndesDropdownMenuDividerOption {
    return def as AndesDropdownMenuDividerOption;
  }
}
