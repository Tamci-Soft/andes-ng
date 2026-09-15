import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';

import { AndesSheet } from './sheet';

let nextId = 0;

/**
 * Layout wrapper for a sheet's title + description. Purely presentational - place
 * it as the first child inside `<andes-sheet>`'s projected content.
 */
@Component({
  selector: 'andes-sheet-header',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--andes-space-1);
      padding: var(--andes-space-4) var(--andes-space-4) 0;
    }
  `,
})
export class AndesSheetHeader {}

/** Layout wrapper for a sheet's footer actions. Pinned to the panel's bottom. */
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
      padding: 0 var(--andes-space-4) var(--andes-space-4);
      margin-top: auto;
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
