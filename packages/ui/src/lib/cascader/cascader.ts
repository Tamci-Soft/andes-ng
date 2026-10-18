import {
  andesOverlayPreset,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  AndesOverlayTriggerPrimitive,
  provideAndesOverlay,
  type AndesOverlayAlign,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  ElementRef,
  forwardRef,
  inject,
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

import {
  buildTree,
  collectTerminals,
  findNode,
  highlightParts,
  nodePath,
  nodeValues,
  pathKey,
  searchPaths,
  type AndesCascaderNode,
  type AndesCascaderSearchResult,
} from './cascader-tree';
import {
  ANDES_CASCADER_DEFAULT_LABELS,
  type AndesCascaderChange,
  type AndesCascaderCheckedStrategy,
  type AndesCascaderDisplayContext,
  type AndesCascaderExpandTrigger,
  type AndesCascaderFieldNames,
  type AndesCascaderLabels,
  type AndesCascaderLoadData,
  type AndesCascaderNotFound,
  type AndesCascaderOption,
  type AndesCascaderOptionContext,
  type AndesCascaderPlacement,
  type AndesCascaderSearch,
  type AndesCascaderSize,
  type AndesCascaderStatus,
  type AndesCascaderValue,
  type AndesCascaderVariant,
} from './cascader-types';

let nextUniqueId = 0;

/** The value as the cascader holds it: one path, or with `multiple` a list of paths. */
export type AndesCascaderModel =
  | readonly AndesCascaderValue[]
  | readonly (readonly AndesCascaderValue[])[]
  | null
  | undefined;

type CheckState = 'checked' | 'indeterminate' | 'unchecked';

const PLACEMENTS: Readonly<
  Record<
    AndesCascaderPlacement,
    { side: AndesOverlaySide; align: AndesOverlayAlign }
  >
> = {
  bottomLeft: { side: 'bottom', align: 'start' },
  bottomRight: { side: 'bottom', align: 'end' },
  topLeft: { side: 'top', align: 'start' },
  topRight: { side: 'top', align: 'end' },
};

/** `undefined`/`null`/`''` stay unset; anything else goes through `numberAttribute`. */
function optionalNumber(value: unknown): number | undefined {
  return value === undefined || value === null || value === ''
    ? undefined
    : numberAttribute(value);
}

interface SelectedEntry {
  readonly path: readonly AndesCascaderValue[];
  /** The nodes of the path, or `null` when an option on it is not in `options` (yet). */
  readonly nodes: AndesCascaderNode[] | null;
  readonly labels: string[];
  readonly options: AndesCascaderOption[];
}

interface Column {
  readonly level: number;
  readonly nodes: readonly AndesCascaderNode[];
}

/**
 * A cascading select: a field that opens a panel with one column of options per level, so a
 * value is a path through a tree (province, city, district...). The value is the array of
 * values from the first level down; with `multiple` it is a list of such arrays, shown as
 * tags.
 *
 * ```html
 * <andes-cascader [options]="regions" [(value)]="path" placeholder="Pick a place" />
 * <andes-cascader [options]="regions" multiple showSearch [formControl]="places" />
 * ```
 *
 * ## Keyboard
 *
 * The field is a combobox whose popup is a tree: focus stays on the field and the option
 * under the cursor is announced through `aria-activedescendant`. `ArrowDown`/`ArrowUp` open
 * the panel and move within the column, `ArrowRight` opens the next column and moves into it,
 * `ArrowLeft` goes back to the parent, `Enter` picks the option (or opens the next column on
 * one that cannot be picked), `Home`/`End` jump to the first and last option, `Escape` closes.
 * With `showSearch`, typing filters every path into one list that `ArrowDown`/`ArrowUp` and
 * `Enter` work on. Arrows swap sides in right-to-left pages.
 *
 * ## Loading options on demand
 *
 * With `loadData`, an option that has no `children` field (and is not `isLeaf`) is
 * expandable: expanding it calls `loadData` with the options from the first level down to it,
 * shows a spinner on it, and waits for the returned promise. `loadData` may add the children
 * to the option it is given, or the options input can be replaced - both are picked up.
 */
@Component({
  selector: 'andes-cascader',
  imports: [
    AndesOverlayContentPrimitive,
    AndesOverlayTriggerPrimitive,
    NgTemplateOutlet,
  ],
  templateUrl: './cascader.html',
  styleUrl: './cascader.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideAndesOverlay(),
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesCascader),
      multi: true,
    },
  ],
  host: {
    // Forwarded to the real combobox instead: a screen reader never sees this wrapper, and a
    // static `id` left here would be a duplicate that a `<label for>` resolves to first.
    '[attr.id]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
  },
})
export class AndesCascader implements ControlValueAccessor {
  private readonly overlay = inject(AndesOverlayPrimitive);
  private readonly document = inject(DOCUMENT);

  private readonly panelTemplate =
    viewChild.required<TemplateRef<unknown>>('panel');
  private readonly combobox =
    viewChild<ElementRef<HTMLButtonElement | HTMLInputElement>>('combobox');
  private readonly box = viewChild<ElementRef<HTMLElement>>('box');

  /** The options of the first level, each with its own `children`. */
  readonly options = input<readonly AndesCascaderOption[] | undefined>(
    undefined,
  );
  /** Where an option object keeps its value, label, children, disabled and leaf flags. */
  readonly fieldNames = input<AndesCascaderFieldNames | undefined>(undefined);

  /**
   * The selection: the values from the first level down to the chosen option, or with
   * `multiple` a list of such paths. Two-way bindable as `[(value)]`, and written by
   * `ngModel` / `formControl` too.
   */
  readonly value = model<AndesCascaderModel>(undefined);

  /** Lets several paths be picked, with a checkbox on every option and tags in the field. */
  readonly multiple = input(false, { transform: booleanAttribute });
  /** Lets an option that has children be picked too, not just the last level. */
  readonly changeOnSelect = input(false, { transform: booleanAttribute });
  /** What opens the next column: a `click` (default) or the pointer resting on the option. */
  readonly expandTrigger = input<AndesCascaderExpandTrigger>('click');
  /** With `multiple`: list every checked leaf (`child`, default) or the checked branch. */
  readonly showCheckedStrategy = input<AndesCascaderCheckedStrategy>('child');
  /** Loads the children of an option when it is expanded. See the class comment. */
  readonly loadData = input<AndesCascaderLoadData | undefined>(undefined);
  /** Turns the field into a text input that searches every path. */
  readonly showSearch = input<boolean | AndesCascaderSearch>(false);
  /** How many tags `multiple` shows before collapsing the rest into `+ N ...`. */
  readonly maxTagCount = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  });
  /** Joins the labels of a path, in the field and in search results. Default ` / `. */
  readonly separator = input(' / ');
  /** Renders the selection in the field (a path, or each tag). */
  readonly displayRender = input<
    TemplateRef<AndesCascaderDisplayContext> | undefined
  >(undefined);
  /** Renders the content of every option in the panel. */
  readonly optionTemplate = input<
    TemplateRef<AndesCascaderOptionContext> | undefined
  >(undefined);
  readonly placeholder = input<string | undefined>(undefined);
  /** What the panel shows without options or search results. `null` shows nothing. */
  readonly notFoundContent = input<AndesCascaderNotFound>('No data');
  /** Shows a spinner in the field and a loading line in an empty panel. */
  readonly loading = input(false, { transform: booleanAttribute });
  readonly size = input<AndesCascaderSize>('md');
  readonly variant = input<AndesCascaderVariant>('outlined');
  readonly status = input<AndesCascaderStatus | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Shows a button that empties the selection while the field is hovered or focused. */
  readonly allowClear = input(false, { transform: booleanAttribute });
  readonly placement = input<AndesCascaderPlacement>('bottomLeft');
  /** Extra classes on the overlay pane - the hook for scoping custom properties. */
  readonly panelClass = input<string | readonly string[] | null>(null);
  /** Overrides any of the cascader's strings, for translation. */
  readonly labels = input<Partial<AndesCascaderLabels>>({});

  /** `id` of the combobox, so a `<label for>` names it and focuses it when clicked. */
  readonly id = input<string | undefined>(undefined);
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

  /**
   * Whether the panel is open. Two-way bindable as `[(open)]`; `openChange` fires on every
   * transition, whatever caused it. A one-way `[open]` binding acts as a request.
   */
  readonly openState = model(false, { alias: 'open' });

  /** The user changed the selection: the values and the option objects, in the value's shape. */
  readonly selectionChange = output<AndesCascaderChange>();
  /** The user emptied the selection with the clear button. */
  readonly cleared = output<void>();
  /** The text typed into the search input. */
  readonly searchInput = output<string>();
  /** `loadData` failed (threw or rejected) for this option. */
  readonly loadError = output<{
    option: AndesCascaderOption;
    error: unknown;
  }>();

  private readonly uid = nextUniqueId++;
  protected readonly panelId = this.overlay.contentId;
  protected readonly treeId = `andes-cascader-tree-${this.uid}`;
  protected readonly statusId = `andes-cascader-status-${this.uid}`;

  protected readonly text = computed(() => ({
    ...ANDES_CASCADER_DEFAULT_LABELS,
    ...this.labels(),
  }));

  private readonly disabledByForm = signal(false);
  protected readonly isDisabled = computed(
    () => this.disabled() || this.disabledByForm(),
  );
  readonly isOpen = this.overlay.isOpen;
  protected readonly invalid = computed(
    () => this.ariaInvalid() || this.status() === 'error',
  );

  // ----- Tree ---------------------------------------------------------------------------

  /** Bumped when `loadData` finishes, since it may have changed the options in place. */
  private readonly version = signal(0);
  private readonly loadedKeys = signal<ReadonlySet<string>>(new Set());
  protected readonly loadingKeys = signal<ReadonlySet<string>>(new Set());
  private pendingExpand: string | null = null;

  protected readonly tree = computed(() => {
    this.version();
    return buildTree(this.options(), this.fieldNames());
  });

  /** Whether an option has a next column, or may get one when `loadData` has run. */
  protected isBranch(node: AndesCascaderNode): boolean {
    // The node may predate a load that changed its children, so ask the current tree.
    const current = this.tree().byKey.get(node.key) ?? node;
    if (current.children.length > 0) {
      return true;
    }
    return (
      !!this.loadData() &&
      current.isLeaf !== true &&
      !current.hasChildrenField &&
      !this.loadedKeys().has(current.key)
    );
  }

  /** A node that is picked itself, rather than through its children. */
  private isTerminal(node: AndesCascaderNode): boolean {
    return node.children.length === 0 || !this.isBranch(node);
  }

  protected isPickable(node: AndesCascaderNode): boolean {
    if (node.disabled) {
      return false;
    }
    if (this.multiple()) {
      return true;
    }
    return !this.isBranch(node) || this.changeOnSelect();
  }

  // ----- Selection ----------------------------------------------------------------------

  private readonly paths = computed<AndesCascaderValue[][]>(() => {
    const value = this.value();
    if (!Array.isArray(value) || value.length === 0) {
      return [];
    }
    if (this.multiple()) {
      return (value as readonly unknown[]).filter(
        (entry): entry is AndesCascaderValue[] =>
          Array.isArray(entry) && entry.length > 0,
      );
    }
    return (value as readonly unknown[]).every((entry) => !Array.isArray(entry))
      ? [[...(value as AndesCascaderValue[])]]
      : [];
  });

  private readonly entries = computed<readonly SelectedEntry[]>(() => {
    const tree = this.tree();
    return this.paths().map((path) => {
      const last = findNode(tree, path);
      if (!last) {
        return {
          path,
          nodes: null,
          labels: path.map(String),
          options: [],
        };
      }
      const nodes = nodePath(last);
      return {
        path,
        nodes,
        labels: nodes.map((node) => node.label),
        options: nodes.map((node) => node.option),
      };
    });
  });

  protected readonly hasValue = computed(() => this.entries().length > 0);

  /** The keys of the checked leaves, with `multiple`. */
  private readonly checkedKeys = computed<ReadonlySet<string>>(() => {
    const keys = new Set<string>();
    if (!this.multiple()) {
      return keys;
    }
    for (const entry of this.entries()) {
      const last = entry.nodes?.[entry.nodes.length - 1];
      if (last) {
        for (const terminal of collectTerminals(last, (node) =>
          this.isBranch(node),
        )) {
          keys.add(terminal.key);
        }
      }
    }
    return keys;
  });

  private readonly selectedKey = computed(() => {
    if (this.multiple()) {
      return null;
    }
    const nodes = this.entries()[0]?.nodes;
    return nodes ? nodes[nodes.length - 1].key : null;
  });

  /** The nodes of the selected path, shown semibold; only a single selection has one. */
  private readonly selectedPathKeys = computed<ReadonlySet<string>>(
    () =>
      new Set(
        this.multiple()
          ? []
          : (this.entries()[0]?.nodes?.map((node) => node.key) ?? []),
      ),
  );

  protected checkState(node: AndesCascaderNode): CheckState {
    const checked = this.checkedKeys();
    const terminals = collectTerminals(node, (entry) => this.isBranch(entry));
    const count = terminals.filter((entry) => checked.has(entry.key)).length;
    if (count === 0) {
      return 'unchecked';
    }
    return count === terminals.length ? 'checked' : 'indeterminate';
  }

  protected ariaChecked(node: AndesCascaderNode): string {
    const state = this.checkState(node);
    return state === 'indeterminate' ? 'mixed' : String(state === 'checked');
  }

  protected isSelectedNode(node: AndesCascaderNode): boolean {
    return node.key === this.selectedKey();
  }

  protected isInSelectedPath(node: AndesCascaderNode): boolean {
    return this.selectedPathKeys().has(node.key);
  }

  // ----- Field --------------------------------------------------------------------------

  protected readonly singleLabel = computed(() => {
    const entry = this.entries()[0];
    return entry ? entry.labels.join(this.separator()) : '';
  });

  /** The path shown in a single-selection field. */
  protected readonly singleEntry = computed(() =>
    this.multiple() ? undefined : this.entries()[0],
  );

  protected readonly tags = computed(() => {
    const entries = this.entries();
    const limit = this.maxTagCount();
    return limit === undefined ? entries : entries.slice(0, Math.max(limit, 0));
  });

  protected readonly omittedTags = computed(() => {
    const limit = this.maxTagCount();
    return limit === undefined ? [] : this.entries().slice(Math.max(limit, 0));
  });

  protected readonly showClear = computed(
    () => this.allowClear() && this.hasValue() && !this.isDisabled(),
  );

  protected tagText(entry: SelectedEntry): string {
    return entry.labels.join(this.separator());
  }

  protected displayContext(entry: SelectedEntry): AndesCascaderDisplayContext {
    return {
      $implicit: entry.labels,
      labels: entry.labels,
      selectedOptions: entry.options,
    };
  }

  protected removeLabel(entry: SelectedEntry): string {
    return this.text().remove.replace('{label}', this.tagText(entry));
  }

  protected readonly moreTagsText = computed(() =>
    this.text().moreTags.replace('{count}', String(this.omittedTags().length)),
  );

  protected readonly moreTagsTitle = computed(() =>
    this.omittedTags()
      .map((entry) => this.tagText(entry))
      .join(', '),
  );

  protected optionContext(node: AndesCascaderNode): AndesCascaderOptionContext {
    return { $implicit: node.option, label: node.label };
  }

  // ----- Search -------------------------------------------------------------------------

  protected readonly searchEnabled = computed(
    () => this.showSearch() !== false,
  );
  private readonly searchConfig = computed(() => {
    const search = this.showSearch();
    return typeof search === 'object' ? search : undefined;
  });
  protected readonly searchText = signal('');
  protected readonly searching = computed(
    () => this.searchEnabled() && this.searchText().trim() !== '',
  );

  protected readonly results = computed<readonly AndesCascaderSearchResult[]>(
    () => {
      if (!this.searching()) {
        return [];
      }
      return searchPaths(this.tree(), this.searchText(), {
        search: this.searchConfig(),
        isCandidate: (node) =>
          this.multiple()
            ? this.isTerminal(node)
            : this.changeOnSelect() || !this.isBranch(node),
      });
    },
  );

  protected readonly activeResultIndex = signal(-1);

  protected resultParts(result: AndesCascaderSearchResult) {
    const text = this.searchText();
    return result.labels.map((label) => highlightParts(label, text));
  }

  protected resultChecked(result: AndesCascaderSearchResult): boolean {
    return this.checkedKeys().has(result.key);
  }

  protected resultSelected(result: AndesCascaderSearchResult): boolean {
    return !this.multiple() && result.key === this.selectedKey();
  }

  protected resultId(index: number): string {
    return `andes-cascader-${this.uid}-r${index}`;
  }

  protected readonly resultsAnnouncement = computed(() =>
    this.searching()
      ? this.text().results.replace('{count}', String(this.results().length))
      : '',
  );

  // ----- Columns and the cursor ---------------------------------------------------------

  /** The option the keyboard cursor (and the open columns) are on. */
  protected readonly activeKey = signal<string | null>(null);

  protected readonly activeNode = computed(() => {
    const key = this.activeKey();
    return key ? (this.tree().byKey.get(key) ?? null) : null;
  });

  protected readonly columns = computed<readonly Column[]>(() => {
    const roots = this.tree().roots;
    const columns: Column[] = [{ level: 0, nodes: roots }];
    const active = this.activeNode();
    if (active) {
      for (const node of nodePath(active)) {
        if (node.children.length > 0 && !node.disabled) {
          columns.push({ level: node.level + 1, nodes: node.children });
        }
      }
    }
    return columns;
  });

  private readonly expandedKeys = computed<ReadonlySet<string>>(() => {
    const active = this.activeNode();
    return new Set(active ? nodePath(active).map((node) => node.key) : []);
  });

  protected isExpanded(node: AndesCascaderNode): boolean {
    return this.expandedKeys().has(node.key) && node.children.length > 0;
  }

  protected isActive(node: AndesCascaderNode): boolean {
    return node.key === this.activeKey();
  }

  protected isLoadingNode(node: AndesCascaderNode): boolean {
    return this.loadingKeys().has(node.key);
  }

  protected itemId(node: AndesCascaderNode): string {
    return `andes-cascader-${this.uid}-n${node.id}`;
  }

  protected columnLabel(column: Column): string {
    return this.text().level.replace('{level}', String(column.level + 1));
  }

  protected readonly activeDescendantId = computed(() => {
    if (!this.isOpen()) {
      return null;
    }
    if (this.searching()) {
      const index = this.activeResultIndex();
      return index >= 0 && index < this.results().length
        ? this.resultId(index)
        : null;
    }
    const node = this.activeNode();
    return node ? this.itemId(node) : null;
  });

  protected readonly showNotFound = computed(() => {
    if (this.loading() && this.tree().roots.length === 0) {
      return false;
    }
    return (
      this.notFoundContent() !== null &&
      (this.searching()
        ? this.results().length === 0
        : this.tree().roots.length === 0)
    );
  });

  protected readonly showLoadingRow = computed(
    () => this.loading() && this.tree().roots.length === 0 && !this.searching(),
  );

  protected readonly notFoundText = computed(() => {
    const content = this.notFoundContent();
    return typeof content === 'string' ? content : null;
  });

  protected readonly notFoundTemplate = computed(() => {
    const content = this.notFoundContent();
    return content instanceof TemplateRef ? content : null;
  });

  protected readonly side = computed(() => PLACEMENTS[this.placement()].side);
  /** Width of the field, so the search results list is as wide as it. */
  protected readonly anchorWidth = signal(0);

  private onChange: (value: AndesCascaderModel) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    this.overlay.configure({
      // `menu` is the closest preset: anchored to the field, click-opened, dismissed by
      // Escape and outside-click, no backdrop and no scroll lock. Focus stays on the combobox
      // (the active option is announced through `aria-activedescendant`), and the role is
      // `none` because the panel's own elements carry the tree roles.
      ...andesOverlayPreset('menu'),
      role: 'none',
      autoFocus: 'none',
      positioning: {
        kind: 'anchored',
        side: 'bottom',
        align: 'start',
        sideOffset: 4,
        // Above or below the field only: beside it, the panel no longer reads as its own.
        crossSideFallback: false,
      },
    });

    effect(() => {
      const { side, align } = PLACEMENTS[this.placement()];
      this.overlay.configure({
        positioning: {
          kind: 'anchored',
          side,
          align,
          sideOffset: 4,
          crossSideFallback: false,
        },
      });
    });

    effect(() => this.overlay.configure({ panelClass: this.panelClass() }));

    effect(() => {
      if (this.isDisabled() && this.overlay.isOpen()) {
        this.overlay.close('imperative');
      }
    });

    // `[open]` is honoured after render: the panel template and the field (the positioning
    // anchor) only exist once the view has rendered.
    afterRenderEffect(() => {
      const requested = booleanAttribute(this.openState());
      untracked(() => {
        if (requested && !this.overlay.isOpen()) {
          this.open();
        } else if (!requested && this.overlay.isOpen()) {
          this.close();
        }
      });
    });

    // A new search keeps the first result under the cursor, so Enter picks it right away.
    effect(() => {
      const results = this.results();
      untracked(() =>
        this.activeResultIndex.set(
          results.findIndex((result) => !result.disabled),
        ),
      );
    });

    // Brings the option under the cursor into view inside its own scrolling column.
    afterRenderEffect(() => {
      const id = this.activeDescendantId();
      if (id) {
        untracked(() => this.revealItem(id));
      }
    });

    // The panel is as tall as its tallest column; follow the options as they come and go.
    afterRenderEffect(() => {
      this.columns();
      this.results();
      untracked(() => this.overlay.updatePosition());
    });

    this.overlay.opened.pipe(takeUntilDestroyed()).subscribe(() => {
      this.openState.set(true);
    });

    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe(() => {
      this.activeKey.set(null);
      this.pendingExpand = null;
      this.searchText.set('');
      this.openState.set(false);
      this.onTouched();
    });
  }

  // ----- Public API ---------------------------------------------------------------------

  /** Opens the panel, with the cursor on the selected option. */
  open(): void {
    if (this.isDisabled() || this.overlay.isOpen()) {
      return;
    }
    this.anchorWidth.set(
      this.box()?.nativeElement.getBoundingClientRect().width ?? 0,
    );
    this.overlay.open(this.panelTemplate(), {
      // The anchor is the whole field box, which is not focusable; focus belongs on the
      // combobox inside it.
      restoreFocusTo: this.combobox(),
    });
    const selected = this.selectedKey();
    if (selected) {
      this.activeKey.set(selected);
    }
  }

  /** Closes the panel. */
  close(): void {
    this.overlay.close('imperative');
  }

  /** Opens the panel if closed, closes it if open. */
  toggle(): void {
    if (this.overlay.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Moves focus to the combobox. */
  focus(options?: FocusOptions): void {
    this.combobox()?.nativeElement.focus(options);
  }

  /** Removes focus from the combobox. */
  blur(): void {
    this.combobox()?.nativeElement.blur();
  }

  /** Empties the selection, as the clear button does. */
  clearValue(): void {
    if (this.isDisabled() || !this.hasValue()) {
      return;
    }
    this.commit([], []);
    this.cleared.emit();
  }

  // ----- ControlValueAccessor -----------------------------------------------------------

  writeValue(value: AndesCascaderModel): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: AndesCascaderModel) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
  }

  // ----- Pointer ------------------------------------------------------------------------

  protected onBoxMousedown(event: MouseEvent): void {
    if (this.isDisabled()) {
      return;
    }
    const target = event.target as HTMLElement;
    // A press on the box itself (or its text) keeps focus on the combobox rather than
    // dropping it; presses on the buttons and the input behave as they normally do.
    if (!target.closest('button, input')) {
      event.preventDefault();
      this.focus({ preventScroll: true });
    }
  }

  protected onBoxClick(event: MouseEvent): void {
    if (this.isDisabled()) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('.andes-cascader__clear, .andes-cascader__tag-remove')) {
      return;
    }
    if (this.searchEnabled()) {
      this.open();
      this.focus({ preventScroll: true });
    } else {
      this.toggle();
    }
  }

  protected onClearClick(event: MouseEvent): void {
    event.stopPropagation();
    this.clearValue();
    this.focus({ preventScroll: true });
  }

  protected onTagRemoveClick(entry: SelectedEntry, event: MouseEvent): void {
    event.stopPropagation();
    this.removeEntry(entry);
  }

  protected onItemClick(node: AndesCascaderNode): void {
    if (node.disabled) {
      return;
    }
    this.setActive(node);
    if (this.isBranch(node)) {
      if (this.changeOnSelect() && !this.multiple()) {
        this.pick(node);
      }
      return;
    }
    this.pick(node);
  }

  protected onItemCheckboxClick(
    node: AndesCascaderNode,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    if (node.disabled) {
      return;
    }
    this.toggleChecked(node);
  }

  protected onItemEnter(node: AndesCascaderNode): void {
    if (this.expandTrigger() === 'hover' && !node.disabled) {
      this.setActive(node);
    }
  }

  protected onResultClick(index: number): void {
    this.pickResult(index);
  }

  protected onResultEnter(index: number): void {
    if (!this.results()[index]?.disabled) {
      this.activeResultIndex.set(index);
    }
  }

  // ----- Keyboard -----------------------------------------------------------------------

  protected onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled() || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const open = this.overlay.isOpen();
    const key = event.key;

    if (key === 'Tab') {
      if (open) {
        this.close();
      }
      return;
    }

    // Backspace in an empty field takes the last tag off.
    if (
      key === 'Backspace' &&
      this.multiple() &&
      this.searchText() === '' &&
      this.entries().length > 0
    ) {
      event.preventDefault();
      this.removeEntry(this.entries()[this.entries().length - 1]);
      return;
    }

    if (this.searching() && open) {
      this.onSearchKeydown(event);
      return;
    }

    const rtl = this.isRtl();
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    // In the search input, Space is a character and Home/End move the caret once there is
    // text; with no text there is nothing to move, so they navigate the options.
    const isSearchInput = this.searchEnabled();

    switch (key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!open) {
          this.open();
          if (!this.activeKey()) {
            this.setActive(
              this.edgeNode(this.tree().roots, key === 'ArrowDown'),
            );
          }
        } else {
          this.moveSibling(key === 'ArrowDown' ? 1 : -1);
        }
        return;
      case 'Enter':
        event.preventDefault();
        if (!open) {
          this.open();
        } else {
          this.activateCursor();
        }
        return;
      case ' ':
        if (isSearchInput) {
          return;
        }
        event.preventDefault();
        if (!open) {
          this.open();
        } else {
          this.activateCursor();
        }
        return;
      case 'Home':
      case 'End':
        if (open) {
          event.preventDefault();
          const column = this.cursorColumn();
          this.setActive(this.edgeNode(column, key === 'Home'));
        }
        return;
      default:
        break;
    }

    if (key === forward && open) {
      event.preventDefault();
      this.expandCursor();
    } else if (key === backward && open) {
      event.preventDefault();
      const parent = this.activeNode()?.parent;
      if (parent) {
        this.setActive(parent);
      }
    }
  }

  private onSearchKeydown(event: KeyboardEvent): void {
    const count = this.results().length;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (count === 0) {
          return;
        }
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const results = this.results();
        let index = this.activeResultIndex() + step;
        while (index >= 0 && index < count && results[index].disabled) {
          index += step;
        }
        if (index >= 0 && index < count) {
          this.activeResultIndex.set(index);
        }
        return;
      }
      case 'Enter':
        event.preventDefault();
        this.pickResult(this.activeResultIndex());
        return;
      default:
        return;
    }
  }

  protected onSearchInput(text: string): void {
    this.searchText.set(text);
    this.searchInput.emit(text);
    if (!this.overlay.isOpen()) {
      this.open();
    }
  }

  // ----- Cursor movement ----------------------------------------------------------------

  /** Puts the cursor on a node, expanding it (and loading its children on demand). */
  private setActive(node: AndesCascaderNode | null): void {
    if (!node) {
      return;
    }
    this.activeKey.set(node.key);
    if (!node.disabled && this.isBranch(node)) {
      this.ensureLoaded(node);
    }
  }

  private cursorColumn(): readonly AndesCascaderNode[] {
    const active = this.activeNode();
    return active
      ? (active.parent?.children ?? this.tree().roots)
      : this.tree().roots;
  }

  private edgeNode(
    nodes: readonly AndesCascaderNode[],
    first: boolean,
  ): AndesCascaderNode | null {
    const enabled = nodes.filter((node) => !node.disabled);
    return (first ? enabled[0] : enabled[enabled.length - 1]) ?? null;
  }

  private moveSibling(delta: 1 | -1): void {
    const active = this.activeNode();
    const column = this.cursorColumn();
    if (!active) {
      this.setActive(this.edgeNode(column, delta === 1));
      return;
    }
    let index = column.indexOf(active) + delta;
    while (index >= 0 && index < column.length && column[index].disabled) {
      index += delta;
    }
    if (index >= 0 && index < column.length) {
      this.setActive(column[index]);
    }
  }

  /** Right arrow: into the next column, loading it first if need be. */
  private expandCursor(): void {
    const active = this.activeNode();
    if (!active) {
      this.setActive(this.edgeNode(this.tree().roots, true));
      return;
    }
    if (active.disabled || !this.isBranch(active)) {
      return;
    }
    const first = this.edgeNode(active.children, true);
    if (first) {
      this.setActive(first);
    } else {
      this.pendingExpand = active.key;
      this.ensureLoaded(active);
    }
  }

  /** Enter: picks the option under the cursor, or opens its next column. */
  private activateCursor(): void {
    const active = this.activeNode();
    if (!active) {
      this.setActive(this.edgeNode(this.tree().roots, true));
      return;
    }
    if (this.isPickable(active)) {
      this.pick(active);
    } else {
      this.expandCursor();
    }
  }

  // ----- Loading on demand --------------------------------------------------------------

  private ensureLoaded(node: AndesCascaderNode): void {
    const load = this.loadData();
    if (
      !load ||
      node.children.length > 0 ||
      node.hasChildrenField ||
      node.isLeaf === true ||
      this.loadedKeys().has(node.key) ||
      this.loadingKeys().has(node.key)
    ) {
      return;
    }
    this.loadingKeys.update((keys) => new Set(keys).add(node.key));
    const finish = (error?: unknown, failed = false) => {
      this.loadingKeys.update((keys) => {
        const next = new Set(keys);
        next.delete(node.key);
        return next;
      });
      if (failed) {
        this.pendingExpand = null;
        this.loadError.emit({ option: node.option, error });
        return;
      }
      this.loadedKeys.update((keys) => new Set(keys).add(node.key));
      this.version.update((version) => version + 1);
      if (this.pendingExpand === node.key) {
        this.pendingExpand = null;
        const loaded = this.tree().byKey.get(node.key);
        const first = loaded && this.edgeNode(loaded.children, true);
        if (first && this.overlay.isOpen()) {
          this.setActive(first);
        }
      }
    };
    try {
      const result = load(nodePath(node).map((entry) => entry.option));
      if (result && typeof (result as Promise<void>).then === 'function') {
        (result as Promise<void>).then(
          () => finish(),
          (error: unknown) => finish(error, true),
        );
      } else {
        finish();
      }
    } catch (error) {
      finish(error, true);
    }
  }

  // ----- Picking ------------------------------------------------------------------------

  private pick(node: AndesCascaderNode): void {
    if (this.multiple()) {
      this.toggleChecked(node);
      return;
    }
    const values = nodeValues(node);
    const options = nodePath(node).map((entry) => entry.option);
    const changed = pathKey(values) !== pathKey(this.paths()[0] ?? []);
    if (changed) {
      this.commit(values, options);
    }
    // A branch picked with `changeOnSelect` keeps the panel open on its children.
    if (!this.isBranch(node)) {
      this.close();
    }
  }

  private pickResult(index: number): void {
    const result = this.results()[index];
    if (!result || result.disabled) {
      return;
    }
    const node = result.nodes[result.nodes.length - 1];
    if (this.multiple()) {
      this.toggleChecked(node);
      this.searchText.set('');
      return;
    }
    const values = result.nodes.map((entry) => entry.value);
    if (pathKey(values) !== pathKey(this.paths()[0] ?? [])) {
      this.commit(
        values,
        result.nodes.map((entry) => entry.option),
      );
    }
    this.close();
  }

  /** Checks or unchecks a leaf, or every leaf below a branch. */
  private toggleChecked(node: AndesCascaderNode): void {
    const terminals = collectTerminals(node, (entry) =>
      this.isBranch(entry),
    ).filter((terminal) =>
      nodePath(terminal).every((entry) => !entry.disabled),
    );
    if (terminals.length === 0) {
      return;
    }
    const checked = this.checkedKeys();
    const allChecked = terminals.every((terminal) => checked.has(terminal.key));
    const remove = new Set(terminals.map((terminal) => terminal.key));
    const keys = allChecked
      ? [...checked].filter((key) => !remove.has(key))
      : [
          ...checked,
          ...terminals.map((t) => t.key).filter((key) => !checked.has(key)),
        ];
    this.commitChecked(keys);
  }

  private removeEntry(entry: SelectedEntry): void {
    const remaining = this.entries().filter((other) => other !== entry);
    const paths = remaining.map((other) => [...other.path]);
    const options = remaining.map((other) => other.options);
    this.commit(paths, options);
  }

  private commitChecked(terminalKeys: readonly string[]): void {
    const tree = this.tree();
    const extras = this.entries()
      .filter((entry) => entry.nodes === null)
      .map((entry) => [...entry.path]);
    const keys = new Set(terminalKeys);
    const nodes: AndesCascaderNode[] =
      this.showCheckedStrategy() === 'parent'
        ? this.collapseChecked(tree.roots, keys)
        : terminalKeys
            .map((key) => tree.byKey.get(key))
            .filter((node): node is AndesCascaderNode => !!node);
    const paths = [...extras, ...nodes.map((node) => nodeValues(node))];
    const options = [
      ...extras.map(() => [] as AndesCascaderOption[]),
      ...nodes.map((node) => nodePath(node).map((entry) => entry.option)),
    ];
    this.commit(paths, options);
  }

  /** The outermost nodes whose every pickable leaf is checked. */
  private collapseChecked(
    nodes: readonly AndesCascaderNode[],
    keys: ReadonlySet<string>,
  ): AndesCascaderNode[] {
    const result: AndesCascaderNode[] = [];
    for (const node of nodes) {
      const terminals = collectTerminals(node, (entry) =>
        this.isBranch(entry),
      ).filter((terminal) => !terminal.disabled);
      if (terminals.length > 0 && terminals.every((t) => keys.has(t.key))) {
        result.push(node);
      } else if (node.children.length > 0 && this.isBranch(node)) {
        result.push(...this.collapseChecked(node.children, keys));
      } else if (keys.has(node.key)) {
        result.push(node);
      }
    }
    return result;
  }

  /** Writes a new selection and reports it. */
  private commit(
    value: AndesCascaderValue[] | AndesCascaderValue[][],
    selectedOptions: AndesCascaderOption[] | AndesCascaderOption[][],
  ): void {
    this.value.set(value);
    this.onChange(value);
    this.selectionChange.emit({ value, selectedOptions });
  }

  // ----- Internals ----------------------------------------------------------------------

  private isRtl(): boolean {
    const element = this.combobox()?.nativeElement;
    return (
      !!element &&
      this.document.defaultView?.getComputedStyle(element).direction === 'rtl'
    );
  }

  private revealItem(id: string): void {
    const item = this.document.getElementById(id);
    const list = item?.parentElement;
    if (!item || !list) {
      return;
    }
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) {
      list.scrollTop = top;
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }

  protected markTouched(): void {
    if (!this.overlay.isOpen()) {
      this.onTouched();
    }
  }
}
