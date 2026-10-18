# @andes-ng/primitives

Andes NG's own accessible, unstyled Angular behavior directives — the layer `@andes-ng/ui` builds components on top of.

Grown incrementally: a primitive is added here only when an `@andes-ng/ui` component needs it, never speculatively ahead of one.

## Form control

`AndesFormControlBase`, `AndesValueAccessor`, `provideAndesValueAccessor` and `injectAndesControlStatus` (in `src/lib/form-control/`) are the shared plumbing of every component that holds a value and has to work inside an Angular form: `writeValue`, `registerOnChange`, `registerOnTouched`, `setDisabledState`, the `disabled` input merged with the form's disabled state, touched on blur, and the validation status the `andes-form-field` wrapper needs.

### What it guarantees

- `commit(value)` sets the signal and notifies the form **once**, and only when the value actually changed (`equals`, `Object.is` by default). Re-picking the selected option never marks the control dirty.
- `writeValue(raw)` sets the signal and never calls `onChange`, so `setValue()`, `patchValue()` and `reset()` cannot loop back into the form. `null` / `undefined` become the control's empty value (`''`, `[]`, ...) or go through a `coerce` function.
- `disabled` is the component's own input **or** the form's state. Either side can disable the control and neither can re-enable it for the other.
- `markTouched()` is forwarded on every call: a control with `updateOn: 'blur'` only publishes its pending value from that call.
- One `provideAndesValueAccessor(() => Component)` replaces the `NG_VALUE_ACCESSOR` / `forwardRef` block, and it covers `formControl`, `formControlName`, `ngModel` **and** signal forms' `[formField]`, which binds through a value accessor when one is provided.
- The control's validity is readable as signals (`invalid`, `touched`, `dirty`, `pending`, `errors`, `showError`, ...) from reactive forms, template-driven forms and signal forms alike, without the circular dependency you get from `inject(NgControl)` in a component that also provides `NG_VALUE_ACCESSOR`. The control is looked up from an effect, after construction, and follows a `[formControl]` that is re-bound to another control.

### Usage

When the value is a plain `value` model, extend the base class. It declares `value`, `disabled` and `touch`, so the subclass only renders and commits:

```ts
@Component({
  selector: 'andes-rating',
  providers: [provideAndesValueAccessor(() => AndesRating)],
  template: `
    @for (star of stars(); track star) {
      <button
        type="button"
        [disabled]="isDisabled()"
        [attr.aria-pressed]="star <= value()"
        (click)="commit(star)"
        (blur)="markTouched()"
      >
        {{ star }}
      </button>
    }
  `,
})
export class AndesRating extends AndesFormControlBase<number> {
  readonly total = input(5);
  protected readonly stars = computed(() => range(this.total()));

  protected emptyValue(): number {
    return 0;
  }

  // Optional: normalize what a form writes, and compare non-primitive values.
  protected override coerce(raw: unknown): number {
    return clamp(Number(raw ?? 0), 0, this.total());
  }
}
```

When the signal has another name (`checked`, `pressed`, `targetKeys`) or the component already extends a class, own an `AndesValueAccessor` instead and let the provider pick it, so the component's public API does not gain `writeValue` and friends:

```ts
@Component({
  selector: 'andes-switch',
  providers: [
    provideAndesValueAccessor(
      () => AndesSwitch,
      (self) => self.accessor,
    ),
  ],
})
export class AndesSwitch {
  readonly checked = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  protected readonly accessor = new AndesValueAccessor({
    value: this.checked,
    disabled: this.disabled,
    coerce: Boolean,
  });

  protected toggle(): void {
    this.accessor.commit(!this.checked());
  }
}
```

Array and object values supply an `equals` (`andesShallowArrayEquals` for arrays) so committing an equal value is not reported. State derived from a written value that is not the value itself (the text shown in a field, a discarded draft) goes in `onWrite` (or the base class's `onWritten()`); it runs on form writes only.

The validation status lets a component paint its own error state, instead of the page binding `[aria-invalid]` by hand:

```ts
protected readonly invalid = computed(() => this.ariaInvalid() || this.status.showError());
```

`showError` is `invalid && (touched || dirty)`. It does not know about a submitted form; `AndesFormField` still owns that rule.

### Signal forms

`AndesFormControlBase` also satisfies signal forms' custom-control contract (`value` model, `disabled` input, `touch` output). A subclass that **omits** `provideAndesValueAccessor` binds to `[formField]` natively but cannot be used with reactive or template-driven forms; one that **provides** it works with all three, signal forms going through the accessor (a provided accessor wins over the contract). Components that must keep working with `formControl` / `ngModel` should provide it.

### Which components should adopt this

Every item below re-implements `writeValue` / `registerOnChange` / `registerOnTouched` / `setDisabledState`, a `disabledByForm` / `cvaDisabled` / `formDisabled` signal and an `isDisabled` computed of `disabled() || thatSignal()`, and a `providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(...), multi: true }]` block. Migrating deletes all of it. File names are under `packages/ui/src/lib/`.

| Component (file)                                        | Value signal                     | `writeValue` does today / what stays component-specific                                                      |
| ------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `input/input-base.ts` (`andes-input`, password, search) | `value` (`''`)                   | `null -> ''`, `String(value)`; text commits from `onInput` / `onCompositionEnd`; touched in `onBlur`         |
| `input/input-otp.ts`                                    | `value` (`''`)                   | `null -> ''`, `String(value)`; touched when focus leaves the slots                                           |
| `textarea/textarea.ts`                                  | `value` (`''`)                   | same as input; `onChange('')` on clear                                                                       |
| `mentions/mentions.ts`                                  | `value` (`''`)                   | same, plus `context.set(null)` (use `onWrite`)                                                               |
| `input-number/input-number.ts`                          | `value` (`number\|null`)         | `coerce(value)`, resets `editing`, `syncText()` (use `coerce` + `onWrite`)                                   |
| `rate/rate.ts`                                          | `value` (`0`)                    | `normalizeValue(value, total())` (use `coerce`); `onChangeFn` / `onTouchedFn` naming                         |
| `slider/slider.ts`                                      | `value` + `values` linked signal | number or array, normalized to the range; `setValues` skips equal arrays (use `equals`); touched at drag end |
| `segmented/segmented.ts`                                | `value` (`T\|null`)              | passthrough; commit + touched on pick                                                                        |
| `radio-group/radio-group.ts`                            | `value` (`T\|null`)              | passthrough; `(focusout)` -> touched                                                                         |
| `toggle/toggle-group.ts`                                | `value` (`T\|T[]\|null`)         | passthrough; single or multiple                                                                              |
| `checkbox/checkbox-group.ts`                            | `value` (`T[]`)                  | `value ?? []` (use `emptyValue` + `andesShallowArrayEquals`)                                                 |
| `select/select.ts`                                      | `value` (`unknown`)              | `value ?? ([] or null by mode)` (use `coerce`); commit, touched on select and on close                       |
| `tree-select/tree-select.ts`                            | `value`                          | `value ?? ([] or null by mode)`; touched on close                                                            |
| `cascader/cascader.ts`                                  | `value`                          | passthrough; touched on close                                                                                |
| `combobox/combobox.ts`                                  | `value` (`T\|null`)              | `value ?? null`, also resets the query text and backfill (use `onWrite`)                                     |
| `color-picker/color-picker.ts`                          | `value` (`color\|null`)          | `value ?? null`; touched on close                                                                            |
| `date-picker/date-picker.ts`                            | single or range value            | `applyValue`, clears both drafts (use `onWrite`); touched on close/blur                                      |
| `transfer/transfer.ts`                                  | `targetKeys` (`string[]`)        | `Array.isArray(v) ? [...v] : []` (use `coerce`); array `equals`                                              |
| `upload/upload-base.ts` (`upload`, dragger)             | `fileList` (`File[]`)            | `Array.isArray(v) ? v : []`; commits from many paths (add, remove, status change)                            |
| `checkbox/checkbox.ts`                                  | `checked` (`boolean`)            | `!!value`; also group participation and `indeterminate` stay in the component                                |
| `switch/switch.ts`                                      | `checked` (`boolean`)            | `!!value`; `loading` still gates the toggle                                                                  |
| `toggle/toggle.ts`                                      | `pressed` (`boolean`)            | `!!value`                                                                                                    |

The ones whose signal is not called `value` (`checkbox`, `switch`, `toggle`, `transfer`, `upload-base`) use `AndesValueAccessor` with the provider's second argument; the rest can extend `AndesFormControlBase`, except those that already extend a class (`input-base`, `upload-base`), which also use `AndesValueAccessor`.

Not covered by the primitive and left to the components: the form-field wrapper's `id` / `aria-describedby` forwarding (`form-field/form-control.ts`), which reads `NgControl` through the `andesFormControl` directive and can later read the same signals, and the page-level "submitted" rule.

### Decisions worth knowing

- `model()` cannot be written without emitting its `valueChange` output, so a form write also fires `valueChange` (it keeps a `[(value)]` binding next to a form control in sync). `commit()` and `onChange` are what tell a form about _user_ changes; use the component's own event output for user-only notifications.
- `commit()` does not check `disabled`. Whether an interaction may happen at all is the component's call, since only it knows which interactions count.
- Status updates need one change detection pass to attach. Reads before the first pass see the unbound defaults.
