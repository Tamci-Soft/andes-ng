import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import {
  ANDES_CHECKBOX_SELECT_ALL,
  AndesCheckboxGroupState,
} from './checkbox-group-state';

/** Which side of the box the projected label sits on, in the current writing direction. */
export type AndesCheckboxLabelPosition = 'start' | 'end';

/**
 * Payload of `AndesCheckbox`'s `change` output - the Angular counterpart of Ant Design's
 * `CheckboxChangeEvent` (`e.target.checked` + `e.nativeEvent`), flattened so the common case
 * reads `event.checked` rather than digging through a synthetic `target`.
 */
export interface AndesCheckboxChange {
  /** The new checked state. */
  readonly checked: boolean;
  /** The checkbox's `value`, if it has one. */
  readonly value: string | undefined;
  /** The checkbox that changed. */
  readonly source: AndesCheckbox;
  /** The native `change` event from the underlying `<input type="checkbox">`. */
  readonly event: Event;
}

@Component({
  selector: 'andes-checkbox',
  imports: [],
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Forwarded to the native input in the template instead - a screen reader never sees
    // this non-interactive host element, so leaving these here would do nothing (see the
    // same convention in AndesButton).
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesCheckbox),
      multi: true,
    },
  ],
})
export class AndesCheckbox implements ControlValueAccessor {
  /**
   * The enclosing `AndesCheckboxGroup`'s shared state, or `null` when this checkbox is used on
   * its own - which is the whole point of `{ optional: true }`: group participation is opt-in
   * by placement alone, and a standalone checkbox keeps exactly the behavior it always had.
   */
  private readonly group = inject(AndesCheckboxGroupState, { optional: true });

  /**
   * True when `AndesCheckboxSelectAll` sits on this same element. Such a checkbox lives inside
   * the group but must never register as one of its ITEMS - it summarizes them, so counting
   * itself would make the aggregate depend on its own output.
   */
  private readonly isSelectAll =
    inject(ANDES_CHECKBOX_SELECT_ALL, { optional: true, self: true }) !== null;

  /**
   * Single source of truth for the rendered `checked` state - AND the two-way binding
   * surface for it (`model()` auto-generates the `checkedChange` output, enabling
   * `[(checked)]`). A user click writes straight into this signal (see `onNativeChange`) and
   * `writeValue` does the same for Reactive/Template-driven forms - there is no longer a
   * separate "internal" signal that mirrors it, the way the previous `checked` `input()` +
   * `checkedState` `linkedSignal` pair did.
   *
   * That split was the actual bug, not just the `signal()` + `effect()` mirror it replaced:
   * a parent re-asserting a value the reactive graph doesn't perceive as "changed" from what
   * it last wrote is unobservable by ANY Angular signal primitive - traced against Angular's
   * own reactive-graph source, this isn't specific to `linkedSignal`. With two distinct
   * signals, a click could leave the parent's own `checked` sitting on a value it never
   * itself transitioned away from, so a later "reassertion" of that same value was a no-op
   * write from the framework's point of view and the checkbox stayed stuck on the
   * click-diverged state. Folding both into one `model()` signal removes the second signal
   * entirely - a click and a bound parent's own state are the exact same value at every
   * instant (when the parent wires `[(checked)]`/`(checkedChange)`), so there is nothing left
   * to diverge and nothing to "reassert" against.
   */
  readonly checked = model<boolean>(false);

  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Two-way model for the native `indeterminate` DOM PROPERTY (not an HTML attribute -
   * `[attr.indeterminate]` is a no-op on a native checkbox, see checkbox.html). Same
   * rationale as `checked` above: a user click writes straight into this signal (see
   * `onNativeChange`) - a native checkbox's `indeterminate` property is automatically reset
   * to `false` by the browser the moment the user interacts with it, and mirroring that
   * directly into the single shared model (rather than a separate internal copy of it) is
   * what lets a bound parent's own `indeterminate` state stay perfectly in sync, with nothing
   * left to fall out of sync the way the previous `indeterminateState` `linkedSignal` could.
   */
  readonly indeterminate = model<boolean>(false);

  readonly required = input(false, { transform: booleanAttribute });
  /**
   * Prevents toggling without visually disabling the control - distinct from `disabled`:
   * a read-only checkbox stays focusable and keeps its normal (non-dimmed) appearance, it
   * just can't be changed. Matches shadcn/ui's Base UI-backed `Checkbox`'s `readOnly` prop.
   * Native `<input type="checkbox">` ignores the HTML `readonly` attribute entirely (the
   * platform only honors it on text-like inputs), so this is enforced by preventing the
   * `click` that would otherwise toggle it - the same technique `AndesButtonPrimitive` uses
   * to block navigation on a disabled anchor.
   */
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly value = input<string | undefined>(undefined);
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

  /** Puts the label before (`start`) or after (`end`, the default) the box. */
  readonly labelPosition = input<AndesCheckboxLabelPosition>('end');

  /**
   * Focuses the native input once, right after the first render - Ant's `autoFocus`. Read once
   * on purpose (like the HTML `autofocus` attribute): toggling it later never steals focus.
   */
  readonly autoFocus = input(false, { transform: booleanAttribute });

  /**
   * Opts a checkbox placed inside an `AndesCheckboxGroup` out of the group: it keeps its own
   * `checked` model, is not part of the group's `value` array or select-all aggregate, and
   * does not inherit the group's `name`. Like a disabled `<fieldset>`, a disabled group still
   * disables it - that mirrors Ant Design's `skipGroup`, which only skips the value wiring.
   */
  readonly skipGroup = input(false, { transform: booleanAttribute });

  /**
   * Fires on every USER toggle (never for programmatic `checked`/form writes), carrying the
   * new state and the native event - Ant's `onChange`. Deliberately not named `change`: the
   * inner input's native `change` event already bubbles to `<andes-checkbox>` (and
   * `AndesCheckboxSelectAll` listens for it), so an output of that name would make `(change)`
   * fire twice with two different payloads - which is also what `no-output-native` forbids.
   */
  readonly changed = output<AndesCheckboxChange>();

  private readonly inputRef =
    viewChild.required<ElementRef<HTMLInputElement>>('input');

  /**
   * `model()` intentionally has no `transform` option - unlike `input()`, a two-way binding's
   * output has to emit exactly the type its input accepts, so it can't silently coerce values
   * on the way in without breaking that round-trip. That means a bare, bracket-less
   * `checked`/`indeterminate` attribute (e.g. `<andes-checkbox checked>`, used throughout
   * checkbox.stories.ts) is written into the model as the literal empty string, not `true`.
   * The native DOM-property bindings in checkbox.html read through these `booleanAttribute`
   * coerced computeds instead of the raw models directly to restore that. Being `computed()`
   * rather than a locally-settable signal, this can never itself drift out of sync with the
   * model it derives from - it's a pure formatter for the native property setter, not a
   * second piece of state.
   */
  protected readonly checkedProp = computed(() => {
    // Inside a group, the group's selection array - not this checkbox's own `checked` model -
    // is the source of truth, so that a checkbox added, removed or re-rendered at any time
    // always shows the group's current answer rather than a stale local copy of it.
    const fromGroup = this.selectedInGroup();

    return fromGroup ?? booleanAttribute(this.checked());
  });
  protected readonly indeterminateProp = computed(() =>
    booleanAttribute(this.indeterminate()),
  );

  /**
   * `null` when this checkbox is not a group item (standalone, select-all, `skipGroup`, or no
   * `value`).
   */
  private readonly selectedInGroup = computed<boolean | null>(() => {
    const value = this.groupValue();

    return value !== undefined ? (this.group?.isSelected(value) ?? null) : null;
  });

  /**
   * The value this checkbox contributes to its group, or `undefined` when it contributes
   * nothing. Handed to the group as the item's `value` signal, so flipping `skipGroup` at
   * runtime simply makes the item drop out of (or rejoin) the aggregate, without having to
   * unregister and re-register it.
   */
  private readonly groupValue = computed(() =>
    this.group !== null && !this.isSelectAll && !this.skipGroup()
      ? this.value()
      : undefined,
  );

  /** An item's own `name` wins; otherwise it submits under its group's `name`. */
  protected readonly effectiveName = computed(
    () =>
      this.name() ??
      (this.groupValue() !== undefined ? this.group?.name() : undefined),
  );

  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(
    () =>
      this.disabled() ||
      this.formDisabled() ||
      (this.group?.disabled() ?? false),
  );

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    const group = this.group;
    if (group !== null && !this.isSelectAll) {
      // Registered unconditionally (rather than only while `value` is set) so the item object
      // stays stable for this checkbox's whole lifetime - `value` and `disabled` are handed
      // over as signals, so the group re-reads them itself instead of needing a re-register.
      const unregister = group.registerItem({
        value: this.groupValue,
        disabled: this.isDisabled,
      });
      inject(DestroyRef).onDestroy(unregister);
    }

    afterNextRender(() => {
      if (this.autoFocus()) {
        this.focus();
      }
    });
  }

  /** Moves focus to the native input - Ant's `focus()` method. */
  focus(options?: FocusOptions): void {
    this.inputRef().nativeElement.focus(options);
  }

  /** Removes focus from the native input - Ant's `blur()` method. */
  blur(): void {
    this.inputRef().nativeElement.blur();
  }

  protected onNativeClick(event: MouseEvent): void {
    if (this.readOnly()) {
      event.preventDefault();
    }
  }

  protected onNativeChange(event: Event): void {
    const nativeInput = event.target as HTMLInputElement;

    // Writing directly into the shared `checked`/`indeterminate` models - rather than some
    // separate internal signal - is what makes this immediately visible to a bound parent:
    // `model.set()` emits the paired `checkedChange`/`indeterminateChange` output itself
    // whenever the value actually changes, so `[(checked)]`/`[(indeterminate)]` (or a plain
    // `(checkedChange)`/`(indeterminateChange)` listener) stays in lockstep with the click,
    // with no explicit `.emit()` calls needed here.
    this.checked.set(nativeInput.checked);
    // The browser already cleared the DOM property on this same interaction - mirror it into
    // the model rather than letting the next render fight the user's click.
    this.indeterminate.set(nativeInput.indeterminate);

    // Inside a group, the click also has to reach the group's shared selection - that is what
    // `checkedProp` renders from, so without this the DOM would snap straight back.
    const group = this.group;
    const value = this.groupValue();
    if (group !== null && value !== undefined) {
      group.toggleItem(value, nativeInput.checked);
    }

    this.onChange(nativeInput.checked);
    this.changed.emit({
      checked: nativeInput.checked,
      value: this.value(),
      source: this,
      event,
    });
  }

  protected onNativeBlur(): void {
    this.onTouched();
  }

  writeValue(value: boolean | null): void {
    // No more "form-controlled vs. plain input" priority dance: `checked` is the one and
    // only signal backing this control now, so a form value simply writes into it directly.
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
