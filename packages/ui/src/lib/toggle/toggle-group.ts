import { Directionality } from '@angular/cdk/bidi';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { AndesToggle } from './toggle';
import {
  ANDES_TOGGLE_GROUP,
  AndesToggleGroupApi,
  AndesToggleGroupOrientation,
  AndesToggleGroupType,
  AndesToggleSize,
  AndesToggleVariant,
} from './toggle-types';

function noop(): void {
  /* replaced by registerOnChange/registerOnTouched */
}

/**
 * A row (or column) of `<andes-toggle>`s sharing one value.
 *
 * - `type="single"`: at most one toggle is pressed; `value` is that toggle's value (or `null`).
 *   `allowEmpty="false"` stops pressing the active toggle from clearing it.
 * - `type="multiple"`: any number can be pressed; `value` is an array.
 *
 * The group is one tab stop (roving tabindex): Tab lands on the first pressed toggle, the
 * arrow keys along `orientation` (mirrored in right-to-left layouts) move focus, Home/End
 * jump to the ends, and Space or Enter presses. Toggles are joined into one bar by default; a
 * `spacing` above 0 separates them by that many pixels instead.
 */
@Component({
  selector: 'andes-toggle-group',
  template: `<ng-content />`,
  styleUrl: './toggle-group.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesToggleGroup),
      multi: true,
    },
    {
      provide: ANDES_TOGGLE_GROUP,
      useExisting: forwardRef(() => AndesToggleGroup),
    },
  ],
  host: {
    role: 'group',
    'data-slot': 'toggle-group',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-labelledby]': 'ariaLabelledby()',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '[attr.data-type]': 'type()',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-joined]': "spacing() === 0 ? '' : null",
    '[attr.data-disabled]': "isDisabled() ? '' : null",
    '[style.gap.px]': 'spacing()',
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class AndesToggleGroup<T = unknown>
  implements ControlValueAccessor, AndesToggleGroupApi
{
  private readonly directionality = inject(Directionality);

  /** `single` (default) or `multiple`. */
  readonly type = input<AndesToggleGroupType>('single');
  /** Pressed value(s): a single value or `null` for `type="single"`, an array for `multiple`.
   *  Two-way bindable and driven by Angular forms. */
  readonly value = model<T | readonly T[] | null>(null);
  readonly variant = input<AndesToggleVariant>('default');
  readonly size = input<AndesToggleSize>('md');
  readonly orientation = input<AndesToggleGroupOrientation>('horizontal');
  /** Pixels between toggles. `0` (default) joins them into a single bar. */
  readonly spacing = input(0);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** For `type="single"`: whether pressing the pressed toggle clears the value. */
  readonly allowEmpty = input(true, { transform: booleanAttribute });
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });

  private readonly cvaDisabled = signal(false);
  private onChange: (value: T | readonly T[] | null) => void = noop;
  private onTouched: () => void = noop;

  private readonly toggles = contentChildren(AndesToggle, {
    descendants: true,
  });

  readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());

  private readonly selected = computed<readonly T[]>(() => {
    const value = this.value();
    if (value === null || value === undefined) {
      return [];
    }
    return Array.isArray(value) ? (value as readonly T[]) : [value as T];
  });

  readonly isPressed = (value: unknown): boolean =>
    value !== undefined &&
    this.selected().some((item) => Object.is(item, value));

  readonly tabbable = computed<unknown>(() => {
    const enabled = this.toggles().filter((toggle) => !toggle.isDisabled());
    return enabled.find((toggle) => toggle.isPressed()) ?? enabled[0] ?? null;
  });

  toggle(value: unknown): void {
    if (this.isDisabled() || value === undefined) {
      return;
    }
    const item = value as T;
    const pressed = this.isPressed(item);
    let next: T | readonly T[] | null;
    if (this.type() === 'multiple') {
      next = pressed
        ? this.selected().filter((entry) => !Object.is(entry, item))
        : [...this.selected(), item];
    } else if (pressed) {
      if (!this.allowEmpty()) {
        return;
      }
      next = null;
    } else {
      next = item;
    }
    this.value.set(next);
    this.onChange(next);
  }

  writeValue(value: T | readonly T[] | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: T | readonly T[] | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    const host = event.currentTarget as HTMLElement;
    if (!next || !host.contains(next)) {
      this.onTouched();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const enabled = this.toggles().filter((toggle) => !toggle.isDisabled());
    const current = enabled.findIndex(
      (toggle) => toggle.button === event.target,
    );
    if (current === -1) {
      return;
    }
    const vertical = this.orientation() === 'vertical';
    const rtl = !vertical && this.directionality.value === 'rtl';
    const forward = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    let target: number;
    switch (event.key) {
      case forward:
        target = (current + 1) % enabled.length;
        break;
      case backward:
        target = (current - 1 + enabled.length) % enabled.length;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = enabled.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    enabled[target].focus();
  }
}
