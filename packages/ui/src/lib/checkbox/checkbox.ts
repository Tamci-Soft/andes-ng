import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

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
  protected readonly checkedProp = computed(() =>
    booleanAttribute(this.checked()),
  );
  protected readonly indeterminateProp = computed(() =>
    booleanAttribute(this.indeterminate()),
  );

  private readonly formDisabled = signal(false);
  protected readonly isDisabled = signal(false);

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    effect(() => {
      const disabled = this.disabled();
      const formDisabled = this.formDisabled();
      this.isDisabled.set(disabled || formDisabled);
    });
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

    this.onChange(nativeInput.checked);
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
