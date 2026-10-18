import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  output,
  Signal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import clsx from 'clsx';

import {
  AndesTypographyAutoSize,
  AndesTypographyCopyConfig,
  AndesTypographyEditConfig,
  AndesTypographyEllipsisConfig,
  AndesTypographyFeature,
  AndesTypographySize,
  AndesTypographyTag,
  AndesTypographyType,
  COPIED_RESET_MS,
  DEFAULT_ELLIPSIS_ROWS,
  featureAttribute,
} from './typography-types';

/** Wrapper elements for the text modifiers, outermost first. */
const WRAPPERS = [
  'strong',
  'italic',
  'underline',
  'deleted',
  'mark',
  'code',
  'keyboard',
] as const;
type Wrapper = (typeof WRAPPERS)[number];

let nextId = 0;

/**
 * Writes to the clipboard: the async API when the page may use it (secure context, permission
 * granted), otherwise a throwaway textarea and `execCommand('copy')`, so it keeps working over
 * plain http and inside frames that deny the async API. Resolves to whether the text landed.
 */
async function writeToClipboard(doc: Document, text: string): Promise<boolean> {
  const view = doc.defaultView;
  try {
    if (view?.navigator.clipboard?.writeText) {
      await view.navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Falls through to the legacy path.
  }

  const field = doc.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.setAttribute('aria-hidden', 'true');
  field.style.cssText =
    'position:fixed;top:0;inset-inline-start:-9999px;opacity:0;pointer-events:none';
  const previouslyFocused = doc.activeElement as HTMLElement | null;
  const selection = doc.getSelection();
  const previousRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  doc.body.appendChild(field);
  field.select();
  field.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied = doc.execCommand('copy');
  } catch {
    copied = false;
  }
  field.remove();

  if (previousRange && selection) {
    selection.removeAllRanges();
    selection.addRange(previousRange);
  }
  previouslyFocused?.focus?.({ preventScroll: true });
  return copied;
}

/**
 * Behaviour shared by `andes-title`, `andes-text` and `andes-paragraph`: text modifiers, colour
 * type, truncation (single or multi line, expandable, with a popup for the full text), a copy
 * button and click-to-edit. The subclasses supply the default element and the look of the host;
 * the template and stylesheet are shared.
 */
@Directive({
  host: {
    '[attr.data-type]': 'type() ?? null',
    '[attr.data-size]': 'size()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-state]': 'state()',
    '[style.--andes-typography-rows]': 'ellipsisConfig()?.rows ?? null',
    '[class.andes-typography--ellipsis]': 'ellipsisConfig() !== null',
    '[class.andes-typography--multiline]': 'multiline()',
    '[class.andes-typography--editing]': 'editing()',
    '(mouseenter)': 'showTooltip()',
    '(mouseleave)': 'hideTooltip()',
    '(focusin)': 'showTooltip()',
    '(focusout)': 'hideTooltip()',
    '(keydown.escape)': 'hideTooltip()',
    '(click)': 'onHostClick($event)',
    '(keydown)': 'onHostKeydown($event)',
  },
})
export abstract class AndesTypographyBase {
  protected readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  protected readonly uid = `andes-typography-${nextId++}`;

  /** Element the text renders in when `as` is not set. */
  protected abstract readonly defaultTag: Signal<AndesTypographyTag>;

  readonly type = input<AndesTypographyType | undefined>(undefined);
  readonly size = input<AndesTypographySize>('md');
  /** Renders the text in another element without changing how it looks. */
  readonly as = input<AndesTypographyTag | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly strong = input(false, { transform: booleanAttribute });
  readonly italic = input(false, { transform: booleanAttribute });
  readonly underline = input(false, { transform: booleanAttribute });
  readonly delete = input(false, { transform: booleanAttribute });
  readonly mark = input(false, { transform: booleanAttribute });
  readonly code = input(false, { transform: booleanAttribute });
  readonly keyboard = input(false, { transform: booleanAttribute });

  /**
   * Text to show instead of the projected content. It is also what the editor starts with and
   * where a saved edit lands, so `[(text)]` makes the component a controlled editable value.
   */
  readonly text = model<string | undefined>(undefined);

  readonly ellipsis = input<
    AndesTypographyFeature<AndesTypographyEllipsisConfig>,
    boolean | AndesTypographyEllipsisConfig | string | null | undefined
  >(false, { transform: featureAttribute });
  /** Whether a truncated text is expanded. Only meaningful with `ellipsis`. */
  readonly expanded = model(false);

  readonly copyable = input<
    AndesTypographyFeature<AndesTypographyCopyConfig>,
    boolean | AndesTypographyCopyConfig | string | null | undefined
  >(false, { transform: featureAttribute });

  readonly editable = input<
    AndesTypographyFeature<AndesTypographyEditConfig>,
    boolean | AndesTypographyEditConfig | string | null | undefined
  >(false, { transform: featureAttribute });
  /** Whether the editor is open. */
  readonly editing = model(false);

  /** Emits the copied text. */
  readonly copied = output<string>();
  /** Emits the starting text when the editor opens. */
  readonly edit = output<string>();
  /** Emits the draft on every keystroke while editing. */
  readonly editChange = output<string>();
  /** Emits the saved text (Enter or leaving the field). */
  readonly save = output<string>();
  /** Fires when the edit is abandoned with Escape. */
  readonly editCancel = output<void>();
  /** Emits when the text starts or stops being cut off. */
  readonly truncated = output<boolean>();

  protected readonly textRef = viewChild<ElementRef<HTMLElement>>('textEl');
  protected readonly editorRef =
    viewChild<ElementRef<HTMLTextAreaElement>>('editorEl');
  protected readonly editButtonRef =
    viewChild<ElementRef<HTMLElement>>('editButton');

  protected readonly isTruncated = signal(false);
  protected readonly copiedState = signal(false);
  protected readonly tooltipOpen = signal(false);
  protected readonly tooltipText = signal('');
  protected readonly tooltipSide = signal<'top' | 'bottom'>('top');
  protected readonly draft = signal('');

  private copyTimer: ReturnType<typeof setTimeout> | undefined;
  private editorOpen = false;
  private restoreFocus = false;
  private editStart = '';

  protected readonly tag = computed(
    (): AndesTypographyTag => this.as() ?? this.defaultTag(),
  );

  protected readonly wrappers = computed((): Wrapper[] => {
    const active: Record<Wrapper, boolean> = {
      strong: this.strong(),
      italic: this.italic(),
      underline: this.underline(),
      deleted: this.delete(),
      mark: this.mark(),
      code: this.code(),
      keyboard: this.keyboard(),
    };
    return WRAPPERS.filter((name) => active[name]);
  });

  protected readonly ellipsisConfig = computed(() => {
    const value = this.ellipsis();
    if (!value) {
      return null;
    }
    const config = value === true ? {} : value;
    return {
      rows: Math.max(1, Math.floor(config.rows ?? DEFAULT_ELLIPSIS_ROWS)),
      expandable: config.expandable ?? false,
      tooltip: config.tooltip ?? false,
      expandText: config.expandText ?? 'more',
      collapseText: config.collapseText ?? 'less',
    };
  });

  protected readonly multiline = computed(
    () => (this.ellipsisConfig()?.rows ?? 1) > 1,
  );

  protected readonly showExpander = computed(
    () =>
      !!this.ellipsisConfig()?.expandable &&
      !this.editing() &&
      (this.isTruncated() || this.expanded()),
  );

  protected readonly copyConfig = computed(() => {
    const value = this.copyable();
    if (!value) {
      return null;
    }
    const config = value === true ? {} : value;
    return {
      text: config.text,
      label: config.label ?? 'Copy',
      copiedLabel: config.copiedLabel ?? 'Copied',
      tooltip: config.tooltip ?? true,
    };
  });

  protected readonly editConfig = computed(() => {
    const value = this.editable();
    if (!value) {
      return null;
    }
    const config = value === true ? {} : value;
    const triggerType = config.triggerType ?? 'icon';
    return {
      text: config.text,
      maxLength: config.maxLength,
      autoSize: config.autoSize ?? true,
      label: config.label ?? 'Edit',
      fieldLabel: config.fieldLabel ?? config.label ?? 'Edit text',
      iconTrigger: triggerType !== 'text',
      textTrigger: triggerType !== 'icon',
    };
  });

  protected readonly autoSize = computed(
    (): Required<AndesTypographyAutoSize> | null => {
      const value = this.editConfig()?.autoSize;
      if (value === false || value === undefined) {
        return null;
      }
      const config = value === true ? {} : value;
      return {
        minRows: Math.max(1, config.minRows ?? 1),
        maxRows: config.maxRows ?? Number.POSITIVE_INFINITY,
      };
    },
  );

  protected readonly state = computed(() =>
    this.editing()
      ? 'editing'
      : this.ellipsisConfig()
        ? this.expanded()
          ? 'expanded'
          : 'collapsed'
        : null,
  );

  protected readonly announcement = computed(() =>
    this.copiedState() ? (this.copyConfig()?.copiedLabel ?? '') : '',
  );

  protected readonly textTabindex = computed(() =>
    this.editConfig()?.textTrigger && !this.disabled() ? 0 : null,
  );

  protected readonly textClasses = computed(() =>
    clsx(
      'andes-typography__text',
      this.ellipsisConfig() && 'andes-typography__text--ellipsis',
      this.multiline() && 'andes-typography__text--multiline',
      this.expanded() &&
        this.ellipsisConfig() &&
        'andes-typography__text--expanded',
      this.editConfig()?.textTrigger && 'andes-typography__text--trigger',
    ),
  );

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.copyTimer));

    // Truncation detection. Observing the text element covers resizes of the container; the
    // mutation observer covers text that changes without changing the box (already cut off
    // before and after). The first observer callback after `observe()` measures the initial
    // layout, so nothing is measured here synchronously, before layout exists.
    effect((onCleanup) => {
      const element = this.textRef()?.nativeElement;
      const config = this.ellipsisConfig();
      if (!element || !config) {
        untracked(() => this.setTruncated(false));
        return;
      }
      const view = this.document.defaultView;
      const measure = () => untracked(() => this.measure(element));
      const resizeObserver =
        view && 'ResizeObserver' in view
          ? new view.ResizeObserver(measure)
          : null;
      const mutationObserver =
        view && 'MutationObserver' in view
          ? new view.MutationObserver(measure)
          : null;
      resizeObserver?.observe(element);
      mutationObserver?.observe(element, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      onCleanup(() => {
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
      });
    });

    // An editor opened from outside (`editing` set by the parent) still needs its draft.
    effect(() => {
      if (this.editing()) {
        untracked(() => this.openEditor());
      } else {
        this.editorOpen = false;
      }
    });

    // Focus moves into the field when it appears, and back to the trigger after a keyboard
    // save or cancel; leaving the field with the pointer must not steal focus back.
    effect(() => {
      const field = this.editorRef()?.nativeElement;
      if (field) {
        untracked(() => {
          field.focus();
          field.setSelectionRange(field.value.length, field.value.length);
          this.resizeEditor(field);
        });
      }
    });
    effect(() => {
      const target = this.editButtonRef() ?? this.textRef();
      if (target && this.restoreFocus) {
        untracked(() => {
          this.restoreFocus = false;
          target.nativeElement.focus();
        });
      }
    });

    effect(() => {
      if (this.disabled() && untracked(() => this.editing())) {
        untracked(() => this.finishEdit(false, false));
      }
    });
  }

  // --- Truncation --------------------------------------------------------------------------

  private measure(element: HTMLElement): void {
    const config = this.ellipsisConfig();
    if (!config || this.expanded()) {
      return;
    }
    this.setTruncated(
      config.rows > 1
        ? element.scrollHeight - element.clientHeight > 1
        : element.scrollWidth - element.clientWidth > 0,
    );
  }

  private setTruncated(value: boolean): void {
    if (this.isTruncated() !== value) {
      this.isTruncated.set(value);
      this.truncated.emit(value);
    }
    if (!value) {
      this.tooltipOpen.set(false);
    }
  }

  protected toggleExpanded(): void {
    this.expanded.update((value) => !value);
    this.tooltipOpen.set(false);
  }

  protected showTooltip(): void {
    const config = this.ellipsisConfig();
    if (
      !config?.tooltip ||
      !this.isTruncated() ||
      this.expanded() ||
      this.editing()
    ) {
      return;
    }
    this.tooltipText.set(
      typeof config.tooltip === 'string' ? config.tooltip : this.visibleText(),
    );
    this.tooltipSide.set('top');
    this.tooltipOpen.set(true);
    // The popup opens above the text; when there is no room up there and there is below, it
    // flips once it has a measurable size.
    afterNextRender(
      () => {
        const popup = this.hostRef.nativeElement.querySelector<HTMLElement>(
          '.andes-typography__tooltip',
        );
        const view = this.document.defaultView;
        if (!popup || !view) {
          return;
        }
        const rect = this.hostRef.nativeElement.getBoundingClientRect();
        const needed = popup.offsetHeight + 8;
        if (rect.top < needed && view.innerHeight - rect.bottom > needed) {
          this.tooltipSide.set('bottom');
        }
      },
      { injector: this.injector },
    );
  }

  protected hideTooltip(): void {
    this.tooltipOpen.set(false);
  }

  // --- Copy --------------------------------------------------------------------------------

  /** Copies the configured text, or the visible text, to the clipboard. */
  async copy(): Promise<boolean> {
    const config = this.copyConfig();
    if (!config || this.disabled()) {
      return false;
    }
    const value = config.text ?? this.visibleText();
    if (!(await writeToClipboard(this.document, value))) {
      return false;
    }
    this.copiedState.set(true);
    this.copied.emit(value);
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(
      () => this.copiedState.set(false),
      COPIED_RESET_MS,
    );
    return true;
  }

  // --- Edit --------------------------------------------------------------------------------

  /** Opens the editor. */
  startEdit(): void {
    if (!this.editConfig() || this.disabled() || this.editing()) {
      return;
    }
    this.openEditor();
    this.editing.set(true);
  }

  private openEditor(): void {
    if (this.editorOpen) {
      return;
    }
    this.editorOpen = true;
    const config = this.editConfig();
    const start = config?.text ?? this.visibleText();
    this.editStart = start;
    this.draft.set(start);
    this.edit.emit(start);
  }

  private finishEdit(commit: boolean, restoreFocus: boolean): void {
    if (!this.editorOpen) {
      return;
    }
    this.editorOpen = false;
    const value = this.draft();
    if (commit) {
      if (value !== this.editStart) {
        this.text.set(value);
      }
      this.save.emit(value);
    } else {
      this.editCancel.emit();
    }
    this.restoreFocus = restoreFocus;
    this.editing.set(false);
  }

  protected onDraftInput(event: Event): void {
    const field = event.target as HTMLTextAreaElement;
    this.draft.set(field.value);
    this.editChange.emit(field.value);
    this.resizeEditor(field);
  }

  protected onEditorKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.finishEdit(false, true);
    } else if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.finishEdit(true, true);
    }
  }

  protected onEditorBlur(): void {
    this.finishEdit(true, false);
  }

  protected onHostClick(event: MouseEvent): void {
    const element = this.textRef()?.nativeElement;
    if (
      this.editConfig()?.textTrigger &&
      element?.contains(event.target as Node)
    ) {
      this.startEdit();
    }
  }

  protected onHostKeydown(event: KeyboardEvent): void {
    if (
      event.key === 'Enter' &&
      this.editConfig()?.textTrigger &&
      event.target === this.textRef()?.nativeElement
    ) {
      event.preventDefault();
      this.startEdit();
    }
  }

  private resizeEditor(field: HTMLTextAreaElement): void {
    const autoSize = this.autoSize();
    if (!autoSize || !field.scrollHeight) {
      return;
    }
    const style = this.document.defaultView?.getComputedStyle(field);
    if (!style) {
      return;
    }
    const lineHeight =
      parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
    const padding =
      parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const border =
      parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    field.style.height = 'auto';
    const wanted = field.scrollHeight + border;
    const min = autoSize.minRows * lineHeight + padding + border;
    const max = autoSize.maxRows * lineHeight + padding + border;
    field.style.height = `${Math.min(Math.max(wanted, min), max)}px`;
  }

  // --- Helpers -----------------------------------------------------------------------------

  /** The text as the reader sees it: the `text` value, else what is projected. */
  protected visibleText(): string {
    return (
      this.text() ?? this.textRef()?.nativeElement.textContent?.trim() ?? ''
    );
  }
}
