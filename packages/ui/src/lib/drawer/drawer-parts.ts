import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';

import { AndesDrawer } from './drawer';

let nextId = 0;

/**
 * Layout wrapper for a drawer's title + description, pinned above the scrolling
 * body. Place it directly inside `<andes-drawer>`.
 *
 * An element marked `andesDrawerExtra` is laid out at the header's trailing end,
 * opposite the title - a slot for header actions:
 *
 * ```html
 * <andes-drawer-header>
 *   <andes-drawer-title>Edit profile</andes-drawer-title>
 *   <andes-button andesDrawerExtra size="sm">Help</andes-button>
 * </andes-drawer-header>
 * ```
 */
@Component({
  selector: 'andes-drawer-header',
  template: `
    <div class="andes-drawer-header__text"><ng-content /></div>
    <ng-content select="[andesDrawerExtra]" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.andes-drawer-header--closable]': 'drawer.closable()',
  },
  styles: `
    :host {
      display: flex;
      flex-shrink: 0;
      align-items: flex-start;
      gap: var(--andes-space-3);
      padding: var(--andes-drawer-padding, var(--andes-space-4))
        var(--andes-drawer-padding, var(--andes-space-4)) 0;
    }

    /* Clears the close control (its box ends 0.375rem inside the padding, see
       drawer.css) plus a visible gap, so a long title wraps before running
       under it. */
    :host(.andes-drawer-header--closable) {
      padding-inline: calc(
        var(--andes-drawer-padding, var(--andes-space-4)) + 2rem
      );
    }

    .andes-drawer-header__text {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      gap: var(--andes-space-1);
      min-width: 0;
      text-align: center;
    }
  `,
})
export class AndesDrawerHeader {
  protected readonly drawer = inject(AndesDrawer);
}

/** Layout wrapper for a drawer's footer actions, pinned below the scrolling body. */
@Component({
  selector: 'andes-drawer-footer',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--andes-space-2);
      flex-shrink: 0;
      padding: 0 var(--andes-drawer-padding, var(--andes-space-4))
        var(--andes-drawer-padding, var(--andes-space-4));
    }
  `,
})
export class AndesDrawerFooter {}

/**
 * The drawer's heading (`<h2>`). Registers itself
 * with the enclosing `AndesDrawer` so the panel's `aria-labelledby` points at it.
 */
@Component({
  selector: 'andes-drawer-title',
  template: '<h2 [id]="id"><ng-content /></h2>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    /* 16px/24px semibold, the same title step as AndesDialog. */
    h2 {
      margin: 0;
      /* 16px, the size every surface title shares (dialog, card, popover). */
      font-size: 1rem;
      /* Semibold, matching the dialog title: at 500 the title carried no more
         weight than a field label in the body. */
      font-weight: 600;
      /* A fixed 24px line, which the close control is centred on. */
      line-height: 1.5rem;
      letter-spacing: -0.01em;
      color: var(--andes-color-popover-foreground);
      overflow-wrap: anywhere;
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
 * The drawer's description (`<p>`). Registers
 * itself with the enclosing `AndesDrawer` so the panel's `aria-describedby`
 * points at it.
 */
@Component({
  selector: 'andes-drawer-description',
  template: '<p [id]="id"><ng-content /></p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    p {
      margin: 0;
      font-size: var(--andes-text-font-size, 0.875rem);
      line-height: var(--andes-text-line-height, 1.375rem);
      color: var(--andes-color-muted-foreground);
      overflow-wrap: anywhere;
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
