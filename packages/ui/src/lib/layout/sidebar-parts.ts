import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  ViewEncapsulation,
} from '@angular/core';

import { AndesSidebarProvider } from './sidebar-provider';

let nextLabelId = 0;

/** Top region of a sidebar: a logo, a workspace switcher. Stays visible while the content scrolls. */
@Component({
  selector: 'andes-sidebar-header',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'andes-sidebar-header', 'data-slot': 'sidebar-header' },
})
export class AndesSidebarHeader {}

/** Bottom region of a sidebar: the account menu, a help link. Stays visible while the content scrolls. */
@Component({
  selector: 'andes-sidebar-footer',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'andes-sidebar-footer', 'data-slot': 'sidebar-footer' },
})
export class AndesSidebarFooter {}

/** The scrolling middle of a sidebar. */
@Component({
  selector: 'andes-sidebar-content',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'andes-sidebar-content', 'data-slot': 'sidebar-content' },
})
export class AndesSidebarContent {}

/** A thin rule between regions of a sidebar. */
@Component({
  selector: 'andes-sidebar-separator',
  template: '',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-sidebar-separator',
    role: 'separator',
    'data-slot': 'sidebar-separator',
  },
})
export class AndesSidebarSeparator {}

/** The heading of a group; it fades out while the sidebar is collapsed to icons. */
@Component({
  selector: 'andes-sidebar-group-label',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-sidebar-group-label',
    'data-slot': 'sidebar-group-label',
    '[attr.id]': 'id',
  },
})
export class AndesSidebarGroupLabel {
  readonly id = `andes-sidebar-group-label-${nextLabelId++}`;
}

/** A section of the sidebar; named by its `andes-sidebar-group-label` when it has one. */
@Component({
  selector: 'andes-sidebar-group',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-sidebar-group',
    role: 'group',
    'data-slot': 'sidebar-group',
    '[attr.aria-labelledby]': 'label()?.id ?? null',
  },
})
export class AndesSidebarGroup {
  protected readonly label = contentChild(AndesSidebarGroupLabel);
}

/** A list of menu items (`andes-sidebar-menu-item`). */
@Component({
  selector: 'andes-sidebar-menu',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-sidebar-menu',
    role: 'list',
    'data-slot': 'sidebar-menu',
  },
})
export class AndesSidebarMenu {}

/** One entry of a menu: holds a menu button and, optionally, a nested `andes-sidebar-menu-sub`. */
@Component({
  selector: 'andes-sidebar-menu-item',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-sidebar-menu-item',
    role: 'listitem',
    'data-slot': 'sidebar-menu-item',
  },
})
export class AndesSidebarMenuItem {}

/** A nested menu under an item; hidden while the sidebar is collapsed to icons. */
@Component({
  selector: 'andes-sidebar-menu-sub',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-sidebar-menu-sub',
    role: 'list',
    'data-slot': 'sidebar-menu-sub',
  },
})
export class AndesSidebarMenuSub {}

/** A count or tag at the end of a menu button; hidden while the sidebar is collapsed to icons. */
@Component({
  selector: 'andes-sidebar-menu-badge',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-sidebar-menu-badge',
    'data-slot': 'sidebar-menu-badge',
  },
})
export class AndesSidebarMenuBadge {}

/**
 * The page next to a sidebar. With `variant="inset"` it becomes a rounded card on the sidebar's
 * background; otherwise it is a plain flexible column. Add `role="main"` (or wrap your content
 * in `<main>`) so assistive technology can jump to it.
 */
@Component({
  selector: 'andes-sidebar-inset',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-sidebar-inset',
    'data-slot': 'sidebar-inset',
    '[attr.data-variant]': 'provider.variant()',
    '[attr.data-side]': 'provider.side()',
    '[attr.data-mode]': 'provider.mode()',
  },
})
export class AndesSidebarInset {
  protected readonly provider = inject(AndesSidebarProvider);
}
