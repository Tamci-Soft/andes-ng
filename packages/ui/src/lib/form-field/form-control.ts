import {
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  forwardRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormGroupDirective,
  NgControl,
  NgForm,
  type ValidationErrors,
  Validators,
} from '@angular/forms';

import {
  ANDES_FORM_CONTROL,
  ANDES_FORM_FIELD,
  type AndesFormControlApi,
} from './form-field-tokens';

/**
 * The HTML elements that are both *labelable* (a `<label for>` can point at them) and able to
 * carry `aria-describedby`/`aria-invalid`/`aria-required` meaningfully on the very element this
 * directive sits on. `<select>` is included even though `AndesFormControl` is most often used
 * with `<input>`: all three are real form controls in the accessibility tree.
 *
 * Deliberately NOT a check for "has a value property" or "is a form-associated custom element":
 * a custom element is only labelable if it was registered with `formAssociated = true` through
 * the ElementInternals API, which no Angular component in this library is (Angular components
 * are plain, non-upgraded elements as far as the platform is concerned). See the class comment
 * on `AndesFormControl` for what that means in practice.
 */
const LABELABLE_NATIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Applied on the actual form control element - a native `<input>`/`<select>`/`<textarea>`,
 * or one of this library's own `ControlValueAccessor` components (e.g. `AndesInput`) -
 * alongside `formControlName`, `[formControl]` or `[(ngModel)]` on that same element.
 *
 * Reads the bound control's status through Angular's own `NgControl` (whichever host
 * directive registered it - `FormControlName`, `FormControlDirective` or `NgModel`), so it
 * works identically regardless of which of the three the consumer used. Exposes the
 * idiomatic "show error only after interaction" predicate (`invalid && (touched || dirty)`)
 * as `showError`, and - when nested inside an `AndesFormField` - automatically reflects
 * `id`/`aria-describedby`/`aria-invalid`/`aria-required` onto the element it's applied to.
 *
 * ## Native elements vs. wrapper components
 *
 * That automatic attribute wiring is exact and complete for a native `<input>`/`<textarea>`/
 * `<select>`, because the directive's host bindings write onto the very DOM node that IS the
 * form control: `<label for>` resolves to it, and every `aria-*` attribute lands on the
 * element assistive technology actually reports.
 *
 * It is NOT complete for this library's own wrapper components (`AndesCheckbox`, `AndesSwitch`,
 * `AndesSelect`, `AndesRadioGroup`, `AndesSlider`, `AndesInput`, ...). Each of those renders its
 * real native control inside its own template, so the element this directive sits on is the
 * outer custom element - `<andes-checkbox>` - which:
 *
 * 1. is not a labelable element (see `LABELABLE_NATIVE_TAGS` above), so writing the field's
 *    generated id onto it would make `<label for="...">` resolve to a node the platform refuses
 *    to associate with anything. `element.labels` on the buried native control stays empty and
 *    clicking the label does nothing. The id is therefore deliberately NOT written to a
 *    non-native host: a dangling `for` is at least detectable by axe/linting, whereas an id on a
 *    non-labelable element silently *looks* associated while doing nothing; and
 * 2. cannot receive `aria-*` from here either. Those wrappers forward ARIA inward through their
 *    own `@Input()`s (`input(..., { alias: 'aria-describedby' })`) and explicitly null the
 *    matching host attributes so the outer element stays out of the a11y tree. A *host binding*
 *    from a co-located directive only calls `setAttribute` on that element - Angular has no
 *    mechanism for one directive's host bindings to feed another directive/component's inputs;
 *    only bindings authored in a template can do that.
 *
 * Both points were verified empirically against the real `AndesCheckbox` (read from
 * `origin/feature/checkbox-component`) while fixing this. With only `andesFormControl` applied
 * and this directive writing to the host unconditionally, `<andes-checkbox>` ended up with
 * `id`, `aria-describedby` and `aria-invalid="true"`, while the real `<input type="checkbox">`
 * inside it had all three still `null`, and `<label for>` resolved to the `ANDES-CHECKBOX`
 * element - i.e. NONE of it reached the control. Worse, the host write silently overrode the
 * `'[attr.aria-describedby]': 'null'` that `AndesCheckbox` declares precisely to keep its outer
 * element out of the accessibility tree, re-creating the duplicate-node problem that metadata
 * exists to prevent. So ARIA forwarding does NOT come for free here - it is exactly as broken as
 * `id`/`for`, and the only correct move from inside this PR is to write nothing.
 *
 * So for the wrapper-component case this directive writes NO attributes at all (writing them
 * would be inert at best and misleading at worst) and instead exposes `resolvedId()`,
 * `labelledBy()`, `describedBy()`, `showError()` and `isRequired()`/`ariaRequired()` as public
 * signals, for the consumer to bind into the wrapper's own inputs from the template:
 *
 * ```html
 * <andes-form-field #field="andesFormField">
 *   <andes-form-label>Accept</andes-form-label>
 *   <andes-some-wrapper
 *     andesFormControl
 *     #ctrl="andesFormControl"
 *     [formControl]="accept"
 *     [id]="field.controlId()"
 *     [aria-describedby]="ctrl.describedBy()"
 *     [aria-invalid]="field.showError()"
 *     [aria-required]="ctrl.isRequired()"
 *   />
 *   <andes-form-error>Required.</andes-form-error>
 * </andes-form-field>
 * ```
 *
 * ## Which wrappers that pattern is currently complete for
 *
 * It only works to the extent the wrapper actually exposes the matching inputs, and that is not
 * uniform across the library. Re-checked against each component's own branch:
 *
 * - `AndesInput` exposes `id`, `name`, `aria-label`, `aria-labelledby`, `aria-describedby` and
 *   `aria-invalid` inputs, nulls all of them on its host, and forwards them onto the real
 *   `<input>` in its template. The snippet above therefore works end to end for it, including a
 *   genuinely clickable `<label for>` - nothing is missing. (It still needs the manual bindings:
 *   its host element is `<andes-input>`, not an `<input>`, so this directive's automatic host
 *   writes stay switched off, exactly as described above.) It has no `aria-required` input, but
 *   needs none: its `required` input puts the native `required` attribute on that inner
 *   `<input>`, which already implies `aria-required` to assistive technology.
 * - `AndesCheckbox`, `AndesSwitch`, `AndesSelect`, `AndesRadioGroup` and `AndesSlider` expose no
 *   `id` input at all, so `[id]="field.controlId()"` has nowhere to land and the label's `for`
 *   stays dangling - deliberately detectable, rather than silently pointing at an element the
 *   platform will not associate. Giving each of them an `id` input forwarded onto its internal
 *   control remains the proper fix, and has to happen on those components' own branches.
 *
 * ### Workaround for the five without an `id` input
 *
 * All five DO accept an `aria-labelledby` input and forward it onto their real internal control.
 * `AndesFormLabel` therefore stamps an id onto the `<label>` it renders, and the field exposes it
 * as `labelledBy()` (mirrored here as {@link labelledBy}), so the accessible name can be wired up
 * without touching those components at all:
 *
 * ```html
 * <andes-select
 *   andesFormControl
 *   #ctrl="andesFormControl"
 *   [formControl]="country"
 *   [aria-labelledby]="ctrl.labelledBy()"
 *   [aria-describedby]="ctrl.describedBy()"
 *   [aria-invalid]="ctrl.showError()"
 * />
 * ```
 *
 * That is a real improvement, not a full substitute: `aria-labelledby` gives the control its
 * accessible name, but only a native `for`/`id` pair makes the label CLICKABLE (and populates
 * `element.labels`). So the remaining, honestly-still-open gap for those five is label-click
 * focus, not announcement.
 */
@Directive({
  selector: '[andesFormControl]',
  exportAs: 'andesFormControl',
  providers: [
    {
      provide: ANDES_FORM_CONTROL,
      useExisting: forwardRef(() => AndesFormControl),
    },
  ],
  host: {
    '[attr.id]': 'hostId()',
    '[attr.aria-describedby]': 'hostDescribedBy()',
    '[attr.aria-invalid]': 'hostAriaInvalid()',
    '[attr.aria-required]': 'hostAriaRequired()',
    '[attr.aria-busy]': 'hostAriaBusy()',
  },
})
export class AndesFormControl implements OnInit, AndesFormControlApi {
  private readonly ngControl = inject(NgControl, {
    optional: true,
    self: true,
  });
  private readonly field = inject(ANDES_FORM_FIELD, { optional: true });
  /** The enclosing reactive (`[formGroup]`) or template-driven (`<form>`/`ngForm`) form, if
   *  any - only read for its `submitted` flag, so errors surface after a submit attempt even
   *  on fields the user never reached (Ant shows every error on a failed submit, too). */
  private readonly formDirective =
    inject(FormGroupDirective, { optional: true }) ??
    inject(NgForm, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly invalid = signal(false);
  protected readonly touched = signal(false);
  protected readonly dirty = signal(false);
  private readonly submitted = signal(false);
  private readonly pendingState = signal(false);
  private readonly errorsState = signal<ValidationErrors | null>(null);
  private readonly requiredState = signal(false);
  private readonly requiredAttribute = signal(false);

  /**
   * Whether this directive sits directly on a native, labelable form element rather than on a
   * wrapper component that renders its real control inside its own template. Read once from the
   * host element's tag name (an element never changes tag), and the single gate on whether the
   * host bindings below write anything - see the class comment for why.
   */
  readonly isNativeFormElement = LABELABLE_NATIVE_TAGS.has(
    this.element.tagName,
  );

  /** `touched || dirty`, or the enclosing `<form>` has been submitted - the point from which
   *  a status (error, success, validating) is worth showing at all. */
  readonly interacted = computed(
    () => this.touched() || this.dirty() || this.submitted(),
  );

  /** `control.invalid && (control.touched || control.dirty)` - Angular's idiomatic
   *  "don't yell at the user before they've interacted with the field" rule - widened to also
   *  fire once the enclosing form has been submitted, so a failed submit reveals every error
   *  even without `markAllAsTouched()`. Drives both this control's own `aria-invalid` and the
   *  enclosing field's error visibility. */
  readonly showError = computed(() => this.invalid() && this.interacted());

  /** An async validator is still running (`control.pending`). */
  readonly pending = this.pendingState.asReadonly();

  readonly valid = computed(
    () => !this.invalid() && !this.pending() && !!this.ngControl?.control,
  );

  /** The bound control's current `ValidationErrors`, as a signal. */
  readonly errors = this.errorsState.asReadonly();

  /**
   * Whether the label should carry a required mark: {@link isRequired}, or - for the
   * template-driven case `isRequired` deliberately ignores - a native `required` attribute on
   * the element. (`[required]="false"` removes that attribute, so it tracks the binding.)
   */
  readonly markedRequired = computed(
    () => this.isRequired() || this.requiredAttribute(),
  );

  readonly resolvedId = computed(() => this.field?.controlId() ?? null);

  readonly describedBy = computed(() => this.field?.describedBy() ?? null);

  /** The enclosing field's `<andes-form-label>` id, or `null` when there is no label - for
   *  binding into a wrapper component's own `aria-labelledby` input when it has no `id` input
   *  to complete the native `for`/`id` association with. See the class comment. */
  readonly labelledBy = computed(() => this.field?.labelledBy() ?? null);

  /**
   * Whether the bound control carries `Validators.required` (or `Validators.requiredTrue`).
   * Exposed for binding into a wrapper component's own `aria-required`-style input (see the
   * class comment); `ariaRequired()` below is the same fact shaped as an attribute value.
   *
   * Derived from `AbstractControl.hasValidator(...)` (Angular's own validator introspection API,
   * `@angular/forms` 22.x). That compares by function reference, which is
   * exactly right for the reactive case (`Validators.required` is a singleton function, so
   * `new FormControl('', Validators.required)`, the `{ validators: [...] }` options form and a
   * later `addValidators(Validators.required)` all match). It deliberately does not match the
   * template-driven `required` ATTRIBUTE, which Angular implements through its own
   * `RequiredValidator` directive rather than by installing `Validators.required` itself - and
   * that case needs nothing from us, because the native `required` attribute the author wrote is
   * already on the element and already implies `aria-required` to assistive technology. The gap
   * this closes is the reactive-only one, where a control is required in the model with nothing
   * in the DOM saying so.
   */
  readonly isRequired = this.requiredState.asReadonly();

  /** `'true'` when {@link isRequired} is set, `null` otherwise - shaped as the attribute value
   *  itself so it can be bound straight through `[attr.aria-required]`. */
  readonly ariaRequired = computed(() => (this.isRequired() ? 'true' : null));

  /**
   * Host-binding variants of the public signals above. They collapse to `null` (i.e. the
   * attribute is not written at all) on a non-native host, where these attributes would be
   * inert or actively misleading - see the class comment. The public signals keep returning
   * real values in that case, so the documented manual template-binding pattern still works.
   */
  protected readonly hostId = computed(() =>
    this.isNativeFormElement ? this.resolvedId() : null,
  );

  protected readonly hostDescribedBy = computed(() =>
    this.isNativeFormElement ? this.describedBy() : null,
  );

  protected readonly hostAriaInvalid = computed(() =>
    this.isNativeFormElement && (this.field?.showError() ?? this.showError())
      ? 'true'
      : null,
  );

  protected readonly hostAriaBusy = computed(() =>
    this.isNativeFormElement && this.pending() ? 'true' : null,
  );

  protected readonly hostAriaRequired = computed(() =>
    this.isNativeFormElement ? this.ariaRequired() : null,
  );

  constructor() {
    // Registered from the constructor, before the field's own view is first checked, so the
    // field never renders a frame without knowing its control.
    const unregister = this.field?.registerControl(this);
    if (unregister) {
      this.destroyRef.onDestroy(unregister);
    }
  }

  ngOnInit(): void {
    // NgControl.control is only populated once the host directive (FormControlName/
    // FormControlDirective/NgModel) has processed its own inputs, which for a directive
    // co-located on the same element happens after every constructor on that element has
    // already run - so this has to live in ngOnInit, not the constructor.
    const control = this.ngControl?.control;
    if (!control) {
      // No NgControl on this element (e.g. the directive was applied without
      // formControlName/[formControl]/ngModel) - there's no validity state to read, so the
      // control is simply never reported as invalid.
      return;
    }

    this.syncFromControl(control);
    control.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncFromControl(control));
    // `ngSubmit` fires after the directive has already flipped `submitted` to true. A later
    // `resetForm()` flips it back and resets the control, whose events re-sync it below.
    this.formDirective?.ngSubmit
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.submitted.set(true));
  }

  private syncFromControl(control: AbstractControl): void {
    this.invalid.set(control.invalid);
    this.touched.set(control.touched);
    this.dirty.set(control.dirty);
    this.pendingState.set(control.pending);
    this.errorsState.set(control.errors);
    this.submitted.set(this.formDirective?.submitted ?? false);
    this.requiredAttribute.set(
      this.isNativeFormElement && this.element.hasAttribute('required'),
    );
    // Re-read on every control event rather than once in ngOnInit: validators can be swapped at
    // runtime (`addValidators`/`setValidators` + `updateValueAndValidity()`), and that call is
    // itself what emits the status-change event this subscription is already listening to.
    this.requiredState.set(
      control.hasValidator(Validators.required) ||
        // `requiredTrue` is a separate function reference, so `hasValidator(Validators.required)`
        // alone misses it - and it is precisely the validator used for the "must be checked"
        // consent-checkbox case, which is exactly where `aria-required` matters most.
        control.hasValidator(Validators.requiredTrue),
    );
  }
}
