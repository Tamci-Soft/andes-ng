import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AndesCheckedTree } from './checked-tree';
import { AndesSelectionModel } from './selection-model';
import type { AndesSelectionChange } from './selection-model-types';

interface Invoice {
  readonly id: number;
  readonly label: string;
  readonly locked?: boolean;
}

/**
 * A table-shaped consumer: header "select all" with the mixed state, per-row checkboxes,
 * shift-click ranges, a locked row, a maximum, and a source list that can shrink. It uses the
 * model exactly the way `AndesTable` would, so it proves the API reads naturally in a template.
 */
@Component({
  selector: 'andes-harness-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      class="all"
      type="checkbox"
      [checked]="state() === 'all'"
      [indeterminate]="state() === 'some'"
      (click)="selection.toggleAll(rows())"
    />
    @for (row of rows(); track row.id) {
      <input
        class="row"
        type="checkbox"
        [attr.data-id]="row.id"
        [checked]="selection.isSelected(row)"
        [disabled]="selection.isDisabled(row)"
        (click)="onRowClick(row, $event)"
      />
    }
    <output>{{ selection.size() }}</output>
  `,
})
class HarnessTable {
  readonly rows = signal<readonly Invoice[]>([
    { id: 1, label: 'one' },
    { id: 2, label: 'two' },
    { id: 3, label: 'three', locked: true },
    { id: 4, label: 'four' },
    { id: 5, label: 'five' },
  ]);
  readonly max = input<number | undefined>(undefined);
  readonly selectionChange = output<AndesSelectionChange<Invoice>>();

  readonly selection = new AndesSelectionModel<Invoice>({
    keyOf: (row) => row.id,
    isDisabled: (row) => row.locked === true,
    max: computed(() => this.max()),
    // Programmatic writes (like pruning vanished rows) must not be echoed as user events.
    onChange: (change) => {
      if (change.source === 'interaction') {
        this.selectionChange.emit(change);
      }
    },
  });

  protected readonly state = computed(() =>
    this.selection.stateOf(this.rows()),
  );

  protected onRowClick(row: Invoice, event: MouseEvent): void {
    const anchor = this.selection.anchor();
    if (event.shiftKey && anchor) {
      this.selection.selectRange(
        this.rows(),
        anchor,
        row,
        !this.selection.isSelected(row),
      );
    } else {
      this.selection.toggle(row);
    }
  }
}

describe('AndesSelectionModel in a table-like component', () => {
  let fixture: ComponentFixture<HarnessTable>;
  let emitted: AndesSelectionChange<Invoice>[];

  const host = (): HTMLElement => fixture.nativeElement;
  const header = () => host().querySelector('.all') as HTMLInputElement;
  const box = (id: number) =>
    host().querySelector(`[data-id="${id}"]`) as HTMLInputElement;
  const count = () => host().querySelector('output')?.textContent;
  const click = (element: HTMLElement, init: MouseEventInit = {}) => {
    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, ...init }),
    );
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(HarnessTable);
    emitted = [];
    fixture.componentInstance.selectionChange.subscribe((change) =>
      emitted.push(change),
    );
    fixture.detectChanges();
  });

  it('renders an empty selection', () => {
    expect(header().checked).toBe(false);
    expect(header().indeterminate).toBe(false);
    expect(count()).toBe('0');
    expect(box(3).disabled).toBe(true);
  });

  it('reflects row clicks in the checkboxes, the count and the header', () => {
    click(box(1));

    expect(box(1).checked).toBe(true);
    expect(header().indeterminate).toBe(true);
    expect(count()).toBe('1');
    expect(emitted).toHaveLength(1);
    expect(emitted[0].added.map((row) => row.id)).toEqual([1]);
  });

  it('selects every unlocked row from the header and checks it', () => {
    click(header());

    expect([1, 2, 4, 5].every((id) => box(id).checked)).toBe(true);
    expect(box(3).checked).toBe(false);
    expect(header().checked).toBe(true);
    expect(header().indeterminate).toBe(false);

    click(header());
    expect(count()).toBe('0');
    expect(header().checked).toBe(false);
  });

  it('extends a shift-click range from the last clicked row and skips the locked row', () => {
    click(box(1));
    click(box(5), { shiftKey: true });

    expect([1, 2, 4, 5].every((id) => box(id).checked)).toBe(true);
    expect(box(3).checked).toBe(false);
    expect(emitted).toHaveLength(2);
    expect(emitted[1].added.map((row) => row.id)).toEqual([2, 4, 5]);
  });

  it('shift-clicking a selected row deselects the range', () => {
    click(header());
    click(box(2));
    click(box(5), { shiftKey: true });

    expect(count()).toBe('1');
    expect(box(1).checked).toBe(true);
  });

  it('follows a max input and keeps the header from sticking at mixed', () => {
    fixture.componentRef.setInput('max', 2);
    fixture.detectChanges();

    click(header());
    expect(count()).toBe('2');
    expect(header().indeterminate).toBe(true);

    click(header());
    expect(count()).toBe('0');
  });

  it('stays consistent when the source list loses rows', () => {
    click(header());
    expect(header().checked).toBe(true);

    fixture.componentInstance.rows.set([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ]);
    fixture.componentInstance.selection.retainOnly(
      fixture.componentInstance.rows(),
    );
    fixture.detectChanges();

    expect(count()).toBe('2');
    expect(header().checked).toBe(true);
    expect(emitted).toHaveLength(1);
  });

  it('survives rows being re-fetched as new objects with the same ids', () => {
    click(box(1));

    fixture.componentInstance.rows.set(
      fixture.componentInstance.rows().map((row) => ({ ...row })),
    );
    fixture.detectChanges();

    expect(box(1).checked).toBe(true);
    expect(count()).toBe('1');
  });
});

interface Folder {
  readonly id: string;
  readonly name: string;
  readonly locked?: boolean;
  readonly children?: readonly Folder[];
}

const FOLDERS: readonly Folder[] = [
  {
    id: 'docs',
    name: 'Docs',
    children: [
      { id: 'docs/a', name: 'A' },
      { id: 'docs/b', name: 'B' },
      { id: 'docs/private', name: 'Private', locked: true },
    ],
  },
  { id: 'music', name: 'Music' },
];

/** A tree-shaped consumer: nested rows flattened for rendering, tri-state checkboxes. */
@Component({
  selector: 'andes-harness-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (row of rows(); track row.folder.id) {
      <button
        type="button"
        role="checkbox"
        [attr.data-id]="row.folder.id"
        [attr.aria-checked]="ariaChecked(row.folder.id)"
        [disabled]="tree.isDisabled(row.folder.id)"
        [style.padding-inline-start.px]="row.depth * 16"
        (click)="tree.toggle(row.folder.id)"
      >
        {{ row.folder.name }}
      </button>
    }
    <output>{{ tree.checkedKeysByStrategy('parent').join('|') }}</output>
  `,
})
class HarnessTree {
  readonly strict = input(false);

  readonly tree = new AndesCheckedTree<Folder, string>({
    nodes: FOLDERS,
    childrenOf: (folder) => folder.children,
    keyOf: (folder) => folder.id,
    isDisabled: (folder) => folder.locked === true,
    strict: computed(() => this.strict()),
  });

  protected readonly rows = computed(() => {
    const result: { folder: Folder; depth: number }[] = [];
    const walk = (folders: readonly Folder[], depth: number) => {
      for (const folder of folders) {
        result.push({ folder, depth });
        walk(folder.children ?? [], depth + 1);
      }
    };
    walk(FOLDERS, 0);
    return result;
  });

  protected ariaChecked(id: string): string {
    const state = this.tree.stateOf(id);
    return state === 'checked' ? 'true' : state === 'mixed' ? 'mixed' : 'false';
  }
}

describe('AndesCheckedTree in a tree-like component', () => {
  let fixture: ComponentFixture<HarnessTree>;

  const host = (): HTMLElement => fixture.nativeElement;
  const node = (id: string) =>
    host().querySelector(`[data-id="${id}"]`) as HTMLButtonElement;
  const aria = (id: string) => node(id).getAttribute('aria-checked');
  const click = (id: string) => {
    node(id).click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(HarnessTree);
    fixture.detectChanges();
  });

  it('renders aria-checked true / mixed / false from the tree state', () => {
    click('docs/a');

    expect(aria('docs/a')).toBe('true');
    expect(aria('docs')).toBe('mixed');
    expect(aria('docs/b')).toBe('false');
    expect(aria('music')).toBe('false');
  });

  it('checks a folder and its available children, leaving the locked one alone', () => {
    click('docs');

    expect(aria('docs')).toBe('true');
    expect(aria('docs/a')).toBe('true');
    expect(aria('docs/b')).toBe('true');
    expect(aria('docs/private')).toBe('false');
    expect(node('docs/private').disabled).toBe(true);
    expect(host().querySelector('output')?.textContent).toBe('docs');
  });

  it('reports leaves collapsed into the folder with the parent strategy', () => {
    click('docs/a');
    click('music');

    expect(host().querySelector('output')?.textContent).toBe('docs/a|music');
  });

  it('turns propagation off with the strict input', () => {
    fixture.componentRef.setInput('strict', true);
    fixture.detectChanges();

    click('docs');

    expect(aria('docs')).toBe('true');
    expect(aria('docs/a')).toBe('false');
  });
});
