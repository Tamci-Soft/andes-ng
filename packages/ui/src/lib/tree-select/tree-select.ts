import {
  andesOverlayPreset,
  AndesOverlayPrimitive,
  provideAndesOverlay,
  type AndesOverlayAlign,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  input,
  model,
  numberAttribute,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

import { AndesTree } from '../tree/tree';
import { AndesTreeNodeTemplate } from '../tree/tree-node-template';
import type {
  AndesTreeCheckedStrategy,
  AndesTreeCheckEvent,
  AndesTreeFieldNames,
  AndesTreeKey,
  AndesTreeLoadData,
  AndesTreeNode,
  AndesTreeNodeEvent,
  AndesTreeSelectEvent,
} from '../tree/tree-types';
import {
  andesCheckedKeysByStrategy,
  andesConductCheck,
  andesCreateTreeIndex,
  andesGetExpandableKeys,
  andesToggleCheck,
} from '../tree/tree-utils';
import type {
  AndesTreeSelectLabels,
  AndesTreeSelectMaxTagPlaceholder,
  AndesTreeSelectOption,
  AndesTreeSelectPlacement,
  AndesTreeSelectSearchPlacement,
  AndesTreeSelectSize,
  AndesTreeSelectStatus,
  AndesTreeSelectValue,
  AndesTreeSelectVariant,
} from './tree-select-types';

const DEFAULT_LABELS: AndesTreeSelectLabels = {
  empty: 'No data',
  loading: 'Loading',
  searchPlaceholder: 'Search',
  searchLabel: 'Search the options',
  clear: 'Clear',
  remove: (title) => `Remove ${title}`,
  more: (count) => `+ ${count} ...`,
};

// The panel stays above or below the field: beside it, it would no longer read as its list.
const PLACEMENTS: Readonly<
  Record<
    AndesTreeSelectPlacement,
    { side: AndesOverlaySide; align: AndesOverlayAlign }
  >
> = {
  bottomLeft: { side: 'bottom', align: 'start' },
  bottomRight: { side: 'bottom', align: 'end' },
  topLeft: { side: 'top', align: 'start' },
  topRight: { side: 'top', align: 'end' },
};

let nextId = 0;

function optionalNumber(value: unknown): number | undefined {
  return value === undefined || value === null || value === ''
    ? undefined
    : numberAttribute(value);
}

function toKeys(value: AndesTreeSelectValue | undefined): AndesTreeKey[] {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * A select whose options form a tree. The field shows the selection (one value, or removable
 * tags); the panel that opens above or below it holds an {@link AndesTree}, so every tree
 * feature - expanding, filtering, loading children on demand, field renaming, custom node
 * content, virtual scrolling - is available inside the panel.
 *
 * ```html
 * <andes-tree-select
 *   [nodes]="regions"
 *   [(value)]="region"
 *   placeholder="Pick a region"
 *   aria-label="Region"
 * />
 * ```
 *
 * ## Values
 *
 * The value is the key of the selected node, or `null`. With `multiple` it is an array of keys
 * and the field shows a tag per node. With `checkable` the panel shows checkboxes that cascade
 * (use `checkStrictly` to make them independent) and `showCheckedStrategy` decides what the
 * value (and the tags) contain when a parent is checked: `child` (the default) only the leaves,
 * `parent` the topmost checked nodes, `all` every checked node.
 *
 * ## Search
 *
 * `showSearch` adds a search box that filters the tree, in the panel by default or in the field
 * itself with `searchPlacement="trigger"`.
 *
 * ## Keyboard
 *
 * With the field focused, ArrowDown, Enter and Space open the panel (ArrowDown again moves into
 * the tree), Escape closes it and Tab leaves. Backspace removes the last tag of a multiple
 * select. Inside the tree the usual treeview keys apply.
 *
 * ## Forms
 *
 * It is a `ControlValueAccessor`, and forwards `id`, `name` and the `aria-*` inputs to the
 * focusable field, so it works with `andes-form-field`.
 */
@Component({
  selector: 'andes-tree-select',
  imports: [NgTemplateOutlet, AndesTree],
  templateUrl: './tree-select.html',
  styleUrl: './tree-select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideAndesOverlay(),
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesTreeSelect),
      multi: true,
    },
  ],
  host: {
    // Forwarded to the real combobox instead: a screen reader never sees this host element.
    '[attr.id]': 'null',
    '[attr.name]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
  },
})
export class AndesTreeSelect implements ControlValueAccessor {
  private readonly injector = inject(Injector);
  private readonly overlay = inject(AndesOverlayPrimitive);

  /** The options. Update it to deliver children loaded on demand. */
  readonly nodes = input<AndesTreeNode[]>([]);
  readonly fieldNames = input<AndesTreeFieldNames | undefined>(undefined);

  /** A key, `null`, or (multiple and checkable) an array of keys. */
  readonly value = model<AndesTreeSelectValue>(null);
  /** Open nodes, two-way. */
  readonly expandedKeys = model<AndesTreeKey[]>([]);
  /** The text in the search box. */
  readonly searchValue = model('');

  readonly multiple = input(false, { transform: booleanAttribute });
  /** Checkboxes in the panel; implies a multiple value. */
  readonly checkable = input(false, { transform: booleanAttribute });
  readonly checkStrictly = input(false, { transform: booleanAttribute });
  readonly showCheckedStrategy = input<AndesTreeCheckedStrategy>('child');

  readonly size = input<AndesTreeSelectSize>('md');
  readonly variant = input<AndesTreeSelectVariant>('outlined');
  readonly status = input<AndesTreeSelectStatus | undefined>(undefined);
  readonly placeholder = input<string | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly allowClear = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });

  readonly showSearch = input(false, { transform: booleanAttribute });
  readonly searchPlacement = input<AndesTreeSelectSearchPlacement>('panel');
  readonly filterFn = input<
    ((node: AndesTreeNode, query: string) => boolean) | undefined
  >(undefined);

  /** Open every branch the first time options arrive. */
  readonly treeDefaultExpandAll = input(false, { transform: booleanAttribute });
  readonly loadData = input<AndesTreeLoadData | undefined>(undefined);
  readonly showLine = input(false, { transform: booleanAttribute });
  readonly showIcon = input(false, { transform: booleanAttribute });
  readonly virtualScroll = input(false, { transform: booleanAttribute });
  /** Tallest the panel's list grows before it scrolls (a number is px). */
  readonly panelHeight = input<number>(320);

  /** How many tags to show before the rest collapse into one "+ N" tag. */
  readonly maxTagCount = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  });
  readonly maxTagPlaceholder = input<
    AndesTreeSelectMaxTagPlaceholder | undefined
  >(undefined);

  readonly placement = input<AndesTreeSelectPlacement>('bottomLeft');
  /** Make the panel as wide as the field. Otherwise it is as wide as its content. */
  readonly matchTriggerWidth = input(true, { transform: booleanAttribute });
  readonly labels = input<Partial<AndesTreeSelectLabels>>({});

  readonly id = input<string | undefined>(undefined);
  readonly name = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });
  readonly ariaDescribedby = input<string | undefined>(undefined, {
    alias: 'aria-describedby',
  });
  readonly ariaInvalid = input(false, {
    alias: 'aria-invalid',
    transform: booleanAttribute,
  });

  /** The panel opened (`true`) or closed (`false`). */
  readonly openChange = output<boolean>();
  /** The search text changed because the user typed. */
  readonly searched = output<string>();
  /** The clear button emptied the select. */
  readonly cleared = output<void>();
  readonly focused = output<FocusEvent>();
  readonly blurred = output<FocusEvent>();

  /** Custom node content for the panel's tree. */
  protected readonly nodeTemplate = contentChild(AndesTreeNodeTemplate);

  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');
  private readonly searchInput =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly tree = viewChild(AndesTree);
  private readonly panelTemplate =
    viewChild.required<TemplateRef<unknown>>('panel');

  protected readonly uid = nextId++;
  protected readonly panelId = `andes-tree-select-panel-${this.uid}`;
  protected readonly summaryId = `andes-tree-select-summary-${this.uid}`;

  /** Whether the panel is open. `false` as soon as a close is requested. */
  readonly isOpen = this.overlay.isOpen;

  private readonly disabledByForm = signal(false);
  protected readonly isDisabled = computed(
    () => this.disabled() || this.disabledByForm(),
  );

  protected readonly text = computed<AndesTreeSelectLabels>(() => ({
    ...DEFAULT_LABELS,
    ...this.labels(),
  }));

  protected readonly multiMode = computed(
    () => this.multiple() || this.checkable(),
  );
  protected readonly searchInTrigger = computed(
    () => this.showSearch() && this.searchPlacement() === 'trigger',
  );
  protected readonly searchInPanel = computed(
    () => this.showSearch() && this.searchPlacement() === 'panel',
  );
  /** The tree's `multiple` is about selection; a checkable tree selects nothing. */
  protected readonly treeSelectable = computed(() => !this.checkable());

  protected readonly index = computed(() =>
    andesCreateTreeIndex(this.nodes(), this.fieldNames()),
  );
  private readonly titleCache = new Map<AndesTreeKey, string>();

  protected readonly valueKeys = computed(() => toKeys(this.value()));
  /** The strategy that applies: independent nodes have no parents to fold into. */
  private readonly strategy = computed<AndesTreeCheckedStrategy>(() =>
    this.checkStrictly() ? 'all' : this.showCheckedStrategy(),
  );
  /** Checked keys in full (parents and children), conformed to the cascade. */
  private readonly checkedSet = computed(
    () =>
      andesConductCheck(this.valueKeys(), this.index(), this.checkStrictly())
        .checked,
  );
  /** The keys the field shows: the value, narrowed by the strategy when checkable. */
  private readonly displayKeys = computed<AndesTreeKey[]>(() => {
    const keys = this.valueKeys();
    if (!this.checkable()) {
      return keys;
    }
    const index = this.index();
    return [
      ...andesCheckedKeysByStrategy(this.checkedSet(), index, this.strategy()),
      ...keys.filter((key) => !index.byKey.has(key)),
    ];
  });

  protected readonly selectedOptions = computed<AndesTreeSelectOption[]>(() =>
    this.displayKeys().map((key) => this.optionFor(key)),
  );
  protected readonly hasValue = computed(
    () => this.selectedOptions().length > 0,
  );
  protected readonly summary = computed(() =>
    this.selectedOptions()
      .map((option) => option.title)
      .join(', '),
  );

  protected readonly visibleTags = computed(() => {
    const max = this.maxTagCount();
    const all = this.selectedOptions();
    return max === undefined ? all : all.slice(0, Math.max(0, max));
  });
  protected readonly omittedTags = computed(() => {
    const max = this.maxTagCount();
    return max === undefined
      ? []
      : this.selectedOptions().slice(Math.max(0, max));
  });
  protected readonly omittedTemplate = computed(() => {
    const placeholder = this.maxTagPlaceholder();
    return placeholder instanceof TemplateRef ? placeholder : null;
  });

  protected readonly treeSelectedKeys = computed(() =>
    this.checkable() ? [] : this.valueKeys(),
  );
  protected readonly treeCheckedKeys = computed(() =>
    this.checkable() ? this.valueKeys() : [],
  );
  protected readonly treeLabels = computed(() => ({
    empty: this.text().empty,
    loading: this.text().loading,
  }));

  protected readonly invalid = computed(
    () => this.ariaInvalid() || this.status() === 'error',
  );
  protected readonly describedBy = computed(
    () =>
      [this.ariaDescribedby(), this.summaryId].filter(Boolean).join(' ') ||
      null,
  );
  protected readonly showClear = computed(
    () => this.allowClear() && this.hasValue() && !this.isDisabled(),
  );
  protected readonly side = computed(() => PLACEMENTS[this.placement()].side);
  protected readonly searching = computed(() => this.searchValue() !== '');

  private expandAllApplied = false;
  private onChange: (value: AndesTreeSelectValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    effect(() => {
      const { side, align } = PLACEMENTS[this.placement()];
      this.overlay.configure({
        ...andesOverlayPreset('menu'),
        role: 'none',
        layer: 'dropdown',
        autoFocus: this.searchInTrigger() ? 'none' : 'first-tabbable',
        repositionOnScroll: true,
        positioning: {
          kind: 'anchored',
          side,
          align,
          sideOffset: 4,
          flip: true,
          // Beside the field the panel would no longer read as its list: stay above or below.
          crossSideFallback: false,
          shift: true,
          matchAnchorWidth: this.matchTriggerWidth(),
        },
      });
    });

    effect(() => this.overlay.registerAnchor(this.box().nativeElement));

    // Remember every title ever seen, so a selected node that leaves `nodes` keeps its label.
    effect(() => {
      const index = this.index();
      for (const [key, entry] of index.byKey) {
        this.titleCache.set(key, entry.title);
      }
    });

    effect(() => {
      const nodes = this.nodes();
      if (this.expandAllApplied || nodes.length === 0) {
        return;
      }
      this.expandAllApplied = true;
      if (this.treeDefaultExpandAll()) {
        untracked(() =>
          this.expandedKeys.set(andesGetExpandableKeys(this.index())),
        );
      }
    });

    // Tags changing the field's height move the panel's anchor.
    effect(() => {
      this.selectedOptions();
      if (untracked(() => this.isOpen())) {
        afterNextRender(() => this.overlay.updatePosition(), {
          injector: this.injector,
        });
      }
    });

    this.overlay.opened
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.openChange.emit(true));
    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.searchValue() !== '') {
        this.searchValue.set('');
      }
      this.onTouched();
      this.openChange.emit(false);
    });
  }

  /* ---------------------------------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------------------------------- */

  open(): void {
    if (this.isDisabled() || this.isOpen()) {
      return;
    }
    this.revealSelection();
    this.overlay.open(this.panelTemplate(), {
      restoreFocusTo: this.focusTarget(),
    });
    afterNextRender(() => this.scrollToSelection(), {
      injector: this.injector,
    });
  }

  close(): void {
    this.overlay.close('imperative');
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  focus(): void {
    this.focusTarget().focus();
  }

  blur(): void {
    this.focusTarget().blur();
  }

  /* ---------------------------------------------------------------------------------------
   * ControlValueAccessor
   * ------------------------------------------------------------------------------------- */

  writeValue(value: AndesTreeSelectValue | undefined): void {
    this.value.set(value ?? (this.multiMode() ? [] : null));
  }

  registerOnChange(fn: (value: AndesTreeSelectValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
    if (isDisabled) {
      this.close();
    }
  }

  /* ---------------------------------------------------------------------------------------
   * Template helpers
   * ------------------------------------------------------------------------------------- */

  protected omittedText(omitted: AndesTreeSelectOption[]): string {
    const placeholder = this.maxTagPlaceholder();
    return typeof placeholder === 'function'
      ? placeholder(omitted)
      : this.text().more(omitted.length);
  }

  private optionFor(key: AndesTreeKey): AndesTreeSelectOption {
    const entry = this.index().byKey.get(key);
    return {
      key,
      title: entry?.title ?? this.titleCache.get(key) ?? String(key),
      node: entry?.node,
    };
  }

  private focusTarget(): HTMLElement {
    return this.searchInTrigger()
      ? (this.searchInput()?.nativeElement ?? this.box().nativeElement)
      : this.box().nativeElement;
  }

  /* ---------------------------------------------------------------------------------------
   * Field interaction
   * ------------------------------------------------------------------------------------- */

  protected onBoxMouseDown(event: MouseEvent): void {
    if (this.isDisabled()) {
      event.preventDefault();
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      // The clear and remove buttons never take focus from the field.
      event.preventDefault();
      return;
    }
    if (
      this.searchInTrigger() &&
      target !== this.searchInput()?.nativeElement
    ) {
      event.preventDefault();
      this.searchInput()?.nativeElement.focus();
    }
  }

  protected onBoxClick(event: MouseEvent): void {
    if (this.isDisabled() || (event.target as HTMLElement).closest('button')) {
      return;
    }
    if (this.searchInTrigger()) {
      this.open();
    } else {
      this.toggle();
    }
  }

  protected onComboboxKeydown(event: KeyboardEvent): void {
    if (this.isDisabled() || event.defaultPrevented) {
      return;
    }
    const inSearch = this.searchInTrigger();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (this.isOpen()) {
          this.focusTree();
        } else {
          this.open();
        }
        break;
      case 'ArrowUp':
        if (event.altKey && this.isOpen()) {
          event.preventDefault();
          this.close();
        }
        break;
      case 'Enter':
      case ' ':
        if (event.key === ' ' && inSearch) {
          break;
        }
        if (event.key === 'Enter' && inSearch && this.isOpen()) {
          break;
        }
        event.preventDefault();
        this.toggle();
        break;
      case 'Backspace':
        if (
          this.multiMode() &&
          this.searchValue() === '' &&
          this.selectedOptions().length > 0
        ) {
          this.removeOption(
            this.selectedOptions().at(-1) as AndesTreeSelectOption,
          );
        }
        break;
      case 'Tab':
        if (this.isOpen()) {
          this.close();
        }
        break;
    }
  }

  protected onSearchInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.searchValue.set(text);
    this.searched.emit(text);
    if (!this.isOpen()) {
      this.open();
    }
  }

  protected onFocusIn(event: FocusEvent): void {
    this.focused.emit(event);
  }

  protected onFocusOut(event: FocusEvent): void {
    this.blurred.emit(event);
    const next = event.relatedTarget as Node | null;
    const pane = this.overlay.panelElement();
    const inside =
      !!next &&
      (this.box().nativeElement.contains(next) || !!pane?.contains(next));
    if (!inside && !this.isOpen()) {
      this.onTouched();
    }
  }

  protected clear(event: Event): void {
    event.stopPropagation();
    this.commit(this.multiMode() ? [] : null);
    this.cleared.emit();
    this.focus();
  }

  protected removeOption(option: AndesTreeSelectOption, event?: Event): void {
    event?.stopPropagation();
    if (this.isDisabled()) {
      return;
    }
    if (this.checkable()) {
      const index = this.index();
      const state = andesToggleCheck(
        this.checkedSet(),
        index,
        option.key,
        false,
        this.checkStrictly(),
      );
      this.commit(this.fromCheckState(state.checked));
    } else {
      this.commit(this.valueKeys().filter((key) => key !== option.key));
    }
  }

  /* ---------------------------------------------------------------------------------------
   * Panel interaction
   * ------------------------------------------------------------------------------------- */

  protected onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      // Leave for the next control after the field: put focus on the field and let the
      // browser's own Tab move on from there.
      this.focusTarget().focus();
      this.close();
    }
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusTree();
    }
  }

  protected onTreeSelect(event: AndesTreeSelectEvent): void {
    if (this.multiple()) {
      this.commit(event.selectedKeys);
    } else {
      this.commit(event.selected ? event.key : null);
      this.close();
    }
  }

  protected onTreeClick(event: AndesTreeNodeEvent): void {
    // Picking the node that is already selected changes nothing but still ends the choice.
    if (!this.multiMode() && this.valueKeys()[0] === event.key) {
      const entry = this.index().byKey.get(event.key);
      if (entry?.selectable) {
        this.close();
      }
    }
  }

  protected onTreeCheck(event: AndesTreeCheckEvent): void {
    this.commit(this.fromCheckState(new Set(event.checkedKeys)));
  }

  private fromCheckState(checked: ReadonlySet<AndesTreeKey>): AndesTreeKey[] {
    const index = this.index();
    return [
      ...andesCheckedKeysByStrategy(checked, index, this.strategy()),
      // Keys whose nodes have not been loaded yet are not the cascade's to drop.
      ...this.valueKeys().filter((key) => !index.byKey.has(key)),
    ];
  }

  private commit(value: AndesTreeSelectValue): void {
    this.value.set(value);
    this.onChange(value);
  }

  private focusTree(): void {
    const pane = this.overlay.panelElement();
    pane
      ?.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]')
      ?.focus();
  }

  /** Opens the ancestors of the selected nodes, so a selection is never hidden in a closed branch. */
  private revealSelection(): void {
    const index = this.index();
    const current = new Set(this.expandedKeys());
    const missing: AndesTreeKey[] = [];
    for (const key of this.valueKeys()) {
      for (
        let parent = index.byKey.get(key)?.parent;
        parent;
        parent = parent.parent
      ) {
        if (!current.has(parent.key)) {
          current.add(parent.key);
          missing.push(parent.key);
        }
      }
    }
    if (missing.length > 0) {
      this.expandedKeys.set([...this.expandedKeys(), ...missing]);
    }
  }

  private scrollToSelection(): void {
    const first = this.valueKeys().find((key) => this.index().byKey.has(key));
    if (first !== undefined) {
      this.tree()?.scrollToKey(first, { expand: false });
    }
  }
}
