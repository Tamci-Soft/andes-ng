import {
  afterRenderEffect,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  type OnDestroy,
  type OnInit,
  signal,
  type Signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';

import {
  ANDES_MENU,
  ANDES_MENU_LEVEL,
  type AndesMenuEntry,
  type AndesMenuIcon,
  type AndesMenuLabel,
  type AndesMenuRowBinding,
} from './menu-types';

let nextRowId = 0;

/**
 * Turns the element it sits on into the focusable row of a menu entry: its role,
 * roving `tabindex`, ARIA state and the pointer / keyboard handlers all come from
 * the entry's binding, so an item link, an item `div` and a submenu title share one
 * implementation.
 *
 * @internal
 */
@Directive({
  selector: '[andesMenuRow]',
  host: {
    'data-andes-menu-row': '',
    '[attr.id]': 'binding().entry.id',
    '[attr.role]': 'binding().role()',
    '[attr.tabindex]': 'binding().tabIndex()',
    '[attr.aria-checked]': 'binding().checked()',
    '[attr.aria-current]': 'binding().current() ? "page" : null',
    '[attr.aria-disabled]': 'binding().disabled() ? "true" : null',
    '[attr.aria-expanded]': 'binding().expanded()',
    '[attr.aria-haspopup]': 'binding().hasPopup() ? "menu" : null',
    '[attr.aria-controls]': 'binding().controls()',
    '[attr.data-bar]': 'binding().bar() ? "" : null',
    '[attr.data-selected]': 'binding().selected() ? "" : null',
    '[attr.data-disabled]': 'binding().disabled() ? "" : null',
    '[attr.data-state]': 'binding().opened() ? "open" : "closed"',
    '(click)': 'binding().onClick($event)',
    '(keydown)': 'binding().onKeydown($event)',
    '(focus)': 'binding().onFocus()',
    '(focusout)': 'binding().onFocusOut($event)',
    '(pointerenter)': 'binding().onPointerEnter($event)',
    '(pointerleave)': 'binding().onPointerLeave($event)',
  },
})
export class AndesMenuRow implements OnInit, OnDestroy {
  /** The entry this element is the row of. */
  readonly binding = input.required<AndesMenuRowBinding>({
    alias: 'andesMenuRow',
  });

  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  ngOnInit(): void {
    this.binding().attach(this.element);
  }

  ngOnDestroy(): void {
    this.binding().detach(this.element);
  }
}

/**
 * State and behavior shared by the two kinds of focusable row, `andes-menu-item`
 * and `andes-sub-menu`.
 *
 * Each row defines its rendering as a template (`#view`) and shows it in its own
 * host. When the horizontal bar runs out of room the menu marks the row as
 * `overflowed`: the host then renders nothing and the overflow popup renders the same
 * template instead, so the row keeps its projected content, state and handlers.
 *
 * @internal
 */
@Directive({
  host: {
    '[attr.title]': 'null',
    '[attr.data-overflowed]': 'overflowed() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export abstract class AndesMenuRowBase implements AndesMenuRowBinding, OnInit {
  protected readonly menu = inject(ANDES_MENU);
  readonly level = inject(ANDES_MENU_LEVEL, { skipSelf: true });
  protected readonly destroyRef = inject(DestroyRef);
  readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Identifies the row in `selectedKeys`, `openKeys` and event key paths. Auto-generated if omitted. */
  readonly key = input<string | undefined>(undefined);
  /** Visible label, as an alternative to projecting content. */
  readonly label = input<AndesMenuLabel | undefined>(undefined);
  /** Leading icon: a template or a plain string. A projected `[slot=icon]` element works too. */
  readonly icon = input<AndesMenuIcon | undefined>(undefined);
  /** Greys the row out and removes it from keyboard navigation and activation. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Tooltip text for the collapsed rail; defaults to the label. */
  readonly title = input<string | undefined>(undefined);
  /** Trailing hint text (a shortcut, a count). A projected `[slot=extra]` element works too. */
  readonly extra = input<string | undefined>(undefined);

  readonly rowId = `andes-menu-row-${nextRowId++}`;
  protected readonly autoKey = `andes-menu-key-${nextRowId}`;
  readonly effectiveKey = computed(() => this.key() ?? this.autoKey);

  /** The focusable element currently rendered for this row. */
  readonly rowElement = signal<HTMLElement | null>(null);
  /** Set by the menu when the horizontal bar has no room for this row. */
  readonly overflowed = signal(false);

  protected readonly view = viewChild<TemplateRef<unknown>>('view');
  protected readonly labelElement =
    viewChild<ElementRef<HTMLElement>>('labelEl');

  readonly entry: AndesMenuEntry;
  readonly binding: AndesMenuRowBinding = this;

  readonly inPopup = computed(() => this.overflowed() || this.level.inPopup());
  /** Whether the row sits directly in a horizontal bar. */
  readonly bar = computed(
    () => this.menu.mode() === 'horizontal' && !this.inPopup(),
  );

  readonly iconTemplate = computed(() => {
    const icon = this.icon();
    return icon && typeof icon !== 'string' ? icon : null;
  });
  readonly iconText = computed(() => {
    const icon = this.icon();
    return typeof icon === 'string' ? icon : '';
  });
  readonly labelTemplate = computed(() => {
    const label = this.label();
    return label && typeof label !== 'string' ? label : null;
  });
  readonly labelString = computed(() => {
    const label = this.label();
    return typeof label === 'string' ? label : '';
  });

  /** The first letter shown for a top-level row without an icon in the collapsed rail. */
  readonly shortLabel = signal('');

  readonly selected: Signal<boolean>;
  readonly role: Signal<string | null>;
  readonly checked: Signal<boolean | null>;
  readonly current: Signal<boolean>;
  readonly tabIndex: Signal<number>;
  readonly expanded: Signal<boolean | null> = signal(null);
  readonly hasPopup: Signal<boolean> = signal(false);
  readonly controls: Signal<string | null> = signal(null);
  readonly opened: Signal<boolean> = signal(false);

  /** Inline indentation of the row, as a CSS length, or null outside an inline list. */
  readonly indent = computed(() => {
    if (
      this.menu.mode() !== 'inline' ||
      this.menu.collapsed() ||
      this.inPopup()
    ) {
      return null;
    }
    return `${this.level.depth * this.menu.inlineIndent()}px`;
  });

  /** Which kind of row this is. Implemented on the prototype so the constructor can read it. */
  protected abstract rowKind(): 'item' | 'sub';

  protected readonly kind = this.rowKind();

  constructor() {
    const kind = this.kind;
    this.entry = {
      id: this.rowId,
      kind,
      key: this.effectiveKey,
      disabled: this.disabled,
      host: this.host,
      row: this.rowElement,
      level: this.level,
      inPopup: this.inPopup,
      text: () => this.text(),
      tooltipText: () => this.title() ?? this.text(),
      sub: null,
    };

    this.selected = computed(
      () => kind === 'item' && this.menu.isSelected(this.effectiveKey()),
    );
    this.checked = computed(() =>
      kind === 'item' && !this.menu.navigation() && this.menu.selectable()
        ? this.selected()
        : null,
    );
    this.current = computed(
      () => this.menu.navigation() && this.selected() && kind === 'item',
    );
    this.role = computed(() => {
      if (this.menu.navigation()) {
        return kind === 'sub' || !this.isLink() ? 'button' : null;
      }
      if (kind === 'item' && this.menu.selectable()) {
        return this.menu.multiple() ? 'menuitemcheckbox' : 'menuitemradio';
      }
      return 'menuitem';
    });
    this.tabIndex = computed(() => {
      if (this.disabled()) {
        return -1;
      }
      if (this.menu.navigation()) {
        return 0;
      }
      if (this.inPopup()) {
        return -1;
      }
      return this.menu.tabStopId() === this.rowId ? 0 : -1;
    });

    // The collapsed rail shows the first letter of a top-level row that has no icon.
    afterRenderEffect(() => {
      if (this.menu.collapsed() && this.level.depth === 0) {
        this.shortLabel.set(this.text().charAt(0).toUpperCase());
      }
    });

    this.menu.registerEntry(this.entry);
    this.destroyRef.onDestroy(() => this.menu.unregisterEntry(this.entry));
  }

  ngOnInit(): void {
    if (this.level.isRoot && this.registersUnit()) {
      const unit = {
        host: this.host,
        overflowed: this.overflowed,
        view: computed(() => this.view()),
        divider: false,
      };
      this.menu.registerUnit(unit);
      this.destroyRef.onDestroy(() => this.menu.unregisterUnit(unit));
    }
  }

  /** Whether the row takes part in the horizontal overflow. False for the overflow submenu itself. */
  protected registersUnit(): boolean {
    return true;
  }

  /** Whether the row is rendered as an anchor. Overridden by the item. */
  protected isLink(): boolean {
    return false;
  }

  protected text(): string {
    const element = this.labelElement()?.nativeElement;
    const text = (element?.textContent ?? this.labelString()).replace(
      /\s+/g,
      ' ',
    );
    return text.trim();
  }

  attach(element: HTMLElement): void {
    this.rowElement.set(element);
  }

  detach(element: HTMLElement): void {
    if (this.rowElement() === element) {
      this.rowElement.set(null);
    }
  }

  abstract onClick(event: MouseEvent): void;
  abstract onPointerEnter(event: PointerEvent): void;
  abstract onPointerLeave(event: PointerEvent): void;

  onKeydown(event: KeyboardEvent): void {
    this.menu.keydown(this.entry, event);
  }

  onFocus(): void {
    this.menu.rowFocused(this.entry);
    if (this.kind === 'item' && this.menu.collapsed()) {
      const element = this.rowElement();
      let visible = false;
      try {
        visible = !!element?.matches(':focus-visible');
      } catch {
        visible = false;
      }
      if (visible) {
        this.menu.showTooltip(this.entry, true);
      }
    }
  }

  onFocusOut(event: FocusEvent): void {
    this.menu.hideTooltip();
    this.menu.rowFocusLeft(event);
  }
}
