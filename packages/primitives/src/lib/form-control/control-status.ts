import {
  computed,
  effect,
  inject,
  Injector,
  Signal,
  signal,
  untracked,
} from '@angular/core';
import { NgControl, ValidationErrors } from '@angular/forms';
import { Observable } from 'rxjs';

/**
 * The validation state of the Angular forms control bound to a component's host element,
 * exposed as signals so a template or `computed()` can react to it without subscribing to
 * anything.
 *
 * Every signal reads `false` / `null` while nothing is bound, so a component used outside a
 * form behaves exactly as if the control were valid and untouched.
 */
export interface AndesControlStatus {
  /** Whether a forms directive is bound to the host and has produced its control. */
  readonly bound: Signal<boolean>;
  /** The bound control failed validation. */
  readonly invalid: Signal<boolean>;
  /** The bound control passed validation (and has no async validator still running). */
  readonly valid: Signal<boolean>;
  /** The user has left the bound control at least once. */
  readonly touched: Signal<boolean>;
  /** The value of the bound control was changed from the UI. */
  readonly dirty: Signal<boolean>;
  /** An async validator is still running. */
  readonly pending: Signal<boolean>;
  /** The bound control is disabled on the forms side. */
  readonly disabled: Signal<boolean>;
  /** The bound control's current errors, or `null` when it has none. */
  readonly errors: Signal<ValidationErrors | null>;
  /**
   * `invalid` once the user has interacted (`touched` or `dirty`). This is the usual "do not
   * shout at someone who has not typed yet" rule, so a component can paint its error state
   * from it directly instead of the page wiring `aria-invalid` by hand.
   */
  readonly showError: Signal<boolean>;
}

/** What `injectAndesControlStatus` accepts. */
export interface AndesControlStatusOptions {
  /**
   * A signal that changes whenever the forms directive (re)registers this component as its
   * value accessor. Re-binding a `[formControl]` to a different control registers the accessor
   * again, and that is the only moment the status has a reason to re-subscribe, because
   * Angular offers no event for "this directive now points at another control".
   * `AndesValueAccessor` already supplies it.
   */
  readonly rebindOn?: Signal<unknown>;
}

/**
 * The `events` stream reactive forms put on every `AbstractControl`. Signal forms hand out a
 * stand-in control with no such stream, because its getters are already signals.
 */
interface ControlWithEvents {
  readonly events?: Observable<unknown>;
}

/**
 * Reads the status of the Angular forms control sitting on the same element as the calling
 * component or directive. Works unchanged with `formControl`, `formControlName`, `ngModel`
 * and signal forms' `[formField]`.
 *
 * Must run in an injection context (a field initializer or constructor).
 *
 * The `NgControl` is looked up lazily, from an effect, and never from the constructor. A
 * component that provides `NG_VALUE_ACCESSOR` cannot `inject(NgControl)` while it is being
 * constructed: the forms directive injects the accessor to build itself, so the two wait on
 * each other and Angular reports a circular dependency. By the time the first change
 * detection pass runs, both exist and the lookup is plain. The cost is that status reads
 * before that pass see the "unbound" defaults.
 *
 * ```ts
 * @Component({ ... })
 * class AndesTextbox {
 *   private readonly status = injectAndesControlStatus();
 *   protected readonly invalid = computed(() => this.status.showError());
 * }
 * ```
 */
export function injectAndesControlStatus(
  options: AndesControlStatusOptions = {},
): AndesControlStatus {
  const injector = inject(Injector);
  const ngControl = signal<NgControl | null>(null);
  // Bumped on every control event so that the plain-property reads below are re-evaluated.
  const tick = signal(0);

  effect((onCleanup) => {
    options.rebindOn?.();
    untracked(() => {
      const found = injector.get(NgControl, null, {
        self: true,
        optional: true,
      });
      ngControl.set(found);
      const events = (found?.control as ControlWithEvents | null | undefined)
        ?.events;
      if (events) {
        const subscription = events.subscribe(() =>
          tick.update((count) => count + 1),
        );
        onCleanup(() => subscription.unsubscribe());
      }
      // The control may have been created between the last event and now.
      tick.update((count) => count + 1);
    });
  });

  /**
   * Reads one property off the bound `NgControl`. `tick` covers reactive forms (plain
   * properties), while the getters of signal forms' stand-in control read signals themselves
   * and so are tracked by the surrounding `computed`.
   */
  const read = <V>(pick: (control: NgControl) => V, fallback: V): Signal<V> =>
    computed(() => {
      tick();
      const control = ngControl();
      return control?.control ? pick(control) : fallback;
    });

  const invalid = read((control) => control.invalid === true, false);
  const touched = read((control) => control.touched === true, false);
  const dirty = read((control) => control.dirty === true, false);
  const pending = read((control) => control.pending === true, false);

  return {
    bound: read(() => true, false),
    invalid,
    valid: read((control) => control.valid === true, false),
    touched,
    dirty,
    pending,
    disabled: read((control) => control.disabled === true, false),
    errors: read((control) => control.errors ?? null, null),
    showError: computed(() => invalid() && (touched() || dirty())),
  };
}
