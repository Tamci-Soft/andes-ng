import {
  computed,
  Injectable,
  type Signal,
  signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';

export type AndesAccordionType = 'single' | 'multiple';
export type AndesAccordionSize = 'sm' | 'md' | 'lg';
/** Which part of a header toggles its panel. Unset (the default) means the whole header row;
 *  `header` means only the header text (plus the icon); `icon` means only the expand icon;
 *  `disabled` means the panel can't be toggled by the user at all. */
export type AndesAccordionCollapsible = 'header' | 'icon' | 'disabled';
export type AndesAccordionExpandIconPosition = 'start' | 'end';
/** Visual treatment resolved from the root's `bordered`/`ghost` flags. */
export type AndesAccordionVariant = 'default' | 'bordered' | 'ghost';

/** Template context handed to a custom `expandIcon` template. `$implicit` is `isActive`, so both
 *  `let-active` and `let-active="isActive"` work. */
export interface AndesAccordionExpandIconContext {
  $implicit: boolean;
  isActive: boolean;
  disabled: boolean;
  value: string;
}

/**
 * The signals `AndesAccordion` hands to its state on construction - read directly rather than
 * mirrored into local signals through `effect()`s, so every item/trigger/content sees the root's
 * current inputs synchronously (no one-tick lag after a parent-driven `activeKey` change) and a
 * toggle writes straight back into the root's `activeKey` model.
 *
 * Kept as an interface in this file (rather than injecting `AndesAccordion` itself) because the
 * root imports `AndesAccordionItem`/`Trigger`/`Content` to render its `items` input - injecting
 * the root class from those children would be a circular import.
 */
export interface AndesAccordionHost {
  readonly type: Signal<AndesAccordionType>;
  readonly disabled: Signal<boolean>;
  readonly activeKey: WritableSignal<string[]>;
  readonly size: Signal<AndesAccordionSize>;
  readonly bordered: Signal<boolean>;
  readonly ghost: Signal<boolean>;
  readonly collapsible: Signal<AndesAccordionCollapsible | undefined>;
  readonly expandIcon: Signal<
    TemplateRef<AndesAccordionExpandIconContext> | undefined
  >;
  readonly expandIconPosition: Signal<AndesAccordionExpandIconPosition>;
  readonly destroyOnHidden: Signal<boolean>;
}

/**
 * DI-scoped shared state for one `AndesAccordion` instance and its `AndesAccordionItem`
 * descendants (and, through them, the `AndesAccordionTrigger`/`AndesAccordionContent` pair each
 * item hosts).
 *
 * `AndesAccordion` provides a fresh instance of this service in its own `providers: [...]`
 * array (see accordion.ts) and `connect()`s its inputs to it; every `AndesAccordionItem`
 * projected into it injects that same instance via the normal element-injector hierarchy -
 * Angular's equivalent of React Context. No `@ContentChildren` query or manual parent/child
 * registration is needed, and each accordion on the page gets its own isolated instance
 * automatically. Per-item state (its own `value`, `disabled` flag and generated ids) lives one
 * level down, in `AndesAccordionItemState` (provided by each `AndesAccordionItem`), which the
 * item's own trigger/content inject alongside this root state.
 */
@Injectable()
export class AndesAccordionState {
  // A signal (not a plain field) so a computed that happened to be read before `connect()`
  // still re-evaluates once the root is connected instead of memoizing the fallback.
  private readonly host = signal<AndesAccordionHost | null>(null);

  readonly type = computed(() => this.host()?.type() ?? 'single');
  readonly disabled = computed(() => this.host()?.disabled() ?? false);
  readonly size = computed(() => this.host()?.size() ?? 'md');
  readonly variant = computed<AndesAccordionVariant>(() => {
    const host = this.host();
    if (host?.ghost()) {
      return 'ghost';
    }
    return host?.bordered() ? 'bordered' : 'default';
  });
  readonly collapsible = computed(() => this.host()?.collapsible());
  readonly expandIcon = computed(() => this.host()?.expandIcon());
  readonly expandIconPosition = computed(
    () => this.host()?.expandIconPosition() ?? 'end',
  );
  readonly destroyOnHidden = computed(
    () => this.host()?.destroyOnHidden() ?? false,
  );

  /** The open item values. In `single` mode only the first key of `activeKey` is honored, so a
   *  parent binding several keys can never leave more than one panel open. */
  readonly openValues = computed<ReadonlySet<string>>(() => {
    const keys = this.host()?.activeKey() ?? [];
    return new Set(this.type() === 'single' ? keys.slice(0, 1) : keys);
  });

  connect(host: AndesAccordionHost): void {
    this.host.set(host);
  }

  isOpen(value: string): boolean {
    return this.openValues().has(value);
  }

  /** Called by an `AndesAccordionTrigger` when the user activates it.
   *
   * `single` mode: opening an item replaces whatever was open (there is never more than one
   * value open); activating the already-open item closes it, so the set can also become
   * empty - matching the array-of-open-values model both reference libraries settled on, where
   * "collapsible single mode" is just the default behavior rather than a separate flag.
   * `multiple` mode: toggles the one item without touching any others. */
  toggle(value: string): void {
    const host = this.host();
    if (!host) {
      return;
    }
    const current = [...this.openValues()];
    const isOpen = current.includes(value);

    if (this.type() === 'single') {
      host.activeKey.set(isOpen ? [] : [value]);
      return;
    }

    host.activeKey.set(
      isOpen ? current.filter((key) => key !== value) : [...current, value],
    );
  }
}
