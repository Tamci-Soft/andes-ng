import {
  AndesOverlayClosePrimitive,
  AndesOverlayContentPrimitive,
  AndesOverlayTriggerPrimitive,
  provideAndesOverlay,
  type AndesOverlayConfig,
  type AndesOverlayPreset,
} from '@andes-ng/primitives';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  forwardRef,
  inject,
  input,
  TemplateRef,
  ViewEncapsulation,
} from '@angular/core';
import clsx from 'clsx';

import {
  AndesDialogRoot,
  AndesDialogRootBase,
  AndesDialogSurface,
  AndesDialogSurfaceBase,
  registerDialogLabel,
} from './dialog-base';

/**
 * Marks the `<ng-template>` holding a dialog's surface, so the body is only
 * instantiated while the dialog is open.
 *
 * Written as a structural directive on the surface itself, which keeps the
 * consumer's markup to one line:
 *
 * ```html
 * <andes-dialog-content *andesDialogContent> ... </andes-dialog-content>
 * ```
 */
@Directive({
  selector: '[andesDialogContent]',
  exportAs: 'andesDialogContent',
})
export class AndesDialogContentTemplate {
  /** The template the root portals when it opens. */
  readonly templateRef = inject<TemplateRef<void>>(TemplateRef);
}

/**
 * Root of the Dialog compound: a general-purpose modal overlay that traps focus,
 * locks background scroll and is dismissible by Escape, backdrop click and its own
 * close button.
 *
 * Holds no DOM of its own beyond projecting the trigger — the surface is portaled
 * to the CDK overlay container, so it is never clipped by an ancestor's
 * `overflow` or stacking context.
 *
 * ```html
 * <andes-dialog #dialog>
 *   <button type="button" andesDialogTrigger>Edit profile</button>
 *
 *   <andes-dialog-content *andesDialogContent>
 *     <div andesDialogHeader>
 *       <h2 andesDialogTitle>Edit profile</h2>
 *       <p andesDialogDescription>Change your name and save.</p>
 *     </div>
 *
 *     <div andesDialogFooter>
 *       <button type="button" andesDialogClose>Cancel</button>
 *       <button type="button" (click)="save()">Save</button>
 *     </div>
 *   </andes-dialog-content>
 * </andes-dialog>
 * ```
 */
@Component({
  selector: 'andes-dialog',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideAndesOverlay(),
    { provide: AndesDialogRoot, useExisting: forwardRef(() => AndesDialog) },
  ],
  host: {
    '[attr.data-slot]': '"dialog"',
  },
})
export class AndesDialog extends AndesDialogRootBase {
  /**
   * A pointer event on the backdrop (or otherwise outside the surface) closes the
   * dialog. The equivalent of Base UI's `disablePointerDismissal` inverted, and of
   * Ant's `mask.closable`.
   */
  readonly closeOnOutsideClick = input(true, { transform: booleanAttribute });

  private readonly contentTemplate = contentChild(AndesDialogContentTemplate, {
    descendants: true,
  });

  protected overlayPreset(): AndesOverlayPreset {
    return 'dialog';
  }

  protected surfaceTemplate(): TemplateRef<void> | undefined {
    return this.contentTemplate()?.templateRef;
  }

  protected override configOverrides(): Partial<AndesOverlayConfig> {
    return { closeOnOutsideClick: this.closeOnOutsideClick() };
  }
}

/**
 * The element that opens a dialog. Put it on a natively interactive element — a
 * `<button>` — so the ARIA state the overlay primitive keeps in sync
 * (`aria-haspopup`, `aria-expanded`, `aria-controls`) lands on an element allowed
 * to carry it.
 *
 * Registers itself as the element focus returns to when the dialog closes.
 */
@Directive({
  selector: '[andesDialogTrigger]',
  exportAs: 'andesDialogTrigger',
  hostDirectives: [AndesOverlayTriggerPrimitive],
  host: {
    '(click)': 'root.toggle()',
    '[attr.data-slot]': '"dialog-trigger"',
  },
})
export class AndesDialogTrigger {
  /** The dialog this trigger opens. */
  protected readonly root = inject(AndesDialogRoot);
}

/**
 * The dialog's surface. Carries `role="dialog"`, `aria-modal="true"` and the
 * `aria-labelledby`/`aria-describedby` pointing at the title and description
 * parts, and renders the built-in close control.
 *
 * Styles are unencapsulated on purpose: every part inside it (header, title,
 * footer) is consumer markup projected from the consumer's own view, which an
 * encapsulated stylesheet could not reach. Class names are namespaced
 * `andes-dialog*` to keep that safe.
 */
@Component({
  selector: 'andes-dialog-content',
  templateUrl: './dialog-content.html',
  styleUrl: './dialog.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AndesOverlayClosePrimitive],
  hostDirectives: [AndesOverlayContentPrimitive],
  providers: [
    {
      provide: AndesDialogSurface,
      useExisting: forwardRef(() => AndesDialogContent),
    },
  ],
  host: {
    '[class]': 'classes()',
    '[attr.aria-labelledby]': 'titleId()',
    '[attr.aria-describedby]': 'descriptionId()',
    '[attr.data-slot]': '"dialog-content"',
  },
})
export class AndesDialogContent extends AndesDialogSurfaceBase {
  private readonly root = inject(AndesDialogRoot);

  /** Render the built-in close ("x") control. Mirrors shadcn's `showCloseButton`. */
  readonly showCloseButton = input(true, { transform: booleanAttribute });
  /** Accessible label for the built-in close control. */
  readonly closeLabel = input('Close');

  protected readonly classes = computed(() =>
    clsx('andes-dialog', `andes-dialog--${this.root.size()}`),
  );
}

/** Layout wrapper for a dialog's title and description. */
@Directive({
  selector: '[andesDialogHeader]',
  host: {
    class: 'andes-dialog__header',
    '[attr.data-slot]': '"dialog-header"',
  },
})
export class AndesDialogHeader {}

/**
 * The dialog's heading. Put it on a real heading element (`<h2>`) — the directive
 * only wires the labelling relationship, it does not invent semantics.
 */
@Directive({
  selector: '[andesDialogTitle]',
  host: {
    class: 'andes-dialog__title',
    '[attr.id]': 'id',
    '[attr.data-slot]': '"dialog-title"',
  },
})
export class AndesDialogTitle {
  /** Id the surface's `aria-labelledby` points at. */
  readonly id = registerDialogLabel('title');
}

/** Supporting copy, wired as the surface's `aria-describedby`. */
@Directive({
  selector: '[andesDialogDescription]',
  host: {
    class: 'andes-dialog__description',
    '[attr.id]': 'id',
    '[attr.data-slot]': '"dialog-description"',
  },
})
export class AndesDialogDescription {
  /** Id the surface's `aria-describedby` points at. */
  readonly id = registerDialogLabel('description');
}

/** Layout wrapper for a dialog's actions. */
@Directive({
  selector: '[andesDialogFooter]',
  host: {
    class: 'andes-dialog__footer',
    '[attr.data-slot]': '"dialog-footer"',
  },
})
export class AndesDialogFooter {}

/** Closes the dialog when activated, reporting `'close-button'` as the reason. */
@Directive({
  selector: '[andesDialogClose]',
  exportAs: 'andesDialogClose',
  hostDirectives: [AndesOverlayClosePrimitive],
  host: {
    '[attr.data-slot]': '"dialog-close"',
  },
})
export class AndesDialogClose {}

/** Everything a consumer needs to import to use the Dialog compound. */
export const ANDES_DIALOG_IMPORTS = [
  AndesDialog,
  AndesDialogTrigger,
  AndesDialogContentTemplate,
  AndesDialogContent,
  AndesDialogHeader,
  AndesDialogTitle,
  AndesDialogDescription,
  AndesDialogFooter,
  AndesDialogClose,
];
