import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  TemplateRef,
} from '@angular/core';
import clsx from 'clsx';

import { AndesAccordionContent } from './accordion-content';
import { AndesAccordionItem } from './accordion-item';
import { AndesAccordionLazy } from './accordion-lazy';
import {
  type AndesAccordionCollapsible,
  type AndesAccordionExpandIconContext,
  type AndesAccordionExpandIconPosition,
  type AndesAccordionSize,
  AndesAccordionState,
  type AndesAccordionType,
} from './accordion-state';
import { AndesAccordionTrigger } from './accordion-trigger';

export type {
  AndesAccordionCollapsible,
  AndesAccordionExpandIconContext,
  AndesAccordionExpandIconPosition,
  AndesAccordionSize,
  AndesAccordionType,
} from './accordion-state';

/** One entry of the `items` input - Ant Design's `ItemType`, with `children` named `content`. */
export interface AndesAccordionItemConfig {
  key: string;
  label: string | TemplateRef<unknown>;
  /** Rendered lazily on first open, like a `ng-template[andesAccordionLazy]` body. */
  content?: string | TemplateRef<unknown>;
  extra?: string | TemplateRef<unknown>;
  disabled?: boolean;
  collapsible?: AndesAccordionCollapsible;
  showArrow?: boolean;
  forceRender?: boolean;
}

const TRIGGER_CONTROL_SELECTOR =
  '.andes-accordion-trigger__button, .andes-accordion-trigger__icon-button';

/**
 * Root of the accordion compound component (Ant Design's `Collapse`). Provides
 * `AndesAccordionState`, shared via DI by every projected `AndesAccordionItem` - see
 * accordion-state.ts for why this pattern (rather than `@ContentChildren`) is used.
 *
 * Panels come from projected `andes-accordion-item`s, from the `items` input, or both (items
 * first). Open state is the `activeKey` model: bind `[(activeKey)]` for two-way, `[activeKey]`
 * for an initial value (Ant Design's `defaultActiveKey`), or listen to `(activeKeyChange)`,
 * which fires only on user interaction (Ant Design's `onChange`).
 *
 * Keyboard: every trigger is a native `<button>` in the natural tab order (Enter/Space toggle).
 * Arrow-key focus movement between triggers is the WAI-ARIA APG's *optional* accordion
 * keyboard support and is opt-in via `arrowNavigation` - Base UI (behind shadcn) dropped it
 * following the APG update, so it stays off by default. Even when on, it never manages
 * `tabindex` (no roving focus): Tab still visits every trigger.
 */
@Component({
  selector: 'andes-accordion',
  imports: [
    NgTemplateOutlet,
    AndesAccordionItem,
    AndesAccordionTrigger,
    AndesAccordionContent,
    AndesAccordionLazy,
  ],
  templateUrl: './accordion.html',
  styleUrl: './accordion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AndesAccordionState],
  host: {
    '[class]': 'classes()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-variant]': 'state.variant()',
    '[attr.data-size]': 'size()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class AndesAccordion {
  protected readonly state = inject(AndesAccordionState);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Whether one (`'single'`) or several (`'multiple'`) panels can be open at once - Ant
   *  Design's `accordion` flag, named after shadcn's historical `type` prop. */
  readonly type = input<AndesAccordionType>('single');
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Values of the open items. In `single` mode only the first key is honored. */
  readonly activeKey = model<string[]>([]);
  /** Ant Design-style outlined block with tinted headers. Off by default, which keeps the
   *  divider-only look. */
  readonly bordered = input(false, { transform: booleanAttribute });
  /** Transparent and borderless, with no dividers. Wins over `bordered`. */
  readonly ghost = input(false, { transform: booleanAttribute });
  readonly size = input<AndesAccordionSize>('md');
  /** Which part of each header toggles its panel; items can override it. Unset = whole row. */
  readonly collapsible = input<AndesAccordionCollapsible | undefined>(
    undefined,
  );
  /** Custom expand icon. Receives `AndesAccordionExpandIconContext` (`$implicit` = isActive);
   *  it is not rotated automatically - use `isActive` to style it. */
  readonly expandIcon = input<
    TemplateRef<AndesAccordionExpandIconContext> | undefined
  >(undefined);
  readonly expandIconPosition = input<AndesAccordionExpandIconPosition>('end');
  /** Removes a lazy (`ng-template[andesAccordionLazy]` / `items`) panel body whenever its panel
   *  closes, instead of keeping it (and its state) after the first open. */
  readonly destroyOnHidden = input(false, { transform: booleanAttribute });
  /** Panels declared as data rather than projected - rendered before any projected items. */
  readonly items = input<readonly AndesAccordionItemConfig[]>([]);
  /** ArrowDown/ArrowUp move focus to the next/previous trigger (wrapping), Home/End to the
   *  first/last - the APG's optional accordion keys. */
  readonly arrowNavigation = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    clsx(
      'andes-accordion',
      this.disabled() && 'andes-accordion--disabled',
      `andes-accordion--${this.state.variant()}`,
      `andes-accordion--${this.size()}`,
    ),
  );

  constructor() {
    this.state.connect({
      type: this.type,
      disabled: this.disabled,
      activeKey: this.activeKey,
      size: this.size,
      bordered: this.bordered,
      ghost: this.ghost,
      collapsible: this.collapsible,
      expandIcon: this.expandIcon,
      expandIconPosition: this.expandIconPosition,
      destroyOnHidden: this.destroyOnHidden,
    });
  }

  protected isTemplate(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef;
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.arrowNavigation()) {
      return;
    }
    const root = this.host.nativeElement;
    // Only this accordion's own triggers - not those of an accordion nested in a panel.
    const controls = Array.from(
      root.querySelectorAll<HTMLButtonElement>(TRIGGER_CONTROL_SELECTOR),
    ).filter(
      (control) =>
        control.closest('andes-accordion') === root && !control.disabled,
    );
    const index = controls.indexOf(event.target as HTMLButtonElement);
    if (index === -1) {
      return;
    }

    let next: number;
    switch (event.key) {
      case 'ArrowDown':
        next = (index + 1) % controls.length;
        break;
      case 'ArrowUp':
        next = (index - 1 + controls.length) % controls.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = controls.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    controls[next].focus();
  }
}
