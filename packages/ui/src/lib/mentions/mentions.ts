import {
  AndesListNavigation,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  provideAndesOverlay,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import clsx from 'clsx';

import {
  andesMentionsDefaultFilter,
  andesMentionsDefaultValidateSearch,
  andesMentionsFindContext,
  andesMentionsInsert,
  type AndesMentionContext,
  type AndesMentionFilter,
  type AndesMentionOption,
  type AndesMentionValidateSearch,
} from './mentions-context';
import {
  andesMentionsCaretPosition,
  andesMentionsResolveSide,
} from './mentions-caret';
import { AndesMentionsField } from './mentions-field';
import { AndesMentionsOption } from './mentions-option';
import { ANDES_MENTIONS } from './mentions-token';

export type AndesMentionsSize = 'sm' | 'md' | 'lg';
export type AndesMentionsStatus = 'error' | 'warning';
export type AndesMentionsVariant =
  'outlined' | 'filled' | 'borderless' | 'underlined';
/** `textarea` is a multi-line field; `input` a single line. */
export type AndesMentionsType = 'textarea' | 'input';
/** Which side of the caret the suggestions prefer. They flip when it does not fit. */
export type AndesMentionsPlacement = 'top' | 'bottom';

/** Row bounds for `autoSize`; `minRows` falls back to `rows`, `maxRows` to unbounded. */
export interface AndesMentionsAutoSize {
  minRows?: number;
  maxRows?: number;
}

/** Options for every trigger, or one list per trigger (`{ '@': people, '#': tags }`). */
export type AndesMentionsOptions =
  | readonly AndesMentionOption[]
  | Readonly<Record<string, readonly AndesMentionOption[]>>;

/** Template context for a custom option: the option, the typed text and its trigger. */
export interface AndesMentionsOptionContext {
  $implicit: AndesMentionOption;
  query: string;
  prefix: string;
}

/** Emitted when the text after a trigger changes. */
export interface AndesMentionsSearchEvent {
  /** What was typed after the trigger (empty right after it). */
  query: string;
  /** The trigger it follows. */
  prefix: string;
}

/** Emitted when a suggestion is picked. */
export interface AndesMentionsSelectEvent {
  option: AndesMentionOption;
  prefix: string;
}

export interface AndesMentionsFocusOptions extends FocusOptions {
  cursor?: 'start' | 'end' | 'all';
}

function autoSizeAttribute(
  value: boolean | AndesMentionsAutoSize | string | null | undefined,
): boolean | AndesMentionsAutoSize {
  return typeof value === 'object' && value !== null
    ? value
    : booleanAttribute(value);
}

function prefixesAttribute(
  value: string | readonly string[] | null | undefined,
): readonly string[] {
  const list = typeof value === 'string' ? [value] : (value ?? []);
  return list.filter((prefix) => prefix.length > 0);
}

function sameContext(
  a: AndesMentionContext | null,
  b: AndesMentionContext | null,
): boolean {
  return (
    a === b ||
    (!!a &&
      !!b &&
      a.prefix === b.prefix &&
      a.start === b.start &&
      a.end === b.end &&
      a.query === b.query)
  );
}

let nextId = 0;

/**
 * A text field that suggests values while you type after a trigger character.
 *
 * ```html
 * <andes-mentions
 *   [(value)]="comment"
 *   [options]="[{ value: 'ana', label: 'Ana Torres' }, { value: 'luis', label: 'Luis Rojas' }]"
 *   placeholder="Write a comment, type @ to mention someone"
 * />
 * ```
 *
 * Typing the trigger (`prefix`, `@` by default; an array such as `['@', '#']` adds more) at
 * the start of the text or after whitespace opens a list at the caret. The text after it
 * filters the options live (`filterOption`), and picking one replaces the trigger and what was
 * typed with the trigger, the option's `value` and `split`. Arrow keys move through the list,
 * Enter or Tab pick, Escape closes it, and focus never leaves the field: the list is announced
 * with `aria-activedescendant`, as the WAI-ARIA combobox pattern prescribes.
 *
 * For server-side filtering, turn the local filter off (`[filterOption]="false"`), listen to
 * `searched`, fetch, and feed the results back through `options` with `loading` while waiting.
 *
 * The value is the plain text, mentions included, so it works with template-driven and
 * reactive forms and inside `andes-form-field` like the textarea does.
 */
@Component({
  selector: 'andes-mentions',
  imports: [
    NgTemplateOutlet,
    AndesOverlayContentPrimitive,
    AndesMentionsField,
    AndesMentionsOption,
  ],
  templateUrl: './mentions.html',
  styleUrl: './mentions.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesMentions),
      multi: true,
    },
    { provide: ANDES_MENTIONS, useExisting: forwardRef(() => AndesMentions) },
    provideAndesOverlay(),
    AndesListNavigation,
  ],
  host: {
    // Forwarded to the real field in the template: this host element is never in the
    // accessibility tree, and a static id/name left on it would duplicate the field's.
    '[attr.id]': 'null',
    '[attr.name]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
  },
})
export class AndesMentions implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(AndesOverlayPrimitive);
  private readonly navigation = inject(AndesListNavigation);

  private readonly fieldRef = viewChild(AndesMentionsField);
  private readonly caretRef =
    viewChild.required<ElementRef<HTMLElement>>('caret');
  private readonly panel = viewChild<TemplateRef<unknown>>('panel');

  /** The text, mentions included. Two-way bindable. */
  readonly value = model('');

  /** The trigger character, or several. Default `'@'`. */
  readonly prefix = input<
    readonly string[],
    string | readonly string[] | null | undefined
  >(['@'], { transform: prefixesAttribute });
  /** Inserted after a picked option. Default one space; `''` inserts nothing. */
  readonly split = input(' ');
  /**
   * The suggestions: one list, or a list per trigger (`{ '@': people, '#': tags }`). They are
   * filtered by `filterOption` unless that is turned off.
   */
  readonly options = input<AndesMentionsOptions>([]);
  /**
   * How options are matched against the typed text. The default is a case-insensitive
   * "contains" on label and value; a function replaces it; `false` shows every option as
   * given, for lists the server already filtered.
   */
  readonly filterOption = input<AndesMentionFilter | false | null | undefined>(
    undefined,
  );
  /**
   * Decides whether the text after a trigger is still a search; when it is not, the
   * suggestions close. The default ends the search at the first `split` and at a line break.
   */
  readonly validateSearch = input<
    AndesMentionValidateSearch | null | undefined
  >(undefined);
  /** Show a loading row instead of the options, while a server search is under way. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Text of the loading row. */
  readonly loadingText = input('Loading…');
  /** What the list shows when nothing matches: text, a template, or `null` for no list. */
  readonly notFoundContent = input<string | TemplateRef<unknown> | null>(
    'No matches found',
  );
  /** Custom markup for an option. Receives the option, the typed text and the trigger. */
  readonly optionTemplate = input<
    TemplateRef<AndesMentionsOptionContext> | null | undefined
  >(undefined);
  /** Which side of the caret the suggestions prefer. Default `'bottom'`. */
  readonly placement = input<AndesMentionsPlacement>('bottom');
  /** Extra classes on the suggestion list. */
  readonly panelClass = input<string | readonly string[] | null>(null);
  /** What assistive tech hears when the list opens or its length changes. */
  readonly announceCount = input<(count: number) => string>((count) =>
    count === 1 ? '1 suggestion available' : `${count} suggestions available`,
  );

  /** A multi-line field (default) or a single-line one. */
  readonly type = input<AndesMentionsType>('textarea');
  readonly size = input<AndesMentionsSize>('md');
  readonly variant = input<AndesMentionsVariant>('outlined');
  readonly status = input<AndesMentionsStatus | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string | undefined>(undefined);
  readonly id = input<string | undefined>(undefined);
  readonly name = input<string | undefined>(undefined);
  /** Visible lines of a `textarea`. Default `3`. */
  readonly rows = input(3);
  /** Grow with the text, between `minRows` (default `rows`) and `maxRows`. */
  readonly autoSize = input<
    boolean | AndesMentionsAutoSize,
    boolean | AndesMentionsAutoSize | string | null | undefined
  >(false, { transform: autoSizeAttribute });
  readonly maxLength = input<number | undefined>(undefined);
  /** Show a `length/maxLength` counter under the field. */
  readonly showCount = input(false, { transform: booleanAttribute });
  /** Focus the field when it first renders. */
  readonly autoFocus = input(false, { transform: booleanAttribute });
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

  /** The text after a trigger changed (and once, with `''`, as the trigger is typed). */
  readonly searched = output<AndesMentionsSearchEvent>();
  /** A suggestion was picked. */
  readonly optionSelected = output<AndesMentionsSelectEvent>();
  /** The suggestions opened or closed. */
  readonly openChanged = output<boolean>();
  readonly focused = output<FocusEvent>();
  readonly blurred = output<FocusEvent>();

  private readonly cvaDisabled = signal(false);
  private readonly context = signal<AndesMentionContext | null>(null, {
    equal: sameContext,
  });
  private readonly _renderedSide = signal<AndesOverlaySide>('bottom');
  /** The side the list actually rendered on, after any flip. */
  protected readonly renderedSide = this._renderedSide.asReadonly();

  private composing = false;
  /** The trigger whose list was dismissed or just used: it stays shut until the text changes. */
  private suppressedStart: number | null = null;
  private picking = false;
  private lastSearchKey: string | null = null;
  private lastHighlight: unknown[] = [];
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private positionObserver: MutationObserver | null = null;

  /** @internal */
  readonly panelId = computed(() => this.overlay.contentId);
  protected readonly countId = `andes-mentions-count-${nextId++}`;

  /** @internal */
  readonly isOpen = this.overlay.isOpen;
  /** @internal */
  readonly activeDescendantId = this.navigation.activeDescendantId;

  /** @internal */
  readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());
  /** @internal */
  readonly isTextarea = computed(() => this.type() === 'textarea');
  /** @internal */
  readonly isInvalid = computed(
    () =>
      this.ariaInvalid() || this.status() === 'error' || this.countExceeded(),
  );
  /** @internal */
  readonly rowsAttribute = computed(() =>
    this.isTextarea() ? (this.autoSizeEnabled() ? 1 : this.rows()) : null,
  );
  /** @internal */
  readonly describedBy = computed(
    () =>
      [this.ariaDescribedby(), this.showCount() ? this.countId : undefined]
        .filter(Boolean)
        .join(' ') || null,
  );

  protected readonly autoSizeEnabled = computed(
    () => this.autoSize() !== false && this.isTextarea(),
  );

  protected readonly wrapperClasses = computed(() =>
    clsx(
      'andes-mentions-wrapper',
      `andes-mentions-wrapper--${this.size()}`,
      `andes-mentions-wrapper--${this.variant()}`,
      !this.isTextarea() && 'andes-mentions-wrapper--single-line',
      this.isInvalid() && 'andes-mentions-wrapper--invalid',
      !this.isInvalid() &&
        this.status() === 'warning' &&
        'andes-mentions-wrapper--warning',
      this.isDisabled() && 'andes-mentions-wrapper--disabled',
      this.readonly() && 'andes-mentions-wrapper--readonly',
      this.autoSizeEnabled() && 'andes-mentions-wrapper--auto-size',
    ),
  );

  protected readonly panelClasses = computed(() =>
    clsx('andes-mentions-panel', this.panelClass()),
  );

  protected readonly countExceeded = computed(() => {
    const max = this.maxLength();
    return max != null && this.value().length > max;
  });

  protected readonly countText = computed(() => {
    const max = this.maxLength();
    const length = this.value().length;
    return max != null ? `${length}/${max}` : `${length}`;
  });

  /** The text typed after the trigger, while a mention is being typed. */
  protected readonly query = computed(() => this.context()?.query ?? '');
  protected readonly activePrefix = computed(
    () => this.context()?.prefix ?? '',
  );

  /** The options for the active trigger, before filtering. */
  private readonly candidates = computed<readonly AndesMentionOption[]>(() => {
    const options = this.options();
    if (Array.isArray(options)) {
      return options as readonly AndesMentionOption[];
    }
    const prefix = this.context()?.prefix;
    const byPrefix = options as Readonly<
      Record<string, readonly AndesMentionOption[]>
    >;
    return prefix !== undefined ? (byPrefix[prefix] ?? []) : [];
  });

  /** The options that match what has been typed. */
  protected readonly filteredOptions = computed<readonly AndesMentionOption[]>(
    () => {
      const context = this.context();
      if (!context) {
        return [];
      }
      const filter = this.filterOption();
      if (filter === false) {
        return this.candidates();
      }
      const match = filter ?? andesMentionsDefaultFilter;
      return this.candidates().filter((option) => match(context.query, option));
    },
  );

  protected readonly notFoundTemplate = computed(() => {
    const content = this.notFoundContent();
    return content instanceof TemplateRef ? content : null;
  });

  protected readonly notFoundText = computed(() => {
    const content = this.notFoundContent();
    return typeof content === 'string' ? content : '';
  });

  private readonly popupWanted = computed(() => {
    if (!this.context() || this.isDisabled() || this.readonly()) {
      return false;
    }
    return (
      this.loading() ||
      this.filteredOptions().length > 0 ||
      this.notFoundContent() !== null
    );
  });

  protected readonly announcement = computed(() => {
    if (!this.isOpen()) {
      return '';
    }
    if (this.loading()) {
      return this.loadingText();
    }
    const count = this.filteredOptions().length;
    return count === 0 ? this.notFoundText() : this.announceCount()(count);
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    this.overlay.configure({
      layer: 'dropdown',
      role: 'listbox',
      ariaModal: false,
      // The text field keeps real focus the whole time; nothing may move it into the list.
      trapFocus: false,
      autoFocus: 'none',
      restoreFocus: false,
      // Escape and blur are the field's own business (see AndesMentionsField): a click in the
      // field must not count as "outside" and close a list the caret is still inside.
      closeOnEscape: false,
      closeOnOutsideClick: false,
      repositionOnScroll: true,
    });

    this.navigation.configure({
      orientation: 'vertical',
      focusMode: 'active-descendant',
      wrap: true,
      // Home and End belong to the caret in a text field.
      homeAndEnd: false,
      // Typed characters are search text, not a list shortcut.
      typeahead: false,
    });
    // Builds the key manager now, outside any reactive context (see AndesCombobox).
    this.navigation.clearActive();

    this.overlay.opened.pipe(takeUntilDestroyed()).subscribe(() => {
      this.observePosition();
      this.openChanged.emit(true);
    });
    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe((reason) => {
      this.positionObserver?.disconnect();
      this.positionObserver = null;
      if (reason !== 'destroyed') {
        this.openChanged.emit(false);
      }
    });
    destroyRef.onDestroy(() => this.positionObserver?.disconnect());

    afterNextRender(() => {
      this.overlay.registerAnchor(this.caretRef());
      if (this.autoFocus() && !this.isDisabled()) {
        this.focus();
      }
    });

    // Placement.
    effect(() => {
      const side = this.placement();
      this.overlay.configure({
        positioning: {
          kind: 'anchored',
          side,
          align: 'start',
          sideOffset: 4,
          // A list belongs above or below its line of text, never beside it.
          crossSideFallback: false,
        },
      });
    });

    // The list follows the mention being typed.
    effect(() => {
      const wanted = this.popupWanted();
      const panel = this.panel();
      untracked(() => {
        if (wanted && panel && !this.overlay.isOpen()) {
          this.updateCaretAnchor();
          this.overlay.open(panel);
        } else if (!wanted && this.overlay.isOpen()) {
          this.overlay.close();
        }
      });
    });

    // A new trigger position moves the list's anchor; a new query is a search.
    effect(() => {
      const context = this.context();
      untracked(() => {
        if (!context) {
          this.lastSearchKey = null;
          return;
        }
        this.updateCaretAnchor();
        if (this.overlay.isOpen()) {
          this.overlay.updatePosition();
        }
        const key = `${context.prefix}\u0000${context.start}\u0000${context.query}`;
        if (key !== this.lastSearchKey) {
          this.lastSearchKey = key;
          this.searched.emit({ query: context.query, prefix: context.prefix });
        }
      });
    });

    // Highlight the first option whenever the matches change or the list opens - and only
    // then, so a pointer or arrow key moving the highlight is not undone on every pass.
    effect(() => {
      const items = this.filteredOptions();
      const open = this.overlay.isOpen();
      const loading = this.loading();
      // The rows register a render after the options change.
      const registered = this.navigation.items();
      const snapshot = [items, open, loading, registered];
      if (
        snapshot.every((entry, index) => entry === this.lastHighlight[index])
      ) {
        return;
      }
      this.lastHighlight = snapshot;
      untracked(() => {
        if (!open || loading || registered.length === 0) {
          this.navigation.clearActive();
        } else {
          this.navigation.focusFirst();
        }
      });
    });

    // After render, so a value written through the model or the forms API has reached the
    // field before its scrollHeight is measured.
    afterRenderEffect(() => {
      this.value();
      this.autoSize();
      this.rows();
      this.size();
      this.adjustAutoSize();
    });
  }

  /** Focuses the field, optionally placing the caret at the start or end, or selecting all. */
  focus(options?: AndesMentionsFocusOptions): void {
    const element = this.fieldElement();
    if (!element) {
      return;
    }
    element.focus({ preventScroll: options?.preventScroll });
    const length = element.value.length;
    switch (options?.cursor) {
      case 'start':
        element.setSelectionRange(0, 0);
        break;
      case 'end':
        element.setSelectionRange(length, length);
        break;
      case 'all':
        element.select();
        break;
    }
  }

  blur(): void {
    this.fieldElement()?.blur();
  }

  /** Closes the suggestions until the text changes again. */
  dismiss(): void {
    const context = this.context();
    if (context) {
      this.suppressedStart = context.start;
    }
    this.context.set(null);
  }

  /** @internal Picks the highlighted option; `false` when there is none. */
  pickActive(): boolean {
    const active = this.navigation.activeItem();
    if (!(active instanceof AndesMentionsOption)) {
      return false;
    }
    const option = active.option();
    if (option.disabled) {
      return false;
    }
    this.pickOption(option);
    return true;
  }

  /**
   * @internal Replaces the mention being typed with `option`: the trigger, its value and
   * `split`. Goes through the editing pipeline where the browser allows it, so Undo takes the
   * whole insertion back.
   */
  pickOption(option: AndesMentionOption): void {
    const context = this.context();
    const field = this.fieldElement();
    if (!context || !field || option.disabled) {
      return;
    }
    const result = andesMentionsInsert(
      field.value,
      context,
      option,
      this.split(),
    );
    const max = this.maxLength();
    if (max != null && result.text.length > max) {
      this.dismiss();
      return;
    }

    this.picking = true;
    this.suppressedStart = context.start;
    field.setSelectionRange(context.start, context.end);
    if (!this.insertThroughEditor(field, result.insert)) {
      field.value = result.text;
      this.commit(field.value);
    }
    field.setSelectionRange(result.caret, result.caret);
    this.picking = false;

    this.optionSelected.emit({ option, prefix: context.prefix });
    this.refreshContext();
  }

  /** @internal Looks at the text before the caret again and opens, moves or closes the list. */
  refreshContext(fromInput = false): void {
    if (fromInput && !this.picking) {
      this.suppressedStart = null;
    }
    const field = this.fieldElement();
    // Asked of the document rather than remembered from a `focus` event, which a hidden or
    // unfocused window never delivers.
    if (
      !field ||
      this.composing ||
      field.ownerDocument.activeElement !== field
    ) {
      return;
    }
    const caret = field.selectionStart ?? field.value.length;
    const collapsed = field.selectionStart === field.selectionEnd;
    const found = collapsed
      ? andesMentionsFindContext(
          field.value,
          caret,
          this.prefix(),
          { split: this.split() },
          this.validateSearch() ?? andesMentionsDefaultValidateSearch,
        )
      : null;

    if (found && found.start === this.suppressedStart) {
      this.context.set(null);
      return;
    }
    if (!found) {
      this.suppressedStart = null;
    }
    this.context.set(found);
  }

  /** @internal */
  onInput(event: Event): void {
    const field = event.target as HTMLTextAreaElement | HTMLInputElement;
    this.commit(field.value);
    if (!this.composing) {
      this.refreshContext(true);
    }
  }

  /** @internal */
  onFocus(event: Event): void {
    this.focused.emit(event as FocusEvent);
  }

  /** @internal */
  onBlur(event: Event): void {
    this.suppressedStart = null;
    this.context.set(null);
    this.onTouched();
    this.blurred.emit(event as FocusEvent);
  }

  /** @internal */
  onCompositionStart(): void {
    this.composing = true;
  }

  /** @internal */
  onCompositionEnd(): void {
    this.composing = false;
    this.refreshContext(true);
  }

  /** @internal */
  onFieldScroll(): void {
    if (this.context()) {
      this.updateCaretAnchor();
      this.overlay.updatePosition();
    }
  }

  /** @internal */
  optionKey(option: AndesMentionOption): string | number {
    return option.key ?? option.value;
  }

  writeValue(value: string | null | undefined): void {
    this.value.set(value == null ? '' : String(value));
    this.context.set(null);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }

  private fieldElement(): HTMLTextAreaElement | HTMLInputElement | null {
    return this.fieldRef()?.element ?? null;
  }

  private commit(text: string): void {
    this.value.set(text);
    this.onChange(text);
  }

  private insertThroughEditor(
    field: HTMLTextAreaElement | HTMLInputElement,
    text: string,
  ): boolean {
    const document = field.ownerDocument;
    if (typeof document.execCommand !== 'function') {
      return false;
    }
    try {
      return document.execCommand('insertText', false, text);
    } catch {
      return false;
    }
  }

  /** Moves the marker the list anchors to onto the trigger's position in the text. */
  private updateCaretAnchor(): void {
    const context = this.context();
    const field = this.fieldElement();
    const anchor = this.caretRef().nativeElement;
    if (!context || !field) {
      return;
    }
    const position = andesMentionsCaretPosition(field, context.start);
    const left = Math.min(Math.max(position.left, 0), field.clientWidth || 0);
    anchor.style.left = `${left}px`;
    anchor.style.top = `${position.top}px`;
    anchor.style.height = `${position.height}px`;
  }

  /**
   * The overlay may flip the list to the other side of the caret and does not say so; watching
   * the inline styles it rewrites keeps `data-side` (and so the direction of the animation)
   * true to where the list actually is.
   */
  private observePosition(): void {
    const pane = this.overlay.panelElement();
    if (!pane) {
      return;
    }
    this.measureSide();
    if (typeof MutationObserver === 'undefined') {
      return;
    }
    this.positionObserver = new MutationObserver(() => this.measureSide());
    const options = { attributes: true, attributeFilter: ['style', 'class'] };
    this.positionObserver.observe(pane, options);
    if (pane.parentElement) {
      this.positionObserver.observe(pane.parentElement, options);
    }
  }

  private measureSide(): void {
    const pane = this.overlay.panelElement();
    const anchor = this.overlay.anchor();
    if (!pane || !anchor) {
      return;
    }
    this._renderedSide.set(
      andesMentionsResolveSide(
        anchor.getBoundingClientRect(),
        pane.getBoundingClientRect(),
        this.placement(),
      ),
    );
  }

  private adjustAutoSize(): void {
    const field = this.fieldElement();
    if (!field || !(field instanceof HTMLTextAreaElement)) {
      return;
    }
    const autoSize = this.autoSize();
    if (autoSize === false) {
      field.style.removeProperty('height');
      field.style.removeProperty('overflow-y');
      return;
    }

    const bounds = autoSize === true ? {} : autoSize;
    const style = getComputedStyle(field);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const boxExtra =
      (parseFloat(style.paddingTop) || 0) +
      (parseFloat(style.paddingBottom) || 0) +
      (parseFloat(style.borderTopWidth) || 0) +
      (parseFloat(style.borderBottomWidth) || 0);
    const maxRows = bounds.maxRows;
    const minRows = Math.min(
      bounds.minRows ?? this.rows(),
      maxRows ?? Infinity,
    );
    const minHeight = lineHeight * minRows + boxExtra;
    const maxHeight = maxRows ? lineHeight * maxRows + boxExtra : Infinity;

    // Shrink first so scrollHeight reflects the text, not the previous height. The host's
    // height is pinned meanwhile so the momentary collapse cannot shorten the document and
    // clamp the page's scroll position.
    const host = this.host.nativeElement;
    const pinnedMinHeight = host.style.minHeight;
    host.style.minHeight = `${host.offsetHeight}px`;
    const scrollTop = field.scrollTop;
    field.style.height = 'auto';
    const contentHeight =
      field.scrollHeight +
      (parseFloat(style.borderTopWidth) || 0) +
      (parseFloat(style.borderBottomWidth) || 0);
    const height = Math.min(Math.max(contentHeight, minHeight), maxHeight);
    field.style.height = `${height}px`;
    field.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
    field.scrollTop = scrollTop;
    host.style.minHeight = pinnedMinHeight;
  }
}
