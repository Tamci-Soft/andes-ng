import {
  afterNextRender,
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  input,
  type Signal,
} from '@angular/core';

import {
  ANDES_FORM,
  type AndesFormApi,
  type AndesFormColumn,
  type AndesFormErrorMessages,
  type AndesFormLabelAlign,
  type AndesFormLayout,
  type AndesFormRequiredMark,
  type AndesFormSize,
} from './form-field-tokens';

/** Elements `scrollToFirstError` may move focus to, in the invalid field's control slot. */
const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Form-wide layout and presentation defaults for every `AndesFormField` inside it - the
 * andes-ng counterpart of Ant Design's `<Form>` *presentation* props (`layout`, `labelCol`,
 * `wrapperCol`, `labelAlign`, `labelWrap`, `colon`, `requiredMark`, `size`,
 * `validateMessages`, `scrollToFirstError`).
 *
 * It is an attribute directive, not a component, so it composes with - rather than replaces -
 * Angular's own form directives on the same element:
 *
 * ```html
 * <form andesForm layout="horizontal" [labelCol]="6" [formGroup]="form" (ngSubmit)="save()">
 * ```
 *
 * Form *state* (values, validation, disabled, reset, submit) stays with `FormGroupDirective` /
 * `NgForm`; nothing here duplicates Ant's form store. The defaults reach the fields through DI
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
    '(submit)': 'onSubmit()',
  },
})
export class AndesForm implements AndesFormApi {
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  /** Defaults to `vertical` - the stacked layout every `AndesFormField` already had before
   *  this directive existed - rather than Ant's `horizontal`, so wrapping an existing form
   *  in `andesForm` never changes how it looks. */
  readonly layout = input<AndesFormLayout>('vertical');
  /** Label text alignment inside its column; only visible in `horizontal` layout. */
  readonly labelAlign = input<AndesFormLabelAlign>('right');
  /** Label column width in `horizontal` layout. Defaults to one third (`8` of 24). */
  readonly labelCol = input<AndesFormColumn | undefined>(undefined);
  /** Control column width in `horizontal` layout. Defaults to the remaining space. */
  readonly wrapperCol = input<AndesFormColumn | undefined>(undefined);
  /** Let long labels wrap instead of being truncated with an ellipsis (`horizontal`). */
  readonly labelWrap = input(false, { transform: booleanAttribute });
  /** Trailing colon after each label. As in Ant, only ever drawn in `horizontal` layout. */
  readonly colon = input(true, { transform: booleanAttribute });
  readonly requiredMark = input<AndesFormRequiredMark>(true);
  /** Suffix used by `requiredMark="optional"` - override it to localize. */
  readonly optionalText = input('(optional)');
  /**
   * Size hint for the controls inside. Fields do not resize anything themselves; controls
   * read it through {@link injectAndesFormSize} (Ant's `<Form size>` cascade). Also reflected
   * as `data-size` on the host for plain-CSS consumers.
   */
  readonly size = input<AndesFormSize | undefined>(undefined);
  /** Error messages for every field in this form (Ant's `validateMessages`). */
  readonly errorMessages = input<AndesFormErrorMessages | undefined>(undefined);
  /**
   * On submit, scroll to and focus the first field in an error state. Waits one render so
   * that anything the submit handler itself did (typically `markAllAsTouched()`) is already
   * reflected in the fields.
   */
  readonly scrollToFirstError = input(false, { transform: booleanAttribute });

  protected onSubmit(): void {
    if (!this.scrollToFirstError()) {
      return;
    }
    afterNextRender(() => this.focusFirstError(), { injector: this.injector });
  }

  /** Scrolls to and focuses the first field currently showing an error. Returns whether one
   *  was found. Public so it can also be called after a programmatic (non-submit) check. */
  focusFirstError(): boolean {
    const field = this.element.querySelector<HTMLElement>(
      '.andes-form-field--invalid',
    );
    if (!field) {
      return false;
    }
    field.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    const target = field
      .querySelector('.andes-form-field__control')
      ?.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus({ preventScroll: true });
    return true;
  }
}

/**
 * The size of the nearest enclosing `AndesForm`, or `undefined` outside one - the hook a
 * control calls (in an injection context) to default its own `size` from the form's, the way
 * Ant's controls pick up `<Form size>`:
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
