import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';

import { AndesSheet } from './sheet';

let nextId = 0;

/**
 * Layout wrapper for a sheet's title + description, pinned above the scrolling
 * body. Place it directly inside `<andes-sheet>`.
 *
 * An element marked `andesSheetExtra` is laid out at the header's trailing end,
 * opposite the title - Ant Design's `extra` slot for header actions:
 *
 * ```html
 * <andes-sheet-header>
 *   <andes-sheet-title>Edit profile</andes-sheet-title>
 *   <andes-button andesSheetExtra size="sm">Help</andes-button>
 * </andes-sheet-header>
 * ```
 */
@Component({
  selector: 'andes-sheet-header',
  template: `
    <div class="andes-sheet-header__text"><ng-content /></div>
    <ng-content select="[andesSheetExtra]" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.andes-sheet-header--closable]': 'sheet.closable()',
  },
  styles: `
    :host {
      display: flex;
      flex-shrink: 0;
      align-items: flex-start;
      gap: var(--andes-space-3);
      padding: var(--andes-sheet-padding, var(--andes-space-4))
        var(--andes-sheet-padding, var(--andes-space-4)) 0;
    }

    :host(.andes-sheet-header--closable) {
      padding-inline-end: calc(
        var(--andes-space-3) + 1.75rem + var(--andes-space-2)
      );
    }

    .andes-sheet-header__text {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      gap: var(--andes-space-1);
      min-width: 0;
    }
  `,
})
export class AndesSheetHeader {
  protected readonly sheet = inject(AndesSheet);
}

/** Layout wrapper for a sheet's footer actions, pinned below the scrolling body. */
@Component({
  selector: 'andes-sheet-footer',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      flex-direction: row;
      justify-content: flex-end;
      gap: var(--andes-space-2);
      flex-shrink: 0;
      padding: 0 var(--andes-sheet-padding, var(--andes-space-4))
        var(--andes-sheet-padding, var(--andes-space-4));
    }
  `,
})
export class AndesSheetFooter {}

/**
 * The sheet's heading (`<h2>`, per shadcn's `SheetTitle`). Registers itself with
 * the enclosing `AndesSheet` so the panel's `aria-labelledby` points at it.
 */
@Component({
  selector: 'andes-sheet-title',
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
export class AndesSheetTitle {
  protected readonly id = `andes-sheet-title-${nextId++}`;
  private readonly sheet = inject(AndesSheet);

  constructor() {
    this.sheet.registerTitleId(this.id);
    inject(DestroyRef).onDestroy(() => this.sheet.registerTitleId(null));
  }
}

/**
 * The sheet's description (`<p>`, per shadcn's `SheetDescription`). Registers
 * itself with the enclosing `AndesSheet` so the panel's `aria-describedby` points
 * at it.
 */
@Component({
  selector: 'andes-sheet-description',
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
export class AndesSheetDescription {
  protected readonly id = `andes-sheet-description-${nextId++}`;
  private readonly sheet = inject(AndesSheet);

  constructor() {
    this.sheet.registerDescriptionId(this.id);
    inject(DestroyRef).onDestroy(() => this.sheet.registerDescriptionId(null));
  }
}
