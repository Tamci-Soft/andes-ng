import { Injectable, signal } from '@angular/core';

/**
 * DI-scoped shared state for one `AndesRadioGroup` instance and its `AndesRadio` children.
 *
 * `AndesRadioGroup` provides a fresh instance of this service in its own `providers: [...]`
 * array (see radio-group.ts); every `AndesRadio` projected into it injects that same instance
 * via the normal element-injector hierarchy. This is Angular's equivalent of React Context -
 * no `@ContentChildren` query or manual parent/child registration is needed, and each group on
 * the page gets its own isolated instance automatically.
 */
let nextGroupId = 0;

function noop(): void {
  /* no-op default until registerOnChange/registerOnTouched is called by Angular forms */
}

@Injectable()
export class AndesRadioGroupState {
  private readonly _name = signal(`andes-radio-group-${++nextGroupId}`);
  private readonly _value = signal<string | null>(null);
  private readonly _disabled = signal(false);
  private readonly _required = signal(false);

  /** Shared `name` attribute every native radio input in the group renders - this is what
   *  gives the group free browser-native roving-tabindex/arrow-key navigation. */
  readonly name = this._name.asReadonly();
  readonly value = this._value.asReadonly();
  readonly disabled = this._disabled.asReadonly();
  readonly required = this._required.asReadonly();

  private onChange: (value: string | null) => void = noop;
  private onTouched: () => void = noop;

  setName(name: string | undefined): void {
    if (name) {
      this._name.set(name);
    }
  }

  setDisabled(disabled: boolean): void {
    this._disabled.set(disabled);
  }

  setRequired(required: boolean): void {
    this._required.set(required);
  }

  /** Called by `AndesRadioGroup.writeValue()` - programmatic writes never notify the CVA
   *  `onChange` callback back, matching standard `ControlValueAccessor` semantics. */
  setValue(value: string | null): void {
    this._value.set(value);
  }

  /** Called by an `AndesRadio` item when the user selects it - a real user interaction, so it
   *  notifies both `onChange` and `onTouched`. */
  selectFromItem(value: string): void {
    this._value.set(value);
    this.onChange(value);
    this.onTouched();
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
