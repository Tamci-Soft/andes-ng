import {
  computed,
  InjectionToken,
  Injectable,
  Signal,
  signal,
} from '@angular/core';

/**
 * One `AndesCheckbox` participating in an `AndesCheckboxGroup`.
 *
 * Both members are signals rather than plain values because an item's `value` and `disabled`
 * are themselves `input()`s that can change at any time - the group's aggregate state
 * (`allSelected`/`indeterminate`) has to recompute when they do, which it only does if it
 * reads them reactively.
 */
export interface AndesCheckboxGroupItem {
  /** `undefined` while the checkbox carries no `value` - such a checkbox is rendered inside
   *  the group but has nothing to contribute to an array of selected values, so it is ignored
   *  by the aggregate and by select-all. */
  readonly value: Signal<string | undefined>;
  readonly disabled: Signal<boolean>;
}

/**
 * Marker provided by `AndesCheckboxSelectAll` on its own host element.
 *
 * `AndesCheckbox` injects it with `{ optional: true, self: true }` to tell "I am the group's
 * select-all toggle" apart from "I am one of the group's items". Without it, a select-all
 * checkbox that happened to carry a `value` would register itself as an item and end up
 * counting toward the very aggregate it is supposed to summarize. It lives in this file
 * (rather than in checkbox-select-all.ts) purely to keep `AndesCheckbox` from importing the
 * directive that already imports `AndesCheckbox` - the token breaks that cycle.
 */
export const ANDES_CHECKBOX_SELECT_ALL = new InjectionToken<unknown>(
  'ANDES_CHECKBOX_SELECT_ALL',
);

/**
 * DI-scoped shared state for one `AndesCheckboxGroup` and the `AndesCheckbox` items projected
 * into it.
 *
 * `AndesCheckboxGroup` provides a fresh instance in its own `providers: [...]`; every
 * `AndesCheckbox` inside it injects that same instance through the element-injector hierarchy
 * (optionally - a checkbox used on its own finds no provider and simply keeps its standalone
 * behavior). This is the same convention `AndesRadioGroupState` establishes: no
 * `contentChildren()` query, no manual parent/child wiring, and every group on the page gets
 * its own isolated instance for free.
 */
@Injectable()
export class AndesCheckboxGroupState {
  private readonly _value = signal<readonly string[]>([]);
  private readonly _disabled = signal(false);
  private readonly _name = signal<string | undefined>(undefined);
  private readonly _items = signal<readonly AndesCheckboxGroupItem[]>([]);

  readonly value = this._value.asReadonly();
  readonly disabled = this._disabled.asReadonly();
  /** The group's `name`, which every item without a `name` of its own submits under. */
  readonly name = this._name.asReadonly();

  /**
   * Only ENABLED items count toward the aggregate, and only they are toggled by select-all.
   * A disabled item can never be changed by clicking select-all, so counting it would leave
   * select-all permanently stuck at `indeterminate` - visibly broken - whenever a disabled
   * item happened to be unchecked.
   */
  private readonly selectableValues = computed(() =>
    this._items()
      .filter((item) => !item.disabled())
      .map((item) => item.value())
      .filter((value): value is string => value !== undefined),
  );

  private readonly selectedCount = computed(() => {
    const selected = this._value();
    return this.selectableValues().filter((value) => selected.includes(value))
      .length;
  });

  readonly allSelected = computed(
    () =>
      this.selectableValues().length > 0 &&
      this.selectedCount() === this.selectableValues().length,
  );

  readonly someSelected = computed(() => this.selectedCount() > 0);

  /** The "mixed" state a select-all toggle renders: some, but not all, items checked. */
  readonly indeterminate = computed(
    () => this.someSelected() && !this.allSelected(),
  );

  /**
   * Invoked for USER-driven changes only (an item click or a select-all click), never for a
   * programmatic `writeValue()`/`[(value)]` write - matching `ControlValueAccessor` semantics,
   * where echoing a programmatic write back to `onChange` would feed the form its own value.
   * `AndesCheckboxGroup` registers the single handler that updates its `value` model and
   * notifies Angular forms; keeping forms wiring in the component (rather than in this
   * service) is what lets the group expose `value` as a two-way `model()` and a form control
   * at the same time, with one code path feeding both.
   */
  private onUserChange: (value: readonly string[]) => void = () => undefined;

  isSelected(value: string): boolean {
    return this._value().includes(value);
  }

  setDisabled(disabled: boolean): void {
    this._disabled.set(disabled);
  }

  setName(name: string | undefined): void {
    this._name.set(name);
  }

  /** Programmatic write - from the group's `value` model or its `writeValue()`. */
  setValue(value: readonly string[] | null | undefined): void {
    this._value.set(this.order(value ?? []));
  }

  registerItem(item: AndesCheckboxGroupItem): () => void {
    this._items.update((items) => [...items, item]);

    return () => {
      this._items.update((items) =>
        items.filter((candidate) => candidate !== item),
      );
    };
  }

  /** A single item was clicked. */
  toggleItem(value: string, checked: boolean): void {
    const current = this._value();
    if (checked === current.includes(value)) {
      return;
    }

    this.commit(
      checked ? [...current, value] : current.filter((it) => it !== value),
    );
  }

  /**
   * The select-all toggle was clicked. Selections of items that are disabled (or of values
   * with no rendered item at all) are deliberately preserved either way - select-all only ever
   * speaks for the items it can actually reach.
   */
  setAllSelected(selected: boolean): void {
    const selectable = this.selectableValues();
    const untouched = this._value().filter(
      (value) => !selectable.includes(value),
    );

    this.commit(selected ? [...untouched, ...selectable] : untouched);
  }

  registerOnUserChange(fn: (value: readonly string[]) => void): void {
    this.onUserChange = fn;
  }

  private commit(next: readonly string[]): void {
    const ordered = this.order(next);
    this._value.set(ordered);
    this.onUserChange(ordered);
  }

  /**
   * Emits the selected values in the order their checkboxes appear in the template, rather
   * than in click order, so the value is a stable function of the current selection - two
   * users ticking the same boxes in a different order produce the same array. Values with no
   * registered item (e.g. written in before the items render) keep their relative order at
   * the end.
   */
  private order(values: readonly string[]): readonly string[] {
    const unique = Array.from(new Set(values));
    const itemOrder = this._items()
      .map((item) => item.value())
      .filter((value): value is string => value !== undefined);

    return [
      ...itemOrder.filter((value) => unique.includes(value)),
      ...unique.filter((value) => !itemOrder.includes(value)),
    ];
  }
}
