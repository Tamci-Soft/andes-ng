import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import clsx from 'clsx';

export type AndesSwitchSize = 'sm' | 'md';

/**
 * Payload of `changed` / `clicked` - Ant Design's `(checked, event)` callback pair folded into
 * one object, since an Angular output emits a single value.
 */
export interface AndesSwitchChangeEvent {
  readonly checked: boolean;
  readonly event: MouseEvent;
}

@Component({
  selector: 'andes-switch',
  imports: [],
  templateUrl: './switch.html',
  styleUrl: './switch.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesSwitch),
      multi: true,
    },
  ],
  host: {
    // Forwarded to the real button in the template instead - a screen reader never sees
    // this non-interactive host element, so leaving these here would do nothing. Same
    // class of bug already found and fixed in AndesButton.
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
  },
})
export class AndesSwitch implements ControlValueAccessor {
  /**
   * The rendered `checked` state, and the single source of truth for it - a `model()` rather
   * than an `input()`. A click writes straight into this signal (`this.checked.set(next)`), the
   * same signal a `[checked]`/`[(checked)]`-bound parent reads and writes, via the
   * `checkedChange` output `model()` generates for it. There is no separate internal signal
   * that mirrors or derives from `checked` (previously a `linkedSignal`), so there is nothing
   * left for it to silently diverge from.
   *
   * `model()` does not support the `transform` option that `input()` does, so a bare boolean
   * attribute (`<andes-switch checked>`, no brackets) is written into the model as the literal
   * empty string, not `true` - the same gap `AndesCheckbox` hit on its own `model()` fields.
   * `isChecked` below coerces that back through `booleanAttribute` for template consumption;
   * callers still writing new templates should prefer a property binding (`[checked]="true"`).
   *
   * A one-way `[checked]="expr"` works as an initial value (Ant Design's `defaultChecked`), but
   * once the user toggles, re-evaluating an unchanged `expr` can't push it back: Angular only
   * re-writes an input when the bound value itself changes. A parent that needs to own the state
   * (e.g. to roll back a rejected toggle) binds `[(checked)]` so its own signal moves in lockstep.
   */
  readonly checked = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  /**
   * Ant Design's `loading`. Unlike Ant, this does NOT natively disable the button: a switch that
   * goes busy right after the user toggles it (the usual async-save pattern) would otherwise drop
   * keyboard focus to `<body>` mid-interaction. It stays focusable, announces `aria-busy`, and
   * `onClick` ignores activation until it clears.
   */
  readonly loading = input(false, { transform: booleanAttribute });
  readonly autoFocus = input(false, { transform: booleanAttribute });
  readonly size = input<AndesSwitchSize>('md');
  /**
   * String fallbacks for the `[slot=checked]` / `[slot=unchecked]` track content (Ant Design's
   * `checkedChildren` / `unCheckedChildren`). Rendered as `<ng-content>` fallback content, so a
   * projected slot element - for icons or markup - wins over the string when both are given.
   */
  readonly checkedChildren = input<string>('');
  readonly unCheckedChildren = input<string>('');
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
   * `checked` coerced through `booleanAttribute`, for TEMPLATE CONSUMPTION only (see the doc
   * comment on `checked` above) - mirrors `checkedProp` on `AndesCheckbox`. Reads in switch.html
   * that render state (`aria-checked`, the `data-checked`/`data-unchecked` attrs, the
   * checked/unchecked slot switch) go through this computed instead of the raw model, so a bare
   * `<andes-switch checked>` renders as truthy instead of leaking the empty-string attribute
   * value into the DOM. Writes (`this.checked.set(...)`, `writeValue`) still go straight to the
   * `checked` model itself - it stays the single source of truth for reads/writes and the
   * `[(checked)]` two-way binding surface; this computed can never itself drift out of sync
   * with it, being a pure derived formatter.
   */
  protected readonly isChecked = computed(() =>
    booleanAttribute(this.checked()),
  );

  /**
   * Fires only on a user-initiated toggle - never for `writeValue` or a parent-driven `[checked]`
   * change, which `checkedChange` (from the `model()`) also reports. Named `changed`, not
   * `change`, because `@angular-eslint/no-output-native` forbids shadowing DOM event names.
   */
  readonly changed = output<AndesSwitchChangeEvent>();
  /**
   * Ant Design's `onClick`: fires for every activation that reaches the control, carrying the
   * state after it (unchanged when `readonly`). Not emitted while `disabled` or `loading`, where
   * Ant's own switch is natively disabled and never sees the click.
   */
  readonly clicked = output<AndesSwitchChangeEvent>();

  private readonly control =
    viewChild.required<ElementRef<HTMLButtonElement>>('control');

  private readonly formDisabled = signal(false);

  protected readonly isDisabled = computed(
    () => this.disabled() || this.formDisabled(),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-switch',
      `andes-switch--${this.size()}`,
      this.ariaInvalid() && 'andes-switch--invalid',
      this.loading() && 'andes-switch--loading',
    ),
  );

  constructor() {
    afterNextRender(() => {
      if (this.autoFocus()) {
        this.focus();
      }
    });
  }

  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  blur(): void {
    this.control().nativeElement.blur();
  }

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected onClick(event: MouseEvent): void {
    if (this.isDisabled() || this.loading()) {
      return;
    }

    if (this.readonly()) {
      this.clicked.emit({ checked: this.isChecked(), event });
      return;
    }

    // Toggle off the coerced value, not the raw model: a bare `<andes-switch checked>` holds `""`
    // in the model, and `!""` is `true` - the first click would have been a silent no-op.
    const next = !this.isChecked();
    // Writes straight into the model signal - the same signal a `[checked]`/`[(checked)]`-bound
    // parent reads, and `model()` auto-emits `checkedChange` for us, so there's no separate
    // `.emit()` call here (that would double-fire the event).
    this.checked.set(next);
    this.onChange(next);
    this.changed.emit({ checked: next, event });
    this.clicked.emit({ checked: next, event });
  }

  protected onBlur(): void {
    this.onTouched();
  }

  writeValue(value: boolean): void {
    this.checked.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
