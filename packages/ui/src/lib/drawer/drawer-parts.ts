import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';

import { AndesDrawer } from './drawer';

let nextId = 0;

/**
 * Layout wrapper for a drawer's title + description. Purely presentational -
 * place it as the first child inside `<andes-drawer>`'s projected content.
 */
@Component({
  selector: 'andes-drawer-header',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--andes-space-1);
      padding: var(--andes-space-4) var(--andes-space-4) 0;
      text-align: center;
    }
  `,
})
export class AndesDrawerHeader {}

/** Layout wrapper for a drawer's footer actions. Pinned to the panel's bottom. */
@Component({
  selector: 'andes-drawer-footer',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--andes-space-2);
      padding: 0 var(--andes-space-4) var(--andes-space-4);
      margin-top: auto;
    }
  `,
})
export class AndesDrawerFooter {}

/**
 * The drawer's heading (`<h2>`, per shadcn's `DrawerTitle`). Registers itself
 * with the enclosing `AndesDrawer` so the panel's `aria-labelledby` points at it.
 */
@Component({
  selector: 'andes-drawer-title',
  template: '<h2 [id]="id"><ng-content /></h2>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    h2 {
      font-size: 1.125rem;
      font-weight: var(--andes-font-weight-medium);
      color: var(--andes-color-foreground);
      margin: 0;
    }
  `,
})
export class AndesDrawerTitle {
  protected readonly id = `andes-drawer-title-${nextId++}`;
  private readonly drawer = inject(AndesDrawer);

  constructor() {
    this.drawer.registerTitleId(this.id);
    inject(DestroyRef).onDestroy(() => this.drawer.registerTitleId(null));
  }
}

/**
 * The drawer's description (`<p>`, per shadcn's `DrawerDescription`). Registers
 * itself with the enclosing `AndesDrawer` so the panel's `aria-describedby`
 * points at it.
 */
@Component({
  selector: 'andes-drawer-description',
  template: '<p [id]="id"><ng-content /></p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    p {
      font-size: 0.875rem;
      color: var(--andes-color-muted-foreground);
      margin: 0;
    }
  `,
})
export class AndesDrawerDescription {
  protected readonly id = `andes-drawer-description-${nextId++}`;
  private readonly drawer = inject(AndesDrawer);

  constructor() {
    this.drawer.registerDescriptionId(this.id);
    inject(DestroyRef).onDestroy(() => this.drawer.registerDescriptionId(null));
  }
}
