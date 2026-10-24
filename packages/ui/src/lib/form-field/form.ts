import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  input,
  output,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  FormArray,
  FormGroup,
  FormGroupDirective,
  NgForm,
} from '@angular/forms';
import { filter, first, map, of } from 'rxjs';

import {
  ANDES_FORM,
  type AndesFormApi,
  type AndesFormColumn,
  type AndesFormErrorMessages,
  type AndesFormFeedbackIconContext,
  type AndesFormFieldError,
  type AndesFormInvalidSubmit,
  type AndesFormLabelAlign,
  type AndesFormLayout,
  type AndesFormRequiredMark,
  type AndesFormScrollOptions,
  type AndesFormShowErrorsOn,
  type AndesFormSize,
  type AndesFormVariant,
} from './form-field-tokens';

/** Elements `scrollToFirstError` may move focus to, in the invalid field's control slot. */
const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const DEFAULT_SCROLL: AndesFormScrollOptions = {
  block: 'center',
  behavior: 'smooth',
  focus: true,
};

/** `true`/`''`/`'true'` -> defaults, an options object -> itself, anything falsy -> `false`. */
function scrollOption(value: unknown): boolean | AndesFormScrollOptions {
  return value !== null && typeof value === 'object'
    ? (value as AndesFormScrollOptions)
    : booleanAttribute(value);
}

/**
 * Every enabled control under `control` (itself included) that currently has errors, with its
 * path from `control` - the list `invalidSubmit` reports. Disabled controls are skipped, as
 * Angular leaves them out of the form's validity too.
 */
export function collectAndesFormErrors(
  control: AbstractControl,
  path: readonly (string | number)[] = [],
): AndesFormFieldError[] {
  if (control.disabled) {
    return [];
  }
  const own: AndesFormFieldError[] = control.errors
    ? [{ path, errors: control.errors }]
    : [];
  if (control instanceof FormArray) {
    return own.concat(
      control.controls.flatMap((child, index) =>
        collectAndesFormErrors(child, [...path, index]),
      ),
    );
  }
  if (control instanceof FormGroup) {
    return own.concat(
      Object.entries(control.controls).flatMap(([key, child]) =>
        collectAndesFormErrors(child, [...path, key]),
      ),
    );
  }
  return own;
}

/**
 * Form-wide layout and presentation defaults for every `AndesFormField` inside it (`layout`,
 * `labelCol`, `wrapperCol`, `labelAlign`, `labelWrap`, `colon`, `requiredMark`, `size`,
 * `variant`, `showErrorsOn`, `feedbackIcons`, `errorMessages`, `scrollToFirstError`), plus a
 * few thin conveniences over the Angular form on the same element: `disabled`,
 * `validSubmit` / `invalidSubmit` and `scrollToField()`.
 *
 * It is an attribute directive, not a component, so it composes with - rather than replaces -
 * Angular's own form directives on the same element:
 *
 * ```html
 * <form andesForm layout="horizontal" [labelCol]="6" [formGroup]="form" (ngSubmit)="save()">
 * ```
 *
 * Form *state* (values, validation, reset, submit) stays with `FormGroupDirective` /
 * `NgForm`; nothing here duplicates a form store - `disabled` and the submit outputs simply
 * drive / read that same form. The defaults reach the fields through DI
 * (`ANDES_FORM`), and every field-level input of the same name overrides them.
 *
 * Its host classes (`andes-form`, `andes-form--<layout>`) are styled from `form-field.css`,
 * which every field part injects - so the directive itself needs no stylesheet of its own.
 */
@Directive({
  selector: '[andesForm]',
  exportAs: 'andesForm',
  providers: [
    { provide: ANDES_FORM, useExisting: forwardRef(() => AndesForm) },
  ],
  host: {
    class: 'andes-form',
    '[class.andes-form--horizontal]': 'layout() === "horizontal"',
    '[class.andes-form--vertical]': 'layout() === "vertical"',
    '[class.andes-form--inline]': 'layout() === "inline"',
    '[attr.data-size]': 'size() ?? null',
    '[attr.data-variant]': 'variant() ?? null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(submit)': 'onSubmit()',
  },
})
export class AndesForm implements AndesFormApi {
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  /** The Angular form on the same element, if any - `[formGroup]` or the implicit `NgForm`. */
  private readonly formDirective =
    inject(FormGroupDirective, { self: true, optional: true }) ??
    inject(NgForm, { self: true, optional: true });
  /** Whether `disabled` is what disabled the form, so only then does it re-enable it. */
  private disabledByInput = false;

  /** Defaults to `vertical` - the stacked layout every `AndesFormField` already had before
   *  this directive existed - so wrapping an existing form in `andesForm` never changes how
   *  it looks. */
  readonly layout = input<AndesFormLayout>('vertical');
  /** Label text alignment inside its column; only visible in `horizontal` layout. */
  readonly labelAlign = input<AndesFormLabelAlign>('right');
  /** Label column width in `horizontal` layout. Defaults to one third (`8` of 24). */
  readonly labelCol = input<AndesFormColumn | undefined>(undefined);
  /** Control column width in `horizontal` layout. Defaults to the remaining space. */
  readonly wrapperCol = input<AndesFormColumn | undefined>(undefined);
  /** Let long labels wrap instead of being truncated with an ellipsis (`horizontal`). */
  readonly labelWrap = input(false, { transform: booleanAttribute });
  /** Trailing colon after each label. Only ever drawn in `horizontal` layout. */
  readonly colon = input(true, { transform: booleanAttribute });
  readonly requiredMark = input<AndesFormRequiredMark>(true);
  /** Suffix used by `requiredMark="optional"` - override it to localize. */
  readonly optionalText = input('(optional)');
  /**
   * Size hint for the controls inside. Fields do not resize anything themselves; controls
   * read it through {@link injectAndesFormSize}. Also reflected
   * as `data-size` on the host for plain-CSS consumers.
   */
  readonly size = input<AndesFormSize | undefined>(undefined);
  /**
   * Visual variant hint for the controls inside, read through {@link injectAndesFormVariant}
   * the same way `size` is. Also reflected as `data-variant` on the host.
   */
  readonly variant = input<AndesFormVariant | undefined>(undefined);
  /**
   * Disable every control of the Angular form on this element (`FormGroup.disable()`), and
   * re-enable them (`enable()`) when it goes back to `false`. Controls added later are
   * disabled as soon as the form emits its next event. Re-enabling enables the whole group,
   * including controls that were disabled on their own before - keep those disabled through
   * the form model instead. Also reflected as `data-disabled` and readable by non-form
   * controls (buttons, uploaders) through {@link injectAndesFormDisabled}.
   */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** When fields start showing their status; see {@link AndesFormShowErrorsOn}. Each field's
   *  own `showErrorsOn` wins. */
  readonly showErrorsOn = input<AndesFormShowErrorsOn>('interacted');
  /** Custom `hasFeedback` icons for every field - a template rendered with the status as
   *  `$implicit`. */
  readonly feedbackIcons = input<
    TemplateRef<AndesFormFeedbackIconContext> | undefined
  >(undefined);
  /** Error messages for every field in this form. */
  readonly errorMessages = input<AndesFormErrorMessages | undefined>(undefined);
  /**
   * On a submit that leaves the form invalid, scroll to and focus the first field in an error
   * state. Waits for pending async validators and one render, so that anything the submit
   * handler itself did (typically `markAllAsTouched()`) is already reflected in the fields.
   * `true` scrolls the field to the middle of the viewport, smoothly; an
   * {@link AndesFormScrollOptions} object tunes that, and `focus: false` scrolls only.
   */
  readonly scrollToFirstError = input<
    boolean | AndesFormScrollOptions,
    unknown
  >(false, { transform: scrollOption });

  /**
   * Emits the form's `value` on a submit that leaves it valid - after any pending async
   * validators settle. Needs a `[formGroup]` or template-driven form on the same element.
   */
  // The value's shape is the consumer's own form model.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly validSubmit = output<any>();

  /** Emits the value and every failing control on a submit that leaves the form invalid -
   *  after any pending async validators settle. */
  readonly invalidSubmit = output<AndesFormInvalidSubmit>();

  constructor() {
    const destroyRef = inject(DestroyRef);
    const formDirective = this.formDirective;
    if (!formDirective) {
      return;
    }
    formDirective.ngSubmit
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => this.afterSubmit(formDirective.form));

    effect(() => this.syncDisabled(this.disabled()));
    // `[formGroup]` may not be bound yet when the effect first runs, so sync once more after
    // the first render - and again a microtask later, once a template-driven form has
    // registered its controls (it does so asynchronously). From then on, re-apply on every
    // form event: a group gaining an enabled control flips back to enabled.
    afterNextRender(
      () => {
        this.syncDisabled(this.disabled());
        queueMicrotask(() => this.syncDisabled(this.disabled()));
        formDirective.form.events
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe(() => this.syncDisabled(this.disabled()));
      },
      { injector: this.injector },
    );
  }

  private syncDisabled(disabled: boolean): void {
    const form = this.formDirective?.form;
    if (!form) {
      return;
    }
    if (disabled) {
      if (!form.disabled) {
        this.disabledByInput = true;
        form.disable();
      }
    } else if (this.disabledByInput) {
      this.disabledByInput = false;
      form.enable();
    }
  }

  private afterSubmit(form: FormGroup): void {
    const settled = form.pending
      ? form.statusChanges.pipe(
          filter((status) => status !== 'PENDING'),
          first(),
          map(() => form),
        )
      : of(form);
    settled.subscribe(() => {
      if (form.valid || form.disabled) {
        this.validSubmit.emit(form.value);
        return;
      }
      this.invalidSubmit.emit({
        value: form.value,
        errors: collectAndesFormErrors(form),
      });
      this.scheduleScroll();
    });
  }

  protected onSubmit(): void {
    // With an Angular form on the element, scrolling waits for its verdict (`afterSubmit`).
    if (!this.formDirective) {
      this.scheduleScroll();
    }
  }

  private scheduleScroll(): void {
    const option = this.scrollToFirstError();
    if (!option) {
      return;
    }
    afterNextRender(
      () => this.focusFirstError(option === true ? undefined : option),
      { injector: this.injector },
    );
  }

  /** Scrolls to and focuses the first field currently showing an error. Returns whether one
   *  was found. Public so it can also be called after a programmatic (non-submit) check. */
  focusFirstError(options?: AndesFormScrollOptions): boolean {
    return this.reveal(
      this.element.querySelector<HTMLElement>('.andes-form-field--invalid'),
      options,
    );
  }

  /**
   * Scrolls to (and by default focuses) the field whose control sits at `path` - the same
   * segments `FormGroup.get()` takes, as an array or a dot-separated string
   * (`'address.city'`, `['lines', 2, 'qty']`). Returns whether such a field was found.
   */
  scrollToField(
    path: string | readonly (string | number)[],
    options?: AndesFormScrollOptions,
  ): boolean {
    const key = typeof path === 'string' ? path : path.join('.');
    const field = Array.from(
      this.element.querySelectorAll<HTMLElement>(
        '.andes-form-field[data-path]',
      ),
    ).find((candidate) => candidate.dataset['path'] === key);
    return this.reveal(field ?? null, options);
  }

  private reveal(
    field: HTMLElement | null,
    options: AndesFormScrollOptions | undefined,
  ): boolean {
    if (!field) {
      return false;
    }
    const { focus, ...scroll } = { ...DEFAULT_SCROLL, ...options };
    field.scrollIntoView?.(scroll);
    if (focus) {
      field
        .querySelector('.andes-form-field__control')
        ?.querySelector<HTMLElement>(FOCUSABLE)
        ?.focus({ preventScroll: true });
    }
    return true;
  }
}

/**
 * The size of the nearest enclosing `AndesForm`, or `undefined` outside one - the hook a
 * control calls (in an injection context) to default its own `size` from the form's, so one
 * `size` on the form cascades to every control inside it:
 *
 * ```ts
 * private readonly formSize = injectAndesFormSize();
 * protected readonly effectiveSize = computed(() => this.size() ?? this.formSize() ?? 'md');
 * ```
 */
export function injectAndesFormSize(): Signal<AndesFormSize | undefined> {
  const form = inject(ANDES_FORM, { optional: true });
  return computed(() => form?.size());
}

/** The `variant` of the nearest enclosing `AndesForm`, or `undefined` - the variant
 *  counterpart of {@link injectAndesFormSize}. */
export function injectAndesFormVariant(): Signal<AndesFormVariant | undefined> {
  const form = inject(ANDES_FORM, { optional: true });
  return computed(() => form?.variant());
}

/**
 * Whether the nearest enclosing `AndesForm` is `disabled` (`false` outside one). Controls bound
 * to the form are already disabled through the form model; this is for the ones that are not -
 * an action button, an uploader - to follow the form anyway.
 */
export function injectAndesFormDisabled(): Signal<boolean> {
  const form = inject(ANDES_FORM, { optional: true });
  return computed(() => form?.disabled() ?? false);
}
