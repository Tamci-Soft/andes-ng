import {
  AndesOverlayClosePrimitive,
  AndesOverlayContentPrimitive,
  AndesOverlayTriggerPrimitive,
  provideAndesOverlay,
  type AndesOverlayConfig,
  type AndesOverlayPreset,
} from '@andes-ng/primitives';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  forwardRef,
  inject,
  TemplateRef,
  ViewEncapsulation,
} from '@angular/core';

import { AndesDialogActions } from './dialog-actions';
import {
  ANDES_DIALOG_BACKDROP_CLASS,
  AndesDialogRoot,
  AndesDialogRootBase,
  AndesDialogSurface,
  AndesDialogSurfaceBase,
  dialogSurfaceClasses,
  dialogWidthStyles,
  registerDialogLabel,
} from './dialog-base';

/**
 * Marks the `<ng-template>` holding an alert dialog's surface. The alert-dialog
 * counterpart of `[andesDialogContent]`, kept separate so a nested confirmation
 * inside a plain dialog cannot have its template captured by the outer root's
 * content query.
 */
@Directive({
  selector: '[andesAlertDialogContent]',
  exportAs: 'andesAlertDialogContent',
})
export class AndesAlertDialogContentTemplate {
  /** The template the root portals when it opens. */
  readonly templateRef = inject<TemplateRef<void>>(TemplateRef);
}

/**
 * Root of the Alert Dialog compound: a modal that interrupts the user and expects
 * an explicit answer, for destructive confirmations.
 *
 * Deliberately more restrictive than `AndesDialog`: it renders
 * `role="alertdialog"` and refuses outside-click dismissal, so the only ways out
 * are its own actions (or Escape). Both come from the shared overlay's
 * `alert-dialog` preset rather than from config assembled here, and outside-click
 * dismissal is not exposed as an input — re-enabling it would erase the semantic
 * distinction the component exists for.
 *
 * ```html
 * <andes-alert-dialog>
 *   <button type="button" andesAlertDialogTrigger>Delete project</button>
 *
 *   <andes-alert-dialog-content *andesAlertDialogContent>
 *     <div andesAlertDialogHeader>
 *       <h2 andesAlertDialogTitle>Delete this project?</h2>
 *       <p andesAlertDialogDescription>This cannot be undone.</p>
 *     </div>
 *
 *     <div andesAlertDialogFooter>
 *       <button type="button" andesAlertDialogCancel>Cancel</button>
 *       <button type="button" andesAlertDialogAction (click)="destroy()">Delete</button>
 *     </div>
 *   </andes-alert-dialog-content>
 * </andes-alert-dialog>
 * ```
 */
@Component({
  selector: 'andes-alert-dialog',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideAndesOverlay(),
    {
      provide: AndesDialogRoot,
      useExisting: forwardRef(() => AndesAlertDialog),
    },
  ],
  host: {
    '[attr.data-slot]': '"alert-dialog"',
  },
})
export class AndesAlertDialog extends AndesDialogRootBase {
  private readonly contentTemplate = contentChild(
    AndesAlertDialogContentTemplate,
    { descendants: true },
  );

  protected overlayPreset(): AndesOverlayPreset {
    return 'alert-dialog';
  }

  protected surfaceTemplate(): TemplateRef<void> | undefined {
    return this.contentTemplate()?.templateRef;
  }

  protected override configOverrides(): Partial<AndesOverlayConfig> {
    return { backdropClass: ANDES_DIALOG_BACKDROP_CLASS };
  }
}

/** The element that opens an alert dialog. */
@Directive({
  selector: '[andesAlertDialogTrigger]',
  exportAs: 'andesAlertDialogTrigger',
  hostDirectives: [AndesOverlayTriggerPrimitive],
  host: {
    '(click)': 'root.toggle()',
    '[attr.data-slot]': '"alert-dialog-trigger"',
  },
})
export class AndesAlertDialogTrigger {
  /** The alert dialog this trigger opens. */
  protected readonly root = inject(AndesDialogRoot);
}

/**
 * The alert dialog's surface. Carries `role="alertdialog"` and
 * `aria-modal="true"` (from the preset) plus the labelling relationships.
 *
 * Renders no built-in close control, matching shadcn's `AlertDialogContent`: the
 * dismiss path must be an explicit, labelled Cancel action, not an anonymous "x".
 */
@Component({
  selector: 'andes-alert-dialog-content',
  templateUrl: './alert-dialog-content.html',
  styleUrl: './dialog.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AndesDialogActions],
  hostDirectives: [AndesOverlayContentPrimitive],
  providers: [
    {
      provide: AndesDialogSurface,
      useExisting: forwardRef(() => AndesAlertDialogContent),
    },
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'styles()',
    '[attr.aria-labelledby]': 'titleId()',
    '[attr.aria-describedby]': 'descriptionId()',
    '[attr.aria-busy]': 'root.loading() || null',
    '[attr.data-slot]': '"alert-dialog-content"',
  },
})
export class AndesAlertDialogContent extends AndesDialogSurfaceBase {
  protected readonly root = inject(AndesDialogRoot);

  protected readonly classes = computed(() =>
    [...dialogSurfaceClasses(this.root), 'andes-dialog--alert'].join(' '),
  );

  protected readonly styles = computed(() =>
    dialogWidthStyles(this.root.width()),
  );
}

/** Layout wrapper for an alert dialog's title and description. */
@Directive({
  selector: '[andesAlertDialogHeader]',
  host: {
    class: 'andes-dialog__header',
    '[attr.data-slot]': '"alert-dialog-header"',
  },
})
export class AndesAlertDialogHeader {}

/** The alert dialog's heading, wired as the surface's `aria-labelledby`. */
@Directive({
  selector: '[andesAlertDialogTitle]',
  host: {
    class: 'andes-dialog__title',
    '[attr.id]': 'id',
    '[attr.data-slot]': '"alert-dialog-title"',
  },
})
export class AndesAlertDialogTitle {
  /** Id the surface's `aria-labelledby` points at. */
  readonly id = registerDialogLabel('title');
}

/** Supporting copy, wired as the surface's `aria-describedby`. */
@Directive({
  selector: '[andesAlertDialogDescription]',
  host: {
    class: 'andes-dialog__description',
    '[attr.id]': 'id',
    '[attr.data-slot]': '"alert-dialog-description"',
  },
})
export class AndesAlertDialogDescription {
  /** Id the surface's `aria-describedby` points at. */
  readonly id = registerDialogLabel('description');
}

/** Layout wrapper for an alert dialog's Cancel/Action pair. */
@Directive({
  selector: '[andesAlertDialogFooter]',
  host: {
    class: 'andes-dialog__footer',
    '[attr.data-slot]': '"alert-dialog-footer"',
  },
})
export class AndesAlertDialogFooter {}

/**
 * The dismissing action. Place it before the affirmative action in the DOM so the
 * focus trap's initial focus lands on the safe choice, the same default the
 * built-in footer uses for confirmations (`autoFocusButton: 'cancel'`).
 */
@Directive({
  selector: '[andesAlertDialogCancel]',
  exportAs: 'andesAlertDialogCancel',
  hostDirectives: [AndesOverlayClosePrimitive],
  host: {
    class: 'andes-dialog__cancel',
    '[attr.data-slot]': '"alert-dialog-cancel"',
  },
})
export class AndesAlertDialogCancel {}

/**
 * The affirmative action. Closes the alert dialog, like shadcn's
 * `AlertDialogAction`; bind your own `(click)` for the work it confirms.
 *
 * For a confirmation that must stay open until an async call resolves, use the
 * root's built-in footer instead (`footer="default"`, `(ok)`, `[confirmLoading]`),
 * or `AndesDialogService.confirm()` with an `onOk` that returns a promise.
 */
@Directive({
  selector: '[andesAlertDialogAction]',
  exportAs: 'andesAlertDialogAction',
  hostDirectives: [AndesOverlayClosePrimitive],
  host: {
    class: 'andes-dialog__action',
    '[attr.data-slot]': '"alert-dialog-action"',
  },
})
export class AndesAlertDialogAction {}

/**
 * Closes the alert dialog when activated. The direct counterpart of
 * `[andesDialogClose]`, for a dismiss control that is neither the Cancel nor the
 * Action button (a header "x" a consumer adds themselves, say).
 */
@Directive({
  selector: '[andesAlertDialogClose]',
  exportAs: 'andesAlertDialogClose',
  hostDirectives: [AndesOverlayClosePrimitive],
  host: {
    '[attr.data-slot]': '"alert-dialog-close"',
  },
})
export class AndesAlertDialogClose {}

/** Everything a consumer needs to import to use the Alert Dialog compound. */
export const ANDES_ALERT_DIALOG_IMPORTS = [
  AndesAlertDialog,
  AndesAlertDialogTrigger,
  AndesAlertDialogContentTemplate,
  AndesAlertDialogContent,
  AndesAlertDialogHeader,
  AndesAlertDialogTitle,
  AndesAlertDialogDescription,
  AndesAlertDialogFooter,
  AndesAlertDialogCancel,
  AndesAlertDialogAction,
  AndesAlertDialogClose,
];
