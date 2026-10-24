import { CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
import {
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
} from '@angular/core';

import { AndesTable } from './table';

/**
 * Styles a native `<thead>`. Only ever applied to a real `<thead>`, so the implicit
 * `rowgroup` role and the header/body association come from the element itself.
 *
 * It is also the drop zone for column reordering (`AndesTable.reorderable`): a
 * horizontal CDK drop list whose items are the header cells, each a CDK drag
 * (see `AndesTableHead`). It stays disabled - inert - unless the table is
 * reorderable, and never lets a column land on a fixed or unkeyed one.
 */
@Directive({
  selector: 'thead[andesTableHeader]',
  host: { class: 'andes-table__header' },
  hostDirectives: [CdkDropList],
})
export class AndesTableHeader {
  private readonly table = inject(AndesTable);
  private readonly dropList = inject(CdkDropList, { self: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const dropList = this.dropList;
    dropList.orientation = 'horizontal';
    dropList.lockAxis = 'x';
    // Only movable columns may be displaced; a column never lands on a pinned one.
    dropList.sortPredicate = (index) => {
      const item = dropList.getSortedItems()[index];
      return !!item && AndesTable.isMovableCell(item.element.nativeElement);
    };

    effect(() => {
      dropList.disabled = !this.table.reorderable();
    });

    // The CDK reads direction from a `dir` directive; follow the computed direction
    // instead, so sorting is right in an RTL page without one.
    const ref = dropList._dropListRef;
    const started = ref.beforeStarted.subscribe(() =>
      ref.withDirection(
        getComputedStyle(this.host.nativeElement).direction === 'rtl'
          ? 'rtl'
          : 'ltr',
      ),
    );
    const dropped = dropList.dropped.subscribe(
      (event: CdkDragDrop<unknown>) => {
        const cell = event.item.element.nativeElement as HTMLTableCellElement;
        const row = cell.parentElement as HTMLTableRowElement | null;
        if (row && event.previousIndex !== event.currentIndex) {
          this.table.moveColumn(row, event.previousIndex, event.currentIndex);
        }
      },
    );
    inject(DestroyRef).onDestroy(() => {
      started.unsubscribe();
      dropped.unsubscribe();
    });
  }
}
